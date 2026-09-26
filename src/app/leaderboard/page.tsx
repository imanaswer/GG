"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Trophy, MapPin, ArrowUpRight, Crown, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
import { Tilt3D } from "@/components/premium/Tilt3D";
import { TierBadge, TierRing } from "@/components/TierBadge";
import {
  useLeaderboard,
  type LeaderboardType,
  type LeaderboardPeriod,
  type LeaderboardRow,
} from "@/hooks/useData";

const TYPE_TABS: { key: LeaderboardType; label: string; sub: string }[] = [
  { key: "players",    label: "Players",    sub: "Top reputation across the platform" },
  { key: "organizers", label: "Organizers", sub: "Most games organized" },
];

const PERIOD_TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "all",   label: "All time"     },
  { key: "month", label: "Last 30 days" },
];

const PAGE = 30;

export default function LeaderboardPage() {
  const [type, setType] = useState<LeaderboardType>("players");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [visible, setVisible] = useState(PAGE);
  const { data, isLoading } = useLeaderboard(type, period);

  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3, visible);
  const remaining = rows.length - visible;
  const activeTypeMeta = TYPE_TABS.find(t => t.key === type)!;

  return (
    <>
      <PremiumNav variant="solid" />
      <SmoothScroll />
      <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120, paddingBottom: 160, position: "relative", overflow: "hidden" }}>
        {/* Header */}
        <section style={{ paddingBottom: 28, position: "relative", zIndex: 10 }}>
          <div className="container-lg">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 100,
                marginBottom: 24,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "4px",
                  background: "rgba(255,255,255,0.2)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans), sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.9)",
                  marginLeft: 6,
                }}
              >
                Game Ground · Kozhikode
              </span>
            </div>

            <div style={{ padding: "10px 0 20px 0" }}>
              <h1
                className="display"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(32px, 7.5vw, 130px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.01em",
                  color: "#fff",
                  width: "100%",
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <motion.div style={{ overflow: "hidden" }}>
                  <motion.div
                    initial={{ y: "100%", rotateZ: 4, opacity: 0 }}
                    animate={{ y: "0%", rotateZ: 0, opacity: 1 }}
                    transition={{
                      duration: 1.2,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.1,
                    }}
                  >
                    Leader<span style={{ color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>board.</span>
                  </motion.div>
                </motion.div>
              </h1>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 24,
                  marginTop: 20,
                  flexWrap: "wrap",
                }}
              >
                <p
                  style={{
                    fontSize: "clamp(16px, 1.5vw, 20px)",
                    color: "rgba(255,255,255,0.6)",
                    maxWidth: 580,
                    margin: 0,
                    lineHeight: 1.6,
                    fontWeight: 400,
                  }}
                >
                  {activeTypeMeta.sub}. Reputation rewards organizing, attendance, reviews, and showing up.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 48, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "inline-flex", padding: 6, borderRadius: 100, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", gap: 4 }}>
                  {TYPE_TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => { setType(t.key); setVisible(PAGE); }}
                      style={{
                        padding: "12px 24px", borderRadius: 100,
                        fontSize: 14, fontWeight: 700, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.1em",
                        background: type === t.key ? "#fff" : "transparent",
                        color: type === t.key ? "#000" : "rgba(255,255,255,0.6)",
                        border: "none", cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "inline-flex", padding: 6, borderRadius: 100, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", gap: 4 }}>
                  {PERIOD_TABS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => { setPeriod(p.key); setVisible(PAGE); }}
                      style={{
                        padding: "12px 20px", borderRadius: 100,
                        fontSize: 13, fontWeight: 600, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em",
                        background: period === p.key ? "rgba(255,255,255,0.1)" : "transparent",
                        color: period === p.key ? "#fff" : "rgba(255,255,255,0.4)",
                        border: "none", cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
          </div>
        </section>

        {/* Body */}
        <section style={{ position: "relative", zIndex: 10 }}>
          <div className="container-lg">
            {isLoading ? (
              <div style={{ display: "grid", gap: 16 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="skeleton" style={{ height: 100, borderRadius: 24 }} />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState period={period} />
            ) : (
              <>
                {/* Podium */}
                {podium.length > 0 && (
                    <div className="podium-grid">
                      {layoutPodium(podium).map((row, i) => row && (
                        <div key={row.id} className={`podium-item-${i}`} style={{ height: "100%" }}>
                          <Tilt3D style={{ height: "100%" }}>
                            <PodiumCard
                              row={row}
                              position={(["second", "first", "third"][i]) as "first" | "second" | "third"}
                              type={type}
                            />
                          </Tilt3D>
                        </div>
                      ))}
                    </div>
                )}

                {/* Rest of list */}
                {rest.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {rest.map((row, i) => (
                      <ListRow key={row.id} row={row} type={type} />
                    ))}
                  </div>
                )}

                {remaining > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 64 }}>
                      <button
                        onClick={() => setVisible(v => v + PAGE)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 12,
                          padding: "16px 32px", borderRadius: 100,
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.1em",
                          cursor: "pointer", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        className="lb-more"
                      >
                        Load More <ChevronDown size={16} />
                      </button>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Showing {Math.min(visible, rows.length)} / {rows.length}
                      </span>
                    </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .podium-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          align-items: stretch;
          margin-bottom: 64px;
        }
        .lb-more:hover {
          background: #fff !important;
          color: #000 !important;
          border-color: #fff !important;
        }
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 400% 100%;
          animation: skeleton-load 1.5s ease-in-out infinite;
        }
        @keyframes skeleton-load {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
        
        @media (max-width: 900px) {
          .podium-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
            margin-bottom: 32px !important;
          }
          .podium-avatar { 
            transform: scale(0.55); 
            transform-origin: center top; 
            margin-bottom: -45px;
          }
          .podium-card { 
            min-height: auto !important; 
            padding: 16px 8px !important; 
            border-radius: 16px !important;
            gap: 12px !important;
          }
          .podium-name { font-size: 13px !important; margin-bottom: 2px !important; }
          .podium-username { font-size: 9px !important; }
          .podium-bg-rank { font-size: 80px !important; bottom: -10px !important; right: -5px !important; }
          .podium-score-box { padding: 8px 4px !important; border-radius: 12px !important; }
          .podium-score-val { font-size: 14px !important; }
          .podium-score-label { display: none !important; }
          .podium-tier-wrap { transform: scale(0.7); margin-top: -8px; margin-bottom: -8px; }
        }
      `}</style>
    </>
  );
}

function layoutPodium(top: LeaderboardRow[]): (LeaderboardRow | undefined)[] {
  // Visual order: 2nd, 1st, 3rd for desktop. If fewer, handle gracefully.
  if (top.length === 1) return [top[0]];
  if (top.length === 2) return [top[1], top[0]];
  return [top[1], top[0], top[2]];
}

function metricFor(row: LeaderboardRow, type: LeaderboardType): { label: string; value: string } {
  if (type === "organizers") {
    return { label: "Games Organized", value: row.gamesOrganized.toLocaleString("en-IN") };
  }
  return { label: "Reputation", value: row.reputationScore.toLocaleString("en-IN") };
}

function PodiumCard({ row, position, type }: { row: LeaderboardRow; position: "first" | "second" | "third"; type: LeaderboardType }) {
  const accent = position === "first" ? "#eab308" : position === "second" ? "#cbd5e1" : "#b45309";
  const m = metricFor(row, type);
  
  // Base heights to give podium effect
  const minHeight = position === "first" ? 380 : position === "second" ? 340 : 300;
  
  return (
    <Link
      href={`/profile/${row.id}`}
      style={{
        display: "flex", flexDirection: "column",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${accent}40`,
        borderRadius: 24,
        padding: 32,
        height: "100%",
        minHeight,
        textDecoration: "none",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s ease",
      }}
      className="podium-card"
    >
      {/* Huge Background Rank Number */}
      <div className="podium-bg-rank" style={{
        position: "absolute",
        bottom: -20, right: -10,
        fontFamily: "var(--font-dela)",
        fontSize: position === "first" ? 220 : 180,
        color: `${accent}10`,
        lineHeight: 0.8,
        zIndex: 0,
        pointerEvents: "none"
      }}>
        {row.rank}
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, height: "100%" }}>
        
        {/* Avatar */}
        <div style={{ position: "relative" }} className="podium-avatar">
          <TierRing tier={row.tier} size={100}>
            {row.avatarUrl ? (
              <Image src={row.avatarUrl} alt={row.name} width={100} height={100} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: "linear-gradient(135deg, #111 0%, #222 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 32,
              }}>
                {row.name[0]?.toUpperCase()}
              </div>
            )}
          </TierRing>
          {position === "first" && (
            <div style={{
              position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)",
              color: "#eab308", filter: "drop-shadow(0 0 12px rgba(234,179,8,0.8))",
            }}>
              <Crown size={32} fill="#eab308" />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ textAlign: "center", width: "100%", marginTop: 8 }}>
          <p className="podium-name" style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "var(--font-dela)", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.name}
          </p>
          <p className="podium-username" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-serif)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{row.username}</p>
        </div>

        {/* Tier */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
          <div className="podium-tier-wrap"><TierBadge tier={row.tier} size="md" /></div>
          
          <div className="podium-score-box" style={{ width: "100%", textAlign: "center", background: "rgba(0,0,0,0.4)", padding: "12px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="podium-score-val" style={{ fontSize: 24, fontWeight: 800, color: accent, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {m.value}
            </p>
            <p className="podium-score-label" style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
              {m.label}
            </p>
          </div>
        </div>

      </div>
    </Link>
  );
}

function ListRow({ row, type }: { row: LeaderboardRow; type: LeaderboardType }) {
  const m = metricFor(row, type);
  return (
    <Link
      href={`/profile/${row.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "80px 64px minmax(0, 1fr) auto auto",
        alignItems: "center",
        gap: 24,
        padding: "20px 32px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 20,
        textDecoration: "none",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden"
      }}
      className="lb-row"
    >
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        background: "transparent", transition: "background 0.3s ease"
      }} className="lb-row-indicator" />

      {/* Rank */}
      <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 32, fontWeight: 400, color: "rgba(255,255,255,0.2)" }} className="lb-row-rank">
        {row.rank < 10 ? `0${row.rank}` : row.rank}
      </span>

      {/* Avatar */}
      <div className="lb-row-avatar" style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "#111" }}>
        {row.avatarUrl ? (
          <Image src={row.avatarUrl} alt={row.name} width={64} height={64} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #222 0%, #111 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 20,
          }}>{row.name[0]?.toUpperCase()}</div>
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <p className="lb-row-name" style={{ fontSize: 18, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
          {row.name}
        </p>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>@{row.username}</span>
          <span className="mobile-tier-badge" style={{ display: "none" }}>
            <TierBadge tier={row.tier} size="xs" showLabel={false} />
          </span>
          {row.location && (
            <span className="lb-row-location" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} style={{ flexShrink: 0 }} /> <span>{row.location}</span>
            </span>
          )}
        </div>
      </div>

      {/* Tier */}
      <div className="desktop-tier-badge">
        <TierBadge tier={row.tier} size="sm" />
      </div>

      {/* Score */}
      <div className="lb-row-score" style={{ textAlign: "right", paddingLeft: 16 }}>
        <p className="lb-row-score-val" style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", fontFamily: "var(--font-dela)" }}>
          {m.value}
        </p>
        <p className="lb-row-score-label" style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginTop: 4 }}>
          {m.label}
        </p>
      </div>

      <style>{`
        .lb-row:hover { 
          background: rgba(255,255,255,0.04) !important; 
          border-color: rgba(255,255,255,0.1) !important;
          transform: translateX(4px);
        }
        .lb-row:hover .lb-row-indicator {
          background: #fff !important;
        }
        .lb-row:hover .lb-row-rank {
          color: #fff !important;
        }
        @media (max-width: 768px) {
          .lb-row {
            grid-template-columns: 32px 48px minmax(0, 1fr) auto !important;
            gap: 12px !important;
            padding: 16px !important;
            border-radius: 16px !important;
          }
          .desktop-tier-badge { display: none !important; }
          .mobile-tier-badge { display: inline-flex !important; }
          .lb-row-rank { font-size: 20px !important; }
          .lb-row-avatar { width: 48px !important; height: 48px !important; }
          .lb-row-name { font-size: 15px !important; }
          .lb-row-location { display: none !important; }
          .lb-row-score { padding-left: 0 !important; }
          .lb-row-score-val { font-size: 18px !important; }
          .lb-row-score-label { font-size: 9px !important; }
        }
      `}</style>
    </Link>
  );
}

function EmptyState({ period }: { period: LeaderboardPeriod }) {
  return (
    <div style={{
      padding: "100px 32px", textAlign: "center",
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 32,
    }}>
      <Trophy size={48} color="rgba(255,255,255,0.1)" style={{ margin: "0 auto 24px" }} />
      <h3 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 16, fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
        Nobody on the board yet
      </h3>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
        {period === "month"
          ? "No activity in the last 30 days. Switch to All time to see lifetime leaders."
          : "Once players start joining games, organizing, and reviewing coaches, they'll show up here."}
      </p>
      <Link
        href="/play"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginTop: 40,
          padding: "16px 32px", borderRadius: 100,
          background: "#fff", color: "#000",
          fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", textDecoration: "none",
          transition: "transform 0.2s"
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        Find a game <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
