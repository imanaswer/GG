import { describe, it, expect } from "vitest";
import { PAYMENT_STATUSES, isPaymentStatus, PAYMENT_STATUS_LABELS } from "./paymentStatus";

describe("paymentStatus", () => {
  it("exposes the four canonical statuses in order", () => {
    expect(PAYMENT_STATUSES).toEqual(["pending", "paid", "failed", "refunded"]);
  });
  it("validates known statuses and rejects unknown / legacy ones", () => {
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("refunded")).toBe(true);
    expect(isPaymentStatus("unpaid")).toBe(false); // legacy value is no longer valid
    expect(isPaymentStatus("")).toBe(false);
  });
  it("has a human label for every status", () => {
    for (const s of PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
