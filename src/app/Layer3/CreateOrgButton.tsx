"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ORG_COLOR,
  HEX_COLOR,
  ORG_COLOR_PRESETS,
  ORG_NAME_MAX,
  orgInitials,
  slugifyOrgName,
} from "@/app/Layer3/orgs";

export default function CreateOrgButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={createButtonStyle}>
        + Create Org
      </button>
      {open && <CreateOrgModal onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_ORG_COLOR);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Esc closes, but never mid-request: the org may already have been created.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  const trimmedName = name.trim().replace(/\s+/g, " ");
  const colorValid = HEX_COLOR.test(color);
  const canSubmit = trimmedName.length >= 2 && colorValid && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, primary_color: color }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setError(payload?.error ?? "Could not create the organization.");
        setSubmitting(false);
        return;
      }

      // refresh() rebuilds the Layer 3 server component so the new org is actually there
      // when we land; push() alone can show a cached dashboard without it.
      router.refresh();
      router.push("/Layer3");
    } catch {
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={overlayStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-org-title"
        style={modalStyle}
      >
        <h2 id="create-org-title" style={{ margin: "0 0 4px", fontSize: "24px" }}>
          Create an organization
        </h2>
        <p style={hintStyle}>You can set up roles, points, and strikes afterwards in settings.</p>

        <label htmlFor="org-name" style={labelStyle}>
          Organization name
        </label>
        <input
          id="org-name"
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={ORG_NAME_MAX}
          placeholder="Robotics Club"
          autoComplete="off"
          disabled={submitting}
          style={inputStyle}
        />
        <div style={subHintStyle}>
          {trimmedName ? `Your org will live at /orgs/${slugifyOrgName(trimmedName)}` : " "}
        </div>

        <span style={labelStyle}>Primary color</span>
        <div style={swatchRowStyle}>
          {ORG_COLOR_PRESETS.map((preset) => {
            const selected = preset.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                aria-label={`Use color ${preset}`}
                aria-pressed={selected}
                disabled={submitting}
                onClick={() => setColor(preset)}
                style={{
                  ...swatchStyle,
                  background: preset,
                  outline: selected ? "2px solid black" : "none",
                  outlineOffset: "2px",
                }}
              />
            );
          })}
        </div>

        <div style={hexRowStyle}>
          <input
            type="color"
            aria-label="Pick a custom color"
            value={colorValid ? color : DEFAULT_ORG_COLOR}
            onChange={(e) => setColor(e.target.value)}
            disabled={submitting}
            style={colorInputStyle}
          />
          <input
            aria-label="Hex color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            maxLength={7}
            spellCheck={false}
            disabled={submitting}
            style={{
              ...inputStyle,
              margin: 0,
              fontFamily: "var(--font-geist-mono), monospace",
              borderColor: colorValid ? "black" : "#9A3B31",
            }}
          />
        </div>
        {!colorValid && <div style={errorTextStyle}>Use a 6-digit hex color, like #93E9BE.</div>}

        <span style={labelStyle}>Preview</span>
        <div style={previewCardStyle}>
          <div style={{ ...previewBannerStyle, background: colorValid ? color : DEFAULT_ORG_COLOR }}>
            <span style={previewInitialsStyle}>{orgInitials(trimmedName || "New Org")}</span>
          </div>
          <div style={{ padding: "10px 14px 14px" }}>
            <div style={{ ...previewTitleStyle, color: colorValid ? color : DEFAULT_ORG_COLOR }}>
              {trimmedName || "New Org"}
            </div>
            <div style={previewSlugStyle}>/orgs/{slugifyOrgName(trimmedName || "new org")}</div>
          </div>
        </div>

        {error && (
          <div role="alert" style={errorBoxStyle}>
            {error}
          </div>
        )}

        <div style={actionsStyle}>
          <button type="button" onClick={onClose} disabled={submitting} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...primaryButtonStyle,
              background: canSubmit ? "#93E9BE" : "#E2E2E2",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Creating…" : "Create org"}
          </button>
        </div>
      </form>
    </div>
  );
}

const createButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 32px",
  background: "white",
  color: "black",
  border: "2px solid black",
  borderRadius: "999px",
  minWidth: "220px",
  textAlign: "center",
  font: "inherit",
  fontWeight: 700,
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  background: "rgba(0,0,0,0.45)",
  overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "440px",
  maxHeight: "90vh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  background: "white",
  border: "2px solid black",
  borderRadius: "18px",
  padding: "24px",
  fontFamily: "Roboto, sans-serif",
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
};

const hintStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "14px",
  color: "#555",
};

const labelStyle: React.CSSProperties = {
  marginTop: "12px",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  font: "inherit",
  fontSize: "15px",
  color: "black",
  background: "white",
  border: "2px solid black",
  borderRadius: "10px",
};

const subHintStyle: React.CSSProperties = {
  minHeight: "18px",
  marginTop: "6px",
  fontSize: "13px",
  color: "#6B7780",
  overflowWrap: "anywhere",
};

const swatchRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const swatchStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  border: "1px solid rgba(0,0,0,0.25)",
  padding: 0,
  cursor: "pointer",
};

const hexRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginTop: "12px",
};

const colorInputStyle: React.CSSProperties = {
  width: "46px",
  height: "42px",
  flexShrink: 0,
  padding: 0,
  background: "none",
  border: "2px solid black",
  borderRadius: "10px",
  cursor: "pointer",
};

const previewCardStyle: React.CSSProperties = {
  borderRadius: "4px",
  overflow: "hidden",
  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
};

const previewBannerStyle: React.CSSProperties = {
  height: "92px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewInitialsStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 800,
  letterSpacing: "2px",
  color: "rgba(255,255,255,0.85)",
};

const previewTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "16px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const previewSlugStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "14px",
  color: "#2D3B45",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const errorTextStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "13px",
  color: "#9A3B31",
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#9A3B31",
  background: "#FBEDEC",
  border: "1px solid #9A3B31",
  borderRadius: "10px",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "24px",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 24px",
  font: "inherit",
  fontWeight: 700,
  color: "black",
  border: "2px solid black",
  borderRadius: "999px",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 24px",
  font: "inherit",
  color: "black",
  background: "white",
  border: "2px solid black",
  borderRadius: "999px",
  cursor: "pointer",
};
