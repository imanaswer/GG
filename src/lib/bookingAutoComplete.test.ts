import { describe, it, expect, afterEach } from "vitest";
import { autoCompleteDays, autoCompleteWindowMs } from "./bookingAutoComplete";

const original = process.env.COACH_AUTO_COMPLETE_DAYS;
afterEach(() => {
  if (original === undefined) delete process.env.COACH_AUTO_COMPLETE_DAYS;
  else process.env.COACH_AUTO_COMPLETE_DAYS = original;
});

describe("autoCompleteDays", () => {
  it("defaults to 30 days when unset", () => {
    delete process.env.COACH_AUTO_COMPLETE_DAYS;
    expect(autoCompleteDays()).toBe(30);
  });

  it("is retunable without a code change", () => {
    process.env.COACH_AUTO_COMPLETE_DAYS = "45";
    expect(autoCompleteDays()).toBe(45);
    expect(autoCompleteWindowMs()).toBe(45 * 86_400_000);
  });

  it("ignores values that would complete every live booking immediately", () => {
    // A typo'd or blank env var must not sweep up active enrollments.
    for (const bad of ["0", "-5", "soon", ""]) {
      process.env.COACH_AUTO_COMPLETE_DAYS = bad;
      expect(autoCompleteDays()).toBe(30);
    }
  });
});
