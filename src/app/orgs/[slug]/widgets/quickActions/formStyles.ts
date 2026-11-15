import type { CSSProperties } from "react";

// Shared form styles for the quick action pop-ups (inline, like the rest of the org pages).

export const fieldGroup: CSSProperties = { display: "grid", gap: "6px" };

export const twoUp: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

export const label: CSSProperties = { fontSize: "12px", fontWeight: 700, color: "#334155" };

export const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  fontSize: "14px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  background: "white",
  color: "#0F172A",
  fontFamily: "inherit",
};

// For inputs that can't be changed (e.g. an event's times after strikes were processed).
export const lockedInput: CSSProperties = {
  ...input,
  background: "#F1F5F9",
  color: "#64748B",
  cursor: "not-allowed",
};

export const hint: CSSProperties = { margin: 0, fontSize: "12px", color: "#64748B" };

export const card: CSSProperties = {
  padding: "14px",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  background: "#F8FAFC",
};

export function primaryButton(accent: string, disabled = false): CSSProperties {
  return {
    padding: "10px 18px",
    border: 0,
    borderRadius: "10px",
    background: accent,
    color: "white",
    fontWeight: 700,
    fontSize: "14px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export function dangerButton(disabled = false): CSSProperties {
  return {
    padding: "10px 16px",
    border: "1px solid #FECACA",
    borderRadius: "10px",
    background: "#FEF2F2",
    color: "#991B1B",
    fontWeight: 700,
    fontSize: "14px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export const secondaryButton: CSSProperties = {
  padding: "10px 16px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  background: "white",
  color: "#0F172A",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
};

const message = (bg: string, border: string, color: string): CSSProperties => ({
  padding: "10px 12px",
  borderRadius: "10px",
  background: bg,
  border: `1px solid ${border}`,
  color,
  fontSize: "13px",
});

export const successMessage = message("#ECFDF5", "#A7F3D0", "#065F46");
export const errorMessage = message("#FEF2F2", "#FECACA", "#991B1B");
export const noticeMessage = message("#FFFBEB", "#FDE68A", "#92400E");
