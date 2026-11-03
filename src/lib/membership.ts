import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { createClient } from "@/app/(NOBEDevOps)/utils/supabase/server";

// Portal-wide identity and org membership (see supabase/migrations/*_memberships_and_nobe_org.sql):
//
//   people       one row per person, linked to their login by auth_id
//   memberships  which orgs a person belongs to, and their role in each
//
// Server-only: everything here uses the service-role client, which bypasses RLS, so callers
// must already know who the signed-in user is (getSignedInUser) before acting for them.

export const NOBE_SLUG = "nobe";
export type OrgRole = "ADMIN" | "MEMBER";

const UNIQUE_VIOLATION = "23505";

type AdminClient = ReturnType<typeof createAdminClient>;

// The signed-in user from the request's Supabase cookies, or null.
export async function getSignedInUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

// ilike treats % and _ as wildcards, and emails can contain _, so match them literally.
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Email sign-up stores first_name/last_name; Google sign-in provides given_name/family_name/full_name.
function namesFor(user: User) {
  const meta = user.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const first = str(meta.first_name) || str(meta.given_name);
  const last = str(meta.last_name) || str(meta.family_name);
  const full =
    str(meta.full_name) || str(meta.name) || `${first} ${last}`.trim() || user.email?.split("@")[0] || "New member";
  return {
    first_name: first || full.split(" ")[0],
    last_name: last || full.split(" ").slice(1).join(" "),
    name: full,
  };
}

async function findPersonId(admin: AdminClient, authId: string): Promise<number | null> {
  const { data, error } = await admin.from("people").select("id").eq("auth_id", authId).maybeSingle();
  if (error) throw new Error(`Could not look up your profile: ${error.message}`);
  return data?.id ?? null;
}

async function findOrgId(admin: AdminClient, slug: string): Promise<number> {
  const { data, error } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Could not look up organization "${slug}": ${error.message}`);
  if (!data) throw new Error(`Organization "${slug}" does not exist. Has the memberships migration been run?`);
  return data.id;
}

// Adds someone to an org. Leaves an existing membership (and its role) untouched.
export async function joinOrg(admin: AdminClient, personId: number, orgId: number, role: OrgRole) {
  const { error } = await admin
    .from("memberships")
    .upsert({ person_id: personId, org_id: orgId, role }, { onConflict: "person_id,org_id", ignoreDuplicates: true });
  if (error) throw new Error(`Could not add membership: ${error.message}`);
}

/**
 * The people.id for a signed-in user, linking or creating the row on first sign-in:
 *   1. a row already linked to this login (most people, including rows the handle_new_user trigger made)
 *   2. an unlinked row with the same email, e.g. added by a NOBE admin before they ever signed in
 *   3. otherwise a new row built from the login's name and email
 *
 * This never adds anyone to an org: a new account belongs to no orgs until an org admin adds
 * them or they create an org themselves.
 */
export async function ensurePerson(user: User): Promise<number> {
  const admin = createAdminClient();
  const email = user.email?.trim().toLowerCase() ?? null;
  let personId = await findPersonId(admin, user.id);

  if (!personId && email) {
    const { data: unlinked, error } = await admin
      .from("people")
      .select("id")
      .is("auth_id", null)
      .ilike("illinois_email", escapeLike(email))
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Could not look up your profile: ${error.message}`);

    if (unlinked) {
      const { error: linkError } = await admin.from("people").update({ auth_id: user.id }).eq("id", unlinked.id);
      if (linkError) throw new Error(`Could not link your profile: ${linkError.message}`);
      personId = unlinked.id;
    }
  }

  if (!personId) {
    const { data: created, error } = await admin
      .from("people")
      .insert({ auth_id: user.id, illinois_email: email, role: "MEMBER", ...namesFor(user) })
      .select("id")
      .single();

    if (!error) {
      personId = created.id as number;
    } else if (error.code === UNIQUE_VIOLATION) {
      // Another request (or the handle_new_user trigger) created the row first; use that one.
      personId = await findPersonId(admin, user.id);
    } else {
      throw new Error(`Could not create your profile: ${error.message}`);
    }
    if (!personId) throw new Error("Could not create your profile.");
  }

  return personId;
}

// Adds the person linked to a login to an org (e.g. a NOBE admin inviting someone). Keeps any
// existing role. Callers must check permission first.
export async function addLoginToOrg(authId: string, slug: string, role: OrgRole = "MEMBER") {
  const admin = createAdminClient();
  const personId = await findPersonId(admin, authId);
  if (!personId) throw new Error("That person has no profile yet.");
  await joinOrg(admin, personId, await findOrgId(admin, slug), role);
}

// A login's role in an org, or null if they aren't a member.
export async function getOrgRole(authId: string, slug: string): Promise<OrgRole | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select("role, people!inner(auth_id), organizations!inner(slug)")
    .eq("people.auth_id", authId)
    .eq("organizations.slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Could not check your role: ${error.message}`);
  return (data?.role as OrgRole | undefined) ?? null;
}

// For server actions and routes that change org data: throws unless the caller is an ADMIN of the org.
export async function requireOrgAdmin(slug: string): Promise<User> {
  const user = await getSignedInUser();
  if (!user) throw new Error("You must be signed in.");
  if ((await getOrgRole(user.id, slug)) !== "ADMIN") {
    throw new Error("Only admins of this organization can do that.");
  }
  return user;
}

// Sets someone's role in an org, adding them to it if needed. Callers must check permission first.
// people.role is kept in step while NOBE pages still display it; memberships is the source of truth.
export async function setOrgRole(personId: number, slug: string, role: OrgRole) {
  const admin = createAdminClient();
  const orgId = await findOrgId(admin, slug);
  const { error } = await admin
    .from("memberships")
    .upsert({ person_id: personId, org_id: orgId, role }, { onConflict: "person_id,org_id" });
  if (error) throw new Error(`Could not update role: ${error.message}`);

  if (slug === NOBE_SLUG) {
    const { error: mirrorError } = await admin.from("people").update({ role }).eq("id", personId);
    if (mirrorError) throw new Error(`Could not update role: ${mirrorError.message}`);
  }
}
