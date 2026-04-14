"use client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { Badge }       from "@/components/admin/Badge";
import { useQuery }    from "@tanstack/react-query";

type Reg = { id:string; playerName?:string; playerEmail?:string; teamName?:string; eventTitle?:string; eventType?:string; entryFee:number; registeredAt:string };
type Ev  = { id:string; title:string; type:string; status:string; participants:number; maxParticipants:number; prizePool:string; entryFeeAmount:number };

export default function AdminEvents() {
  const { data } = useQuery<{ registrations: Reg[]; events: Ev[] }>({ queryKey: ["admin-events"], queryFn: () => fetch("/api/admin/events").then(r => r.json()), refetchInterval: 30_000 });
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#d1d5db", borderTop: "1px solid rgba(255,255,255,0.05)" };
  const th: React.CSSProperties = { padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" };

  const liveEvents = (data?.events ?? []).filter(e => e.status === "Live");

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 20 }}>Events Manager</h1>

          {/* Event overview cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            {(data?.events ?? []).map(e => (
              <div key={e.id} style={{ background: "#141414", border: `1px solid ${e.status === "Live" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "16px 18px", boxShadow: e.status === "Live" ? "0 0 16px rgba(239,68,68,0.1)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", flex: 1, paddingRight: 8 }}>{e.title}</span>
                  <Badge status={e.status} />
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{e.type} · {e.prizePool}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: e.status === "Live" ? "#ef4444" : "#e63946" }}>{e.participants}/{e.maxParticipants}</div>
                {e.status === "Live" && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 700 }}>🔴 Auto-refreshing every 30s</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Event","Type","Player / Captain","Team Name","Entry Fee","Payment","Date"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!(data?.registrations.length) ? (
                    <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No registrations yet</td></tr>
                  ) : data!.registrations.map(r => (
                    <tr key={r.id}>
                      <td style={td}><div style={{ fontWeight: 600, color: "#fff" }}>{r.eventTitle}</div></td>
                      <td style={td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(230,57,70,0.12)", color: "#e63946", fontWeight: 700 }}>{r.eventType}</span></td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.playerName}</td>
                      <td style={{ ...td, color: "#9ca3af" }}>{r.teamName ?? "—"}</td>
                      <td style={{ ...td, color: r.entryFee === 0 ? "#4ade80" : "#fff", fontWeight: 700 }}>{r.entryFee === 0 ? "Free" : `₹${r.entryFee}`}</td>
                      <td style={td}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: "rgba(234,179,8,0.12)", color: "#eab308" }}>Pending</span></td>
                      <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(r.registeredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
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
