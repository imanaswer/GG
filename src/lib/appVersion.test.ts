import { describe, it, expect } from "vitest";
import { isBelowMinimum } from "./appVersion";

describe("isBelowMinimum", () => {
  it("is a no-op when MIN_MOBILE_VERSION is unset or malformed", () => {
    // The failure this guards: a missing/typo'd env var locking out every user.
    for (const min of [undefined, null, "", "   ", "latest", "v1.2.3", "1.x"]) {
      expect(isBelowMinimum("0.0.1", min)).toBe(false);
    }
  });

  it("passes clients that send no usable version (browsers, monitors)", () => {
    for (const actual of [undefined, null, "", "unknown", "1.2.3-beta"]) {
      expect(isBelowMinimum(actual, "9.9.9")).toBe(false);
    }
  });

  it("compares segments numerically, not lexically", () => {
    // The bug a string compare ships: "1.10.0" < "1.9.0" is true for strings.
    expect(isBelowMinimum("1.10.0", "1.9.0")).toBe(false);
    expect(isBelowMinimum("1.9.0", "1.10.0")).toBe(true);
  });

  it("blocks strictly-older builds and allows equal-or-newer", () => {
    expect(isBelowMinimum("1.2.2", "1.2.3")).toBe(true);
    expect(isBelowMinimum("1.2.3", "1.2.3")).toBe(false);
    expect(isBelowMinimum("1.2.4", "1.2.3")).toBe(false);
    expect(isBelowMinimum("2.0.0", "1.9.9")).toBe(false);
  });

  it("treats missing trailing segments as zero", () => {
    expect(isBelowMinimum("1.2", "1.2.0")).toBe(false);
    expect(isBelowMinimum("1.2", "1.2.1")).toBe(true);
  });
});
