import { describe, it, expect } from "vitest";
import { resolvePhone, isValidPhone } from "./phone";

describe("resolvePhone", () => {
  it("uses the saved profile number, so booking stops asking again", () => {
    expect(resolvePhone("", "+91 98765 43210")).toEqual({
      value: "+91 98765 43210", valid: true, needsInput: false,
    });
  });

  it("still asks when the saved number is missing or unusable", () => {
    // Hiding the field on a malformed saved number = a 400 with nothing to fix.
    for (const saved of [undefined, null, "", "   ", "n/a", "12"]) {
      expect(resolvePhone("", saved).needsInput).toBe(true);
      expect(resolvePhone("", saved).value).toBe("");
    }
  });

  it("prefers what the player typed over the saved number", () => {
    expect(resolvePhone(" 9876543210 ", "+91 98765 43210").value).toBe("9876543210");
  });

  it("rejects junk that was typed", () => {
    expect(resolvePhone("call me", null)).toEqual({ value: "call me", valid: false, needsInput: true });
  });
});

describe("isValidPhone", () => {
  it("accepts the formats players actually type", () => {
    for (const v of ["+91 98765 43210", "9876543210", "098-765-4321"]) expect(isValidPhone(v)).toBe(true);
  });
});
