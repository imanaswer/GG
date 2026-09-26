"use client";
import Image from "next/image";
import { TIER_META, type Tier } from "@/lib/reputation";

export interface PlayerHeroCardProps {
  name: string; username: string; avatarUrl?: string;
  tier: string; reputationScore: number; rank?: number; streakWeeks: number;
  joinedAt: string; favoriteSport?: string;
  bannerUrl?: string; frame?: string; membership?: string;
}

export function PlayerHeroCard(p: PlayerHeroCardProps) {
  const meta = TIER_META[(p.tier as Tier)] ?? TIER_META.bronze;
  const joined = new Date(p.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    <div style={{ position: "relative", paddingBottom: 40 }}>
      {/* Large Avatar */}
      <div style={{
        width: 120, height: 120, borderRadius: "50%", overflow: "hidden",
        border: `2px solid rgba(255,255,255,0.1)`,
        background: "#111", marginBottom: 28,
      }}>
        {p.avatarUrl
          ? <Image src={p.avatarUrl} alt={p.name} width={120} height={120} style={{ objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 800, color: "#fff", fontFamily: "var(--font-serif)" }}>{p.name.charAt(0).toUpperCase()}</div>}
      </div>

      {/* Name — Large editorial serif */}
      <h1 style={{
        fontSize: "clamp(42px, 7vw, 72px)",
        fontFamily: "var(--font-serif)",
        fontWeight: 800,
        letterSpacing: "-0.04em",
        lineHeight: 0.95,
        color: "#fff",
        margin: "0 0 8px 0",
        textTransform: "uppercase",
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}>
        {p.name}
      </h1>

      {/* Username + tier inline */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>@{p.username}</span>
        <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: 700, color: meta.color,
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      {/* Metadata row — minimal, editorial */}
      <div style={{
        display: "flex", gap: 32, flexWrap: "wrap",
        paddingTop: 24,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        <MetaItem label="Reputation" value={p.reputationScore.toLocaleString()} />
        {p.rank && <MetaItem label="Global Rank" value={`#${p.rank}`} />}
        <MetaItem label="Streak" value={`${p.streakWeeks} weeks`} />
        <MetaItem label="Joined" value={joined} />
        {p.favoriteSport && <MetaItem label="Sport" value={p.favoriteSport} />}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}
