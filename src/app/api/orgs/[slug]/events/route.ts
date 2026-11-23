import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { describeDbError, errorResponse, HttpError, requireOrgAdminContext } from "@/lib/orgAdminData";
import { buildOrgEventRow, ORG_EVENT_COLUMNS, parseCommitteeIds, type OrgEventDbRow } from "@/lib/orgEvents";
import { saveEventCommittees } from "@/lib/orgDashboardData";

// Create Event quick action: POST a NewOrgEvent -> { event }. Admins of the org only.
// The event is saved with this org's id (events.org_id), so it never shows up in NOBE DevOps,
// and with the committees it's for (event_committees; none = all members).

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const { org, admin } = await requireOrgAdminContext(slug);
    const body = await request.json().catch(() => null);

    const [categoriesRes, committeesRes] = await Promise.all([
      admin.from("point_categories").select("name").eq("org_id", org.id),
      admin.from("committees").select("id").eq("org_id", org.id),
    ]);
    if (categoriesRes.error) throw new Error(`Could not load event types: ${categoriesRes.error.message}`);
    if (committeesRes.error) throw new Error(`Could not load committees: ${committeesRes.error.message}`);

    const { row, error } = buildOrgEventRow(body, (categoriesRes.data ?? []).map((c) => c.name as string));
    if (error || !row) throw new HttpError(400, error ?? "Invalid event.");
    const { ids: committeeIds, error: committeeError } = parseCommitteeIds(
      body,
      (committeesRes.data ?? []).map((c) => Number(c.id))
    );
    if (committeeError || !committeeIds) throw new HttpError(400, committeeError ?? "Invalid committees.");

    const { data: event, error: insertError } = await admin
      .from("events")
      .insert({
        ...row,
        org_id: org.id,
        // Kept for a future org check-in page. NOBE's check-in ignores org events.
        qr_code_secret: randomBytes(24).toString("hex"),
      })
      .select(ORG_EVENT_COLUMNS)
      .single();
    if (insertError) throw new Error(describeDbError(insertError.message));

    try {
      await saveEventCommittees(admin, (event as OrgEventDbRow).id, committeeIds);
    } catch (err) {
      // Don't leave a committee-only event visible to everyone: undo the create.
      await admin.from("events").delete().eq("id", (event as OrgEventDbRow).id);
      throw err;
    }

    return NextResponse.json({ event: { ...(event as OrgEventDbRow), committee_ids: committeeIds } }, { status: 201 });
  } catch (err) {
    return errorResponse(err, `POST /api/orgs/${slug}/events`);
  }
}
