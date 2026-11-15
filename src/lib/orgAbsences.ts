// Absence requests for an org's events, as the Review Absences quick action shows them.
// Safe to import from client components.

export type AbsenceStatus = "PENDING" | "APPROVED" | "DENIED";

export type AbsenceRequest = {
  id: string;
  memberName: string;
  memberEmail: string | null;
  eventName: string;
  eventDate: string | null;
  reason: string;
  imageUrl: string | null;
  submittedAt: string | null;
  status: AbsenceStatus;
  adminResponse: string | null;
  reviewedAt: string | null;
  emailSent: boolean | null;
  emailError: string | null;
};

export const ABSENCE_RESPONSE_MAX = 1000;
