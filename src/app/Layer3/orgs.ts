// Org shape for the Layer 3 canvas, matching the `organizations` table in Supabase.
// Columns: id (bigint identity), name, slug, logo_url, primary_color,
// allowed_email_domain, plan (default 'free'), status (default 'active'), created_at.

export type Org = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  // The signed-in user's role in this org, from `memberships`.
  role: "ADMIN" | "MEMBER";
};

// Shared by the API route and the create-org form so both agree on what's valid.
export const ORG_NAME_MIN = 2;
export const ORG_NAME_MAX = 60;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_ORG_COLOR = "#93E9BE";

export const ORG_COLOR_PRESETS = [
  "#93E9BE",
  "#E58A27",
  "#5B8DEF",
  "#9B6BDF",
  "#E2577A",
  "#3F7A53",
  "#D9A62E",
  "#1E2A38",
] as const;

// "Robotics Club" -> "robotics-club". The API route appends -2, -3, ... on collision.
export function slugifyOrgName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return slug || "org";
}

// NOBE still has its own app (admins and members get different home pages); every other org
// gets the generic /orgs/[slug] page. The portal login carries over, so no second sign-in.
export function orgHref(org: Pick<Org, "slug" | "role">) {
  if (org.slug === "nobe") return org.role === "ADMIN" ? "/users/admin" : "/users/member";
  return `/orgs/${org.slug}`;
}

// Two-letter badge fallback when an org has no logo.
export function orgInitials(name: string) {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(of|for|and|the)$/i.test(w));
  return words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
}
