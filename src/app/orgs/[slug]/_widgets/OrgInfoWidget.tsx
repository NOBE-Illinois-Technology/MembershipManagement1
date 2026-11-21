"use client";

import { useState } from "react";
import Link from "next/link";
import type { Org } from "@/app/Layer3/orgs";
import type { OrgSettings } from "@/lib/orgSettings";

type OrgInfoWidgetProps = {
  org: Org;
  settings?: OrgSettings | null;
  accentColor?: string;
};

export default function OrgInfoWidget({ org, settings, accentColor = "#3B82F6" }: OrgInfoWidgetProps) {
  const [copied, setCopied] = useState(false);
  const primary = settings?.primary_color ?? org.primary_color ?? "#3B82F6";
  const secondary = settings?.secondary_color ?? org.secondary_color;
  const committees = settings?.committees ?? [];

  async function handleCopyInvite() {
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(org.slug)}/invite`, { method: "POST" });
      const data = await res.json();
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ display: "grid", gap: "12px", fontSize: "12px" }}>
      {/* Brand Identity */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "15px", color: "#0F172A" }}>{org.name}</div>
          <div style={{ color: "#64748B", fontSize: "11px" }}>Slug: {org.slug}</div>
        </div>
        <Link
          href={`/orgs/${org.slug}/settings`}
          style={{
            fontSize: "11px",
            color: accentColor,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Edit in Settings →
        </Link>
      </div>

      {/* Color Palette */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "6px" }}>
          Brand Colors
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                background: primary,
                border: "1px solid rgba(0,0,0,0.1)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "11px", color: "#334155", fontWeight: 600 }}>Primary: {primary}</span>
          </div>
          {secondary && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "4px",
                  background: secondary,
                  border: "1px solid rgba(0,0,0,0.1)",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "11px", color: "#334155", fontWeight: 600 }}>Secondary: {secondary}</span>
            </div>
          )}
        </div>
      </div>

      {/* Committees */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "6px" }}>
          Committees ({committees.length})
        </div>
        {committees.length === 0 ? (
          <div style={{ color: "#94A3B8", fontStyle: "italic" }}>No committees configured.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {committees.map((comm) => (
              <span
                key={comm.id ?? comm.name}
                style={{
                  padding: "3px 8px",
                  background: "#F1F5F9",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                {comm.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Invite Member Action */}
      <div style={{ paddingTop: "6px", borderTop: "1px solid #F1F5F9" }}>
        <button
          type="button"
          onClick={handleCopyInvite}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: copied ? "#059669" : "#F8FAFC",
            color: copied ? "white" : "#0F172A",
            border: `1px solid ${copied ? "#059669" : "#CBD5E1"}`,
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Invite link copied to clipboard" : "Generate and copy invite link"}
        </button>
      </div>
    </div>
  );
}
