"use client";

import type { OrgViewer } from "@/lib/orgDashboard";

type ProfileWidgetProps = {
  // The signed-in viewer's membership in this org. Without it, example data is shown.
  profile?: OrgViewer | null;
  accentColor?: string;
};

const sampleProfile = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  year: "Junior",
  college: "Grainger College of Engineering",
  major: "Information Sciences",
  committee: "Technology",
  totalPoints: 7,
};

export default function ProfileWidget({ profile, accentColor = "#3B82F6" }: ProfileWidgetProps) {
  const isExample = !profile;
  const name = profile?.name ?? sampleProfile.name;
  const email = profile ? profile.email : sampleProfile.email;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          aria-hidden="true"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: `${accentColor}20`,
            color: accentColor,
            fontSize: "16px",
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#0F172A", fontSize: "16px", fontWeight: 800 }}>{name}</div>
          {email && <div style={{ color: "#64748B", fontSize: "12px", overflowWrap: "anywhere" }}>{email}</div>}
        </div>
      </div>

      <dl style={{ display: "grid", gap: "8px", margin: 0 }}>
        <ProfileField label="Year" value={profile ? profile.year : sampleProfile.year} />
        <ProfileField label="College" value={profile ? profile.college : sampleProfile.college} />
        <ProfileField label="Major" value={profile ? profile.major : sampleProfile.major} />
        <ProfileField label="Committee" value={profile ? profile.committee ?? "No committee" : sampleProfile.committee} />
        {profile && <ProfileField label="Role" value={profile.role === "ADMIN" ? "Admin" : "Member"} />}
      </dl>

      {isExample && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "9px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
            }}
          >
            <span style={{ color: "#475569", fontSize: "12px", fontWeight: 600 }}>Points earned</span>
            <span style={{ color: accentColor, fontSize: "14px", fontWeight: 800 }}>{sampleProfile.totalPoints} pts</span>
          </div>
          <p style={{ margin: 0, color: "#94A3B8", fontSize: "10px" }}>Example profile data</p>
        </>
      )}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px" }}>
      <dt style={{ color: "#64748B", flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, color: value ? "#1E293B" : "#94A3B8", fontWeight: 600, textAlign: "right" }}>
        {value || "Not set"}
      </dd>
    </div>
  );
}
