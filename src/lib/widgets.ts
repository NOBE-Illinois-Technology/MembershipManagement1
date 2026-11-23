import type { OrgSettings } from "./orgSettings";
import type { QuickActionId } from "./quickActions";
import { QUICK_ACTIONS } from "./quickActions";

export type WidgetId =
  | "calendar"
  | "club-progress"
  | "attendance"
  | "profile"
  | "strikes"
  | "quick-stats"
  | "manage-members"
  | "pending-absences"
  | "org-info"
  | "quick-actions";

export type WidgetDefinition = {
  id: WidgetId;
  title: string;
  badge: string;
  description: string;
  targetView: "both" | "admin" | "member";
  colSpan?: 1 | 2;
  getParamSummary: (settings?: OrgSettings | null) => string;
};

export const ALL_WIDGETS: WidgetDefinition[] = [
  {
    id: "calendar",
    title: "Calendar & Events",
    badge: "Widget 1",
    description: "Monthly calendar view with upcoming organization events and meetings.",
    targetView: "both",
    colSpan: 2,
    getParamSummary: () => "Event schedule parameters",
  },
  {
    id: "club-progress",
    title: "Club Progress",
    badge: "Widget 2",
    description: "Member point totals and progress toward organization requirements.",
    targetView: "both",
    colSpan: 1,
    getParamSummary: (settings) => {
      const total = settings?.total_points_required ?? 0;
      const count = settings?.categories?.length ?? 0;
      return `${total > 0 ? `${total} pts required` : "No point minimum"}, ${count} ${count === 1 ? "category" : "categories"}`;
    },
  },
  {
    id: "attendance",
    title: "Attendance",
    badge: "Widget 3",
    description: "Member attendance totals and event participation tracker.",
    targetView: "both",
    colSpan: 1,
    getParamSummary: (settings) =>
      `${settings?.categories?.length ?? 0} attendance ${settings?.categories?.length === 1 ? "category" : "categories"}`,
  },
  {
    id: "profile",
    title: "Member Profile View",
    badge: "Widget 3",
    description: "Member profile identity, assigned committees, and membership standing.",
    targetView: "both",
    colSpan: 1,
    getParamSummary: (settings) => {
      const committees = settings?.committees?.length ?? 0;
      return `${committees} ${committees === 1 ? "committee" : "committees"} configured`;
    },
  },
  {
    id: "strikes",
    title: "Strikes Tracker",
    badge: "Widget 4",
    description: "Attendance strike status, absence violations, and penalty policy limits.",
    targetView: "both",
    colSpan: 1,
    getParamSummary: (settings) => {
      if (settings?.strikes_enabled) {
        return `Strikes active (Max: ${settings.max_strikes ?? 3})`;
      }
      return "Disabled in Org Settings";
    },
  },
  {
    id: "quick-stats",
    title: "Admin Overview",
    badge: "Admin",
    description: "Key organization indicators, member count, and overview metrics.",
    targetView: "admin",
    colSpan: 2,
    getParamSummary: (settings) =>
      `${settings?.categories?.length ?? 0} point types, ${settings?.committees?.length ?? 0} committees`,
  },
  {
    id: "manage-members",
    title: "Member Management",
    badge: "Admin",
    description: "Member roster, role administration, and organization invite link generation.",
    targetView: "admin",
    colSpan: 2,
    getParamSummary: () => "Invite & role management",
  },
  {
    id: "quick-actions",
    title: "Quick Actions",
    badge: "Admin",
    description: "Shortcut buttons for admin tasks like creating events, emailing members, reviewing absences, and processing strikes.",
    targetView: "admin",
    colSpan: 1,
    getParamSummary: (settings) =>
      `${QUICK_ACTIONS.length} buttons, Strikes ${settings?.strikes_enabled ? "on" : "off in Settings"}`,
  },
  {
    id: "pending-absences",
    title: "Pending Absences",
    badge: "Admin",
    description: "Review and approve/deny excuse requests submitted by members.",
    targetView: "admin",
    colSpan: 1,
    getParamSummary: () => "Review member absence excuses",
  },
  {
    id: "org-info",
    title: "Org Branding & Committees",
    badge: "Settings",
    description: "Organization branding preview, color palette, and committee structure.",
    targetView: "both",
    colSpan: 1,
    getParamSummary: (settings) =>
      `Primary: ${settings?.primary_color ?? "#5b8def"}${settings?.secondary_color ? `, Sec: ${settings.secondary_color}` : ""}`,
  },
];

// Recommended cohesive default layout for true admin and member views
export const DEFAULT_ADMIN_WIDGETS: WidgetId[] = [
  "quick-actions",
  "calendar",
  "manage-members",
  "points",
  "strikes",
  "profile",
];

export const DEFAULT_MEMBER_WIDGETS: WidgetId[] = [
  "calendar",
  "points",
  "profile",
  "strikes",
];

export const DEFAULT_QUICK_ACTIONS: QuickActionId[] = [
  "create-event",
  "email-members",
  "strikes",
  "absence-review",
];

/**
 * Populates the list of available widgets based on Nadia's org settings parameters
 * and the active page view (Admin vs Member).
 */
export function getAvailableWidgets(
  settings: OrgSettings | null | undefined,
  view: "admin" | "member"
): WidgetDefinition[] {
  return ALL_WIDGETS.filter(
    (w) => w.targetView === "both" || w.targetView === view
  );
}
