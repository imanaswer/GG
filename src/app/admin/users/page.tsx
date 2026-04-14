"use client";
import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { useQuery }    from "@tanstack/react-query";
import { Search } from "lucide-react";

type User = { id:string; name:string; username:string; role:string; location?:string; gamesPlayed:number; bookings:number; reliabilityScore:number; attendanceRate:number; createdAt:string; activity:number; phone?:string };

const SEGMENTS = [{ val: "all", label: "All Users" }, { val: "active", label: "Most Active" }, { val: "new", label: "New This Week" }, { val: "inactive", label: "Inactive" }];

export default function AdminUsers() {
  const [segment, setSegment] = useState("all");
  const [q, setQ] = useState("");
  const { data } = useQuery<{ users: User[]; total: number }>({ queryKey: ["admin-users", segment], queryFn: () => fetch(`/api/admin/users?segment=${segment}`).then(r => r.json()) });

  const filtered = (data?.users ?? []).filter(u => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()));

  const rateColor = (r: number) => r >= 90 ? "#4ade80" : r >= 70 ? "#eab308" : "#ef4444";
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Users & Players</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{data?.total ?? 0} users</p>
            </div>
          </div>

          {/* Segment tabs */}
          <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20 }}>
            {SEGMENTS.map(s => (
              <button key={s.val} onClick={() => setSegment(s.val)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: segment === s.val ? 700 : 500, border: "none", cursor: "pointer", fontFamily: "inherit", background: segment === s.val ? "#1c1c1c" : "transparent", color: segment === s.val ? "#fff" : "#6b7280" }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
            <Search size={14} color="#6b7280" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or username…" style={{ width: "100%", height: 38, paddingLeft: 36, paddingRight: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1c1c", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Name","Username","Role","Location","Games","Bookings","Reliability","Attendance","Joined"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!filtered.length ? (
                    <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No users found</td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.id}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e63946", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{u.name[0]}</div>
                          <span style={{ fontWeight: 600, color: "#fff" }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ ...td, color: "#6b7280" }}>@{u.username}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(96,165,250,0.12)", color: "#60a5fa", textTransform: "capitalize" }}>{u.role}</span></td>
                      <td style={{ ...td, color: "#9ca3af", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.location ?? "—"}</td>
                      <td style={{ ...td, textAlign: "center" }}>{u.gamesPlayed}</td>
                      <td style={{ ...td, textAlign: "center" }}>{u.bookings}</td>
                      <td style={{ ...td, color: "#eab308", fontWeight: 700 }}>★ {u.reliabilityScore.toFixed(1)}</td>
                      <td style={{ ...td, color: rateColor(u.attendanceRate), fontWeight: 600 }}>{u.attendanceRate.toFixed(0)}%</td>
                      <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
