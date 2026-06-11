"use client";
import type { ProfileSeason } from "@/hooks/useData";

export function SeasonStrip({ season }: { season: ProfileSeason }) {
  const cells = [
    { value: `${season.rep.toLocaleString()}`, label: "Season REP" },
    { value: `#${season.rank}`, label: "Season Rank" },
    { value: `${season.daysLeft}d`, label: "Ends In" },
  ];
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.08), #0d0d0d)", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.06em" }}>Season · {season.label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {cells.map(c => (
          <div key={c.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{c.value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
