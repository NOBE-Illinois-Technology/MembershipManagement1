// An org's event, as shown on the Calendar widget.
//
// Orgs don't have an events table yet, so this only holds what the calendar needs to place an
// event on a day. Event parameters (type, point category, points, location, mandatory, etc.)
// are intentionally left out for now and can be added here once the events schema exists.
export type OrgEvent = {
  id: string;
  title: string;
  // ISO date or date-time string, e.g. "2026-11-12" or "2026-11-12T18:00:00Z".
  date: string;
};
