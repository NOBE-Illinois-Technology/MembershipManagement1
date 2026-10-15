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
  // No memberships table yet, so nothing can tell us the viewer's role in an org.
  // Populated once sign-in and memberships land.
  role?: "ADMIN" | "MEMBER";
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

// NOBE still has its own app; every other org gets the generic /orgs/[slug] page.
export function orgHref(org: Pick<Org, "slug">) {
  return org.slug === "nobe" ? "/users/login" : `/orgs/${org.slug}`;
}

// Two-letter badge fallback when an org has no logo.
export function orgInitials(name: string) {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(of|for|and|the)$/i.test(w));
  return words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
}

// Demo data shown when no org has been created yet, so the dashboard isn't a blank page.
// Stand-in for an empty table only: a failed query surfaces the error instead, and one real
// org replaces these entirely.
export const PLACEHOLDER_ORGS: Org[] = [
  {
    id: -1,
    name: "National Organization for Business and Engineering",
    slug: "nobe",
    logo_url: "/nobe_logo_f.svg",
    created_at: "2007-01-01",
    primary_color: "#E58A27",
    role: "ADMIN",
  },
  {
    id: -2,
    name: "Robotics Club",
    slug: "robotics",
    logo_url: null,
    created_at: "2015-08-20",
    primary_color: "#5B8DEF",
    role: "MEMBER",
  },
  {
    id: -3,
    name: "Consulting Club",
    slug: "consulting",
    logo_url: null,
    created_at: "2019-09-03",
    primary_color: "#9B6BDF",
    role: "MEMBER",
  },
  {
    id: -4,
    name: "Dance Team",
    slug: "dance",
    logo_url: null,
    created_at: "2012-01-15",
    primary_color: "#E2577A",
    role: "ADMIN",
  },
  {
    id: -5,
    name: "Volunteer Society",
    slug: "volunteer",
    logo_url: null,
    created_at: "2010-09-01",
    primary_color: "#3F7A53",
    role: "MEMBER",
  },
];
