// Org shape for the Layer 3 canvas, following the organizations + memberships schema in the project plan.

export type Org = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  role: "ADMIN" | "MEMBER";
};

// NOBE already has its own app; every other org gets the generic /orgs/[slug] page.
export function orgHref(org: Org) {
  return org.slug === "nobe" ? "/users/login" : `/orgs/${org.slug}`;
}

// Two-letter badge fallback when an org has no logo.
export function orgInitials(name: string) {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(of|for|and|the)$/i.test(w));
  return words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
}

// Placeholder data used until the organizations/memberships tables exist in Supabase.
export const PLACEHOLDER_ORGS: Org[] = [
  {
    id: "nobe",
    name: "National Organization for Business and Engineering",
    slug: "nobe",
    logo_url: "/nobe_logo_f.svg",
    created_at: "2007-01-01",
    primary_color: "#E58A27",
    role: "ADMIN",
  },
  {
    id: "robotics",
    name: "Robotics Club",
    slug: "robotics",
    logo_url: null,
    created_at: "2015-08-20",
    primary_color: "#5B8DEF",
    role: "MEMBER",
  },
  {
    id: "consulting",
    name: "Consulting Club",
    slug: "consulting",
    logo_url: null,
    created_at: "2019-09-03",
    primary_color: "#9B6BDF",
    role: "MEMBER",
  },
  {
    id: "dance",
    name: "Dance Team",
    slug: "dance",
    logo_url: null,
    created_at: "2012-01-15",
    primary_color: "#E2577A",
    role: "ADMIN",
  },
  {
    id: "volunteer",
    name: "Volunteer Society",
    slug: "volunteer",
    logo_url: null,
    created_at: "2010-09-01",
    primary_color: "#3F7A53",
    role: "MEMBER",
  },
];
