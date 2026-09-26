"use client";
import type { ProfileSeason } from "@/hooks/useData";

export function SeasonStrip({ season }: { season: ProfileSeason }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 18,
      }}>
        <span style={{
          fontSize: 11, color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase", letterSpacing: "0.15em",
        }}>
          Season · {season.label}
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{season.daysLeft}d remaining</span>
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{season.rep.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Season Rep</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>#{season.rank}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Season Rank</div>
        </div>
      </div>
    </div>
  );
}
