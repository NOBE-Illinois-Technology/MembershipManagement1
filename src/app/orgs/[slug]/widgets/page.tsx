import { notFound, redirect } from "next/navigation";
import { getUserOrgs } from "../../../Layer3/getUserOrgs";
import { loadOrgSettings } from "@/lib/orgSettingsStore";
import type { OrgSettings } from "@/lib/orgSettings";
import { getSignedInUser } from "@/lib/membership";
import { loadOrgDashboardData } from "@/lib/orgDashboardData";
import { EMPTY_DASHBOARD_DATA, type OrgDashboardData } from "@/lib/orgDashboard";
import WidgetCustomizer from "../_widgets/WidgetCustomizer";

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

  // Real org data so widgets look the same here as on the dashboard (admins only reach this page).
  let data: OrgDashboardData = EMPTY_DASHBOARD_DATA;
  try {
    data = await loadOrgDashboardData(org, (await getSignedInUser())?.id ?? null);
  } catch (err) {
    console.warn("[OrgWidgetsPage] could not load dashboard data:", err);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "48px 24px 120px",
        alignItems: "center",
        boxSizing: "border-box",
        fontFamily: "Roboto, sans-serif",
        background: `linear-gradient(135deg, ${org.primary_color}55, ${org.secondary_color ? `${org.secondary_color}55` : "#FBFBF9"})`,
      }}
    >
      <WidgetCustomizer org={org} settings={settings} data={data} />
    </div>
  );
}
