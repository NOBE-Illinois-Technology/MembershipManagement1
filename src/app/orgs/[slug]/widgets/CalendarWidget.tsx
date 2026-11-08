"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { OrgEvent } from "@/lib/orgEvents";

// Modeled on the NOBE DevOps member calendar (src/app/(NOBEDevOps)/users/member/eventList.tsx,
// "calendar-compact" styles in (NOBEDevOps)/globals.css): a 6-week month grid where each day lists
// its events as cards. NOBE's orange accent is replaced by the org's primary color.
//
// Not carried over yet, because OrgEvent has no fields for them: event-type colors/emoji and
// filters, location, points, mandatory chip, conflict warnings, and links to event details.

type CalendarWidgetProps = {
  // The org's events. Empty until orgs have an events table.
  events?: OrgEvent[];
  // Org primary color; stands in for NOBE's orange accent.
  accentColor?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_EVENTS_PER_DAY = 3;

// Local-time YYYY-MM-DD key so events land on the day the viewer sees.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const isDateOnly = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

function eventDayKey(date: string): string | null {
  // A bare "YYYY-MM-DD" is a calendar day, not a UTC instant; don't let the timezone shift it.
  if (isDateOnly(date)) return date;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : dayKey(parsed);
}

// Only events with a time of day get a time label (an all-day "YYYY-MM-DD" has none).
function eventTime(date: string): string | null {
  if (isDateOnly(date)) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// False during the server render and the first browser render, true afterwards. "Today" depends on
// the viewer's clock and timezone, which the server doesn't know, so it's only shown once this is
// true (same idea as NOBE's `mounted` state, without an extra effect + re-render).
const noopSubscribe = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export default function CalendarWidget({ events = [], accentColor = "#3B82F6" }: CalendarWidgetProps) {
  const mounted = useHasMounted();
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const todayKey = mounted ? dayKey(new Date()) : null;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, OrgEvent[]>();
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const event of sorted) {
      const key = eventDayKey(event.date);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  // Always 6 weeks (42 days) starting on the Sunday on or before the 1st, like NOBE.
  const calendarDays = useMemo(() => {
    const first = new Date(displayMonth);
    first.setDate(1 - displayMonth.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }, [displayMonth]);

  const monthEventCount = calendarDays.reduce(
    (n, d) => (d.getMonth() === displayMonth.getMonth() ? n + (eventsByDay.get(dayKey(d))?.length ?? 0) : n),
    0
  );

  const changeMonth = (offset: number) =>
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  const goToToday = () => {
    const now = new Date();
    setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <div className="cal" style={{ ["--cal-accent" as string]: accentColor }}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Calendar</p>
          <h3 className="section-title">
            {displayMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <p className="section-copy">
            {monthEventCount === 0
              ? "No events scheduled this month."
              : `${monthEventCount} scheduled event${monthEventCount === 1 ? "" : "s"} in this month.`}
          </p>
        </div>
        <div className="action-row">
          <button type="button" onClick={() => changeMonth(-1)} className="btn-secondary">
            Previous
          </button>
          <button type="button" onClick={goToToday} className="btn-secondary">
            Today
          </button>
          <button type="button" onClick={() => changeMonth(1)} className="btn-secondary">
            Next
          </button>
        </div>
      </div>

      <div className="calendar-compact">
        <div className="calendar-header">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-header-cell">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((date) => {
            const key = dayKey(date);
            const inMonth = date.getMonth() === displayMonth.getMonth();
            const isToday = key === todayKey;
            const dayEvents = eventsByDay.get(key) ?? [];

            return (
              <div
                key={key}
                className={["calendar-day", !inMonth && "calendar-day-muted", isToday && "calendar-day-today"]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="calendar-day-head">
                  <div className="calendar-day-meta">
                    <strong className="calendar-day-number">{date.getDate()}</strong>
                    <span className="calendar-day-label">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>
                  {isToday && <span className="today-pill">Today</span>}
                </div>

                <div className="calendar-events">
                  {dayEvents.length === 0 ? (
                    <p className="calendar-empty-copy">{inMonth ? "Open day" : ""}</p>
                  ) : (
                    dayEvents.slice(0, MAX_EVENTS_PER_DAY).map((event) => {
                      const time = eventTime(event.date);
                      return (
                        <div key={event.id} className="calendar-event" title={event.title}>
                          {time && <div className="calendar-event-time">{time}</div>}
                          <div className="calendar-event-name">{event.title}</div>
                        </div>
                      );
                    })
                  )}
                  {dayEvents.length > MAX_EVENTS_PER_DAY && (
                    <p className="calendar-more-pill">+{dayEvents.length - MAX_EVENTS_PER_DAY} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ported from NOBE's globals.css (.panel-header, .btn-secondary, .calendar-compact ...),
          scoped to this component. Breakpoints use the widget's own width (container queries)
          rather than the window's, since the widget can sit in a narrow dashboard column. */}
      <style jsx>{`
        .cal {
          --cal-muted: #6b6c70;
          --cal-fg: #4f5052;
          --cal-border: rgba(79, 80, 82, 0.14);
          --cal-border-strong: rgba(79, 80, 82, 0.24);
          container-type: inline-size;
          color: var(--cal-fg);
        }

        .panel-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 14px;
        }
        .eyebrow {
          margin: 0 0 4px;
          color: var(--cal-accent);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .section-title {
          margin: 0;
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1.15;
        }
        .section-copy {
          margin: 4px 0 0;
          color: var(--cal-muted);
          font-size: 0.85rem;
        }
        .action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid var(--cal-border-strong);
          background: rgba(255, 251, 247, 0.9);
          color: var(--cal-fg);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .btn-secondary:hover {
          transform: translateY(-1px);
          background: #ffffff;
        }

        .calendar-compact {
          border-radius: 18px;
          border: 1px solid var(--cal-border);
          overflow: hidden;
        }
        .calendar-header {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          background: rgba(229, 221, 213, 0.55);
          border-bottom: 1px solid var(--cal-border);
        }
        .calendar-header-cell {
          padding: 10px 6px;
          text-align: center;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--cal-muted);
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          grid-auto-rows: 120px;
        }
        .calendar-day {
          /* NOBE's globals.css sets border-box on everything; org pages don't load it. */
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          height: 120px;
          overflow: hidden;
          border-right: 1px solid rgba(79, 80, 82, 0.12);
          border-bottom: 1px solid rgba(79, 80, 82, 0.12);
          background: rgba(255, 251, 247, 0.9);
          padding: 8px;
        }
        .calendar-day:nth-child(7n) {
          border-right: none;
        }
        .calendar-day:nth-last-child(-n + 7) {
          border-bottom: none;
        }
        .calendar-day-muted {
          background: rgba(229, 221, 213, 0.38);
          color: rgba(38, 27, 21, 0.52);
        }
        .calendar-day-today {
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cal-accent) 45%, transparent);
        }
        .calendar-day-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 6px;
        }
        .calendar-day-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .calendar-day-number {
          font-size: 0.81rem;
          line-height: 1;
        }
        .calendar-day-label {
          display: none;
          color: var(--cal-muted);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .today-pill {
          padding: 2px 7px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--cal-accent) 14%, transparent);
          color: var(--cal-accent);
          font-size: 0.65rem;
          font-weight: 700;
        }
        .calendar-events {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 2px;
        }
        .calendar-event {
          flex-shrink: 0;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--cal-accent) 15%, transparent);
          border-left: 4px solid var(--cal-accent);
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--cal-accent) 12%, transparent),
            color-mix(in srgb, var(--cal-accent) 5%, transparent)
          );
          padding: 5px 7px;
        }
        .calendar-event-time {
          color: var(--cal-accent);
          font-size: 0.66rem;
          font-weight: 700;
        }
        .calendar-event-name {
          color: #333;
          font-size: 0.69rem;
          font-weight: 600;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .calendar-empty-copy {
          margin: 2px 0 0;
          color: rgba(100, 86, 78, 0.7);
          font-size: 0.72rem;
        }
        .calendar-more-pill {
          margin: 0;
          color: var(--cal-accent);
          font-size: 0.69rem;
          font-weight: 700;
        }

        /* Narrow widget (e.g. phone, or squeezed beside the side panel): one day per row, like NOBE's
           mobile layout. Days outside the month are hidden to keep the list short. */
        @container (max-width: 560px) {
          .calendar-header {
            display: none;
          }
          .calendar-grid {
            grid-template-columns: 1fr;
            grid-auto-rows: auto;
          }
          .calendar-day {
            height: auto;
            border-right: none;
            border-bottom: 1px solid rgba(79, 80, 82, 0.12);
          }
          .calendar-day-muted {
            display: none;
          }
          .calendar-day-label {
            display: inline;
          }
          .calendar-day-meta {
            flex-direction: row;
            align-items: baseline;
            gap: 8px;
          }
          .calendar-event-name {
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
