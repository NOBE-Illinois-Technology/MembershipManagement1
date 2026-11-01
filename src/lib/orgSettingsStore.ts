import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { DEFAULT_ORG_COLOR } from "@/app/Layer3/orgs";
import type { Committee, OrgSettings, PointCategory } from "@/lib/orgSettings";

// Server-only reads and writes of an org's settings. Uses the service-role client, which bypasses
// RLS, so callers must check membership (reads) or ADMIN role (writes) first.

type AdminClient = ReturnType<typeof createAdminClient>;

export const LOGO_BUCKET = "org-logos";

const SETTINGS_SELECT =
  "id, logo_url, primary_color, secondary_color, total_points_required, strikes_enabled, max_strikes";

type SettingsRow = {
  id: number;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  total_points_required: number | null;
  strikes_enabled: boolean | null;
  max_strikes: number | null;
};

async function findOrgRow(admin: AdminClient, slug: string): Promise<SettingsRow> {
  const { data, error } = await admin
    .from("organizations")
    .select(SETTINGS_SELECT)
    .eq("slug", slug)
    .returns<SettingsRow[]>()
    .maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}. Has the org settings migration been run?`);
  if (!data) throw new Error(`Organization "${slug}" does not exist.`);
  return data;
}

// Everything the settings page shows for one org.
export async function loadOrgSettings(slug: string): Promise<OrgSettings> {
  const admin = createAdminClient();
  const org = await findOrgRow(admin, slug);

  const [categories, committees] = await Promise.all([
    admin
      .from("point_categories")
      .select("id, name, points_required, is_mandatory")
      .eq("org_id", org.id)
      .order("sort_order")
      .order("id")
      .returns<PointCategory[]>(),
    admin
      .from("committees")
      .select("id, name")
      .eq("org_id", org.id)
      .order("sort_order")
      .order("id")
      .returns<Committee[]>(),
  ]);
  if (categories.error) throw new Error(`Could not load point categories: ${categories.error.message}`);
  if (committees.error) throw new Error(`Could not load committees: ${committees.error.message}`);

  return {
    logo_url: org.logo_url,
    primary_color: org.primary_color ?? DEFAULT_ORG_COLOR,
    secondary_color: org.secondary_color,
    total_points_required: org.total_points_required ?? 0,
    strikes_enabled: org.strikes_enabled ?? false,
    max_strikes: org.max_strikes,
    categories: categories.data ?? [],
    committees: committees.data ?? [],
  };
}

/**
 * Makes a list table (point_categories or committees) match `items` for one org: rows missing
 * from `items` are deleted, rows with an id are updated, and rows without one are inserted.
 * List order is kept in sort_order.
 */
async function syncList<T extends { id?: number }>(
  admin: AdminClient,
  table: "point_categories" | "committees",
  orgId: number,
  items: T[],
  toRow: (item: T) => Record<string, unknown>
) {
  const { data: existing, error } = await admin.from(table).select("id").eq("org_id", orgId).returns<{ id: number }[]>();
  if (error) throw new Error(`Could not save ${table}: ${error.message}`);

  const existingIds = new Set((existing ?? []).map((r) => r.id));
  // Ids from the client that aren't this org's rows are treated as new, so one org can never
  // touch another org's rows.
  const keepIds = items.flatMap((item) => (item.id && existingIds.has(item.id) ? [item.id] : []));
  const removed = [...existingIds].filter((id) => !keepIds.includes(id));

  if (removed.length) {
    const { error: deleteError } = await admin.from(table).delete().eq("org_id", orgId).in("id", removed);
    if (deleteError) throw new Error(`Could not save ${table}: ${deleteError.message}`);
  }

  const inserts: Record<string, unknown>[] = [];
  for (const [sort_order, item] of items.entries()) {
    const row = { ...toRow(item), sort_order };
    if (item.id && existingIds.has(item.id)) {
      const { error: updateError } = await admin.from(table).update(row).eq("org_id", orgId).eq("id", item.id);
      if (updateError) throw new Error(`Could not save ${table}: ${updateError.message}`);
    } else {
      inserts.push({ ...row, org_id: orgId });
    }
  }
  if (inserts.length) {
    const { error: insertError } = await admin.from(table).insert(inserts);
    if (insertError) throw new Error(`Could not save ${table}: ${insertError.message}`);
  }
}

// Saves validated settings (see parseSettingsInput). Leaves logo_url alone. Not atomic: if a step
// fails partway, earlier steps stay saved and the caller reports the error.
export async function saveOrgSettings(slug: string, settings: OrgSettings): Promise<OrgSettings> {
  const admin = createAdminClient();
  const org = await findOrgRow(admin, slug);

  const { error } = await admin
    .from("organizations")
    .update({
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      total_points_required: settings.total_points_required,
      strikes_enabled: settings.strikes_enabled,
      max_strikes: settings.max_strikes,
    })
    .eq("id", org.id);
  if (error) throw new Error(`Could not save settings: ${error.message}`);

  await syncList(admin, "point_categories", org.id, settings.categories, (c) => ({
    name: c.name,
    points_required: c.points_required,
    is_mandatory: c.is_mandatory,
  }));
  await syncList(admin, "committees", org.id, settings.committees, (c) => ({ name: c.name }));

  return loadOrgSettings(slug);
}

// The storage path of a logo we uploaded, or null for anything else (e.g. NOBE's /nobe_logo_f.svg).
function ownLogoPath(logoUrl: string | null) {
  const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
  const at = logoUrl?.indexOf(marker) ?? -1;
  return logoUrl && at >= 0 ? decodeURIComponent(logoUrl.slice(at + marker.length)) : null;
}

// Uploads a new logo, points the org at it, and removes the old uploaded file. Callers must check
// the file's type and size first. Returns the new public URL.
export async function replaceOrgLogo(slug: string, file: File): Promise<string> {
  const admin = createAdminClient();
  const org = await findOrgRow(admin, slug);

  const ext = file.type.split("/")[1] ?? "png";
  // A new name each time so browsers and CDNs never show a cached old logo.
  const path = `${org.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(`Could not upload logo: ${uploadError.message}`);

  const logoUrl = admin.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await admin.from("organizations").update({ logo_url: logoUrl }).eq("id", org.id);
  if (error) {
    await admin.storage.from(LOGO_BUCKET).remove([path]);
    throw new Error(`Could not save logo: ${error.message}`);
  }

  await removeOwnLogo(admin, org.logo_url);
  return logoUrl;
}

// Clears the org's logo, deleting the file if we uploaded it.
export async function clearOrgLogo(slug: string) {
  const admin = createAdminClient();
  const org = await findOrgRow(admin, slug);
  const { error } = await admin.from("organizations").update({ logo_url: null }).eq("id", org.id);
  if (error) throw new Error(`Could not remove logo: ${error.message}`);
  await removeOwnLogo(admin, org.logo_url);
}

// Best effort: a leftover file only wastes storage, so don't fail the request over it.
async function removeOwnLogo(admin: AdminClient, logoUrl: string | null) {
  const path = ownLogoPath(logoUrl);
  if (!path) return;
  const { error } = await admin.storage.from(LOGO_BUCKET).remove([path]);
  if (error) console.error("[org logo] could not delete old logo file:", error.message);
}
