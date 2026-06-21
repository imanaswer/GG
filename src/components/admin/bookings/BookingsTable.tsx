"use client";
import { Badge } from "@/components/admin/Badge";
import type { CategoryConfig } from "@/lib/adminBookings/config";
import type { BookingRow } from "@/lib/adminBookings/types";

const th = { padding: "10px 12px", fontSize: 10, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: "left" as const };
const td = { padding: "11px 12px", fontSize: 13, color: "#e5e7eb", borderTop: "1px solid rgba(255,255,255,0.05)" };

export function BookingsTable({
  rows, config, selected, onToggle, onView, loading,
  showSelectAll = true, allSelected = false, onToggleAll,
}: {
  rows: BookingRow[];
  config: CategoryConfig;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onView: (r: BookingRow) => void;
  loading?: boolean;
  showSelectAll?: boolean;
  allSelected?: boolean;
  onToggleAll?: () => void;
}) {
  const colSpan = config.columns.length + 3;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 36 }}>
              {showSelectAll && <input type="checkbox" checked={allSelected} onChange={onToggleAll} />}
            </th>
            {config.columns.map(c => <th key={c.key} style={th}>{c.header}</th>)}
            <th style={th}>Status</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td style={td} colSpan={colSpan}>Loading…</td></tr>}
          {!loading && rows.length === 0 && <tr><td style={td} colSpan={colSpan}>No bookings.</td></tr>}
          {rows.map(r => (
            <tr key={r.id}>
              <td style={td}><input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} /></td>
              {config.columns.map(c => <td key={c.key} style={td}>{c.render(r)}</td>)}
              <td style={td}><Badge status={r.status} /></td>
              <td style={td}>
                <button onClick={() => onView(r)} style={{ fontSize: 12, color: "#e63946", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
