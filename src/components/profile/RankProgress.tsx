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
    const a1 = animate(rep, reputationScore, { duration: 1.1, ease: "easeOut" });
    const a2 = animate(widthPct, info.progressPct, { duration: 1.1, ease: "easeOut" });
    return () => { a1.stop(); a2.stop(); };
  }, [reputationScore, info.progressPct, rep, widthPct]);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${info.colorDim}22 0%, #0d0d0d 60%)`,
      border: `1px solid ${info.color}33`, borderRadius: 24, padding: "32px 28px",
      boxShadow: `0 0 60px ${info.color}18`, position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 40 }}>{info.icon}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{info.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Current tier</div>
          </div>
        </div>
        {info.next && (
          <div style={{ textAlign: "right", opacity: 0.7 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{info.next.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Next tier</div>
          </div>
        )}
      </div>

      <div style={{ position: "relative", height: 16, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 18 }}>
        <motion.div style={{ width, height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${info.colorDim}, ${info.color})`, boxShadow: `0 0 16px ${info.color}` }} />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>
          <motion.span>{repText}</motion.span> <span style={{ fontSize: 20, color: info.color }}>REP</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
          {info.next ? `${info.next.pointsToNext} REP to ${info.next.label}` : "Top tier reached 👑"}
        </div>
      </div>
    </div>
  );
}
