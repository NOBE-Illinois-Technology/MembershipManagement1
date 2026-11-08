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
import ProfileWidget from "./widgets/ProfileWidget";
import StrikesWidget from "./widgets/StrikesWidget";

type View = "admin" | "member";

// Events and member-specific data aren't stored per org yet, so those widgets use sample data.
function renderWidgetContent(widgetId: WidgetId, org: Org, settings?: OrgSettings | null) {
  const accentColor = settings?.primary_color ?? org.primary_color;
  switch (widgetId) {
    case "calendar":
      return <CalendarWidget events={[]} accentColor={accentColor} />;
    case "points":
      return <PointsWidget settings={settings} earnedByCategory={{}} accentColor={accentColor} />;
    case "profile":
      return <ProfileWidget accentColor={accentColor} />;
    case "strikes":
      return <StrikesWidget settings={settings} accentColor={accentColor} />;
    default:
      return undefined;
  }
}

export default function OrgViews({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
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
    showFeedback(`Cleared ${view} layout`);
  }

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
                        setDropTargetIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dropTargetIndex === index) setDropTargetIndex(null);
                      }}
                      onDrop={(e) => {
                        if (!isAdmin) return;
                        e.preventDefault();
                        setDropTargetIndex(null);

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
                        {renderWidgetContent(widgetId, org, settings)}
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
