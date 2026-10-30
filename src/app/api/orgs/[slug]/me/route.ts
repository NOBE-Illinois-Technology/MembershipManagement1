import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { ensurePerson, getOrgRole, getSignedInUser } from "@/lib/membership";

// The signed-in user's profile and role in one org. Org pages (e.g. NOBE's AuthProvider) use this
// instead of reading `memberships` from the browser, so RLS on organizations can't hide the row.
//   200 { profile: { id, name, auth_id, role } }   401 not signed in   403 not a member
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const personId = await ensurePerson(user);
    const role = await getOrgRole(user.id, slug);
    if (!role) return NextResponse.json({ error: "Not a member of this organization." }, { status: 403 });

    const { data: person, error } = await createAdminClient()
      .from("people")
      .select("id, name, auth_id")
      .eq("id", personId)
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ profile: { ...person, role } });
  } catch (err) {
    console.error(`[GET /api/orgs/${slug}/me]`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error." }, { status: 500 });
  }
}
