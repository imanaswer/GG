import { describe, it, expect } from "vitest";
import { computeProfileCompletion } from "./profileCompletion";

describe("computeProfileCompletion", () => {
  it("is 0% with nothing done", () => {
    const r = computeProfileCompletion({ hasAvatar: false, hasFavoriteSport: false, gamesPlayed: 0, hasCompletedBooking: false });
    expect(r.pct).toBe(0);
    expect(r.items.map(i => i.done)).toEqual([false, false, false, false]);
  });
  it("is 75% with three of four done", () => {
    const r = computeProfileCompletion({ hasAvatar: true, hasFavoriteSport: true, gamesPlayed: 3, hasCompletedBooking: false });
    expect(r.pct).toBe(75);
    expect(r.items.find(i => i.key === "booking")!.done).toBe(false);
  });
  it("is 100% when all done", () => {
    const r = computeProfileCompletion({ hasAvatar: true, hasFavoriteSport: true, gamesPlayed: 1, hasCompletedBooking: true });
    expect(r.pct).toBe(100);
  });
});
