"use client";
import { ACHIEVEMENT_CATEGORIES, type Achievement, type AchievementCategory } from "@/lib/achievements";

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  sports: "Sports", consistency: "Consistency", community: "Community", competition: "Competition",
};

function Badge({ a }: { a: Achievement }) {
  return (
    <div style={{
      width: 116, flexShrink: 0, textAlign: "center", padding: "16px 10px", borderRadius: 16,
      background: a.unlocked ? "rgba(234,179,8,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${a.unlocked ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.07)"}`,
      opacity: a.unlocked ? 1 : 0.7,
    }}>
      <div style={{ fontSize: 30, marginBottom: 6, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.unlocked ? a.icon : "🔒"}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{a.title}</div>
      {a.unlocked
        ? <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{a.description}</div>
        : a.progress && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{a.progress.current}/{a.progress.target}</div>}
    </div>
  );
}

export function AchievementsRail({ achievements, variant = "rail" }: { achievements: Achievement[]; variant?: "rail" | "grid" }) {
  if (variant === "rail") {
    const ordered = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
    return (
      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Achievements</div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {ordered.slice(0, 8).map(a => <Badge key={a.id} a={a} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {ACHIEVEMENT_CATEGORIES.map(cat => {
        const inCat = achievements.filter(a => a.category === cat);
        if (!inCat.length) return null;
        return (
          <div key={cat}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{CATEGORY_LABEL[cat]}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {inCat.map(a => <Badge key={a.id} a={a} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
