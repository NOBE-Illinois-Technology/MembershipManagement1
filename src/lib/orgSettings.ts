import { HEX_COLOR } from "@/app/Layer3/orgs";

// An org's settings (ticket #15), as stored in Supabase (see supabase/migrations/*_org_settings.sql):
//
//   organizations     logo_url, primary_color, secondary_color, total_points_required,
//                     strikes_enabled, max_strikes
//   point_categories  the org's point types, each with its own requirement
//   committees        the org's committees
//
// Shared by the settings form and the API route so both agree on what's valid. Safe to import
// from client components: nothing here touches Supabase.

export type PointCategory = {
  // Missing for a category that hasn't been saved yet.
  id?: number;
  name: string;
  points_required: number;
  is_mandatory: boolean;
};

export type Committee = {
  id?: number;
  name: string;
};

export type OrgSettings = {
  // Changed through the logo upload route, not by saving the form.
  logo_url: string | null;
  primary_color: string;
  secondary_color: string | null;
  // 0 = no overall requirement.
  total_points_required: number;
  strikes_enabled: boolean;
  max_strikes: number | null;
  categories: PointCategory[];
  committees: Committee[];
};

export const LIMITS = {
  pointsMax: 10000,
  maxStrikesMax: 50,
  categoryNameMax: 40,
  committeeNameMax: 60,
  listMax: 100,
  logoBytesMax: 2 * 1024 * 1024,
} as const;

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const cleanName = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const isWhole = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const savedId = (v: unknown) => (isWhole(v, 1, Number.MAX_SAFE_INTEGER) ? v : undefined);

/**
 * Validates a settings form submission. Everything except logo_url comes from the request; the
 * returned settings are only meaningful when `errors` is empty. `logo_url` is passed through
 * from the current settings because the form never changes it.
 */
export function parseSettingsInput(input: unknown, logoUrl: string | null): { settings: OrgSettings; errors: string[] } {
  const errors: string[] = [];
  const raw = obj(input);

  const primary = typeof raw.primary_color === "string" ? raw.primary_color.trim() : "";
  if (!HEX_COLOR.test(primary)) errors.push("Primary color must be a hex value like #93E9BE.");

  const secondaryRaw = typeof raw.secondary_color === "string" ? raw.secondary_color.trim() : "";
  if (secondaryRaw && !HEX_COLOR.test(secondaryRaw)) errors.push("Secondary color must be a hex value like #1E2A38.");

  if (!isWhole(raw.total_points_required, 0, LIMITS.pointsMax)) {
    errors.push(`Total points must be a whole number from 0 to ${LIMITS.pointsMax}.`);
  }

  const strikesEnabled = raw.strikes_enabled === true;
  let maxStrikes: number | null = null;
  if (strikesEnabled) {
    if (isWhole(raw.max_strikes, 1, LIMITS.maxStrikesMax)) maxStrikes = raw.max_strikes;
    else errors.push(`Strike limit must be a whole number from 1 to ${LIMITS.maxStrikesMax}.`);
  }

  const rawCategories = Array.isArray(raw.categories) ? raw.categories : [];
  const rawCommittees = Array.isArray(raw.committees) ? raw.committees : [];
  if (rawCategories.length > LIMITS.listMax) errors.push(`You can have at most ${LIMITS.listMax} point categories.`);
  if (rawCommittees.length > LIMITS.listMax) errors.push(`You can have at most ${LIMITS.listMax} committees.`);

  const categories: PointCategory[] = rawCategories.slice(0, LIMITS.listMax).map((item) => {
    const c = obj(item);
    const points = isWhole(c.points_required, 0, LIMITS.pointsMax) ? c.points_required : 0;
    if (!isWhole(c.points_required, 0, LIMITS.pointsMax)) {
      errors.push(`Points required for "${cleanName(c.name) || "a category"}" must be 0 to ${LIMITS.pointsMax}.`);
    }
    return { id: savedId(c.id), name: cleanName(c.name), points_required: points, is_mandatory: c.is_mandatory === true };
  });
  const committees: Committee[] = rawCommittees.slice(0, LIMITS.listMax).map((item) => {
    const c = obj(item);
    return { id: savedId(c.id), name: cleanName(c.name) };
  });

  errors.push(...nameErrors(categories.map((c) => c.name), "point category", LIMITS.categoryNameMax));
  errors.push(...nameErrors(committees.map((c) => c.name), "committee", LIMITS.committeeNameMax));

  return {
    settings: {
      logo_url: logoUrl,
      primary_color: primary.toLowerCase(),
      secondary_color: secondaryRaw ? secondaryRaw.toLowerCase() : null,
      total_points_required: isWhole(raw.total_points_required, 0, LIMITS.pointsMax) ? raw.total_points_required : 0,
      strikes_enabled: strikesEnabled,
      max_strikes: maxStrikes,
      categories,
      committees,
    },
    errors,
  };
}

// Blank, too-long, and duplicate names in one list. Also used by the form to show problems live.
export function nameErrors(names: string[], noun: string, max: number): string[] {
  const errors: string[] = [];
  const cleaned = names.map((n) => cleanName(n));
  if (cleaned.some((n) => !n)) errors.push(`Every ${noun} needs a name.`);
  if (cleaned.some((n) => n.length > max)) errors.push(`Each ${noun} name must be ${max} characters or fewer.`);
  const lower = cleaned.filter(Boolean).map((n) => n.toLowerCase());
  const dupes = [...new Set(lower.filter((n, i) => lower.indexOf(n) !== i))];
  if (dupes.length) errors.push(`Two ${noun === "committee" ? "committees" : `${noun}s`} are named "${cleaned.find((n) => n.toLowerCase() === dupes[0])}".`);
  return errors;
}
