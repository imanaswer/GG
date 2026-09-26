"use client";
import type { StatusCount } from "@/lib/adminBookings/types";
import { STATUS_LABELS } from "@/lib/adminBookings/status";

export function SummaryCards({
  counts, active, onPick, labels,
}: { counts: StatusCount[]; active: string; onPick: (status: string) => void; labels?: Record<string, string> }) {
  const total = counts.reduce((a, c) => a + c.count, 0);
  const items = [{ status: "all", count: total }, ...counts];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`, gap: 10, marginBottom: 18 }}>
      {items.map(({ status, count }) => {
        const sel = active === status;
        return (
          <button key={status} onClick={() => onPick(status)} style={{
            textAlign: "left", background: sel ? "rgba(255,255,255,0.10)" : "#0d0d0d",
            border: `1px solid ${sel ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 12, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{count}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>
              {status === "all" ? "All" : (labels?.[status] ?? STATUS_LABELS[status] ?? status)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
