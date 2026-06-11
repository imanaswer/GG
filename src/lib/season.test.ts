import { describe, it, expect } from "vitest";
import { currentSeason, seasonRep, SEASON_WEIGHTS } from "./season";

describe("currentSeason", () => {
  it("returns the monthly window with id, label, and bounds", () => {
    const s = currentSeason(new Date("2026-06-11T12:00:00.000Z"));
    expect(s.id).toBe("2026-06");
    expect(s.label).toBe("June 2026");
    expect(s.startsAt.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(s.endsAt.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });
  it("computes daysLeft inclusive of today", () => {
    const s = currentSeason(new Date("2026-06-29T12:00:00.000Z"));
    expect(s.daysLeft).toBe(2); // 29th and 30th
  });
});

describe("seasonRep", () => {
  it("weights in-window activity like the base reputation formula", () => {
    expect(seasonRep({ games: 2, organized: 1, camps: 0, events: 1, workshops: 0, reviews: 3 }))
      .toBe(2 * 10 + 1 * 25 + 1 * 20 + 3 * 5); // 80
    expect(seasonRep({ games: 0, organized: 0, camps: 0, events: 0, workshops: 0, reviews: 0 })).toBe(0);
  });
  it("exposes the weight table", () => {
    expect(SEASON_WEIGHTS).toEqual({ game: 10, organized: 25, camp: 30, event: 20, workshop: 15, review: 5 });
  });
});
