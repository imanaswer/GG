"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SummaryCards } from "./SummaryCards";
import { BookingsToolbar, type ToolbarState } from "./BookingsToolbar";
import { BulkActionBar } from "./BulkActionBar";
import { BookingDrawer } from "./BookingDrawer";
import type { CategoryConfig } from "@/lib/adminBookings/config";
import type { BookingRow, ListResponse } from "@/lib/adminBookings/types";
import type { BookingAction } from "@/lib/adminBookings/actions";
import { BookingsTable } from "./BookingsTable";
import { bucketRows, BUCKET_ORDER, BUCKET_LABELS } from "@/lib/adminBookings/grouping";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { DatePreset } from "@/lib/adminBookings/types";
import { STATUS_LABELS, CATEGORY_STATUSES } from "@/lib/adminBookings/status";

const PAGE_SIZE = 25;

export function BookingsCategoryView({ config }: { config: CategoryConfig }) {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const DATE_PRESETS = ["all", "today", "tomorrow", "upcoming", "past", "custom"];
  const initialDate = (DATE_PRESETS.includes(searchParams.get("date") ?? "") ? searchParams.get("date") : "upcoming") as DatePreset;

  // Seed filters from the URL once on mount (one-way seed, not two-way sync:
  // later SummaryCards/toolbar interactions own the state and don't rewrite the URL).
  const validStatuses = ["all", ...CATEGORY_STATUSES[config.key], ...(config.key === "coaches" ? ["active"] : [])];
  const rawStatus = searchParams.get("status") ?? "all";
  const initialStatus = validStatuses.includes(rawStatus) ? rawStatus : "all";

  const [status, setStatus] = useState(() => initialStatus);
  const [page, setPage] = useState(1);
  const [tb, setTb] = useState<ToolbarState>(() => ({ q: "", date: initialDate, from: "", to: "", sort: "upcoming", by: "session", group: "day" }));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<BookingRow | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["past"]));

  const filterChips: string[] = [];
  if (status === "active") filterChips.push("Pending + Approved");
  else if (status !== "all") filterChips.push(config.statusLabels?.[status] ?? STATUS_LABELS[status] ?? status);
  if (tb.date === "all") filterChips.push("All dates");

  const clearFilters = () => {
    setStatus("all");
    setTb(t => ({ ...t, date: "upcoming" }));
    setPage(1);
    router.replace(pathname);
  };

  const params = new URLSearchParams({
    status, page: String(page), pageSize: String(PAGE_SIZE), sort: tb.sort, date: tb.date, by: tb.by,
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
    const failed = (body.results ?? []).filter((x: { ok: boolean; error?: string }) => !x.ok);
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

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{config.label} Bookings</h1>
      <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 18 }}>Showing {data?.total ?? 0} bookings</p>

      {filterChips.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Filtered:</span>
          {filterChips.map(c => (
            <span key={c} style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(152,8,8,0.12)", color: "#fca5a5", border: "1px solid rgba(152,8,8,0.3)" }}>{c}</span>
          ))}
          <button onClick={clearFilters} style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear</button>
        </div>
      )}

      <SummaryCards counts={data?.counts ?? []} active={status} onPick={s => { setStatus(s); setPage(1); }} labels={config.statusLabels} />
      <BookingsToolbar state={tb} onChange={s => { setTb(s); setPage(1); }} onExport={exportCsv} dateMode={config.dateMode} />

      {tb.group === "off" ? (
        <BookingsTable
          rows={rows} config={config} selected={selected} onToggle={toggle}
          onView={setDrawer} loading={isLoading}
          allSelected={allSelected} onToggleAll={toggleAll}
        />
      ) : (
        (() => {
          const buckets = bucketRows(rows, config.dateMode, new Date());
          const visible = BUCKET_ORDER.filter(b => buckets[b].length > 0);
          if (!isLoading && visible.length === 0) {
            return <BookingsTable rows={[]} config={config} selected={selected} onToggle={toggle} onView={setDrawer} loading={isLoading} showSelectAll={false} />;
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {visible.map(b => {
                const isOpen = !collapsed.has(b);
                return (
                  <div key={b}>
                    <button
                      onClick={() => setCollapsed(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; })}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 6 }}
                    >
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{isOpen ? "▼" : "▶"}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{BUCKET_LABELS[b]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(152,8,8,0.15)", color: "#980808" }}>{buckets[b].length}</span>
                    </button>
                    {isOpen && (
                      <BookingsTable
                        rows={buckets[b]} config={config} selected={selected}
                        onToggle={toggle} onView={setDrawer} showSelectAll={false}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()
      )}

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
