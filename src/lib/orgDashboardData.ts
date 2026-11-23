import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { ORG_EVENT_COLUMNS, isEventVisibleTo, type OrgEventDbRow, type OrgEventRow } from "./orgEvents";
import type { OrgAbsenceRow, OrgAttendanceRow, OrgDashboardData, OrgMemberRow, OrgViewer } from "./orgDashboard";

// Server-only: loads what the org dashboard and widget customizer show. Uses the service-role
// client, so callers must already have confirmed the viewer belongs to the org (getUserOrgs).
//
// Tolerates the committee migrations not having been run yet (memberships.committee_id from
// *_member_committees.sql, event_committees from *_event_committees.sql): without them, everyone
// has no committee and every event is for all members.

type AdminClient = ReturnType<typeof createAdminClient>;
type DbError = { code?: string; message: string } | null;

// A table or column that doesn't exist yet (a migration that hasn't been run).
export function isMissingSchema(error: DbError) {
  if (!error) return false;
  return (
    error.code === "42P01" || // undefined table
    error.code === "42703" || // undefined column
    error.code === "PGRST200" || // no relationship found for an embed
    error.code === "PGRST204" || // column not in schema cache
    error.code === "PGRST205" || // table not in schema cache
    /does not exist|could not find/i.test(error.message)
  );
}

const one = <T,>(value: T | T[] | null | undefined): T | undefined => (Array.isArray(value) ? value[0] : value ?? undefined);

// Adds committee_ids to event rows (empty when the event is for all members).
export async function attachEventCommittees(admin: AdminClient, rows: OrgEventDbRow[]): Promise<OrgEventRow[]> {
  const byEvent = new Map<string, number[]>();
  if (rows.length > 0) {
    const { data, error } = await admin
      .from("event_committees")
      .select("event_id, committee_id")
      .in("event_id", rows.map((r) => r.id));
    if (error && !isMissingSchema(error)) throw new Error(`Could not load event committees: ${error.message}`);
    for (const link of data ?? []) {
      byEvent.set(link.event_id, [...(byEvent.get(link.event_id) ?? []), Number(link.committee_id)]);
    }
  }
  return rows.map((r) => ({ ...r, committee_ids: byEvent.get(r.id) ?? [] }));
}

// Replaces an event's committees. Ignores a missing table only when there's nothing to save.
export async function saveEventCommittees(admin: AdminClient, eventId: string, committeeIds: number[]) {
  const { error: deleteError } = await admin.from("event_committees").delete().eq("event_id", eventId);
  if (deleteError) {
    if (isMissingSchema(deleteError) && committeeIds.length === 0) return;
    throw new Error(
      isMissingSchema(deleteError)
        ? "Committee-specific events need the event committees database migration (supabase/migrations/20261123000000_event_committees.sql)."
        : `Could not save the event's committees: ${deleteError.message}`
    );
  }
  if (committeeIds.length === 0) return;
  const { error } = await admin
    .from("event_committees")
    .insert(committeeIds.map((committee_id) => ({ event_id: eventId, committee_id })));
  if (error) throw new Error(`Could not save the event's committees: ${error.message}`);
}

type MembershipRow = {
  role: string;
  created_at: string | null;
  committee_id?: number | null;
  people: unknown;
};

// The org's memberships with each person's details. Falls back to no committees when
// memberships.committee_id doesn't exist yet.
async function loadMemberships(admin: AdminClient, orgId: number, authId?: string) {
  const select = (withCommittee: boolean) => {
    let q = admin
      .from("memberships")
      .select(
        `role, created_at, ${withCommittee ? "committee_id, " : ""}people!inner(id, auth_id, name, illinois_email, major, year, college)`
      )
      .eq("org_id", orgId);
    if (authId) q = q.eq("people.auth_id", authId);
    return q;
  };
  let { data, error } = await select(true);
  if (error && isMissingSchema(error)) ({ data, error } = await select(false));
  if (error) throw new Error(`Could not load members: ${error.message}`);
  // The select string is built at runtime, so Supabase can't type it; this is its shape.
  return (data ?? []) as unknown as MembershipRow[];
}

type PersonRow = {
  id: number;
  auth_id: string | null;
  name: string | null;
  illinois_email: string | null;
  major: string | null;
  year: string | number | null;
  college: string | null;
};

export async function loadOrgDashboardData(
  org: { id: number; role: "ADMIN" | "MEMBER" },
  viewerAuthId: string | null
): Promise<OrgDashboardData> {
  const admin = createAdminClient();
  const isAdmin = org.role === "ADMIN";

  const [committeesRes, eventsRes, viewerRows] = await Promise.all([
    admin.from("committees").select("id, name").eq("org_id", org.id),
    admin.from("events").select(ORG_EVENT_COLUMNS).eq("org_id", org.id).order("date", { ascending: true }),
    viewerAuthId ? loadMemberships(admin, org.id, viewerAuthId) : Promise.resolve([] as MembershipRow[]),
  ]);
  if (committeesRes.error) throw new Error(`Could not load committees: ${committeesRes.error.message}`);
  const committeeNames = new Map((committeesRes.data ?? []).map((c) => [Number(c.id), c.name as string]));

  // Events (empty if the org events migration hasn't been run).
  let events: OrgEventRow[] = [];
  if (eventsRes.error) console.warn("[loadOrgDashboardData] could not load org events:", eventsRes.error.message);
  else events = await attachEventCommittees(admin, (eventsRes.data ?? []) as OrgEventDbRow[]);

  const toMember = (row: MembershipRow): OrgMemberRow | null => {
    const p = one(row.people as PersonRow | PersonRow[] | null);
    if (!p) return null;
    const committeeId = row.committee_id != null ? Number(row.committee_id) : null;
    return {
      id: p.id,
      authId: p.auth_id,
      name: p.name?.trim() || p.illinois_email || "Member",
      email: p.illinois_email,
      role: row.role === "ADMIN" ? "ADMIN" : "MEMBER",
      committeeId,
      committee: committeeId !== null ? committeeNames.get(committeeId) ?? null : null,
      major: p.major,
      year: p.year != null ? String(p.year) : null,
      college: p.college,
      joinedAt: row.created_at,
      activeStrikes: 0,
    };
  };

  const viewerMember = viewerRows.map(toMember).find(Boolean) ?? null;
  const viewer: OrgViewer | null = viewerMember && {
    name: viewerMember.name,
    email: viewerMember.email,
    role: viewerMember.role,
    committeeId: viewerMember.committeeId,
    committee: viewerMember.committee,
    major: viewerMember.major,
    year: viewerMember.year,
    college: viewerMember.college,
  };

  // Members only see all-members events and their own committee's.
  if (!isAdmin) {
    events = events.filter((e) => isEventVisibleTo(e, viewer?.committeeId ?? null));
    return { events, viewer, members: [], attendance: [], absences: [] };
  }

  // Admins: the roster with attendance, absences and active strikes for this org's events.
  const members = (await loadMemberships(admin, org.id)).map(toMember).filter((m): m is OrgMemberRow => m !== null);
  members.sort((a, b) => a.name.localeCompare(b.name));
  const memberIdByAuth = new Map(members.filter((m) => m.authId).map((m) => [m.authId as string, m.id]));

  const [attendanceRes, absencesRes, strikesRes] = await Promise.all([
    admin.from("attendance").select("user_id, event_id, timestamp").eq("org_id", org.id),
    admin.from("excused_absences").select("user_id, event_id, status").eq("org_id", org.id),
    admin.from("strikes").select("user_id").eq("org_id", org.id).eq("status", "ACTIVE"),
  ]);
  for (const res of [attendanceRes, absencesRes, strikesRes]) {
    if (res.error) console.warn("[loadOrgDashboardData] could not load member activity:", res.error.message);
  }

  const attendance: OrgAttendanceRow[] = (attendanceRes.data ?? []).flatMap((a) => {
    const memberId = a.user_id ? memberIdByAuth.get(a.user_id) : undefined;
    return memberId !== undefined && a.event_id ? [{ memberId, eventId: a.event_id, checkedInAt: a.timestamp ?? null }] : [];
  });
  const absences: OrgAbsenceRow[] = (absencesRes.data ?? []).flatMap((a) => {
    const memberId = a.user_id ? memberIdByAuth.get(a.user_id) : undefined;
    return memberId !== undefined ? [{ memberId, eventId: a.event_id ?? null, status: a.status ?? null }] : [];
  });
  const strikeCounts = new Map<number, number>();
  for (const s of strikesRes.data ?? []) {
    const memberId = s.user_id ? memberIdByAuth.get(s.user_id) : undefined;
    if (memberId !== undefined) strikeCounts.set(memberId, (strikeCounts.get(memberId) ?? 0) + 1);
  }
  for (const m of members) m.activeStrikes = strikeCounts.get(m.id) ?? 0;

  return { events, viewer, members, attendance, absences };
}
