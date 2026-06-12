import { describe, it, expect } from "vitest";
import { deriveEventStatus, eventInputSchema } from "./events";

const base = {
  published: true,
  status: "Registration Open",
  startDate: new Date("2026-07-10T10:00:00Z"),
  endDate: new Date("2026-07-12T18:00:00Z"),
  registrationDeadline: new Date("2026-07-08T23:59:00Z"),
};

describe("deriveEventStatus", () => {
  it("returns Draft for unpublished events", () => {
    expect(deriveEventStatus({ ...base, published: false }, new Date("2026-07-01"))).toBe("Draft");
  });
  it("returns Cancelled when status is Cancelled, even after end", () => {
    expect(deriveEventStatus({ ...base, status: "Cancelled" }, new Date("2026-08-01"))).toBe("Cancelled");
  });
  it("returns Live when now is between start and end", () => {
    expect(deriveEventStatus(base, new Date("2026-07-11T10:00:00Z"))).toBe("Live");
  });
  it("returns Completed after endDate (checked before Registration Closed)", () => {
    expect(deriveEventStatus(base, new Date("2026-07-20T00:00:00Z"))).toBe("Completed");
  });
  it("returns Registration Closed after deadline but before start", () => {
    expect(deriveEventStatus(base, new Date("2026-07-09T00:00:00Z"))).toBe("Registration Closed");
  });
  it("falls back to stored status before the deadline", () => {
    expect(deriveEventStatus(base, new Date("2026-07-01T00:00:00Z"))).toBe("Registration Open");
    expect(deriveEventStatus({ ...base, status: "Full" }, new Date("2026-07-01T00:00:00Z"))).toBe("Full");
  });
});

describe("eventInputSchema", () => {
  const valid = {
    title: "Summer Cup",
    sport: "Football",
    type: "Tournament",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    registrationDeadline: "2026-07-08",
    maxParticipants: 64,
    entryFeeAmount: 0,
  };
  it("accepts a minimal valid payload", () => {
    expect(eventInputSchema.parse(valid).title).toBe("Summer Cup");
  });
  it("applies defaults for omitted optional fields", () => {
    const p = eventInputSchema.parse(valid);
    expect(p.approvalMode).toBe("auto");
    expect(p.currency).toBe("INR");
    expect(p.published).toBe(false);
    expect(p.whatYouGet).toEqual([]);
  });
  it("rejects a missing title", () => {
    expect(() => eventInputSchema.parse({ ...valid, title: "" })).toThrow();
  });
  it("rejects a negative entry fee", () => {
    expect(() => eventInputSchema.parse({ ...valid, entryFeeAmount: -5 })).toThrow();
  });
  it("rejects endDate before startDate", () => {
    expect(() => eventInputSchema.parse({ ...valid, endDate: "2026-07-01" })).toThrow();
  });
});
