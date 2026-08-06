import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { prismaMock, sessionMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    user: { findUnique: vi.fn() },
    venueSlot: { findUnique: vi.fn() },
    game: { create: vi.fn(), findMany: vi.fn() },
  };
  const sessionMock = vi.fn();
  return { prismaMock, sessionMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));

import { POST } from "./route";

const future = () => new Date(Date.now() + 2 * 60 * 60_000); // 2h out, beyond buffer
const reqWith = (body: unknown) => ({ json: async () => body } as unknown as Request);
const base = { sport: "Football", title: "5v5 kickabout", slots: 10, skillLevel: "All Levels" as const, cost: "Free", costAmount: 0 };

const activeVenueSlot = (over: Record<string, unknown> = {}) => ({
  id: "slot1", startTime: future(), endTime: new Date(future().getTime() + 60 * 60_000),
  isBlocked: false, game: null,
  venue: { id: "v1", name: "EMS Turf A", address: "EMS Stadium", lat: null, lng: null, status: "ACTIVE", supportedSports: ["Football"] },
  ...over,
});

async function jsonOf(res: Response) {
  return (await res.json()) as { ok: boolean; error?: string; data?: Record<string, unknown> };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "host1" });
  // A reachable host by default; individual tests override to exercise the gate.
  prismaMock.user.findUnique.mockResolvedValue({ phone: "+91 98765 43210" });
});

describe("POST /api/games (venue-slot booking)", () => {
  it("requires authentication", async () => {
    sessionMock.mockResolvedValue(null);
    const res = await POST(reqWith({ ...base, slotId: "slot1" }) as never);
    expect(res.status).toBe(401);
  });

  it("requires the host to have a WhatsApp number", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ phone: null });
    const res = await POST(reqWith({ ...base, slotId: "slot1" }) as never);
    const j = await jsonOf(res);
    expect(res.status).toBe(400);
    expect(j.error).toBe("Add a WhatsApp number to your profile before hosting a game.");
  });

  it("rejects a missing slot with a friendly message", async () => {
    prismaMock.venueSlot.findUnique.mockResolvedValue(null);
    const j = await jsonOf(await POST(reqWith({ ...base, slotId: "ghost" }) as never));
    expect(j.error).toBe("This slot is no longer available.");
  });

  it("rejects a non-ACTIVE venue", async () => {
    prismaMock.venueSlot.findUnique.mockResolvedValue(activeVenueSlot({ venue: { ...activeVenueSlot().venue, status: "INACTIVE" } }));
    const j = await jsonOf(await POST(reqWith({ ...base, slotId: "slot1" }) as never));
    expect(j.error).toBe("This venue is not available for booking.");
  });

  it("rejects a sport the venue does not support", async () => {
    prismaMock.venueSlot.findUnique.mockResolvedValue(activeVenueSlot());
    const j = await jsonOf(await POST(reqWith({ ...base, sport: "Basketball", slotId: "slot1" }) as never));
    expect(j.error).toBe("This venue does not support the selected sport.");
  });

  it("rejects a blocked slot", async () => {
    prismaMock.venueSlot.findUnique.mockResolvedValue(activeVenueSlot({ isBlocked: true }));
    const j = await jsonOf(await POST(reqWith({ ...base, slotId: "slot1" }) as never));
    expect(j.error).toBe("This slot is no longer available.");
  });

  it("rejects an already-booked slot", async () => {
    prismaMock.venueSlot.findUnique.mockResolvedValue(activeVenueSlot({ game: { id: "g0" } }));
    const j = await jsonOf(await POST(reqWith({ ...base, slotId: "slot1" }) as never));
    expect(j.error).toBe("This slot is no longer available.");
  });

  it("maps a unique-constraint race (P2002) to the friendly slot message", async () => {
    prismaMock.venueSlot.findUnique.mockResolvedValue(activeVenueSlot());
    prismaMock.game.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "7" }),
    );
    const res = await POST(reqWith({ ...base, slotId: "slot1" }) as never);
    const j = await jsonOf(res);
    expect(res.status).toBe(409);
    expect(j.error).toBe("This slot is no longer available.");
  });

  it("creates the game with venue/slot-derived fields on the happy path", async () => {
    const slot = activeVenueSlot();
    prismaMock.venueSlot.findUnique.mockResolvedValue(slot);
    prismaMock.game.create.mockResolvedValue({ id: "g1" });
    const res = await POST(reqWith({ ...base, slotId: "slot1" }) as never);
    expect(res.status).toBe(201);
    const data = prismaMock.game.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      venueId: "v1", slotId: "slot1", location: "EMS Turf A", address: "EMS Stadium",
      // slotsLeft is slots - 1: the host holds one of their own seats.
      duration: 60, organizerId: "host1", slots: 10, slotsLeft: 9, status: "open",
    });
    expect(data.scheduledAt).toEqual(slot.startTime);
  });
});
