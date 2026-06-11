import { describe, it, expect } from "vitest";
import {
  VENUE_STATUSES, isVenueStatus, isBookableVenue, venueSupportsSport,
  slotAvailability, isSlotBookable, slotDurationMinutes,
  canDeleteVenue, canDeleteSlot, generateSlots,
} from "./venues";

describe("venue status", () => {
  it("has exactly the three documented statuses", () => {
    expect(VENUE_STATUSES).toEqual(["ACTIVE", "INACTIVE", "ARCHIVED"]);
  });
  it("recognises valid statuses", () => {
    expect(isVenueStatus("ACTIVE")).toBe(true);
    expect(isVenueStatus("active")).toBe(false);
    expect(isVenueStatus("DELETED")).toBe(false);
  });
  it("only ACTIVE venues are bookable", () => {
    expect(isBookableVenue("ACTIVE")).toBe(true);
    expect(isBookableVenue("INACTIVE")).toBe(false);
    expect(isBookableVenue("ARCHIVED")).toBe(false);
  });
});

describe("venueSupportsSport", () => {
  it("matches case-insensitively", () => {
    expect(venueSupportsSport(["Football", "Cricket"], "football")).toBe(true);
    expect(venueSupportsSport(["Football"], "Football")).toBe(true);
  });
  it("rejects unsupported sports", () => {
    expect(venueSupportsSport(["Football"], "Basketball")).toBe(false);
    expect(venueSupportsSport([], "Football")).toBe(false);
  });
});

describe("slotAvailability", () => {
  const now = new Date("2026-06-11T19:00:00");
  const future = "2026-06-11T20:00:00"; // > 15 min away

  it("blocks a blocked slot first", () => {
    expect(slotAvailability({ startTime: future, isBlocked: true, booked: false }, now))
      .toEqual({ available: false, reason: "blocked", message: "This slot is no longer available." });
  });
  it("blocks a booked slot", () => {
    expect(slotAvailability({ startTime: future, isBlocked: false, booked: true }, now).available).toBe(false);
    expect(slotAvailability({ startTime: future, isBlocked: false, booked: true }, now))
      .toMatchObject({ reason: "booked" });
  });
  it("blocks a slot inside the 15-minute buffer (treated as expired)", () => {
    // 19:10 is only 10 min out — must be rejected just like the create API would.
    expect(slotAvailability({ startTime: "2026-06-11T19:10:00", isBlocked: false, booked: false }, now))
      .toMatchObject({ available: false, reason: "expired" });
  });
  it("blocks a past slot", () => {
    expect(slotAvailability({ startTime: "2026-06-11T18:00:00", isBlocked: false, booked: false }, now).available).toBe(false);
  });
  it("allows a clean future slot beyond the buffer", () => {
    expect(slotAvailability({ startTime: future, isBlocked: false, booked: false }, now)).toEqual({ available: true });
    expect(isSlotBookable({ startTime: future, isBlocked: false, booked: false }, now)).toBe(true);
  });
});

describe("slotDurationMinutes", () => {
  it("computes whole-minute duration", () => {
    expect(slotDurationMinutes("2026-06-11T18:00:00", "2026-06-11T19:00:00")).toBe(60);
    expect(slotDurationMinutes("2026-06-11T18:00:00", "2026-06-11T18:30:00")).toBe(30);
  });
});

describe("deletion guards", () => {
  it("blocks venue deletion with active/upcoming games", () => {
    expect(canDeleteVenue(1)).toEqual({ ok: false, message: "This venue has active or upcoming games." });
    expect(canDeleteVenue(0)).toEqual({ ok: true });
  });
  it("blocks slot deletion with scheduled games", () => {
    expect(canDeleteSlot(2)).toEqual({ ok: false, message: "This slot already contains scheduled games." });
    expect(canDeleteSlot(0)).toEqual({ ok: true });
  });
});

describe("generateSlots", () => {
  it("tiles a single day into hourly windows", () => {
    const slots = generateSlots({ fromDate: "2026-06-12", toDate: "2026-06-12", dayStart: "18:00", dayEnd: "22:00", slotMinutes: 60 });
    expect(slots).toHaveLength(4); // 18-19, 19-20, 20-21, 21-22
    expect(slots[0].startTime).toEqual(new Date(2026, 5, 12, 18, 0, 0, 0));
    expect(slots[0].endTime).toEqual(new Date(2026, 5, 12, 19, 0, 0, 0));
    expect(slots[3].endTime).toEqual(new Date(2026, 5, 12, 22, 0, 0, 0));
  });
  it("spans multiple days", () => {
    const slots = generateSlots({ fromDate: "2026-06-12", toDate: "2026-06-14", dayStart: "18:00", dayEnd: "20:00", slotMinutes: 60 });
    expect(slots).toHaveLength(6); // 2 per day × 3 days
  });
  it("drops a trailing partial window that would overrun dayEnd", () => {
    const slots = generateSlots({ fromDate: "2026-06-12", toDate: "2026-06-12", dayStart: "18:00", dayEnd: "19:30", slotMinutes: 60 });
    expect(slots).toHaveLength(1); // only 18-19 fits; 19-20 would overrun 19:30
  });
  it("returns nothing for an inverted or zero window", () => {
    expect(generateSlots({ fromDate: "2026-06-12", toDate: "2026-06-12", dayStart: "20:00", dayEnd: "18:00", slotMinutes: 60 })).toHaveLength(0);
    expect(generateSlots({ fromDate: "2026-06-12", toDate: "2026-06-12", dayStart: "18:00", dayEnd: "20:00", slotMinutes: 0 })).toHaveLength(0);
  });
});
