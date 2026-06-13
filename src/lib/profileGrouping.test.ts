import { describe, it, expect } from "vitest";
import { gameGroupStatus, coachBookingGroupStatus, registrationGroupStatus, selectUpcoming, canCancelEventRegistration } from "./profileGrouping";

const NOW = new Date("2026-06-11T12:00:00.000Z");
const future = "2026-06-20T10:00:00.000Z";
const past = "2026-06-01T10:00:00.000Z";

describe("gameGroupStatus", () => {
  it("cancelled status wins", () => expect(gameGroupStatus({ scheduledAt: future, status: "cancelled" }, NOW)).toBe("cancelled"));
  it("future = upcoming", () => expect(gameGroupStatus({ scheduledAt: future, status: "open" }, NOW)).toBe("upcoming"));
  it("past = completed", () => expect(gameGroupStatus({ scheduledAt: past, status: "open" }, NOW)).toBe("completed"));
});

describe("coachBookingGroupStatus", () => {
  it("maps booking lifecycle", () => {
    expect(coachBookingGroupStatus("cancelled")).toBe("cancelled");
    expect(coachBookingGroupStatus("rejected")).toBe("cancelled");
    expect(coachBookingGroupStatus("completed")).toBe("completed");
    expect(coachBookingGroupStatus("pending")).toBe("upcoming");
    expect(coachBookingGroupStatus("approved")).toBe("upcoming");
  });
});

describe("registrationGroupStatus", () => {
  it("cancelled wins, then past end = completed, else upcoming", () => {
    expect(registrationGroupStatus("cancelled", future, NOW)).toBe("cancelled");
    expect(registrationGroupStatus("registered", past, NOW)).toBe("completed");
    expect(registrationGroupStatus("registered", future, NOW)).toBe("upcoming");
  });
});

describe("selectUpcoming", () => {
  it("picks the nearest dated item", () => {
    const r = selectUpcoming([
      { type: "event", date: "2026-06-25T10:00:00.000Z", id: "e" },
      { type: "game",  date: "2026-06-12T10:00:00.000Z", id: "g" },
    ]);
    expect(r?.id).toBe("g");
  });
  it("breaks date ties by type priority (coach > game > workshop > camp > event)", () => {
    const r = selectUpcoming([
      { type: "event", date: future, id: "e" },
      { type: "game",  date: future, id: "g" },
    ]);
    expect(r?.id).toBe("g");
  });
  it("falls back to an undated coach booking only when no dated items exist", () => {
    expect(selectUpcoming([{ type: "coach", date: null, id: "c" }])?.id).toBe("c");
    expect(selectUpcoming([
      { type: "coach", date: null, id: "c" },
      { type: "game", date: future, id: "g" },
    ])?.id).toBe("g");
  });
  it("returns null when empty", () => expect(selectUpcoming([])).toBeNull());
});

describe("registrationGroupStatus — rejected", () => {
  const NOW2 = new Date("2026-06-13T00:00:00Z");
  it("groups rejected under cancelled regardless of date", () => {
    expect(registrationGroupStatus("rejected", "2026-12-01T00:00:00Z", NOW2)).toBe("cancelled");
    expect(registrationGroupStatus("rejected", "2026-01-01T00:00:00Z", NOW2)).toBe("cancelled");
  });
});

describe("canCancelEventRegistration", () => {
  const NOW2 = new Date("2026-06-13T00:00:00Z");
  it("false for terminal statuses", () => {
    expect(canCancelEventRegistration({ status: "rejected", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(false);
    expect(canCancelEventRegistration({ status: "cancelled", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(false);
  });
  it("true for active + future (>90 min)", () => {
    expect(canCancelEventRegistration({ status: "pending", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(true);
    expect(canCancelEventRegistration({ status: "approved", startDate: "2026-09-01T00:00:00Z" }, NOW2)).toBe(true);
  });
  it("false when within 90 minutes of start", () => {
    const soon = new Date(NOW2.getTime() + 60 * 60_000).toISOString(); // 60 min away
    expect(canCancelEventRegistration({ status: "approved", startDate: soon }, NOW2)).toBe(false);
  });
  it("true when no startDate is known", () => {
    expect(canCancelEventRegistration({ status: "approved" }, NOW2)).toBe(true);
  });
});
