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
import {
  CalendarWidget,
  ManageMembersWidget,
  OrgInfoWidget,
  PendingAbsencesWidget,
  PointsWidget,
  ProfileWidget,
  QuickStatsWidget,
  StrikesWidget,
} from "./WidgetComponents";

type View = "admin" | "member";

export default function OrgViews({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
  const isAdmin = org.role === "ADMIN";
  const [view, setView] = useState<View>(isAdmin ? "admin" : "member");
  const [isCustomizing, setIsCustomizing] = useState(false);

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
        if (Array.isArray(parsed) && parsed.length > 0) setAdminWidgets(parsed);
      }
      const savedMember = localStorage.getItem(`org_widgets_${org.id}_member`);
      if (savedMember) {
        const parsed = JSON.parse(savedMember);
        if (Array.isArray(parsed) && parsed.length > 0) setMemberWidgets(parsed);
      }
    } catch {
      // LocalStorage unavailable, use defaults
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

  function resetToDefault() {
    if (view === "admin") {
      saveLayout(DEFAULT_ADMIN_WIDGETS);
    } else {
      saveLayout(DEFAULT_MEMBER_WIDGETS);
    }
    showFeedback(`Reset to default ${view} layout`);
  }

  // Render specific widget component
  function renderWidgetContent(widgetId: WidgetId) {
    switch (widgetId) {
      case "calendar":
        return <CalendarWidget org={org} settings={settings} />;
      case "points":
        return <PointsWidget org={org} settings={settings} />;
      case "profile":
        return <ProfileWidget org={org} settings={settings} />;
      case "strikes":
        return <StrikesWidget org={org} settings={settings} />;
      case "quick-stats":
        return <QuickStatsWidget org={org} settings={settings} />;
      case "manage-members":
        return <ManageMembersWidget org={org} />;
      case "pending-absences":
        return <PendingAbsencesWidget />;
      case "org-info":
        return <OrgInfoWidget org={org} settings={settings} />;
      default:
        return <div>Widget {widgetId}</div>;
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: isCustomizing ? "1200px" : "960px", transition: "max-width 0.2s ease" }}>
      {/* Top Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: "#0F172A" }}>{org.name}</h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#64748B" }}>
            {view === "admin" ? "Admin Dashboard & Control Center" : "Member Experience View"}
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

            {/* Layout Customizer Toggle */}
            <button
              type="button"
              onClick={() => setIsCustomizing((prev) => !prev)}
              style={{
                ...actionButtonStyle,
                background: isCustomizing ? "#0F172A" : "white",
                color: isCustomizing ? "white" : "#0F172A",
                borderColor: "#0F172A",
              }}
            >
              <LayoutIcon />
              {isCustomizing ? "Close Customizer" : "Customize Layout"}
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
          Previewing what members of <strong>{org.name}</strong> see. Admins can drag & drop widgets below to customize member layout.
        </div>
      )}

      {/* Toast Feedback */}
      {feedback && (
        <div style={toastStyle}>
          {feedback}
        </div>
      )}

      {/* Customizer Instructions Banner */}
      {isCustomizing && (
        <div style={customizerBannerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🎨</span>
            <div>
              <strong style={{ display: "block", fontSize: "14px" }}>
                Customizing {view === "admin" ? "Admin" : "Member"} Layout
              </strong>
              <span style={{ fontSize: "12px", color: "#475569" }}>
                Drag widgets from the right sidebar onto the dashboard, or drag cards to reorder them.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={resetToDefault}
              style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "6px", background: "white", border: "1px solid #CBD5E1", cursor: "pointer", fontWeight: 600 }}
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={() => setIsCustomizing(false)}
              style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px", background: "#0F172A", color: "white", border: 0, cursor: "pointer", fontWeight: 700 }}
            >
              Done Editing
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        {/* Main Dashboard Widget Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeWidgets.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", background: "white", borderRadius: "12px", border: "2px dashed #CBD5E1" }}>
              <p style={{ margin: "0 0 12px", color: "#64748B", fontWeight: 600 }}>No widgets currently placed in this layout.</p>
              <button
                type="button"
                onClick={resetToDefault}
                style={{ padding: "8px 16px", borderRadius: "8px", background: "#0F172A", color: "white", border: 0, fontWeight: 700, cursor: "pointer" }}
              >
                Load Default Layout
              </button>
            </div>
          ) : (
            <div style={gridStyle}>
              {activeWidgets.map((widgetId, index) => {
                const def = ALL_WIDGETS.find((w) => w.id === widgetId);
                const title = def?.title || widgetId;
                const badge = def?.badge || "Widget";
                const isDraggingThis = draggingGridIndex === index;
                const isDropTarget = dropTargetIndex === index;

                return (
                  <div
                    key={`${widgetId}-${index}`}
                    draggable={isCustomizing}
                    onDragStart={(e) => {
                      if (!isCustomizing) return;
                      setDraggingGridIndex(index);
                      e.dataTransfer.setData("text/plain", String(index));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (!isCustomizing) return;
                      e.preventDefault();
                      setDropTargetIndex(index);
                    }}
                    onDragLeave={() => {
                      if (dropTargetIndex === index) setDropTargetIndex(null);
                    }}
                    onDrop={(e) => {
                      if (!isCustomizing) return;
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
                      ...cardStyle,
                      gridColumn: def?.colSpan && def.colSpan > 1 ? "span 2" : "span 1",
                      opacity: isDraggingThis ? 0.35 : 1,
                      border: isDropTarget
                        ? "2px dashed #3B82F6"
                        : isCustomizing
                        ? "2px solid #CBD5E1"
                        : "1px solid #E2E8F0",
                      transform: isDropTarget ? "scale(1.01)" : "scale(1)",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {/* Widget Header with Drag Handle and Remove Option */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isCustomizing && (
                          <span
                            title="Drag to reorder"
                            style={{ cursor: "grab", color: "#94A3B8", fontSize: "14px", fontWeight: 900, userSelect: "none" }}
                          >
                            ⋮⋮
                          </span>
                        )}
                        <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1E293B" }}>{title}</h2>
                        <span style={{ fontSize: "10px", padding: "2px 6px", background: "#F1F5F9", color: "#64748B", borderRadius: "4px", fontWeight: 600 }}>
                          {badge}
                        </span>
                      </div>

                      {isCustomizing && (
                        <button
                          type="button"
                          onClick={() => removeWidget(index)}
                          title="Remove widget from layout"
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            background: "#FEE2E2",
                            color: "#991B1B",
                            border: 0,
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    {/* Widget Content Body */}
                    {renderWidgetContent(widgetId)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Drop Zone when in Customizer Mode */}
          {isCustomizing && (
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
                padding: "24px",
                border: "2px dashed #94A3B8",
                borderRadius: "12px",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.6)",
                color: "#475569",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              + Drag and drop any widget here to add to the bottom of the page
            </div>
          )}
        </div>

        {/* Available Widgets Side Tray / Drawer */}
        {isCustomizing && (
          <aside style={sideTrayStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Available Widgets</h3>
                <span style={{ fontSize: "12px", color: "#64748B" }}>
                  Parameters populated from Org Settings
                </span>
              </div>
              <span style={{ fontSize: "11px", padding: "2px 6px", background: "#E2E8F0", borderRadius: "999px", fontWeight: 700 }}>
                {availableWidgets.length} items
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
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
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

                    {/* Dynamic parameter badges from Nadia's logic */}
                    <div style={{ padding: "4px 8px", background: "#F1F5F9", borderRadius: "6px", fontSize: "11px", color: "#334155", fontWeight: 600, marginBottom: "8px" }}>
                      ⚙️ {paramSummary}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "#94A3B8" }}>Drag into layout</span>
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

const customizerBannerStyle: React.CSSProperties = {
  padding: "12px 16px",
  marginBottom: "16px",
  background: "#F0FDF4",
  border: "1px solid #86EFAC",
  color: "#166534",
  borderRadius: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
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

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "16px 18px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  position: "relative",
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
