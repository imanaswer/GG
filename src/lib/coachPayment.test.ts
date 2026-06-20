import { describe, it, expect } from "vitest";
import { isInstantPayEligible, coachInstantChargeRupees } from "./coachPayment";

describe("isInstantPayEligible", () => {
  it("is true when priceMin equals priceMax and is positive", () => {
    expect(isInstantPayEligible({ priceMin: 2000, priceMax: 2000 })).toBe(true);
  });
  it("is false for a price range", () => {
    expect(isInstantPayEligible({ priceMin: 1000, priceMax: 2000 })).toBe(false);
  });
  it("is false when the price is zero", () => {
    expect(isInstantPayEligible({ priceMin: 0, priceMax: 0 })).toBe(false);
  });
});

describe("coachInstantChargeRupees", () => {
  it("returns the fixed price for an eligible coach", () => {
    expect(coachInstantChargeRupees({ priceMin: 2000, priceMax: 2000 })).toBe(2000);
  });
  it("throws for an ineligible coach", () => {
    expect(() => coachInstantChargeRupees({ priceMin: 1000, priceMax: 2000 })).toThrow();
  });
});
