"use client";

export function StatStrip({ gamesPlayed, attendanceRate, reputationScore, streakWeeks }: {
  gamesPlayed: number; attendanceRate: number; reputationScore: number; streakWeeks: number;
}) {
  const items = [
    { value: String(gamesPlayed), label: "Games" },
    { value: `${Math.round(attendanceRate)}%`, label: "Attendance" },
    { value: reputationScore.toLocaleString(), label: "Rep Earned" },
    { value: `${streakWeeks}w`, label: "Streak" },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: "28px 0",
      marginBottom: 12,
    }}>
      {items.map((it, i) => (
        <div key={it.label} style={{
          textAlign: "center",
          borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>{it.value}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}
