import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
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

// Every org that exists, newest last. Despite the name this is not yet scoped to a viewer:
// there is no sign-in on this route and no memberships table, so there is no "my orgs" to
// filter down to. Once auth lands this joins memberships and takes the user id.
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

  const orgs = (data ?? []).map((row) => ({
    ...row,
    primary_color: row.primary_color ?? DEFAULT_ORG_COLOR,
  }));

  // Nothing created yet: show the demo clubs so the dashboard isn't a blank page. They are
  // only ever a stand-in for an empty table — a query that *failed* returns above, and a
  // single real org replaces them entirely, so they can never hide your own data.
  if (orgs.length === 0) {
    return { orgs: PLACEHOLDER_ORGS, isPlaceholder: true, error: null };
  }

  return { orgs, isPlaceholder: false, error: null };
}
