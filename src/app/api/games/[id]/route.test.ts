import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sessionMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    game: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    gamePlayer: { findUnique: vi.fn(), create: vi.fn() },
    waitlistEntry: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
  };
  const sessionMock = vi.fn();
  return { prismaMock, sessionMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = {} as Request;
const future = new Date(Date.now() + 60 * 60_000).toISOString();
const past = new Date(Date.now() - 60 * 60_000).toISOString();

async function jsonOf(res: Response) {
  return (await res.json()) as { ok: boolean; error?: string; data?: { waitlisted?: boolean; joined?: boolean } };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
  prismaMock.gamePlayer.findUnique.mockResolvedValue(null);
});

it("rejects joining a game that already started, without touching gamePlayer.create", async () => {
  prismaMock.game.findUnique.mockResolvedValue({ organizerId: "org", status: "open", scheduledAt: past, duration: 60, slotsLeft: 5 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await POST(req as any, ctx("g1"));
  const j = await jsonOf(res);
  expect(res.status).toBe(400);
  expect(j.error).toBe("This game has already ended.");
  expect(prismaMock.gamePlayer.create).not.toHaveBeenCalled();
});

it("blocks the host from joining their own game", async () => {
  sessionMock.mockResolvedValue({ id: "org" });
  prismaMock.game.findUnique.mockResolvedValue({ organizerId: "org", status: "open", scheduledAt: future, duration: 60, slotsLeft: 5 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = await jsonOf(await POST(req as any, ctx("g1")));
  expect(j.error).toBe("You are already the host of this game.");
});

it("waitlists when the atomic slot claim finds no slot left", async () => {
  prismaMock.game.findUnique.mockResolvedValue({ organizerId: "org", status: "open", scheduledAt: future, duration: 60, slotsLeft: 1 });
  prismaMock.game.updateMany.mockResolvedValue({ count: 0 }); // someone else took the last slot
  prismaMock.waitlistEntry.findFirst.mockResolvedValue(null);
  prismaMock.waitlistEntry.count.mockResolvedValue(2);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = await jsonOf(await POST(req as any, ctx("g1")));
  expect(j.data?.waitlisted).toBe(true);
  expect(prismaMock.gamePlayer.create).not.toHaveBeenCalled();
});

it("joins when a slot is atomically claimed", async () => {
  prismaMock.game.findUnique
    .mockResolvedValueOnce({ organizerId: "org", status: "open", scheduledAt: future, duration: 60, slotsLeft: 3 })
    .mockResolvedValueOnce({ slotsLeft: 2, status: "open" }); // post-claim read
  prismaMock.game.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.gamePlayer.create.mockResolvedValue({ id: "gp1" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = await jsonOf(await POST(req as any, ctx("g1")));
  expect(j.data?.joined).toBe(true);
  expect(prismaMock.gamePlayer.create).toHaveBeenCalledWith({ data: { gameId: "g1", userId: "u1" } });
});
