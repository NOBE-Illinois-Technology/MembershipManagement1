import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getOrgMembers, HttpError, requireOrgAdminContext } from "@/lib/orgAdminData";
import { isEmailConfigured, sendOrgEmails } from "@/lib/orgEmail";
import { EMAIL_LIMITS } from "@/lib/quickActions";

// Email Members quick action (org admin dashboard). Recipients are this org's members only.
//
//   GET   preview: { recipients: [{ name, email }] }
//   POST  { subject, message } -> { sent, failed }
//
// Both require the caller to be an ADMIN of the org.

type Params = { params: Promise<{ slug: string }> };

async function recipientsFor(slug: string) {
  const ctx = await requireOrgAdminContext(slug);
  // One entry per email address; members without an email are skipped.
  const byEmail = new Map<string, { name: string; email: string }>();
  for (const m of await getOrgMembers(ctx.admin, ctx.org.id)) {
    if (m.email && !byEmail.has(m.email)) byEmail.set(m.email, { name: m.name, email: m.email });
  }
  const recipients = [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { ctx, recipients };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const { recipients } = await recipientsFor(slug);
    return NextResponse.json({ recipients });
  } catch (err) {
    return errorResponse(err, `GET /api/orgs/${slug}/email-members`);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  try {
    const { ctx, recipients } = await recipientsFor(slug);

    const input = ((await request.json().catch(() => null)) ?? {}) as { subject?: unknown; message?: unknown };
    const subject = typeof input.subject === "string" ? input.subject.trim() : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!subject) throw new HttpError(400, "Enter a subject.");
    if (subject.length > EMAIL_LIMITS.subjectMax) throw new HttpError(400, `Subject must be ${EMAIL_LIMITS.subjectMax} characters or fewer.`);
    if (!message) throw new HttpError(400, "Enter a message.");
    if (message.length > EMAIL_LIMITS.messageMax) throw new HttpError(400, `Message must be ${EMAIL_LIMITS.messageMax} characters or fewer.`);
    if (!isEmailConfigured()) throw new HttpError(503, "Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
    if (recipients.length === 0) throw new HttpError(400, "This organization has no members with an email address.");

    // Replies go to the admin who sent it.
    const result = await sendOrgEmails(
      recipients.map((r) => ({
        to: r.email,
        subject,
        text: `${message}\n\n— Sent to members of ${ctx.org.name}.`,
        replyTo: ctx.user.email,
      }))
    );
    if (result.sent === 0) throw new HttpError(502, result.error ?? "Resend could not send the email.");
    return NextResponse.json({ sent: result.sent, failed: result.failed });
  } catch (err) {
    return errorResponse(err, `POST /api/orgs/${slug}/email-members`);
  }
}
