"use client";

import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";
import { committeeLabel } from "@/lib/orgEvents";
import type { OrgDashboardData } from "@/lib/orgDashboard";
import type { WidgetId } from "@/lib/widgets";
import type { QuickActionId, QuickActionContext } from "@/lib/quickActions";
import CalendarWidget from "./CalendarWidget";
import PointsWidget from "./PointsWidget";
import AttendanceSummary from "./AttendanceSummary";
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

// Everything a widget may need. Used by the dashboard (OrgViews) and the widget customizer so a
// widget looks the same in both places.
export type WidgetRenderContext = {
  org: Org;
  settings: OrgSettings | null | undefined;
  // Real org data loaded by the page (see loadOrgDashboardData).
  data: OrgDashboardData;
  quickActions: QuickActionsState;
  // Admin dashboard only: clicking an event on the Calendar opens it for editing.
  onEditEvent?: (eventId: string) => void;
  onOpenAbsenceReview?: () => void;
};

export function renderWidgetContent(widgetId: WidgetId, ctx: WidgetRenderContext) {
  const { org, settings, data, quickActions } = ctx;
  const accentColor = settings?.primary_color ?? org.primary_color ?? "#3B82F6";
  const committees = settings?.committees ?? [];
  const categories = settings?.categories?.map((c) => ({ name: c.name, mandatory: c.is_mandatory }));
  const memberEvents = data.events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    eventType: e.event_type,
    category: e.event_type,
    isMandatory: e.is_mandatory,
  }));

  switch (widgetId) {
    case "quick-actions":
      return (
        <QuickActionsWidget
          orgSlug={org.slug}
          orgName={org.name}
          settings={settings}
          events={data.events}
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
          events={data.events.map((e) => ({
            id: e.id,
            title: e.name,
            date: e.date,
            // Committee-only events show which committees they're for.
            tag: committeeLabel(e.committee_ids, committees),
          }))}
          accentColor={accentColor}
          onEventClick={ctx.onEditEvent}
        />
      );
    case "club-progress":
      return <PointsWidget settings={settings} earnedByCategory={{}} accentColor={accentColor} />;
    case "attendance":
      return (
        <AttendanceSummary
          memberId="preview"
          events={memberEvents}
          attendance={[]}
          absences={[]}
          categories={categories}
          accentColor={accentColor}
        />
      );
    case "profile":
      return <ProfileWidget profile={data.viewer} accentColor={accentColor} />;
    case "strikes":
      return <StrikesWidget settings={settings} accentColor={accentColor} />;
    case "manage-members":
      return (
        <MemberManagementWidget
          orgName={org.name}
          members={data.members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            committee: m.committee,
            major: m.major,
            year: m.year,
            college: m.college,
            activeStrikes: m.activeStrikes,
            joinedAt: m.joinedAt,
          }))}
          events={memberEvents}
          attendance={data.attendance}
          absences={data.absences}
          categories={categories}
          committees={committees.map((c) => c.name)}
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
          events={data.events}
          memberCount={data.members.length}
          accentColor={accentColor}
        />
      );
    case "pending-absences":
      return (
        <PendingAbsencesWidget orgSlug={org.slug} accentColor={accentColor} onOpenReview={ctx.onOpenAbsenceReview} />
      );
    case "org-info":
      return <OrgInfoWidget org={org} settings={settings} accentColor={accentColor} />;
    default:
      return undefined;
  }
}
