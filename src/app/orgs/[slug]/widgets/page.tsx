import { notFound, redirect } from "next/navigation";
import { getUserOrgs } from "../../../Layer3/getUserOrgs";
import { loadOrgSettings } from "@/lib/orgSettingsStore";
import type { OrgSettings } from "@/lib/orgSettings";
import { createAdminClient } from "@/app/(NOBEDevOps)/utils/supabase/admin";
import { ORG_EVENT_COLUMNS, type OrgEventRow } from "@/lib/orgEvents";
import WidgetCustomizer from "./WidgetCustomizer";

export const dynamic = "force-dynamic";

// Dedicated widget layout customization studio for administrators.
export default async function OrgWidgetsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { orgs } = await getUserOrgs(`/orgs/${slug}/widgets`);
  const org = orgs.find((o) => o.slug === slug);
  if (!org) notFound();

  // Customization is admin-only; redirect members back to their org view.
  if (org.role !== "ADMIN") {
    redirect(`/orgs/${slug}`);
  }

  let settings: OrgSettings | null = null;
  try {
    settings = await loadOrgSettings(slug);
  } catch (err) {
    console.warn("[OrgWidgetsPage] could not load org settings:", err);
  }

  let events: OrgEventRow[] = [];
  const { data: eventRows, error: eventsError } = await createAdminClient()
    .from("events")
    .select(ORG_EVENT_COLUMNS)
    .eq("org_id", org.id)
    .order("date", { ascending: true });
  if (eventsError) console.warn("[OrgWidgetsPage] could not load org events:", eventsError.message);
  else events = (eventRows ?? []) as OrgEventRow[];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "36px 20px 80px",
        alignItems: "center",
        boxSizing: "border-box",
        fontFamily: "Roboto, sans-serif",
        background: `linear-gradient(135deg, ${org.primary_color}44, ${org.secondary_color ? `${org.secondary_color}44` : "#F8FAFC"})`,
      }}
    >
      <WidgetCustomizer org={org} settings={settings} events={events} />
    </div>
  );
}
