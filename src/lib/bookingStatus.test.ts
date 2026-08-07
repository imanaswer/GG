import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  releasesSeat,
  refundsPayment,
  STATUS_TIMESTAMP,
  BILLABLE_STATUSES,
  TERMINAL_STATUSES,
  BookingTransitionError,
} from "./bookingStatus";

describe("canTransition", () => {
  it("allows the valid forward transitions", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("approved", "completed")).toBe(true);
    expect(canTransition("approved", "cancelled")).toBe(true);
  });

  it("blocks transitions out of terminal states", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("cancelled", "approved")).toBe(false);
    expect(canTransition("completed", "approved")).toBe(false);
  });

  it("blocks illegal jumps and no-ops", () => {
    expect(canTransition("pending", "completed")).toBe(false);
    expect(canTransition("pending", "pending")).toBe(false);
    expect(canTransition("approved", "approved")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("throws BookingTransitionError on an illegal transition", () => {
    expect(() => assertTransition("rejected", "approved")).toThrow(BookingTransitionError);
  });
  it("does not throw on a legal transition", () => {
    expect(() => assertTransition("pending", "approved")).not.toThrow();
  });
});

describe("releasesSeat", () => {
  it("releases the held seat whenever a booking ends, completion included", () => {
    expect(releasesSeat("cancelled")).toBe(true);
    expect(releasesSeat("rejected")).toBe(true);
    expect(releasesSeat("completed")).toBe(true);
    expect(releasesSeat("approved")).toBe(false);
    expect(releasesSeat("pending")).toBe(false);
  });

  it("does not strand a seat on a finished enrollment", () => {
    // Completed used to hold its seat forever. With auto-complete sweeping
    // monthly, every coach would drain to zero seats and never recover.
    expect(releasesSeat("completed")).toBe(true);
  });
});

describe("refundsPayment", () => {
  it("refunds only when the booking ended WITHOUT the service", () => {
    expect(refundsPayment("cancelled")).toBe(true);
    expect(refundsPayment("rejected")).toBe(true);
    expect(refundsPayment("approved")).toBe(false);
    expect(refundsPayment("pending")).toBe(false);
  });

  it("never refunds a completed booking", () => {
    // The trap: completed now releases a seat, and reusing releasesSeat for the
    // refund branch would refund every coaching session that ran to its end.
    expect(refundsPayment("completed")).toBe(false);
    expect(releasesSeat("completed")).toBe(true);
  });
});

describe("audit + metric sets", () => {
  it("maps each terminal/approval status to its timestamp column", () => {
    expect(STATUS_TIMESTAMP.approved).toBe("approvedAt");
    expect(STATUS_TIMESTAMP.rejected).toBe("rejectedAt");
    expect(STATUS_TIMESTAMP.completed).toBe("completedAt");
    expect(STATUS_TIMESTAMP.cancelled).toBe("cancelledAt");
    expect(STATUS_TIMESTAMP.pending).toBeNull();
  });
  it("counts only approved + completed as billable", () => {
    expect(BILLABLE_STATUSES).toEqual(["approved", "completed"]);
  });
  it("marks rejected/completed/cancelled terminal", () => {
    expect(TERMINAL_STATUSES).toEqual(["rejected", "completed", "cancelled"]);
  });
});
