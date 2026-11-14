import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { describeDbError, errorResponse, HttpError, requireOrgAdminContext } from "@/lib/orgAdminData";
import { buildOrgEventRow, ORG_EVENT_COLUMNS } from "@/lib/orgEvents";

// Create Event quick action: POST a NewOrgEvent -> { event }. Admins of the org only.
// The event is saved with this org's id (events.org_id), so it never shows up in NOBE DevOps.

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const { org, admin } = await requireOrgAdminContext(slug);

    const { data: categories, error: categoriesError } = await admin
      .from("point_categories")
      .select("name")
      .eq("org_id", org.id);
    if (categoriesError) throw new Error(`Could not load event types: ${categoriesError.message}`);

    const { row, error } = buildOrgEventRow(
      await request.json().catch(() => null),
      (categories ?? []).map((c) => c.name as string)
    );
    if (error) throw new HttpError(400, error);

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

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return errorResponse(err, `POST /api/orgs/${slug}/events`);
  }
}
