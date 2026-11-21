"use client";

import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";
import type { OrgEventRow } from "@/lib/orgEvents";
import type { WidgetId } from "@/lib/widgets";
import type { QuickActionId, QuickActionContext } from "@/lib/quickActions";
import CalendarWidget from "./CalendarWidget";
import PointsWidget from "./PointsWidget";
import ProfileWidget from "./ProfileWidget";
import StrikesWidget from "./StrikesWidget";
import MemberManagementWidget from "./MemberManagementWidget";
import QuickActionsWidget from "./QuickActionsWidget";
import QuickStatsWidget from "./QuickStatsWidget";
import PendingAbsencesWidget from "./PendingAbsencesWidget";
import OrgInfoWidget from "./OrgInfoWidget";

export type QuickActionsState = {
  actions: QuickActionId[];
  context: QuickActionContext;
  isCustomizing: boolean;
  onAdd: (id: QuickActionId) => void;
  onRemove: (id: QuickActionId) => void;
};

export const SAMPLE_MEMBERS = [
  { id: "1", name: "Risha Bansal", email: "rishab5@illinois.edu", role: "ADMIN", committee: "Technology", major: "CS", year: "2029", college: "Grainger", totalPoints: 6, activeStrikes: 0, joinedAt: "2026-07-01" },
  { id: "2", name: "Srikriti Mutyala", email: "mutyala3@illinois.edu", role: "ADMIN", committee: "Technology", major: "CS+Statistics", year: "2029", college: "Grainger", totalPoints: 1, activeStrikes: 1, joinedAt: "2026-08-20" },
  { id: "3", name: "Vinay Nair", email: "vinayn5@illinois.edu", role: "MEMBER", committee: "Technology", totalPoints: 0, activeStrikes: 0, joinedAt: "2026-01-10" },
  { id: "4", name: "Nadia Shastri", email: "nadiaks2@illinois.edu", role: "MEMBER", committee: "Technology", totalPoints: 0, activeStrikes: 0, joinedAt: "2026-01-11" },
];

export const SAMPLE_EVENTS = [
  { id: "e1", name: "Semi Formal", date: "2026-11-11", eventType: "social", category: "Social" },
  { id: "e2", name: "Slime Social", date: "2026-11-10", eventType: "social", category: "Social" },
  { id: "e3", name: "Investment 101 Workshop", date: "2026-11-05", eventType: "professional", category: "Professional" },
  { id: "e4", name: "Literary Bookmarks with MBSA", date: "2026-11-03", eventType: "service", category: "Service" },
];

export const SAMPLE_ATTENDANCE = [
  { memberId: "1", eventId: "e2", checkedInAt: "2026-11-10T17:53:00" },
  { memberId: "1", eventId: "e3", checkedInAt: "2026-11-05T18:05:00" },
  { memberId: "1", eventId: "e4", checkedInAt: "2026-11-03T16:30:00" },
  { memberId: "2", eventId: "e3", checkedInAt: "2026-11-05T18:02:00" },
  { memberId: "2", eventId: "e1", checkedInAt: "2026-11-11T20:10:00" },
  { memberId: "3", eventId: "e1", checkedInAt: "2026-11-11T20:15:00" },
  { memberId: "3", eventId: "e2", checkedInAt: "2026-11-10T17:48:00" },
  { memberId: "4", eventId: "e4", checkedInAt: "2026-11-03T16:42:00" },
];

export function renderWidgetContent(
  widgetId: WidgetId,
  org: Org,
  settings: OrgSettings | null | undefined,
  events: OrgEventRow[],
  quickActions: QuickActionsState,
  onEditEvent?: (eventId: string) => void,
  onOpenAbsenceReview?: () => void
) {
  const accentColor = settings?.primary_color ?? org.primary_color ?? "#3B82F6";

  const memberEvents = events.length > 0
    ? events.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date,
        eventType: e.event_type,
        category: e.event_type,
        isMandatory: e.is_mandatory,
      }))
    : SAMPLE_EVENTS;

  switch (widgetId) {
    case "quick-actions":
      return (
        <QuickActionsWidget
          orgSlug={org.slug}
          orgName={org.name}
          settings={settings}
          events={events}
          context={quickActions.context}
          accentColor={accentColor}
          actions={quickActions.actions}
          isCustomizing={quickActions.isCustomizing}
          onAddAction={quickActions.onAdd}
          onRemoveAction={quickActions.onRemove}
        />
      );
    case "calendar":
      return (
        <CalendarWidget
          events={events.map((e) => ({ id: e.id, title: e.name, date: e.date }))}
          accentColor={accentColor}
          onEventClick={onEditEvent}
        />
      );
    case "points":
      return <PointsWidget settings={settings} earnedByCategory={{}} accentColor={accentColor} />;
    case "profile":
      return <ProfileWidget accentColor={accentColor} />;
    case "strikes":
      return <StrikesWidget settings={settings} accentColor={accentColor} />;
    case "manage-members":
      return (
        <MemberManagementWidget
          orgName={org.name}
          members={SAMPLE_MEMBERS}
          events={memberEvents}
          attendance={SAMPLE_ATTENDANCE}
          categories={settings?.categories?.map((c) => ({ name: c.name, mandatory: c.is_mandatory }))}
          accentColor={accentColor}
          onChangeRole={async (id, role) => console.log("change role", id, role)}
          onDeactivate={async (id) => console.log("deactivate", id)}
        />
      );
    case "quick-stats":
      return (
        <QuickStatsWidget
          org={org}
          settings={settings}
          events={events}
          memberCount={SAMPLE_MEMBERS.length}
          accentColor={accentColor}
        />
      );
    case "pending-absences":
      return (
        <PendingAbsencesWidget
          orgSlug={org.slug}
          accentColor={accentColor}
          onOpenReview={onOpenAbsenceReview}
        />
      );
    case "org-info":
      return <OrgInfoWidget org={org} settings={settings} accentColor={accentColor} />;
    default:
      return undefined;
  }
}
