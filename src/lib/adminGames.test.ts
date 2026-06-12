import { describe, it, expect } from "vitest";
import { isGameInMetricWeek, GAMES_WEEK_MS } from "./adminGames";

const NOW = new Date("2026-06-12T12:00:00.000Z");
const iso = (msFromNow: number) => new Date(NOW.getTime() + msFromNow).toISOString();

describe("isGameInMetricWeek", () => {
  it("includes an open game scheduled now", () => {
    expect(isGameInMetricWeek(iso(0), "open", NOW)).toBe(true);
  });

  it("includes a full game 6 days in the past", () => {
    expect(isGameInMetricWeek(iso(-6 * 86_400_000), "full", NOW)).toBe(true);
  });

  it("includes a future open game", () => {
    expect(isGameInMetricWeek(iso(3 * 86_400_000), "open", NOW)).toBe(true);
  });

  it("excludes a game older than 7 days", () => {
    expect(isGameInMetricWeek(iso(-GAMES_WEEK_MS - 1), "open", NOW)).toBe(false);
  });

  it("includes a game exactly at the 7-day boundary", () => {
    expect(isGameInMetricWeek(iso(-GAMES_WEEK_MS), "open", NOW)).toBe(true);
  });

  it("excludes completed/cancelled games inside the window", () => {
    expect(isGameInMetricWeek(iso(0), "completed", NOW)).toBe(false);
    expect(isGameInMetricWeek(iso(0), "cancelled", NOW)).toBe(false);
  });

  it("excludes an unparseable date", () => {
    expect(isGameInMetricWeek("not-a-date", "open", NOW)).toBe(false);
  });
});
