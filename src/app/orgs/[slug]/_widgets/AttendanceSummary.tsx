"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { MMAbsence, MMAttendance, MMEvent } from "./MemberManagementWidget";

/**
 * Attendance bars for ONE member.
 *  a. Org has point categories        -> one bar per category
 *  b. Org only has a mandatory one    -> only that bar
 *     No categories, but some events are flagged isMandatory -> one "Mandatory events" bar
 *  c. Always                          -> overall bar + the most recent past event
 * Excused absences don't count against the member.
 */

export type AttendanceCategory = {
    name: string;
    mandatory?: boolean;
};

type AttendanceSummaryProps = {
    memberId: string | number;
    events: MMEvent[];
    attendance: MMAttendance[];
    absences?: MMAbsence[];
    categories?: AttendanceCategory[];
    accentColor?: string;
};

type Status = "attended" | "excused" | "missed";
type Tally = { attended: number; total: number };

const EXCUSED = new Set(["APPROVED", "EXCUSED", "ACCEPTED", "CLEARED"]);

export default function AttendanceSummary({
    memberId,
    events,
    attendance,
    absences = [],
    categories = [],
    accentColor = "#F59E0B",
}: AttendanceSummaryProps) {
    const data = useMemo(() => {
        const now = Date.now();
        const attended = new Set(attendance.filter((a) => a.memberId === memberId).map((a) => a.eventId));
        const excused = new Set(
            absences
                .filter((a) => a.memberId === memberId && EXCUSED.has((a.status ?? "").trim().toUpperCase()))
                .map((a) => a.eventId)
        );

        const past = events
            .map((e) => ({ e, d: parseDate(e.date) }))
            .filter((x): x is { e: MMEvent; d: Date } => x.d !== null && x.d.getTime() <= now)
            .sort((a, b) => b.d.getTime() - a.d.getTime())
            .map(({ e }) => {
                const status: Status = attended.has(e.id) ? "attended" : excused.has(e.id) ? "excused" : "missed";
                return { event: e, status };
            });

        const tally = (list: typeof past): Tally => ({
            attended: list.filter((x) => x.status === "attended").length,
            total: list.filter((x) => x.status !== "excused").length,
        });

        const cleanCats = categories.filter((c) => c.name.trim());
        let bars: { label: string; mandatory: boolean; tally: Tally }[] = cleanCats.map((c) => ({
            label: c.name.trim(),
            mandatory: !!c.mandatory,
            tally: tally(past.filter((x) => sameName(x.event.category, c.name))),
        }));

        if (bars.length === 0 && events.some((e) => e.isMandatory)) {
            bars = [{ label: "Mandatory events", mandatory: true, tally: tally(past.filter((x) => x.event.isMandatory)) }];
        }

        bars.sort((a, b) => Number(b.mandatory) - Number(a.mandatory));

        return { overall: tally(past), bars, last: past[0] ?? null };
    }, [memberId, events, attendance, absences, categories]);

    return (
        <div className="mas" style={{ "--mas-accent": accentColor } as CSSProperties}>
            <style>{CSS}</style>

            <Bar label="Overall attendance" tally={data.overall} big />

            {data.bars.length > 0 && (
                <div className="mas-cats">
                    <p className="mas-section">By category</p>
                    {data.bars.map((b) => (
                        <Bar key={b.label} label={b.label} tally={b.tally} mandatory={b.mandatory} />
                    ))}
                </div>
            )}

            <div className="mas-last">
                <p className="mas-section">Last event</p>
                {data.last ? (
                    <div className="mas-last-row">
                        <div style={{ minWidth: 0 }}>
                            <p className="mas-last-name">{data.last.event.name}</p>
                            <p className="mas-last-meta">
                                {formatShortDate(data.last.event.date)}
                                {data.last.event.category ? ` · ${data.last.event.category.toUpperCase()}` : ""}
                            </p>
                        </div>
                        <span className={`mas-status mas-status-${data.last.status}`}>{data.last.status}</span>
                    </div>
                ) : (
                    <p className="mas-none">No past events yet.</p>
                )}
            </div>
        </div>
    );
}

function Bar({ label, tally, mandatory = false, big = false }: { label: string; tally: Tally; mandatory?: boolean; big?: boolean }) {
    const pct = tally.total ? Math.round((tally.attended / tally.total) * 100) : null;
    const tone = pct === null ? "none" : pct >= 75 ? "good" : pct >= 50 ? "ok" : "low";
    return (
        <div className="mas-bar" data-big={big}>
            <div className="mas-bar-top">
                <span className="mas-bar-label">
                    {label}
                    {mandatory && <span className="mas-tag">Mandatory</span>}
                </span>
                <span className="mas-bar-num">
                    {pct === null ? "No events yet" : `${tally.attended}/${tally.total} · ${pct}%`}
                </span>
            </div>
            <div className="mas-track">
                <div className="mas-fill" data-tone={tone} style={{ width: `${pct ?? 0}%` }} />
            </div>
        </div>
    );
}

function sameName(a: string | null | undefined, b: string) {
    return (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
}

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

const CSS = `
.mas { display: flex; flex-direction: column; gap: 14px; color: #1e293b; font-size: 12px; line-height: 1.4; }
.mas *, .mas *::before, .mas *::after { box-sizing: border-box; }
.mas p { margin: 0; }
.mas-section { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
.mas-cats { display: flex; flex-direction: column; gap: 10px; }
.mas-cats .mas-section { margin-bottom: -2px; }
.mas-bar-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; }
.mas-bar-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #334155; min-width: 0; }
.mas-bar[data-big="true"] .mas-bar-label { font-size: 13px; color: #1e293b; }
.mas-bar-num { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; }
.mas-tag { font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 1px 6px; border-radius: 999px; background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
.mas-track { width: 100%; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.mas-bar[data-big="true"] .mas-track { height: 10px; }
.mas-fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
.mas-fill[data-tone="good"] { background: #10b981; }
.mas-fill[data-tone="ok"]   { background: var(--mas-accent); }
.mas-fill[data-tone="low"]  { background: #f43f5e; }
.mas-last-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #f1f5f9; border-radius: 12px; background: #f8fafc; }
.mas-last-name { font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mas-last-meta { font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
.mas-none { font-size: 12px; color: #94a3b8; }
.mas-status { padding: 2px 9px; border-radius: 8px; border: 1px solid; font-size: 10px; font-weight: 700; text-transform: capitalize; flex-shrink: 0; }
.mas-status-attended { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
.mas-status-excused  { background: #fffbeb; color: #b45309; border-color: #fef3c7; }
.mas-status-missed   { background: #fff1f2; color: #be123c; border-color: #ffe4e6; }
`;