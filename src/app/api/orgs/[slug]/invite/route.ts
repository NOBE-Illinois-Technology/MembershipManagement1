import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { createClient as createSessionClient } from "@/app/(NOBEDevOps)/utils/supabase/server";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const sessionClient = await createSessionClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError) {
      console.error("[POST /api/orgs/[slug]/invite] auth lookup failed:", authError.message);
      return fail("Could not verify your sign-in. Please try again.", 500);
    }
    if (!user) return fail("Sign in to create an invite link.", 401);

    const admin = createAdminClient();

    let orgId = Number(slug);
    if (!Number.isSafeInteger(orgId) || orgId < 1) {
      const { data: org, error: orgError } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (orgError) {
        console.error("[POST /api/orgs/[slug]/invite] org lookup failed:", orgError);
        return fail("Could not verify organization.", 500);
      }
      if (!org) return fail("Invalid organization.");
      orgId = org.id;
    }

    const { data: person, error: personError } = await admin
      .from("people")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (personError) {
      console.error("[POST /api/orgs/[slug]/invite] profile lookup failed:", personError);
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
      console.error("[POST /api/orgs/[slug]/invite] membership lookup failed:", membershipError);
      return fail("Could not verify your organization membership.", 500);
    }
    if (membership?.role !== "ADMIN") {
      return fail("Only organization admins can create invite links.", 403);
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { error: insertError } = await admin.from("org_invites").insert({
      org_id: orgId,
      token_hash: tokenHash,
      created_by: person.id,
    });

    if (insertError) {
      console.error("[POST /api/orgs/[slug]/invite] invite insert failed:", insertError);
      return fail("Could not create an invite link.", 500);
    }

    const inviteUrl = new URL(`/org-invite/${token}`, request.url).toString();
    return NextResponse.json({ inviteUrl, token }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orgs/[slug]/invite] request failed:", error);
    return fail("Could not create an invite link.", 500);
  }
}
