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

  async function acceptInvite() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/org-invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not accept this invite.");
      router.replace("/Layer3");
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
          <button type="button" onClick={acceptInvite} disabled={submitting} style={buttonStyle}>
            {submitting ? "Joining…" : "Join organization"}
          </button>
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
