"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { orgHref, orgInitials, type Org } from "./orgs";

const ORDER_KEY = "layer3-org-order";

// Saved order first, then any orgs the user joined since it was saved.
function applyOrder(orgs: Org[], order: string[]) {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const saved = order.flatMap((id) => byId.get(id) ?? []);
  return [...saved, ...orgs.filter((o) => !order.includes(o.id))];
}

function readSavedOrder(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? "null");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Card order is only stored in this browser; the server render uses the default order.
const getSavedOrderRaw = () => {
  try {
    return localStorage.getItem(ORDER_KEY);
  } catch {
    return null;
  }
};
const noSubscribe = () => () => {};

export default function OrgDashboard({ orgs, isPlaceholder }: { orgs: Org[]; isPlaceholder: boolean }) {
  const savedOrderRaw = useSyncExternalStore(noSubscribe, getSavedOrderRaw, () => null);
  const [order, setOrder] = useState<string[] | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Close an open card menu on any outside click.
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuFor]);

  const sorted = applyOrder(orgs, order ?? (savedOrderRaw ? readSavedOrder() : []));

  function saveOrder(ids: string[]) {
    setOrder(ids);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
    } catch {}
  }

  function move(id: string, toIndex: number) {
    const ids = sorted.map((o) => o.id).filter((x) => x !== id);
    ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, id);
    saveOrder(ids);
  }

  return (
    <div style={pageStyle}>
      <nav style={railStyle} aria-label="Main">
        <div style={railLogoStyle}>M</div>
        <RailItem href="/Layer3" label="Dashboard" icon={<DashboardIcon />} active />
        <RailItem href="/Layer1" label="Layer 1" icon={<HomeIcon />} />
        <RailItem href="/Layer2" label="Layer 2" icon={<TableIcon />} />
        <RailItem href="/PortalLoginPage" label="Log out" icon={<BackIcon />} />
      </nav>

      <main style={mainStyle}>
        <header style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: "40px", fontWeight: 700 }}>Dashboard</h1>
          {isPlaceholder && (
            <span style={noticeStyle}>Sample orgs: no memberships table yet, or you are not logged in.</span>
          )}
        </header>

        {sorted.length === 0 ? (
          <div style={{ padding: "48px 0", color: "#555" }}>
            <h2 style={{ margin: "0 0 8px", color: "black" }}>You are not in any orgs yet</h2>
            Use a join link from your org to get started.
          </div>
        ) : (
          <div style={gridStyle}>
            {sorted.map((org, i) => (
              <div
                key={org.id}
                draggable
                onDragStart={(e) => {
                  setDraggingId(org.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId && draggingId !== org.id) move(draggingId, i);
                }}
                onDragEnd={() => setDraggingId(null)}
                style={{ ...cardStyle, opacity: draggingId === org.id ? 0.4 : 1 }}
              >
                <Link href={orgHref(org)} draggable={false} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ ...bannerStyle, background: org.logo_url ? "#F5F5F5" : org.primary_color }}>
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt={`${org.name} logo`} draggable={false} style={logoStyle} />
                    ) : (
                      <span style={initialsStyle}>{orgInitials(org.name)}</span>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px 6px" }}>
                    <div style={{ ...titleStyle, color: org.primary_color }} title={org.name}>{org.name}</div>
                    <div style={subtitleStyle}>/orgs/{org.slug}</div>
                    <div style={metaStyle}>Since {new Date(org.created_at).getUTCFullYear()}</div>
                  </div>
                </Link>

                <div style={{ padding: "4px 16px 14px" }}>
                  <span style={{ ...rolePillStyle, borderColor: org.primary_color, color: org.primary_color }}>
                    {org.role === "ADMIN" ? "Admin" : "Member"}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label={`Options for ${org.name}`}
                  aria-expanded={menuFor === org.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor(menuFor === org.id ? null : org.id);
                  }}
                  style={{ ...kebabStyle, background: org.logo_url ? org.primary_color : "transparent" }}
                >
                  <KebabIcon />
                </button>

                {menuFor === org.id && (
                  <div style={menuStyle} role="menu" onClick={(e) => e.stopPropagation()}>
                    <Link href={orgHref(org)} role="menuitem" style={menuItemStyle}>Open</Link>
                    <MenuButton disabled={i === 0} onClick={() => { move(org.id, 0); setMenuFor(null); }}>Move to top</MenuButton>
                    <MenuButton disabled={i === 0} onClick={() => { move(org.id, i - 1); setMenuFor(null); }}>Move left</MenuButton>
                    <MenuButton disabled={i === sorted.length - 1} onClick={() => { move(org.id, i + 1); setMenuFor(null); }}>Move right</MenuButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RailItem({ href, label, icon, active = false }: { href: string; label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        ...railItemStyle,
        background: active ? "white" : "transparent",
        color: active ? RAIL_BG : "white",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MenuButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick} style={{ ...menuItemStyle, opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}

const iconProps = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const DashboardIcon = () => (
  <svg {...iconProps}><path d="M4 16a8 8 0 1 1 16 0" /><path d="M12 16l4-5" /><path d="M3 20h18" /></svg>
);
const HomeIcon = () => (
  <svg {...iconProps}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
);
const TableIcon = () => (
  <svg {...iconProps}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10" /></svg>
);
const BackIcon = () => (
  <svg {...iconProps}><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></svg>
);
const KebabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
);

const RAIL_BG = "#1E2A38";

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  fontFamily: "Roboto, sans-serif",
  background: "white",
  color: "black",
};

const railStyle: React.CSSProperties = {
  width: "88px",
  flexShrink: 0,
  background: RAIL_BG,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  position: "sticky",
  top: 0,
  height: "100vh",
};

const railLogoStyle: React.CSSProperties = {
  margin: "16px auto 20px",
  width: "52px",
  height: "52px",
  borderRadius: "12px",
  background: "#93E9BE",
  color: RAIL_BG,
  fontWeight: 800,
  fontSize: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const railItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: "12px 4px",
  fontSize: "13px",
  textAlign: "center",
  textDecoration: "none",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "24px clamp(16px, 4vw, 48px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: "8px 20px",
  paddingBottom: "16px",
  marginBottom: "32px",
  borderBottom: "1px solid #C7CDD1",
};

const noticeStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#8a4b00",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
  gap: "32px",
  maxWidth: "1200px",
};

const cardStyle: React.CSSProperties = {
  position: "relative",
  background: "white",
  borderRadius: "4px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
  overflow: "visible",
  cursor: "grab",
};

const bannerStyle: React.CSSProperties = {
  height: "146px",
  borderRadius: "4px 4px 0 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const logoStyle: React.CSSProperties = {
  maxWidth: "70%",
  maxHeight: "75%",
  objectFit: "contain",
};

const initialsStyle: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 800,
  letterSpacing: "2px",
  color: "rgba(255,255,255,0.85)",
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "16px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "15px",
  color: "#2D3B45",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const metaStyle: React.CSSProperties = {
  marginTop: "2px",
  fontSize: "13px",
  color: "#6B7780",
};

const rolePillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  border: "1.5px solid",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
};

const kebabStyle: React.CSSProperties = {
  position: "absolute",
  top: "10px",
  right: "10px",
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "50px",
  right: "10px",
  zIndex: 10,
  minWidth: "150px",
  display: "flex",
  flexDirection: "column",
  padding: "6px 0",
  background: "white",
  border: "1px solid #C7CDD1",
  borderRadius: "4px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

const menuItemStyle: React.CSSProperties = {
  padding: "8px 14px",
  font: "inherit",
  fontSize: "14px",
  textAlign: "left",
  color: "#2D3B45",
  background: "none",
  border: "none",
  textDecoration: "none",
  cursor: "pointer",
};
