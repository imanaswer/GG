"use client";
import { ACHIEVEMENT_CATEGORIES, type Achievement, type AchievementCategory } from "@/lib/achievements";

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  sports: "Sports", consistency: "Consistency", community: "Community", competition: "Competition",
};

function Badge({ a }: { a: Achievement }) {
  return (
    <div style={{
      width: 110, flexShrink: 0, textAlign: "center", padding: "20px 10px",
      borderRadius: 12,
      background: a.unlocked ? "rgba(255,255,255,0.03)" : "transparent",
      border: `1px solid ${a.unlocked ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
      opacity: a.unlocked ? 1 : 0.5,
      transition: "opacity 300ms ease",
    }}>
      <div style={{ fontSize: 28, marginBottom: 8, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.unlocked ? a.icon : "🔒"}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{a.title}</div>
      {a.unlocked
        ? <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3, lineHeight: 1.3 }}>{a.description}</div>
        : a.progress && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 600 }}>{a.progress.current}/{a.progress.target}</div>}
    </div>
  );
}

export function AchievementsRail({ achievements, variant = "rail" }: { achievements: Achievement[]; variant?: "rail" | "grid" }) {
  if (variant === "rail") {
    const ordered = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
    return (
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingTop: 28, paddingBottom: 12,
      }}>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase", letterSpacing: "0.15em",
          marginBottom: 16,
        }}>Achievements</div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {ordered.slice(0, 8).map(a => <Badge key={a.id} a={a} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {ACHIEVEMENT_CATEGORIES.map(cat => {
        const inCat = achievements.filter(a => a.category === cat);
        if (!inCat.length) return null;
        return (
          <div key={cat}>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase", letterSpacing: "0.15em",
              marginBottom: 14,
            }}>{CATEGORY_LABEL[cat]}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {inCat.map(a => <Badge key={a.id} a={a} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
