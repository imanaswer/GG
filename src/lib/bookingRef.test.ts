import { describe, it, expect } from "vitest";
import { bookingRef, searchTerm } from "./bookingRef";

const ID = "cm3x9k2v40001abcd1234efgh";

describe("bookingRef", () => {
  it("shortens a cuid to a readable code", () => {
    expect(bookingRef(ID)).toBe("GG-34EFGH");
  });

  it("stays findable: the code is a suffix of the id it came from", () => {
    // What the admin search does — `id contains q, mode: insensitive`.
    const q = searchTerm(bookingRef(ID));
    expect(ID.toLowerCase().includes(q.toLowerCase())).toBe(true);
  });

  it("leaves a normal search alone", () => {
    expect(searchTerm("  ravi ")).toBe("ravi");
    expect(searchTerm("ravi@example.com")).toBe("ravi@example.com");
    // Only the id clause is fed through this, so stripping here cannot change
    // what a name/email search looks for.
    expect(searchTerm("gg-4f2a9c")).toBe("4f2a9c");
  });
});
