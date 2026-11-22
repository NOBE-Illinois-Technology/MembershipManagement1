"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/(NOBEDevOps)/utils/supabase/client";

export default function InviteAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committees, setCommittees] = useState<Array<{ id: number; name: string }>>([]);
  const [committeeId, setCommitteeId] = useState<number | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const nextPath = `/org-invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    let active = true;
    createClient().auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError) {
        console.error("[OrgInvite] could not check sign-in:", authError.message);
        setError("Could not verify your sign-in. Refresh the page to try again.");
      } else {
        setSignedIn(Boolean(data.user));
      }
      setChecking(false);
    }).catch((authError: unknown) => {
      if (!active) return;
      console.error("[OrgInvite] sign-in check failed:", authError);
      setError("Could not verify your sign-in. Refresh the page to try again.");
      setChecking(false);
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/org-invites/accept?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load this invitation.");
        if (!active) return;
        setOrgName(result.org.name);
        setCommittees(result.committees ?? []);
      })
      .catch((inviteError: unknown) => {
        if (!active) return;
        setError(inviteError instanceof Error ? inviteError.message : "Could not load this invitation.");
      });
    return () => { active = false; };
  }, [token]);

  async function acceptInvite() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/org-invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, committee_id: committeeId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not accept this invite.");
      router.replace(result.org.slug === "nobe"
        ? "/users/member"
        : `/orgs/${encodeURIComponent(result.org.slug)}`);
      router.refresh();
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Could not accept this invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={headingStyle}>Organization invitation</h1>
        <p style={textStyle}>
          {checking ? "Checking your sign-in…" : "Accept this invitation to join the organization."}
        </p>
        {error && <p role="alert" style={errorStyle}>{error}</p>}
        {!checking && signedIn && (
          <>
            {orgName && <p style={{ ...textStyle, marginTop: 0 }}>Join {orgName}</p>}
            {committees.length > 0 && (
              <label style={{ display: "grid", gap: "8px", marginBottom: "16px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                Select your committee
                <select
                  value={committeeId ?? ""}
                  onChange={(event) => setCommitteeId(event.target.value ? Number(event.target.value) : null)}
                  required
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #CBD5E1", font: "inherit" }}
                >
                  <option value="">Choose a committee</option>
                  {committees.map((committee) => (
                    <option key={committee.id} value={committee.id}>{committee.name}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={acceptInvite}
              disabled={submitting || (committees.length > 0 && committeeId === null)}
              style={{ ...buttonStyle, opacity: submitting || (committees.length > 0 && committeeId === null) ? 0.6 : 1 }}
            >
              {submitting ? "Joining…" : "Join organization"}
            </button>
          </>
        )}
        {!checking && !signedIn && (
          <div style={{ display: "grid", gap: "12px" }}>
            <Link href={`/PortalLoginPage?next=${encodeURIComponent(nextPath)}`} style={buttonStyle}>
              Sign in to accept
            </Link>
            <Link href={`/PortalLoginPage/create-account?next=${encodeURIComponent(nextPath)}`} style={textLinkStyle}>
              Create an account
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: "linear-gradient(135deg, #93E9BE, #FBFBF9)",
  fontFamily: "Roboto, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "min(100%, 440px)",
  padding: "36px",
  border: "1px solid rgba(0, 0, 0, 0.12)",
  borderRadius: "18px",
  textAlign: "center",
  background: "white",
  boxShadow: "0 12px 36px rgba(0, 0, 0, 0.12)",
};

const headingStyle: React.CSSProperties = { margin: 0, color: "#202a24", fontSize: "1.8rem" };
const textStyle: React.CSSProperties = { margin: "14px 0 24px", color: "#5d6861" };
const buttonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "13px 18px",
  border: 0,
  borderRadius: "8px",
  color: "#102319",
  background: "#93E9BE",
  font: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
};
const textLinkStyle: React.CSSProperties = { color: "#246b46", fontWeight: 700, textDecoration: "none" };
const errorStyle: React.CSSProperties = {
  margin: "0 0 18px",
  padding: "12px",
  borderRadius: "8px",
  color: "#8b2525",
  background: "#fff0f0",
};
