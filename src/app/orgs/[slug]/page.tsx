import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserOrgs } from "../../Layer3/getUserOrgs";

export const dynamic = "force-dynamic";

// Placeholder landing page for non-NOBE orgs until each org has its own dashboard.
export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Only orgs you belong to: anyone else gets a 404, same as a slug that doesn't exist.
  const { orgs } = await getUserOrgs(`/orgs/${slug}`);
  const org = orgs.find((o) => o.slug === slug);
  if (!org) notFound();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: "16px",
      fontFamily: "Roboto, sans-serif",
      background: `linear-gradient(135deg, ${org.primary_color}55, #FBFBF9)`,
      position: "relative",
    }}>
      <h1 style={{ fontSize: "48px", margin: 0 }}>{org.name}</h1>
      <p style={{ fontSize: "20px", margin: 0 }}>Org dashboard coming soon.</p>

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
