"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgSettings } from "@/lib/orgSettings";
import type { OrgEventRow } from "@/lib/orgEvents";
import * as s from "./formStyles";

// Modeled on NOBE DevOps' Process Strikes action. Runs POST /api/orgs/[slug]/strikes/process:
// for each of this org's mandatory events whose check-in has closed, every member of the org who
// didn't check in and has no approved absence gets a strike and an email. Only offered when the
// org has strikes turned on in Settings (the route checks this too).

type StrikesPanelProps = {
  orgSlug: string;
  settings?: OrgSettings | null;
  accentColor: string;
  // The org's mandatory events that have ended and haven't been processed yet.
  mandatoryEvents: OrgEventRow[];
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function StrikesPanel({ orgSlug, settings, accentColor, mandatoryEvents }: StrikesPanelProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const maxStrikes = settings?.max_strikes ?? 3;

  async function processStrikes() {
    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(orgSlug)}/strikes/process`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to process strikes.");

      const results: { event: string; struckCount: number }[] = data.results ?? [];
      let text = results.length
        ? `Success! Processed strikes: ${results.map((r) => `${r.event}: ${r.struckCount} strike(s)`).join(", ")}.`
        : data.message ?? "Strikes up to date. No events required processing.";
      if (data.emailError) text += ` Strike emails weren't all sent: ${data.emailError}`;
      else if (data.emailsSent) text += ` Emailed ${data.emailsSent} member(s).`;
      setResult({ kind: "success", text });
      router.refresh();
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "Failed to process strikes." });
    } finally {
      setProcessing(false);
      setConfirming(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div style={{ ...s.card, display: "grid", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Strike policy</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#B91C1C" }}>Limit: {maxStrikes} strikes</span>
        </div>
        <p style={s.hint}>
          Every member who didn&apos;t check in to a mandatory event and doesn&apos;t have an approved absence gets one
          strike and an email. Events are processed once their check-in window closes.
        </p>
      </div>

      <div style={s.fieldGroup}>
        <span style={s.label}>Mandatory events waiting to be processed</span>
        {mandatoryEvents.length === 0 ? (
          <p style={s.hint}>No mandatory events are waiting to be processed.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#334155" }}>
            {mandatoryEvents.map((e) => (
              <li key={e.id}>
                {e.name} — {formatDate(e.date)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {result && <div role="status" style={result.kind === "success" ? s.successMessage : s.errorMessage}>{result.text}</div>}

      {confirming ? (
        <div style={{ ...s.noticeMessage, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <span>
            Give strikes for {mandatoryEvents.length} event{mandatoryEvents.length === 1 ? "" : "s"}? Members who get a
            strike are emailed. This can&apos;t be undone from here.
          </span>
          <span style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setConfirming(false)} disabled={processing} style={s.secondaryButton}>Cancel</button>
            <button type="button" onClick={processStrikes} disabled={processing} style={s.primaryButton(accentColor, processing)}>
              {processing ? "Running..." : "Yes, process strikes"}
            </button>
          </span>
        </div>
      ) : (
        <div>
          <button
            type="button"
            // Nothing to give strikes for: run it anyway so the admin gets the "up to date" answer.
            onClick={() => (mandatoryEvents.length > 0 ? setConfirming(true) : processStrikes())}
            disabled={processing}
            style={s.primaryButton(accentColor, processing)}
          >
            {processing ? "Running..." : "Process Strikes"}
          </button>
        </div>
      )}
    </div>
  );
}
