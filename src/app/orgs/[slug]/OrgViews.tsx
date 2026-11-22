"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";
import {
  ALL_WIDGETS,
  DEFAULT_ADMIN_WIDGETS,
  DEFAULT_MEMBER_WIDGETS,
  DEFAULT_QUICK_ACTIONS,
  type WidgetId,
} from "@/lib/widgets";
import WidgetTemplate from "./WidgetTemplate";
import QuickActionModal from "./_widgets/quickActions/QuickActionModal";
import CreateEventPanel from "./_widgets/quickActions/CreateEventPanel";
import AbsenceReviewPanel from "./_widgets/quickActions/AbsenceReviewPanel";
import {
  isQuickActionId,
  type QuickActionContext,
  type QuickActionId,
} from "@/lib/quickActions";
import type { OrgEventRow } from "@/lib/orgEvents";
import { renderWidgetContent, type QuickActionsState } from "./_widgets/WidgetRenderer";

type View = "admin" | "member";

export default function OrgViews({
  org,
  settings,
  events = [],
}: {
  org: Org;
  settings?: OrgSettings | null;
  events?: OrgEventRow[];
}) {
  const quickActionContext: QuickActionContext = {
    settings,
    hasMandatoryEvents: events.some((e) => e.is_mandatory),
  };
  const isAdmin = org.role === "ADMIN";
  const [view, setView] = useState<View>(isAdmin ? "admin" : "member");

  // Layouts default to cohesive recommended widget sets
  const [adminWidgets, setAdminWidgets] = useState<WidgetId[]>(DEFAULT_ADMIN_WIDGETS);
  const [memberWidgets, setMemberWidgets] = useState<WidgetId[]>(DEFAULT_MEMBER_WIDGETS);
  const [quickActions, setQuickActions] = useState<QuickActionId[]>(DEFAULT_QUICK_ACTIONS);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isReviewingAbsences, setIsReviewingAbsences] = useState<boolean>(false);

  const adminKey = `org_widgets_${org.id}_admin`;
  const memberKey = `org_widgets_${org.id}_member`;
  const quickActionsKey = `org_quick_actions_${org.id}`;

  const loadLayoutsFromStorage = useCallback(() => {
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

  // Load saved layouts on mount and listen for updates from the widgets page
  useEffect(() => {
    loadLayoutsFromStorage();

    const handleUpdate = () => {
      loadLayoutsFromStorage();
    };

    window.addEventListener("widgets-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("widgets-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadLayoutsFromStorage]);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  const activeWidgets = view === "admin" ? adminWidgets : memberWidgets;

  const quickActionsState: QuickActionsState = {
    actions: quickActions,
    context: quickActionContext,
    isCustomizing: false,
    onAdd: () => {},
    onRemove: () => {},
  };

  const editingEvent = editingEventId ? events.find((e) => e.id === editingEventId) : undefined;
  const accentColor = settings?.primary_color ?? org.primary_color ?? "#3B82F6";

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Top Header */}
      <header style={headerStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: accentColor,
              }}
            >
              Organization Portal
            </span>
            <span style={{ color: "#CBD5E1" }}>•</span>
            <span
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                background: view === "admin" ? "#0F172A" : "#E2E8F0",
                color: view === "admin" ? "white" : "#0F172A",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              {view === "admin" ? "True Admin View" : "Member View"}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "36px", fontWeight: 800, color: "#0F172A" }}>
            {org.name}
          </h1>
        </div>

        {/* Admin Navigation Actions */}
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

            {/* Dedicated Change Widgets / Customization Page Link */}
            <Link
              href={`/orgs/${org.slug}/widgets`}
              title="Change and customize dashboard widgets"
              style={{
                ...actionButtonStyle,
                background: "#0F172A",
                color: "white",
                borderColor: "#0F172A",
              }}
            >
              <LayoutIcon />
              Change Widgets
            </Link>

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
          Previewing what members of <strong>{org.name}</strong> see on their dashboard. Click{" "}
          <Link href={`/orgs/${org.slug}/widgets`} style={{ color: "#92400E", fontWeight: 700 }}>
            Change Widgets
          </Link>{" "}
          to customize the member layout.
        </div>
      )}

      {/* Edit / delete event modal */}
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
            accentColor={accentColor}
            existing={editingEvent}
            onDeleted={() => {
              setEditingEventId(null);
              showFeedback(`Deleted "${editingEvent.name}"`);
            }}
          />
        </QuickActionModal>
      )}

      {/* Absence Review Modal */}
      {isAdmin && isReviewingAbsences && (
        <QuickActionModal
          eyebrow="Attendance & Compliance"
          title="Review Absence Requests"
          subtitle="Approve or deny member absence excuses for mandatory events."
          onClose={() => setIsReviewingAbsences(false)}
        >
          <AbsenceReviewPanel orgSlug={org.slug} accentColor={accentColor} />
        </QuickActionModal>
      )}

      {/* Toast Feedback */}
      {feedback && <div style={toastStyle}>{feedback}</div>}

      {/* Main Dashboard Widget Canvas - True View */}
      <main style={{ width: "100%" }}>
        {activeWidgets.length === 0 ? (
          <div style={emptyDashboardStyle}>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#1E293B" }}>
              No Widgets on Dashboard
            </h3>
            <p style={{ margin: "0 0 20px", color: "#64748B", fontSize: "14px", maxWidth: "480px" }}>
              Your {view === "admin" ? "admin" : "member"} dashboard currently has no widgets placed.
              Customize your screen to select the widgets you want to see.
            </p>
            {isAdmin && (
              <Link
                href={`/orgs/${org.slug}/widgets`}
                style={{
                  ...actionButtonStyle,
                  background: "#0F172A",
                  color: "white",
                  borderColor: "#0F172A",
                  padding: "10px 24px",
                  fontSize: "14px",
                }}
              >
                <LayoutIcon />
                Change Widgets
              </Link>
            )}
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
                    {renderWidgetContent(
                      widgetId,
                      org,
                      settings,
                      events,
                      quickActionsState,
                      isAdmin && view === "admin" ? setEditingEventId : undefined,
                      isAdmin && view === "admin" ? () => setIsReviewingAbsences(true) : undefined
                    )}
                  </WidgetTemplate>
                </div>
              );
            })}
          </div>
        )}
      </main>
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
  marginBottom: "24px",
};

const headerActionsStyle: React.CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
};

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: "13px",
  color: "#0F172A",
  background: "white",
  border: "2px solid #0F172A",
  borderRadius: "999px",
  textDecoration: "none",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  transition: "all 0.15s ease",
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
  fontWeight: 700,
  cursor: "pointer",
};

const bannerStyle: React.CSSProperties = {
  padding: "12px 18px",
  marginBottom: "20px",
  background: "#FFFBEB",
  border: "1px solid #F59E0B",
  color: "#92400E",
  borderRadius: "10px",
  fontSize: "13px",
  lineHeight: "1.5",
};

const toastStyle: React.CSSProperties = {
  padding: "12px 18px",
  marginBottom: "20px",
  background: "#0F172A",
  color: "white",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: 600,
  boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "20px",
};

const emptyDashboardStyle: React.CSSProperties = {
  padding: "80px 24px",
  textAlign: "center",
  background: "white",
  borderRadius: "16px",
  border: "1px solid #E2E8F0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};
