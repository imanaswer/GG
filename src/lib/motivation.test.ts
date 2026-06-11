import { describe, it, expect } from "vitest";
import { motivationFor } from "./motivation";

describe("motivationFor", () => {
  it("prioritises REP to next tier", () => {
    expect(motivationFor({ pointsToNext: 80, nextTierLabel: "Silver", streakWeeks: 3, nearestLocked: null, topSport: "Football" }))
      .toBe("80 REP until Silver.");
  });
  it("falls back to streak when at/away from a tier boundary but streak active", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 3, nearestLocked: null, topSport: "Football" }))
      .toBe("Join 1 more game this week to keep your 3-week streak alive.");
  });
  it("falls back to nearest locked achievement", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 0, nearestLocked: { title: "Team Player", current: 2, target: 5 }, topSport: "Football" }))
      .toBe("Play 3 more games to unlock Team Player.");
  });
  it("falls back to an encouraging line using top sport", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 0, nearestLocked: null, topSport: "Football" }))
      .toBe("You're at the top — keep your Football game sharp! 👑");
  });
  it("handles no top sport in the final fallback", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 0, nearestLocked: null, topSport: null }))
      .toBe("You're at the top — keep playing! 👑");
  });
});
