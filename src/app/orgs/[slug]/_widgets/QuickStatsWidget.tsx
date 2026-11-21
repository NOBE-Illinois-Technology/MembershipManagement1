"use client";

import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";
import type { OrgEventRow } from "@/lib/orgEvents";

type QuickStatsWidgetProps = {
  org: Org;
  settings?: OrgSettings | null;
  events?: OrgEventRow[];
  memberCount?: number;
  accentColor?: string;
};

export default function QuickStatsWidget({
  org,
  settings,
  events = [],
  memberCount = 4,
  accentColor = "#3B82F6",
}: QuickStatsWidgetProps) {
  const now = new Date();
  const upcomingEvents = events.filter((e) => {
    const d = new Date(e.date);
    return !Number.isNaN(d.getTime()) && d >= now;
  });

  const categories = settings?.categories ?? [];
  const pointsRequired = settings?.total_points_required ?? 0;
  const strikesEnabled = settings?.strikes_enabled ?? false;
  const maxStrikes = settings?.max_strikes ?? 3;

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      {/* 4 Key Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        <StatCard
          label="Total Members"
          value={String(memberCount)}
          subtext="Active in org"
          accentColor={accentColor}
        />
        <StatCard
          label="Upcoming Events"
          value={String(upcomingEvents.length)}
          subtext={`${events.length} total scheduled`}
          accentColor={accentColor}
        />
        <StatCard
          label="Point Minimum"
          value={pointsRequired > 0 ? `${pointsRequired} pts` : "None"}
          subtext={`${categories.length} categories`}
          accentColor={accentColor}
        />
        <StatCard
          label="Strikes System"
          value={strikesEnabled ? `Max: ${maxStrikes}` : "Off"}
          subtext={strikesEnabled ? "Enforced on absences" : "Disabled in settings"}
          accentColor={strikesEnabled ? "#DC2626" : "#64748B"}
        />
      </div>

      {/* Overview Status Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "#F8FAFC",
          borderRadius: "8px",
          border: "1px solid #E2E8F0",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10B981",
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 600, color: "#334155" }}>
            Org Status: Active ({org.role === "ADMIN" ? "Admin Mode" : "Member Mode"})
          </span>
        </div>
        <span style={{ color: "#64748B", fontSize: "11px" }}>
          {settings?.committees?.length ?? 0} committees configured
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  accentColor,
}: {
  label: string;
  value: string;
  subtext: string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        padding: "12px",
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderTop: `3px solid ${accentColor}`,
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: "#0F172A", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", color: "#64748B" }}>{subtext}</div>
    </div>
  );
}
