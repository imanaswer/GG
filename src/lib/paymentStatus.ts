/** Canonical payment statuses — the single source of truth. Never inline these strings. */
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending payment",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; color: string }> = {
  pending:  { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
  paid:     { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
  failed:   { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  refunded: { bg: "rgba(168,85,247,0.15)",  color: "#c084fc" },
};
