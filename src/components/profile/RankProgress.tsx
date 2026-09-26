"use client";
import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { tierLevelInfo } from "@/lib/reputation";

export function RankProgress({ reputationScore }: { reputationScore: number }) {
  const info = tierLevelInfo(reputationScore);
  const rep = useMotionValue(0);
  const repText = useTransform(rep, v => Math.round(v).toLocaleString());
  const widthPct = useMotionValue(0);
  const width = useTransform(widthPct, v => `${v}%`);

  useEffect(() => {
    const a1 = animate(rep, reputationScore, { duration: 1.4, ease: "easeOut" });
    const a2 = animate(widthPct, info.progressPct, { duration: 1.4, ease: "easeOut" });
    return () => { a1.stop(); a2.stop(); };
  }, [reputationScore, info.progressPct, rep, widthPct]);

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Section label */}
      <div style={{
        fontSize: 11, color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase", letterSpacing: "0.15em",
        marginBottom: 16,
      }}>
        Rank Progression
      </div>

      {/* Tier labels row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{info.icon}</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em" }}>{info.label}</span>
        </div>
        {info.next && (
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
            → {info.next.label}
          </span>
        )}
      </div>

      {/* Progress bar — ultra thin and refined */}
      <div style={{ position: "relative", height: 3, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 16 }}>
        <motion.div style={{ width, height: "100%", borderRadius: 100, background: info.color }} />
      </div>

      {/* Rep count and distance to next */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
            <motion.span>{repText}</motion.span>
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>REP</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {info.next ? `${info.next.pointsToNext} to ${info.next.label}` : "Top tier reached"}
        </div>
      </div>
    </div>
  );
}
