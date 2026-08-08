import type { CategoryKey } from "./types";
import { PAYMENT_STATUS_LABELS } from "@/lib/paymentStatus";

// `refund_pending` is money Game Ground still holds after a seat was released.
// It used to be invisible here: every self-cancel path writes BOTH status:"cancelled"
// AND paymentStatus:"refund_pending", and the display derivation short-circuited on
// "cancelled" — so a refund due rendered as a plain cancellation and appeared in no
// filter, no count and no screen. It is a bucket of its own now, and it OUTRANKS
// "cancelled" so the money is what you see.
//
// The derive* and *WhereForStatus functions below are duals and must be changed as a
// pair: the derivation decides which bucket a row displays in, the where-fragment
// decides which rows the bucket queries. Drift between them ships a tab that shows a
// count it cannot fill. `status.test.ts` asserts the partition to keep them honest.
const REFUND_DUE = "refund_pending";

export const CATEGORY_STATUSES: Record<CategoryKey, string[]> = {
  coaches:         ["pending", "approved", "rejected", "completed", REFUND_DUE, "cancelled"],
  "play-sessions": ["joined", "attended", "no-show", "cancelled"],
  workshops:       ["pending", "paid", "failed", REFUND_DUE, "refunded", "cancelled"],
  camps:           ["pending", "paid", "failed", REFUND_DUE, "refunded", "cancelled"],
  events:          ["pending", "approved", "rejected", REFUND_DUE, "cancelled"],
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment", approved: "Approved", rejected: "Rejected",
  completed: "Completed", cancelled: "Cancelled", paid: "Paid", failed: "Failed",
  refunded: "Refunded", joined: "Joined", attended: "Attended", "no-show": "No-show",
  // Sourced, not retyped — one wording for "Refund due" across admin and profile.
  [REFUND_DUE]: PAYMENT_STATUS_LABELS.refund_pending,
};

export function deriveRegistrationStatus(status: string, paymentStatus: string): string {
  if (paymentStatus === REFUND_DUE) return REFUND_DUE; // outranks "cancelled" — see above
  if (status === "cancelled") return "cancelled";
  return paymentStatus; // pending | paid | failed | refunded
}

export function deriveGamePlayerStatus(status: string, attended: boolean | null): string {
  if (status === "cancelled") return "cancelled";
  if (attended === true) return "attended";
  if (attended === false) return "no-show";
  return "joined";
}

/** Prisma where-fragment for a registration model (camp/event/workshop). */
export function registrationWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  // Must NOT exclude cancelled: every refund-due row is also cancelled.
  if (bucket === REFUND_DUE) return { paymentStatus: REFUND_DUE };
  // ...and conversely "cancelled" must give those rows up, or they'd be counted twice.
  if (bucket === "cancelled") return { status: "cancelled", paymentStatus: { not: REFUND_DUE } };
  return { status: { not: "cancelled" }, paymentStatus: bucket };
}

/** Prisma where-fragment for GamePlayer. */
export function gamePlayerWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  if (bucket === "cancelled") return { status: "cancelled" };
  if (bucket === "attended")  return { status: { not: "cancelled" }, attended: true };
  if (bucket === "no-show")   return { status: { not: "cancelled" }, attended: false };
  return { status: { not: "cancelled" }, attended: null }; // joined
}

/**
 * Coach where-fragment: a plain status equality, plus the `active` pseudo-status.
 * Booking carries its own paymentStatus axis (unpaid | paid | refund_pending), so
 * refund-due is a payment filter here, not a status one.
 */
export function coachWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  if (bucket === REFUND_DUE) return { paymentStatus: REFUND_DUE };
  if (bucket === "active") return { status: { in: ["pending", "approved"] } };
  return { status: bucket, paymentStatus: { not: REFUND_DUE } };
}

/**
 * Coach display-status is the booking status, unless money is owed — same rule as
 * registrations, kept as its own function because Booking.paymentStatus is a
 * different axis (unpaid | paid | refund_pending) from a registration's.
 */
export function deriveCoachBookingStatus(status: string, paymentStatus: string): string {
  if (paymentStatus === REFUND_DUE) return REFUND_DUE;
  return status;
}

/** Events use an approval axis (status), with payment shown as a separate column. */
export const EVENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  [REFUND_DUE]: PAYMENT_STATUS_LABELS.refund_pending,
};

/** Filter fragment for the events approval axis. */
export function eventWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  if (bucket === REFUND_DUE) return { paymentStatus: REFUND_DUE };
  return { status: bucket, paymentStatus: { not: REFUND_DUE } };
}

/**
 * Events display-status IS the approval status — except when money is owed, which
 * outranks it. `paymentStatus` is optional so existing single-argument callers keep
 * compiling; pass it to get the refund-due bucket.
 */
export function deriveEventRegistrationStatus(status: string, paymentStatus?: string): string {
  if (paymentStatus === REFUND_DUE) return REFUND_DUE;
  return status;
}
