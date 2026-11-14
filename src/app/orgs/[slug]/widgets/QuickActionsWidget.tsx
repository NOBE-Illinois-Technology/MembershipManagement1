"use client";

import { useState, type DragEvent } from "react";
import type { OrgSettings } from "@/lib/orgSettings";
import {
  QUICK_ACTIONS,
  QUICK_ACTION_DRAG_TYPE,
  getQuickActionAvailability,
  isQuickActionId,
  type QuickActionContext,
  type QuickActionId,
} from "@/lib/quickActions";
import { needsStrikeProcessing, type OrgEventRow } from "@/lib/orgEvents";
import QuickActionModal from "./quickActions/QuickActionModal";
import CreateEventPanel from "./quickActions/CreateEventPanel";
import EmailMembersPanel from "./quickActions/EmailMembersPanel";
import StrikesPanel from "./quickActions/StrikesPanel";
import AbsenceReviewPanel from "./quickActions/AbsenceReviewPanel";

// A widget that holds other buttons: admins drag Quick Action buttons from the side panel into it,
// and clicking a button opens that action in a pop-up. Modeled on the Quick Actions panel of the
// NOBE DevOps admin dashboard, with each action scoped to this org.

type QuickActionsWidgetProps = {
  orgSlug: string;
  orgName: string;
  settings?: OrgSettings | null;
  // The org's own events (for Process Strikes).
  events: OrgEventRow[];
  // Decides which buttons are usable (strikes on, mandatory events exist).
  context: QuickActionContext;
  accentColor: string;
  // The buttons placed in this widget, in order.
  actions: QuickActionId[];
  // Admins can drop buttons in and remove them.
  isCustomizing: boolean;
  onAddAction: (id: QuickActionId) => void;
  onRemoveAction: (id: QuickActionId) => void;
};

const SUBTITLES: Record<QuickActionId, string> = {
  "create-event": "Add an event to your organization's calendar.",
  "email-members": "Write an email to every member of the organization.",
  strikes: "Give strikes to members who missed mandatory events without an approved absence.",
  "absence-review": "Approve or deny absence requests from members.",
};

const isQuickActionDrag = (e: DragEvent) => e.dataTransfer.types.includes(QUICK_ACTION_DRAG_TYPE);

export default function QuickActionsWidget({
  orgSlug,
  orgName,
  settings,
  events,
  context,
  accentColor,
  actions,
  isCustomizing,
  onAddAction,
  onRemoveAction,
}: QuickActionsWidgetProps) {
  const [openAction, setOpenAction] = useState<QuickActionId | null>(null);
  const [isOver, setIsOver] = useState(false);

  const placed = actions
    .map((id) => QUICK_ACTIONS.find((a) => a.id === id))
    .filter((a): a is (typeof QUICK_ACTIONS)[number] => Boolean(a));
  const open = openAction ? QUICK_ACTIONS.find((a) => a.id === openAction) : null;

  // Only quick action buttons can be dropped here; whole widgets fall through to the dashboard.
  const dropHandlers = isCustomizing
    ? {
        onDragOver: (e: DragEvent) => {
          if (!isQuickActionDrag(e)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          setIsOver(true);
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOver(false);
        },
        onDrop: (e: DragEvent) => {
          if (!isQuickActionDrag(e)) return;
          e.preventDefault();
          e.stopPropagation();
          setIsOver(false);
          const id = e.dataTransfer.getData(QUICK_ACTION_DRAG_TYPE);
          if (isQuickActionId(id)) onAddAction(id);
        },
      }
    : {};

  return (
    <div
      {...dropHandlers}
      style={{
        display: "grid",
        gap: "10px",
        padding: "6px",
        margin: "-6px",
        borderRadius: "14px",
        outline: isOver ? `2px dashed ${accentColor}` : "2px dashed transparent",
        background: isOver ? `${accentColor}0f` : "transparent",
        transition: "background 0.15s ease, outline-color 0.15s ease",
      }}
    >
      {placed.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "#334155" }}>No quick actions yet</div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
            {isCustomizing
              ? "Drag buttons from the Quick Actions card in the side panel into this box."
              : "An admin hasn't added any quick actions."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
          {placed.map((action) => {
            const availability = getQuickActionAvailability(action.id, context);
            const usable = availability.available;
            return (
              <div key={action.id} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => usable && setOpenAction(action.id)}
                  disabled={!usable}
                  title={usable ? action.description : availability.reason}
                  style={{
                    ...tileStyle,
                    background: usable ? `${accentColor}14` : "#F1F5F9",
                    borderColor: usable ? `${accentColor}40` : "#E2E8F0",
                    color: usable ? "#0F172A" : "#94A3B8",
                    cursor: usable ? "pointer" : "not-allowed",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "13px" }}>{action.label}</span>
                  {!usable && <span style={{ fontSize: "10px", lineHeight: 1.3 }}>{availability.reason}</span>}
                </button>
                {isCustomizing && (
                  <button
                    type="button"
                    onClick={() => onRemoveAction(action.id)}
                    aria-label={`Remove ${action.label} from Quick Actions`}
                    title="Remove from Quick Actions"
                    style={removeStyle}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isCustomizing && placed.length > 0 && placed.length < QUICK_ACTIONS.length && (
        <div style={{ fontSize: "11px", color: "#94A3B8", textAlign: "center" }}>
          Drop more buttons here from the side panel
        </div>
      )}

      {open && (
        <QuickActionModal title={open.label} subtitle={SUBTITLES[open.id]} onClose={() => setOpenAction(null)}>
          {open.id === "create-event" && <CreateEventPanel orgSlug={orgSlug} settings={settings} accentColor={accentColor} />}
          {open.id === "email-members" && <EmailMembersPanel orgSlug={orgSlug} orgName={orgName} accentColor={accentColor} />}
          {open.id === "strikes" && (
            <StrikesPanel
              orgSlug={orgSlug}
              settings={settings}
              accentColor={accentColor}
              mandatoryEvents={events.filter((e) => needsStrikeProcessing(e))}
            />
          )}
          {open.id === "absence-review" && <AbsenceReviewPanel orgSlug={orgSlug} accentColor={accentColor} />}
        </QuickActionModal>
      )}
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  padding: "22px 14px",
  textAlign: "center",
  background: "#F8FAFC",
  border: "1px dashed #CBD5E1",
  borderRadius: "12px",
};

const tileStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "64px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: "12px 10px",
  border: "1px solid",
  borderRadius: "16px",
  textAlign: "center",
  fontFamily: "inherit",
  transition: "transform 0.15s ease",
};

const removeStyle: React.CSSProperties = {
  position: "absolute",
  top: "-6px",
  right: "-6px",
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  border: "1px solid #FECACA",
  background: "#FEE2E2",
  color: "#991B1B",
  fontSize: "10px",
  fontWeight: 800,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
};
