import { describe, it, expect } from "vitest";
import { PAYMENT_STATUSES, isPaymentStatus, PAYMENT_STATUS_LABELS } from "./paymentStatus";

describe("paymentStatus", () => {
  it("exposes the canonical statuses in order", () => {
    expect(PAYMENT_STATUSES).toEqual(["pending", "paid", "failed", "refund_pending", "refunded"]);
  });
  it("validates known statuses and rejects unknown / legacy ones", () => {
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("refunded")).toBe(true);
    // Cancelled-but-not-yet-returned is a real state, not a synonym for refunded.
    expect(isPaymentStatus("refund_pending")).toBe(true);
    expect(isPaymentStatus("unpaid")).toBe(false); // legacy value is no longer valid
    expect(isPaymentStatus("")).toBe(false);
  });
  it("has a human label for every status", () => {
    for (const s of PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
