import { describe, it, expect } from "vitest";
import { progressToNextTier, getTier, TIER_THRESHOLDS, TIERS } from "./reputation";

// The mobile app used to mirror TIER_THRESHOLDS locally and drifted. It now reads
// `progress` off GET /api/users/:id, so these assertions are the shared contract:
// if the ladder is retuned, the served shape must still describe it correctly.
describe("progressToNextTier", () => {
  it("reports the next tier and the score that unlocks it", () => {
    const p = progressToNextTier(TIER_THRESHOLDS.silver);
    expect(p.current).toBe("silver");
    expect(p.next).toBe("gold");
    expect(p.nextAt).toBe(TIER_THRESHOLDS.gold);
    expect(p.pointsToNext).toBe(TIER_THRESHOLDS.gold - TIER_THRESHOLDS.silver);
    expect(p.pct).toBe(0);
  });

  it("never claims points are owed for a tier already held", () => {
    // The drift bug: a player at silver was told to earn silver again.
    for (const tier of TIERS) {
      const p = progressToNextTier(TIER_THRESHOLDS[tier]);
      expect(p.current).toBe(tier);
      expect(p.next).not.toBe(tier);
    }
  });

  it("caps out at the top tier with no next", () => {
    const top = TIERS[TIERS.length - 1];
    const p = progressToNextTier(TIER_THRESHOLDS[top] + 5000);
    expect(p.current).toBe(top);
    expect(p.next).toBeNull();
    expect(p.nextAt).toBeNull();
    expect(p.pct).toBe(100);
    expect(p.pointsToNext).toBe(0);
  });

  it("reaches 100% exactly when the next threshold is met", () => {
    const justBelow = progressToNextTier(TIER_THRESHOLDS.gold - 1);
    expect(justBelow.current).toBe("silver");
    expect(justBelow.pointsToNext).toBe(1);
    expect(getTier(TIER_THRESHOLDS.gold)).toBe("gold");
  });

  it("keeps pct inside 0-100 for a score below the bottom threshold", () => {
    const p = progressToNextTier(0);
    expect(p.pct).toBeGreaterThanOrEqual(0);
    expect(p.pct).toBeLessThanOrEqual(100);
  });
});
