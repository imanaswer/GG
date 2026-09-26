"use client";
import Link from "next/link";
import { bucketByStatus } from "@/lib/profileGrouping";
import type { ProfileGameItem } from "@/hooks/useData";

function GameCard({ g, clickable }: { g: ProfileGameItem; clickable?: boolean }) {
  const inner = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{g.title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{g.sport} · {g.location}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{new Date(g.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        paddingTop: 2,
      }}>{g.role === "organizer" ? "ORG" : "PLR"}</span>
    </div>
  );

  const wrapStyle = {
    display: "block" as const,
    padding: "18px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    textDecoration: "none" as const,
    cursor: clickable ? "pointer" as const : "default" as const,
  };

  if (clickable) {
    return <Link href={`/game/${g.id}`} style={wrapStyle}>{inner}</Link>;
  }
  return <div style={wrapStyle}>{inner}</div>;
}


const GROUPS = [
  { key: "upcoming" as const, label: "Upcoming" },
  { key: "completed" as const, label: "Completed" },
  { key: "cancelled" as const, label: "Cancelled" },
];

export function GamesTab({ games }: { games: ProfileGameItem[] }) {
  const buckets = bucketByStatus(games, g => g.groupStatus);
  if (!games.length) return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", padding: "20px 0" }}>No games yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {GROUPS.map(grp => buckets[grp.key].length > 0 && (
        <div key={grp.key}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase", letterSpacing: "0.15em",
            marginBottom: 4,
          }}>{grp.label} ({buckets[grp.key].length})</div>
          {buckets[grp.key].map(g => <GameCard key={`${g.role}-${g.id}`} g={g} clickable={grp.key === "upcoming"} />)}
        </div>
      ))}
    </div>
  );
}
