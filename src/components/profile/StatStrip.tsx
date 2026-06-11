"use client";
import { Gamepad2, CheckCircle, Star, Flame } from "lucide-react";

export function StatStrip({ gamesPlayed, attendanceRate, reputationScore, streakWeeks }: {
  gamesPlayed: number; attendanceRate: number; reputationScore: number; streakWeeks: number;
}) {
  const items = [
    { icon: <Gamepad2 size={18} color="#60a5fa" />, value: String(gamesPlayed), label: "Games Played" },
    { icon: <CheckCircle size={18} color="#4ade80" />, value: `${Math.round(attendanceRate)}%`, label: "Attendance" },
    { icon: <Star size={18} color="#eab308" />, value: reputationScore.toLocaleString(), label: "REP Earned" },
    { icon: <Flame size={18} color="#f97316" />, value: `${streakWeeks}w`, label: "Streak" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
      {items.map(it => (
        <div key={it.label} style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{it.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{it.value}</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}
