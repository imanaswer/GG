import { describe, it, expect } from "vitest";
import { sortEventUpdates, eventUpdateInputSchema } from "./eventUpdates";

const mk = (id: string, pinned: boolean, createdAt: string) => ({ id, title: "", body: "b", pinned, createdAt });

describe("sortEventUpdates", () => {
  it("pinned first, then newest-first within each group", () => {
    const out = sortEventUpdates([
      mk("a", false, "2026-06-01T00:00:00Z"),
      mk("b", true,  "2026-05-01T00:00:00Z"),
      mk("c", false, "2026-06-10T00:00:00Z"),
      mk("d", true,  "2026-06-05T00:00:00Z"),
    ]);
    expect(out.map(u => u.id)).toEqual(["d", "b", "c", "a"]);
  });
  it("does not mutate its input", () => {
    const input = [mk("a", false, "2026-06-01T00:00:00Z"), mk("b", true, "2026-06-02T00:00:00Z")];
    const copy = JSON.parse(JSON.stringify(input));
    sortEventUpdates(input);
    expect(input).toEqual(copy);
  });
});

describe("eventUpdateInputSchema", () => {
  it("rejects an empty body", () => {
    expect(() => eventUpdateInputSchema.parse({ body: "" })).toThrow();
  });
  it("rejects a whitespace-only body", () => {
    expect(() => eventUpdateInputSchema.parse({ body: "   " })).toThrow();
  });
  it("defaults title to '' and pinned to false", () => {
    const p = eventUpdateInputSchema.parse({ body: "Venue changed to Court 2" });
    expect(p.title).toBe("");
    expect(p.pinned).toBe(false);
    expect(p.body).toBe("Venue changed to Court 2");
  });
});
