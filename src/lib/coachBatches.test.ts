import { describe, it, expect } from "vitest";
import {
  normalizeBatches,
  reconcileBatches,
  sumSeats,
  BatchValidationError,
} from "./coachBatches";

describe("normalizeBatches", () => {
  it("returns [] for null/undefined", () => {
    expect(normalizeBatches(undefined)).toEqual([]);
    expect(normalizeBatches(null)).toEqual([]);
  });

  it("throws when not an array", () => {
    expect(() => normalizeBatches({})).toThrow(BatchValidationError);
  });

  it("trims strings, defaults level, coerces and floors seats", () => {
    expect(
      normalizeBatches([{ day: " Mon ", time: " 6 AM ", level: "", seats: "8.9" }]),
    ).toEqual([{ day: "Mon", time: "6 AM", level: "All Levels", seats: 8 }]);
  });

  it("keeps an existing id when present", () => {
    expect(
      normalizeBatches([{ id: "b1", day: "Mon", time: "6 AM", level: "Beginner", seats: 5 }]),
    ).toEqual([{ id: "b1", day: "Mon", time: "6 AM", level: "Beginner", seats: 5 }]);
  });

  it("drops fully-empty rows", () => {
    expect(normalizeBatches([{ day: "", time: "", level: "All Levels", seats: 0 }])).toEqual([]);
    expect(normalizeBatches([{ day: "", time: "", seats: "" }])).toEqual([]);
  });

  it("requires day and time on a non-empty row", () => {
    expect(() => normalizeBatches([{ day: "", time: "6 AM", seats: 5 }])).toThrow(BatchValidationError);
    expect(() => normalizeBatches([{ day: "Mon", time: "", seats: 5 }])).toThrow(BatchValidationError);
  });

  it("rejects negative or non-numeric seats", () => {
    expect(() => normalizeBatches([{ day: "Mon", time: "6 AM", seats: -1 }])).toThrow(BatchValidationError);
    expect(() => normalizeBatches([{ day: "Mon", time: "6 AM", seats: "abc" }])).toThrow(BatchValidationError);
  });

  it("keeps a zero-seat row when day and time are present", () => {
    expect(normalizeBatches([{ day: "Mon", time: "6 AM", seats: 0 }])).toEqual([
      { day: "Mon", time: "6 AM", level: "All Levels", seats: 0 },
    ]);
  });
});

describe("sumSeats", () => {
  it("sums seats and handles empty", () => {
    expect(sumSeats([])).toBe(0);
    expect(sumSeats([{ seats: 3 }, { seats: 7 }])).toBe(10);
  });
});

describe("reconcileBatches", () => {
  it("classifies create / update / delete", () => {
    const existingIds = ["a", "b", "c"];
    const incoming = normalizeBatches([
      { id: "a", day: "Mon", time: "6 AM", level: "Beginner", seats: 5 }, // update
      { day: "Tue", time: "7 AM", level: "All Levels", seats: 4 }, // create
    ]);
    const r = reconcileBatches(existingIds, incoming);
    expect(r.toUpdate.map(b => b.id)).toEqual(["a"]);
    expect(r.toCreate.map(b => b.day)).toEqual(["Tue"]);
    expect(r.toDeleteIds.sort()).toEqual(["b", "c"]);
  });

  it("empty incoming deletes everything", () => {
    const r = reconcileBatches(["a", "b"], []);
    expect(r.toCreate).toEqual([]);
    expect(r.toUpdate).toEqual([]);
    expect(r.toDeleteIds.sort()).toEqual(["a", "b"]);
  });

  it("ignores an incoming id that does not exist (stale)", () => {
    const incoming = normalizeBatches([{ id: "zzz", day: "Mon", time: "6 AM", seats: 5 }]);
    const r = reconcileBatches(["a"], incoming);
    expect(r.toUpdate).toEqual([]);
    expect(r.toDeleteIds).toEqual(["a"]);
  });
});
