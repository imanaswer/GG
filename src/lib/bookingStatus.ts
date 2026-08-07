// Pure booking status state machine. No Prisma / IO imports — keep it unit-testable.

export const BOOKING_STATUSES = ["pending", "approved", "rejected", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Statuses no transition can leave.
export const TERMINAL_STATUSES: BookingStatus[] = ["rejected", "completed", "cancelled"];

// Statuses that count toward business metrics (coach stats, revenue, analytics).
export const BILLABLE_STATUSES: BookingStatus[] = ["approved", "completed"];

export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
};

// Audit column stamped when a booking enters a given status.
export const STATUS_TIMESTAMP: Record<
  BookingStatus,
  "approvedAt" | "rejectedAt" | "completedAt" | "cancelledAt" | null
> = {
  pending: null,
  approved: "approvedAt",
  rejected: "rejectedAt",
  completed: "completedAt",
  cancelled: "cancelledAt",
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class BookingTransitionError extends Error {
  readonly code = "INVALID_TRANSITION";
  constructor(from: string, to: string) {
    super(`Cannot change booking from "${from}" to "${to}"`);
    this.name = "BookingTransitionError";
  }
}

export class BookingConflictError extends Error {
  readonly code = "BOOKING_CONFLICT";
  constructor(message = "A conflicting approved booking already exists for this slot") {
    super(message);
    this.name = "BookingConflictError";
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new BookingTransitionError(from, to);
}

/**
 * The held seat returns to inventory once the booking is over — however it ended.
 *
 * `completed` belongs here. It was previously excluded, so a finished enrollment
 * held its seat forever: with auto-complete running, every coach would drain to
 * "All seats taken" permanently and drop out of `/api/coaches?available=1`.
 */
export function releasesSeat(to: BookingStatus): boolean {
  return to === "cancelled" || to === "rejected" || to === "completed";
}

/**
 * The money goes back — the booking ended WITHOUT the service being delivered.
 *
 * Deliberately a different set from releasesSeat: a completed booking frees the
 * seat but was delivered, so nothing is owed. Collapsing the two would refund
 * every coaching session that ran to its end.
 */
export function refundsPayment(to: BookingStatus): boolean {
  return to === "cancelled" || to === "rejected";
}
