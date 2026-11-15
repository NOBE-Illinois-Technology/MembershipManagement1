"use client";

import { useEffect, useState } from "react";
import { ABSENCE_RESPONSE_MAX, type AbsenceRequest } from "@/lib/orgAbsences";
import * as s from "./formStyles";

// Modeled on NOBE DevOps' Review Absences page (users/admin/reviewAbsence): Pending and Reviewed
// tabs, and for each pending request an Approved/Denied choice plus a message to the member.
// Loads every absence request for this org's events (GET /api/orgs/[slug]/absences) and saves
// reviews through POST /api/orgs/[slug]/absences/[id]. Only offered once the org has a mandatory event.

type AbsenceReviewPanelProps = {
  orgSlug: string;
  accentColor: string;
};

type FormState = { status: "APPROVED" | "DENIED"; response: string; submitting: boolean; error: string };

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function AbsenceReviewPanel({ orgSlug, accentColor }: AbsenceReviewPanelProps) {
  const [rows, setRows] = useState<AbsenceRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"PENDING" | "REVIEWED">("PENDING");
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const base = `/api/orgs/${encodeURIComponent(orgSlug)}/absences`;

  useEffect(() => {
    let cancelled = false;
    fetch(base)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load absence requests.");
        if (!cancelled) setRows(data.requests);
      })
      .catch((err) => !cancelled && setLoadError(err instanceof Error ? err.message : "Could not load absence requests."));
    return () => {
      cancelled = true;
    };
  }, [base]);

  const pending = (rows ?? []).filter((r) => r.status === "PENDING");
  const reviewed = (rows ?? []).filter((r) => r.status !== "PENDING");
  const shown = tab === "PENDING" ? pending : reviewed;

  const formFor = (id: string): FormState => forms[id] ?? { status: "APPROVED", response: "", submitting: false, error: "" };
  const updateForm = (id: string, patch: Partial<FormState>) =>
    setForms((f) => ({ ...f, [id]: { ...formFor(id), ...patch } }));

  async function submitReview(request: AbsenceRequest) {
    const form = formFor(request.id);
    updateForm(request.id, { submitting: true, error: "" });
    setNotice(null);
    try {
      const res = await fetch(`${base}/${encodeURIComponent(request.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: form.status, response: form.response }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the review.");
      const review = data.review ?? {};
      setRows((current) =>
        (current ?? []).map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: review.status ?? form.status,
                adminResponse: review.admin_response ?? (form.response.trim() || null),
                reviewedAt: review.reviewed_at ?? new Date().toISOString(),
                emailSent: review.email_sent ?? null,
                emailError: review.email_error ?? null,
              }
            : r
        )
      );
      setNotice(
        `${form.status === "APPROVED" ? "Approved" : "Denied"} ${request.memberName}'s request.` +
          (review.email_sent ? " They were emailed." : review.email_error ? ` Email not sent: ${review.email_error}` : "")
      );
      updateForm(request.id, { submitting: false });
    } catch (err) {
      updateForm(request.id, { submitting: false, error: err instanceof Error ? err.message : "Could not save the review." });
    }
  }

  if (loadError) return <div role="status" style={s.errorMessage}>{loadError}</div>;
  if (!rows) return <p style={s.hint}>Loading absence requests...</p>;

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div role="tablist" style={{ display: "flex", gap: "6px", background: "#F1F5F9", padding: "4px", borderRadius: "12px", maxWidth: "280px" }}>
        {(["PENDING", "REVIEWED"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "7px 10px",
              border: 0,
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: tab === t ? "white" : "transparent",
              boxShadow: tab === t ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              color: "#0F172A",
            }}
          >
            {t === "PENDING" ? `Pending (${pending.length})` : `Reviewed (${reviewed.length})`}
          </button>
        ))}
      </div>

      {notice && <div role="status" style={s.successMessage}>{notice}</div>}

      {shown.length === 0 ? (
        <div style={{ ...s.card, textAlign: "center", color: "#64748B", fontSize: "13px", padding: "28px 14px" }}>
          {tab === "PENDING" ? "No pending absence requests." : "No reviewed absence requests yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px", maxHeight: "440px", overflowY: "auto" }}>
          {shown.map((r) => {
            const form = formFor(r.id);
            return (
              <div key={r.id} style={{ ...s.card, display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "14px", color: "#0F172A" }}>{r.memberName}</strong>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>Submitted {formatDate(r.submittedAt)}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#334155" }}>
                  <strong>Event:</strong> {r.eventName}
                  {r.eventDate ? ` (${formatDate(r.eventDate)})` : ""}
                </div>
                <div style={{ fontSize: "13px", color: "#334155" }}>
                  <strong>Reason:</strong> {r.reason || "No reason provided."}
                </div>
                {r.imageUrl && (
                  <a href={r.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: accentColor, fontWeight: 600 }}>
                    View attached image
                  </a>
                )}

                {r.status === "PENDING" ? (
                  <>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                      <label style={s.label} htmlFor={`qa-abs-status-${r.id}`}>Decision</label>
                      <select
                        id={`qa-abs-status-${r.id}`}
                        style={{ ...s.input, width: "auto" }}
                        value={form.status}
                        onChange={(e) => updateForm(r.id, { status: e.target.value as "APPROVED" | "DENIED", error: "" })}
                      >
                        <option value="APPROVED">Approved</option>
                        <option value="DENIED">Denied</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      style={{ ...s.input, resize: "vertical" }}
                      value={form.response}
                      onChange={(e) => updateForm(r.id, { response: e.target.value, error: "" })}
                      placeholder="Optional message to the member (included in their email)"
                      maxLength={ABSENCE_RESPONSE_MAX}
                    />
                    {form.error && <div role="status" style={s.errorMessage}>{form.error}</div>}
                    <div>
                      <button type="button" onClick={() => submitReview(r)} disabled={form.submitting} style={s.primaryButton(accentColor, form.submitting)}>
                        {form.submitting ? "Saving..." : "Submit review"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "13px", color: "#334155", display: "grid", gap: "2px" }}>
                    <span>
                      <strong>Status:</strong>{" "}
                      <span style={{ color: r.status === "APPROVED" ? "#047857" : "#B91C1C", fontWeight: 700 }}>
                        {r.status === "APPROVED" ? "Approved" : "Denied"}
                      </span>
                      {r.reviewedAt ? ` on ${formatDate(r.reviewedAt)}` : ""}
                    </span>
                    {r.adminResponse && <span><strong>Response:</strong> {r.adminResponse}</span>}
                    <span style={{ fontSize: "12px", color: "#64748B" }}>
                      Email: {r.emailSent ? "sent" : r.emailError ? `not sent (${r.emailError})` : "not sent"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
