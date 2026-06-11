import { describe, it, expect } from "vitest";
import { parsePagination, parseDateRange, orderByFor } from "./query";

describe("parsePagination", () => {
  it("defaults to page 1 size 25 and clamps", () => {
    expect(parsePagination(new URLSearchParams(""))).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
    expect(parsePagination(new URLSearchParams("page=3&pageSize=10"))).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
    expect(parsePagination(new URLSearchParams("pageSize=9999")).pageSize).toBe(100); // max clamp
    expect(parsePagination(new URLSearchParams("page=0")).page).toBe(1);              // min clamp
  });
});

describe("parseDateRange", () => {
  const now = new Date("2026-06-11T15:00:00.000Z");
  it("returns undefined for all", () => {
    expect(parseDateRange(new URLSearchParams("date=all"), now)).toBeUndefined();
  });
  it("today => gte start of today", () => {
    const r = parseDateRange(new URLSearchParams("date=today"), now)!;
    expect(r.gte.toISOString()).toBe("2026-06-11T00:00:00.000Z");
  });
  it("custom uses from/to inclusive", () => {
    const r = parseDateRange(new URLSearchParams("date=custom&from=2026-06-01&to=2026-06-05"), now)!;
    expect(r.gte.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(r.lte.toISOString()).toBe("2026-06-05T23:59:59.999Z");
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
