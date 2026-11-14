import { NextRequest, NextResponse } from "next/server";
import { errorResponse, HttpError, requireOrgAdminContext } from "@/lib/orgAdminData";
import { sendOrgEmails } from "@/lib/orgEmail";
import { ABSENCE_RESPONSE_MAX } from "@/lib/orgAbsences";

// Review one absence request: POST { status: "APPROVED" | "DENIED", response? }.
// Modeled on NOBE's /api/admin/review-absence: approving also records the member as attending
// (so Process Strikes skips them), and the member is emailed the decision. Admins of the org only,
// and only for absences on this org's events.

type Params = { params: Promise<{ slug: string; absenceId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { slug, absenceId } = await params;
  try {
    const { user, org, admin } = await requireOrgAdminContext(slug);

    const input = ((await request.json().catch(() => null)) ?? {}) as { status?: unknown; response?: unknown };
    const status = typeof input.status === "string" ? input.status.trim().toUpperCase() : "";
    const response = typeof input.response === "string" ? input.response.trim() : "";
    if (status !== "APPROVED" && status !== "DENIED") throw new HttpError(400, "Choose Approved or Denied.");
    if (response.length > ABSENCE_RESPONSE_MAX) throw new HttpError(400, `Message must be ${ABSENCE_RESPONSE_MAX} characters or fewer.`);

    const { data: absence, error: absenceError } = await admin
      .from("excused_absences")
      .select("id, user_id, event_id, reason")
      .eq("id", absenceId)
      .maybeSingle();
    if (absenceError) throw new Error(`Could not load the absence request: ${absenceError.message}`);

    // Only absences on this org's events; anything else looks like it doesn't exist.
    const { data: event } = absence?.event_id
      ? await admin.from("events").select("id, name").eq("id", absence.event_id).eq("org_id", org.id).maybeSingle()
      : { data: null };
    if (!absence || !event) throw new HttpError(404, "Absence request not found.");
    if (!absence.user_id) throw new HttpError(400, "This absence request is not linked to a member account.");

    if (status === "APPROVED") {
      const { data: existing } = await admin
        .from("attendance")
        .select("id")
        .eq("user_id", absence.user_id)
        .eq("event_id", absence.event_id)
        .maybeSingle();
      if (!existing) {
        const { error: attendanceError } = await admin
          .from("attendance")
          .insert({ user_id: absence.user_id, event_id: absence.event_id });
        if (attendanceError) throw new Error(`Could not record attendance: ${attendanceError.message}`);
      }
    }

    // Save the decision first, so the member is never emailed about a review that didn't save.
    const reviewedAt = new Date().toISOString();
    const { error: saveError } = await admin
      .from("excused_absences")
      .update({ status, admin_response: response || null, reviewed_by: user.id, reviewed_at: reviewedAt })
      .eq("id", absenceId);
    if (saveError) throw new Error(`Could not save the review: ${saveError.message}`);

    // Email the member (best effort: the review is already saved).
    const { data: person } = await admin
      .from("people")
      .select("name, illinois_email")
      .eq("auth_id", absence.user_id)
      .maybeSingle();
    let emailSent = false;
    let emailError: string | null = null;
    if (person?.illinois_email) {
      const decision = status === "APPROVED" ? "approved" : "denied";
      const result = await sendOrgEmails([
        {
          to: person.illinois_email,
          subject: `${org.name}: absence request ${decision}`,
          text: [
            `Hello ${person.name || "there"},`,
            "",
            `Your absence request for "${event.name}" has been ${decision}.`,
            "",
            `Reason you submitted: ${absence.reason?.trim() || "No reason provided."}`,
            ...(response ? ["", "Message from the admin:", response] : []),
          ].join("\n"),
          replyTo: user.email,
        },
      ]);
      emailSent = result.sent > 0;
      emailError = result.error;
    } else {
      emailError = "The member has no email address.";
    }

    const { data: updated, error: updateError } = await admin
      .from("excused_absences")
      .update({ email_sent: emailSent, email_error: emailError })
      .eq("id", absenceId)
      .select("id, status, admin_response, reviewed_at, email_sent, email_error")
      .single();
    if (updateError) throw new Error(`The review was saved, but its email status wasn't: ${updateError.message}`);

    return NextResponse.json({ review: updated });
  } catch (err) {
    return errorResponse(err, `POST /api/orgs/${slug}/absences/${absenceId}`);
  }
}
