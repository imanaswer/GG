import { describe, it, expect } from "vitest";
import { gameGroupStatus, coachBookingGroupStatus, registrationGroupStatus, selectUpcoming } from "./profileGrouping";

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
