import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const model = () => ({ update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() });
  // Loose by design: a hand-rolled Prisma stand-in indexed by model name.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    gamePlayer: model(),
    game: model(),
    waitlistEntry: model(),
    user: model(),
    campRegistration: model(),
    camp: model(),
    eventRegistration: model(),
    sportEvent: model(),
    workshopRegistration: model(),
    workshop: model(),
    // $transaction invokes the callback with the same mock object so that
    // assertions on prismaMock.<model>.<method> cover transactional calls too.
    $transaction: vi.fn(async (fn: (p: unknown) => unknown) => fn(prismaMock)),
  };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/bookings", () => ({
  approveBooking: vi.fn(async () => ({})),
  rejectBooking: vi.fn(async () => ({})),
  completeBooking: vi.fn(async () => ({})),
  cancelBooking: vi.fn(async () => ({})),
}));

import { isActionAllowed, ALLOWED_ACTIONS, applyAction, applyBulk } from "./actions";
import { approveBooking, rejectBooking, completeBooking, cancelBooking } from "@/lib/bookings";

beforeEach(() => {
  // clearAllMocks keeps the $transaction implementation; resetAllMocks would wipe it.
  vi.clearAllMocks();
});

describe("isActionAllowed", () => {
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
    for (const k of ["coaches", "play-sessions", "workshops", "camps", "events"] as const) {
      expect(Array.isArray(ALLOWED_ACTIONS[k])).toBe(true);
    }
  });
});

describe("applyAction — coach delegation", () => {
  it("approve delegates to approveBooking(id)", async () => {
    await applyAction("coaches", "id1", "approve");
    expect(approveBooking).toHaveBeenCalledWith("id1");
  });
  it("reject delegates to rejectBooking(id, reason)", async () => {
    await applyAction("coaches", "id1", "reject", { rejectionReason: "x" });
    expect(rejectBooking).toHaveBeenCalledWith("id1", "x");
  });
  it("complete delegates to completeBooking(id)", async () => {
    await applyAction("coaches", "id1", "complete");
    expect(completeBooking).toHaveBeenCalledWith("id1");
  });
  it("cancel delegates to cancelBooking(id)", async () => {
    await applyAction("coaches", "id1", "cancel");
    expect(cancelBooking).toHaveBeenCalledWith("id1");
  });
});

describe("applyAction — disallowed action", () => {
  it("throws when action is not allowed for the category", async () => {
    await expect(applyAction("camps", "id", "approve")).rejects.toThrow();
  });
});

describe("applyAction — registration cancel (camps)", () => {
  it("cancels an active registration and releases a seat (full→open)", async () => {
    prismaMock.campRegistration.findUnique.mockResolvedValue({ status: "registered", campId: "c1" });
    prismaMock.camp.findUnique.mockResolvedValue({ status: "full" });

    await applyAction("camps", "r1", "cancel");

    expect(prismaMock.campRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({ status: "cancelled", cancelledAt: expect.any(Date) }),
      }),
    );
    expect(prismaMock.camp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({ participants: { decrement: 1 }, status: "open" }),
      }),
    );
  });

  it("is idempotent — already cancelled does not double-decrement", async () => {
    prismaMock.campRegistration.findUnique.mockResolvedValue({ status: "cancelled", campId: "c1" });

    await applyAction("camps", "r1", "cancel");

    expect(prismaMock.campRegistration.update).not.toHaveBeenCalled();
    expect(prismaMock.camp.update).not.toHaveBeenCalled();
  });
});

describe("applyAction — registration payment status (camps)", () => {
  it("mark-paid sets paymentStatus to paid", async () => {
    await applyAction("camps", "r1", "mark-paid");
    expect(prismaMock.campRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1" }, data: { paymentStatus: "paid" } }),
    );
  });
  it("mark-refunded sets paymentStatus to refunded", async () => {
    await applyAction("camps", "r1", "mark-refunded");
    expect(prismaMock.campRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1" }, data: { paymentStatus: "refunded" } }),
    );
  });
});

describe("applyAction — play-session cancel", () => {
  it("cancels a joined player and releases a slot (full→open) when nobody is waitlisted", async () => {
    prismaMock.gamePlayer.findUnique.mockResolvedValue({ gameId: "g1", status: "joined" });
    prismaMock.game.findUnique.mockResolvedValue({ status: "full" });
    prismaMock.waitlistEntry.findMany.mockResolvedValue([]); // empty queue

    await applyAction("play-sessions", "p1", "cancel");

    expect(prismaMock.gamePlayer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ status: "cancelled", cancelledAt: expect.any(Date) }),
      }),
    );
    expect(prismaMock.game.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "g1" },
        data: expect.objectContaining({ slotsLeft: { increment: 1 } }),
      }),
    );
  });

  it("is idempotent — already cancelled does not release a slot", async () => {
    prismaMock.gamePlayer.findUnique.mockResolvedValue({ gameId: "g1", status: "cancelled" });

    await applyAction("play-sessions", "p1", "cancel");

    expect(prismaMock.gamePlayer.update).not.toHaveBeenCalled();
    expect(prismaMock.game.updateMany).not.toHaveBeenCalled();
  });

  it("hands the freed seat to the waitlist instead of back to open inventory", async () => {
    prismaMock.gamePlayer.findUnique
      .mockResolvedValueOnce({ gameId: "g1", status: "joined" }) // the leaver
      .mockResolvedValue(null);                                  // promoted user isn't in yet
    prismaMock.game.findUnique.mockResolvedValue({ status: "full" });
    prismaMock.waitlistEntry.findMany.mockResolvedValue([{ id: "w1", userId: "queued" }]);
    prismaMock.user.findUnique.mockResolvedValue({ id: "queued", deletedAt: null });

    await applyAction("play-sessions", "p1", "cancel");

    expect(prismaMock.gamePlayer.create).toHaveBeenCalledWith({ data: { gameId: "g1", userId: "queued" } });
    expect(prismaMock.waitlistEntry.delete).toHaveBeenCalledWith({ where: { id: "w1" } });
    // The seat transferred — it never went back to the open pool.
    expect(prismaMock.game.updateMany).not.toHaveBeenCalled();
  });
});

describe("applyAction — play-session attendance", () => {
  it("mark-attended sets attended:true", async () => {
    await applyAction("play-sessions", "p1", "mark-attended");
    expect(prismaMock.gamePlayer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" }, data: { attended: true } }),
    );
  });
  it("mark-no-show sets attended:false", async () => {
    await applyAction("play-sessions", "p1", "mark-no-show");
    expect(prismaMock.gamePlayer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" }, data: { attended: false } }),
    );
  });
});

describe("applyBulk", () => {
  it("never throws and returns per-id ok/error results", async () => {
    // First findUnique (good id) succeeds, second (bad id) returns null → "Not found".
    prismaMock.campRegistration.findUnique
      .mockResolvedValueOnce({ status: "registered", campId: "c1" })
      .mockResolvedValueOnce(null);
    prismaMock.camp.findUnique.mockResolvedValue({ status: "open" });

    const results = await applyBulk("camps", ["good", "bad"], "cancel");

    expect(results).toContainEqual({ id: "good", ok: true });
    expect(results).toContainEqual(
      expect.objectContaining({ id: "bad", ok: false, error: expect.any(String) }),
    );
    const bad = results.find((r) => r.id === "bad");
    expect(bad?.error).toBe("Not found");
  });
});
