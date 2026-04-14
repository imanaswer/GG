"use client";
import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { useQuery }    from "@tanstack/react-query";
import { Download }    from "lucide-react";

type Reg = { id:string; parentName?:string; parentEmail?:string; parentPhone?:string; childName:string; childAge:number; campTitle?:string; campSport?:string; registeredAt:string };
type Camp = { id:string; title:string; sport:string; participants:number; maxParticipants:number; registrationDeadline:string; status:string };

function exportCSV(data: Reg[], campTitle = "all") {
  const rows = data.map(r => [`"${r.id}"`,`"${r.parentName}"`,`"${r.parentEmail}"`,`"${r.parentPhone ?? ""}"`,`"${r.childName}"`,r.childAge,`"${r.campTitle}"`,`"${new Date(r.registeredAt).toLocaleDateString("en-IN")}"`].join(","));
  const csv = [`"ID","Parent","Email","Phone","Child","Age","Camp","Date"`, ...rows].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv])); a.download = `registrations-${campTitle}.csv`; a.click();
}

export default function AdminCamps() {
  const { data } = useQuery<{ registrations: Reg[]; camps: Camp[] }>({ queryKey: ["admin-camps"], queryFn: () => fetch("/api/admin/camps").then(r => r.json()) });
  const [campFilter, setCampFilter] = useState("all");
  const camps = data?.camps ?? [];
  const regs  = (data?.registrations ?? []).filter(r => campFilter === "all" || r.campTitle === campFilter);

  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>Camps Manager</h1>
            <button onClick={() => exportCSV(regs, campFilter)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Download size={14} />Export CSV
            </button>
          </div>

          {/* Camp overview cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            {camps.map(c => {
              const pct = Math.round((c.participants / c.maxParticipants) * 100);
              return (
                <div key={c.id} style={{ background: "#141414", border: `1px solid ${campFilter === c.title ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer" }} onClick={() => setCampFilter(f => f === c.title ? "all" : c.title)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{c.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{c.sport}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#e63946" }}>{c.participants}/{c.maxParticipants}</div>
                  <div style={{ height: 4, background: "#1c1c1c", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>Deadline: {new Date(c.registrationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{regs.length} registration{regs.length !== 1 ? "s" : ""}</span>
            {campFilter !== "all" && <button onClick={() => setCampFilter("all")} style={{ fontSize: 12, color: "#e63946", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>✕ Clear filter</button>}
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["ID","Parent / Guardian","Child Name","Age","Camp","Registered On","Payment"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!regs.length ? (
                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No registrations found</td></tr>
                  ) : regs.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{r.id}</td>
                      <td style={td}><div style={{ fontWeight: 600, color: "#fff" }}>{r.parentName}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{r.parentEmail}</div></td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.childName}</td>
                      <td style={{ ...td, color: "#9ca3af" }}>{r.childAge} yrs</td>
                      <td style={td}>{r.campTitle}</td>
                      <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(r.registeredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: "rgba(234,179,8,0.12)", color: "#eab308" }}>Pending</span></td>
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
