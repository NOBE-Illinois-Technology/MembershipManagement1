import { createClient } from "@/app/(NOBEDevOps)/utils/supabase/server";
import { PLACEHOLDER_ORGS, type Org } from "./orgs";

type MembershipRow = {
  role: Org["role"];
  organizations: Omit<Org, "role"> | null;
};

// Orgs the logged-in user belongs to, via memberships -> organizations.
// Falls back to placeholder data while those tables don't exist yet (or no one is logged in),
// so the canvas stays usable during development. RLS on memberships should limit rows to the user.
export async function getUserOrgs(): Promise<{ orgs: Org[]; isPlaceholder: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { orgs: PLACEHOLDER_ORGS, isPlaceholder: true };

  const { data, error } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, slug, logo_url, primary_color, created_at)")
    .eq("user_id", user.id)
    .returns<MembershipRow[]>();

  if (error) return { orgs: PLACEHOLDER_ORGS, isPlaceholder: true };

  const orgs = data
    .filter((m) => m.organizations)
    .map((m) => ({ ...m.organizations!, primary_color: m.organizations!.primary_color ?? "#93E9BE", role: m.role }));
  return { orgs, isPlaceholder: false };
}
