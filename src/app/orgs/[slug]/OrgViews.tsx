"use client";

import { useState } from "react";
import Link from "next/link";
import type { Org } from "@/app/Layer3/orgs";

type View = "admin" | "member";

export default function OrgViews({ org }: { org: Org }) {
  const isAdmin = org.role === "ADMIN";
  const [view, setView] = useState<View>(isAdmin ? "admin" : "member");

  return (
    <div style={{ width: "100%", maxWidth: "960px" }}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: "40px" }}>{org.name}</h1>

        {/* Only admins get the toggle and settings */}
        {isAdmin && (
          <div style={headerActionsStyle}>
            <div role="tablist" aria-label="Page view" style={toggleStyle}>
              <ToggleButton active={view === "admin"} onClick={() => setView("admin")}>
                Admin
              </ToggleButton>
              <ToggleButton active={view === "member"} onClick={() => setView("member")}>
                Member preview
              </ToggleButton>
            </div>
            <Link href={`/orgs/${org.slug}/settings`} style={settingsButtonStyle}>
              <GearIcon />
              Settings
            </Link>
          </div>
        )}
      </header>

      {view === "admin" ? <AdminView org={org} /> : <MemberView org={org} preview={isAdmin} />}
    </div>
  );
}

/* ---------- Admin placeholder ---------- */
function AdminView({ org }: { org: Org }) {
  return (
    <>
      <div style={gridStyle}>
        <Card title="Members">—</Card>
        <Card title="Upcoming events">—</Card>
        <Card title="Pending absences">—</Card>
      </div>
      <Card title="Manage members">Invite people, change roles, remove members. (Coming soon)</Card>
      <Card title="Events">Create events and track attendance. (Coming soon)</Card>
      <Card title="Settings">
        Logo, colors, points, strikes, and committees.{" "}
        <Link href={`/orgs/${org.slug}/settings`} style={{ color: "black", fontWeight: 600 }}>
          Open settings
        </Link>
      </Card>
    </>
  );
}

/* ---------- Member placeholder ---------- */
function MemberView({ org, preview }: { org: Org; preview: boolean }) {
  return (
    <>
      {preview && (
        <div style={bannerStyle}>
          Previewing what members of <strong>{org.name}</strong> see.
        </div>
      )}
      <div style={gridStyle}>
        <Card title="Your points">— / —</Card>
        <Card title="Strikes">—</Card>
        <Card title="Next event">—</Card>
      </div>
      <Card title="Upcoming events">No events yet.</Card>
      <button type="button" disabled style={disabledButtonStyle}>
        Request an absence
      </button>
    </>
  );
}

/* ---------- Small pieces ---------- */
function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        ...toggleButtonStyle,
        background: active ? "black" : "transparent",
        color: active ? "white" : "black",
      }}
    >
      {children}
    </button>
  );
}

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={cardStyle}>
      <h2 style={{ margin: "0 0 8px", fontSize: "16px" }}>{title}</h2>
      <div style={{ color: "#555" }}>{children}</div>
    </section>
  );
}

/* ---------- Styles ---------- */
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
  marginBottom: "24px",
};

const headerActionsStyle: React.CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
};

const settingsButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 18px",
  fontWeight: 600,
  color: "black",
  background: "white",
  border: "2px solid black",
  borderRadius: "999px",
  textDecoration: "none",
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  border: "2px solid black",
  borderRadius: "999px",
  overflow: "hidden",
  background: "white",
};

const toggleButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  border: "none",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
  marginBottom: "16px",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #C7CDD1",
  borderRadius: "10px",
  padding: "16px 18px",
  marginBottom: "16px",
};

const bannerStyle: React.CSSProperties = {
  padding: "10px 14px",
  marginBottom: "16px",
  background: "#FFF6E0",
  border: "1px solid #D9A62E",
  borderRadius: "8px",
};

const disabledButtonStyle: React.CSSProperties = {
  padding: "12px 24px",
  border: "2px solid black",
  borderRadius: "999px",
  background: "white",
  font: "inherit",
  opacity: 0.5,
  cursor: "not-allowed",
};