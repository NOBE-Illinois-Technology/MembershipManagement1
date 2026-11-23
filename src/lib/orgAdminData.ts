import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { getSignedInUser, getOrgRole } from "@/lib/membership";
import { isMissingSchema } from "@/lib/orgDashboardData";

// Server-only helpers for the org dashboard's admin routes (Quick Actions). Everything here uses
// the service-role client, so routes must call requireOrgAdminContext first.
//
// Note: attendance / excused_absences / strikes store the member's login id (people.auth_id) in
// `user_id`, not people.id.

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type OrgRow = {
  id: number;
  name: string;
  slug: string;
  strikes_enabled: boolean;
  max_strikes: number | null;
};

// committeeId is null for members without a committee (or before memberships.committee_id exists).
export type OrgMember = { authId: string; name: string; email: string | null; committeeId: number | null };

export type AdminContext = {
  user: User;
  org: OrgRow;
  admin: ReturnType<typeof createAdminClient>;
};

// The signed-in user and their org, or an HttpError unless they're an ADMIN of it.
export async function requireOrgAdminContext(slug: string): Promise<AdminContext> {
  const user = await getSignedInUser();
  if (!user) throw new HttpError(401, "You must be signed in.");
  if ((await getOrgRole(user.id, slug)) !== "ADMIN") {
    throw new HttpError(403, "Only admins of this organization can do that.");
  }

  const admin = createAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name, slug, strikes_enabled, max_strikes")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Could not look up the organization: ${error.message}`);
  if (!org) throw new HttpError(404, "Organization not found.");
  return { user, org: org as OrgRow, admin };
}

// Everyone with a membership in the org (admins included), deduplicated by login.
// Members who have never signed in have no auth_id and are left out, since attendance,
// absences and strikes are all keyed by auth_id.
export async function getOrgMembers(admin: AdminContext["admin"], orgId: number): Promise<OrgMember[]> {
  const select = (withCommittee: boolean) =>
    admin
      .from("memberships")
      .select(`${withCommittee ? "committee_id, " : ""}people!inner(auth_id, name, illinois_email)`)
      .eq("org_id", orgId);
  let { data, error } = await select(true);
  // memberships.committee_id comes from a migration that may not have been run yet.
  if (error && isMissingSchema(error)) ({ data, error } = await select(false));
  if (error) throw new Error(`Could not load members: ${error.message}`);

  const members = new Map<string, OrgMember>();
  for (const row of (data ?? []) as unknown as { committee_id?: number | null; people: unknown }[]) {
    // A to-one join; Supabase's generated types may describe it as an array.
    const person = (Array.isArray(row.people) ? row.people[0] : row.people) as
      | { auth_id: string | null; name: string | null; illinois_email: string | null }
      | undefined;
    if (!person?.auth_id) continue;
    const email = person.illinois_email?.trim().toLowerCase() || null;
    members.set(person.auth_id, {
      authId: person.auth_id,
      name: person.name?.trim() || email || "Member",
      email,
      committeeId: row.committee_id != null ? Number(row.committee_id) : null,
    });
  }
  return [...members.values()];
}

// Turns thrown errors into JSON responses for route handlers.
export function errorResponse(err: unknown, route: string) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(`[${route}]`, err);
  return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected server error." }, { status: 500 });
}

// A clearer message when the org_events migration hasn't been run yet.
export function describeDbError(message: string) {
  return /org_id/.test(message) && /does not exist|column/.test(message)
    ? "The org events database migration hasn't been run yet (supabase/migrations/20261115000000_org_events.sql)."
    : message;
}
