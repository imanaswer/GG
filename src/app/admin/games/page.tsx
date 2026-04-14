"use client";
import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { StatCard }    from "@/components/admin/StatCard";
import { Badge }       from "@/components/admin/Badge";
import { useQuery }    from "@tanstack/react-query";
import { Gamepad2 } from "lucide-react";

type GameData = { id:string; title:string; sport:string; organizerName?:string; organizerReliability?:number; location:string; scheduledAt:string; slots:number; slotsLeft:number; cost:string; status:string; waitlistCount:number; players:{name:string; reliabilityScore:number}[] };
type StatsData = { total:number; open:number; full:number; waitlisted:number };

export default function AdminGames() {
  const { data } = useQuery<{ games: GameData[]; stats: StatsData }>({ queryKey: ["admin-games"], queryFn: () => fetch("/api/admin/games").then(r => r.json()) });
  const [selected, setSelected] = useState<GameData | null>(null);
  const games = data?.games ?? [];
  const st    = data?.stats;

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 20 }}>Games Tracker</h1>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard value={st?.total ?? 0}     label="Total Games"        icon={Gamepad2} />
            <StatCard value={st?.open ?? 0}      label="Open Now"     sub="Accepting players" />
            <StatCard value={st?.full ?? 0}      label="Full"         sub="No slots left" />
            <StatCard value={st?.waitlisted ?? 0} label="Waitlisted"  sub="Across all games" />
          </div>

          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Game","Organiser","Location","Date & Time","Slots","Cost","Status","Waitlist"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {!games.length ? (
                    <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No games found</td></tr>
                  ) : games.map(g => {
                    const filled = g.slots - g.slotsLeft;
                    const pct    = Math.round((filled / g.slots) * 100);
                    return (
                      <tr key={g.id} onClick={() => setSelected(g)} style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                      >
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{g.title}</span>
                          <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{g.sport}</span>
                        </td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#9ca3af" }}>
                          {g.organizerName}
                          {g.organizerReliability && <span style={{ marginLeft: 6, fontSize: 11, color: "#eab308" }}>★ {g.organizerReliability.toFixed(1)}</span>}
                        </td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#9ca3af", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.location}</td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(g.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ fontSize: 12, color: "#fff", marginBottom: 4 }}>{filled}/{g.slots}</div>
                          <div style={{ height: 4, background: "#1c1c1c", borderRadius: 99, width: 70, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.cost === "Free" ? "#4ade80" : "#fff" }}>{g.cost}</td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}><Badge status={g.status} /></td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.waitlistCount > 0 ? "#eab308" : "#6b7280" }}>{g.waitlistCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Game detail drawer */}
        {selected && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }} onClick={() => setSelected(null)}>
            <div style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} />
            <div style={{ width: 380, background: "#141414", borderLeft: "1px solid rgba(255,255,255,0.1)", padding: "24px", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Game Detail</h2>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 16 }}>{selected.title}</p>
              <Badge status={selected.status} />
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Players ({selected.slots - selected.slotsLeft}/{selected.slots})</h3>
                {selected.players.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#d1d5db" }}>
                    <span>{p.name}</span>
                    <span style={{ color: "#eab308" }}>★ {p.reliabilityScore.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </AdminGuard>
  );
}
