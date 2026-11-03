"use client";

import { useState } from "react";
import type { Org } from "@/app/Layer3/orgs";

type View = "admin" | "member";

export default function OrgViews({ org }: { org: Org }) {
  const isAdmin = org.role === "ADMIN";
  const [view, setView] = useState<View>(isAdmin ? "admin" : "member");

  return (
    <div style={{ width: "100%", maxWidth: "960px" }}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: "40px" }}>{org.name}</h1>

        {/* Only admins get the toggle */}
        {isAdmin && (
          <div role="tablist" aria-label="Page view" style={toggleStyle}>
            <ToggleButton active={view === "admin"} onClick={() => setView("admin")}>
              Admin
            </ToggleButton>
            <ToggleButton active={view === "member"} onClick={() => setView("member")}>
              Member preview
            </ToggleButton>
          </div>
        )}
      </header>

      {view === "admin" ? <AdminView /> : <MemberView org={org} preview={isAdmin} />}
    </div>
  );
}

/* ---------- Admin placeholder ---------- */
function AdminView() {
  return (
    <>
      <div style={gridStyle}>
        <Card title="Members">—</Card>
        <Card title="Upcoming events">—</Card>
        <Card title="Pending absences">—</Card>
      </div>
      <Card title="Manage members">Invite people, change roles, remove members. (Coming soon)</Card>
      <Card title="Events">Create events and track attendance. (Coming soon)</Card>
      <Card title="Settings">Points, strikes, logo, and colors. (Coming soon)</Card>
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

const toggleStyle: React.CSSProperties = {
  marginLeft: "auto",
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