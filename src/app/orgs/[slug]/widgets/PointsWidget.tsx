"use client";

import type { OrgSettings, PointCategory } from "@/lib/orgSettings";

type PointsWidgetProps = {
  settings?: OrgSettings | null;
  // Points the member has earned, keyed by categoryKey(category). Empty until orgs track
  // per-member points, so every category shows 0 for now.
  earnedByCategory?: Record<string, number>;
  accentColor?: string;
};

// Saved categories are keyed by id so renaming one doesn't lose its points; unsaved ones by name.
export function categoryKey(category: PointCategory): string {
  return category.id != null ? String(category.id) : category.name;
}

export default function PointsWidget({ settings, earnedByCategory = {}, accentColor = "#3B82F6" }: PointsWidgetProps) {
  const categories = settings?.categories ?? [];
  const totalRequired = settings?.total_points_required ?? 0;
  const totalEarned = categories.reduce((sum, c) => sum + (earnedByCategory[categoryKey(c)] ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Total points */}
      <div style={totalCardStyle}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Total points
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "2px 0 8px" }}>
          <span style={{ fontSize: "32px", fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{totalEarned}</span>
          {totalRequired > 0 && (
            <span style={{ fontSize: "14px", color: "#64748B", fontWeight: 600 }}>/ {totalRequired} required</span>
          )}
        </div>
        {totalRequired > 0 ? (
          <>
            <ProgressBar value={totalEarned} max={totalRequired} color={accentColor} height={10} />
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "6px" }}>
              {totalEarned >= totalRequired
                ? "Requirement met"
                : `${totalRequired - totalEarned} more ${totalRequired - totalEarned === 1 ? "point" : "points"} needed`}
            </div>
          </>
        ) : (
          <div style={{ fontSize: "11px", color: "#64748B" }}>No overall point minimum</div>
        )}
      </div>

      {/* Per-category breakdown */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>By category</div>
        {categories.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#94A3B8" }}>
            This organization hasn&apos;t set up any point categories yet.
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "10px" }}>
            {categories.map((c) => {
              const earned = earnedByCategory[categoryKey(c)] ?? 0;
              const required = c.points_required;
              return (
                <li key={categoryKey(c)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      {c.is_mandatory && <span style={mandatoryTagStyle}>Mandatory</span>}
                    </span>
                    <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600, flexShrink: 0 }}>
                      {earned}
                      {required > 0 ? ` / ${required}` : ""} pts
                    </span>
                  </div>
                  {required > 0 && <ProgressBar value={earned} max={required} color={accentColor} height={6} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color, height }: { value: number; max: number; color: string; height: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{ height, background: "#E2E8F0", borderRadius: "999px", overflow: "hidden" }}
    >
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 0.3s ease" }} />
    </div>
  );
}

const totalCardStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "10px",
};

const mandatoryTagStyle: React.CSSProperties = {
  fontSize: "10px",
  padding: "1px 6px",
  background: "#FEE2E2",
  color: "#991B1B",
  borderRadius: "4px",
  fontWeight: 700,
  flexShrink: 0,
};
