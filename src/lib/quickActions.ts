import type { OrgSettings } from "./orgSettings";

// The buttons an admin can drag into the Quick Actions widget. Modeled on the Quick Actions panel
// of the NOBE DevOps admin dashboard, but scoped to one org (they never touch NOBE's data).
export type QuickActionId = "create-event" | "email-members" | "strikes" | "absence-review";

export type QuickActionDefinition = {
  id: QuickActionId;
  label: string;
  description: string;
};

export const QUICK_ACTIONS: QuickActionDefinition[] = [
  {
    id: "create-event",
    label: "Create Event",
    description: "Schedule a new event for your members.",
  },
  {
    id: "email-members",
    label: "Email Members",
    description: "Send an email to everyone in the organization.",
  },
  {
    id: "strikes",
    label: "Process Strikes",
    description: "Give strikes for missed mandatory events.",
  },
  {
    id: "absence-review",
    label: "Review Absences",
    description: "Approve or deny absence requests.",
  },
];

export type QuickActionAvailability = { available: true } | { available: false; reason: string };

export type QuickActionContext = {
  settings: OrgSettings | null | undefined;
  // Whether the org has created at least one mandatory event (events.org_id + is_mandatory).
  hasMandatoryEvents: boolean;
};

// Whether a quick action can be used:
//   strikes         only when strikes are turned on in Settings
//   absence-review  only once the org has created a mandatory event
// The API routes enforce the strikes rule too; this just decides what the dashboard offers.
export function getQuickActionAvailability(id: QuickActionId, ctx: QuickActionContext): QuickActionAvailability {
  if (id === "strikes" && !ctx.settings?.strikes_enabled) {
    return { available: false, reason: "Turn on strikes in Settings to use this." };
  }
  if (id === "absence-review" && !ctx.hasMandatoryEvents) {
    return { available: false, reason: "Create a mandatory event to use this." };
  }
  return { available: true };
}

export const isQuickActionId = (value: unknown): value is QuickActionId =>
  QUICK_ACTIONS.some((a) => a.id === value);

// Shared by the Email Members form and its API route.
export const EMAIL_LIMITS = { subjectMax: 150, messageMax: 5000 } as const;

// The drag-and-drop data type for a quick action button, separate from whole widgets so dropping
// a button can never add a widget (and vice versa).
export const QUICK_ACTION_DRAG_TYPE = "application/quick-action-id";
