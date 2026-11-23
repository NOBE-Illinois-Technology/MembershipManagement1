"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CSSProperties, ReactNode } from "react";
import AttendanceSummary, { type AttendanceCategory } from "./AttendanceSummary";

/* ------------------------------------------------------------------ */
/* Types — generic so any org can map its data into them.              */
/* ------------------------------------------------------------------ */

export type MMMember = {
    id: string | number;
    name: string | null;
    email: string | null;
    role: string | null;
    committee?: string | null;
    major?: string | null;
    year?: string | null;
    college?: string | null;
    totalPoints?: number | null;
    activeStrikes?: number | null;
    joinedAt?: string | null;
    isActive?: boolean; // false = deactivated
};

export type MMEvent = {
    id: string;
    name: string | null;
    date: string | null;
    eventType?: string | null;
    category?: string | null;    // must match a category name from org settings
    isMandatory?: boolean | null;
};

export type MMAttendance = {
    memberId: string | number; // must match MMMember.id
    eventId: string;
    checkedInAt?: string | null;
};

export type MMAbsence = {
    memberId: string | number;
    eventId: string | null;
    status: string | null; // APPROVED / EXCUSED / PENDING / REJECTED ...
};

type MemberManagementWidgetProps = {
    members: MMMember[];
    events: MMEvent[];
    attendance: MMAttendance[];
    absences?: MMAbsence[];
    categories?: AttendanceCategory[];
    // The org's committee names (from Settings). When there are any, the registry gets a
    // filter per committee; without committees the filter isn't shown.
    committees?: string[];
    orgName?: string;
    accentColor?: string; // defaults to the Report Card amber
    roleOptions?: string[];
    onChangeRole: (memberId: MMMember["id"], newRole: string) => Promise<void>;
    onDeactivate: (memberId: MMMember["id"]) => Promise<void>;
};

// Committee filter keys: a committee's name, or one of these.
const ALL_COMMITTEES = "__all__";
const NO_COMMITTEE = "__none__";

// The committee filter a member falls under: their committee if it's one of the org's current
// committees, otherwise "No committee".
function committeeKey(committee: string | null | undefined, committees: string[]) {
    return committee && committees.includes(committee) ? committee : NO_COMMITTEE;
}

const EXCUSED = new Set(["APPROVED", "EXCUSED", "ACCEPTED", "CLEARED"]);

export default function MemberManagementWidget({
    members,
    events,
    attendance,
    absences = [],
    categories = [],
    committees = [],
    orgName = "Club",
    accentColor = "#F59E0B",
    roleOptions = ["MEMBER", "ADMIN"],
    onChangeRole,
    onDeactivate,
}: MemberManagementWidgetProps) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");
    const [committeeFilter, setCommitteeFilter] = useState<string>(ALL_COMMITTEES);
    const [selectedId, setSelectedId] = useState<MMMember["id"] | null>(null);
    const [pendingRole, setPendingRole] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    /* ---------- left side: search + role filter ---------- */

    const roleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        members.forEach((m) => {
            const r = normRole(m.role);
            counts[r] = (counts[r] ?? 0) + 1;
        });
        return counts;
    }, [members]);

    const filteredMembers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return members.filter((m) => {
            if (roleFilter !== "ALL" && normRole(m.role) !== roleFilter) return false;
            if (committeeFilter !== ALL_COMMITTEES && committeeKey(m.committee, committees) !== committeeFilter) return false;
            if (!q) return true;
            return (
                (m.name ?? "").toLowerCase().includes(q) ||
                (m.email ?? "").toLowerCase().includes(q) ||
                (m.committee ?? "").toLowerCase().includes(q)
            );
        });
    }, [members, search, roleFilter, committeeFilter, committees]);

    // Members per committee (plus members with no committee, or one no longer in Settings).
    const committeeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        members.forEach((m) => {
            const key = committeeKey(m.committee, committees);
            counts[key] = (counts[key] ?? 0) + 1;
        });
        return counts;
    }, [members, committees]);

    useEffect(() => {
        if (filteredMembers.length === 0) {
            setSelectedId(null);
            return;
        }
        if (selectedId === null || !filteredMembers.some((m) => m.id === selectedId)) {
            setSelectedId(filteredMembers[0].id);
        }
    }, [filteredMembers, selectedId]);

    const selected = useMemo(
        () => members.find((m) => m.id === selectedId) ?? null,
        [members, selectedId]
    );

    useEffect(() => {
        setPendingRole(selected ? normRole(selected.role) : "");
        setError(null);
    }, [selected]);

    /* ---------- right side: attendance history ---------- */

    const history = useMemo(() => {
        if (!selected) return [];
        const now = Date.now();

        const attended = new Map(
            attendance
                .filter((a) => a.memberId === selected.id)
                .map((a) => [a.eventId, a.checkedInAt ?? null] as const)
        );
        const excused = new Set(
            absences
                .filter((a) => a.memberId === selected.id && EXCUSED.has((a.status ?? "").trim().toUpperCase()))
                .map((a) => a.eventId)
        );

        return events
            .filter((e) => {
                const d = parseDate(e.date);
                return d !== null && d.getTime() <= now;
            })
            .sort((a, b) => parseDate(b.date)!.getTime() - parseDate(a.date)!.getTime())
            .map((event) => {
                const status: Status = attended.has(event.id)
                    ? "attended"
                    : excused.has(event.id)
                    ? "excused"
                    : "missed";
                return { event, status, checkinTime: attended.get(event.id) ?? null };
            });
    }, [selected, events, attendance, absences]);

    const attendedCount = history.filter((h) => h.status === "attended").length;
    const attendanceRate = history.length ? Math.round((attendedCount / history.length) * 100) : null;

    /* ---------- actions ---------- */

    function handleChangeRole() {
        if (!selected || !pendingRole || pendingRole === normRole(selected.role)) return;
        if (!window.confirm(`Change ${selected.name}'s role to ${pendingRole}?`)) return;
        setError(null);
        startTransition(async () => {
            try {
                await onChangeRole(selected.id, pendingRole);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to change role.");
            }
        });
    }

    function handleDeactivate() {
        if (!selected) return;
        if (!window.confirm(`Deactivate ${selected.name}? They will lose access to ${orgName}'s portal.`)) return;
        setError(null);
        startTransition(async () => {
            try {
                await onDeactivate(selected.id);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to deactivate member.");
            }
        });
    }

    const isDeactivated = selected?.isActive === false;
    const roleChanged = !!selected && pendingRole !== normRole(selected.role);

    /* ---------- render ---------- */

    return (
        <div className="mmw" style={{ "--mmw-accent": accentColor } as CSSProperties}>
            <style>{CSS}</style>

            <div className="mmw-grid">
                {/* ================= LEFT: MEMBER REGISTRY ================= */}
                <aside className="mmw-box">
                    <div className="mmw-box-head">
                        <div>
                            <h3 className="mmw-h3">Member Registry</h3>
                            <p className="mmw-sub">
                                {filteredMembers.length} of {members.length} members
                            </p>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="Search members..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mmw-search"
                    />

                    <div className="mmw-chips">
                        <FilterChip label="All" count={members.length} active={roleFilter === "ALL"} onClick={() => setRoleFilter("ALL")} />
                        {Object.entries(roleCounts).map(([role, count]) => (
                            <FilterChip
                                key={role}
                                label={titleCase(role)}
                                count={count}
                                active={roleFilter === role}
                                onClick={() => setRoleFilter(role)}
                            />
                        ))}
                    </div>

                    {committees.length > 0 && (
                        <div className="mmw-chips" role="group" aria-label="Filter by committee">
                            <span className="mmw-chips-label">Committee</span>
                            <FilterChip
                                label="All committees"
                                count={members.length}
                                active={committeeFilter === ALL_COMMITTEES}
                                onClick={() => setCommitteeFilter(ALL_COMMITTEES)}
                            />
                            {committees.map((name) => (
                                <FilterChip
                                    key={name}
                                    label={name}
                                    count={committeeCounts[name] ?? 0}
                                    active={committeeFilter === name}
                                    onClick={() => setCommitteeFilter(name)}
                                />
                            ))}
                            {(committeeCounts[NO_COMMITTEE] ?? 0) > 0 && (
                                <FilterChip
                                    label="No committee"
                                    count={committeeCounts[NO_COMMITTEE]}
                                    active={committeeFilter === NO_COMMITTEE}
                                    onClick={() => setCommitteeFilter(NO_COMMITTEE)}
                                />
                            )}
                        </div>
                    )}

                    <div className="mmw-list">
                        {filteredMembers.length === 0 ? (
                            <p className="mmw-empty">No matching members found.</p>
                        ) : (
                            filteredMembers.map((m) => {
                                const strikes = m.activeStrikes ?? 0;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setSelectedId(m.id)}
                                        className="mmw-member"
                                        data-selected={m.id === selectedId}
                                        data-off={m.isActive === false}
                                    >
                                        <div className="mmw-row">
                                            <span className="mmw-name">{m.name ?? "Unnamed"}</span>
                                            {m.totalPoints != null && <span className="mmw-pts">{m.totalPoints} pts</span>}
                                        </div>
                                        <div className="mmw-badges">
                                            <RoleBadge role={m.role} />
                                            {m.committee && <span className="mmw-badge mmw-badge-committee">{m.committee}</span>}
                                            {m.isActive === false && <span className="mmw-badge mmw-badge-off">Deactivated</span>}
                                        </div>
                                        <div className="mmw-row mmw-row-center">
                                            <span className="mmw-email">{m.email}</span>
                                            {strikes > 0 && (
                                                <span className="mmw-strike">
                                                    {strikes} {strikes === 1 ? "Strike" : "Strikes"}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* ================= RIGHT: MEMBER DETAIL ================= */}
                {selected ? (
                    <div className="mmw-detail">
                        {error && <div className="mmw-error">Action failed: {error}</div>}

                        {/* ---- Basic info ---- */}
                        <section className="mmw-box">
                            <div className="mmw-profile">
                                <div className="mmw-identity">
                                    <div className="mmw-avatar">{selected.name?.charAt(0) || "?"}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="mmw-title-row">
                                            <h2 className="mmw-h2">{selected.name}</h2>
                                            <RoleBadge role={selected.role} />
                                        </div>
                                        <p className="mmw-meta">
                                            {[selected.major, formatYear(selected.year), selected.college].filter(Boolean).join(" · ") ||
                                                "No academic info"}
                                        </p>
                                        <p className="mmw-meta2">
                                            {selected.email}
                                            {selected.committee ? ` · Committee: ${selected.committee}` : ""}
                                        </p>
                                    </div>
                                </div>

                                <div className="mmw-pills">
                                    <Pill>
                                        {selected.activeStrikes ?? 0} Strike{(selected.activeStrikes ?? 0) === 1 ? "" : "s"}
                                    </Pill>
                                    <Pill muted={isDeactivated}>{isDeactivated ? "Deactivated" : "Active"}</Pill>
                                    {selected.totalPoints != null && <Pill>{selected.totalPoints} pts</Pill>}
                                    {selected.joinedAt && (
                                        <Pill muted>
                                            Joined{" "}
                                            {parseDate(selected.joinedAt)?.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                        </Pill>
                                    )}
                                </div>
                            </div>
                        </section>
                        {/* ---- Attendance summary (bars) ---- */}
                        <section className="mmw-box">
                            <div className="mmw-box-head">
                                <h3 className="mmw-h3">Attendance</h3>
                            </div>
                            <AttendanceSummary
                                memberId={selected.id}
                                events={events}
                                attendance={attendance}
                                absences={absences}
                                categories={categories}
                                accentColor={accentColor}
                            />
                        </section>
                        {/* ---- Attendance history ---- */}
                        <section className="mmw-box">
                            <div className="mmw-box-head">
                                <div>
                                    <h3 className="mmw-h3">Attendance History</h3>
                                    <p className="mmw-sub">Check-ins for past events</p>
                                </div>
                                {attendanceRate !== null && (
                                    <span className="mmw-rate">
                                        {attendedCount}/{history.length} · {attendanceRate}%
                                    </span>
                                )}
                            </div>

                            {history.length === 0 ? (
                                <p className="mmw-empty">No past events yet.</p>
                            ) : (
                                <div className="mmw-history">
                                    {history.map(({ event, status, checkinTime }) => (
                                        <div key={event.id} className="mmw-event">
                                            <div style={{ minWidth: 0 }}>
                                                <p className="mmw-event-name">{event.name}</p>
                                                <p className="mmw-event-meta">
                                                    {formatShortDate(event.date)}
                                                    {event.eventType ? ` · ${event.eventType.toUpperCase()}` : ""}
                                                </p>
                                                {checkinTime && (
                                                    <p className="mmw-scan">
                                                        Scan time:{" "}
                                                        {new Date(checkinTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`mmw-status mmw-status-${status}`}>{status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* ---- Buttons at bottom ---- */}
                        <section className="mmw-box">
                            <div className="mmw-box-head">
                                <h3 className="mmw-h3">Admin Actions</h3>
                            </div>

                            <div className="mmw-actions">
                                {/* 1) Change role */}
                                <div className="mmw-role">
                                    <select
                                        value={pendingRole}
                                        onChange={(e) => setPendingRole(e.target.value)}
                                        disabled={isPending || isDeactivated}
                                        className="mmw-select"
                                    >
                                        {uniqueRoles(roleOptions, selected.role).map((r) => (
                                            <option key={r} value={r}>
                                                {titleCase(r)}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleChangeRole}
                                        disabled={isPending || !roleChanged || isDeactivated}
                                        className="mmw-btn mmw-btn-accent"
                                    >
                                        Change Role
                                    </button>
                                </div>

                                {/* 2) Deactivate */}
                                <button
                                    type="button"
                                    onClick={handleDeactivate}
                                    disabled={isPending || isDeactivated}
                                    className="mmw-btn mmw-btn-danger"
                                >
                                    {isDeactivated ? "Deactivated" : isPending ? "Processing..." : "Deactivate"}
                                </button>

                                {/* 3) Send email */}
                                <a
                                    href={selected.email ? `mailto:${selected.email}?subject=${encodeURIComponent(`${orgName} Update`)}` : undefined}
                                    aria-disabled={!selected.email}
                                    className="mmw-btn mmw-btn-plain"
                                >
                                    Send Email
                                </a>
                            </div>
                        </section>
                    </div>
                ) : (
                    <section className="mmw-box mmw-select-prompt">
                        <p className="mmw-h2" style={{ fontSize: 14 }}>Select a Member</p>
                        <p className="mmw-sub">Pick someone from the registry to see their details.</p>
                    </section>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

type Status = "attended" | "excused" | "missed";

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="mmw-chip" data-active={active}>
            {label}
            <span className="mmw-chip-count">{count}</span>
        </button>
    );
}

function RoleBadge({ role }: { role: string | null | undefined }) {
    const r = normRole(role);
    const isAdmin = r === "ADMIN" || r === "EXEC";
    return <span className={`mmw-badge ${isAdmin ? "mmw-badge-admin" : "mmw-badge-member"}`}>{r}</span>;
}

function Pill({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
    return (
        <span className="mmw-pill" data-muted={muted}>
            {children}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normRole(role: string | null | undefined) {
    return (role ?? "MEMBER").trim().toUpperCase() || "MEMBER";
}

function uniqueRoles(options: string[], current: string | null | undefined) {
    return Array.from(new Set([...options.map(normRole), normRole(current)]));
}

function titleCase(s: string) {
    return s.charAt(0) + s.slice(1).toLowerCase();
}

// "2026-11-11" is parsed as UTC midnight by default, which shows up as Nov 10
// in Central time. Treat date-only strings as local dates instead.
function parseDate(value: string | null | undefined) {
    if (!value) return null;
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    const d = dateOnly ? new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatShortDate(value: string | null) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date";
}

function formatYear(year: string | null | undefined) {
    if (!year) return "";
    const t = year.trim();
    if (/^\d{4}$/.test(t)) return `'${t.slice(-2)}`;
    if (/^\d{2}$/.test(t)) return `'${t}`;
    return t;
}

/* ------------------------------------------------------------------ */
/* Styles — self-contained (the orgs pages don't load Tailwind).       */
/* Everything is prefixed with "mmw-" so it can't leak into the page.  */
/* ------------------------------------------------------------------ */

const CSS = `
.mmw {
  --mmw-accent-soft: color-mix(in srgb, var(--mmw-accent) 10%, white);
  --mmw-accent-border: color-mix(in srgb, var(--mmw-accent) 40%, white);
  --mmw-accent-text: color-mix(in srgb, var(--mmw-accent) 55%, #1e293b);
  container: mmw-root / inline-size;
  width: 100%;
  color: #1e293b;
  font-size: 12px;
  line-height: 1.4;
}
.mmw *, .mmw *::before, .mmw *::after { box-sizing: border-box; }
.mmw p, .mmw h2, .mmw h3 { margin: 0; }

.mmw-grid { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
@container mmw-root (min-width: 640px) {
  .mmw-grid { grid-template-columns: 270px minmax(0, 1fr); }
}

.mmw-box {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px 16px;
}
.mmw-box-head {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 8px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px; margin-bottom: 12px;
}
.mmw-h3 { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #1e293b; }
.mmw-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.mmw-empty { font-size: 12px; color: #94a3b8; text-align: center; padding: 32px 0; }

/* registry */
.mmw-search {
  width: 100%;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 8px 12px; margin-bottom: 10px;
  font: inherit; font-size: 12px; color: #1e293b; outline: none;
  transition: border-color 0.15s;
}
.mmw-search::placeholder { color: #94a3b8; }
.mmw-search:focus { border-color: var(--mmw-accent); background: #fff; }

.mmw-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 12px; }
.mmw-chips-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-right: 2px; }
.mmw-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 8px;
  border: 1px solid #e2e8f0; background: #fff; color: #475569;
  font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
  transition: background 0.15s;
}
.mmw-chip:hover { background: #f8fafc; }
.mmw-chip[data-active="true"] { background: #0f172a; border-color: #0f172a; color: #fff; }
.mmw-chip-count { font-size: 9px; padding: 1px 5px; border-radius: 4px; background: #f1f5f9; color: #64748b; }
.mmw-chip[data-active="true"] .mmw-chip-count { background: rgba(255,255,255,0.2); color: #fff; }

.mmw-list { display: flex; flex-direction: column; gap: 8px; max-height: 460px; overflow-y: auto; padding-right: 4px; }
.mmw-member {
  display: flex; flex-direction: column; gap: 5px;
  width: 100%; text-align: left;
  padding: 10px 12px; border-radius: 12px;
  border: 1px solid #f1f5f9; background: #fff;
  font: inherit; color: inherit; cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.mmw-member:hover { background: #f8fafc; }
.mmw-member[data-selected="true"] {
  background: var(--mmw-accent-soft);
  border-color: var(--mmw-accent-border);
  box-shadow: 0 1px 2px rgba(15,23,42,0.06);
}
.mmw-member[data-off="true"] { opacity: 0.6; }

.mmw-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; min-width: 0; }
.mmw-row-center { align-items: center; }
.mmw-name { font-size: 12px; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mmw-pts { font-size: 10px; font-weight: 700; color: #64748b; flex-shrink: 0; }
.mmw-email { font-size: 10px; color: #94a3b8; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.mmw-strike { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 999px; background: #fff1f2; color: #e11d48; flex-shrink: 0; }

.mmw-badges { display: flex; flex-wrap: wrap; gap: 4px; }
.mmw-badge {
  font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap;
}
.mmw-badge-admin { background: var(--mmw-accent-soft); color: var(--mmw-accent-text); border-color: var(--mmw-accent-border); }
.mmw-badge-member { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
.mmw-badge-committee { background: #f0f9ff; color: #0369a1; border-color: #e0f2fe; }
.mmw-badge-off { background: #e2e8f0; color: #64748b; }

/* detail */
.mmw-detail { container: mmw-detail / inline-size; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.mmw-error { padding: 10px 12px; background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; border-radius: 12px; font-weight: 600; }

.mmw-profile { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; }
.mmw-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
.mmw-avatar {
  width: 56px; height: 56px; flex-shrink: 0; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: var(--mmw-accent-soft); border: 1px solid var(--mmw-accent-border);
  color: var(--mmw-accent-text); font-size: 22px; font-weight: 800; text-transform: uppercase;
}
.mmw-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mmw-h2 { font-size: 18px; font-weight: 800; color: #1e293b; }
.mmw-meta { font-size: 12px; color: #94a3b8; font-weight: 500; margin-top: 2px; }
.mmw-meta2 { font-size: 11px; color: #64748b; margin-top: 2px; overflow-wrap: anywhere; }

.mmw-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.mmw-pill { padding: 3px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 10px; font-weight: 700; color: #475569; white-space: nowrap; }
.mmw-pill[data-muted="true"] { color: #94a3b8; font-weight: 500; }

.mmw-rate { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; }
.mmw-history { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; padding-right: 4px; }
.mmw-event {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 10px 12px; border: 1px solid #f1f5f9; border-radius: 12px; background: #fff;
  transition: background 0.15s;
}
.mmw-event:hover { background: #f8fafc; }
.mmw-event-name { font-size: 12px; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mmw-event-meta { font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 2px; letter-spacing: 0.02em; }
.mmw-scan { font-size: 9px; color: #94a3b8; margin-top: 2px; }

.mmw-status { padding: 2px 9px; border-radius: 8px; border: 1px solid; font-size: 10px; font-weight: 700; text-transform: capitalize; flex-shrink: 0; }
.mmw-status-attended { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
.mmw-status-excused  { background: #fffbeb; color: #b45309; border-color: #fef3c7; }
.mmw-status-missed   { background: #fff1f2; color: #be123c; border-color: #ffe4e6; }

/* actions */
.mmw-actions { display: grid; grid-template-columns: 1fr; gap: 10px; }
@container mmw-detail (min-width: 460px) {
  .mmw-actions { grid-template-columns: 1.5fr 1fr 1fr; }
}
.mmw-role { display: flex; gap: 6px; min-width: 0; }
.mmw-select {
  flex: 1; min-width: 0;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 8px 10px; font: inherit; font-size: 12px; font-weight: 700; color: #334155;
  outline: none; cursor: pointer;
}
.mmw-select:focus { border-color: var(--mmw-accent); }
.mmw-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 12px; border-radius: 12px; border: 1px solid;
  font: inherit; font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap;
  cursor: pointer; transition: background 0.15s, opacity 0.15s;
}
.mmw-btn:disabled, .mmw-btn[aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.mmw-btn-accent { background: var(--mmw-accent-soft); color: var(--mmw-accent-text); border-color: var(--mmw-accent-border); }
.mmw-btn-accent:hover { background: color-mix(in srgb, var(--mmw-accent) 18%, white); }
.mmw-btn-danger { background: #fff1f2; color: #be123c; border-color: #fecdd3; }
.mmw-btn-danger:hover { background: #ffe4e6; }
.mmw-btn-plain { background: #f8fafc; color: #334155; border-color: #e2e8f0; }
.mmw-btn-plain:hover { background: #f1f5f9; }

.mmw-select-prompt { text-align: center; padding: 48px 16px; }
`;