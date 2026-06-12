import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const model = () => ({ update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    eventRegistration: model(), sportEvent: model(), payment: model(),
    $transaction: vi.fn(async (fn: (p: unknown) => unknown) => fn(prismaMock)),
  };
  return { prismaMock };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/bookings", () => ({
  approveBooking: vi.fn(), rejectBooking: vi.fn(), completeBooking: vi.fn(), cancelBooking: vi.fn(),
}));

import { applyAction, ALLOWED_ACTIONS } from "./actions";

beforeEach(() => vi.clearAllMocks());

describe("events approval actions", () => {
  it("allows approve/reject/refund for events", () => {
    expect(ALLOWED_ACTIONS.events).toEqual(expect.arrayContaining(["approve", "reject", "refund"]));
  });

  it("approve: pending -> approved, no counter change", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    await applyAction("events", "r1", "approve");
    expect(prismaMock.eventRegistration.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "approved" }) }));
    expect(prismaMock.sportEvent.update).not.toHaveBeenCalled();
  });

  it("approve: idempotent no-op when already approved", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "approved", eventId: "e1", userId: "u1" });
    await applyAction("events", "r1", "approve");
    expect(prismaMock.eventRegistration.update).not.toHaveBeenCalled();
  });

  it("reject: releases the seat and refunds a paid Payment row", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    prismaMock.payment.findFirst.mockResolvedValue({ id: "p1" });
    prismaMock.sportEvent.findUnique.mockResolvedValue({ status: "Full" });
    await applyAction("events", "r1", "reject", { rejectionReason: "no spots" });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "refunded" } }));
    expect(prismaMock.eventRegistration.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "rejected", rejectionReason: "no spots", paymentStatus: "refunded" }) }));
    expect(prismaMock.sportEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ participants: { decrement: 1 }, status: "Registration Open" }) }));
  });

  it("reject: a FREE registration (no paid Payment row) is NOT marked refunded", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.sportEvent.findUnique.mockResolvedValue({ status: "Registration Open" });
    await applyAction("events", "r1", "reject");
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    const data = prismaMock.eventRegistration.update.mock.calls[0][0].data;
    expect(data.status).toBe("rejected");
    expect(data.paymentStatus).toBeUndefined();
  });

  it("refund: only from approved", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    await expect(applyAction("events", "r1", "refund")).rejects.toThrow();
  });

  it("cancel: a rejected row is an idempotent no-op (NO second seat decrement)", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "rejected", eventId: "e1", userId: "u1" });
    await applyAction("events", "r1", "cancel");
    expect(prismaMock.eventRegistration.update).not.toHaveBeenCalled();
    expect(prismaMock.sportEvent.update).not.toHaveBeenCalled();
  });

  it("cancel: an approved row releases the seat without refunding", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "approved", eventId: "e1", userId: "u1" });
    prismaMock.sportEvent.findUnique.mockResolvedValue({ status: "Full" });
    await applyAction("events", "r1", "cancel");
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.eventRegistration.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "cancelled" }) }));
    expect(prismaMock.sportEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ participants: { decrement: 1 } }) }));
  });
});
