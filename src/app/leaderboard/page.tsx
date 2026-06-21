"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Trophy, MapPin, ArrowUpRight, Crown } from "lucide-react";

import { PremiumNav } from "@/components/premium/PremiumNav";
import { SmoothScroll } from "@/components/premium/SmoothScroll";
import { Reveal } from "@/components/premium/Reveal";
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


export default function LeaderboardPage() {
  const [type, setType] = useState<LeaderboardType>("players");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const { data, isLoading } = useLeaderboard(type, period);

  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const activeTypeMeta = TYPE_TABS.find(t => t.key === type)!;

  return (
    <>
      <PremiumNav variant="solid" />
      <SmoothScroll />
      <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 120 }}>
        {/* Header */}
        <section style={{ paddingBottom: 28 }}>
          <div className="container-lg">
            <Reveal>
              <span className="eyebrow" style={{ color: "#980808", display: "block", marginBottom: 14 }}>
                Game Ground · Kozhikode
              </span>
              <h1 className="display" style={{ fontSize: "clamp(40px, 5.5vw, 76px)", color: "#fff", marginBottom: 14 }}>
                Leader<span className="display-serif" style={{ color: "rgba(255,255,255,0.7)" }}>board.</span>
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", maxWidth: 560, lineHeight: 1.6 }}>
                {activeTypeMeta.sub}. Reputation rewards organising, attendance, reviews, and showing up — gamed metrics get capped.
              </p>
            </Reveal>

            {/* Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 32, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "inline-flex", padding: 4, borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", gap: 2 }}>
                {TYPE_TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    style={{
                      padding: "9px 18px", borderRadius: 100,
                      fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                      background: type === t.key ? "linear-gradient(135deg, #891720 0%, #f37c7c 100%)" : "transparent",
                      color: type === t.key ? "#fff" : "rgba(255,255,255,0.6)",
                      border: "none", cursor: "pointer",
                      boxShadow: type === t.key ? "0 0 20px rgba(152,8,8,0.4)" : "none",
                      transition: "all 200ms",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "inline-flex", padding: 4, borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", gap: 2 }}>
                {PERIOD_TABS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    style={{
                      padding: "9px 16px", borderRadius: 100,
                      fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                      background: period === p.key ? "rgba(255,255,255,0.06)" : "transparent",
                      color: period === p.key ? "#fff" : "rgba(255,255,255,0.55)",
                      border: "none", cursor: "pointer",
                      transition: "all 200ms",
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
        <section style={{ paddingBottom: 120 }}>
          <div className="container-lg">
            {isLoading ? (
              <div style={{ display: "grid", gap: 12 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="skeleton" style={{ height: 76, borderRadius: 16 }} />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState period={period} />
            ) : (
              <>
                {/* Podium */}
                {podium.length > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: podium.length === 3 ? "1fr 1.05fr 1fr" : `repeat(${podium.length}, 1fr)`,
                    gap: 14,
                    alignItems: "end",
                    marginBottom: 36,
                  }} className="leaderboard-podium">
                    {layoutPodium(podium).map((row, i) => row && (
                      <PodiumCard
                        key={row.id}
                        row={row}
                        position={(["second", "first", "third"][i]) as "first" | "second" | "third"}
                        type={type}
                      />
                    ))}
                  </div>
                )}

                {/* Rest of list */}
                {rest.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rest.map(row => (
                      <ListRow key={row.id} row={row} type={type} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <style>{`
        :root {
          --podium-h-first: 220px;
          --podium-h-second: 188px;
          --podium-h-third: 156px;
        }
        .box-first { height: var(--podium-h-first); }
        .box-second { height: var(--podium-h-second); }
        .box-third { height: var(--podium-h-third); }
        
        @media (max-width: 720px) {
          :root {
            --podium-h-first: 160px;
            --podium-h-second: 130px;
            --podium-h-third: 110px;
          }
          .leaderboard-podium {
            gap: 8px !important;
          }
          .podium-avatar { transform: scale(0.85); transform-origin: bottom center; }
          .podium-name { font-size: 12.5px !important; }
          .podium-username { font-size: 10px !important; }
          .podium-rank { font-size: 22px !important; }
          .podium-score { font-size: 15px !important; }
          .podium-label { font-size: 9px !important; }
          .podium-box { padding: 12px 4px !important; }
        }
      `}</style>
    </>
  );
}

function layoutPodium(top: LeaderboardRow[]): (LeaderboardRow | undefined)[] {
  // Visual order: 2nd, 1st, 3rd
  return [top[1], top[0], top[2]];
}

function metricFor(row: LeaderboardRow, type: LeaderboardType): { label: string; value: string } {
  if (type === "organizers") {
    return { label: "games organized", value: row.gamesOrganized.toLocaleString("en-IN") };
  }
  return { label: "rep", value: row.reputationScore.toLocaleString("en-IN") };
}

function PodiumCard({ row, position, type }: { row: LeaderboardRow; position: "first" | "second" | "third"; type: LeaderboardType }) {
  const accent = position === "first" ? "#eab308" : position === "second" ? "#cbd5e1" : "#b45309";
  const m = metricFor(row, type);
  return (
    <Link
      href={`/profile/${row.id}`}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        textDecoration: "none",
      }}
      className={`podium-card podium-${position}`}
    >
      <div style={{ position: "relative" }} className="podium-avatar">
        <TierRing tier={row.tier} size={position === "first" ? 92 : 76}>
          {row.avatarUrl ? (
            <Image src={row.avatarUrl} alt={row.name} width={92} height={92} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(135deg, #891720 0%, #f37c7c 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: position === "first" ? 28 : 22,
            }}>
              {row.name[0]?.toUpperCase()}
            </div>
          )}
        </TierRing>
        {position === "first" && (
          <div style={{
            position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
            color: "#eab308", filter: "drop-shadow(0 0 8px rgba(234,179,8,0.6))",
          }}>
            <Crown size={26} fill="#eab308" />
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", maxWidth: "100%" }}>
        <p className="podium-name" style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.name}
        </p>
        <p className="podium-username" style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>@{row.username}</p>
      </div>
      <div className={`podium-box box-${position}`} style={{
        width: "100%",
        borderRadius: "16px 16px 4px 4px",
        background: `linear-gradient(180deg, ${accent}22 0%, rgba(20,20,20,0.4) 100%)`,
        border: `1px solid ${accent}44`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        padding: "16px 12px",
        gap: 8,
      }}>
        <span className="podium-rank" style={{ fontSize: 32, fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: "-0.04em" }}>
          #{row.rank}
        </span>
        <TierBadge tier={row.tier} size="sm" />
        <div style={{ marginTop: "auto", textAlign: "center" }}>
          <p className="podium-score" style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {m.value}
          </p>
          <p className="podium-label" style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {m.label}
          </p>
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
        gridTemplateColumns: "48px 56px minmax(0, 1fr) auto auto",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        background: "rgba(13,13,13,0.7)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        textDecoration: "none",
        transition: "border-color 200ms, transform 200ms",
      }}
      className="lb-row"
    >
      <span className="lb-row-rank" style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: "-0.02em" }}>
        #{row.rank}
      </span>

      <div className="lb-row-avatar" style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)" }}>
        {row.avatarUrl ? (
          <Image src={row.avatarUrl} alt={row.name} width={44} height={44} unoptimized style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #891720 0%, #f37c7c 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 17,
          }}>{row.name[0]?.toUpperCase()}</div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.name}
        </p>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>@{row.username}</span>
          <span className="mobile-tier-badge" style={{ display: "none" }}>
            <TierBadge tier={row.tier} size="xs" showLabel={false} />
          </span>
          {row.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
              <MapPin size={10} style={{ flexShrink: 0 }} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{row.location}</span>
            </span>
          )}
        </div>
      </div>

      <div className="desktop-tier-badge">
        <TierBadge tier={row.tier} size="xs" />
      </div>

      <div style={{ textAlign: "right", paddingLeft: 4 }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          {m.value}
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {m.label}
        </p>
      </div>

      <style>{`
        .lb-row:hover { border-color: rgba(152,8,8,0.35) !important; transform: translateY(-1px); }
        @media (max-width: 640px) {
          .lb-row {
            grid-template-columns: 28px 40px minmax(0, 1fr) auto !important;
            gap: 12px !important;
            padding: 14px 12px !important;
          }
          .desktop-tier-badge { display: none !important; }
          .mobile-tier-badge { display: inline-flex !important; }
          .lb-row-rank { font-size: 15px !important; }
          .lb-row-avatar { width: 40px !important; height: 40px !important; }
        }
      `}</style>
    </Link>
  );
}

function EmptyState({ period }: { period: LeaderboardPeriod }) {
  return (
    <div style={{
      padding: "80px 32px", textAlign: "center",
      background: "rgba(13,13,13,0.7)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 24,
    }}>
      <Trophy size={36} color="rgba(255,255,255,0.2)" style={{ margin: "0 auto 14px" }} />
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>
        Nobody on the board yet
      </h3>
      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
        {period === "month"
          ? "No activity in the last 30 days. Switch to All time to see lifetime leaders."
          : "Once players start joining games, organizing, and reviewing coaches, they'll show up here."}
      </p>
      <Link
        href="/play"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 24,
          padding: "10px 20px", borderRadius: 100,
          background: "linear-gradient(135deg, #891720 0%, #f37c7c 100%)",
          color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
          boxShadow: "0 0 24px rgba(152,8,8,0.35)",
        }}
      >
        Find a game <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
