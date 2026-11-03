import { createHash } from "node:crypto";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { createClient as createSessionClient } from "@/app/(NOBEDevOps)/utils/supabase/server";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId: rawOrgId } = await params;
  const orgId = Number(rawOrgId);
  if (!Number.isSafeInteger(orgId) || orgId < 1) return fail("Invalid organization.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Request body must be JSON.");
  }

  const input = body as { email?: unknown; token?: unknown } | null;
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const token = input?.token;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return fail("Create a valid invite link before sending the email.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("[POST /api/orgs/[orgId]/invite/email] Resend is not configured.");
    return fail("Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.", 503);
  }

  try {
    const sessionClient = await createSessionClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError) {
      console.error("[POST /api/orgs/[orgId]/invite/email] auth lookup failed:", authError.message);
      return fail("Could not verify your sign-in. Please try again.", 500);
    }
    if (!user) return fail("Sign in to send an invite email.", 401);

    const admin = createAdminClient();
    const { data: person, error: personError } = await admin
      .from("people")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (personError) {
      console.error("[POST /api/orgs/[orgId]/invite/email] profile lookup failed:", personError);
      return fail("Could not verify your organization membership.", 500);
    }
    if (!person) return fail("Your account is not linked to an organization profile.", 403);

    const { data: membership, error: membershipError } = await admin
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("person_id", person.id)
      .maybeSingle();

    if (membershipError) {
      console.error("[POST /api/orgs/[orgId]/invite/email] membership lookup failed:", membershipError);
      return fail("Could not verify your organization membership.", 500);
    }
    if (membership?.role !== "ADMIN") return fail("Only organization admins can send invite emails.", 403);

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [{ data: invite, error: inviteError }, { data: org, error: orgError }] = await Promise.all([
      admin
        .from("org_invites")
        .select("id")
        .eq("org_id", orgId)
        .eq("token_hash", tokenHash)
        .maybeSingle(),
      admin
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .maybeSingle(),
    ]);

    if (inviteError || orgError) {
      console.error("[POST /api/orgs/[orgId]/invite/email] invite or organization lookup failed:", inviteError ?? orgError);
      return fail("Could not verify the invite link.", 500);
    }
    if (!invite || !org) return fail("Invite link not found for this organization.", 404);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const inviteUrl = new URL(`/org-invite/${token}`, siteUrl).toString();
    const safeOrgName = escapeHtml(org.name);
    const safeInviteUrl = escapeHtml(inviteUrl);
    const resend = new Resend(apiKey);
    const { error: sendError } = await resend.emails.send({
      from,
      to: email,
      subject: `You're invited to join ${org.name}`,
      text: `You've been invited to join ${org.name}. Sign in or create an account to accept this reusable invite: ${inviteUrl}`,
      html: `<p>You've been invited to join <strong>${safeOrgName}</strong>.</p><p><a href="${safeInviteUrl}">Accept the invitation</a></p><p>This invite link is reusable and does not expire. You'll need to sign in or create an account to join.</p>`,
    });

    if (sendError) {
      console.error("[POST /api/orgs/[orgId]/invite/email] Resend failed:", sendError);
      return fail("Resend could not send the invite email. Check the recipient and sender configuration.", 502);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/orgs/[orgId]/invite/email] request failed:", error);
    return fail("Could not send the invite email.", 500);
  }
}
