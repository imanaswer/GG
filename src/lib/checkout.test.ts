import { describe, it, expect } from "vitest";
import {
  campChargePaise,
  workshopChargePaise,
  gameChargePaise,
  eventChargePaise,
  coachChargePaise,
  assertOrderBinding,
  NotPayableError,
} from "./checkout";

describe("checkout charge derivation (paise, server-authoritative)", () => {
  it("converts rupee-priced entities to paise", () => {
    expect(campChargePaise({ price: 3000 })).toBe(300000);
    expect(workshopChargePaise({ price: 499 })).toBe(49900);
    expect(gameChargePaise({ costAmount: 150 })).toBe(15000);
  });

  it("rejects free/zero-priced entities instead of charging 0", () => {
    expect(() => campChargePaise({ price: 0 })).toThrow(NotPayableError);
    expect(() => workshopChargePaise({ price: 0 })).toThrow(NotPayableError);
    expect(() => gameChargePaise({ costAmount: 0 })).toThrow(NotPayableError);
    expect(() => campChargePaise({ price: -100 })).toThrow(NotPayableError);
  });

  it("derives event charge including gst + convenience fee", () => {
    // base 1000 + 18% gst (180) + 2% convenience (20) = 1200 rupees = 120000 paise
    expect(eventChargePaise({ entryFeeAmount: 1000, gstPercent: 18, convenienceFeePct: 2 })).toBe(120000);
  });

  it("charges coach only for a single fixed price", () => {
    expect(coachChargePaise({ priceMin: 800, priceMax: 800 })).toBe(80000);
    expect(coachChargePaise({ priceMin: 800, priceMax: 0 })).toBe(80000); // single-price convention
    expect(() => coachChargePaise({ priceMin: 500, priceMax: 900 })).toThrow(NotPayableError); // range
    expect(() => coachChargePaise({ priceMin: 0, priceMax: 0 })).toThrow(NotPayableError); // no price
  });
});

describe("assertOrderBinding — cross-entity replay guard", () => {
  const order = { userId: "u1", entityType: "game", entityId: "g1", amount: 15000 };

  it("accepts a matching order", () => {
    expect(assertOrderBinding(order, { userId: "u1", entityType: "game", entityId: "g1" })).toEqual({ ok: true });
  });

  it("rejects redeeming a game order against a coach (the exploit)", () => {
    const r = assertOrderBinding(order, { userId: "u1", entityType: "coach", entityId: "c9" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects an order owned by another user", () => {
    const r = assertOrderBinding(order, { userId: "attacker", entityType: "game", entityId: "g1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("rejects a missing order (fail closed)", () => {
    const r = assertOrderBinding(null, { userId: "u1", entityType: "game", entityId: "g1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});
