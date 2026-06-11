import { describe, it, expect } from "vitest";
import { parsePagination, parseDateRange, orderByFor, istWeekday } from "./query";

describe("parsePagination", () => {
  it("defaults to page 1 size 25 and clamps", () => {
    expect(parsePagination(new URLSearchParams(""))).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
    expect(parsePagination(new URLSearchParams("page=3&pageSize=10"))).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
    expect(parsePagination(new URLSearchParams("pageSize=9999")).pageSize).toBe(100); // max clamp
    expect(parsePagination(new URLSearchParams("page=0")).page).toBe(1);              // min clamp
  });
});

describe("parseDateRange (IST)", () => {
  // 2026-06-11T15:00:00Z == 2026-06-11 20:30 IST → IST "today" is Jun 11
  const now = new Date("2026-06-11T15:00:00.000Z");

  it("returns undefined for all", () => {
    expect(parseDateRange(new URLSearchParams("date=all"), now)).toBeUndefined();
  });

  it("today => IST day bounds (Jun 11 00:00 IST = Jun 10 18:30Z)", () => {
    const r = parseDateRange(new URLSearchParams("date=today"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-06-10T18:30:00.000Z");
    expect(r.lte!.toISOString()).toBe("2026-06-11T18:29:59.999Z");
  });

  it("tomorrow => next IST day bounds", () => {
    const r = parseDateRange(new URLSearchParams("date=tomorrow"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-06-11T18:30:00.000Z");
    expect(r.lte!.toISOString()).toBe("2026-06-12T18:29:59.999Z");
  });

  it("upcoming => from start of IST today, no upper bound", () => {
    const r = parseDateRange(new URLSearchParams("date=upcoming"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-06-10T18:30:00.000Z");
    expect(r.lte).toBeUndefined();
  });

  it("past => up to 1ms before start of IST today, no lower bound", () => {
    const r = parseDateRange(new URLSearchParams("date=past"), now)!;
    expect(r.gte).toBeUndefined();
    expect(r.lte!.toISOString()).toBe("2026-06-10T18:29:59.999Z");
  });

  it("custom interprets from/to as IST days", () => {
    const r = parseDateRange(new URLSearchParams("date=custom&from=2026-06-01&to=2026-06-05"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-05-31T18:30:00.000Z");
    expect(r.lte!.toISOString()).toBe("2026-06-05T18:29:59.999Z");
  });

  it("handles the 00:00–05:30 IST edge (19:00Z == 00:30 IST next day)", () => {
    const lateNow = new Date("2026-06-12T19:00:00.000Z"); // 00:30 IST Jun 13
    const r = parseDateRange(new URLSearchParams("date=today"), lateNow)!;
    expect(r.gte!.toISOString()).toBe("2026-06-12T18:30:00.000Z"); // Jun 13 IST start
  });
});

describe("istWeekday", () => {
  it("returns the IST weekday name for today and tomorrow", () => {
    // 2026-06-12T19:00:00Z == 2026-06-13 00:30 IST → Saturday
    const now = new Date("2026-06-12T19:00:00.000Z");
    expect(istWeekday(now, 0)).toBe("Saturday");
    expect(istWeekday(now, 1)).toBe("Sunday");
  });
});

describe("orderByFor", () => {
  it("maps sort keys to prisma orderBy on the given date fields", () => {
    expect(orderByFor("newest", "createdAt", "sessionDate")).toEqual({ createdAt: "desc" });
    expect(orderByFor("oldest", "createdAt", "sessionDate")).toEqual({ createdAt: "asc" });
    expect(orderByFor("upcoming", "createdAt", "sessionDate")).toEqual({ sessionDate: "asc" });
    expect(orderByFor("updated", "createdAt", "sessionDate")).toEqual({ updatedAt: "desc" });
  });
});
