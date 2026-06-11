"use client";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight, Compass } from "lucide-react";
import type { ProfileUpcoming } from "@/hooks/useData";

const BADGE: Record<string, { label: string; color: string }> = {
  coach:    { label: "COACH",    color: "#e63946" },
  game:     { label: "GAME",     color: "#60a5fa" },
  workshop: { label: "WORKSHOP", color: "#a78bfa" },
  camp:     { label: "CAMP",     color: "#4ade80" },
  event:    { label: "EVENT",    color: "#eab308" },
};

export function UpcomingCard({ upcoming }: { upcoming?: ProfileUpcoming }) {
  if (!upcoming) {
    return (
      <div style={{ background: "#0d0d0d", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 20, padding: "28px 20px", textAlign: "center" }}>
        <Compass size={28} color="rgba(255,255,255,0.4)" style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Nothing coming up</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Find a game and get back on the court.</div>
        <Link href="/play" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 18px", borderRadius: 100, background: "linear-gradient(135deg,#e63946,#b91c2d)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Find Games</Link>
      </div>
    );
  }
  const b = BADGE[upcoming.type] ?? BADGE.game;
  const when = upcoming.date ? new Date(upcoming.date).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Scheduled with coach";
  return (
    <div style={{ background: `linear-gradient(135deg, ${b.color}14, #0d0d0d)`, border: `1px solid ${b.color}33`, borderRadius: 20, padding: "18px 18px" }}>
      <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 6, background: `${b.color}22`, color: b.color, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", marginBottom: 10 }}>{b.label}</span>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{upcoming.title}</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Calendar size={13} /> {when}</span>
        {upcoming.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {upcoming.location}</span>}
      </div>
      <Link href={upcoming.href} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 100, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>View Details <ArrowRight size={14} /></Link>
    </div>
  );
}
