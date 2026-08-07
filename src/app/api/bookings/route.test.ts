import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, txMock, sessionMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txMock: any = {
    user:    { update: vi.fn() },
    coach:   { updateMany: vi.fn() },
    batch:   { findUnique: vi.fn(), update: vi.fn() },
    booking: { create: vi.fn() },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    coach: { findUnique: vi.fn() },
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(txMock)),
  };
  return { prismaMock, txMock, sessionMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));

import { POST } from "./route";

const post = (body: unknown) => POST({ json: async () => body } as never);

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
  prismaMock.coach.findUnique.mockResolvedValue({ id: "c1", seatsLeft: 3, status: "active" });
  txMock.coach.updateMany.mockResolvedValue({ count: 1 });
  txMock.booking.create.mockResolvedValue({ id: "b1" });
});

describe("POST /api/bookings — the coach seat is always claimed", () => {
  it("claims a seat for a plain booking", async () => {
    expect((await post({ coachId: "c1" })).status).toBe(200);
    expect(txMock.coach.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", seatsLeft: { gt: 0 } }, data: { seatsLeft: { decrement: 1 } },
    });
  });

  it("claims a seat AND the batch seat for a batch booking", async () => {
    txMock.batch.findUnique.mockResolvedValue({ seats: 4, coachId: "c1" });
    expect((await post({ coachId: "c1", batchId: "bt1" })).status).toBe(200);
    expect(txMock.coach.updateMany).toHaveBeenCalledOnce();
    expect(txMock.batch.update).toHaveBeenCalledWith({ where: { id: "bt1" }, data: { seats: { decrement: 1 } } });
  });

  // The bug: an unusable batch used to skip the whole claim and still create the
  // booking, so cancelling it later handed back a seat that was never taken.
  it("rejects a full batch instead of booking a seatless booking", async () => {
    txMock.batch.findUnique.mockResolvedValue({ seats: 0, coachId: "c1" });
    expect((await post({ coachId: "c1", batchId: "bt1" })).status).toBe(409);
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects a batch belonging to another coach", async () => {
    txMock.batch.findUnique.mockResolvedValue({ seats: 5, coachId: "other" });
    expect((await post({ coachId: "c1", batchId: "bt1" })).status).toBe(400);
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects a nonexistent batch", async () => {
    txMock.batch.findUnique.mockResolvedValue(null);
    expect((await post({ coachId: "c1", batchId: "nope" })).status).toBe(400);
    expect(txMock.booking.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/bookings — approval gate", () => {
  it("refuses a coach still awaiting admin approval", async () => {
    prismaMock.coach.findUnique.mockResolvedValue({ id: "c1", seatsLeft: 3, status: "pending_approval" });
    const res = await post({ coachId: "c1" });
    expect(res.status).toBe(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a coach with no seats", async () => {
    prismaMock.coach.findUnique.mockResolvedValue({ id: "c1", seatsLeft: 0, status: "active" });
    expect((await post({ coachId: "c1" })).status).toBe(400);
  });
});
