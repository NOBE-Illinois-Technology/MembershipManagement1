import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserOrgs } from "../../Layer3/getUserOrgs";
import OrgViews from "./OrgViews";
import { loadOrgSettings } from "@/lib/orgSettingsStore";
import type { OrgSettings } from "@/lib/orgSettings";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { ORG_EVENT_COLUMNS, type OrgEventRow } from "@/lib/orgEvents";

export const dynamic = "force-dynamic";

// Placeholder landing page for non-NOBE orgs until each org has its own dashboard.
export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Only orgs you belong to: anyone else gets a 404, same as a slug that doesn't exist.
  const { orgs } = await getUserOrgs(`/orgs/${slug}`);
  const org = orgs.find((o) => o.slug === slug);
  if (!org) notFound();

  let settings: OrgSettings | null = null;
  try {
    settings = await loadOrgSettings(slug);
  } catch (err) {
    console.warn("[OrgPage] could not load org settings:", err);
  }

  // The org's own events (events.org_id). getUserOrgs above already confirmed the user is a member.
  // Empty if the org events migration hasn't been run yet.
  let events: OrgEventRow[] = [];
  const { data: eventRows, error: eventsError } = await createAdminClient()
    .from("events")
    .select(ORG_EVENT_COLUMNS)
    .eq("org_id", org.id)
    .order("date", { ascending: true });
  if (eventsError) console.warn("[OrgPage] could not load org events:", eventsError.message);
  else events = (eventRows ?? []) as OrgEventRow[];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      padding: "48px 24px 120px",
      alignItems: "center",
      gap: "16px",
      boxSizing: "border-box",
      fontFamily: "Roboto, sans-serif",
      // Primary fading into the secondary color (from the org's settings), or off-white if none is set.
      background: `linear-gradient(135deg, ${org.primary_color}55, ${org.secondary_color ? `${org.secondary_color}55` : "#FBFBF9"})`,
      position: "relative",
    }}>
      <OrgViews org={org} settings={settings} events={events} />

      <Link href="/Layer3" style={{
        ...pillStyle,
        position: "absolute",
        bottom: "30px",
        right: "30px",
      }}>
        Back to Orgs
      </Link>
    </div>
  );
}

const pillStyle = {
  display: "inline-block",
  padding: "14px 32px",
  background: "#93E9BE",
  color: "black",
  border: "2px solid black",
  borderRadius: "999px",
  textDecoration: "none",
  minWidth: "220px",
  textAlign: "center" as const,
};
