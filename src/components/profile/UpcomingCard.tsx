"use client";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import type { ProfileUpcoming } from "@/hooks/useData";

export function UpcomingCard({ upcoming }: { upcoming?: ProfileUpcoming }) {
  if (!upcoming) {
    return (
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: 28, paddingBottom: 28,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Compass size={18} color="rgba(255,255,255,0.3)" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Nothing coming up</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Find a game and get back on the court.</div>
          </div>
          <Link href="/play" style={{
            marginLeft: "auto",
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 700, color: "#fff",
            textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Find Games <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }
  const when = upcoming.date ? new Date(upcoming.date).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Scheduled with coach";
  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingTop: 28, paddingBottom: 28,
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Next Up</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>{upcoming.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            {when}{upcoming.location ? ` · ${upcoming.location}` : ""}
          </div>
        </div>
        <Link href={upcoming.href} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: 700, color: "#fff",
          textDecoration: "none", whiteSpace: "nowrap",
        }}>
          View <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
