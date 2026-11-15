import { NextRequest, NextResponse } from "next/server";
import { describeDbError, errorResponse, getOrgMembers, HttpError, requireOrgAdminContext } from "@/lib/orgAdminData";
import { sendOrgEmails } from "@/lib/orgEmail";

// Process Strikes quick action, modeled on NOBE's /api/admin/process-strikes but scoped to one org:
// for each of the org's mandatory events whose check-in has closed and that hasn't been processed,
// every member of the org who didn't check in and has no approved absence gets a strike.
//
// Differences from NOBE: only this org's events and members; only when the org has strikes turned
// on; doesn't touch people.strikes (NOBE's own counter); emails go through Resend.
//
// POST -> { results: [{ event, struckCount }], emailsSent, emailError }

type Params = { params: Promise<{ slug: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const { org, admin } = await requireOrgAdminContext(slug);
    if (!org.strikes_enabled) throw new HttpError(403, "Strikes are turned off for this organization. Turn them on in Settings.");

    const { data: events, error: eventsError } = await admin
      .from("events")
      .select("id, name")
      .eq("org_id", org.id)
      .eq("is_mandatory", true)
      .eq("strikes_processed", false)
      .lt("check_in_ends_at", new Date().toISOString());
    if (eventsError) throw new Error(describeDbError(eventsError.message));
    if (!events || events.length === 0) {
      return NextResponse.json({ results: [], message: "Strikes up to date. No events required processing." });
    }

    const members = await getOrgMembers(admin, org.id);
    const results: { event: string; struckCount: number }[] = [];
    const struckMemberIds = new Set<string>();
    const struckEventsByMember = new Map<string, string[]>();

    for (const event of events) {
      // Claim the event first so two admins clicking at once can't both give strikes for it.
      const { data: claimed, error: claimError } = await admin
        .from("events")
        .update({ strikes_processed: true })
        .eq("id", event.id)
        .eq("strikes_processed", false)
        .select("id");
      if (claimError) throw new Error(`Could not update "${event.name}": ${claimError.message}`);
      if (!claimed || claimed.length === 0) continue;

      const [attendance, absences, existing] = await Promise.all([
        admin.from("attendance").select("user_id").eq("event_id", event.id),
        admin.from("excused_absences").select("user_id").eq("event_id", event.id).eq("status", "APPROVED"),
        admin.from("strikes").select("user_id").eq("event_id", event.id),
      ]);
      const lookupError = attendance.error ?? absences.error ?? existing.error;
      if (lookupError) {
        await admin.from("events").update({ strikes_processed: false }).eq("id", event.id);
        throw new Error(`Could not check attendance for "${event.name}": ${lookupError.message}`);
      }

      const skip = new Set(
        [...(attendance.data ?? []), ...(absences.data ?? []), ...(existing.data ?? [])].map((r) => r.user_id as string)
      );
      const missed = members.filter((m) => !skip.has(m.authId));

      if (missed.length > 0) {
        const { error: insertError } = await admin.from("strikes").insert(
          missed.map((m) => ({
            user_id: m.authId,
            event_id: event.id,
            strike_type: "MISSED_MANDATORY_EVENT",
            reason: `Missed mandatory event: ${event.name}`,
            status: "ACTIVE",
            source: "AUTOMATIC",
            admin_note: "Automatically generated because the member missed a mandatory event without an approved absence.",
            created_by: null,
          }))
        );
        if (insertError) {
          // Release the event so it can be processed again.
          await admin.from("events").update({ strikes_processed: false }).eq("id", event.id);
          throw new Error(`Could not save strikes for "${event.name}": ${insertError.message}`);
        }
        for (const m of missed) {
          struckMemberIds.add(m.authId);
          struckEventsByMember.set(m.authId, [...(struckEventsByMember.get(m.authId) ?? []), event.name as string]);
        }
      }
      results.push({ event: event.name as string, struckCount: missed.length });
    }

    // Tell each struck member, with their current active strike count in this org.
    let emailsSent = 0;
    let emailError: string | null = null;
    if (struckMemberIds.size > 0) {
      const counts = await activeStrikeCounts(admin, org.id, [...struckMemberIds]);
      const limit = org.max_strikes ? ` The limit is ${org.max_strikes}.` : "";
      const emails = members
        .filter((m) => struckMemberIds.has(m.authId) && m.email)
        .map((m) => {
          const missedEvents = struckEventsByMember.get(m.authId) ?? [];
          return {
            to: m.email!,
            subject: `${org.name}: strike for a missed mandatory event`,
            text:
              `Hello ${m.name},\n\n` +
              `You received a strike from ${org.name} because you did not check in to the mandatory ` +
              `event${missedEvents.length === 1 ? "" : "s"} ${missedEvents.map((n) => `"${n}"`).join(", ")} ` +
              `and do not have an approved absence.\n\n` +
              `You now have ${counts.get(m.authId) ?? missedEvents.length} active strike(s) in ${org.name}.${limit}\n\n` +
              `If you think this is a mistake, contact an admin of ${org.name}.`,
          };
        });
      const sent = await sendOrgEmails(emails);
      emailsSent = sent.sent;
      emailError = sent.error;
    }

    return NextResponse.json({ results, emailsSent, emailError });
  } catch (err) {
    return errorResponse(err, `POST /api/orgs/${slug}/strikes/process`);
  }
}

// Active strikes per member, counting only strikes for this org's events.
async function activeStrikeCounts(
  admin: Awaited<ReturnType<typeof requireOrgAdminContext>>["admin"],
  orgId: number,
  memberIds: string[]
) {
  const counts = new Map<string, number>();
  // strikes.org_id is filled in from the strike's event by a database trigger.
  const { data: strikes } = await admin
    .from("strikes")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("status", "ACTIVE")
    .in("user_id", memberIds);
  for (const s of strikes ?? []) counts.set(s.user_id as string, (counts.get(s.user_id as string) ?? 0) + 1);
  return counts;
}
