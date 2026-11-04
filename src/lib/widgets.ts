import type { OrgSettings } from "./orgSettings";

export type WidgetId =
  | "calendar"
  | "points"
  | "profile"
  | "strikes"
  | "quick-stats"
  | "manage-members"
  | "pending-absences"
  | "org-info";

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
    id: "points",
    title: "Points & Attendance",
    badge: "Widget 2",
    description: "Point breakdown and event attendance requirement tracker.",
    targetView: "both",
    colSpan: 1,
    getParamSummary: (settings) => {
      const total = settings?.total_points_required ?? 0;
      const count = settings?.categories?.length ?? 0;
      return `${total > 0 ? `${total} pts required` : "No point minimum"} • ${count} ${count === 1 ? "category" : "categories"}`;
    },
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
    description: "Key organization indicators and overview metrics.",
    targetView: "admin",
    colSpan: 2,
    getParamSummary: (settings) =>
      `${settings?.categories?.length ?? 0} point types • ${settings?.committees?.length ?? 0} committees`,
  },
  {
    id: "manage-members",
    title: "Member Management",
    badge: "Admin",
    description: "Member roster, role administration, and organization invite link generation.",
    targetView: "admin",
    colSpan: 1,
    getParamSummary: () => "Invite & role management",
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
      `Primary: ${settings?.primary_color ?? "#5b8def"}${settings?.secondary_color ? ` • Sec: ${settings.secondary_color}` : ""}`,
  },
];

// No start template by default — users build their dashboard via drag & drop
export const DEFAULT_ADMIN_WIDGETS: WidgetId[] = [];
export const DEFAULT_MEMBER_WIDGETS: WidgetId[] = [];

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
