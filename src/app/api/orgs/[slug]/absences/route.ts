import { NextRequest, NextResponse } from "next/server";
import { describeDbError, errorResponse, requireOrgAdminContext } from "@/lib/orgAdminData";
import type { AbsenceRequest } from "@/lib/orgAbsences";

// Review Absences quick action: GET -> { requests: AbsenceRequest[] }, newest first.
// Every absence request that any member sent for one of this org's events. Admins of the org only.

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const { org, admin } = await requireOrgAdminContext(slug);

    const { data: events, error: eventsError } = await admin
      .from("events")
      .select("id, name, date")
      .eq("org_id", org.id);
    if (eventsError) throw new Error(describeDbError(eventsError.message));
    if (!events || events.length === 0) return NextResponse.json({ requests: [] });
    const eventsById = new Map(events.map((e) => [e.id as string, e]));

    const { data: absences, error: absencesError } = await admin
      .from("excused_absences")
      .select("id, user_id, event_id, reason, image_url, status, submitted_at, admin_response, reviewed_at, email_sent, email_error")
      .in("event_id", [...eventsById.keys()])
      .order("submitted_at", { ascending: false });
    if (absencesError) throw new Error(`Could not load absence requests: ${absencesError.message}`);

    const userIds = [...new Set((absences ?? []).map((a) => a.user_id).filter(Boolean))] as string[];
    const { data: people, error: peopleError } = userIds.length
      ? await admin.from("people").select("auth_id, name, illinois_email").in("auth_id", userIds)
      : { data: [], error: null };
    if (peopleError) throw new Error(`Could not load members: ${peopleError.message}`);
    const peopleById = new Map((people ?? []).map((p) => [p.auth_id as string, p]));

    const requests: AbsenceRequest[] = (absences ?? []).map((a) => {
      const person = a.user_id ? peopleById.get(a.user_id) : undefined;
      const event = eventsById.get(a.event_id);
      const status = String(a.status ?? "PENDING").toUpperCase();
      return {
        id: a.id,
        memberName: person?.name || person?.illinois_email || "Unknown member",
        memberEmail: person?.illinois_email ?? null,
        eventName: event?.name ?? "Unknown event",
        eventDate: event?.date ?? null,
        reason: a.reason ?? "",
        // A public storage URL; anything else (e.g. a javascript: link) is dropped.
        imageUrl: typeof a.image_url === "string" && /^https?:\/\//i.test(a.image_url) ? a.image_url : null,
        submittedAt: a.submitted_at,
        status: status === "APPROVED" || status === "DENIED" ? status : "PENDING",
        adminResponse: a.admin_response ?? null,
        reviewedAt: a.reviewed_at ?? null,
        emailSent: a.email_sent ?? null,
        emailError: a.email_error ?? null,
      };
    });

    return NextResponse.json({ requests });
  } catch (err) {
    return errorResponse(err, `GET /api/orgs/${slug}/absences`);
  }
}
