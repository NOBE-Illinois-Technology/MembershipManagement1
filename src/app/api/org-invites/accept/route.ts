import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { createClient as createSessionClient } from "@/app/(NOBEDevOps)/utils/supabase/server";
import { ensurePerson } from "@/lib/membership";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const token = (body as { token?: unknown } | null)?.token;
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
    let personId: number;
    try {
      personId = await ensurePerson(user);
    } catch (personError) {
      console.error("[POST /api/org-invites/accept] profile ensure failed:", personError);
      return NextResponse.json({ error: "Could not load your account profile." }, { status: 500 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
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

    return NextResponse.json({ org });
  } catch (error) {
    console.error("[POST /api/org-invites/accept] request failed:", error);
    return NextResponse.json({ error: "Could not accept this invite. Please try again." }, { status: 500 });
  }
}
