"use client";
import Link from "next/link";
import { bucketByStatus } from "@/lib/profileGrouping";
import type { ProfileGameItem } from "@/hooks/useData";

function GameCard({ g }: { g: ProfileGameItem }) {
  return (
    <Link href={`/game/${g.id}`} style={{ textDecoration: "none", display: "block", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{g.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{g.sport} · {g.location}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: g.role === "organizer" ? "#eab308" : "#60a5fa", alignSelf: "flex-start" }}>{g.role === "organizer" ? "ORGANIZER" : "PLAYER"}</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>{new Date(g.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
    </Link>
  );
}

const GROUPS = [
  { key: "upcoming" as const, label: "Upcoming" },
  { key: "completed" as const, label: "Completed" },
  { key: "cancelled" as const, label: "Cancelled" },
];

export function GamesTab({ games }: { games: ProfileGameItem[] }) {
  const buckets = bucketByStatus(games, g => g.groupStatus);
  if (!games.length) return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", padding: "20px 0" }}>No games yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {GROUPS.map(grp => buckets[grp.key].length > 0 && (
        <div key={grp.key}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{grp.label} ({buckets[grp.key].length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {buckets[grp.key].map(g => <GameCard key={`${g.role}-${g.id}`} g={g} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
