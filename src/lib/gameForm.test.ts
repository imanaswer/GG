import { describe, it, expect } from "vitest";
import { defaultGameTitle, formatCost } from "./gameForm";

describe("defaultGameTitle", () => {
  it("combines skill, sport and venue", () => {
    expect(defaultGameTitle("Intermediate", "Basketball", "SM Street")).toBe("Intermediate Basketball at SM Street");
  });
  it("falls back to sport when skill is missing", () => {
    expect(defaultGameTitle("", "Football", "EMS Turf")).toBe("Football at EMS Turf");
  });
  it("omits the venue clause when no venue is chosen", () => {
    expect(defaultGameTitle("Beginner", "Tennis", "")).toBe("Beginner Tennis");
  });
  it("falls back to a generic title when nothing is set", () => {
    expect(defaultGameTitle("", "", "")).toBe("Pickup game");
  });
});

describe("formatCost", () => {
  it("formats a positive whole-rupee amount", () => {
    expect(formatCost(100)).toBe("₹100");
  });
  it("returns Free for zero or negative", () => {
    expect(formatCost(0)).toBe("Free");
    expect(formatCost(-5)).toBe("Free");
  });
});
