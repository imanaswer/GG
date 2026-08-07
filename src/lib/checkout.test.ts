import { describe, it, expect } from "vitest";
import {
  campAdmission,
  workshopAdmission,
  eventAdmission,
  coachAdmission,
  campChargePaise,
  workshopChargePaise,
  eventChargePaise,
  coachChargePaise,
  assertOrderBinding,
  NotPayableError,
} from "./checkout";

describe("checkout charge derivation (paise, server-authoritative)", () => {
  it("converts rupee-priced entities to paise", () => {
    expect(campChargePaise({ price: 3000 })).toBe(300000);
    expect(workshopChargePaise({ price: 499 })).toBe(49900);
  });

  it("rejects free/zero-priced entities instead of charging 0", () => {
    expect(() => campChargePaise({ price: 0 })).toThrow(NotPayableError);
    expect(() => workshopChargePaise({ price: 0 })).toThrow(NotPayableError);
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
  const order = { userId: "u1", entityType: "camp", entityId: "c1", amount: 15000 };

  it("accepts a matching order", () => {
    expect(assertOrderBinding(order, { userId: "u1", entityType: "camp", entityId: "c1" })).toEqual({ ok: true });
  });

  it("rejects redeeming a camp order against a coach (the exploit)", () => {
    const r = assertOrderBinding(order, { userId: "u1", entityType: "coach", entityId: "c9" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects an order owned by another user", () => {
    const r = assertOrderBinding(order, { userId: "attacker", entityType: "camp", entityId: "c1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("rejects a missing order (fail closed)", () => {
    const r = assertOrderBinding(null, { userId: "u1", entityType: "camp", entityId: "c1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});

describe("admission gates — the rules create-order used to skip", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const open = { status: "open", participants: 3, maxParticipants: 10, registrationDeadline: new Date("2026-07-01T00:00:00Z") };

  it("admits an open, unfilled, in-deadline camp", () => {
    expect(campAdmission(open, now)).toBeNull();
  });

  it("refuses a closed camp, a full camp and an expired camp", () => {
    expect(campAdmission({ ...open, status: "archived" }, now)?.status).toBe(409);
    expect(campAdmission({ ...open, participants: 10 }, now)?.message).toBe("Camp is full");
    expect(campAdmission({ ...open, registrationDeadline: new Date("2026-05-01T00:00:00Z") }, now)?.message)
      .toBe("Registration deadline has passed");
  });

  it("refuses a workshop the same way", () => {
    expect(workshopAdmission(open, now)).toBeNull();
    expect(workshopAdmission({ ...open, status: "completed" }, now)?.status).toBe(409);
    expect(workshopAdmission({ ...open, participants: 99 }, now)?.message).toBe("Workshop is full");
  });

  it("refuses a cancelled or unpublished event — verify checked the deadline but not the status", () => {
    const ev = { ...open, status: "Registration Open", published: true };
    expect(eventAdmission(ev, now)).toBeNull();
    expect(eventAdmission({ ...ev, status: "Cancelled" }, now)?.status).toBe(409);
    expect(eventAdmission({ ...ev, published: false }, now)?.status).toBe(409);
  });

  it("refuses a coach who has not been approved yet", () => {
    expect(coachAdmission({ status: "active", seatsLeft: 2 })).toBeNull();
    expect(coachAdmission({ status: "pending_approval", seatsLeft: 2 })?.message)
      .toBe("This coach is not accepting bookings");
    expect(coachAdmission({ status: "inactive", seatsLeft: 2 })?.status).toBe(409);
    expect(coachAdmission({ status: "active", seatsLeft: 0 })?.message).toBe("No seats available");
  });
});
