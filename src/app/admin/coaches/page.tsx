"use client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

type Coach = { id:string; name:string; sport:string; type:string; location:string; price:string; priceMin:number; priceMax:number; seatsLeft:number; totalSeats:number; rating:number; reviewCount:number; status:string; totalBookings:number; confirmedBookings:number; revenue:number };

export default function AdminCoaches() {
  const qc = useQueryClient();
  const { data } = useQuery<{ coaches: Coach[] }>({ queryKey: ["admin-coaches"], queryFn: () => fetch("/api/admin/coaches").then(r => r.json()) });
  const approve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      fetch(`/api/coaches/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coaches"] }),
  });

  const coaches = data?.coaches ?? [];
  const pending = coaches.filter(c => c.status === "pending_approval");
  const active  = coaches.filter(c => c.status === "active");
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 24 }}>Coaches Manager</h1>

          {/* Pending approval */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#eab308" }}>Pending Approval</h2>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 100, background: "rgba(234,179,8,0.15)", color: "#eab308" }}>{pending.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {pending.map(c => (
                  <div key={c.id} style={{ background: "#141414", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{c.name}</p>
                        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{c.sport} · {c.type} · {c.location}</p>
                      </div>
                      <Badge status="pending_approval" />
                    </div>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>₹{c.priceMin.toLocaleString()}–{c.priceMax.toLocaleString()}/session</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => approve.mutate({ id: c.id, action: "approve" })} style={{ flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Approve</button>
                      <button onClick={() => approve.mutate({ id: c.id, action: "reject" })}  style={{ flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All coaches table */}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14 }}>All Coaches ({active.length} active)</h2>
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Coach / Academy","Type","Location","Price","Seats","Bookings","Rating","Status","Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!coaches.length ? (
                    <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No coaches</td></tr>
                  ) : coaches.map(c => {
                    const pct = Math.round(((c.totalSeats - c.seatsLeft) / c.totalSeats) * 100);
                    return (
                      <tr key={c.id}>
                        <td style={td}>
                          <div style={{ fontWeight: 700, color: "#fff" }}>{c.name}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{c.sport}</span>
                        </td>
                        <td style={{ ...td, color: "#9ca3af" }}>{c.type}</td>
                        <td style={{ ...td, color: "#9ca3af", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.location}</td>
                        <td style={{ ...td, color: "#9ca3af" }}>{c.price}</td>
                        <td style={td}>
                          <div style={{ fontSize: 12, marginBottom: 3 }}>{c.seatsLeft}/{c.totalSeats}</div>
                          <div style={{ height: 3, background: "#1c1c1c", borderRadius: 99, width: 60, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                          </div>
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>{c.confirmedBookings}/{c.totalBookings}</td>
                        <td style={{ ...td, color: "#eab308" }}>★ {c.rating.toFixed(1)} ({c.reviewCount})</td>
                        <td style={td}><Badge status={c.status} /></td>
                        <td style={td}>
                          <Link href={`/coach/${c.id}`} target="_blank" style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}>View →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
