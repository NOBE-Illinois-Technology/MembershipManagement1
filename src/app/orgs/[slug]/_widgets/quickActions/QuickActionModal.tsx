"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type QuickActionModalProps = {
  title: string;
  subtitle?: string;
  // Small label above the title.
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
};

// Rendered into <body> with a portal: widget cards set a CSS transform, which would otherwise trap
// a position: fixed overlay inside the card.
export default function QuickActionModal({ title, subtitle, eyebrow = "Quick Action", onClose, children }: QuickActionModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      // React events bubble through portals to the widget's drag handlers; keep them in here.
      onDragStart={(e) => e.stopPropagation()}
      onDragOver={(e) => e.stopPropagation()}
      onDrop={(e) => e.stopPropagation()}
      style={overlayStyle}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={dialogStyle}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
          <div>
            <p style={eyebrowStyle}>{eyebrow}</p>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0F172A" }}>{title}</h2>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={closeStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "48px 16px",
  overflowY: "auto",
  fontFamily: "Roboto, sans-serif",
};

const dialogStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "640px",
  background: "white",
  borderRadius: "16px",
  padding: "22px 24px",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.25)",
  boxSizing: "border-box",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#64748B",
};

const closeStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  flexShrink: 0,
  borderRadius: "8px",
  border: "1px solid #E2E8F0",
  background: "white",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
};
