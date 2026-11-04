"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_ORG_COLOR, HEX_COLOR, ORG_COLOR_PRESETS, orgInitials, type Org } from "@/app/Layer3/orgs";
import {
  LIMITS,
  LOGO_TYPES,
  nameErrors,
  type Committee,
  type OrgSettings,
  type PointCategory,
} from "@/lib/orgSettings";

// List rows carry a client-only key so React can track rows that haven't been saved (no id yet).
type Keyed<T> = T & { key: string };
type Draft = Omit<OrgSettings, "categories" | "committees" | "max_strikes"> & {
  categories: Keyed<PointCategory>[];
  committees: Keyed<Committee>[];
  // Kept while strikes are off so turning them back on restores the last value.
  max_strikes: number;
};

let keyCounter = 0;
const newKey = () => `new-${++keyCounter}`;

function toDraft(s: OrgSettings): Draft {
  return {
    ...s,
    max_strikes: s.max_strikes ?? 3,
    categories: s.categories.map((c) => ({ ...c, key: `c${c.id ?? newKey()}` })),
    committees: s.committees.map((c) => ({ ...c, key: `m${c.id ?? newKey()}` })),
  };
}

// What gets sent to the API (and compared to detect unsaved changes).
function toPayload(d: Draft) {
  return {
    primary_color: d.primary_color,
    secondary_color: d.secondary_color,
    total_points_required: d.total_points_required,
    strikes_enabled: d.strikes_enabled,
    max_strikes: d.strikes_enabled ? d.max_strikes : null,
    categories: d.categories.map(({ id, name, points_required, is_mandatory }) => ({ id, name, points_required, is_mandatory })),
    committees: d.committees.map(({ id, name }) => ({ id, name })),
  };
}

export default function SettingsForm({ org, initial }: { org: Org; initial: OrgSettings }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toDraft(initial));
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const dirty = JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(saved));
  const errors = [
    ...(HEX_COLOR.test(draft.primary_color) ? [] : ["Primary color must be a 6-digit hex value."]),
    ...(draft.secondary_color === null || HEX_COLOR.test(draft.secondary_color) ? [] : ["Secondary color must be a 6-digit hex value."]),
    ...nameErrors(draft.categories.map((c) => c.name), "point category", LIMITS.categoryNameMax),
    ...nameErrors(draft.committees.map((c) => c.name), "committee", LIMITS.committeeNameMax),
  ];
  const canSave = dirty && errors.length === 0 && !saving;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function update(change: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...change }));
    setStatus(null);
  }

  function updateCategory(key: string, change: Partial<PointCategory>) {
    update({ categories: draft.categories.map((c) => (c.key === key ? { ...c, ...change } : c)) });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/orgs/${org.slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(draft)),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus({ kind: "error", text: payload?.error ?? "Could not save settings." });
        return;
      }
      const next = toDraft(payload.settings);
      setSaved(next);
      setDraft(next);
      setStatus({ kind: "ok", text: "Settings saved." });
      // So the org page and dashboard show the new colors right away.
      router.refresh();
    } catch {
      setStatus({ kind: "error", text: "Network error. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  const accent = HEX_COLOR.test(draft.primary_color) ? draft.primary_color : DEFAULT_ORG_COLOR;
  const secondary = draft.secondary_color && HEX_COLOR.test(draft.secondary_color) ? draft.secondary_color : null;

  return (
    <div style={{ ...pageStyle, background: `linear-gradient(135deg, ${accent}55, ${secondary ? `${secondary}55` : "#FBFBF9"})` }}>
      <div style={{ width: "100%", maxWidth: "760px" }}>
        <header style={headerStyle}>
          <div>
            <div style={{ fontSize: "15px", color: "#2D3B45" }}>{org.name}</div>
            <h1 style={{ margin: "2px 0 0", fontSize: "40px" }}>Settings</h1>
          </div>
          <Link href={`/orgs/${org.slug}`} style={{ ...secondaryButtonStyle, marginLeft: "auto" }}>
            Back to org
          </Link>
        </header>

        <form onSubmit={handleSave}>
          <Section title="Logo" hint="PNG, JPEG, WebP, or GIF, up to 2 MB. Saves as soon as you upload.">
            <LogoField
              slug={org.slug}
              name={org.name}
              logoUrl={draft.logo_url}
              color={accent}
              onChange={(logo_url) => {
                // The logo is saved by its own request, so it's never an unsaved change.
                setSaved((s) => ({ ...s, logo_url }));
                setDraft((d) => ({ ...d, logo_url }));
                router.refresh();
              }}
            />
          </Section>

          <Section title="Colors" hint="Used across your org's pages.">
            <ColorField label="Primary color" value={draft.primary_color} onChange={(primary_color) => update({ primary_color })} />
            {draft.secondary_color === null ? (
              <>
                <span style={labelStyle}>Secondary color</span>
                <button
                  type="button"
                  onClick={() => update({ secondary_color: "#1e2a38" })}
                  style={{ ...secondaryButtonStyle, alignSelf: "flex-start" }}
                >
                  + Add secondary color
                </button>
              </>
            ) : (
              <>
                <ColorField
                  label="Secondary color"
                  value={draft.secondary_color}
                  onChange={(secondary_color) => update({ secondary_color })}
                />
                <button type="button" onClick={() => update({ secondary_color: null })} style={linkButtonStyle}>
                  Remove secondary color
                </button>
              </>
            )}
          </Section>

          <Section title="Points" hint="How many points members need.">
            <span style={labelStyle}>Total points required</span>
            <div style={inlineRowStyle}>
              <NumberInput
                label="Total points required"
                value={draft.total_points_required}
                max={LIMITS.pointsMax}
                onChange={(total_points_required) => update({ total_points_required })}
              />
              <span style={unitStyle}>points per member (0 = no requirement)</span>
            </div>

            <span style={labelStyle}>Point categories (optional)</span>
            <p style={hintTextStyle}>
              Split points into types like Professional or Service. Mark a category mandatory if members must
              meet its requirement.
            </p>
            {draft.categories.length > 0 && (
              <div style={listStyle}>
                {draft.categories.map((cat, i) => (
                  <div key={cat.key} style={categoryRowStyle}>
                    <input
                      aria-label={`Category ${i + 1} name`}
                      value={cat.name}
                      maxLength={LIMITS.categoryNameMax}
                      placeholder="Category name"
                      onChange={(e) => updateCategory(cat.key, { name: e.target.value })}
                      style={{ ...inputStyle, flex: "1 1 160px", minWidth: 0 }}
                    />
                    <div style={inlineRowStyle}>
                      <NumberInput
                        label={`${cat.name || `Category ${i + 1}`} points required`}
                        value={cat.points_required}
                        max={LIMITS.pointsMax}
                        onChange={(points_required) => updateCategory(cat.key, { points_required })}
                      />
                      <span style={unitStyle}>pts</span>
                      <label style={checkLabelStyle}>
                        <input
                          type="checkbox"
                          checked={cat.is_mandatory}
                          onChange={(e) => updateCategory(cat.key, { is_mandatory: e.target.checked })}
                          style={checkboxStyle}
                        />
                        Mandatory
                      </label>
                      <RemoveButton
                        label={`Remove ${cat.name || `category ${i + 1}`}`}
                        onClick={() => update({ categories: draft.categories.filter((c) => c.key !== cat.key) })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {draft.categories.length < LIMITS.listMax && (
              <button
                type="button"
                onClick={() =>
                  update({
                    categories: [...draft.categories, { key: newKey(), name: "", points_required: 0, is_mandatory: false }],
                  })
                }
                style={{ ...secondaryButtonStyle, alignSelf: "flex-start" }}
              >
                + Add category
              </button>
            )}
          </Section>

          <Section title="Strikes (optional)" hint="Track strikes, for example for missed mandatory events.">
            <label style={checkLabelStyle}>
              <input
                type="checkbox"
                checked={draft.strikes_enabled}
                onChange={(e) => update({ strikes_enabled: e.target.checked })}
                style={checkboxStyle}
              />
              Use strikes
            </label>
            {draft.strikes_enabled && (
              <>
                <span style={labelStyle}>Strike limit</span>
                <div style={inlineRowStyle}>
                  <NumberInput
                    label="Strike limit"
                    value={draft.max_strikes}
                    min={1}
                    max={LIMITS.maxStrikesMax}
                    onChange={(max_strikes) => update({ max_strikes })}
                  />
                  <span style={unitStyle}>strikes allowed per member</span>
                </div>
              </>
            )}
          </Section>

          <Section title="Committees (optional)" hint="The committees members can belong to.">
            {draft.committees.length > 0 && (
              <div style={listStyle}>
                {draft.committees.map((committee, i) => (
                  <div key={committee.key} style={categoryRowStyle}>
                    <input
                      aria-label={`Committee ${i + 1} name`}
                      value={committee.name}
                      maxLength={LIMITS.committeeNameMax}
                      placeholder="Committee name"
                      onChange={(e) =>
                        update({
                          committees: draft.committees.map((c) => (c.key === committee.key ? { ...c, name: e.target.value } : c)),
                        })
                      }
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                    />
                    <RemoveButton
                      label={`Remove ${committee.name || `committee ${i + 1}`}`}
                      onClick={() => update({ committees: draft.committees.filter((c) => c.key !== committee.key) })}
                    />
                  </div>
                ))}
              </div>
            )}
            {draft.committees.length < LIMITS.listMax && (
              <button
                type="button"
                onClick={() => update({ committees: [...draft.committees, { key: newKey(), name: "" }] })}
                style={{ ...secondaryButtonStyle, alignSelf: "flex-start" }}
              >
                + Add committee
              </button>
            )}
          </Section>

          {dirty && errors.length > 0 && (
            <div role="alert" style={errorBoxStyle}>
              {errors.map((e) => <div key={e}>{e}</div>)}
            </div>
          )}
          {status && (
            <div role="status" style={status.kind === "ok" ? okBoxStyle : errorBoxStyle}>{status.text}</div>
          )}

          <div style={actionsStyle}>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => { setDraft(saved); setStatus(null); }}
              style={{ ...secondaryButtonStyle, opacity: dirty && !saving ? 1 : 0.5, cursor: dirty && !saving ? "pointer" : "not-allowed" }}
            >
              Discard changes
            </button>
            <button
              type="submit"
              disabled={!canSave}
              style={{ ...primaryButtonStyle, background: canSave ? "#93E9BE" : "#E2E2E2", cursor: canSave ? "pointer" : "not-allowed" }}
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LogoField({ slug, name, logoUrl, color, onChange }: {
  slug: string;
  name: string;
  logoUrl: string | null;
  color: string;
  onChange: (logoUrl: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "DELETE", file?: File) {
    setBusy(true);
    setError(null);
    try {
      let body: FormData | undefined;
      if (file) {
        body = new FormData();
        body.append("logo", file);
      }
      const res = await fetch(`/api/orgs/${slug}/logo`, { method, body });
      const payload = await res.json().catch(() => null);
      if (!res.ok) setError(payload?.error ?? "Could not update the logo.");
      else onChange(payload.logo_url ?? null);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    // Checked again on the server; this just saves a round trip.
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return setError("Choose a PNG, JPEG, WebP, or GIF image.");
    if (file.size > LIMITS.logoBytesMax) return setError("The logo must be 2 MB or smaller.");
    send("POST", file);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
      <div style={{ ...logoPreviewStyle, background: logoUrl ? "#F5F5F5" : color }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${name} logo`} style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: "28px", fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>{orgInitials(name)}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
        <input
          ref={fileRef}
          type="file"
          accept={LOGO_TYPES.join(",")}
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ display: "none" }}
        />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} style={secondaryButtonStyle}>
          {busy ? "Working…" : logoUrl ? "Replace logo" : "Upload logo"}
        </button>
        {logoUrl && !busy && (
          <button type="button" onClick={() => send("DELETE")} style={linkButtonStyle}>
            Remove logo
          </button>
        )}
      </div>
      {error && <div role="alert" style={{ ...errorBoxStyle, width: "100%", marginBottom: 0 }}>{error}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const valid = HEX_COLOR.test(value);
  return (
    <>
      <span style={labelStyle}>{label}</span>
      <div style={swatchRowStyle}>
        {ORG_COLOR_PRESETS.map((preset) => {
          const selected = preset.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              aria-label={`${label}: ${preset}`}
              aria-pressed={selected}
              onClick={() => onChange(preset.toLowerCase())}
              style={{ ...swatchStyle, background: preset, outline: selected ? "2px solid black" : "none", outlineOffset: "2px" }}
            />
          );
        })}
      </div>
      <div style={{ ...inlineRowStyle, marginTop: "10px" }}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : DEFAULT_ORG_COLOR}
          onChange={(e) => onChange(e.target.value)}
          style={colorInputStyle}
        />
        <input
          aria-label={`${label} hex value`}
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.trim())}
          style={{ ...inputStyle, width: "120px", fontFamily: "var(--font-geist-mono), monospace", borderColor: valid ? "black" : "#9A3B31" }}
        />
      </div>
    </>
  );
}

// Whole numbers only; an empty box reads as the minimum.
function NumberInput({ label, value, onChange, min = 0, max }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(e) => {
        const n = Math.trunc(Number(e.target.value));
        onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
      }}
      style={{ ...inputStyle, width: "90px", flexShrink: 0 }}
    />
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} style={removeButtonStyle}>
      ×
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section style={cardStyle}>
      <h2 style={{ margin: 0, fontSize: "20px" }}>{title}</h2>
      <p style={{ margin: "4px 0 12px", fontSize: "14px", color: "#555" }}>{hint}</p>
      {children}
    </section>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  padding: "48px 16px 80px",
  boxSizing: "border-box",
  fontFamily: "Roboto, sans-serif",
  color: "black",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
  marginBottom: "24px",
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "white",
  border: "1px solid #C7CDD1",
  borderRadius: "10px",
  padding: "18px 20px",
  marginBottom: "16px",
};

const labelStyle: React.CSSProperties = {
  marginTop: "12px",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 700,
};

const hintTextStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: "13px",
  color: "#6B7780",
};

const inputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  padding: "8px 10px",
  font: "inherit",
  fontSize: "15px",
  color: "black",
  background: "white",
  border: "2px solid black",
  borderRadius: "10px",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "12px",
};

const categoryRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
};

const inlineRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
};

const unitStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#2D3B45",
};

const checkLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "15px",
  cursor: "pointer",
};

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  accentColor: "#1E2A38",
};

const swatchRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const swatchStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  border: "1px solid rgba(0,0,0,0.25)",
  padding: 0,
  cursor: "pointer",
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

const logoPreviewStyle: React.CSSProperties = {
  width: "96px",
  height: "96px",
  flexShrink: 0,
  borderRadius: "10px",
  border: "1px solid #C7CDD1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const removeButtonStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  font: "inherit",
  fontSize: "20px",
  lineHeight: 1,
  color: "#9A3B31",
  background: "white",
  border: "2px solid #9A3B31",
  borderRadius: "50%",
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  marginTop: "8px",
  padding: 0,
  font: "inherit",
  fontSize: "14px",
  color: "#9A3B31",
  background: "none",
  border: "none",
  textDecoration: "underline",
  cursor: "pointer",
};

const errorBoxStyle: React.CSSProperties = {
  padding: "10px 12px",
  marginBottom: "16px",
  fontSize: "14px",
  color: "#9A3B31",
  background: "#FBEDEC",
  border: "1px solid #9A3B31",
  borderRadius: "10px",
};

const okBoxStyle: React.CSSProperties = {
  ...errorBoxStyle,
  color: "#2F5E3F",
  background: "#E9F8EF",
  border: "1px solid #3F7A53",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: "12px",
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
  display: "inline-block",
  padding: "10px 24px",
  font: "inherit",
  color: "black",
  background: "white",
  border: "2px solid black",
  borderRadius: "999px",
  textDecoration: "none",
  cursor: "pointer",
};
