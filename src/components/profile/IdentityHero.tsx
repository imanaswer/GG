"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Trophy, Crown, ArrowUpRight } from "lucide-react";

import { tierLevelInfo } from "@/lib/reputation";
import { useUserActivity, type UserProfile } from "@/hooks/useData";
import { pickIdentityTag } from "./identityTag";

export function IdentityHero({ profile }: { profile: UserProfile }) {
  const tag = pickIdentityTag(profile);
  const level = tierLevelInfo(profile.reputationScore ?? 0);
  const { data: activity } = useUserActivity(profile.id);
  const streak = activity?.streakWeeks ?? 0;
  const rank = profile.playerRank ?? 0;
  const isPro = level.tier === "pro";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 1.2fr) minmax(220px, 1fr) minmax(220px, 1.4fr)",
        gap: 18,
        padding: "20px 22px",
        background: "linear-gradient(135deg, rgba(13,13,13,0.85) 0%, rgba(11,11,11,0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        marginTop: 28,
      }}
      className="identity-hero"
    >
      {/* Identity tag */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Player type
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          alignSelf: "flex-start",
          padding: "5px 12px", borderRadius: 100,
          background: `linear-gradient(135deg, ${tag.color}26 0%, ${tag.color}0a 100%)`,
          border: `1px solid ${tag.color}55`,
          color: tag.color, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em",
        }}>
          {tag.label}
        </span>
        {rank > 0 && (
          <Link href="/leaderboard" style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11.5, color: "rgba(255,255,255,0.55)",
            textDecoration: "none", marginTop: "auto",
          }}>
            <Trophy size={11} color="#eab308" />
            Ranked <span style={{ color: "#eab308", fontWeight: 700 }}>#{rank}</span>
            {profile.playerCount ? <span style={{ opacity: 0.7 }}>of {profile.playerCount}</span> : null}
            <ArrowUpRight size={10} style={{ opacity: 0.5 }} />
          </Link>
        )}
      </div>

      {/* Streak */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Streak
        </span>
        {streak > 0 ? (
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "flex", alignItems: "baseline", gap: 8 }}
          >
            <Flame size={20} color="#ff6b74" style={{ filter: "drop-shadow(0 0 6px rgba(255,107,116,0.55))" }} />
            <span style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {streak}
            </span>
            <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
              {streak === 1 ? "week" : "weeks"} active
            </span>
          </motion.div>
        ) : (
          <Link href="/play" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "rgba(255,255,255,0.7)", textDecoration: "none",
            padding: "8px 14px", borderRadius: 100,
            background: "rgba(230,57,70,0.08)",
            border: "1px solid rgba(230,57,70,0.25)",
            alignSelf: "flex-start",
          }}>
            <Flame size={13} color="#ff6b74" />
            Start a streak — join a game this week
            <ArrowUpRight size={12} />
          </Link>
        )}
      </div>

      {/* Tier progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {isPro ? "Tier" : "Next tier"}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {profile.reputationScore} rep
          </span>
        </div>

        {isPro ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Crown size={20} color={level.color} style={{ filter: `drop-shadow(0 0 8px ${level.color}88)` }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Pro tier</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>Top tier — keep dominating</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
              <span style={{ color: level.color }}>{level.next?.pointsToNext ?? 0} rep</span>
              <span style={{ opacity: 0.6, fontWeight: 500 }}>{` to ${level.next?.label ?? "—"}`}</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 100, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${level.progressPct}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${level.colorDim}, ${level.color})`,
                  boxShadow: `0 0 12px ${level.color}55`,
                }}
              />
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 820px) {
          .identity-hero { grid-template-columns: 1fr !important; gap: 18px !important; }
        }
      `}</style>
    </div>
  );
}
