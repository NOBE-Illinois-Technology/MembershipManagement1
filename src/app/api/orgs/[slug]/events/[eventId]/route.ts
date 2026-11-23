import { NextRequest, NextResponse } from "next/server";
import { describeDbError, errorResponse, HttpError, requireOrgAdminContext } from "@/lib/orgAdminData";
import {
  buildOrgEventRow,
  LOCKED_AFTER_STRIKES,
  ORG_EVENT_COLUMNS,
  parseCommitteeIds,
  type OrgEventDbRow,
} from "@/lib/orgEvents";
import { attachEventCommittees, saveEventCommittees } from "@/lib/orgDashboardData";

// Edit or delete one of the org's events (clicking an event on the Calendar). Admins of the org only,
// and only events that belong to this org.
//
//   PATCH  a NewOrgEvent (same body as creating) -> { event }
//   DELETE -> { ok: true }   also deletes the event's attendance, absence requests and strikes
//                            (its event_committees rows go with it via on delete cascade)

type Params = { params: Promise<{ slug: string; eventId: string }> };

async function loadOrgEvent(ctx: Awaited<ReturnType<typeof requireOrgAdminContext>>, eventId: string) {
  const { data, error } = await ctx.admin
    .from("events")
    .select(ORG_EVENT_COLUMNS)
    .eq("id", eventId)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  // An id that isn't a uuid makes Postgres error; treat it the same as "not found".
  if (error && !/uuid/i.test(error.message)) throw new Error(describeDbError(error.message));
  if (!data) throw new HttpError(404, "Event not found.");
  const [event] = await attachEventCommittees(ctx.admin, [data as OrgEventDbRow]);
  return event;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug, eventId } = await params;
  try {
    const ctx = await requireOrgAdminContext(slug);
    const existing = await loadOrgEvent(ctx, eventId);

    const body = await request.json().catch(() => null);
    const [{ data: categories, error: categoriesError }, committeesRes] = await Promise.all([
      ctx.admin.from("point_categories").select("name").eq("org_id", ctx.org.id),
      ctx.admin.from("committees").select("id").eq("org_id", ctx.org.id),
    ]);
    if (categoriesError) throw new Error(`Could not load event types: ${categoriesError.message}`);
    if (committeesRes.error) throw new Error(`Could not load committees: ${committeesRes.error.message}`);

    // Keep the event's current type valid even if that point category was renamed or removed since.
    const allowedTypes = (categories ?? []).map((c) => c.name as string);
    if (existing.event_type && !allowedTypes.includes(existing.event_type) && allowedTypes.length > 0) {
      allowedTypes.push(existing.event_type);
    }

    const { row, error } = buildOrgEventRow(body, allowedTypes);
    if (error || !row) throw new HttpError(400, error ?? "Invalid event.");
    const { ids: committeeIds, error: committeeError } = parseCommitteeIds(
      body,
      (committeesRes.data ?? []).map((c) => Number(c.id))
    );
    if (committeeError || !committeeIds) throw new HttpError(400, committeeError ?? "Invalid committees.");

    // Strikes were given out based on these; changing them would make those strikes wrong.
    if (existing.strikes_processed) {
      const changed = LOCKED_AFTER_STRIKES.filter((field) => {
        const before = existing[field];
        const after = row[field];
        return typeof before === "string" && typeof after === "string"
          ? new Date(before).getTime() !== new Date(after).getTime()
          : Boolean(before) !== Boolean(after);
      });
      const sameCommittees =
        committeeIds.length === existing.committee_ids.length &&
        committeeIds.every((id) => existing.committee_ids.includes(id));
      if (changed.length > 0 || !sameCommittees) {
        throw new HttpError(
          400,
          "Strikes were already given out for this event, so its date, times, check-in window, mandatory setting, and committees can't change."
        );
      }
    }

    const { data: event, error: updateError } = await ctx.admin
      .from("events")
      .update(row)
      .eq("id", eventId)
      .eq("org_id", ctx.org.id)
      .select(ORG_EVENT_COLUMNS)
      .single();
    if (updateError) throw new Error(describeDbError(updateError.message));
    await saveEventCommittees(ctx.admin, eventId, committeeIds);

    return NextResponse.json({ event: { ...(event as OrgEventDbRow), committee_ids: committeeIds } });
  } catch (err) {
    return errorResponse(err, `PATCH /api/orgs/${slug}/events/${eventId}`);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { slug, eventId } = await params;
  try {
    const ctx = await requireOrgAdminContext(slug);
    await loadOrgEvent(ctx, eventId);

    // Delete everything that points at the event first (same as NOBE's event delete).
    for (const table of ["attendance", "excused_absences", "strikes"] as const) {
      const { error } = await ctx.admin.from(table).delete().eq("event_id", eventId);
      if (error) throw new Error(`Could not delete the event's ${table.replace("_", " ")}: ${error.message}`);
    }
    const { error } = await ctx.admin.from("events").delete().eq("id", eventId).eq("org_id", ctx.org.id);
    if (error) throw new Error(`Could not delete the event: ${error.message}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, `DELETE /api/orgs/${slug}/events/${eventId}`);
  }
}
