import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SPORT_FALLBACKS, GAME_FALLBACKS, gameImage } from "./premium-images";

const entries = Object.entries(SPORT_FALLBACKS);

describe("SPORT_FALLBACKS", () => {
  it("points at files that actually exist in public/", () => {
    for (const [, pool] of entries) {
      for (const img of pool) {
        expect(existsSync(join(process.cwd(), "public", img.src))).toBe(true);
      }
    }
  });

  it("ships at least 30 distinct frames", () => {
    const all = entries.flatMap(([, pool]) => pool.map(i => i.src));
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(30);
  });
});

describe("gameImage", () => {
  it("stays inside the pool for the sport", () => {
    for (const [sport, pool] of entries) {
      const srcs = pool.map(i => i.src);
      for (let n = 0; n < 50; n++) expect(srcs).toContain(gameImage(sport, `seed-${n}`).src);
    }
  });

  it("varies across games of the same sport", () => {
    const seen = new Set(Array.from({ length: 50 }, (_, n) => gameImage("Badminton", `slot-${n}`).src));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("falls back to the generic pool for an unknown sport", () => {
    expect(GAME_FALLBACKS.map(i => i.src)).toContain(gameImage("Kabaddi", "slot-1").src);
  });

  it("is stable for a given seed", () => {
    expect(gameImage("Cricket", "slot-abc").src).toBe(gameImage("Cricket", "slot-abc").src);
  });
});
