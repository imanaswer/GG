"use client";
import { useState } from "react";
import type { BookingAction } from "@/lib/adminBookings/actions";

export interface BulkActionDef { action: BookingAction; label: string; danger?: boolean; }

export function BulkActionBar({
  count, actions, onRun, onClear,
}: { count: number; actions: BulkActionDef[]; onRun: (a: BookingAction) => Promise<void>; onClear: () => void }) {
  const [pending, setPending] = useState<BookingAction | null>(null);
  if (count === 0) return null;

  const run = async (a: BulkActionDef) => {
    if (!confirm(`${a.label} ${count} selected booking(s)? This cannot be undone.`)) return;
    setPending(a.action);
    try { await onRun(a.action); } finally { setPending(null); }
  };

  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 20, marginTop: 12,
      display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
      background: "#141414", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
    }}>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{count} selected</span>
      <button onClick={onClear} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        {actions.map(a => (
          <button key={a.action} disabled={pending !== null} onClick={() => run(a)} style={{
            height: 34, padding: "0 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
            fontFamily: "inherit", cursor: pending ? "wait" : "pointer", border: "none",
            background: a.danger ? "rgba(239,68,68,0.15)" : "#4ade80",
            color: a.danger ? "#ef4444" : "#000",
          }}>{pending === a.action ? "Working…" : a.label}</button>
        ))}
      </div>
    </div>
  );
}
