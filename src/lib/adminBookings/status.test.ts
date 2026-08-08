import { describe, it, expect } from "vitest";
import {
  deriveRegistrationStatus, deriveGamePlayerStatus, deriveCoachBookingStatus,
  CATEGORY_STATUSES, registrationWhereForStatus, gamePlayerWhereForStatus, coachWhereForStatus,
  eventWhereForStatus, deriveEventRegistrationStatus, EVENT_STATUS_LABELS, STATUS_LABELS,
} from "./status";

describe("deriveRegistrationStatus", () => {
  it("cancelled wins over payment", () => {
    expect(deriveRegistrationStatus("cancelled", "paid")).toBe("cancelled");
  });
  it("refund due outranks cancelled — money is what the operator must see", () => {
    // Every self-cancel writes BOTH fields. When "cancelled" won, the refund was
    // invisible: no bucket, no count, no screen. This is that bug, pinned.
    expect(deriveRegistrationStatus("cancelled", "refund_pending")).toBe("refund_pending");
  });
  it("maps payment status when active", () => {
    expect(deriveRegistrationStatus("registered", "pending")).toBe("pending");
    expect(deriveRegistrationStatus("registered", "paid")).toBe("paid");
    expect(deriveRegistrationStatus("registered", "failed")).toBe("failed");
    expect(deriveRegistrationStatus("registered", "refunded")).toBe("refunded");
  });
});

describe("deriveGamePlayerStatus", () => {
  it("cancelled wins", () => expect(deriveGamePlayerStatus("cancelled", true)).toBe("cancelled"));
  it("attended true/false then joined", () => {
    expect(deriveGamePlayerStatus("joined", true)).toBe("attended");
    expect(deriveGamePlayerStatus("joined", false)).toBe("no-show");
    expect(deriveGamePlayerStatus("joined", null)).toBe("joined");
  });
});

describe("where builders", () => {
  it("registration: cancelled filters on status, others on paymentStatus", () => {
    expect(registrationWhereForStatus("cancelled")).toEqual({ status: "cancelled", paymentStatus: { not: "refund_pending" } });
    expect(registrationWhereForStatus("paid")).toEqual({ status: { not: "cancelled" }, paymentStatus: "paid" });
    expect(registrationWhereForStatus("all")).toEqual({});
  });
  it("refund_pending does NOT exclude cancelled rows — every one of them is cancelled", () => {
    // The trap: {status:{not:"cancelled"}, paymentStatus:"refund_pending"} matches
    // zero rows, so the tab would show a count it could never fill.
    expect(registrationWhereForStatus("refund_pending")).toEqual({ paymentStatus: "refund_pending" });
  });
  it("gameplayer buckets", () => {
    expect(gamePlayerWhereForStatus("cancelled")).toEqual({ status: "cancelled" });
    expect(gamePlayerWhereForStatus("attended")).toEqual({ status: { not: "cancelled" }, attended: true });
    expect(gamePlayerWhereForStatus("no-show")).toEqual({ status: { not: "cancelled" }, attended: false });
    expect(gamePlayerWhereForStatus("joined")).toEqual({ status: { not: "cancelled" }, attended: null });
    expect(gamePlayerWhereForStatus("all")).toEqual({});
  });
  it("exposes the bucket list per category", () => {
    expect(CATEGORY_STATUSES.coaches).toEqual(["pending","approved","rejected","completed","refund_pending","cancelled"]);
    expect(CATEGORY_STATUSES["play-sessions"]).toEqual(["joined","attended","no-show","cancelled"]);
    expect(CATEGORY_STATUSES.camps).toEqual(["pending","paid","failed","refund_pending","refunded","cancelled"]);
  });
  it("coach: returns empty where for all / empty", () => {
    expect(coachWhereForStatus("all")).toEqual({});
    expect(coachWhereForStatus("")).toEqual({});
  });
  it("coach: maps a concrete status to equality, giving up the refund-due rows", () => {
    expect(coachWhereForStatus("approved")).toEqual({ status: "approved", paymentStatus: { not: "refund_pending" } });
  });
  it("coach: refund due is a payment filter, not a status one", () => {
    expect(coachWhereForStatus("refund_pending")).toEqual({ paymentStatus: "refund_pending" });
  });
  it("coach: maps the 'active' pseudo-status to pending OR approved", () => {
    expect(coachWhereForStatus("active")).toEqual({ status: { in: ["pending", "approved"] } });
  });
});

describe("eventWhereForStatus (approval axis)", () => {
  it("returns {} for all/empty", () => {
    expect(eventWhereForStatus("all")).toEqual({});
    expect(eventWhereForStatus("")).toEqual({});
  });
  it("filters by the approval status directly", () => {
    expect(eventWhereForStatus("pending")).toEqual({ status: "pending", paymentStatus: { not: "refund_pending" } });
    expect(eventWhereForStatus("approved")).toEqual({ status: "approved", paymentStatus: { not: "refund_pending" } });
    expect(eventWhereForStatus("rejected")).toEqual({ status: "rejected", paymentStatus: { not: "refund_pending" } });
    expect(eventWhereForStatus("cancelled")).toEqual({ status: "cancelled", paymentStatus: { not: "refund_pending" } });
  });
  it("refund due is its own bucket", () => {
    expect(eventWhereForStatus("refund_pending")).toEqual({ paymentStatus: "refund_pending" });
  });
});

describe("deriveEventRegistrationStatus", () => {
  it("returns the approval status verbatim (a rejected paid row is 'rejected', not 'paid')", () => {
    expect(deriveEventRegistrationStatus("pending")).toBe("pending");
    expect(deriveEventRegistrationStatus("approved")).toBe("approved");
    expect(deriveEventRegistrationStatus("rejected")).toBe("rejected");
    expect(deriveEventRegistrationStatus("cancelled")).toBe("cancelled");
  });
  it("except when money is owed", () => {
    expect(deriveEventRegistrationStatus("cancelled", "refund_pending")).toBe("refund_pending");
    expect(deriveEventRegistrationStatus("approved", "paid")).toBe("approved");
  });
});

describe("deriveCoachBookingStatus", () => {
  it("returns the booking status, unless a refund is owed", () => {
    expect(deriveCoachBookingStatus("approved", "paid")).toBe("approved");
    expect(deriveCoachBookingStatus("pending", "unpaid")).toBe("pending");
    expect(deriveCoachBookingStatus("cancelled", "refund_pending")).toBe("refund_pending");
  });
});

describe("EVENT_STATUS_LABELS", () => {
  it("labels pending as approval, not payment", () => {
    expect(EVENT_STATUS_LABELS.pending).toBe("Pending approval");
    expect(EVENT_STATUS_LABELS.approved).toBe("Approved");
    expect(EVENT_STATUS_LABELS.rejected).toBe("Rejected");
  });
});

describe("CATEGORY_STATUSES.events is the approval axis", () => {
  it("lists approval buckets", () => {
    expect(CATEGORY_STATUSES.events).toEqual(["pending", "approved", "rejected", "refund_pending", "cancelled"]);
  });
});

describe("labels", () => {
  it("sources the refund-due wording from the canonical payment labels", () => {
    expect(STATUS_LABELS.refund_pending).toBe("Refund due");
    expect(EVENT_STATUS_LABELS.refund_pending).toBe("Refund due");
  });
});

// ── The partition invariant ───────────────────────────────────────────────────
// deriveXStatus (which bucket a row DISPLAYS in) and xWhereForStatus (which rows a
// bucket QUERIES) are duals. When they drift, a summary card shows a count the tab
// behind it cannot fill — which is exactly how refund_pending stayed invisible.
//
// This asserts the property directly, over every status x paymentStatus combination:
// each row matches EXACTLY ONE bucket, and that bucket is the one it displays as.
// It fails on any future edit to one side alone.
type Where = Record<string, unknown>;

/** Minimal evaluator for the where shapes these builders emit: eq, {not}, {in}. */
function matches(where: Where, row: Record<string, unknown>): boolean {
  return Object.entries(where).every(([field, cond]) => {
    const actual = row[field];
    if (cond !== null && typeof cond === "object") {
      const c = cond as { not?: unknown; in?: unknown[] };
      if ("not" in c) return actual !== c.not;
      if ("in" in c) return (c.in ?? []).includes(actual);
      throw new Error(`unsupported where shape on ${field}: ${JSON.stringify(cond)}`);
    }
    return actual === cond;
  });
}

function assertPartition(
  buckets: string[],
  whereFor: (b: string) => Where,
  derive: (row: Record<string, string>) => string,
  rows: Record<string, string>[],
) {
  for (const row of rows) {
    const hit = buckets.filter(b => matches(whereFor(b), row));
    expect(hit, `row ${JSON.stringify(row)} matched ${JSON.stringify(hit)}`).toHaveLength(1);
    expect(hit[0], `row ${JSON.stringify(row)} displays as one bucket but queries into another`)
      .toBe(derive(row));
  }
}

const cross = (statuses: string[], payments: string[]) =>
  statuses.flatMap(status => payments.map(paymentStatus => ({ status, paymentStatus })));

describe("bucket partition: display and filter agree", () => {
  it("registrations (camps / workshops)", () => {
    assertPartition(
      CATEGORY_STATUSES.camps,
      registrationWhereForStatus,
      r => deriveRegistrationStatus(r.status, r.paymentStatus),
      cross(["registered", "cancelled"], ["pending", "paid", "failed", "refund_pending", "refunded"]),
    );
  });

  it("event registrations (approval axis + payment axis)", () => {
    assertPartition(
      CATEGORY_STATUSES.events,
      eventWhereForStatus,
      r => deriveEventRegistrationStatus(r.status, r.paymentStatus),
      cross(["pending", "approved", "rejected", "cancelled"],
            ["pending", "paid", "failed", "refund_pending", "refunded"]),
    );
  });

  it("coach bookings", () => {
    assertPartition(
      CATEGORY_STATUSES.coaches,
      coachWhereForStatus,
      r => deriveCoachBookingStatus(r.status, r.paymentStatus),
      cross(["pending", "approved", "rejected", "completed", "cancelled"],
            ["unpaid", "paid", "refund_pending"]),
    );
  });
});
