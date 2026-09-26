"use client";
import Link from "next/link";
import { Ticket, X } from "lucide-react";
import type { ProfileRegItem } from "@/hooks/useData";
import { canCancelEventRegistration } from "@/lib/profileGrouping";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, isPaymentStatus } from "@/lib/paymentStatus";

// Approval-axis labels/colors for the registration's `status`. Kept local so the
// profile UI doesn't depend on the admin bookings lib.
const APPROVAL: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "Pending approval", bg: "rgba(234,179,8,0.15)",  color: "#eab308" },
  approved:  { label: "Approved",         bg: "rgba(34,197,94,0.15)",  color: "#4ade80" },
  rejected:  { label: "Rejected",         bg: "rgba(255,255,255,0.15)",  color: "#fff" },
  cancelled: { label: "Cancelled",        bg: "rgba(107,114,128,0.15)",color: "#9ca3af" },
};

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: bg, color }}>{label}</span>;
}

export function EventRegCard({ reg, onCancel, cancelling }: {
  reg: ProfileRegItem;
  onCancel: (eventId: string) => void;
  cancelling: boolean;
}) {
  const approval = APPROVAL[reg.status] ?? { label: reg.status, bg: "rgba(255,255,255,0.07)", color: "#9ca3af" };
  const isFree = (reg.entryFeeAmount ?? 0) === 0;
  const pay = isFree
    ? { label: "Free", bg: "rgba(107,114,128,0.15)", color: "#9ca3af" }
    : (isPaymentStatus(reg.paymentStatus) ? { label: PAYMENT_STATUS_LABELS[reg.paymentStatus], ...PAYMENT_STATUS_COLORS[reg.paymentStatus] } : null);
  const canCancel = !!reg.entityId && canCancelEventRegistration({ status: reg.status, startDate: reg.startDate }, new Date());
  const showTicket = reg.status === "approved" && !!reg.entityId;

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{reg.title}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            {reg.startDate ? new Date(reg.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill label={approval.label} bg={approval.bg} color={approval.color} />
          {pay && <Pill label={pay.label} bg={pay.bg} color={pay.color} />}
        </div>
      </div>

      {reg.status === "rejected" && reg.rejectionReason && (
        <div style={{ fontSize: 11.5, color: "rgba(248,113,113,0.85)" }}>Reason: {reg.rejectionReason}</div>
      )}

      {(showTicket || canCancel) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {showTicket && (
            <Link href={`/events/${reg.entityId}/ticket`} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 100, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", color: "#ff6b74", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              <Ticket size={13} /> Download ticket
            </Link>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => { if (reg.entityId && confirm("Cancel your registration for this event?")) onCancel(reg.entityId); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 100, background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: cancelling ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: cancelling ? 0.6 : 1 }}>
              <X size={13} /> {cancelling ? "Cancelling…" : "Cancel registration"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
