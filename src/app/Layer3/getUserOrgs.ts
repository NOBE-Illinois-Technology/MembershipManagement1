import { redirect } from "next/navigation";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { ensurePerson, getSignedInUser, type OrgRole } from "@/lib/membership";
import { DEFAULT_ORG_COLOR, type Org } from "./orgs";

// Every column the org cards need. Shared with the create-org route so a new org
// comes back in exactly the shape the dashboard renders.
export const ORG_SELECT = "id, name, slug, logo_url, primary_color, created_at";

export type OrgsResult = {
  orgs: Org[];
  error: string | null;
};

type MembershipRow = {
  role: OrgRole;
  organizations: (Omit<Org, "primary_color" | "role"> & { primary_color: string | null }) | null;
};

// The signed-in user's orgs and their role in each, oldest org first. Signed-out visitors are
// sent to the portal login, which brings them back to `returnTo` afterwards.
export async function getUserOrgs(returnTo = "/Layer3"): Promise<OrgsResult> {
  const user = await getSignedInUser();
  if (!user) redirect(`/PortalLoginPage?next=${encodeURIComponent(returnTo)}`);

  try {
    const personId = await ensurePerson(user);
    const { data, error } = await createAdminClient()
      .from("memberships")
      .select(`role, organizations(${ORG_SELECT})`)
      .eq("person_id", personId)
      .returns<MembershipRow[]>();
    if (error) throw new Error(error.message);

    const orgs = (data ?? [])
      .flatMap(({ role, organizations: org }) =>
        org ? [{ ...org, primary_color: org.primary_color ?? DEFAULT_ORG_COLOR, role }] : []
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { orgs, error: null };
  } catch (err) {
    // Surface the failure instead of rendering an empty dashboard that looks like "no orgs".
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[getUserOrgs] could not load organizations:", message);
    return { orgs: [], error: message };
  }
}
