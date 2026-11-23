"use client";

import { useEffect, useState } from "react";
import type { AbsenceRequest } from "@/lib/orgAbsences";

type PendingAbsencesWidgetProps = {
  orgSlug: string;
  accentColor?: string;
  onOpenReview?: () => void;
};

export default function PendingAbsencesWidget({
  orgSlug,
  accentColor = "#3B82F6",
  onOpenReview,
}: PendingAbsencesWidgetProps) {
  const [requests, setRequests] = useState<AbsenceRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orgs/${encodeURIComponent(orgSlug)}/absences`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Could not load absence requests.");
        if (!cancelled) {
          setRequests(data.requests ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load absences.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  const pending = (requests ?? []).filter((r) => r.status === "PENDING");

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
        Loading absence requests...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "16px", background: "#FEF2F2", borderRadius: "8px", color: "#991B1B", fontSize: "12px" }}>
        {error}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div style={{ padding: "20px 16px", textAlign: "center", background: "#F0FDF4", borderRadius: "6px", border: "1px solid #BBF7D0" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534", marginBottom: "2px" }}>
          All Clear
        </div>
        <div style={{ fontSize: "12px", color: "#15803D" }}>
          No pending absence requests awaiting review.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>
          {pending.length} Pending {pending.length === 1 ? "Request" : "Requests"}
        </span>
        {onOpenReview && (
          <button
            type="button"
            onClick={onOpenReview}
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 700,
              background: accentColor,
              color: "white",
              border: 0,
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Review All
          </button>
        )}
      </div>

      <div style={{ display: "grid", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
        {pending.slice(0, 5).map((req) => (
          <div
            key={req.id}
            style={{
              padding: "10px 12px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, color: "#0F172A" }}>{req.memberName}</span>
              <span style={{ fontSize: "10px", color: "#64748B" }}>
                {req.eventDate ? new Date(req.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
              </span>
            </div>
            <div style={{ color: "#334155", fontWeight: 600, fontSize: "11px", margin: "2px 0 4px" }}>
              {req.eventName}
            </div>
            <div style={{ color: "#64748B", fontSize: "11px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              &quot;{req.reason}&quot;
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
