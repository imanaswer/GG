"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isGameInMetricWeek } from "@/lib/adminGames";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell }  from "@/components/admin/AdminShell";
import { StatCard }    from "@/components/admin/StatCard";
import { Badge }       from "@/components/admin/Badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Unlock, Lock, Clock, CheckCircle2, Ban, ListPlus } from "lucide-react";
import { bucketForCalendar, BUCKET_ORDER, BUCKET_LABELS } from "@/lib/adminBookings/grouping";

type Player = { userId:string; name:string; joinedAt:string; attended:boolean|null; reliabilityScore:number };
type GameData = { id:string; title:string; sport:string; organizerName?:string; organizerReliability?:number; location:string; scheduledAt:string; slots:number; slotsLeft:number; cost:string; status:string; waitlistCount:number; playerCount:number; completedAt?:string|null; cancelledAt?:string|null; adminVerified:boolean; pointsAwarded:boolean; players:Player[] };
type StatsData = { total:number; open:number; full:number; completed:number; cancelled:number; awaitingReview:number; waitlisted:number };

function AdminGamesInner() {
  const searchParams = useSearchParams();
  const weekOnly = searchParams.get("range") === "week";
  const qc = useQueryClient();
  const { data } = useQuery<{ games: GameData[]; stats: StatsData }>({ queryKey: ["admin-games"], queryFn: () => fetch("/api/admin/games").then(r => r.json()) });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(new Set(["past"]));
  const allGames = data?.games ?? [];
  const now = new Date();
  const games = weekOnly
    ? allGames.filter(g => isGameInMetricWeek(g.scheduledAt, g.status, now))
    : allGames;
  const st    = data?.stats;

  // Derive the selected game from query data so the drawer always reflects the
  // latest refetch (no effect / setState-in-effect needed).
  const selected = selectedId ? games.find(g => g.id === selectedId) ?? null : null;

  const openDrawer = (g: GameData) => {
    setSelectedId(g.id);
    setErr(null);
    const init: Record<string, boolean> = {};
    g.players.forEach(p => { init[p.userId] = p.attended ?? true; });
    setAttendance(init);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-games"] });

  const runAction = async (g: GameData, action: "cancel" | "complete" | "finalize") => {
    const labels: Record<string, string> = { cancel: "Cancel this game?", complete: "Mark this game completed (no rewards yet)?", finalize: "Finalize and award rewards? This cannot be undone." };
    if (!confirm(labels[action])) return;
    setBusy(true); setErr(null);
    const body: { action: string; attendance?: Record<string, boolean> } =
      (action === "complete" || action === "finalize") ? { action, attendance } : { action };
    const r = await fetch(`/api/admin/games/${g.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Action failed"); return; }
    refresh();
  };

  const deleteGame = async (g: GameData) => {
    if (!confirm("Permanently delete this game and all its player/waitlist records? This cannot be undone.")) return;
    setBusy(true); setErr(null);
    const r = await fetch(`/api/admin/games/${g.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "Delete failed"); return; }
    setSelectedId(null);
    refresh();
  };

  const btn = (bg: string): React.CSSProperties => ({ flex: 1, padding: "10px 12px", borderRadius: 8, border: "none", background: bg, color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 });

  const renderGameRow = (g: GameData) => {
    const filled = g.slots - g.slotsLeft;
    const pct = Math.round((filled / g.slots) * 100);
    return (
      <tr key={g.id} onClick={() => openDrawer(g)} style={{ cursor: "pointer" }}
        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"}
        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
      >
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{g.title}</span>
          <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(255,255,255,0.15)", color: "#fff" }}>{g.sport}</span>
          {(g.status === "completed" || g.status === "archived") && (g.pointsAwarded
            ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "#4ade80" }}>✓ finalized</span>
            : <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "#eab308" }}>● awaiting review</span>)}
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
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#fff" : "#fff", borderRadius: 99 }} />
          </div>
        </td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.cost === "Free" ? "#4ade80" : "#fff" }}>{g.cost}</td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}><Badge status={g.status} /></td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.waitlistCount > 0 ? "#eab308" : "#6b7280" }}>{g.waitlistCount}</td>
      </tr>
    );
  };

  const gameBuckets = (() => {
    const out: Record<string, GameData[]> = { today: [], tomorrow: [], upcoming: [], past: [], unscheduled: [] };
    for (const g of games) out[bucketForCalendar(g.scheduledAt, now)].push(g);
    return out;
  })();

  return (
    <AdminGuard>
      <AdminShell>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#fff" }}>Games Manager</h1>
            <a href="/api/admin/export?type=games" download style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 100, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", textDecoration: "none", transition: "all 0.2s ease" }}
               onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; }}
               onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}>
              Export CSV
            </a>
          </div>

          {weekOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.3)", width: "fit-content" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fca5a5" }}>Showing open/full games scheduled within the last 7 days</span>
              <Link href="/admin/games" style={{ fontSize: 12, fontWeight: 700, color: "#fff", textDecoration: "none", lineHeight: 1 }} aria-label="Clear filter">✕</Link>
            </div>
          )}

          <div className="admin-games-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard value={st?.total ?? 0}     label="Total Games"        icon={Gamepad2} />
            <StatCard value={st?.open ?? 0}      label="Open Now"     sub="Accepting players" icon={Unlock} />
            <StatCard value={st?.full ?? 0}      label="Full"         sub="No slots left" icon={Lock} />
            <StatCard value={st?.awaitingReview ?? 0} label="Awaiting Review" sub="Completed, not finalized" icon={Clock} />
            <StatCard value={st?.completed ?? 0} label="Completed" icon={CheckCircle2} />
            <StatCard value={st?.cancelled ?? 0} label="Cancelled" icon={Ban} />
            <StatCard value={st?.waitlisted ?? 0} label="Waitlisted"  sub="Across all games" icon={ListPlus} />
          </div>
          <style>{`
            @media (max-width: 768px) {
              .admin-games-stats[style] {
                display: flex !important;
                overflow-x: auto;
                scroll-snap-type: x mandatory;
                margin-right: -16px;
                padding-right: 16px;
                padding-bottom: 8px;
                -webkit-overflow-scrolling: touch;
              }
              .admin-games-stats::-webkit-scrollbar {
                display: none;
              }
              .admin-games-stats > .admin-stat-card {
                flex: 0 0 140px;
                scroll-snap-align: start;
              }
            }
          `}</style>

          {!games.length ? (
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "40px", textAlign: "center", color: "#6b7280" }}>No games found</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {BUCKET_ORDER.filter(b => gameBuckets[b].length > 0).map(b => {
                const isOpen = !collapsedBuckets.has(b);
                return (
                  <div key={b}>
                    <button
                      onClick={() => setCollapsedBuckets(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; })}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 8 }}
                    >
                      <span style={{ fontSize: 13, color: "#6b7280" }}>{isOpen ? "▼" : "▶"}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{BUCKET_LABELS[b]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.15)", color: "#fff" }}>{gameBuckets[b].length}</span>
                    </button>
                    {isOpen && (
                      <div style={{ background: "transparent", overflow: "hidden", marginBottom: 24 }}>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>{["Game","Organiser","Location","Date & Time","Slots","Cost","Status","Waitlist"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>{h}</th>
                              ))}</tr>
                            </thead>
                            <tbody>{gameBuckets[b].map(renderGameRow)}</tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Game detail drawer */}
        {selected && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }} onClick={() => setSelectedId(null)}>
            <div style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} />
            <div style={{ width: "100%", maxWidth: 400, background: "#141414", borderLeft: "1px solid rgba(255,255,255,0.1)", padding: "24px", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Game Detail</h2>
                <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{selected.title}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <Badge status={selected.status} />
                {(selected.status === "completed" || selected.status === "archived") && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: selected.pointsAwarded ? "#4ade80" : "#eab308" }}>
                    {selected.pointsAwarded ? "Rewards granted ✓" : "Awaiting admin review"}
                  </span>
                )}
              </div>
              {selected.completedAt && <p style={{ fontSize: 11, color: "#6b7280" }}>Completed {new Date(selected.completedAt).toLocaleString("en-IN")}</p>}
              {selected.cancelledAt && <p style={{ fontSize: 11, color: "#6b7280" }}>Cancelled {new Date(selected.cancelledAt).toLocaleString("en-IN")}</p>}

              {err && <p style={{ marginTop: 12, fontSize: 12, color: "#fff", background: "rgba(255,255,255,0.1)", padding: "8px 10px", borderRadius: 8 }}>{err}</p>}

              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                  Players ({selected.players.length})
                  {(selected.status === "completed" || selected.status === "archived") && !selected.pointsAwarded && <span style={{ fontWeight: 500, color: "#6b7280" }}> · tick who attended</span>}
                </h3>
                {selected.players.length === 0 && <p style={{ fontSize: 12, color: "#6b7280" }}>No players joined.</p>}
                {selected.players.map((p) => {
                  const finalizable = (selected.status === "completed" || selected.status === "archived") && !selected.pointsAwarded;
                  return (
                    <div key={p.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#d1d5db" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {finalizable && (
                          <input type="checkbox" checked={attendance[p.userId] ?? true}
                            onChange={e => setAttendance(a => ({ ...a, [p.userId]: e.target.checked }))} />
                        )}
                        {p.name}
                        {!finalizable && p.attended === true && <span style={{ color: "#4ade80", fontSize: 11 }}>✓</span>}
                        {!finalizable && p.attended === false && <span style={{ color: "#fff", fontSize: 11 }}>missed</span>}
                      </span>
                      <span style={{ color: "#eab308" }}>★ {p.reliabilityScore.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Admin actions */}
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {(selected.status === "open" || selected.status === "full") && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={busy} onClick={() => runAction(selected, "complete")} style={btn("#2563eb")}>Mark Completed</button>
                    <button disabled={busy} onClick={() => runAction(selected, "cancel")} style={btn("#b45309")}>Cancel Game</button>
                  </div>
                )}
                {(selected.status === "completed" || selected.status === "archived") && !selected.pointsAwarded && (
                  <button disabled={busy} onClick={() => runAction(selected, "finalize")} style={btn("#16a34a")}>Finalize & Award Rewards</button>
                )}
                <button disabled={busy} onClick={() => deleteGame(selected)} style={btn("#dc2626")}>Delete Game</button>
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </AdminGuard>
  );
}

export default function AdminGames() {
  return (
    <Suspense fallback={null}>
      <AdminGamesInner />
    </Suspense>
  );
}
