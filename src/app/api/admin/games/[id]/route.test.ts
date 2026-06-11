import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, adminMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    game: { findUnique: vi.fn(), update: vi.fn() },
    gamePlayer: { updateMany: vi.fn() },
  };
  const adminMock = vi.fn();
  return { prismaMock, adminMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/adminAuth", () => ({ getAdminSessionFromRequest: adminMock }));
vi.mock("@/lib/reputationService", () => ({ safeRecompute: vi.fn() }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const reqWith = (body: unknown) => ({ json: async () => body } as unknown as Request);

beforeEach(() => {
  vi.clearAllMocks();
  adminMock.mockResolvedValue(true);
});

describe("admin game cancel — slot release (double-booking safety)", () => {
  it("releases slotId when an admin cancels, so the slot can be rebooked", async () => {
    prismaMock.game.findUnique.mockResolvedValue({ status: "open" });
    prismaMock.game.update.mockResolvedValue({});
    await POST(reqWith({ action: "cancel" }) as never, ctx("g1") as never);
    const data = prismaMock.game.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: "cancelled", slotId: null });
  });

  it("does NOT clear slotId when completing (the slot is historical/past)", async () => {
    prismaMock.game.findUnique.mockResolvedValue({ status: "open" });
    prismaMock.game.update.mockResolvedValue({});
    await POST(reqWith({ action: "complete" }) as never, ctx("g1") as never);
    const data = prismaMock.game.update.mock.calls[0][0].data;
    expect(data.slotId).toBeUndefined();
    expect(data.status).toBe("completed");
  });

  it("rejects cancelling an already-completed game", async () => {
    prismaMock.game.findUnique.mockResolvedValue({ status: "completed" });
    const res = await POST(reqWith({ action: "cancel" }) as never, ctx("g1") as never);
    expect(res.status).toBe(400);
    expect(prismaMock.game.update).not.toHaveBeenCalled();
  });
});
