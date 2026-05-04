"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Calendar, Users, Trophy, ChevronDown, Zap } from "lucide-react";
import type { UserProfile } from "@/hooks/useData";

const ease = [0.16, 1, 0.3, 1] as const;

export function StatsAccordion({ profile }: { profile: UserProfile }) {
  const [open, setOpen] = useState(false);

  const stats = [
    { Icon: TrendingUp, label: "Reliability",   value: profile.reliabilityScore.toFixed(1), accent: "#e63946" },
    { Icon: Calendar,   label: "Games played",  value: profile.gamesPlayed,                  accent: "#fff" },
    { Icon: Users,      label: "Organized",     value: profile.gamesOrganized,               accent: "#fff" },
    { Icon: Trophy,     label: "Attendance",    value: `${profile.attendanceRate.toFixed(0)}%`, accent: "#4ade80" },
    { Icon: Zap,        label: "Total rep",     value: profile.reputationScore,              accent: "#eab308" },
  ];

  return (
    <div style={{
      background: "#0b0b0b",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 22px",
          background: "transparent", border: "none",
          color: "#fff", fontFamily: "inherit",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Stats
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
          Reliability · games · attendance · rep
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease }}
          style={{ marginLeft: "auto", display: "flex" }}
        >
          <ChevronDown size={15} color="rgba(255,255,255,0.55)" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              padding: "0 22px 20px",
            }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 14,
                }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    <s.Icon size={11} color={s.accent} /> {s.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
