"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";
import type { OrgEventRow } from "@/lib/orgEvents";
import {
  ALL_WIDGETS,
  DEFAULT_ADMIN_WIDGETS,
  DEFAULT_MEMBER_WIDGETS,
  DEFAULT_QUICK_ACTIONS,
  getAvailableWidgets,
  type WidgetId,
} from "@/lib/widgets";
import {
  QUICK_ACTIONS,
  QUICK_ACTION_DRAG_TYPE,
  getQuickActionAvailability,
  isQuickActionId,
  type QuickActionContext,
  type QuickActionId,
} from "@/lib/quickActions";
import WidgetTemplate from "../WidgetTemplate";
import { renderWidgetContent, type QuickActionsState } from "./WidgetRenderer";

type View = "admin" | "member";

const isQuickActionDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(QUICK_ACTION_DRAG_TYPE);

export default function WidgetCustomizer({
  org,
  settings,
  events = [],
}: {
  org: Org;
  settings?: OrgSettings | null;
  events?: OrgEventRow[];
}) {
  const router = useRouter();
  const accentColor = settings?.primary_color ?? org.primary_color ?? "#3B82F6";

  const quickActionContext: QuickActionContext = {
    settings,
    hasMandatoryEvents: events.some((e) => e.is_mandatory),
  };

  const [view, setView] = useState<View>("admin");
  const [adminWidgets, setAdminWidgets] = useState<WidgetId[]>(DEFAULT_ADMIN_WIDGETS);
  const [memberWidgets, setMemberWidgets] = useState<WidgetId[]>(DEFAULT_MEMBER_WIDGETS);
  const [quickActions, setQuickActions] = useState<QuickActionId[]>(DEFAULT_QUICK_ACTIONS);

  const [draggingSidebarId, setDraggingSidebarId] = useState<WidgetId | null>(null);
  const [draggingGridIndex, setDraggingGridIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const adminKey = `org_widgets_${org.id}_admin`;
  const memberKey = `org_widgets_${org.id}_member`;
  const quickActionsKey = `org_quick_actions_${org.id}`;

  // Load saved layouts from localStorage if available
  useEffect(() => {
    try {
      const savedAdmin = localStorage.getItem(adminKey);
      if (savedAdmin) {
        const parsed = JSON.parse(savedAdmin);
        if (Array.isArray(parsed) && parsed.length > 0) setAdminWidgets(parsed);
      }
      const savedMember = localStorage.getItem(memberKey);
      if (savedMember) {
        const parsed = JSON.parse(savedMember);
        if (Array.isArray(parsed) && parsed.length > 0) setMemberWidgets(parsed);
      }
      const savedQuickActions = localStorage.getItem(quickActionsKey);
      if (savedQuickActions) {
        const parsed = JSON.parse(savedQuickActions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickActions([...new Set(parsed.filter(isQuickActionId))]);
        }
      }
    } catch {
      // LocalStorage unavailable
    }
  }, [adminKey, memberKey, quickActionsKey]);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  }

  const activeWidgets = view === "admin" ? adminWidgets : memberWidgets;
  const availableWidgets = getAvailableWidgets(settings, view);

  function updateActiveWidgets(newList: WidgetId[]) {
    if (view === "admin") {
      setAdminWidgets(newList);
    } else {
      setMemberWidgets(newList);
    }
    setHasUnsavedChanges(true);
  }

  function addWidget(widgetId: WidgetId, targetIndex?: number) {
    if (widgetId === "quick-actions" && activeWidgets.includes("quick-actions")) {
      showFeedback("Quick Actions is already placed on the dashboard.");
      return;
    }
    const list = [...activeWidgets];
    if (typeof targetIndex === "number" && targetIndex >= 0 && targetIndex <= list.length) {
      list.splice(targetIndex, 0, widgetId);
    } else {
      list.push(widgetId);
    }
    updateActiveWidgets(list);
    const def = ALL_WIDGETS.find((w) => w.id === widgetId);
    showFeedback(`Added "${def?.title || widgetId}" to ${view === "admin" ? "Admin" : "Member"} layout`);
  }

  function removeWidget(index: number) {
    const list = [...activeWidgets];
    const [removed] = list.splice(index, 1);
    updateActiveWidgets(list);
    const def = ALL_WIDGETS.find((w) => w.id === removed);
    showFeedback(`Removed "${def?.title || removed}" from layout`);
  }

  function moveWidget(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= activeWidgets.length || toIndex >= activeWidgets.length) {
      return;
    }
    const list = [...activeWidgets];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    updateActiveWidgets(list);
  }

  function clearLayout() {
    updateActiveWidgets([]);
    showFeedback(`Cleared ${view} layout`);
  }

  function resetToDefaults() {
    if (view === "admin") {
      setAdminWidgets(DEFAULT_ADMIN_WIDGETS);
      setQuickActions(DEFAULT_QUICK_ACTIONS);
      showFeedback("Reset Admin layout to recommended defaults.");
    } else {
      setMemberWidgets(DEFAULT_MEMBER_WIDGETS);
      showFeedback("Reset Member layout to recommended defaults.");
    }
    setHasUnsavedChanges(true);
  }

  function toggleQuickAction(id: QuickActionId) {
    let next: QuickActionId[];
    if (quickActions.includes(id)) {
      next = quickActions.filter((a) => a !== id);
      showFeedback(`Removed "${QUICK_ACTIONS.find((a) => a.id === id)?.label}" button`);
    } else {
      next = [...quickActions, id];
      showFeedback(`Added "${QUICK_ACTIONS.find((a) => a.id === id)?.label}" button`);
    }
    setQuickActions(next);
    setHasUnsavedChanges(true);
  }

  function droppedQuickAction(e: React.DragEvent): QuickActionId | null {
    const id = e.dataTransfer.getData(QUICK_ACTION_DRAG_TYPE);
    return isQuickActionId(id) ? id : null;
  }

  const quickActionsState: QuickActionsState = {
    actions: quickActions,
    context: quickActionContext,
    isCustomizing: true,
    onAdd: (id) => {
      if (!quickActions.includes(id)) {
        setQuickActions([...quickActions, id]);
        setHasUnsavedChanges(true);
      }
    },
    onRemove: (id) => {
      setQuickActions(quickActions.filter((a) => a !== id));
      setHasUnsavedChanges(true);
    },
  };

  function saveAndExit() {
    setIsSaving(true);
    try {
      localStorage.setItem(adminKey, JSON.stringify(adminWidgets));
      localStorage.setItem(memberKey, JSON.stringify(memberWidgets));
      localStorage.setItem(quickActionsKey, JSON.stringify(quickActions));
      // Notify any listeners
      window.dispatchEvent(new Event("widgets-updated"));
      showFeedback("✓ Layout saved successfully! Returning to admin view...");
      setTimeout(() => {
        router.push(`/orgs/${org.slug}`);
      }, 350);
    } catch (err) {
      console.error("Failed to save layout:", err);
      setIsSaving(false);
      showFeedback("Failed to save layout to browser storage.");
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Top Header / Navigation Bar */}
      <header
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "20px 24px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <Link
              href={`/orgs/${org.slug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "#64748B",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              ← Back to Dashboard
            </Link>
            <span style={{ color: "#CBD5E1" }}>•</span>
            <span style={{ fontSize: "12px", background: "#EEF2FF", color: "#4F46E5", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
              Layout Studio
            </span>
            {hasUnsavedChanges && (
              <span style={{ fontSize: "11px", background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: "999px", fontWeight: 700 }}>
                Unsaved changes
              </span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0F172A" }}>
            Customize Dashboard Widgets
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "14px", color: "#64748B" }}>
            Configure and organize widgets for <strong>{org.name}</strong>
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Layout Tab Switcher */}
          <div style={tabContainerStyle}>
            <button
              type="button"
              onClick={() => setView("admin")}
              style={{
                ...tabButtonStyle,
                background: view === "admin" ? "#0F172A" : "transparent",
                color: view === "admin" ? "white" : "#0F172A",
              }}
            >
              Admin Layout
            </button>
            <button
              type="button"
              onClick={() => setView("member")}
              style={{
                ...tabButtonStyle,
                background: view === "member" ? "#0F172A" : "transparent",
                color: view === "member" ? "white" : "#0F172A",
              }}
            >
              Member Preview Layout
            </button>
          </div>

          <button
            type="button"
            onClick={resetToDefaults}
            title="Reset layout to recommended defaults"
            style={secondaryButtonStyle}
          >
            ↻ Reset Defaults
          </button>

          <Link href={`/orgs/${org.slug}`} style={secondaryButtonStyle}>
            Cancel
          </Link>

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={saveAndExit}
            disabled={isSaving}
            style={{
              ...primarySaveButtonStyle,
              background: accentColor,
            }}
          >
            <SaveIcon />
            {isSaving ? "Saving..." : "Save & View Dashboard"}
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {feedback && (
        <div style={toastStyle}>
          {feedback}
        </div>
      )}

      {/* Main Two-Column Layout Studio */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left Column: Available Widgets Catalog */}
        <aside style={sideCatalogStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>Available Widgets</h2>
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                Populated from Org Settings
              </span>
            </div>
            <span style={{ fontSize: "11px", padding: "2px 8px", background: "#E2E8F0", borderRadius: "999px", fontWeight: 700 }}>
              {availableWidgets.length} available
            </span>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {availableWidgets.map((widget) => {
              const isPlaced = activeWidgets.includes(widget.id);
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
                    padding: "14px",
                    background: "white",
                    border: isPlaced ? "2px solid #CBD5E1" : "1px solid #E2E8F0",
                    borderRadius: "12px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    cursor: "grab",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#94A3B8" }}>⋮⋮</span> {widget.title}
                    </span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", background: "#E0E7FF", color: "#3730A3", borderRadius: "4px", fontWeight: 700 }}>
                      {widget.badge}
                    </span>
                  </div>

                  <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#64748B", lineHeight: "1.4" }}>
                    {widget.description}
                  </p>

                  <div style={{ padding: "4px 8px", background: "#F1F5F9", borderRadius: "6px", fontSize: "11px", color: "#334155", fontWeight: 600, marginBottom: "10px" }}>
                    ⚙️ {paramSummary}
                  </div>

                  {/* If Quick Actions is placed, allow button management directly */}
                  {widget.id === "quick-actions" && isPlaced && (
                    <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px dashed #CBD5E1", marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                        Active Shortcut Buttons:
                      </span>
                      <div style={{ display: "grid", gap: "6px" }}>
                        {QUICK_ACTIONS.map((action) => {
                          const availability = getQuickActionAvailability(action.id, quickActionContext);
                          const active = quickActions.includes(action.id);
                          return (
                            <label
                              key={action.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "12px",
                                color: availability.available ? "#0F172A" : "#94A3B8",
                                cursor: availability.available ? "pointer" : "not-allowed",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                disabled={!availability.available}
                                onChange={() => toggleQuickAction(action.id)}
                              />
                              <span style={{ fontWeight: active ? 700 : 500 }}>{action.label}</span>
                              {!availability.available && (
                                <span style={{ fontSize: "10px", color: "#94A3B8" }}>({availability.reason})</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                      {widget.colSpan === 2 ? "Full Width (2 cols)" : "1 Column"}
                    </span>
                    {isPlaced ? (
                      <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        ✓ Placed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addWidget(widget.id)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          background: "#0F172A",
                          border: 0,
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 700,
                          color: "white",
                        }}
                      >
                        + Add to Layout
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Column: Interactive Canvas & Live Preview */}
        <main style={{ flex: 1, minWidth: "320px" }}>
          {/* Canvas Sub-header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              padding: "10px 16px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            }}
          >
            <div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                {view === "admin" ? "Admin View Layout" : "Member Preview Layout"}
              </span>
              <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "10px" }}>
                ({activeWidgets.length} {activeWidgets.length === 1 ? "widget" : "widgets"} placed)
              </span>
            </div>
            {activeWidgets.length > 0 && (
              <button
                type="button"
                onClick={clearLayout}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  background: "#FEE2E2",
                  color: "#991B1B",
                  border: 0,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Empty Canvas Callout */}
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
                padding: "80px 24px",
                textAlign: "center",
                background: "white",
                borderRadius: "16px",
                border: "2px dashed #CBD5E1",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🧩</div>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#1E293B" }}>
                Canvas is Empty
              </h3>
              <p style={{ margin: "0 0 16px", color: "#64748B", fontSize: "14px" }}>
                Click <strong>+ Add to Layout</strong> or drag widgets from the left panel onto this canvas.
              </p>
              <button
                type="button"
                onClick={resetToDefaults}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "#0F172A",
                  color: "white",
                  border: 0,
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Apply Recommended Widgets
              </button>
            </div>
          ) : (
            <div>
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
                      draggable
                      onDragStart={(e) => {
                        setDraggingGridIndex(index);
                        e.dataTransfer.setData("text/plain", String(index));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!(isQuickActionDrag(e) && adminWidgets.includes("quick-actions"))) {
                          setDropTargetIndex(index);
                        }
                      }}
                      onDragLeave={() => {
                        if (dropTargetIndex === index) setDropTargetIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropTargetIndex(null);

                        const action = droppedQuickAction(e);
                        if (action) {
                          if (!quickActions.includes(action)) {
                            setQuickActions([...quickActions, action]);
                            setHasUnsavedChanges(true);
                          }
                          return;
                        }

                        const newId = e.dataTransfer.getData("application/widget-id") as WidgetId;
                        if (newId) {
                          addWidget(newId, index);
                          setDraggingSidebarId(null);
                          return;
                        }

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
                        position: "relative",
                      }}
                    >
                      {/* Precise Reorder Controls Bar */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 8px",
                          background: "#F1F5F9",
                          borderTopLeftRadius: "10px",
                          borderTopRightRadius: "10px",
                          border: "1px solid #CBD5E1",
                          borderBottom: 0,
                          fontSize: "11px",
                          color: "#475569",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          Position #{index + 1} • {def.title}
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveWidget(index, index - 1)}
                            title="Move Up"
                            style={{
                              padding: "2px 6px",
                              fontSize: "10px",
                              background: "white",
                              border: "1px solid #CBD5E1",
                              borderRadius: "4px",
                              cursor: index === 0 ? "not-allowed" : "pointer",
                              opacity: index === 0 ? 0.4 : 1,
                            }}
                          >
                            ▲ Up
                          </button>
                          <button
                            type="button"
                            disabled={index === activeWidgets.length - 1}
                            onClick={() => moveWidget(index, index + 1)}
                            title="Move Down"
                            style={{
                              padding: "2px 6px",
                              fontSize: "10px",
                              background: "white",
                              border: "1px solid #CBD5E1",
                              borderRadius: "4px",
                              cursor: index === activeWidgets.length - 1 ? "not-allowed" : "pointer",
                              opacity: index === activeWidgets.length - 1 ? 0.4 : 1,
                            }}
                          >
                            ▼ Down
                          </button>
                        </div>
                      </div>

                      <WidgetTemplate
                        widget={def}
                        isDragging={isDraggingThis}
                        isDropTarget={isDropTarget}
                        isCustomizing={true}
                        onRemove={() => removeWidget(index)}
                      >
                        {renderWidgetContent(widgetId, org, settings, events, quickActionsState)}
                      </WidgetTemplate>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Drop Zone */}
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
                  border: "2px dashed #CBD5E1",
                  borderRadius: "12px",
                  textAlign: "center",
                  background: "rgba(255, 255, 255, 0.7)",
                  color: "#64748B",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                + Drop a widget here to add to the bottom of the layout
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div style={bottomFloatingBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
            Ready to view your changes?
          </span>
          <span style={{ fontSize: "12px", color: "#64748B" }}>
            Clicking save will immediately take you to the live dashboard.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href={`/orgs/${org.slug}`} style={secondaryButtonStyle}>
            Cancel
          </Link>
          <button
            type="button"
            onClick={saveAndExit}
            disabled={isSaving}
            style={{
              ...primarySaveButtonStyle,
              background: accentColor,
            }}
          >
            <SaveIcon />
            {isSaving ? "Saving..." : "Save & Return to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Icons & Styles ---------- */

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const tabContainerStyle: React.CSSProperties = {
  display: "flex",
  border: "2px solid #0F172A",
  borderRadius: "999px",
  overflow: "hidden",
  background: "white",
};

const tabButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  border: "none",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: "13px",
  color: "#0F172A",
  background: "white",
  border: "1px solid #CBD5E1",
  borderRadius: "999px",
  textDecoration: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const primarySaveButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 22px",
  fontWeight: 800,
  fontSize: "14px",
  color: "white",
  border: 0,
  borderRadius: "999px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  transition: "transform 0.1s ease",
};

const sideCatalogStyle: React.CSSProperties = {
  width: "340px",
  flexShrink: 0,
  background: "#F8FAFC",
  border: "1px solid #CBD5E1",
  borderRadius: "14px",
  padding: "18px",
  position: "sticky",
  top: "20px",
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const toastStyle: React.CSSProperties = {
  padding: "12px 18px",
  marginBottom: "18px",
  background: "#0F172A",
  color: "white",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: 700,
  boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
};

const bottomFloatingBarStyle: React.CSSProperties = {
  position: "sticky",
  bottom: "20px",
  marginTop: "30px",
  background: "white",
  borderRadius: "16px",
  padding: "14px 24px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  border: "1px solid #E2E8F0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
  zIndex: 100,
};
