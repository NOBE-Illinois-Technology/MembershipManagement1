import { Resend } from "resend";

// Server-only. Sends org emails through Resend (RESEND_API_KEY + RESEND_FROM_EMAIL), the same
// setup the org invite emails use. One email per recipient so no one sees other addresses.

export type OrgEmail = { to: string; subject: string; text: string; replyTo?: string | null };

// Resend accepts at most 100 emails per batch request.
const BATCH_SIZE = 100;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const toHtml = (text: string) => `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`;

// Sends every email and reports how many went out. Never throws for a Resend failure, so callers
// that email as a side effect (strikes, absence reviews) still finish their main work.
export async function sendOrgEmails(emails: OrgEmail[]): Promise<{ sent: number; failed: number; error: string | null }> {
  if (emails.length === 0) return { sent: 0, failed: 0, error: null };
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { sent: 0, failed: emails.length, error: "Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL." };
  }

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const chunk = emails.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await resend.batch.send(
        chunk.map((e) => ({
          from,
          to: e.to,
          subject: e.subject,
          text: e.text,
          html: toHtml(e.text),
          ...(e.replyTo ? { replyTo: e.replyTo } : {}),
        }))
      );
      if (error) throw new Error(error.message);
      sent += chunk.length;
    } catch (err) {
      console.error("[sendOrgEmails] Resend batch failed:", err);
      lastError = err instanceof Error ? err.message : "Resend could not send the email.";
      failed += chunk.length;
    }
  }
  return { sent, failed, error: lastError };
}
