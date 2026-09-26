import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/paymentStatus";

// Badge can't know which axis a status came from — "pending" means pending APPROVAL
// on a coach booking and pending PAYMENT on a registration — so labels are left as
// the raw string. Only where the raw form actively misleads is it overridden, from
// the canonical source rather than a retyped literal.
const LABEL_OVERRIDES: Record<string, string> = {
  refund_pending: PAYMENT_STATUS_LABELS.refund_pending, // "Refund pending" -> "Refund due"
};

export function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    // Canonical payment colours first, so refund_pending / refunded / failed stop
    // falling through to the grey "unknown status" default. Entries below win on
    // the keys both axes share ("pending", "paid").
    ...PAYMENT_STATUS_COLORS,
    pending:           { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
    confirmed:         { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
    approved:          { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
    rejected:          { bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
    cancelled:         { bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
    open:              { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
    full:              { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
    completed:         { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
    active:            { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
    inactive:          { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
    pending_approval:  { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
    paid:              { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
    unpaid:            { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
    Live:              { bg: "rgba(239,68,68,0.15)",   color: "#ef4444" },
    "Registration Open": { bg: "rgba(34,197,94,0.15)", color: "#4ade80" },
  };
  const s = map[status] ?? { bg: "transparent", color: "rgba(255,255,255,0.4)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 100, border: `1px solid ${s.color}`, color: s.color, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
      {status === "Live" && <span style={{ width: 4, height: 4, background: s.color, borderRadius: "50%", display: "inline-block" }} />}
      {LABEL_OVERRIDES[status] ?? status.replace("_", " ")}
    </span>
  );
}
