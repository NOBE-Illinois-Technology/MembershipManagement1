import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { createClient as createSessionClient } from "@/app/(NOBEDevOps)/utils/supabase/server";
import { ensurePerson } from "@/lib/membership";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: "This invite link is invalid." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: invite, error: inviteError } = await admin
      .from("org_invites")
      .select("org_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) return NextResponse.json({ error: "This invite link is invalid." }, { status: 400 });
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This invitation has expired." }, { status: 400 });
    }

    const [{ data: org, error: orgError }, { data: committees, error: committeesError }] = await Promise.all([
      admin.from("organizations").select("id, name, slug").eq("id", invite.org_id).maybeSingle(),
      admin.from("committees").select("id, name").eq("org_id", invite.org_id).order("sort_order").order("name"),
    ]);
    if (orgError) throw orgError;
    if (committeesError) throw committeesError;
    if (!org) return NextResponse.json({ error: "This invite link is invalid." }, { status: 400 });

    return NextResponse.json({
      org: { id: org.id, name: org.name, slug: org.slug },
      committees: committees ?? [],
    });
  } catch (error) {
    console.error("[GET /api/org-invites/accept] request failed:", error);
    return NextResponse.json({ error: "Could not load this invitation." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const token = (body as { token?: unknown } | null)?.token;
  const committeeId = (body as { committee_id?: unknown } | null)?.committee_id;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: "This invite link is invalid." }, { status: 400 });
  }

  try {
    const sessionClient = await createSessionClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError) {
      console.error("[POST /api/org-invites/accept] auth lookup failed:", authError.message);
      return NextResponse.json({ error: "Could not verify your sign-in. Please try again." }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: "Sign in to accept this invite." }, { status: 401 });

    const admin = createAdminClient();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: invite, error: inviteLookupError } = await admin
      .from("org_invites")
      .select("org_id, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (inviteLookupError) throw inviteLookupError;
    if (!invite) return NextResponse.json({ error: "This invite link is invalid." }, { status: 400 });
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This invitation has expired." }, { status: 400 });
    }

    const { data: committees, error: committeesError } = await admin
      .from("committees")
      .select("id, name")
      .eq("org_id", invite.org_id);
    if (committeesError) throw committeesError;
    let selectedCommittee: { id: number; name: string } | null = null;
    if ((committees ?? []).length > 0) {
      const selectedId = typeof committeeId === "number" ? committeeId : Number(committeeId);
      selectedCommittee = (committees ?? []).find((committee) => committee.id === selectedId) ?? null;
      if (!selectedCommittee) {
        return NextResponse.json({ error: "Select a committee before joining." }, { status: 400 });
      }
    }

    let personId: number;
    try {
      personId = await ensurePerson(user);
    } catch (personError) {
      console.error("[POST /api/org-invites/accept] profile ensure failed:", personError);
      return NextResponse.json({ error: "Could not load your account profile." }, { status: 500 });
    }

    const { data, error } = await admin.rpc("accept_org_invite", {
      p_token_hash: tokenHash,
      p_person_id: personId,
    });

    if (error) {
      console.error("[POST /api/org-invites/accept] invite acceptance failed:", error);
      return NextResponse.json({ error: "Could not accept this invite. Please try again." }, { status: 500 });
    }

    const org = data?.[0];
    if (!org) {
      return NextResponse.json({ error: "This invite link is invalid." }, { status: 400 });
    }

    if (selectedCommittee) {
      const { error: membershipError } = await admin
        .from("memberships")
        .update({ committee_id: selectedCommittee.id })
        .eq("person_id", personId)
        .eq("org_id", org.org_id);
      if (membershipError) throw membershipError;
      const { error: personError } = await admin
        .from("people")
        .update({ committee: selectedCommittee.name })
        .eq("id", personId);
      if (personError) throw personError;
    }

    return NextResponse.json({ org });
  } catch (error) {
    console.error("[POST /api/org-invites/accept] request failed:", error);
    return NextResponse.json({ error: "Could not accept this invite. Please try again." }, { status: 500 });
  }
}
