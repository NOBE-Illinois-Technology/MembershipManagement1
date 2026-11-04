import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserOrgs } from "../../../Layer3/getUserOrgs";
import { loadOrgSettings } from "@/lib/orgSettingsStore";
import type { OrgSettings } from "@/lib/orgSettings";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

// Org settings. Admins only: members are sent back to the org's page.
export default async function OrgSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { orgs } = await getUserOrgs(`/orgs/${slug}/settings`);
  const org = orgs.find((o) => o.slug === slug);
  if (!org) notFound();
  if (org.role !== "ADMIN") redirect(`/orgs/${slug}`);

  let settings: OrgSettings | null = null;
  let error: string | null = null;
  try {
    settings = await loadOrgSettings(slug);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error.";
    console.error(`[settings page ${slug}]`, error);
  }

  if (!settings) {
    return (
      <div style={{ maxWidth: "720px", margin: "48px auto", padding: "0 16px", fontFamily: "Roboto, sans-serif" }}>
        <div role="alert" style={errorBoxStyle}>
          <strong style={{ display: "block", marginBottom: "4px" }}>Could not load settings</strong>
          {error}
        </div>
        <Link href={`/orgs/${slug}`} style={{ display: "inline-block", marginTop: "16px", color: "black" }}>
          Back to {org.name}
        </Link>
      </div>
    );
  }

  return <SettingsForm org={org} initial={settings} />;
}

const errorBoxStyle: React.CSSProperties = {
  padding: "16px 18px",
  fontSize: "15px",
  lineHeight: 1.5,
  color: "#9A3B31",
  background: "#FBEDEC",
  border: "1px solid #9A3B31",
  borderRadius: "10px",
};
