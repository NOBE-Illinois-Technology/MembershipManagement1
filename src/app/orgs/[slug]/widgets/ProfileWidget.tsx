"use client";

type ProfileWidgetProps = {
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

export default function ProfileWidget({ accentColor = "#3B82F6" }: ProfileWidgetProps) {
  const initials = sampleProfile.name
    .split(" ")
    .map((part) => part[0])
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
          <div style={{ color: "#0F172A", fontSize: "16px", fontWeight: 800 }}>{sampleProfile.name}</div>
          <div style={{ color: "#64748B", fontSize: "12px", overflowWrap: "anywhere" }}>{sampleProfile.email}</div>
        </div>
      </div>

      <dl style={{ display: "grid", gap: "8px", margin: 0 }}>
        <ProfileField label="Year" value={sampleProfile.year} />
        <ProfileField label="College" value={sampleProfile.college} />
        <ProfileField label="Major" value={sampleProfile.major} />
        <ProfileField label="Committee" value={sampleProfile.committee} />
      </dl>

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
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px" }}>
      <dt style={{ color: "#64748B", flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, color: "#1E293B", fontWeight: 600, textAlign: "right" }}>{value}</dd>
    </div>
  );
}
