"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { OrgSettings } from "@/lib/orgSettings";
import {
  DRESS_CODES,
  EVENT_LIMITS,
  GENERAL_EVENT_TYPE,
  type NewOrgEvent,
  type OrgEventRow,
} from "@/lib/orgEvents";
import * as s from "./formStyles";

// Modeled on NOBE DevOps' Create Event form (users/admin/createEvent). Event types come from the
// org's point categories instead of NOBE's fixed list.
//   Create: POST /api/orgs/[slug]/events, which stores the event with this org's id.
//   Edit (`existing` set, from clicking an event on the Calendar): PATCH / DELETE
//   /api/orgs/[slug]/events/[id].

type CreateEventPanelProps = {
  orgSlug: string;
  settings?: OrgSettings | null;
  accentColor: string;
  // The event being edited. Without it, the form creates a new event.
  existing?: OrgEventRow;
  // Called after the event is deleted (e.g. to close the pop-up).
  onDeleted?: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

type FormState = {
  name: string;
  category: string;
  dresscode: string;
  points: string;
  is_mandatory: boolean;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  has_check_in_window: boolean;
  check_in_start_offset_minutes: string;
  check_in_end_offset_minutes: string;
  // Who the event is for. Only offered when the org has committees.
  audience: "all" | "committees";
  committee_ids: number[];
};

// The form's fields for an existing event. Like NOBE, the table has no end-time column, so the end
// time is read from check_in_ends_at: exact for the default window (check-in runs start to end),
// and the check-in end time for events with a custom window.
function formFromEvent(e: OrgEventRow, committeeIds: number[]): FormState {
  const start = new Date(e.date);
  const checkInStart = e.check_in_starts_at ? new Date(e.check_in_starts_at) : start;
  const checkInEnd = e.check_in_ends_at ? new Date(e.check_in_ends_at) : new Date(start.getTime() + 60 * 60_000);
  const custom = checkInStart.getTime() !== start.getTime();
  const minutesFromStart = (d: Date) => String(Math.round((d.getTime() - start.getTime()) / 60_000));
  return {
    name: e.name,
    category: e.event_type ?? GENERAL_EVENT_TYPE,
    dresscode: e.dresscode && (DRESS_CODES as readonly string[]).includes(e.dresscode) ? e.dresscode : "Casual",
    points: String(e.points ?? 0),
    is_mandatory: Boolean(e.is_mandatory),
    date: toDateInput(start),
    start_time: toTimeInput(start),
    end_time: toTimeInput(checkInEnd),
    location: e.location ?? "",
    description: e.description ?? "",
    has_check_in_window: custom,
    check_in_start_offset_minutes: custom ? minutesFromStart(checkInStart) : "0",
    check_in_end_offset_minutes: custom ? minutesFromStart(checkInEnd) : "30",
    // Committees removed from Settings since are dropped.
    audience: e.committee_ids.some((id) => committeeIds.includes(id)) ? "committees" : "all",
    committee_ids: e.committee_ids.filter((id) => committeeIds.includes(id)),
  };
}

export default function CreateEventPanel({ orgSlug, settings, accentColor, existing, onDeleted }: CreateEventPanelProps) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  // Once strikes were given out for this event, the fields they were based on can't change.
  const timesLocked = Boolean(existing?.strikes_processed);
  const categories = settings?.categories ?? [];
  const typeOptions = categories.length > 0 ? categories.map((c) => c.name) : [GENERAL_EVENT_TYPE];
  // Keep an edited event's type selectable even if that category was renamed or removed since.
  if (existing?.event_type && !typeOptions.includes(existing.event_type)) typeOptions.push(existing.event_type);
  // The org's saved committees. Without any, every event is for all members and the choice is hidden.
  const committees = (settings?.committees ?? []).filter((c): c is { id: number; name: string } => typeof c.id === "number");
  const committeeIds = committees.map((c) => c.id);

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? formFromEvent(existing, committeeIds)
      : {
          name: "",
          category: typeOptions[0],
          dresscode: "Casual",
          points: "0",
          is_mandatory: categories[0]?.is_mandatory ?? false,
          date: "",
          start_time: "18:00",
          end_time: "19:00",
          location: "",
          description: "",
          has_check_in_window: false,
          check_in_start_offset_minutes: "0",
          check_in_end_offset_minutes: "30",
          audience: "all",
          committee_ids: [],
        }
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setResult(null);
  };

  // Picking a mandatory point category makes the event mandatory by default (still editable).
  function changeCategory(name: string) {
    const category = categories.find((c) => c.name === name);
    setForm((f) => ({
      ...f,
      category: name,
      is_mandatory: timesLocked ? f.is_mandatory : category?.is_mandatory ?? f.is_mandatory,
    }));
    setResult(null);
  }

  async function deleteEvent() {
    if (!existing) return;
    setDeleting(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/orgs/${encodeURIComponent(orgSlug)}/events/${encodeURIComponent(existing.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not delete the event.");
      router.refresh();
      onDeleted?.();
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "Could not delete the event." });
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const points = Number(form.points);
    const startOffset = Number(form.check_in_start_offset_minutes);
    const endOffset = Number(form.check_in_end_offset_minutes);
    const starts = new Date(`${form.date}T${form.start_time}`);
    const ends = new Date(`${form.date}T${form.end_time}`);

    const problem = !name
      ? "Enter an event name."
      : !form.date
      ? "Pick a date."
      : Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())
      ? "Enter a start and end time."
      : ends <= starts
      ? "The end time must be after the start time."
      : !Number.isInteger(points) || points < 0
      ? "Points must be a whole number of 0 or more."
      : form.has_check_in_window && (!Number.isInteger(startOffset) || !Number.isInteger(endOffset))
      ? "Check-in offsets must be whole numbers of minutes."
      : form.has_check_in_window && endOffset <= startOffset
      ? "The check-in window must end after it starts."
      : form.audience === "committees" && form.committee_ids.length === 0
      ? "Pick at least one committee, or make the event for all members."
      : null;
    if (problem) {
      setResult({ kind: "error", text: problem });
      return;
    }

    const event: NewOrgEvent = {
      name,
      category: form.category,
      dresscode: form.dresscode,
      points,
      is_mandatory: form.is_mandatory,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      location: form.location.trim(),
      description: form.description.trim(),
      check_in_start_offset_minutes: form.has_check_in_window ? startOffset : null,
      check_in_end_offset_minutes: form.has_check_in_window ? endOffset : null,
      committee_ids: committees.length > 0 && form.audience === "committees" ? form.committee_ids : [],
    };

    setSubmitting(true);
    try {
      const base = `/api/orgs/${encodeURIComponent(orgSlug)}/events`;
      const res = await fetch(existing ? `${base}/${encodeURIComponent(existing.id)}` : base, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? (existing ? "Could not save the event." : "Could not create the event."));
      if (existing) {
        setResult({ kind: "success", text: `Saved changes to "${name}".` });
      } else {
        setResult({
          kind: "success",
          text: `Created "${name}"${event.is_mandatory ? " (mandatory)" : ""}. It's on your calendar now.`,
        });
        // Clear the event-specific fields; keep type/dress code/times for the next event.
        setForm((f) => ({ ...f, name: "", location: "", description: "" }));
      }
      // Reload the page's events so the Calendar and Quick Actions see the change.
      router.refresh();
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "Could not save the event." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
      {timesLocked && (
        <div style={s.noticeMessage}>
          Strikes were already given out for this event, so its date, times, check-in window, mandatory setting,
          and committees can&apos;t be changed. You can still edit the other details or delete it.
        </div>
      )}
      <div style={s.fieldGroup}>
        <label style={s.label} htmlFor="qa-event-name">Name</label>
        <input id="qa-event-name" style={s.input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. General Meeting" maxLength={EVENT_LIMITS.nameMax} />
      </div>

      <div style={s.twoUp}>
        <div style={s.fieldGroup}>
          <label style={s.label} htmlFor="qa-event-type">Event type</label>
          <select id="qa-event-type" style={s.input} value={form.category} onChange={(e) => changeCategory(e.target.value)}>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label} htmlFor="qa-event-dress">Dress code</label>
          <select id="qa-event-dress" style={s.input} value={form.dresscode} onChange={(e) => set("dresscode", e.target.value)}>
            {DRESS_CODES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {committees.length > 0 && (
        <fieldset style={{ ...s.fieldGroup, border: 0, padding: 0, margin: 0 }}>
          <legend style={{ ...s.label, marginBottom: "6px" }}>Who is this event for?</legend>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {(["all", "committees"] as const).map((audience) => (
              <label
                key={audience}
                style={{ ...s.label, fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: timesLocked ? "not-allowed" : "pointer" }}
              >
                <input
                  type="radio"
                  name="qa-event-audience"
                  checked={form.audience === audience}
                  disabled={timesLocked}
                  onChange={() => set("audience", audience)}
                />
                {audience === "all" ? "All members" : "Specific committees"}
              </label>
            ))}
          </div>
          {form.audience === "committees" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
              {committees.map((c) => {
                const checked = form.committee_ids.includes(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      border: `1px solid ${checked ? accentColor : "#CBD5E1"}`,
                      background: checked ? `${accentColor}14` : "white",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#0F172A",
                      cursor: timesLocked ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={timesLocked}
                      onChange={(e) =>
                        set(
                          "committee_ids",
                          e.target.checked ? [...form.committee_ids, c.id] : form.committee_ids.filter((id) => id !== c.id)
                        )
                      }
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          )}
          <p style={s.hint}>
            {form.audience === "committees"
              ? "Only members of the selected committees will see this event. If it's mandatory, only they can get strikes for missing it."
              : "Every member will see this event."}
          </p>
        </fieldset>
      )}

      <div style={s.twoUp}>
        <div style={s.fieldGroup}>
          <label style={s.label} htmlFor="qa-event-points">Points</label>
          <input id="qa-event-points" type="number" min={0} step={1} style={s.input} value={form.points} onChange={(e) => set("points", e.target.value)} />
        </div>
        <label style={{ ...s.label, display: "flex", alignItems: "center", gap: "8px", alignSelf: "end", paddingBottom: "10px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_mandatory} disabled={timesLocked} onChange={(e) => set("is_mandatory", e.target.checked)} />
          Mandatory event
        </label>
      </div>

      <div style={s.twoUp}>
        <div style={s.fieldGroup}>
          <label style={s.label} htmlFor="qa-event-date">Date</label>
          <input id="qa-event-date" type="date" disabled={timesLocked} style={timesLocked ? s.lockedInput : s.input} value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label} htmlFor="qa-event-location">Location</label>
          <input id="qa-event-location" style={s.input} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Siebel 1404" maxLength={EVENT_LIMITS.locationMax} />
        </div>
      </div>

      <div style={s.twoUp}>
        <div style={s.fieldGroup}>
          <label style={s.label} htmlFor="qa-event-start">Start time</label>
          <input id="qa-event-start" type="time" disabled={timesLocked} style={timesLocked ? s.lockedInput : s.input} value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label} htmlFor="qa-event-end">End time</label>
          <input id="qa-event-end" type="time" disabled={timesLocked} style={timesLocked ? s.lockedInput : s.input} value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
        </div>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label} htmlFor="qa-event-desc">Description / Notes &amp; Reminders</label>
        <textarea id="qa-event-desc" rows={3} style={{ ...s.input, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Enter details, description, notes, or reminders for this event..." maxLength={EVENT_LIMITS.descriptionMax} />
      </div>

      <label style={{ ...s.label, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
        <input type="checkbox" checked={form.has_check_in_window} disabled={timesLocked} onChange={(e) => set("has_check_in_window", e.target.checked)} />
        Use custom check-in window
      </label>
      {form.has_check_in_window && (
        <div style={s.twoUp}>
          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="qa-event-cin-start">Check-in start offset (minutes)</label>
            <input id="qa-event-cin-start" type="number" step={1} disabled={timesLocked} style={timesLocked ? s.lockedInput : s.input} value={form.check_in_start_offset_minutes} onChange={(e) => set("check_in_start_offset_minutes", e.target.value)} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="qa-event-cin-end">Check-in end offset (minutes)</label>
            <input id="qa-event-cin-end" type="number" step={1} disabled={timesLocked} style={timesLocked ? s.lockedInput : s.input} value={form.check_in_end_offset_minutes} onChange={(e) => set("check_in_end_offset_minutes", e.target.value)} />
          </div>
        </div>
      )}

      {result && (
        <div role="status" style={result.kind === "success" ? s.successMessage : s.errorMessage}>
          {result.text}
        </div>
      )}

      {confirmingDelete ? (
        <div style={{ ...s.noticeMessage, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <span>
            Delete &ldquo;{existing?.name}&rdquo;? Its check-ins, absence requests, and strikes are deleted too. This
            can&apos;t be undone.
          </span>
          <span style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} style={s.secondaryButton}>
              Cancel
            </button>
            <button type="button" onClick={deleteEvent} disabled={deleting} style={s.dangerButton(deleting)}>
              {deleting ? "Deleting..." : "Yes, delete"}
            </button>
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <button type="submit" disabled={submitting} style={s.primaryButton(accentColor, submitting)}>
            {submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create Event"}
          </button>
          {isEdit && (
            <button type="button" onClick={() => { setConfirmingDelete(true); setResult(null); }} disabled={submitting} style={s.dangerButton(false)}>
              Delete event
            </button>
          )}
        </div>
      )}
    </form>
  );
}
