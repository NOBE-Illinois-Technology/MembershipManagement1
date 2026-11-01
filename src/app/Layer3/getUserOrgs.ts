import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { createClient as createSessionClient } from "@/app/(NOBEDevOps)/utils/supabase/server";
import { DEFAULT_ORG_COLOR, PLACEHOLDER_ORGS, type Org } from "./orgs";

// Every column the org cards need. Shared with the create-org route so a new org
// comes back in exactly the shape the dashboard renders.
export const ORG_SELECT = "id, name, slug, logo_url, primary_color, created_at";

export type OrgsResult = {
  orgs: Org[];
  isPlaceholder: boolean;
  error: string | null;
};

type OrgRow = Omit<Org, "primary_color" | "role"> & { primary_color: string | null };

// The dashboard shows all organizations, but only members get a role and can invite others.
export async function getUserOrgs(): Promise<OrgsResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(ORG_SELECT)
    .order("created_at", { ascending: true })
    .returns<OrgRow[]>();

  // Surface the failure instead of falling back to demo data: a silent fallback here
  // would make a broken query look like an empty dashboard.
  if (error) {
    console.error("[getUserOrgs] could not load organizations:", error.message);
    return { orgs: [], isPlaceholder: false, error: error.message };
  }

  const orgs: Org[] = (data ?? []).map((row) => ({
    ...row,
    primary_color: row.primary_color ?? DEFAULT_ORG_COLOR,
  }));

  const sessionClient = await createSessionClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError) {
    console.error("[getUserOrgs] could not check signed-in user:", authError.message);
    return { orgs: [], isPlaceholder: false, error: authError.message };
  }

  if (user) {
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (personError) {
      console.error("[getUserOrgs] could not load user profile:", personError.message);
      return { orgs: [], isPlaceholder: false, error: personError.message };
    }

    if (person) {
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("org_id, role")
        .eq("person_id", person.id)
        .returns<{ org_id: number; role: "ADMIN" | "MEMBER" }[]>();

      if (membershipError) {
        console.error("[getUserOrgs] could not load memberships:", membershipError.message);
        return { orgs: [], isPlaceholder: false, error: membershipError.message };
      }

      const roles = new Map((memberships ?? []).map(({ org_id, role }) => [org_id, role]));
      for (const org of orgs) org.role = roles.get(org.id);
    }
  }

  // Nothing created yet: show the demo clubs so the dashboard isn't a blank page. They are
  // only ever a stand-in for an empty table — a query that *failed* returns above, and a
  // single real org replaces them entirely, so they can never hide your own data.
  if (orgs.length === 0) {
    return { orgs: PLACEHOLDER_ORGS, isPlaceholder: true, error: null };
  }

  return { orgs, isPlaceholder: false, error: null };
}
