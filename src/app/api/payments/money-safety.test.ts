import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The re-registration money bug, both halves.
 *
 * Order of operations is create-order → gateway → verify, so Razorpay has ALREADY
 * captured by the time verify runs. Any refusal verify invents after that point is
 * money taken for nothing — and the mobile client treats a 409 from verify as
 * success-equivalent, so the user is shown a confirmation for a seat they don't hold.
 *
 * Cancelling a PAID registration keeps the row (it carries the refund owed) and with
 * it @@unique([entityId, userId]), so re-registering used to land exactly there.
 */

const { prismaMock, sessionMock, fetchMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    camp: { findUnique: vi.fn(), updateMany: vi.fn() },
    campRegistration: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    workshopRegistration: { findFirst: vi.fn() },
    eventRegistration: { findFirst: vi.fn() },
    payment: { findFirst: vi.fn(), create: vi.fn() },
    paymentOrder: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock, sessionMock: vi.fn(), fetchMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));
vi.mock("@/lib/ops", () => ({ logOpsSafe: vi.fn() }));

import { POST as verify } from "./verify/route";
import { POST as createOrder } from "./create-order/route";

const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const futureDate = new Date(Date.now() + 7 * 86_400_000);

const paidCampBody = {
  razorpay_order_id: "order_1",
  razorpay_payment_id: "pay_1",
  razorpay_signature: "sig",
  entityType: "camp",
  entityId: "camp1",
  registration: { childName: "Kid", childAge: 8 },
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1", name: "Ana" });
  // No gateway secret + non-production → signature verification is skipped, which is
  // the only part of verify this test isn't about.
  delete process.env.RAZORPAY_KEY_SECRET;
  prismaMock.paymentOrder.findUnique.mockResolvedValue(null);
  prismaMock.payment.findFirst.mockResolvedValue(null);
  prismaMock.camp.findUnique.mockResolvedValue({
    participants: 0, maxParticipants: 10, price: 3000, status: "open", registrationDeadline: futureDate,
  });
  prismaMock.camp.updateMany.mockResolvedValue({ count: 1 });
  // Interactive form: hand the callback the same mock as the transaction client.
  prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
});

describe("POST /payments/verify — re-registering after a paid cancellation", () => {
  it("revives the cancelled row instead of 409-ing on the unique constraint", async () => {
    prismaMock.campRegistration.updateMany.mockResolvedValue({ count: 1 }); // a cancelled row was there

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await verify(req(paidCampBody) as any);
    const j = (await res.json()) as { ok: boolean; data?: { verified?: boolean } };

    expect(res.status).toBe(200);
    expect(j.data?.verified).toBe(true);
    // Revived, not duplicated — a create here is the P2002 that ate the money.
    expect(prismaMock.campRegistration.create).not.toHaveBeenCalled();
    expect(prismaMock.campRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "cancelled" }) }),
    );
    // The capture is recorded either way — no orphaned charge.
    expect(prismaMock.payment.create).toHaveBeenCalled();
    // The seat was handed back at cancellation, so a revive must still claim one.
    expect(prismaMock.camp.updateMany).toHaveBeenCalled();
  });

  it("still creates a registration for a first-time registrant", async () => {
    prismaMock.campRegistration.updateMany.mockResolvedValue({ count: 0 }); // nothing to revive

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await verify(req(paidCampBody) as any);

    expect(res.status).toBe(200);
    expect(prismaMock.campRegistration.create).toHaveBeenCalled();
    expect(prismaMock.payment.create).toHaveBeenCalled();
  });
});

describe("POST /payments/create-order — already-registered gate", () => {
  it("refuses BEFORE the gateway when a live registration exists", async () => {
    prismaMock.campRegistration.findFirst.mockResolvedValue({ id: "r1" });
    vi.stubGlobal("fetch", fetchMock);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await createOrder(req({ entityType: "camp", entityId: "camp1" }) as any);

    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();      // no Razorpay order minted
    expect(prismaMock.paymentOrder.create).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("lets a cancelled registration through — that seat was given back", async () => {
    // The gate filters status != cancelled, so findFirst finds nothing.
    prismaMock.campRegistration.findFirst.mockResolvedValue(null);
    prismaMock.paymentOrder.create.mockResolvedValue({});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await createOrder(req({ entityType: "camp", entityId: "camp1" }) as any);

    expect(res.status).toBe(200);           // dev-mode mock order (no keys set)
    expect(prismaMock.campRegistration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { not: "cancelled" } }) }),
    );
  });
});
