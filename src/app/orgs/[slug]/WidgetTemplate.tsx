"use client";

import React from "react";
import type { WidgetDefinition } from "@/lib/widgets";

export type WidgetTemplateProps = {
  widget: WidgetDefinition;
  isDragging?: boolean;
  isDropTarget?: boolean;
  isCustomizing?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children?: React.ReactNode;
};

/**
 * Reusable container template for dashboard widgets.
 * Standard container with crisp borders, functional headers,
 * and layout grid integration.
 */
export default function WidgetTemplate({
  widget,
  isDragging = false,
  isDropTarget = false,
  isCustomizing = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  children,
}: WidgetTemplateProps) {
  return (
    <div
      style={{
        ...cardStyle,
        gridColumn: widget.colSpan && widget.colSpan > 1 ? "span 2" : "span 1",
        opacity: isDragging ? 0.35 : 1,
        borderColor: isDropTarget ? "#2563EB" : isCustomizing ? "#94A3B8" : "#D1D5DB",
        borderStyle: isDropTarget ? "dashed" : "solid",
        borderWidth: isDropTarget ? "2px" : "1px",
      }}
    >
      {/* Widget Template Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isCustomizing && (
            <span
              title="Drag to reorder"
              style={{
                cursor: "grab",
                color: "#94A3B8",
                display: "inline-flex",
                alignItems: "center",
                userSelect: "none",
              }}
            >
              <DragDotsIcon />
            </span>
          )}
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#111827" }}>
            {widget.title}
          </h2>
          <span style={badgeStyle}>
            {widget.badge}
          </span>
        </div>

        {isCustomizing && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {onMoveUp && (
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={onMoveUp}
                title="Move up"
                aria-label="Move widget up"
                style={{
                  ...arrowButtonStyle,
                  cursor: canMoveUp ? "pointer" : "not-allowed",
                  opacity: canMoveUp ? 1 : 0.3,
                }}
              >
                <ChevronUpIcon />
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={onMoveDown}
                title="Move down"
                aria-label="Move widget down"
                style={{
                  ...arrowButtonStyle,
                  cursor: canMoveDown ? "pointer" : "not-allowed",
                  opacity: canMoveDown ? 1 : 0.3,
                }}
              >
                <ChevronDownIcon />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                title="Remove widget"
                style={removeButtonStyle}
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* Widget Content Slot */}
      <div style={bodyStyle}>
        {children ? (
          children
        ) : (
          <div style={emptySlotStyle}>
            <div style={{ fontWeight: 600, fontSize: "13px", color: "#4B5563", marginBottom: "4px" }}>
              {widget.title} Slot
            </div>
            <div style={{ fontSize: "11px", color: "#6B7280" }}>
              Ready for component implementation ({widget.badge})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const DragDotsIcon = () => (
  <svg width="12" height="14" viewBox="0 0 12 16" fill="currentColor">
    <circle cx="3" cy="3" r="1.5" />
    <circle cx="9" cy="3" r="1.5" />
    <circle cx="3" cy="8" r="1.5" />
    <circle cx="9" cy="8" r="1.5" />
    <circle cx="3" cy="13" r="1.5" />
    <circle cx="9" cy="13" r="1.5" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "6px",
  padding: "16px",
  border: "1px solid #D1D5DB",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  position: "relative",
  minHeight: "140px",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
  borderBottom: "1px solid #E5E7EB",
  paddingBottom: "8px",
};

const badgeStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "2px 6px",
  background: "#F3F4F6",
  color: "#4B5563",
  border: "1px solid #E5E7EB",
  borderRadius: "3px",
  fontWeight: 600,
};

const removeButtonStyle: React.CSSProperties = {
  padding: "3px 8px",
  fontSize: "11px",
  background: "#FEF2F2",
  color: "#991B1B",
  border: "1px solid #FECACA",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: 600,
};

const arrowButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "22px",
  height: "22px",
  background: "#FFFFFF",
  border: "1px solid #D1D5DB",
  borderRadius: "4px",
  color: "#374151",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

const emptySlotStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  background: "#F9FAFB",
  borderRadius: "4px",
  border: "1px dashed #D1D5DB",
  textAlign: "center",
};