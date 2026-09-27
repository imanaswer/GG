import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

const { prismaMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    paymentOrder: { updateMany: vi.fn() },
    payment: { findFirst: vi.fn(), update: vi.fn() },
    campRegistration: { updateMany: vi.fn() },
    eventRegistration: { updateMany: vi.fn() },
  };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { POST } from "./route";
import { logger } from "@/lib/logger";

const SECRET = "test_webhook_secret_min_16";

function makeReq(payload: object, sigOverride?: string) {
  const raw = JSON.stringify(payload);
  const signature = sigOverride ?? crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-razorpay-signature" ? signature : null) },
    text: async () => raw,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const capturedEvent = (orderId: string, paymentId: string) => ({
  event: "payment.captured",
  payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 5000, currency: "INR", status: "captured" } } },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
});

describe("POST /payments/webhook", () => {
  it("rejects an invalid signature with 401 and touches no ledger", async () => {
    const res = await POST(makeReq(capturedEvent("order_1", "pay_1"), "deadbeef"));
    expect(res.status).toBe(401);
    expect(prismaMock.paymentOrder.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.payment.findFirst).not.toHaveBeenCalled();
  });

  it("H2: capture with NO Payment row records capturedAt on the order ledger (idempotent) and warns — but creates no Payment row", async () => {
    prismaMock.paymentOrder.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const res = await POST(makeReq(capturedEvent("order_2", "pay_2")));
    expect(res.status).toBe(200);

    // durably recorded on PaymentOrder, first-capture-wins via capturedAt:null guard
    expect(prismaMock.paymentOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ razorpayOrderId: "order_2", capturedAt: null }) }),
    );
    // must NOT create a Payment row — that would trip verify's replay guard and strand the seat
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("a late capture after a cancellation leaves a refund_pending row alone", async () => {
    prismaMock.paymentOrder.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.payment.findFirst.mockResolvedValue({ id: "p9", status: "refund_pending", entityType: "camp", entityId: "c1", userId: "u1" });
    const res = await POST(makeReq(capturedEvent("order_9", "pay_9")));
    expect(res.status).toBe(200);
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.campRegistration?.updateMany ?? vi.fn()).not.toHaveBeenCalled();
  });

  it("capture WITH an unpaid Payment row marks it paid, syncs registration, and does not warn", async () => {
    prismaMock.paymentOrder.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.payment.findFirst.mockResolvedValue({ id: "p1", status: "created", entityType: "event", entityId: "e1", userId: "u1" });
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.eventRegistration.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeReq(capturedEvent("order_3", "pay_3")));
    expect(res.status).toBe(200);
    expect(prismaMock.payment.update).toHaveBeenCalled();
    expect(prismaMock.eventRegistration.updateMany).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
