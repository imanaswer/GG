"use client";
import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, ChevronDown, ChevronUp } from "lucide-react";

type Booking = { id:string; playerName?:string; playerEmail?:string; playerPhone?:string; coachName?:string; coachSport?:string; batchInfo?:string; status:string; note?:string; coachNote?:string; createdAt:string };

const SPORTS  = ["Basketball","Football","Badminton","Cricket","Tennis","Fitness"];
const PGSIZE  = 25;

function exportCSV(data: Booking[]) {
  const header = ["ID","Player","Email","Coach","Sport","Batch","Status","Note","Date"];
  const rows   = data.map(b => [b.id, b.playerName, b.playerEmail, b.coachName, b.coachSport, b.batchInfo, b.status, b.note ?? "", new Date(b.createdAt).toLocaleDateString("en-IN")]);
  const csv    = [header, ...rows].map(r => r.map(c => `"${c ?? ""}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv])); a.download = "bookings.csv"; a.click();
}

export default function AdminBookings() {
  const qc = useQueryClient();
  const [q,       setQ]       = useState("");
  const [status,  setStatus]  = useState("all");
  const [sport,   setSport]   = useState("all");
  const [page,    setPage]    = useState(1);
  const [drawer,  setDrawer]  = useState<Booking | null>(null);

  const params  = new URLSearchParams({ q, status, sport }).toString();
  const { data } = useQuery<{ bookings: Booking[]; total: number }>({
    queryKey: ["admin-bookings", q, status, sport],
    queryFn: () => fetch(`/api/admin/bookings?${params}`).then(r => r.json()),
  });

  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  const bookings = data?.bookings ?? [];
  const paged    = bookings.slice((page - 1) * PGSIZE, page * PGSIZE);
  const pages    = Math.ceil(bookings.length / PGSIZE);

  const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };
  const tdStyle: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Bookings</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>Showing {bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => exportCSV(bookings)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Download size={14} />Export CSV
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <Search size={14} color="#6b7280" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search player or coach…" style={{ width: "100%", height: 38, paddingLeft: 36, paddingRight: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            {[{ val: status, set: setStatus, opts: ["all","pending","confirmed","cancelled"], label: "Status" },
              { val: sport,  set: setSport,  opts: ["all", ...SPORTS], label: "Sport" }
            ].map(({ val, set, opts, label }) => (
              <select key={label} value={val} onChange={e => { set(e.target.value); setPage(1); }} style={{ height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: val === "all" ? "#6b7280" : "#fff", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${label}s` : o}</option>)}
              </select>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>
                    {["Booking ID","Player","Coach / Academy","Batch","Status","Note","Booked On","Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {!paged.length ? (
                    <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: 14 }}>No bookings found</td></tr>
                  ) : paged.map(b => (
                    <tr key={b.id} onClick={() => setDrawer(b)} style={{ cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                    >
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{b.id}</td>
                      <td style={tdStyle}><span style={{ fontWeight: 600, color: "#fff" }}>{b.playerName}</span></td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>{b.coachName}</span>
                        {b.coachSport && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{b.coachSport}</span>}
                      </td>
                      <td style={{ ...tdStyle, color: "#9ca3af" }}>{b.batchInfo}</td>
                      <td style={tdStyle}><Badge status={b.status} /></td>
                      <td style={{ ...tdStyle, color: "#9ca3af", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.note ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {b.status === "pending" && (
                            <button onClick={() => patch.mutate({ id: b.id, status: "confirmed" })} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
                          )}
                          {b.status !== "cancelled" && (
                            <button onClick={() => patch.mutate({ id: b.id, status: "cancelled" })} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#f87171", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "#6b7280" }}>
              <span>Page {page} of {pages} · {bookings.length} total</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={page === 1}     onClick={() => setPage(p => p - 1)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: page === 1 ? "#4b5563" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13 }}>← Prev</button>
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: page === pages ? "#4b5563" : "#fff", cursor: page === pages ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13 }}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer */}
        {drawer && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }} onClick={() => setDrawer(null)}>
            <div style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} />
            <div style={{ width: 360, background: "#141414", borderLeft: "1px solid rgba(255,255,255,0.1)", padding: "24px", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Booking Detail</h2>
                <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <Badge status={drawer.status} />
              {[
                ["Booking ID", drawer.id],
                ["Player",     drawer.playerName],
                ["Email",      drawer.playerEmail],
                ["Phone",      drawer.playerPhone],
                ["Coach",      drawer.coachName],
                ["Sport",      drawer.coachSport],
                ["Batch",      drawer.batchInfo],
                ["Note",       drawer.note],
                ["Coach Note", drawer.coachNote],
                ["Booked",     new Date(drawer.createdAt).toLocaleString("en-IN")],
              ].map(([l, v]) => v && (
                <div key={l as string} style={{ paddingBottom: 10, marginTop: 14, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{l}</p>
                  <p style={{ fontSize: 13, color: "#e5e7eb", wordBreak: "break-all" }}>{v}</p>
                </div>
              ))}
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {drawer.status === "pending" && <button onClick={() => { patch.mutate({ id: drawer.id, status: "confirmed" }); setDrawer(null); }} style={{ height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Confirm Booking</button>}
                {drawer.status !== "cancelled" && <button onClick={() => { patch.mutate({ id: drawer.id, status: "cancelled" }); setDrawer(null); }} style={{ height: 40, borderRadius: 9, fontSize: 13, fontWeight: 600, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>Cancel Booking</button>}
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </AdminGuard>
  );
}
