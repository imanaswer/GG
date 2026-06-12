import { describe, it, expect } from "vitest";
import {
  deriveRegistrationStatus, deriveGamePlayerStatus,
  CATEGORY_STATUSES, registrationWhereForStatus, gamePlayerWhereForStatus, coachWhereForStatus,
  eventWhereForStatus, deriveEventRegistrationStatus, EVENT_STATUS_LABELS,
} from "./status";

describe("deriveRegistrationStatus", () => {
  it("cancelled wins over payment", () => {
    expect(deriveRegistrationStatus("cancelled", "paid")).toBe("cancelled");
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
    expect(registrationWhereForStatus("cancelled")).toEqual({ status: "cancelled" });
    expect(registrationWhereForStatus("paid")).toEqual({ status: { not: "cancelled" }, paymentStatus: "paid" });
    expect(registrationWhereForStatus("all")).toEqual({});
  });
  it("gameplayer buckets", () => {
    expect(gamePlayerWhereForStatus("cancelled")).toEqual({ status: "cancelled" });
    expect(gamePlayerWhereForStatus("attended")).toEqual({ status: { not: "cancelled" }, attended: true });
    expect(gamePlayerWhereForStatus("no-show")).toEqual({ status: { not: "cancelled" }, attended: false });
    expect(gamePlayerWhereForStatus("joined")).toEqual({ status: { not: "cancelled" }, attended: null });
    expect(gamePlayerWhereForStatus("all")).toEqual({});
  });
  it("exposes the bucket list per category", () => {
    expect(CATEGORY_STATUSES.coaches).toEqual(["pending","approved","rejected","completed","cancelled"]);
    expect(CATEGORY_STATUSES["play-sessions"]).toEqual(["joined","attended","no-show","cancelled"]);
    expect(CATEGORY_STATUSES.camps).toEqual(["pending","paid","failed","refunded","cancelled"]);
  });
  it("coach: returns empty where for all / empty", () => {
    expect(coachWhereForStatus("all")).toEqual({});
    expect(coachWhereForStatus("")).toEqual({});
  });
  it("coach: maps a concrete status to equality", () => {
    expect(coachWhereForStatus("approved")).toEqual({ status: "approved" });
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
    expect(eventWhereForStatus("pending")).toEqual({ status: "pending" });
    expect(eventWhereForStatus("approved")).toEqual({ status: "approved" });
    expect(eventWhereForStatus("rejected")).toEqual({ status: "rejected" });
    expect(eventWhereForStatus("cancelled")).toEqual({ status: "cancelled" });
  });
});

describe("deriveEventRegistrationStatus", () => {
  it("returns the approval status verbatim (a rejected paid row is 'rejected', not 'paid')", () => {
    expect(deriveEventRegistrationStatus("pending")).toBe("pending");
    expect(deriveEventRegistrationStatus("approved")).toBe("approved");
    expect(deriveEventRegistrationStatus("rejected")).toBe("rejected");
    expect(deriveEventRegistrationStatus("cancelled")).toBe("cancelled");
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
    expect(CATEGORY_STATUSES.events).toEqual(["pending", "approved", "rejected", "cancelled"]);
  });
});
