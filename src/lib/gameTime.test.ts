import { describe, it, expect } from "vitest";
import {
  timeSlots, isSlotPast, validateGameSchedule, joinability, SCHEDULE_BUFFER_MIN,
  withinCancelCutoff, CANCEL_CUTOFF_MIN, CANCEL_CUTOFF_MESSAGE,
} from "./gameTime";

describe("timeSlots", () => {
  const slots = timeSlots(15);
  it("produces 96 quarter-hour slots", () => {
    expect(slots).toHaveLength(96);
  });
  it("formats 24h value and 12h label", () => {
    expect(slots[0]).toEqual({ value: "00:00", label: "12:00 AM" });
    expect(slots[49]).toEqual({ value: "12:15", label: "12:15 PM" });
    expect(slots.find(s => s.value === "18:15")).toEqual({ value: "18:15", label: "6:15 PM" });
  });
});

describe("isSlotPast", () => {
  const now = new Date("2026-06-11T19:30:00");
  it("is true for an earlier slot today", () => {
    expect(isSlotPast("18:00", "2026-06-11", now)).toBe(true);
  });
  it("is true for the slot equal to now", () => {
    expect(isSlotPast("19:30", "2026-06-11", now)).toBe(true);
  });
  it("is false for a later slot today", () => {
    expect(isSlotPast("19:45", "2026-06-11", now)).toBe(false);
  });
  it("is false for any slot on a future date", () => {
    expect(isSlotPast("06:00", "2026-06-12", now)).toBe(false);
  });
});

describe("validateGameSchedule", () => {
  const now = new Date("2026-06-11T19:00:00");
  it("rejects a past time", () => {
    expect(validateGameSchedule(new Date("2026-06-11T18:00:00").toISOString(), now))
      .toEqual({ ok: false, message: "This game cannot be scheduled in the past." });
  });
  it("rejects within the 15-minute buffer", () => {
    expect(validateGameSchedule(new Date("2026-06-11T19:10:00").toISOString(), now))
      .toEqual({ ok: false, message: "Games must be scheduled at least 15 minutes in advance." });
  });
  it("accepts a time beyond the buffer", () => {
    expect(validateGameSchedule(new Date("2026-06-11T19:30:00").toISOString(), now))
      .toEqual({ ok: true });
  });
  it("uses a 15-minute buffer", () => {
    expect(SCHEDULE_BUFFER_MIN).toBe(15);
  });
});

describe("joinability", () => {
  const now = new Date("2026-06-11T19:00:00");
  const base = { organizerId: "org", status: "open", scheduledAt: "2026-06-11T20:00:00", duration: 60 };

  it("blocks the host first", () => {
    expect(joinability({ ...base }, now, "org")).toBe("You are already the host of this game.");
  });
  it("blocks cancelled/completed/archived", () => {
    expect(joinability({ ...base, status: "cancelled" }, now, "u1")).toBe("This game is no longer accepting players.");
    expect(joinability({ ...base, status: "completed" }, now, "u1")).toBe("This game is no longer accepting players.");
    expect(joinability({ ...base, status: "archived" }, now, "u1")).toBe("This game is no longer accepting players.");
  });
  it("blocks a game that already ended (start + duration < now)", () => {
    expect(joinability({ ...base, scheduledAt: "2026-06-11T17:00:00", duration: 60 }, now, "u1"))
      .toBe("This game has already ended.");
  });
  it("blocks a game that already started but not ended", () => {
    expect(joinability({ ...base, scheduledAt: "2026-06-11T18:30:00", duration: 60 }, now, "u1"))
      .toBe("This game has already started.");
  });
  it("returns null for a joinable future game", () => {
    expect(joinability({ ...base }, now, "u1")).toBeNull();
  });
  it("checks host before anything else", () => {
    expect(joinability({ ...base, status: "cancelled" }, now, "org"))
      .toBe("You are already the host of this game.");
  });
});

describe("withinCancelCutoff", () => {
  const now = new Date("2026-06-11T12:00:00Z");
  const at = (minutesFromNow: number) => new Date(now.getTime() + minutesFromNow * 60_000);

  it("allows cancelling outside the cutoff", () => {
    expect(withinCancelCutoff(at(CANCEL_CUTOFF_MIN + 1), now)).toBe(false);
  });
  it("refuses exactly at the cutoff boundary and inside it", () => {
    expect(withinCancelCutoff(at(CANCEL_CUTOFF_MIN), now)).toBe(false);
    expect(withinCancelCutoff(at(CANCEL_CUTOFF_MIN - 1), now)).toBe(true);
  });
  it("refuses a start time already in the past", () => {
    expect(withinCancelCutoff(at(-10), now)).toBe(true);
  });
  it("accepts an ISO string as well as a Date", () => {
    expect(withinCancelCutoff(at(10).toISOString(), now)).toBe(true);
  });
  it("derives the user-facing message from the same constant", () => {
    expect(CANCEL_CUTOFF_MESSAGE).toContain(String(CANCEL_CUTOFF_MIN));
  });
});
