import { describe, it, expect } from "vitest";
import { computeAchievements, ACHIEVEMENT_CATEGORIES } from "./achievements";

const base = { gamesPlayed: 0, gamesOrganized: 0, attendanceRate: 100, streakWeeks: 0, tier: "bronze" };

describe("computeAchievements", () => {
  it("unlocks first-match at 1 game and reports progress when locked", () => {
    const a = computeAchievements({ ...base, gamesPlayed: 0 });
    const first = a.find(x => x.id === "first-match")!;
    expect(first.unlocked).toBe(false);
    expect(first.progress).toEqual({ current: 0, target: 1 });

    const a2 = computeAchievements({ ...base, gamesPlayed: 1 });
    expect(a2.find(x => x.id === "first-match")!.unlocked).toBe(true);
  });
  it("locks regular until 10 games with progress", () => {
    const r = computeAchievements({ ...base, gamesPlayed: 4 }).find(x => x.id === "regular")!;
    expect(r.unlocked).toBe(false);
    expect(r.progress).toEqual({ current: 4, target: 10 });
  });
  it("unlocks streak and reliable on consistency", () => {
    const a = computeAchievements({ ...base, streakWeeks: 4, attendanceRate: 96 });
    expect(a.find(x => x.id === "streak-4")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "reliable")!.unlocked).toBe(true);
  });
  it("unlocks tier achievements up to current tier", () => {
    const a = computeAchievements({ ...base, tier: "gold" });
    expect(a.find(x => x.id === "tier-bronze")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "tier-silver")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "tier-gold")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "tier-elite")!.unlocked).toBe(false);
  });
  it("assigns every achievement to a known category", () => {
    for (const x of computeAchievements(base)) {
      expect(ACHIEVEMENT_CATEGORIES).toContain(x.category);
    }
  });
});
