"use client";

import React from "react";
import type { WidgetDefinition } from "@/lib/widgets";

export type WidgetTemplateProps = {
  widget: WidgetDefinition;
  isDragging?: boolean;
  isDropTarget?: boolean;
  isCustomizing?: boolean;
  onRemove?: () => void;
  children?: React.ReactNode;
};

/**
 * Reusable container template for dashboard widgets.
 * Provides the standardized header, drag handles, layout grid styles,
 * and an empty content slot for widget-specific ticket implementations.
 */
export default function WidgetTemplate({
  widget,
  isDragging = false,
  isDropTarget = false,
  isCustomizing = false,
  onRemove,
  children,
}: WidgetTemplateProps) {
  return (
    <div
      style={{
        ...cardStyle,
        gridColumn: widget.colSpan && widget.colSpan > 1 ? "span 2" : "span 1",
        opacity: isDragging ? 0.35 : 1,
        border: isDropTarget
          ? "2px dashed #3B82F6"
          : isCustomizing
          ? "2px solid #CBD5E1"
          : "1px solid #E2E8F0",
        transform: isDropTarget ? "scale(1.01)" : "scale(1)",
        transition: "transform 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
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
                fontSize: "14px",
                fontWeight: 900,
                userSelect: "none",
              }}
            >
              ⋮⋮
            </span>
          )}
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1E293B" }}>
            {widget.title}
          </h2>
          <span style={badgeStyle}>
            {widget.badge}
          </span>
        </div>

        {isCustomizing && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove widget from layout"
            style={removeButtonStyle}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {/* Widget Content Slot: empty template ready for ticket components */}
      <div style={bodyStyle}>
        {children ? (
          children
        ) : (
          <div style={emptySlotStyle}>
            <div style={{ fontWeight: 600, fontSize: "13px", color: "#64748B", marginBottom: "4px" }}>
              {widget.title} Slot
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}>
              Ready for component implementation ({widget.badge})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "16px 18px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
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
  borderBottom: "1px solid #F1F5F9",
  paddingBottom: "8px",
};

const badgeStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "2px 6px",
  background: "#F1F5F9",
  color: "#64748B",
  borderRadius: "4px",
  fontWeight: 600,
};

const removeButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: "12px",
  background: "#FEE2E2",
  color: "#991B1B",
  border: 0,
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: 700,
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
  background: "#F8FAFC",
  borderRadius: "8px",
  border: "1px dashed #E2E8F0",
  textAlign: "center",
};
