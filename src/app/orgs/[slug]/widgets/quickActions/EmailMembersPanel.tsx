"use client";

import { useState } from "react";
import { EMAIL_LIMITS } from "@/lib/quickActions";
import * as s from "./formStyles";

// Modeled on NOBE DevOps' Email Members page (users/admin/send-email): preview who will get the
// email, then send. Unlike NOBE's fixed weekly digest, the admin writes the subject and message.
// Sends for real through /api/orgs/[slug]/email-members, to this org's members only.

type Recipient = { name: string; email: string };

type EmailMembersPanelProps = {
  orgSlug: string;
  orgName: string;
  accentColor: string;
};

export default function EmailMembersPanel({ orgSlug, orgName, accentColor }: EmailMembersPanelProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const endpoint = `/api/orgs/${encodeURIComponent(orgSlug)}/email-members`;

  async function loadRecipients(): Promise<Recipient[] | null> {
    setLoadingRecipients(true);
    setResult(null);
    try {
      const res = await fetch(endpoint);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not load recipients.");
      setRecipients(data.recipients);
      return data.recipients as Recipient[];
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "Could not load recipients." });
      return null;
    } finally {
      setLoadingRecipients(false);
    }
  }

  async function startSend() {
    if (!subject.trim() || !message.trim()) {
      setResult({ kind: "error", text: "Enter a subject and a message." });
      return;
    }
    const list = recipients ?? (await loadRecipients());
    if (!list) return;
    if (list.length === 0) {
      setResult({ kind: "error", text: "This organization has no members with an email address." });
      return;
    }
    setConfirming(true);
  }

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the email.");
      setResult({
        kind: "success",
        text: `Sent to ${data.sent} member${data.sent === 1 ? "" : "s"}.${data.failed ? ` ${data.failed} could not be sent.` : ""}`,
      });
      setSubject("");
      setMessage("");
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "Could not send the email." });
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div style={s.fieldGroup}>
        <label style={s.label} htmlFor="qa-email-subject">Subject</label>
        <input
          id="qa-email-subject"
          style={s.input}
          value={subject}
          maxLength={EMAIL_LIMITS.subjectMax}
          onChange={(e) => { setSubject(e.target.value); setConfirming(false); }}
          placeholder={`e.g. ${orgName} meeting this Thursday`}
        />
      </div>
      <div style={s.fieldGroup}>
        <label style={s.label} htmlFor="qa-email-message">Message</label>
        <textarea
          id="qa-email-message"
          rows={7}
          style={{ ...s.input, resize: "vertical" }}
          value={message}
          maxLength={EMAIL_LIMITS.messageMax}
          onChange={(e) => { setMessage(e.target.value); setConfirming(false); }}
          placeholder="e.g. Buy your tickets for our upcoming event!"
        />
        <p style={s.hint}>Each member gets their own copy, so no one sees other members' addresses. Replies go to you.</p>
      </div>

      {confirming && recipients ? (
        <div style={{ ...s.noticeMessage, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <span>Send this email to {recipients.length} member{recipients.length === 1 ? "" : "s"} of {orgName}?</span>
          <span style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setConfirming(false)} disabled={sending} style={s.secondaryButton}>Cancel</button>
            <button type="button" onClick={send} disabled={sending} style={s.primaryButton(accentColor, sending)}>
              {sending ? "Sending..." : "Yes, send"}
            </button>
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" onClick={loadRecipients} disabled={loadingRecipients} style={s.secondaryButton}>
            {loadingRecipients ? "Loading..." : "Preview recipients"}
          </button>
          <button type="button" onClick={startSend} disabled={loadingRecipients || sending} style={s.primaryButton(accentColor, loadingRecipients)}>
            Send email
          </button>
        </div>
      )}

      {recipients && !confirming && (
        <div style={s.card}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
            {recipients.length} {recipients.length === 1 ? "person" : "people"} would receive this email:
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", maxHeight: "160px", overflowY: "auto", fontSize: "13px", color: "#334155" }}>
            {recipients.map((r) => (
              <li key={r.email}>{r.name === r.email ? r.email : `${r.name} (${r.email})`}</li>
            ))}
          </ul>
        </div>
      )}

      {result && <div role="status" style={result.kind === "success" ? s.successMessage : s.errorMessage}>{result.text}</div>}
    </div>
  );
}
