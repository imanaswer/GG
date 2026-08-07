import { describe, it, expect } from "vitest";
import {
  hostPayment, feeLabel, acceptsUpi, isValidUpiId,
  HOST_PAYMENT_DISCLAIMER, HOST_PAYMENT_METHOD_LABELS,
} from "./hostPayment";

describe("hostPayment", () => {
  const paid = {
    costAmount: 125, currency: "INR", paymentMethod: "upi",
    hostUpiId: "host@bank", hostQrUrl: "https://cdn/qr.png",
    paymentNote: "Pay after joining", venueNote: "Host pays the venue",
  };

  it("returns nothing for a free game — no fee means no payment section", () => {
    expect(hostPayment({ costAmount: 0 })).toBeNull();
    expect(hostPayment({ costAmount: -50 })).toBeNull();
  });

  it("always carries the not-the-merchant disclaimer on a paid game", () => {
    expect(hostPayment(paid)!.disclaimer).toBe(HOST_PAYMENT_DISCLAIMER);
  });

  it("hides UPI details on a cash-only game", () => {
    // A host who switches to cash must not still be shown as collecting by UPI.
    const p = hostPayment({ ...paid, paymentMethod: "cash" })!;
    expect(p.upiId).toBeNull();
    expect(p.qrUrl).toBeNull();
    expect(p.methodLabel).toBe(HOST_PAYMENT_METHOD_LABELS.cash);
  });

  it("keeps UPI details for upi and upi_cash", () => {
    expect(hostPayment({ ...paid, paymentMethod: "upi" })!.upiId).toBe("host@bank");
    expect(hostPayment({ ...paid, paymentMethod: "upi_cash" })!.qrUrl).toBe("https://cdn/qr.png");
  });

  it("falls back to upi_cash for paid games created before the method existed", () => {
    const p = hostPayment({ costAmount: 200, paymentMethod: null, hostUpiId: "a@b" })!;
    expect(p.method).toBe("upi_cash");
    expect(p.upiId).toBe("a@b");
  });

  it("treats blank strings as absent rather than rendering empty rows", () => {
    const p = hostPayment({ ...paid, hostUpiId: "   ", paymentNote: "", venueNote: "  " })!;
    expect(p.upiId).toBeNull();
    expect(p.instructions).toBeNull();
    expect(p.venueNote).toBeNull();
  });
});

describe("feeLabel", () => {
  it("reads per player, never as a total", () => {
    expect(feeLabel(125)).toBe("₹125 / player");
    expect(feeLabel(0)).toBe("Free");
  });
});

describe("isValidUpiId", () => {
  it("accepts real-world handles", () => {
    for (const id of ["name@bank", "a.b-c_1@okaxis", "9876543210@ybl"]) {
      expect(isValidUpiId(id)).toBe(true);
    }
  });
  it("rejects things that cannot be paid to", () => {
    for (const id of ["nobank", "@bank", "name@", "name@1bank", "a@b"]) {
      expect(isValidUpiId(id)).toBe(false);
    }
  });
});

describe("acceptsUpi", () => {
  it("is true only for methods that actually take UPI", () => {
    expect(acceptsUpi("upi")).toBe(true);
    expect(acceptsUpi("upi_cash")).toBe(true);
    expect(acceptsUpi("cash")).toBe(false);
    expect(acceptsUpi(null)).toBe(false);
  });
});
