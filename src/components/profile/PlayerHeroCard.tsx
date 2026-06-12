"use client";
import Image from "next/image";
import { Trophy, Flame, Star, Calendar } from "lucide-react";
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
    <div style={{
      position: "relative", borderRadius: 24, overflow: "hidden",
      border: `1px solid ${meta.color}40`,
      background: p.bannerUrl ? undefined : `radial-gradient(120% 120% at 0% 0%, ${meta.colorDim}33 0%, #0d0d0d 55%)`,
      boxShadow: `0 0 50px ${meta.color}14`,
    }}>
      {p.bannerUrl && <Image src={p.bannerUrl} alt="" fill style={{ objectFit: "cover", opacity: 0.35 }} />}
      <div style={{ position: "relative", padding: "26px 24px", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", border: `3px solid ${meta.color}`, flexShrink: 0, background: "#1c1c1c", boxShadow: `0 0 24px ${meta.color}55` }}>
          {p.avatarUrl
            ? <Image src={p.avatarUrl} alt={p.name} width={84} height={84} style={{ objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff" }}>{p.name.charAt(0).toUpperCase()}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>{p.name}</h1>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 100, background: `${meta.color}22`, color: meta.color, fontSize: 12, fontWeight: 800 }}>
              {meta.icon} {meta.label}
            </span>
            {p.membership && <span style={{ padding: "4px 10px", borderRadius: 100, background: "rgba(230,57,70,0.18)", color: "#e63946", fontSize: 11, fontWeight: 800 }}>{p.membership}</span>}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>@{p.username}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <Stat icon={<Star size={14} color={meta.color} />} label={`${p.reputationScore.toLocaleString()} REP`} />
            {p.rank ? <Stat icon={<Trophy size={14} color="#eab308" />} label={`#${p.rank}`} /> : null}
            <Stat icon={<Flame size={14} color="#f97316" />} label={`${p.streakWeeks} wk streak`} />
            <Stat icon={<Calendar size={14} color="rgba(255,255,255,0.5)" />} label={`Joined ${joined}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{icon}{label}</span>;
}
