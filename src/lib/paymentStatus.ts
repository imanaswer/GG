/** Canonical payment statuses — the single source of truth. Never inline these strings.
 *
 * `refund_pending` is the honest middle state: the registration is cancelled and
 * the seat released, but the money is still with Game Ground until someone sends
 * it back. Cancel paths used to delete the row outright, which destroyed the only
 * evidence a refund was owed. Admin's "mark-refunded" closes it out. */
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refund_pending", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending payment",
  paid: "Paid",
  failed: "Failed",
  refund_pending: "Refund due",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; color: string }> = {
  pending:  { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
  paid:     { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
  failed:   { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  refund_pending: { bg: "rgba(249,115,22,0.15)", color: "#fb923c" },
  refunded: { bg: "rgba(168,85,247,0.15)",  color: "#c084fc" },
};
