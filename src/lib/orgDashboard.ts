import type { OrgEventRow } from "./orgEvents";

// What the org dashboard and widget customizer pages load on the server and hand to the widgets.
// Safe to import from client components: types only.

// An org member as Member Management shows them. `id` is people.id; attendance, absences and
// strikes are keyed by the member's login (authId) in the database and mapped to `id` here.
export type OrgMemberRow = {
  id: number;
  authId: string | null;
  name: string;
  email: string | null;
  role: "ADMIN" | "MEMBER";
  committeeId: number | null;
  committee: string | null;
  major: string | null;
  year: string | null;
  college: string | null;
  joinedAt: string | null;
  activeStrikes: number;
};

export type OrgAttendanceRow = { memberId: number; eventId: string; checkedInAt: string | null };
export type OrgAbsenceRow = { memberId: number; eventId: string | null; status: string | null };

// The signed-in viewer's own membership, for the Profile widget and event visibility.
export type OrgViewer = {
  name: string;
  email: string | null;
  role: "ADMIN" | "MEMBER";
  committeeId: number | null;
  committee: string | null;
  major: string | null;
  year: string | null;
  college: string | null;
};

export type OrgDashboardData = {
  // Admins get every event; members only all-members events and their own committee's.
  events: OrgEventRow[];
  viewer: OrgViewer | null;
  // Roster data is only loaded for admins (members never receive other members' details).
  members: OrgMemberRow[];
  attendance: OrgAttendanceRow[];
  absences: OrgAbsenceRow[];
};

export const EMPTY_DASHBOARD_DATA: OrgDashboardData = {
  events: [],
  viewer: null,
  members: [],
  attendance: [],
  absences: [],
};
