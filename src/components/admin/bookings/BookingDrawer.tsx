"use client";
import { useState } from "react";
import { Badge } from "@/components/admin/Badge";
import type { BookingRow } from "@/lib/adminBookings/types";
import type { BookingAction } from "@/lib/adminBookings/actions";
import { bookingRef } from "@/lib/bookingRef";

export interface RowActionDef { action: BookingAction; label: string; danger?: boolean; needsReason?: boolean; }

function Field({ label, value, sub }: { label: string; value?: string | null; sub?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ paddingBottom: 10, marginTop: 14, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, color: "#e5e7eb", wordBreak: "break-all" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace", wordBreak: "break-all", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

export function BookingDrawer({
  row, actions, onAction, onClose,
}: { row: BookingRow; actions: RowActionDef[]; onAction: (a: BookingAction, reason?: string) => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-IN") : null;

  const run = async (a: RowActionDef) => {
    let reason: string | undefined;
    if (a.needsReason) { reason = prompt("Reason (shown to the user):") ?? undefined; }
    if (a.danger && !confirm(`${a.label}?`)) return;
    setBusy(true);
    try { await onAction(a.action, reason); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ width: 380, maxWidth: "100vw", background: "#0d0d0d", borderLeft: "1px solid rgba(255,255,255,0.1)", padding: 22, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Booking Detail</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <Badge status={row.status} />

        <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>User Information</p>
        <Field label="Name" value={row.userName} />
        <Field label="Email" value={row.userEmail} />
        <Field label="Phone" value={row.userPhone} />

        <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>Booking Information</p>
        <Field label="Booking ID" value={bookingRef(row.id)} sub={row.id} />
        <Field label="Entity" value={row.entityName} />
        {Object.entries(row.extra).map(([k, v]) => <Field key={k} label={k} value={v || null} />)}

        {row.payment && (
          <>
            <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>Payment Information</p>
            <Field label="Amount" value={`₹${(row.payment.amount / 100).toLocaleString("en-IN")} ${row.payment.currency}`} />
            <Field label="Status" value={row.payment.status} />
            <Field label="Razorpay Payment" value={row.payment.razorpayPaymentId} />
            <Field label="Paid At" value={fmt(row.payment.paidAt)} />
          </>
        )}

        <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>Timestamps</p>
        <Field label="Created" value={fmt(row.createdAt)} />
        <Field label="Updated" value={fmt(row.updatedAt)} />
        {row.sessionDate && <Field label="Session/Event date" value={fmt(row.sessionDate)} />}

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.map(a => (
            <button key={a.action} disabled={busy} onClick={() => run(a)} style={{
              height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              cursor: busy ? "wait" : "pointer",
              border: a.danger ? "1px solid rgba(239,68,68,0.3)" : "none",
              background: a.danger ? "rgba(239,68,68,0.1)" : "#4ade80",
              color: a.danger ? "#ef4444" : "#000",
            }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
