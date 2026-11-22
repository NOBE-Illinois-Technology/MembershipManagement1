"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";
import {
  ALL_WIDGETS,
  DEFAULT_ADMIN_WIDGETS,
  DEFAULT_MEMBER_WIDGETS,
  getAvailableWidgets,
  type WidgetId,
} from "@/lib/widgets";
import WidgetTemplate from "./WidgetTemplate";
import CalendarWidget from "./widgets/CalendarWidget";
import PointsWidget from "./widgets/PointsWidget";
import AttendanceSummary from "./widgets/AttendanceSummary";
import ProfileWidget from "./widgets/ProfileWidget";
import StrikesWidget from "./widgets/StrikesWidget";
import MemberManagementWidget from "./widgets/MemberManagementWidget";
import QuickActionsWidget from "./widgets/QuickActionsWidget";
import QuickActionModal from "./widgets/quickActions/QuickActionModal";
import CreateEventPanel from "./widgets/quickActions/CreateEventPanel";
import {
  QUICK_ACTIONS,
  QUICK_ACTION_DRAG_TYPE,
  getQuickActionAvailability,
  isQuickActionId,
  type QuickActionContext,
  type QuickActionId,
} from "@/lib/quickActions";
import type { OrgEventRow } from "@/lib/orgEvents";

type View = "admin" | "member";

// Quick action buttons may only be dropped inside the Quick Actions widget, never on the dashboard.
const isQuickActionDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(QUICK_ACTION_DRAG_TYPE);

type QuickActionsState = {
  actions: QuickActionId[];
  context: QuickActionContext;
  isCustomizing: boolean;
  onAdd: (id: QuickActionId) => void;
  onRemove: (id: QuickActionId) => void;
};

const SAMPLE_MEMBERS = [
  { id: "1", name: "Risha Bansal", email: "rishab5@illinois.edu", role: "ADMIN", committee: "Technology", major: "CS", year: "2029", college: "Grainger", totalPoints: 6, activeStrikes: 0, joinedAt: "2026-07-01" },
  { id: "2", name: "Srikriti Mutyala", email: "mutyala3@illinois.edu", role: "ADMIN", committee: "Technology", major: "CS+Statistics", year: "2029", college: "Grainger", totalPoints: 1, activeStrikes: 1, joinedAt: "2026-08-20" },
  { id: "3", name: "Vinay Nair", email: "vinayn5@illinois.edu", role: "MEMBER", committee: "Technology", totalPoints: 0, activeStrikes: 0, joinedAt: "2026-01-10" },
  { id: "4", name: "Nadia Shastri", email: "nadiaks2@illinois.edu", role: "MEMBER", committee: "Technology", totalPoints: 0, activeStrikes: 0, joinedAt: "2026-01-11" },
];

const SAMPLE_EVENTS = [
  { id: "e1", name: "Semi Formal", date: "2026-11-11", eventType: "social", category: "Social" },
  { id: "e2", name: "Slime Social", date: "2026-11-10", eventType: "social", category: "Social" },
  { id: "e3", name: "Investment 101 Workshop", date: "2026-11-05", eventType: "professional", category: "Professional" },
  { id: "e4", name: "Literary Bookmarks with MBSA", date: "2026-11-03", eventType: "service", category: "Service" },
];

const SAMPLE_CATEGORIES = [
  { name: "Professional", mandatory: true },
  { name: "Social" },
  { name: "Service" },
];

const SAMPLE_ATTENDANCE = [
  // Risha: 3 of 4
  { memberId: "1", eventId: "e2", checkedInAt: "2026-11-10T17:53:00" },
  { memberId: "1", eventId: "e3", checkedInAt: "2026-11-05T18:05:00" },
  { memberId: "1", eventId: "e4", checkedInAt: "2026-11-03T16:30:00" },
  // Srikriti: 2 of 4
  { memberId: "2", eventId: "e3", checkedInAt: "2026-11-05T18:02:00" },
  { memberId: "2", eventId: "e1", checkedInAt: "2026-11-11T20:10:00" },
  // Vinay: 2 of 4
  { memberId: "3", eventId: "e1", checkedInAt: "2026-11-11T20:15:00" },
  { memberId: "3", eventId: "e2", checkedInAt: "2026-11-10T17:48:00" },
  // Nadia: 1 of 4
  { memberId: "4", eventId: "e4", checkedInAt: "2026-11-03T16:42:00" },
];

// The calendar and quick actions use the org's real events; member-specific data (points,
// attendance, roster) isn't loaded per org yet, so those widgets still use sample data.
function renderWidgetContent(
  widgetId: WidgetId,
  org: Org,
  settings: OrgSettings | null | undefined,
  events: OrgEventRow[],
  quickActions: QuickActionsState,
  // Admin view only: clicking an event on the Calendar opens it for editing.
  onEditEvent?: (eventId: string) => void
) {
  const accentColor = settings?.primary_color ?? org.primary_color;
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
    case "club-progress":
      return <PointsWidget settings={settings} earnedByCategory={{}} accentColor={accentColor} />;
    case "attendance":
      return (
        <AttendanceSummary
          memberId="preview"
          events={events.map((event) => ({
            id: event.id,
            name: event.name,
            date: event.date,
            category: event.event_type,
            isMandatory: event.is_mandatory,
          }))}
          attendance={[]}
          absences={[]}
          categories={settings?.categories?.map((category) => ({
            name: category.name,
            mandatory: category.is_mandatory,
          }))}
          accentColor={accentColor}
        />
      );
    case "profile":
      return <ProfileWidget accentColor={accentColor} />;
    case "strikes":
      return <StrikesWidget settings={settings} accentColor={accentColor} />;
    case "manage-members":
      return (
        <MemberManagementWidget
          orgName={org.name}
          members={SAMPLE_MEMBERS}
          events={SAMPLE_EVENTS}
          attendance={SAMPLE_ATTENDANCE}
          categories={settings?.categories?.map((c) => ({ name: c.name, mandatory: c.mandatory }))}
          accentColor={accentColor}
          onChangeRole={async (id, role) => console.log("change role", id, role)}
          onDeactivate={async (id) => console.log("deactivate", id)}
        />
      );
    default:
      return undefined;
  }
}

export default function OrgViews({
  org,
  settings,
  events = [],
}: {
  org: Org;
  settings?: OrgSettings | null;
  // The org's own events, loaded by the page.
  events?: OrgEventRow[];
}) {
  const quickActionContext: QuickActionContext = {
    settings,
    hasMandatoryEvents: events.some((e) => e.is_mandatory),
  };
  const isAdmin = org.role === "ADMIN";
  const [view, setView] = useState<View>(isAdmin ? "admin" : "member");

  // Admins can see the sidebar and drag/drop customize the dashboard
  const [showSidebar, setShowSidebar] = useState(isAdmin);

  // Layouts start empty by default (no start template)
  const [adminWidgets, setAdminWidgets] = useState<WidgetId[]>(DEFAULT_ADMIN_WIDGETS);
  const [memberWidgets, setMemberWidgets] = useState<WidgetId[]>(DEFAULT_MEMBER_WIDGETS);

  const [draggingSidebarId, setDraggingSidebarId] = useState<WidgetId | null>(null);
  const [draggingGridIndex, setDraggingGridIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Buttons placed inside the Quick Actions widget (admin view only), saved like the layouts.
  const [quickActions, setQuickActions] = useState<QuickActionId[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const quickActionsKey = `org_quick_actions_${org.id}`;

  // Load saved layouts from localStorage if available
  useEffect(() => {
    try {
      const savedAdmin = localStorage.getItem(`org_widgets_${org.id}_admin`);
      if (savedAdmin) {
        const parsed = JSON.parse(savedAdmin);
        if (Array.isArray(parsed)) setAdminWidgets(parsed);
      }
      const savedMember = localStorage.getItem(`org_widgets_${org.id}_member`);
      if (savedMember) {
        const parsed = JSON.parse(savedMember);
        if (Array.isArray(parsed)) setMemberWidgets(parsed);
      }
      const savedQuickActions = localStorage.getItem(`org_quick_actions_${org.id}`);
      if (savedQuickActions) {
        const parsed = JSON.parse(savedQuickActions);
        if (Array.isArray(parsed)) setQuickActions([...new Set(parsed.filter(isQuickActionId))]);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, [org.id]);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  function saveLayout(newLayout: WidgetId[]) {
    if (view === "admin") {
      setAdminWidgets(newLayout);
      try {
        localStorage.setItem(`org_widgets_${org.id}_admin`, JSON.stringify(newLayout));
      } catch {}
    } else {
      setMemberWidgets(newLayout);
      try {
        localStorage.setItem(`org_widgets_${org.id}_member`, JSON.stringify(newLayout));
      } catch {}
    }
  }

  const activeWidgets = view === "admin" ? adminWidgets : memberWidgets;
  const availableWidgets = getAvailableWidgets(settings, view);

  function addWidget(widgetId: WidgetId, targetIndex?: number) {
    // There's one set of quick action buttons, so only one Quick Actions widget.
    if (widgetId === "quick-actions" && activeWidgets.includes("quick-actions")) {
      showFeedback("Quick Actions is already on the dashboard. Drag buttons into it instead.");
      return;
    }
    const list = [...activeWidgets];
    if (typeof targetIndex === "number" && targetIndex >= 0 && targetIndex <= list.length) {
      list.splice(targetIndex, 0, widgetId);
    } else {
      list.push(widgetId);
    }
    saveLayout(list);
    const def = ALL_WIDGETS.find((w) => w.id === widgetId);
    showFeedback(`Added "${def?.title || widgetId}" to ${view === "admin" ? "Admin" : "Member"} layout`);
  }

  function removeWidget(index: number) {
    const list = [...activeWidgets];
    const [removed] = list.splice(index, 1);
    saveLayout(list);
    // Its buttons go with it, so re-adding the widget starts empty.
    if (removed === "quick-actions") saveQuickActions([]);
    const def = ALL_WIDGETS.find((w) => w.id === removed);
    showFeedback(`Removed "${def?.title || removed}" from dashboard`);
  }

  function moveWidget(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const list = [...activeWidgets];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    saveLayout(list);
  }

  function clearLayout() {
    saveLayout([]);
    if (view === "admin") saveQuickActions([]);
    showFeedback(`Cleared ${view} layout`);
  }

  function saveQuickActions(list: QuickActionId[]) {
    setQuickActions(list);
    try {
      localStorage.setItem(quickActionsKey, JSON.stringify(list));
    } catch {}
  }

  // Adds a button to the Quick Actions widget. From the side panel's "+ Add" the widget may not be
  // on the dashboard yet, so it's added too.
  // Adds a button to the Quick Actions widget. If the widget isn't on the dashboard yet, it's placed
  // too (at `targetIndex`, or at the end), so dragging a single button brings the widget with it.
  function addQuickAction(id: QuickActionId, targetIndex?: number) {
    const def = QUICK_ACTIONS.find((a) => a.id === id);
    const availability = getQuickActionAvailability(id, quickActionContext);
    if (!availability.available) {
      showFeedback(availability.reason);
      return;
    }
    const widgetPlaced = adminWidgets.includes("quick-actions");
    if (widgetPlaced && quickActions.includes(id)) {
      showFeedback(`"${def?.label}" is already in Quick Actions`);
      return;
    }
    if (!quickActions.includes(id)) saveQuickActions([...quickActions, id]);
    if (!widgetPlaced) {
      const layout = [...adminWidgets];
      const at = typeof targetIndex === "number" ? Math.min(Math.max(targetIndex, 0), layout.length) : layout.length;
      layout.splice(at, 0, "quick-actions");
      saveLayout(layout);
      showFeedback(`Added the Quick Actions widget with "${def?.label}"`);
      return;
    }
    showFeedback(`Added "${def?.label}" to Quick Actions`);
  }

  // The quick action button being dropped, if the drag is one.
  function droppedQuickAction(e: React.DragEvent): QuickActionId | null {
    const id = e.dataTransfer.getData(QUICK_ACTION_DRAG_TYPE);
    return isQuickActionId(id) ? id : null;
  }

  function removeQuickAction(id: QuickActionId) {
    saveQuickActions(quickActions.filter((a) => a !== id));
    showFeedback(`Removed "${QUICK_ACTIONS.find((a) => a.id === id)?.label}" from Quick Actions`);
  }

  const quickActionsState: QuickActionsState = {
    actions: quickActions,
    context: quickActionContext,
    isCustomizing: isAdmin,
    onAdd: (id) => addQuickAction(id),
    onRemove: removeQuickAction,
  };

  // The event open in the edit pop-up (an admin clicked it on the Calendar). Looked up in the
  // page's events each render, so after a save the form's data is current, and after a delete
  // (the event disappears on refresh) the pop-up closes on its own.
  const editingEvent = editingEventId ? events.find((e) => e.id === editingEventId) : undefined;

  return (
    <div style={{ width: "100%", maxWidth: showSidebar ? "1200px" : "960px", transition: "max-width 0.2s ease" }}>
      {/* Top Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: "#0F172A" }}>{org.name}</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748B" }}>
            {view === "admin" ? "Admin View" : "Member View"}
          </p>
        </div>

        {/* View Toggle and Actions */}
        {isAdmin && (
          <div style={headerActionsStyle}>
            <div role="tablist" aria-label="Page view" style={toggleStyle}>
              <ToggleButton active={view === "admin"} onClick={() => setView("admin")}>
                Admin
              </ToggleButton>
              <ToggleButton active={view === "member"} onClick={() => setView("member")}>
                Member preview
              </ToggleButton>
            </div>

            {/* Side Panel Toggle */}
            <button
              type="button"
              onClick={() => setShowSidebar((prev) => !prev)}
              style={{
                ...actionButtonStyle,
                background: showSidebar ? "#0F172A" : "white",
                color: showSidebar ? "white" : "#0F172A",
                borderColor: "#0F172A",
              }}
            >
              <LayoutIcon />
              {showSidebar ? "Hide Widget Panel" : "Add Widgets"}
            </button>

            <Link href={`/orgs/${org.slug}/settings`} style={actionButtonStyle}>
              <GearIcon />
              Settings
            </Link>
          </div>
        )}
      </header>

      {/* Member Preview Banner */}
      {view === "member" && isAdmin && (
        <div style={bannerStyle}>
          Previewing what members of <strong>{org.name}</strong> see. Drag & drop widgets to design the member layout.
        </div>
      )}

      {/* Edit / delete an event clicked on the Calendar (admins only) */}
      {isAdmin && editingEvent && (
        <QuickActionModal
          eyebrow="Calendar"
          title="Edit Event"
          subtitle={`Change or delete "${editingEvent.name}".`}
          onClose={() => setEditingEventId(null)}
        >
          <CreateEventPanel
            key={editingEvent.id}
            orgSlug={org.slug}
            settings={settings}
            accentColor={settings?.primary_color ?? org.primary_color}
            existing={editingEvent}
            onDeleted={() => {
              setEditingEventId(null);
              showFeedback(`Deleted "${editingEvent.name}"`);
            }}
          />
        </QuickActionModal>
      )}

      {/* Toast Feedback */}
      {feedback && (
        <div style={toastStyle}>
          {feedback}
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        {/* Main Dashboard Widget Canvas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeWidgets.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const action = droppedQuickAction(e);
                if (action) {
                  addQuickAction(action);
                  return;
                }
                const newId = (e.dataTransfer.getData("application/widget-id") || draggingSidebarId) as WidgetId;
                if (newId) {
                  addWidget(newId);
                  setDraggingSidebarId(null);
                }
              }}
              style={{
                padding: "60px 24px",
                textAlign: "center",
                background: "white",
                borderRadius: "14px",
                border: "2px dashed #CBD5E1",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧩</div>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#1E293B" }}>
                Empty {view === "admin" ? "Admin" : "Member"} Layout
              </h3>
              <p style={{ margin: "0 0 16px", color: "#64748B", fontSize: "14px" }}>
                Drag widgets from the side panel to design the UI layout.
              </p>
              {!showSidebar && isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSidebar(true)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "#0F172A",
                    color: "white",
                    border: 0,
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Open Widget Panel
                </button>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 600 }}>
                  {activeWidgets.length} {activeWidgets.length === 1 ? "widget" : "widgets"} placed • Drag cards to reorder
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={clearLayout}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      background: "transparent",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      color: "#64748B",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div style={gridStyle}>
                {activeWidgets.map((widgetId, index) => {
                  const def = ALL_WIDGETS.find((w) => w.id === widgetId) ?? {
                    id: widgetId,
                    title: widgetId,
                    badge: "Widget",
                    description: "",
                    targetView: "both" as const,
                    colSpan: 1 as const,
                    getParamSummary: () => "",
                  };

                  const isDraggingThis = draggingGridIndex === index;
                  const isDropTarget = dropTargetIndex === index;

                  return (
                    <div
                      key={`${widgetId}-${index}`}
                      draggable={isAdmin}
                      onDragStart={(e) => {
                        if (!isAdmin) return;
                        setDraggingGridIndex(index);
                        e.dataTransfer.setData("text/plain", String(index));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        if (!isAdmin) return;
                        e.preventDefault();
                        // A single button joins the existing Quick Actions widget, so don't
                        // highlight this card as a place it'll be inserted.
                        if (!(isQuickActionDrag(e) && adminWidgets.includes("quick-actions"))) setDropTargetIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dropTargetIndex === index) setDropTargetIndex(null);
                      }}
                      onDrop={(e) => {
                        if (!isAdmin) return;
                        e.preventDefault();
                        setDropTargetIndex(null);

                        // A single quick action button: into the Quick Actions widget (placed here if needed)
                        const action = droppedQuickAction(e);
                        if (action) {
                          addQuickAction(action, index);
                          return;
                        }

                        // Check if dropping new widget from sidebar
                        const newId = e.dataTransfer.getData("application/widget-id") as WidgetId;
                        if (newId) {
                          addWidget(newId, index);
                          setDraggingSidebarId(null);
                          return;
                        }

                        // Otherwise reorder existing
                        if (draggingGridIndex !== null && draggingGridIndex !== index) {
                          moveWidget(draggingGridIndex, index);
                          setDraggingGridIndex(null);
                        }
                      }}
                      onDragEnd={() => {
                        setDraggingGridIndex(null);
                        setDropTargetIndex(null);
                      }}
                      style={{
                        gridColumn: def.colSpan && def.colSpan > 1 ? "span 2" : "span 1",
                      }}
                    >
                      <WidgetTemplate
                        widget={def}
                        isDragging={isDraggingThis}
                        isDropTarget={isDropTarget}
                        isCustomizing={isAdmin}
                        onRemove={() => removeWidget(index)}
                      >
                        {renderWidgetContent(
                          widgetId,
                          org,
                          settings,
                          events,
                          quickActionsState,
                          isAdmin && view === "admin" ? setEditingEventId : undefined
                        )}
                      </WidgetTemplate>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Drop Target */}
              {isAdmin && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const action = droppedQuickAction(e);
                    if (action) {
                      addQuickAction(action);
                      return;
                    }
                    const newId = (e.dataTransfer.getData("application/widget-id") || draggingSidebarId) as WidgetId;
                    if (newId) {
                      addWidget(newId);
                      setDraggingSidebarId(null);
                    } else if (draggingGridIndex !== null) {
                      moveWidget(draggingGridIndex, activeWidgets.length - 1);
                      setDraggingGridIndex(null);
                    }
                  }}
                  style={{
                    marginTop: "16px",
                    padding: "20px",
                    border: "2px dashed #CBD5E1",
                    borderRadius: "12px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.6)",
                    color: "#64748B",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  + Drop widget here to add to the bottom
                </div>
              )}
            </div>
          )}
        </div>

        {/* Available Widgets Side Tray / Drawer */}
        {showSidebar && isAdmin && (
          <aside style={sideTrayStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Available Widgets</h3>
                <span style={{ fontSize: "11px", color: "#64748B" }}>
                  Populated from Org Settings
                </span>
              </div>
              <span style={{ fontSize: "11px", padding: "2px 6px", background: "#E2E8F0", borderRadius: "999px", fontWeight: 700 }}>
                {availableWidgets.length} available
              </span>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {availableWidgets.map((widget) => {
                const paramSummary = widget.getParamSummary(settings);
                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggingSidebarId(widget.id);
                      e.dataTransfer.setData("application/widget-id", widget.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={() => setDraggingSidebarId(null)}
                    style={{
                      padding: "12px",
                      background: "white",
                      border: "1px solid #CBD5E1",
                      borderRadius: "10px",
                      cursor: "grab",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#64748B" }}>⋮⋮</span> {widget.title}
                      </span>
                      <span style={{ fontSize: "10px", padding: "2px 6px", background: "#E0E7FF", color: "#3730A3", borderRadius: "4px", fontWeight: 700 }}>
                        {widget.badge}
                      </span>
                    </div>

                    <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#64748B", lineHeight: "1.4" }}>
                      {widget.description}
                    </p>

                    {/* Dynamic parameter note from Nadia's settings */}
                    <div style={{ padding: "4px 8px", background: "#F1F5F9", borderRadius: "6px", fontSize: "11px", color: "#334155", fontWeight: 600, marginBottom: "8px" }}>
                      ⚙️ {paramSummary}
                    </div>

                    {/* Quick Actions holds its buttons: drag the card for an empty widget, or drag one
                        button to place the widget with just that button */}
                    {widget.id === "quick-actions" && (
                      <QuickActionChips
                        context={quickActionContext}
                        inWidget={(id) => quickActions.includes(id) && adminWidgets.includes("quick-actions")}
                        onAdd={(id) => addQuickAction(id)}
                        onDragStart={() => setDraggingSidebarId(null)}
                      />
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "#94A3B8" }}>Drag into dashboard</span>
                      <button
                        type="button"
                        onClick={() => addWidget(widget.id)}
                        style={{
                          padding: "3px 8px",
                          fontSize: "11px",
                          background: "#F8FAFC",
                          border: "1px solid #CBD5E1",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: 700,
                          color: "#0F172A",
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </aside>
        )}
      </div>
    </div>
  );
}

/* ---------- Subcomponents & Icons ---------- */

// The quick action buttons inside the side panel's Quick Actions card. Each available button can be
// dragged on its own (dropping it anywhere on the dashboard adds it to the Quick Actions widget,
// placing the widget first if needed) or clicked to add. Buttons that need something in Settings
// first are shown greyed out with the reason, and can't be dragged.
function QuickActionChips({
  context,
  inWidget,
  onAdd,
  onDragStart,
}: {
  context: QuickActionContext;
  inWidget: (id: QuickActionId) => boolean;
  onAdd: (id: QuickActionId) => void;
  onDragStart: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: "6px", margin: "0 0 10px", padding: "8px", background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: "10px" }}>
      <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Buttons — drag one on its own
      </span>
      {QUICK_ACTIONS.map((action) => {
        const availability = getQuickActionAvailability(action.id, context);
        const added = inWidget(action.id);
        const draggable = availability.available && !added;
        return (
          <div
            key={action.id}
            draggable={draggable}
            onDragStart={(e) => {
              // Keep the card's own drag handler from turning this into a whole-widget drag.
              e.stopPropagation();
              onDragStart();
              e.dataTransfer.setData(QUICK_ACTION_DRAG_TYPE, action.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            title={availability.available ? action.description : availability.reason}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              background: availability.available ? "white" : "#F1F5F9",
              border: `1px ${availability.available ? "solid" : "dashed"} #CBD5E1`,
              borderRadius: "999px",
              cursor: draggable ? "grab" : "default",
              opacity: availability.available ? 1 : 0.75,
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: availability.available ? "#0F172A" : "#64748B" }}>
                {action.label}
              </span>
              {!availability.available && (
                <span style={{ display: "block", fontSize: "10px", color: "#64748B", lineHeight: 1.3 }}>{availability.reason}</span>
              )}
            </span>
            {availability.available &&
              (added ? (
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#047857" }}>✓ Added</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onAdd(action.id)}
                  aria-label={`Add ${action.label} to Quick Actions`}
                  style={{
                    padding: "2px 7px",
                    fontSize: "11px",
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    borderRadius: "999px",
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  +
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}
function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        ...toggleButtonStyle,
        background: active ? "#0F172A" : "transparent",
        color: active ? "white" : "#0F172A",
      }}
    >
      {children}
    </button>
  );
}

const LayoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

/* ---------- Styles ---------- */
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
  marginBottom: "20px",
};

const headerActionsStyle: React.CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
};

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: "13px",
  color: "#0F172A",
  background: "white",
  border: "2px solid #0F172A",
  borderRadius: "999px",
  textDecoration: "none",
  cursor: "pointer",
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  border: "2px solid #0F172A",
  borderRadius: "999px",
  overflow: "hidden",
  background: "white",
};

const toggleButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const bannerStyle: React.CSSProperties = {
  padding: "10px 14px",
  marginBottom: "16px",
  background: "#FFFBEB",
  border: "1px solid #F59E0B",
  color: "#92400E",
  borderRadius: "8px",
  fontSize: "13px",
};

const toastStyle: React.CSSProperties = {
  padding: "10px 16px",
  marginBottom: "16px",
  background: "#1E293B",
  color: "white",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 600,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const sideTrayStyle: React.CSSProperties = {
  width: "300px",
  flexShrink: 0,
  background: "#F8FAFC",
  border: "1px solid #CBD5E1",
  borderRadius: "12px",
  padding: "16px",
  position: "sticky",
  top: "24px",
  maxHeight: "calc(100vh - 48px)",
  overflowY: "auto",
};
