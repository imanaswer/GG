import { describe, it, expect } from "vitest";
import { computeEventCharge } from "./eventPricing";

describe("computeEventCharge", () => {
  it("fee only (no gst/conv) → total equals base", () => {
    expect(computeEventCharge({ entryFeeAmount: 500 })).toEqual({ base: 500, gst: 0, convenience: 0, total: 500 });
  });
  it("applies both percentages to the base fee", () => {
    expect(computeEventCharge({ entryFeeAmount: 500, gstPercent: 18, convenienceFeePct: 2 }))
      .toEqual({ base: 500, gst: 90, convenience: 10, total: 600 });
  });
  it("rounds each component to the nearest rupee", () => {
    // 18% of 505 = 90.9 → 91
    expect(computeEventCharge({ entryFeeAmount: 505, gstPercent: 18 }).gst).toBe(91);
  });
  it("zero or negative fee → all zero", () => {
    expect(computeEventCharge({ entryFeeAmount: 0, gstPercent: 18 })).toEqual({ base: 0, gst: 0, convenience: 0, total: 0 });
    expect(computeEventCharge({ entryFeeAmount: -50 }).base).toBe(0);
  });
});
