import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(async (fn: any) => fn(txMock)) } }));
vi.mock("@/lib/bookings", () => ({
  approveBooking: vi.fn(async () => ({})), rejectBooking: vi.fn(async () => ({})),
  completeBooking: vi.fn(async () => ({})), cancelBooking: vi.fn(async () => ({})),
}));

const txMock: any = {};

import { isActionAllowed, ALLOWED_ACTIONS } from "./actions";

describe("isActionAllowed", () => {
  beforeEach(() => vi.clearAllMocks());
  it("coaches allow approve/reject/complete/cancel only", () => {
    expect(isActionAllowed("coaches", "approve")).toBe(true);
    expect(isActionAllowed("coaches", "mark-paid")).toBe(false);
  });
  it("camps allow cancel/mark-paid/mark-refunded only", () => {
    expect(isActionAllowed("camps", "mark-paid")).toBe(true);
    expect(isActionAllowed("camps", "mark-refunded")).toBe(true);
    expect(isActionAllowed("camps", "cancel")).toBe(true);
    expect(isActionAllowed("camps", "approve")).toBe(false);
  });
  it("play-sessions allow mark-attended/mark-no-show/cancel", () => {
    expect(isActionAllowed("play-sessions", "mark-attended")).toBe(true);
    expect(isActionAllowed("play-sessions", "mark-no-show")).toBe(true);
    expect(isActionAllowed("play-sessions", "cancel")).toBe(true);
    expect(isActionAllowed("play-sessions", "mark-paid")).toBe(false);
  });
  it("ALLOWED_ACTIONS is defined for every category", () => {
    for (const k of ["coaches","play-sessions","workshops","camps","events"] as const) {
      expect(Array.isArray(ALLOWED_ACTIONS[k])).toBe(true);
    }
  });
});
