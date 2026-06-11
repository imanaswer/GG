import { describe, it, expect } from "vitest";
import { bucketForCalendar, bucketForWeekday, bucketRows } from "./grouping";

// 2026-06-11T15:00Z == 2026-06-11 20:30 IST (Thursday)
const now = new Date("2026-06-11T15:00:00.000Z");

describe("bucketForCalendar", () => {
  it("buckets by IST calendar day", () => {
    expect(bucketForCalendar("2026-06-11T05:00:00.000Z", now)).toBe("today");     // Jun 11 10:30 IST
    expect(bucketForCalendar("2026-06-12T05:00:00.000Z", now)).toBe("tomorrow");
    expect(bucketForCalendar("2026-06-20T05:00:00.000Z", now)).toBe("upcoming");
    expect(bucketForCalendar("2026-06-01T05:00:00.000Z", now)).toBe("past");
  });
  it("handles the IST midnight edge", () => {
    // 2026-06-11T19:00Z == 00:30 IST Jun 12 → tomorrow
    expect(bucketForCalendar("2026-06-11T19:00:00.000Z", now)).toBe("tomorrow");
  });
  it("null / invalid → unscheduled", () => {
    expect(bucketForCalendar(null, now)).toBe("unscheduled");
    expect(bucketForCalendar("not-a-date", now)).toBe("unscheduled");
  });
});

describe("bucketForWeekday", () => {
  it("matches today/tomorrow IST weekday case-insensitively", () => {
    expect(bucketForWeekday("Thursday", now)).toBe("today");
    expect(bucketForWeekday("friday", now)).toBe("tomorrow");
    expect(bucketForWeekday("Monday", now)).toBe("upcoming");
  });
  it("empty / unknown → unscheduled", () => {
    expect(bucketForWeekday("", now)).toBe("unscheduled");
    expect(bucketForWeekday("someday", now)).toBe("unscheduled");
    expect(bucketForWeekday(undefined, now)).toBe("unscheduled");
  });
});

describe("bucketRows", () => {
  it("groups calendar rows into the bucket map", () => {
    const rows = [
      { sessionDate: "2026-06-11T05:00:00.000Z" },
      { sessionDate: "2026-06-12T05:00:00.000Z" },
      { sessionDate: null },
    ];
    const out = bucketRows(rows, "calendar", now);
    expect(out.today).toHaveLength(1);
    expect(out.tomorrow).toHaveLength(1);
    expect(out.unscheduled).toHaveLength(1);
  });
  it("groups weekday rows via extra.weekday", () => {
    const rows = [
      { sessionDate: null, extra: { weekday: "Thursday" } },
      { sessionDate: null, extra: { weekday: "" } },
    ];
    const out = bucketRows(rows, "weekday", now);
    expect(out.today).toHaveLength(1);
    expect(out.unscheduled).toHaveLength(1);
  });
});
