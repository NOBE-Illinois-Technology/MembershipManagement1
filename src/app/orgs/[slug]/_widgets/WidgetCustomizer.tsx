"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";
import type { OrgDashboardData } from "@/lib/orgDashboard";
import {
  ALL_WIDGETS,
  DEFAULT_ADMIN_WIDGETS,
  DEFAULT_MEMBER_WIDGETS,
  DEFAULT_QUICK_ACTIONS,
  getAvailableWidgets,
  normalizeWidgetIds,
  type WidgetDefinition,
  type WidgetId,
} from "@/lib/widgets";
import {
  QUICK_ACTIONS,
  getQuickActionAvailability,
  isQuickActionId,
  type QuickActionContext,
  type QuickActionId,
} from "@/lib/quickActions";
import WidgetTemplate from "../WidgetTemplate";
import QuickActionModal from "./quickActions/QuickActionModal";
import { renderWidgetContent, type QuickActionsState } from "./WidgetRenderer";

type View = "admin" | "member";
type Mode = "edit" | "preview";

// What's being dragged: a widget from the side panel, or a placed widget being moved.
type Drag = { kind: "new"; id: WidgetId } | { kind: "move"; from: number };

// The drag-and-drop data type for a widget from the side panel.
const WIDGET_DRAG_TYPE = "application/widget-id";

export default function WidgetCustomizer({
  org,
  settings,
  data,
}: {
  org: Org;
  settings?: OrgSettings | null;
  // Real org data from the page, so widgets look the same as on the dashboard.
  data: OrgDashboardData;
}) {
  const router = useRouter();
  const accentColor = settings?.primary_color ?? org.primary_color ?? "#2563EB";

  const quickActionContext: QuickActionContext = {
    settings,
    hasMandatoryEvents: data.events.some((e) => e.is_mandatory),
  };

  const [view, setView] = useState<View>("admin");
  const [mode, setMode] = useState<Mode>("edit");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  const [adminWidgets, setAdminWidgets] = useState<WidgetId[]>(DEFAULT_ADMIN_WIDGETS);
  const [memberWidgets, setMemberWidgets] = useState<WidgetId[]>(DEFAULT_MEMBER_WIDGETS);
  const [quickActions, setQuickActions] = useState<QuickActionId[]>(DEFAULT_QUICK_ACTIONS);

  const [drag, setDrag] = useState<Drag | null>(null);
  // Where the dragged widget would be inserted (0..activeWidgets.length), shown as a placeholder.
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [isOverPanel, setIsOverPanel] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const adminKey = `org_widgets_${org.id}_admin`;
  const memberKey = `org_widgets_${org.id}_member`;
  const quickActionsKey = `org_quick_actions_${org.id}`;

  // Load saved layouts from localStorage
  useEffect(() => {
    try {
      const savedAdmin = localStorage.getItem(adminKey);
      if (savedAdmin) {
        const parsed = JSON.parse(savedAdmin);
        const ids = normalizeWidgetIds(parsed);
        if (ids.length > 0) setAdminWidgets(ids);
      }
      const savedMember = localStorage.getItem(memberKey);
      if (savedMember) {
        const parsed = JSON.parse(savedMember);
        const ids = normalizeWidgetIds(parsed);
        if (ids.length > 0) setMemberWidgets(ids);
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
    setTimeout(() => setFeedback(null), 3000);
  }

  const activeWidgets = view === "admin" ? adminWidgets : memberWidgets;
  // Widgets that can still be added: placed widgets leave the side panel (and the Add list) and
  // come back when they're removed.
  const unplacedWidgets = getAvailableWidgets(settings, view).filter((w) => !activeWidgets.includes(w.id));

  function updateActiveWidgets(newList: WidgetId[]) {
    if (view === "admin") {
      setAdminWidgets(newList);
    } else {
      setMemberWidgets(newList);
    }
    setHasUnsavedChanges(true);
  }

  function addWidget(widgetId: WidgetId, at: number = activeWidgets.length) {
    if (activeWidgets.includes(widgetId)) {
      showFeedback("Widget is already placed on layout");
      return;
    }
    const list = [...activeWidgets];
    list.splice(Math.min(Math.max(at, 0), list.length), 0, widgetId);
    updateActiveWidgets(list);
    const def = ALL_WIDGETS.find((w) => w.id === widgetId);
    showFeedback(`Added ${def?.title || widgetId}`);
  }

  function removeWidget(index: number) {
    const list = [...activeWidgets];
    const [removed] = list.splice(index, 1);
    updateActiveWidgets(list);
    const def = ALL_WIDGETS.find((w) => w.id === removed);
    showFeedback(`Removed ${def?.title || removed}`);
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

  // Moves a placed widget so it lands where the placeholder was (an insert position in the
  // current list, counted before the widget is taken out).
  function moveWidgetToInsert(from: number, at: number) {
    const to = at > from ? at - 1 : at;
    if (to === from) return;
    const list = [...activeWidgets];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    updateActiveWidgets(list);
  }

  function endDrag() {
    setDrag(null);
    setInsertAt(null);
    setIsOverPanel(false);
  }

  // Whether dropping at `at` would change anything (moving a widget next to itself doesn't).
  function isUsefulInsert(at: number) {
    return !(drag?.kind === "move" && (at === drag.from || at === drag.from + 1));
  }

  function updateInsertAt(at: number) {
    const next = isUsefulInsert(at) ? at : null;
    if (next !== insertAt) setInsertAt(next);
  }

  // Before or after the card under the pointer: left/right halves for side-by-side cards,
  // top/bottom halves for cards that fill the row.
  function insertPositionFor(e: React.DragEvent<HTMLElement>, index: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rowWidth = e.currentTarget.parentElement?.getBoundingClientRect().width ?? rect.width;
    const fillsRow = rect.width > rowWidth * 0.6;
    const after = fillsRow ? e.clientY > rect.top + rect.height / 2 : e.clientX > rect.left + rect.width / 2;
    return after ? index + 1 : index;
  }

  function commitDrop(e: React.DragEvent) {
    e.preventDefault();
    const at = insertAt;
    const current = drag;
    endDrag();
    if (at === null || !current) return;
    if (current.kind === "new") addWidget(current.id, at);
    else moveWidgetToInsert(current.from, at);
  }

  function resetToDefaults() {
    if (view === "admin") {
      setAdminWidgets(DEFAULT_ADMIN_WIDGETS);
      setQuickActions(DEFAULT_QUICK_ACTIONS);
      showFeedback("Reset admin layout to defaults");
    } else {
      setMemberWidgets(DEFAULT_MEMBER_WIDGETS);
      showFeedback("Reset member layout to defaults");
    }
    setHasUnsavedChanges(true);
  }

  function toggleQuickAction(id: QuickActionId) {
    let next: QuickActionId[];
    if (quickActions.includes(id)) {
      next = quickActions.filter((a) => a !== id);
    } else {
      next = [...quickActions, id];
    }
    setQuickActions(next);
    setHasUnsavedChanges(true);
  }

  const quickActionsState: QuickActionsState = {
    actions: quickActions,
    context: quickActionContext,
    isCustomizing: mode === "edit",
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

  // Dashed box showing where the dragged widget will land, sized like that widget.
  function placeholder(at: number) {
    const def: WidgetDefinition | undefined =
      drag?.kind === "new"
        ? ALL_WIDGETS.find((w) => w.id === drag.id)
        : drag?.kind === "move"
        ? ALL_WIDGETS.find((w) => w.id === activeWidgets[drag.from])
        : undefined;
    return (
      <div
        key="drop-placeholder"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.stopPropagation();
          commitDrop(e);
        }}
        style={{
          gridColumn: def?.colSpan && def.colSpan > 1 ? "span 2" : "span 1",
          minHeight: "140px",
          border: `2px dashed ${accentColor}`,
          borderRadius: "12px",
          background: `${accentColor}0d`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accentColor,
          fontSize: "13px",
          fontWeight: 700,
          textAlign: "center",
          padding: "12px",
        }}
        aria-hidden="true"
        data-insert-at={at}
      >
        {def ? `${def.title} goes here` : "Drop here"}
      </div>
    );
  }

  function saveAndExit() {
    setIsSaving(true);
    try {
      localStorage.setItem(adminKey, JSON.stringify(adminWidgets));
      localStorage.setItem(memberKey, JSON.stringify(memberWidgets));
      localStorage.setItem(quickActionsKey, JSON.stringify(quickActions));
      window.dispatchEvent(new Event("widgets-updated"));
      showFeedback("Layout saved");
      setTimeout(() => {
        router.push(`/orgs/${org.slug}`);
      }, 250);
    } catch (err) {
      console.error("Failed to save layout:", err);
      setIsSaving(false);
      showFeedback("Failed to save layout");
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Toast Feedback */}
      {feedback && <div style={toastStyle}>{feedback}</div>}

      {/* Main Header */}
      <header
        style={{
          background: "#FFFFFF",
          borderRadius: "6px",
          border: "1px solid #D1D5DB",
          padding: "16px 20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Link
              href={`/orgs/${org.slug}`}
              style={{
                color: "#4B5563",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Back to dashboard
            </Link>
            {hasUnsavedChanges && (
              <>
                <span style={{ color: "#D1D5DB" }}>|</span>
                <span style={{ fontSize: "11px", background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: "3px", fontWeight: 600 }}>
                  Unsaved changes
                </span>
              </>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
            {mode === "preview" ? "Dashboard Preview" : "Customize Dashboard Widgets"}
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#4B5563" }}>
            {mode === "preview"
              ? `Previewing live ${view === "admin" ? "admin" : "member"} dashboard for ${org.name}.`
              : `Drag cards or use arrow buttons to arrange widgets.`}
          </p>
        </div>

        {/* Header Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Layout Audience Selector */}
          <div style={segmentedGroupStyle}>
            <button
              type="button"
              onClick={() => setView("admin")}
              style={{
                ...segmentedItemStyle,
                background: view === "admin" ? "#111827" : "#FFFFFF",
                color: view === "admin" ? "#FFFFFF" : "#374151",
              }}
            >
              Admin layout
            </button>
            <button
              type="button"
              onClick={() => setView("member")}
              style={{
                ...segmentedItemStyle,
                background: view === "member" ? "#111827" : "#FFFFFF",
                color: view === "member" ? "#FFFFFF" : "#374151",
              }}
            >
              Member layout
            </button>
          </div>

          {/* Mode Toggle Button */}
          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => setMode("preview")}
              style={standardSecondaryButtonStyle}
            >
              <EyeIcon />
              Preview layout
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("edit")}
              style={standardSecondaryButtonStyle}
            >
              <EditIcon />
              Edit layout
            </button>
          )}

          <button
            type="button"
            onClick={resetToDefaults}
            style={standardSecondaryButtonStyle}
          >
            Reset defaults
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={saveAndExit}
            disabled={isSaving}
            style={{
              ...primaryButtonStyle,
              background: accentColor,
            }}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </header>

      {/* MODE 1: LIVE PREVIEW VIEW */}
      {mode === "preview" ? (
        <div>
          {/* Preview Mode Notification Bar */}
          <div
            style={{
              background: "#F9FAFB",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              padding: "10px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <strong style={{ fontSize: "13px", color: "#111827" }}>
                Preview Mode ({view === "admin" ? "Admin View" : "Member View"})
              </strong>
              <p style={{ margin: "1px 0 0", fontSize: "12px", color: "#4B5563" }}>
                Viewing live dashboard with active organization data.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={segmentedGroupStyle}>
                <button
                  type="button"
                  onClick={() => setView("admin")}
                  style={{
                    ...segmentedItemStyle,
                    padding: "3px 8px",
                    fontSize: "11px",
                    background: view === "admin" ? "#111827" : "#FFFFFF",
                    color: view === "admin" ? "#FFFFFF" : "#374151",
                  }}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setView("member")}
                  style={{
                    ...segmentedItemStyle,
                    padding: "3px 8px",
                    fontSize: "11px",
                    background: view === "member" ? "#111827" : "#FFFFFF",
                    color: view === "member" ? "#FFFFFF" : "#374151",
                  }}
                >
                  Member
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMode("edit")}
                style={standardSecondaryButtonStyle}
              >
                Return to edit
              </button>
              <button
                type="button"
                onClick={saveAndExit}
                style={{
                  ...primaryButtonStyle,
                  background: accentColor,
                }}
              >
                Save and exit
              </button>
            </div>
          </div>

          {/* Real Live Widgets Grid */}
          {activeWidgets.length === 0 ? (
            <div style={emptyBoxStyle}>
              <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                No widgets on dashboard
              </h3>
              <p style={{ margin: "0 0 12px", color: "#4B5563", fontSize: "13px" }}>
                This layout has no widgets configured. Switch to edit mode to add widgets.
              </p>
              <button type="button" onClick={() => setMode("edit")} style={standardSecondaryButtonStyle}>
                Edit layout
              </button>
            </div>
          ) : (
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

                return (
                  <div
                    key={`${widgetId}-${index}`}
                    style={{
                      gridColumn: def.colSpan && def.colSpan > 1 ? "span 2" : "span 1",
                    }}
                  >
                    <WidgetTemplate
                      widget={def}
                      isDragging={false}
                      isDropTarget={false}
                      isCustomizing={false}
                    >
                      {renderWidgetContent(widgetId, { org, settings, data, quickActions: quickActionsState })}
                    </WidgetTemplate>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MODE 2: CANVAS WITH RAW REAL WIDGETS AND CLEAN DRAG-AND-DROP */
        <div>
          {/* Subheader Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              padding: "10px 14px",
              background: "#FFFFFF",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                {view === "admin" ? "Admin Layout" : "Member Layout"}
              </span>
              <span style={{ fontSize: "12px", color: "#6B7280" }}>
                ({activeWidgets.length} {activeWidgets.length === 1 ? "widget" : "widgets"} placed)
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  ...primaryButtonStyle,
                  background: "#111827",
                  padding: "5px 12px",
                  fontSize: "12px",
                }}
              >
                + Add widget
              </button>

              {activeWidgets.includes("quick-actions") && (
                <button
                  type="button"
                  onClick={() => setIsShortcutsModalOpen(true)}
                  style={{
                    ...standardSecondaryButtonStyle,
                    padding: "5px 10px",
                    fontSize: "12px",
                  }}
                >
                  Configure shortcuts ({quickActions.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode("preview")}
                style={{
                  ...standardSecondaryButtonStyle,
                  padding: "5px 10px",
                  fontSize: "12px",
                }}
              >
                <EyeIcon />
                Preview
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div
            style={{ flex: 1, minWidth: 0 }}
            onDragLeave={(e) => {
              // Left the canvas entirely (not just moved between cards): hide the placeholder.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setInsertAt(null);
            }}
          >
          {/* Empty Canvas */}
          {activeWidgets.length === 0 ? (
            <div
              style={{
                ...emptyBoxStyle,
                ...(drag && insertAt === 0 ? { border: `2px dashed ${accentColor}`, background: `${accentColor}0d` } : {}),
              }}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                updateInsertAt(0);
              }}
              onDrop={commitDrop}
            >
              <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                No widgets placed
              </h3>
              <p style={{ margin: "0 0 14px", color: "#4B5563", fontSize: "13px" }}>
                Add widgets to configure this dashboard or restore recommended defaults.
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  style={{
                    ...primaryButtonStyle,
                    background: "#111827",
                  }}
                >
                  + Add widget
                </button>
                <button
                  type="button"
                  onClick={resetToDefaults}
                  style={standardSecondaryButtonStyle}
                >
                  Reset defaults
                </button>
              </div>
            </div>
          ) : (
            /* REAL / RAW FORM WIDGETS WITH DRAG-AND-DROP REORDERING */
            <div
              style={gridStyle}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                // Over the grid itself, not a card: only the space below the last card means "drop
                // at the end". The gaps between cards keep the current position, so crossing one
                // mid-drag doesn't make the placeholder jump.
                if (e.target !== e.currentTarget) return;
                const last = e.currentTarget.lastElementChild?.getBoundingClientRect();
                if (last && e.clientY > last.bottom) updateInsertAt(activeWidgets.length);
              }}
              onDrop={commitDrop}
            >
              {activeWidgets.flatMap((widgetId, index) => {
                const def = ALL_WIDGETS.find((w) => w.id === widgetId) ?? {
                  id: widgetId,
                  title: widgetId,
                  badge: "Widget",
                  description: "",
                  targetView: "both" as const,
                  colSpan: 1 as const,
                  getParamSummary: () => "",
                };

                const isDraggingThis = drag?.kind === "move" && drag.from === index;

                const card = (
                  <div
                    key={`${widgetId}-${index}`}
                    draggable
                    onDragStart={(e) => {
                      setDrag({ kind: "move", from: index });
                      e.dataTransfer.setData("text/plain", String(index));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (!drag) return;
                      e.preventDefault();
                      e.stopPropagation();
                      updateInsertAt(insertPositionFor(e, index));
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      commitDrop(e);
                    }}
                    onDragEnd={endDrag}
                    style={{
                      gridColumn: def.colSpan && def.colSpan > 1 ? "span 2" : "span 1",
                      cursor: "grab",
                    }}
                  >
                    <WidgetTemplate
                      widget={def}
                      isDragging={isDraggingThis}
                      isDropTarget={false}
                      isCustomizing={true}
                      canMoveUp={index > 0}
                      canMoveDown={index < activeWidgets.length - 1}
                      onMoveUp={() => moveWidget(index, index - 1)}
                      onMoveDown={() => moveWidget(index, index + 1)}
                      onRemove={() => removeWidget(index)}
                    >
                      {renderWidgetContent(widgetId, { org, settings, data, quickActions: quickActionsState })}
                    </WidgetTemplate>
                  </div>
                );

                // The placeholder goes before the card it would push over.
                return insertAt === index ? [placeholder(index), card] : [card];
              })}
              {insertAt === activeWidgets.length && placeholder(activeWidgets.length)}
            </div>
          )}
          </div>

          {/* Side panel: drag a widget onto the layout; drag a placed widget back here to remove it */}
          <aside
            style={{
              ...sidePanelStyle,
              ...(isOverPanel ? { border: "2px dashed #DC2626", background: "#FEF2F2" } : {}),
            }}
            aria-label="Available widgets"
            onDragOver={(e) => {
              if (drag?.kind !== "move") return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setInsertAt(null);
              if (!isOverPanel) setIsOverPanel(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOverPanel(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const current = drag;
              endDrag();
              if (current?.kind === "move") removeWidget(current.from);
            }}
          >
            <div style={{ marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>Widgets</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B7280" }}>
                {isOverPanel
                  ? "Drop here to remove it from the layout."
                  : "Drag a widget onto the layout. Placed widgets leave this list."}
              </p>
            </div>
            {unplacedWidgets.length === 0 ? (
              <p style={{ margin: 0, padding: "16px 8px", fontSize: "12px", color: "#6B7280", textAlign: "center" }}>
                Every widget is on this layout. Remove one to bring it back here.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {unplacedWidgets.map((widget) => (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={(e) => {
                      setDrag({ kind: "new", id: widget.id });
                      e.dataTransfer.setData(WIDGET_DRAG_TYPE, widget.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={endDrag}
                    style={{
                      ...panelCardStyle,
                      opacity: drag?.kind === "new" && drag.id === widget.id ? 0.45 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "13px", color: "#111827" }}>{widget.title}</strong>
                      <button
                        type="button"
                        onClick={() => addWidget(widget.id)}
                        aria-label={`Add ${widget.title} to the layout`}
                        style={{ ...standardSecondaryButtonStyle, padding: "2px 8px", fontSize: "11px" }}
                      >
                        + Add
                      </button>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#4B5563", lineHeight: 1.4 }}>{widget.description}</p>
                    <span style={{ display: "inline-block", marginTop: "4px", fontSize: "10px", color: "#6B7280" }}>
                      {widget.colSpan === 2 ? "Full width" : "Half width"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </aside>
          </div>

          {/* Bottom Action Row */}
          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                style={standardSecondaryButtonStyle}
              >
                + Add widget
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                style={standardSecondaryButtonStyle}
              >
                <EyeIcon />
                Preview layout
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link
                href={`/orgs/${org.slug}`}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#4B5563",
                  textDecoration: "none",
                }}
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={saveAndExit}
                disabled={isSaving}
                style={{
                  ...primaryButtonStyle,
                  background: accentColor,
                }}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Add Widgets Dialog */}
      {isAddModalOpen && (
        <QuickActionModal
          title="Add Widgets"
          subtitle={`Available widgets for ${view === "admin" ? "admin" : "member"} layout.`}
          onClose={() => setIsAddModalOpen(false)}
        >
          <div style={{ display: "grid", gap: "8px", marginTop: "12px", maxHeight: "60vh", overflowY: "auto" }}>
            {unplacedWidgets.length === 0 && (
              <p style={{ margin: 0, fontSize: "13px", color: "#4B5563" }}>
                Every widget is already on this layout. Remove one to add it again.
              </p>
            )}
            {unplacedWidgets.map((widget) => {
              return (
                <div
                  key={widget.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "4px",
                    background: "#FFFFFF",
                    border: "1px solid #D1D5DB",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "13px", color: "#111827" }}>
                        {widget.title}
                      </strong>
                      <span style={{ fontSize: "10px", padding: "1px 5px", background: "#F3F4F6", color: "#4B5563", borderRadius: "3px", border: "1px solid #E5E7EB" }}>
                        {widget.badge}
                      </span>
                      <span style={{ fontSize: "10px", color: "#6B7280" }}>
                        {widget.colSpan === 2 ? "Full width (2 cols)" : "1 column"}
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#4B5563" }}>
                      {widget.description}
                    </p>
                  </div>

                  <div style={{ marginLeft: "12px", flexShrink: 0 }}>
                    <button
                        type="button"
                        onClick={() => {
                          addWidget(widget.id);
                          setIsAddModalOpen(false);
                        }}
                        style={{
                          padding: "5px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "4px",
                          background: "#111827",
                          color: "#FFFFFF",
                          border: 0,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{
                padding: "6px 14px",
                background: "#111827",
                color: "#FFFFFF",
                border: 0,
                borderRadius: "4px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </QuickActionModal>
      )}

      {/* Modal 2: Quick Actions Shortcuts Selector */}
      {isShortcutsModalOpen && (
        <QuickActionModal
          title="Configure Quick Action Shortcuts"
          subtitle="Select shortcut buttons displayed in the Quick Actions widget."
          onClose={() => setIsShortcutsModalOpen(false)}
        >
          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
            {QUICK_ACTIONS.map((action) => {
              const availability = getQuickActionAvailability(action.id, quickActionContext);
              const active = quickActions.includes(action.id);

              return (
                <label
                  key={action.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    background: active ? "#F9FAFB" : "#FFFFFF",
                    border: active ? "1px solid #111827" : "1px solid #D1D5DB",
                    cursor: availability.available ? "pointer" : "not-allowed",
                    opacity: availability.available ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={!availability.available}
                      onChange={() => toggleQuickAction(action.id)}
                      style={{ cursor: availability.available ? "pointer" : "not-allowed" }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>
                        {action.label}
                      </span>
                      <p style={{ margin: "1px 0 0", fontSize: "12px", color: "#4B5563" }}>
                        {action.description}
                      </p>
                    </div>
                  </div>

                  {!availability.available && (
                    <span style={{ fontSize: "11px", color: "#92400E", background: "#FEF3C7", padding: "1px 5px", borderRadius: "3px", fontWeight: 500 }}>
                      {availability.reason}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(false)}
              style={{
                padding: "6px 14px",
                background: "#111827",
                color: "#FFFFFF",
                border: 0,
                borderRadius: "4px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </QuickActionModal>
      )}
    </div>
  );
}

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const segmentedGroupStyle: React.CSSProperties = {
  display: "inline-flex",
  background: "#F3F4F6",
  borderRadius: "4px",
  padding: "2px",
  border: "1px solid #D1D5DB",
};

const segmentedItemStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "none",
  borderRadius: "3px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

const standardSecondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  borderRadius: "4px",
  border: "1px solid #D1D5DB",
  background: "#FFFFFF",
  color: "#374151",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 14px",
  fontWeight: 600,
  fontSize: "13px",
  color: "#FFFFFF",
  border: 0,
  borderRadius: "4px",
  cursor: "pointer",
};

const sidePanelStyle: React.CSSProperties = {
  width: "280px",
  flexShrink: 0,
  position: "sticky",
  top: "16px",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  background: "#F9FAFB",
  border: "1px solid #D1D5DB",
  borderRadius: "6px",
  padding: "12px",
  boxSizing: "border-box",
};

const panelCardStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "#FFFFFF",
  border: "1px solid #D1D5DB",
  borderRadius: "6px",
  cursor: "grab",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "14px",
};

const emptyBoxStyle: React.CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  background: "#FFFFFF",
  borderRadius: "6px",
  border: "1px solid #D1D5DB",
};

const toastStyle: React.CSSProperties = {
  padding: "8px 14px",
  marginBottom: "12px",
  background: "#111827",
  color: "#FFFFFF",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: 600,
};
