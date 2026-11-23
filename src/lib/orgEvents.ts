// Org-owned events (events.org_id, see supabase/migrations/*_org_events.sql). Safe to import from
// client components: nothing here touches Supabase.

// What the Calendar widget needs to place an event on a day.
export type OrgEvent = {
  id: string;
  title: string;
  // ISO date or date-time string, e.g. "2026-11-12" or "2026-11-12T18:00:00Z".
  date: string;
  // Short label shown on the event card, e.g. the committees a committee-only event is for.
  tag?: string | null;
};

// A row of the events table as selected with ORG_EVENT_COLUMNS.
export type OrgEventDbRow = {
  id: string;
  name: string;
  date: string;
  event_type: string | null;
  points: number | null;
  is_mandatory: boolean | null;
  location: string | null;
  dresscode: string | null;
  description: string | null;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  strikes_processed: boolean | null;
};

// An org event as the org pages use it: the table row plus the committees it's for
// (event_committees). An empty list means the event is for all members.
export type OrgEventRow = OrgEventDbRow & { committee_ids: number[] };

// Whether someone in committee `committeeId` (null = no committee) should see this event.
export function isEventVisibleTo(event: Pick<OrgEventRow, "committee_ids">, committeeId: number | null) {
  return event.committee_ids.length === 0 || (committeeId !== null && event.committee_ids.includes(committeeId));
}

// "Technology, Finance" for a committee-only event, or null for an all-members event.
export function committeeLabel(committeeIds: number[], committees: { id?: number; name: string }[]) {
  if (committeeIds.length === 0) return null;
  const names = committeeIds
    .map((id) => committees.find((c) => c.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  return names.length > 0 ? names.join(", ") : null;
}

export const ORG_EVENT_COLUMNS =
  "id, name, date, event_type, points, is_mandatory, location, dresscode, description, check_in_starts_at, check_in_ends_at, strikes_processed";

// Fields that can't change once strikes have been given out for a mandatory event, because the
// strikes were based on them.
export const LOCKED_AFTER_STRIKES = ["date", "check_in_starts_at", "check_in_ends_at", "is_mandatory"] as const;

export const DRESS_CODES = ["Casual", "Smart Casual", "Business Casual", "Business Professional", "Formal"] as const;

// Event type used when the org has no point categories.
export const GENERAL_EVENT_TYPE = "General";

export const EVENT_LIMITS = {
  nameMax: 120,
  locationMax: 120,
  descriptionMax: 2000,
  pointsMax: 10000,
  offsetMinutesMax: 24 * 60,
} as const;

// What the Create Event form sends to POST /api/orgs/[slug]/events.
export type NewOrgEvent = {
  name: string;
  // The org's point category name (or GENERAL_EVENT_TYPE); stored in events.event_type.
  category: string;
  dresscode: string;
  points: number;
  is_mandatory: boolean;
  // ISO date-times built from the form's date + start/end times, in the admin's timezone.
  starts_at: string;
  ends_at: string;
  location: string;
  description: string;
  // Minutes relative to the start time; both null for the default check-in window (start to end).
  check_in_start_offset_minutes: number | null;
  check_in_end_offset_minutes: number | null;
  // The committees the event is for (committees.id); empty = all members.
  committee_ids: number[];
};

// The committee ids from a Create/Edit Event body, or an error. Only the org's own committees
// (`allowedIds`) are accepted; an empty list means the event is for all members.
export function parseCommitteeIds(
  input: unknown,
  allowedIds: number[]
): { ids: number[]; error: null } | { ids: null; error: string } {
  const raw = (input && typeof input === "object" ? (input as { committee_ids?: unknown }).committee_ids : undefined) ?? [];
  if (!Array.isArray(raw)) return { ids: null, error: "Pick the committees this event is for." };
  const ids = [...new Set(raw.map((v) => Number(v)))];
  if (ids.some((id) => !Number.isSafeInteger(id) || !allowedIds.includes(id))) {
    return { ids: null, error: "Pick committees from your organization's committee list." };
  }
  return { ids, error: null };
}

// The events-table row for a new org event, or an error message. `categories` are the org's
// point category names; when it has none, only GENERAL_EVENT_TYPE is allowed.
export function buildOrgEventRow(
  input: unknown,
  categories: string[]
): { row: Record<string, unknown>; error: null } | { row: null; error: string } {
  const e = (input && typeof input === "object" ? input : {}) as Partial<Record<keyof NewOrgEvent, unknown>>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fail = (error: string) => ({ row: null, error });

  const name = str(e.name);
  const category = str(e.category);
  const dresscode = str(e.dresscode);
  const location = str(e.location);
  const description = str(e.description);
  const starts = new Date(str(e.starts_at));
  const ends = new Date(str(e.ends_at));
  const allowedTypes = categories.length > 0 ? categories : [GENERAL_EVENT_TYPE];

  if (!name) return fail("Enter an event name.");
  if (name.length > EVENT_LIMITS.nameMax) return fail(`Event name must be ${EVENT_LIMITS.nameMax} characters or fewer.`);
  if (!allowedTypes.includes(category)) return fail("Pick one of your organization's event types.");
  if (!(DRESS_CODES as readonly string[]).includes(dresscode)) return fail("Pick a dress code.");
  if (typeof e.points !== "number" || !Number.isInteger(e.points) || e.points < 0 || e.points > EVENT_LIMITS.pointsMax) {
    return fail(`Points must be a whole number from 0 to ${EVENT_LIMITS.pointsMax}.`);
  }
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return fail("Enter a date, start time, and end time.");
  if (ends <= starts) return fail("The end time must be after the start time.");
  if (location.length > EVENT_LIMITS.locationMax) return fail(`Location must be ${EVENT_LIMITS.locationMax} characters or fewer.`);
  if (description.length > EVENT_LIMITS.descriptionMax) return fail(`Description must be ${EVENT_LIMITS.descriptionMax} characters or fewer.`);

  // Same check-in window rules as NOBE: by default check-in is open from the start to the end of
  // the event; a custom window is set in minutes relative to the start.
  let checkInStarts = starts;
  let checkInEnds = ends;
  const startOffset = e.check_in_start_offset_minutes;
  const endOffset = e.check_in_end_offset_minutes;
  if (startOffset != null || endOffset != null) {
    const valid = (v: unknown): v is number =>
      typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= EVENT_LIMITS.offsetMinutesMax;
    if (!valid(startOffset) || !valid(endOffset)) return fail("Check-in offsets must be whole numbers of minutes.");
    if (endOffset <= startOffset) return fail("The check-in window must end after it starts.");
    checkInStarts = new Date(starts.getTime() + startOffset * 60_000);
    checkInEnds = new Date(starts.getTime() + endOffset * 60_000);
  }

  return {
    error: null,
    row: {
      name,
      event_type: category,
      dresscode,
      points: e.points,
      is_mandatory: e.is_mandatory === true,
      date: starts.toISOString(),
      check_in_starts_at: checkInStarts.toISOString(),
      check_in_ends_at: checkInEnds.toISOString(),
      location: location || null,
      description: description || null,
    },
  };
}

// A mandatory event whose check-in window has closed and hasn't had strikes given out yet.
export function needsStrikeProcessing(e: OrgEventRow, now = new Date()) {
  return Boolean(e.is_mandatory && !e.strikes_processed && e.check_in_ends_at && new Date(e.check_in_ends_at) < now);
}
