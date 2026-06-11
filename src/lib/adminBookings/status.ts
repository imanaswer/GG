import type { CategoryKey } from "./types";

export const CATEGORY_STATUSES: Record<CategoryKey, string[]> = {
  coaches:         ["pending", "approved", "rejected", "completed", "cancelled"],
  "play-sessions": ["joined", "attended", "no-show", "cancelled"],
  workshops:       ["pending", "paid", "failed", "refunded", "cancelled"],
  camps:           ["pending", "paid", "failed", "refunded", "cancelled"],
  events:          ["pending", "paid", "failed", "refunded", "cancelled"],
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment", approved: "Approved", rejected: "Rejected",
  completed: "Completed", cancelled: "Cancelled", paid: "Paid", failed: "Failed",
  refunded: "Refunded", joined: "Joined", attended: "Attended", "no-show": "No-show",
};

export function deriveRegistrationStatus(status: string, paymentStatus: string): string {
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
  if (bucket === "cancelled") return { status: "cancelled" };
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

/** Coach where-fragment is a plain status equality. */
export function coachWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  return { status: bucket };
}
