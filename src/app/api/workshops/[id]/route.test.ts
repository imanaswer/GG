import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sessionMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    workshop: { findUnique: vi.fn(), update: vi.fn() },
    workshopRegistration: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock, sessionMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));
vi.mock("@/lib/reputationService", () => ({ recordActivityAndRecompute: vi.fn() }));

import { POST, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;
const future = new Date(Date.now() + 7 * 864e5);

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
});

describe("POST /workshops/[id] — paid-registration bypass guard", () => {
  it("rejects direct registration for a PAID workshop without creating a registration", async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 10, registrationDeadline: future, price: 499, status: "open" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ participantName: "A", registrationType: "adult" }) as any, ctx("w1"));
    const j = (await res.json()) as { ok: boolean; error?: string };
    expect(res.status).toBe(402);
    expect(j.error).toBe("This workshop requires payment to register");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("still allows direct registration for a FREE workshop (price 0)", async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({ participants: 0, maxParticipants: 10, registrationDeadline: future, price: 0, status: "open" });
    prismaMock.workshopRegistration.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ participantName: "A", registrationType: "adult" }) as any, ctx("w1"));
    const j = (await res.json()) as { ok: boolean; data?: { registered?: boolean } };
    expect(res.status).toBe(200);
    expect(j.data?.registered).toBe(true);
  });
});

// ── Cancellation of a PAID registration ───────────────────────────────────────
// The bug this locks down: DELETE used to remove the registration row outright,
// which handed the seat back for resale AND destroyed the only record that the
// money was still ours. Camps and events were fixed; workshops was missed.
describe("DELETE /workshops/[id] — paid cancellation leaves a refund trail", () => {
  const tx = () => ({
    workshopRegistration: { update: vi.fn(), delete: vi.fn() },
    workshop: { update: vi.fn() },
    payment: { findFirst: vi.fn(), update: vi.fn() },
  });

  it("marks a PAID registration refund_pending instead of deleting it", async () => {
    prismaMock.workshopRegistration.findFirst.mockResolvedValue({ id: "r1", paymentStatus: "paid" });
    prismaMock.workshop.findUnique.mockResolvedValue({ startDate: future, status: "full" });
    const t = tx();
    t.payment.findFirst.mockResolvedValue({ id: "p1" });          // real money was taken
    prismaMock.$transaction.mockImplementation(async (fn: (c: unknown) => unknown) => fn(t));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE({} as any, ctx("w1"));
    const j = (await res.json()) as { ok: boolean; data: { refundDue?: boolean } };

    expect(j.data.refundDue).toBe(true);
    expect(t.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "refund_pending" } }),
    );
    expect(t.workshopRegistration.delete).not.toHaveBeenCalled();  // the row survives
    expect(t.workshopRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "cancelled", paymentStatus: "refund_pending" }) }),
    );
  });

  it("still deletes an UNPAID registration — there is nothing to refund", async () => {
    prismaMock.workshopRegistration.findFirst.mockResolvedValue({ id: "r2", paymentStatus: "pending" });
    prismaMock.workshop.findUnique.mockResolvedValue({ startDate: future, status: "open" });
    const t = tx();
    prismaMock.$transaction.mockImplementation(async (fn: (c: unknown) => unknown) => fn(t));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE({} as any, ctx("w2"));
    const j = (await res.json()) as { data: { refundDue?: boolean } };

    expect(j.data.refundDue).toBe(false);
    expect(t.workshopRegistration.delete).toHaveBeenCalled();
    expect(t.payment.update).not.toHaveBeenCalled();
  });

  it("does not re-cancel an already-cancelled registration", async () => {
    prismaMock.workshopRegistration.findFirst.mockResolvedValue(null);   // status:{not:"cancelled"} filtered it out
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE({} as any, ctx("w3"));
    expect(res.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// ── The overselling race ──────────────────────────────────────────────────────
// The capacity check and the increment used to be separate statements, so two
// users taking the last seat both passed the check and both incremented. The
// guard now lives in the WHERE clause, where the database resolves the race.
describe("POST /workshops/[id] — the last seat is claimed atomically", () => {
  it("claims conditionally on participants < max, not on a stale read", async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({ participants: 9, maxParticipants: 10, registrationDeadline: future, price: 0, status: "open" });
    prismaMock.workshopRegistration.findFirst.mockResolvedValue(null);
    const tx = {
      workshop: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workshopRegistration: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (fn: (c: unknown) => unknown) => fn(tx));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await POST(req({ participantName: "P", registrationType: "adult" }) as any, ctx("w1"));

    expect(tx.workshop.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ participants: { lt: 10 } }),
    }));
  });

  it("refuses with 409 when the claim matches no rows — someone else took it", async () => {
    prismaMock.workshop.findUnique.mockResolvedValue({ participants: 9, maxParticipants: 10, registrationDeadline: future, price: 0, status: "open" });
    prismaMock.workshopRegistration.findFirst.mockResolvedValue(null);
    const tx = {
      workshop: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }, // lost the race
      workshopRegistration: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (fn: (c: unknown) => unknown) => fn(tx));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req({ participantName: "P", registrationType: "adult" }) as any, ctx("w1"));

    expect(res.status).toBe(409);
    expect(tx.workshopRegistration.create).not.toHaveBeenCalled(); // no seat, no row
  });
});
