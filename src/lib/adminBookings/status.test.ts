import { describe, it, expect } from "vitest";
import {
  deriveRegistrationStatus, deriveGamePlayerStatus,
  CATEGORY_STATUSES, registrationWhereForStatus, gamePlayerWhereForStatus,
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
});
