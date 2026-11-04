"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";

export function CalendarWidget({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
  const [filter, setFilter] = useState<"all" | "mandatory">("all");
  const primaryColor = settings?.primary_color || org.primary_color || "#5b8def";

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B" }}>November 2026</span>
          <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "8px" }}>Event Schedule</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: filter === "all" ? primaryColor : "#F8FAFC",
              color: filter === "all" ? "#FFF" : "#475569",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            All Events
          </button>
          <button
            type="button"
            onClick={() => setFilter("mandatory")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: filter === "mandatory" ? primaryColor : "#F8FAFC",
              color: filter === "mandatory" ? "#FFF" : "#475569",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Mandatory
          </button>
        </div>
      </div>

      {/* Mini Calendar Month Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "16px" }}>
        {days.map((d) => (
          <span key={d} style={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8", padding: "4px 0" }}>{d}</span>
        ))}
        {daysInMonth.slice(0, 14).map((d) => {
          const isHighlighted = d === 5 || d === 12;
          return (
            <div
              key={d}
              style={{
                padding: "6px 0",
                fontSize: "12px",
                borderRadius: "6px",
                background: isHighlighted ? `${primaryColor}22` : "transparent",
                color: isHighlighted ? primaryColor : "#334155",
                fontWeight: isHighlighted ? 700 : 500,
                border: isHighlighted ? `1px solid ${primaryColor}` : "1px solid transparent",
              }}
            >
              {d}
            </div>
          );
        })}
      </div>

      {/* Event list - parameters left customizable per ticket #20 */}
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px", color: "#1E293B" }}>General Body Meeting #3</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Nov 5 • 6:30 PM • Main Hall</div>
          </div>
          <span style={{ fontSize: "11px", padding: "3px 8px", background: "#DCFCE7", color: "#166534", borderRadius: "999px", fontWeight: 600 }}>
            Mandatory
          </span>
        </div>

        <div style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px", color: "#1E293B" }}>Professional Networking Night</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Nov 12 • 7:00 PM • Room 204</div>
          </div>
          <span style={{ fontSize: "11px", padding: "3px 8px", background: "#E0E7FF", color: "#3730A3", borderRadius: "999px", fontWeight: 600 }}>
            Professional
          </span>
        </div>
      </div>
    </div>
  );
}

export function PointsWidget({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
  const [tab, setTab] = useState<"points" | "events">("points");
  const primaryColor = settings?.primary_color || org.primary_color || "#5b8def";

  const totalRequired = settings?.total_points_required ?? 10;
  const categories = settings?.categories ?? [];
  const currentTotal = 6;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setTab("points")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: tab === "points" ? primaryColor : "#F8FAFC",
              color: tab === "points" ? "#FFF" : "#475569",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Points Breakdown
          </button>
          <button
            type="button"
            onClick={() => setTab("events")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: tab === "events" ? primaryColor : "#F8FAFC",
              color: tab === "events" ? "#FFF" : "#475569",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Events Attended
          </button>
        </div>
        <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
          {totalRequired > 0 ? `${currentTotal} / ${totalRequired} pts` : `${currentTotal} pts`}
        </span>
      </div>

      {tab === "points" ? (
        <div>
          {/* Overall progress bar */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", color: "#475569" }}>
              <span>Total Progress</span>
              <span style={{ fontWeight: 600 }}>{totalRequired > 0 ? `${Math.round((currentTotal / totalRequired) * 100)}%` : "Active"}</span>
            </div>
            <div style={{ width: "100%", height: "8px", background: "#E2E8F0", borderRadius: "999px", overflow: "hidden" }}>
              <div
                style={{
                  width: totalRequired > 0 ? `${Math.min(100, (currentTotal / totalRequired) * 100)}%` : "60%",
                  height: "100%",
                  background: primaryColor,
                  borderRadius: "999px",
                }}
              />
            </div>
          </div>

          {/* Point categories driven by Nadia's settings */}
          <div style={{ display: "grid", gap: "10px" }}>
            {categories.length > 0 ? (
              categories.map((cat, idx) => {
                const sampleEarned = Math.min(cat.points_required, idx + 2);
                const pct = cat.points_required > 0 ? Math.min(100, Math.round((sampleEarned / cat.points_required) * 100)) : 100;
                return (
                  <div key={cat.id ?? cat.name} style={{ fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontWeight: 600, color: "#1E293B", display: "flex", alignItems: "center", gap: "6px" }}>
                        {cat.name}
                        {cat.is_mandatory && (
                          <span style={{ fontSize: "10px", padding: "1px 6px", background: "#FEE2E2", color: "#991B1B", borderRadius: "4px" }}>
                            Required
                          </span>
                        )}
                      </span>
                      <span style={{ color: "#64748B" }}>
                        {sampleEarned} / {cat.points_required} pts
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "#E2E8F0", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: primaryColor, borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "8px", border: "1px dashed #CBD5E1", fontSize: "12px", color: "#64748B" }}>
                <p style={{ margin: "0 0 6px 0", fontWeight: 600, color: "#334155" }}>Default Category Trackers</p>
                <div style={{ display: "grid", gap: "4px" }}>
                  <div>• Professional Points: 3 / 5 pts</div>
                  <div>• Service Points: 2 / 3 pts</div>
                  <div>• Social Points: 1 / 2 pts</div>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#94A3B8" }}>
                  Add customized point categories in{" "}
                  <Link href={`/orgs/${org.slug}/settings`} style={{ color: primaryColor, fontWeight: 600 }}>
                    Org Settings
                  </Link>.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ padding: "8px 10px", background: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "12px" }}>
            <div style={{ fontWeight: 600, color: "#1E293B" }}>Orientation & Welcome Social</div>
            <div style={{ color: "#64748B", fontSize: "11px" }}>+1 Social Point • Attended Oct 14</div>
          </div>
          <div style={{ padding: "8px 10px", background: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "12px" }}>
            <div style={{ fontWeight: 600, color: "#1E293B" }}>Resume Review Workshop</div>
            <div style={{ color: "#64748B", fontSize: "11px" }}>+2 Professional Points • Attended Oct 21</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileWidget({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
  const primaryColor = settings?.primary_color || org.primary_color || "#5b8def";
  const committees = settings?.committees ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${primaryColor}, #334155)`,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          SM
        </div>
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Srikriti Mutyala</h3>
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#64748B" }}>mutyalasrikriti2006@gmail.com</p>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "999px",
              background: org.role === "ADMIN" ? "#DCFCE7" : "#E2E8F0",
              color: org.role === "ADMIN" ? "#166534" : "#334155",
              fontWeight: 700,
            }}
          >
            {org.role === "ADMIN" ? "Admin" : "Active Member"}
          </span>
        </div>
      </div>

      <div style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ color: "#64748B" }}>Assigned Committee</span>
          <span style={{ fontWeight: 600, color: "#1E293B" }}>
            {committees.length > 0 ? committees[0].name : "Technology Committee"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#64748B" }}>Organization</span>
          <span style={{ fontWeight: 600, color: "#1E293B" }}>{org.name}</span>
        </div>
      </div>
    </div>
  );
}

export function StrikesWidget({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
  const enabled = settings?.strikes_enabled ?? false;
  const maxStrikes = settings?.max_strikes ?? 3;
  const currentStrikes = 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B" }}>Attendance Standing</span>
        <span
          style={{
            fontSize: "11px",
            padding: "3px 8px",
            borderRadius: "999px",
            fontWeight: 700,
            background: !enabled ? "#F1F5F9" : currentStrikes === 0 ? "#DCFCE7" : "#FEE2E2",
            color: !enabled ? "#64748B" : currentStrikes === 0 ? "#166534" : "#991B1B",
          }}
        >
          {!enabled ? "Strikes Disabled" : currentStrikes === 0 ? "Good Standing" : `${currentStrikes} Strike(s)`}
        </span>
      </div>

      {enabled ? (
        <div>
          {/* Visual Strike Meter */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {Array.from({ length: maxStrikes }, (_, i) => {
              const isViolated = i < currentStrikes;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "36px",
                    borderRadius: "8px",
                    border: isViolated ? "2px solid #EF4444" : "1px dashed #CBD5E1",
                    background: isViolated ? "#FEE2E2" : "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isViolated ? "#DC2626" : "#94A3B8",
                  }}
                >
                  {isViolated ? `✕ Strike ${i + 1}` : `Slot ${i + 1}`}
                </div>
              );
            })}
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
            {currentStrikes} of {maxStrikes} strikes recorded. {maxStrikes - currentStrikes} remaining before membership review.
          </p>
        </div>
      ) : (
        <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "8px", border: "1px dashed #CBD5E1", fontSize: "12px", color: "#64748B" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600, color: "#334155" }}>Strikes System Disabled</p>
          <p style={{ margin: "0 0 8px 0" }}>This organization currently does not penalize absences with strikes.</p>
          {org.role === "ADMIN" && (
            <Link href={`/orgs/${org.slug}/settings`} style={{ fontSize: "11px", color: org.primary_color, fontWeight: 700 }}>
              Enable strikes in Org Settings →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function QuickStatsWidget({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
  const primaryColor = settings?.primary_color || org.primary_color || "#5b8def";
  const numCategories = settings?.categories?.length ?? 0;
  const numCommittees = settings?.committees?.length ?? 0;

  const stats = [
    { label: "Active Members", value: "4", change: "+1 this week" },
    { label: "Upcoming Events", value: "2", change: "Next: Nov 5" },
    { label: "Point Categories", value: String(numCategories || 3), change: `${settings?.total_points_required ?? 0} pts required` },
    { label: "Committees", value: String(numCommittees || 1), change: "Active sub-teams" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
      {stats.map((s) => (
        <div key={s.label} style={{ padding: "12px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>{s.label}</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: primaryColor, margin: "4px 0" }}>{s.value}</div>
          <div style={{ fontSize: "11px", color: "#94A3B8" }}>{s.change}</div>
        </div>
      ))}
    </div>
  );
}

export function ManageMembersWidget({ org }: { org: Org }) {
  const members = [
    { name: "Risha Bansal", email: "rishab5@illinois.edu", role: "ADMIN" },
    { name: "Nadia Shastri", email: "nadiaks2@illinois.edu", role: "ADMIN" },
    { name: "Vinay Nair", email: "vinayn5@illinois.edu", role: "ADMIN" },
    { name: "Srikriti Mutyala", email: "mutyalasrikriti2006@gmail.com", role: "ADMIN" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>{members.length} Total Members</span>
        <Link
          href="/Layer3"
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#93E9BE",
            color: "#102319",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Invite Member
        </Link>
      </div>
      <div style={{ display: "grid", gap: "6px" }}>
        {members.map((m) => (
          <div
            key={m.email}
            style={{
              padding: "8px 10px",
              background: "#F8FAFC",
              borderRadius: "6px",
              border: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "12px", color: "#1E293B" }}>{m.name}</div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>{m.email}</div>
            </div>
            <span style={{ fontSize: "10px", padding: "2px 6px", background: "#E2E8F0", borderRadius: "4px", fontWeight: 600 }}>
              {m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PendingAbsencesWidget() {
  return (
    <div>
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ padding: "10px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600, fontSize: "13px", color: "#1E293B" }}>General Body Meeting #3</span>
            <span style={{ fontSize: "11px", color: "#EA580C", fontWeight: 600 }}>Pending Review</span>
          </div>
          <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#64748B" }}>
            Alex Chen • Midterm exam conflict scheduled during meeting.
          </p>
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "4px", background: "#10B981", color: "white", border: 0, fontWeight: 600, cursor: "pointer" }}>
              Approve
            </button>
            <button type="button" style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "4px", background: "#EF4444", color: "white", border: 0, fontWeight: 600, cursor: "pointer" }}>
              Deny
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrgInfoWidget({ org, settings }: { org: Org; settings?: OrgSettings | null }) {
  const primaryColor = settings?.primary_color || org.primary_color || "#5b8def";
  const secondaryColor = settings?.secondary_color || org.secondary_color;
  const committees = settings?.committees ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            background: primaryColor,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "18px",
          }}
        >
          {org.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>{org.name}</h3>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>/orgs/{org.slug}</p>
        </div>
      </div>

      <div style={{ padding: "10px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ color: "#64748B" }}>Color Palette:</span>
          <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: primaryColor, border: "1px solid #CBD5E1" }} title={`Primary: ${primaryColor}`} />
          {secondaryColor && (
            <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: secondaryColor, border: "1px solid #CBD5E1" }} title={`Secondary: ${secondaryColor}`} />
          )}
        </div>
        <div style={{ color: "#64748B", marginBottom: "8px" }}>
          Committees ({committees.length}):{" "}
          <strong style={{ color: "#334155" }}>
            {committees.length > 0 ? committees.map((c) => c.name).join(", ") : "General Body"}
          </strong>
        </div>
        <Link
          href={`/orgs/${org.slug}/settings`}
          style={{
            display: "inline-block",
            fontSize: "11px",
            color: primaryColor,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Configure in Org Settings →
        </Link>
      </div>
    </div>
  );
}
