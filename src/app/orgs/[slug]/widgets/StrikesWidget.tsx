"use client";

import type { OrgSettings } from "@/lib/orgSettings";

type StrikesWidgetProps = {
  settings?: OrgSettings | null;
  accentColor?: string;
};

const sampleStrikes = [
  {
    reason: "Missed a mandatory meeting",
    type: "Attendance",
    source: "Organization event",
    issued: "October 14, 2026",
  },
];

export default function StrikesWidget({ settings, accentColor = "#3B82F6" }: StrikesWidgetProps) {
  if (!settings?.strikes_enabled) {
    return (
      <div style={disabledStyle}>
        Strikes are not enabled for this organization.
      </div>
    );
  }

  const limit = settings.max_strikes ?? 3;
  const activeCount = Math.min(sampleStrikes.length, limit);
  const progress = Math.min(100, Math.round((activeCount / limit) * 100));

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div
        style={{
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #FECACA",
          background: "#FFF7F7",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
          <span style={{ color: "#7F1D1D", fontSize: "12px", fontWeight: 700 }}>Active strikes</span>
          <span style={{ color: "#B91C1C", fontSize: "20px", fontWeight: 800 }}>
            {activeCount}<span style={{ fontSize: "13px", color: "#7F1D1D" }}> / {limit}</span>
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Active strikes"
          aria-valuenow={activeCount}
          aria-valuemin={0}
          aria-valuemax={limit}
          style={{ height: "7px", marginTop: "8px", borderRadius: "999px", background: "#FEE2E2", overflow: "hidden" }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: "999px",
              background: progress >= 100 ? "#B91C1C" : accentColor,
            }}
          />
        </div>
        <div style={{ marginTop: "6px", color: "#7F1D1D", fontSize: "11px" }}>
          {activeCount >= limit ? "Strike limit reached" : `${limit - activeCount} remaining before the limit`}
        </div>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {sampleStrikes.slice(0, activeCount).map((strike, index) => (
          <article
            key={`${strike.reason}-${index}`}
            style={{
              padding: "10px 12px",
              borderLeft: "3px solid #DC2626",
              borderRadius: "8px",
              background: "#F8FAFC",
            }}
          >
            <div style={{ color: "#1E293B", fontSize: "12px", fontWeight: 700 }}>{strike.reason}</div>
            <div style={{ display: "grid", gap: "3px", marginTop: "5px", color: "#64748B", fontSize: "11px" }}>
              <span>{strike.type} · {strike.source}</span>
              <time>{strike.issued}</time>
            </div>
          </article>
        ))}
      </div>

      <p style={{ margin: 0, color: "#94A3B8", fontSize: "10px" }}>Example strike data</p>
    </div>
  );
}

const disabledStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: "9px",
  background: "#F8FAFC",
  border: "1px dashed #CBD5E1",
  color: "#64748B",
  fontSize: "12px",
  textAlign: "center",
};
