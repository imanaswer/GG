import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, adminMock, actorMock } = vi.hoisted(() => {
  const model = () => ({ findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    payment: model(), paymentOrder: model(), opsEvent: model(),
    camp: model(), workshop: model(), sportEvent: model(), coach: model(),
  };
  return { prismaMock, adminMock: vi.fn(), actorMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/adminAuth", () => ({
  getAdminSessionFromRequest: adminMock,
  getAdminActor: actorMock,
}));

import { GET, PATCH } from "./route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const req = (body?: unknown): any => ({ json: async () => body });
const day = 86_400_000;

beforeEach(() => {
  vi.clearAllMocks();
  adminMock.mockResolvedValue(true);
  actorMock.mockResolvedValue({ id: "u9", name: "Anas" });
  for (const m of ["payment", "paymentOrder", "opsEvent", "camp", "workshop", "sportEvent", "coach"]) {
    prismaMock[m].findMany.mockResolvedValue([]);
    prismaMock[m].updateMany.mockResolvedValue({ count: 1 });
  }
});

describe("GET /api/admin/inbox", () => {
  it("refuses without an admin session", async () => {
    adminMock.mockResolvedValue(false);
    expect((await GET(req())).status).toBe(401);
  });

  it("a captured order WITH a Payment row is not an orphan — even a refunded one", async () => {
    // The trap documented in RUNBOOK.md: filtering the join on status "paid" would
    // false-flag every verified-then-refunded payment as money taken for nothing.
    prismaMock.paymentOrder.findMany.mockResolvedValue([
      { razorpayOrderId: "order_1", razorpayPaymentId: "pay_1", userId: "u1", entityType: "camp", entityId: "c1", amount: 300000, capturedAt: new Date(Date.now() - day) },
    ]);
    prismaMock.payment.findMany
      .mockResolvedValueOnce([])                              // refundsDue query
      .mockResolvedValueOnce([{ razorpayOrderId: "order_1" }]); // a Payment DOES exist (refunded)

    const body = await (await GET(req())).json();
    expect(body.data.orphanedCharges).toHaveLength(0);
  });

  it("a captured order with NO Payment row at all is an orphan", async () => {
    prismaMock.paymentOrder.findMany.mockResolvedValue([
      { razorpayOrderId: "order_2", razorpayPaymentId: "pay_2", userId: "u1", entityType: "camp", entityId: "c1", amount: 300000, capturedAt: new Date(Date.now() - 2 * day) },
    ]);
    prismaMock.payment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prismaMock.camp.findMany.mockResolvedValue([{ id: "c1", title: "Summer Camp" }]);

    const body = await (await GET(req())).json();
    expect(body.data.orphanedCharges).toHaveLength(1);
    expect(body.data.orphanedCharges[0]).toMatchObject({ id: "order_2", entityName: "Summer Camp", ageDays: 2 });
  });

  it("asks for orphans by the captured orders it found, not by a blanket scan", async () => {
    prismaMock.paymentOrder.findMany.mockResolvedValue([
      { razorpayOrderId: "order_3", razorpayPaymentId: null, userId: "u1", entityType: "camp", entityId: "c1", amount: 100, capturedAt: new Date(Date.now() - day) },
    ]);
    prismaMock.payment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await GET(req());

    // Pins the second query's shape so a reorder can't leave the tests asserting
    // the wrong call while still passing.
    expect(prismaMock.payment.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { razorpayOrderId: { in: ["order_3"] } },
    }));
  });

  it("sums what we owe and ages the oldest debt", async () => {
    prismaMock.payment.findMany
      .mockResolvedValueOnce([
        { id: "p1", amount: 300000, currency: "INR", entityType: "coach", entityId: "co1", razorpayPaymentId: "pay_9", razorpayOrderId: "o", createdAt: new Date(Date.now() - 9 * day), userId: "u1", user: { name: "Priya", email: "p@x.com" } },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.coach.findMany.mockResolvedValue([{ id: "co1", name: "Arun" }]);

    const body = await (await GET(req())).json();
    expect(body.data.totals).toMatchObject({ refundsDue: 1, refundsDuePaise: 300000 });
    expect(body.data.refundsDue[0]).toMatchObject({ ageDays: 9, entityName: "Arun", razorpayPaymentId: "pay_9" });
  });

  it("flags a claim nobody released as stale, so it can be taken over", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([
      { id: "e1", type: "alert.booking", title: "t", body: null, link: null, entityType: null, entityId: null,
        createdAt: new Date(), claimedById: "u1", claimedByName: "Someone", claimedAt: new Date(Date.now() - 2 * day),
        attempts: 0, deliveredAt: new Date() },
    ]);
    const body = await (await GET(req())).json();
    expect(body.data.needsAction[0].claimStale).toBe(true);
  });

  it("surfaces an alert that gave up — nobody was ever told about it", async () => {
    prismaMock.opsEvent.findMany.mockResolvedValue([
      { id: "e2", type: "refund.due", title: "t", body: null, link: null, entityType: null, entityId: null,
        createdAt: new Date(), claimedById: null, claimedByName: null, claimedAt: null,
        attempts: 5, deliveredAt: null },
    ]);
    const body = await (await GET(req())).json();
    expect(body.data.needsAction[0].undelivered).toBe(true);
  });
});

describe("PATCH /api/admin/inbox", () => {
  it("claims an unclaimed item", async () => {
    const res = await PATCH(req({ id: "e1", action: "claim" }));
    expect(res.status).toBe(200);
    expect(prismaMock.opsEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ claimedById: "u9", claimedByName: "Anas" }),
    }));
  });

  it("refuses a claim someone else already holds", async () => {
    // Conditional update: two admins clicking at once cannot both own it.
    prismaMock.opsEvent.updateMany.mockResolvedValue({ count: 0 });
    expect((await PATCH(req({ id: "e1", action: "claim" }))).status).toBe(409);
  });

  it("lets anyone release, so a holiday cannot block an item forever", async () => {
    const res = await PATCH(req({ id: "e1", action: "unclaim" }));
    expect(res.status).toBe(200);
    expect(prismaMock.opsEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { claimedById: null, claimedByName: null, claimedAt: null },
    }));
  });

  it("resolve is idempotent", async () => {
    prismaMock.opsEvent.updateMany.mockResolvedValue({ count: 0 }); // already resolved
    expect((await PATCH(req({ id: "e1", action: "resolve" }))).status).toBe(200);
  });
});
