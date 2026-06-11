"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/admin/Badge";
import { SummaryCards } from "./SummaryCards";
import { BookingsToolbar, type ToolbarState } from "./BookingsToolbar";
import { BulkActionBar } from "./BulkActionBar";
import { BookingDrawer } from "./BookingDrawer";
import type { CategoryConfig } from "@/lib/adminBookings/config";
import type { BookingRow, ListResponse } from "@/lib/adminBookings/types";
import type { BookingAction } from "@/lib/adminBookings/actions";

const PAGE_SIZE = 25;

export function BookingsCategoryView({ config }: { config: CategoryConfig }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [tb, setTb] = useState<ToolbarState>({ q: "", date: "all", from: "", to: "", sort: "newest" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<BookingRow | null>(null);

  const params = new URLSearchParams({
    status, page: String(page), pageSize: String(PAGE_SIZE), sort: tb.sort, date: tb.date,
    ...(tb.q ? { q: tb.q } : {}), ...(tb.date === "custom" ? { from: tb.from, to: tb.to } : {}),
  });
  const queryKey = ["admin", "bookings", config.key, params.toString()];
  const { data, isLoading } = useQuery<ListResponse>({
    queryKey, queryFn: () => fetch(`${config.apiPath}?${params}`).then(r => r.json()),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "bookings"] });

  const runAction = async (ids: string[], action: BookingAction, rejectionReason?: string) => {
    const r = await fetch(config.apiPath, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, rejectionReason }),
    });
    const body = await r.json();
    if (!r.ok) { toast.error(body.error ?? "Action failed"); return; }
    const failed = (body.results ?? []).filter((x: any) => !x.ok);
    if (failed.length) toast.error(`${failed.length} failed: ${failed[0].error}`);
    else toast.success("Done.");
    setSelected(new Set()); refresh();
  };

  const exportCsv = () => {
    const csvParams = new URLSearchParams(params); csvParams.set("format", "csv");
    window.open(`${config.apiPath}?${csvParams}`, "_blank");
  };

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const th = { padding: "10px 12px", fontSize: 10, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: "left" as const };
  const td = { padding: "11px 12px", fontSize: 13, color: "#e5e7eb", borderTop: "1px solid rgba(255,255,255,0.05)" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{config.label} Bookings</h1>
      <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 18 }}>Showing {data?.total ?? 0} bookings</p>

      <SummaryCards counts={data?.counts ?? []} active={status} onPick={s => { setStatus(s); setPage(1); }} />
      <BookingsToolbar state={tb} onChange={s => { setTb(s); setPage(1); }} onExport={exportCsv} />

      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 36 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              {config.columns.map(c => <th key={c.key} style={th}>{c.header}</th>)}
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td style={td} colSpan={config.columns.length + 3}>Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td style={td} colSpan={config.columns.length + 3}>No bookings.</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <td style={td}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                {config.columns.map(c => <td key={c.key} style={td}>{c.render(r)}</td>)}
                <td style={td}><Badge status={r.status} /></td>
                <td style={td}>
                  <button onClick={() => setDrawer(r)} style={{ fontSize: 12, color: "#e63946", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ fontSize: 12, color: page <= 1 ? "#4b5563" : "#e5e7eb", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", cursor: page <= 1 ? "default" : "pointer" }}>Prev</button>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ fontSize: 12, color: page >= totalPages ? "#4b5563" : "#e5e7eb", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", cursor: page >= totalPages ? "default" : "pointer" }}>Next</button>
      </div>

      <BulkActionBar
        count={selected.size} actions={config.bulkActions}
        onRun={(a) => runAction([...selected], a)} onClear={() => setSelected(new Set())}
      />

      {drawer && (
        <BookingDrawer
          row={drawer} actions={config.rowActions}
          onAction={async (a, reason) => { await runAction([drawer.id], a, reason); setDrawer(null); }}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
