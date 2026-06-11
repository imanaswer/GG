export type CategoryKey = "coaches" | "play-sessions" | "workshops" | "camps" | "events";

/** A single normalized row shown in any category table. Category-specific
 *  fields live in `extra`. */
export interface BookingRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  entityName: string;          // coach/game/workshop/camp/event name
  status: string;              // the derived display-status bucket key
  createdAt: string;           // ISO — booking/registration creation
  updatedAt: string | null;    // ISO
  sessionDate: string | null;  // ISO — session/event date for "upcoming" sort
  extra: Record<string, string>; // batch/sport/child/team/participant, etc.
  payment: PaymentInfo | null;
}

export interface PaymentInfo {
  amount: number;
  currency: string;
  status: string;
  razorpayPaymentId: string | null;
  paidAt: string | null;
}

export interface StatusCount { status: string; count: number; }

export interface ListResponse {
  rows: BookingRow[];
  total: number;        // total matching the filter (for pagination)
  page: number;
  pageSize: number;
  counts: StatusCount[];// per-status counts over the filtered set (excl. status filter)
}

export interface LandingMetrics {
  total: number;
  pending: number | null;   // null => render "—"
  active: number;
  completed: number;
  cancelled: number;
}

export type SortKey = "newest" | "oldest" | "upcoming" | "updated";
export type DatePreset = "all" | "today" | "tomorrow" | "upcoming" | "past" | "custom";
export type DateAxis = "session" | "booking";
