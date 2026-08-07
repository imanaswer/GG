import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, txMock, sessionMock, sendPushMock } = vi.hoisted(() => {
  const model = () => ({ findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txMock: any = {
    review: model(), gamePlayer: model(), waitlistEntry: model(),
    booking: model(), game: model(), user: model(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    ...txMock,
    // Interactive form: hand the callback the same mock the assertions read.
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(txMock)),
  };
  return { prismaMock, txMock, sessionMock: vi.fn(), sendPushMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: sessionMock,
  clearCookie: () => ({ name: "gg_session", value: "", httpOnly: true, path: "/", maxAge: 0 }),
}));
vi.mock("@/lib/push", () => ({ sendPush: sendPushMock }));

import { DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const del = (id = "u1") => DELETE({} as never, ctx(id) as never);

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
  txMock.gamePlayer.findMany.mockResolvedValue([]);
  txMock.game.findMany.mockResolvedValue([]);
  prismaMock.game.findMany.mockResolvedValue([]);
  prismaMock.gamePlayer.findMany.mockResolvedValue([]);
  prismaMock.waitlistEntry.findMany.mockResolvedValue([]);
});

const tombstone = () => txMock.user.update.mock.calls[0][0].data;

describe("DELETE /api/users/[id] — authorization", () => {
  it("refuses to delete someone else's account", async () => {
    sessionMock.mockResolvedValue({ id: "someone-else" });
    expect((await del()).status).toBe(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("refuses an anonymous request", async () => {
    sessionMock.mockResolvedValue(null);
    expect((await del()).status).toBe(403);
  });
});

describe("DELETE /api/users/[id] — the tombstone", () => {
  it("releases the social identifiers, so the next sign-in cannot resolve back to it", async () => {
    await del();
    expect(tombstone()).toMatchObject({ googleId: null, appleId: null });
  });

  it("anonymises the display name, which used to keep showing as organizerName", async () => {
    await del();
    expect(tombstone().name).toBe("Deleted User");
  });

  it("scrambles the unique columns and clears personal fields", async () => {
    await del();
    const data = tombstone();
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.email).toMatch(/^deleted-u1-\d+@deleted\.local$/);
    expect(data.username).toMatch(/^deleted_u1_\d+$/);
    expect(data).toMatchObject({ phone: null, avatarUrl: null, bio: null, reputationOverride: null });
  });
});

describe("DELETE /api/users/[id] — games", () => {
  it("hands back a seat in every upcoming game the user had joined", async () => {
    txMock.gamePlayer.findMany.mockResolvedValue([
      { gameId: "g1", game: { status: "open" } },
      { gameId: "g2", game: { status: "full" } },
    ]);

    await del();

    // Seats: both games. Reopen: only the one that was full.
    expect(txMock.game.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["g1", "g2"] } },
      data: { slotsLeft: { increment: 1 } },
    });
    expect(txMock.game.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["g2"] } },
      data: { status: "open" },
    });
  });

  it("only looks at games that have not happened — a completed game must not gain a seat", async () => {
    await del();
    expect(txMock.gamePlayer.findMany.mock.calls[0][0].where).toEqual({
      userId: "u1",
      game: { status: { in: ["open", "full"] } },
    });
  });

  it("cancels hosted games and releases their venue slots", async () => {
    txMock.game.findMany.mockResolvedValue([{ id: "h1" }, { id: "h2" }]);

    await del();

    const cancel = txMock.game.updateMany.mock.calls.find(
      (c: [{ data: { status?: string } }]) => c[0].data.status === "cancelled",
    );
    expect(cancel[0]).toMatchObject({
      where: { id: { in: ["h1", "h2"] } },
      data: { status: "cancelled", slotId: null },
    });
    expect(cancel[0].data.cancelledAt).toBeInstanceOf(Date);
  });

  it("leaves completed hosted games alone — they are historical record", async () => {
    await del();
    expect(txMock.game.findMany.mock.calls[0][0].where).toEqual({
      organizerId: "u1",
      status: { in: ["open", "full"] },
    });
  });

  it("touches no games at all when the user had none", async () => {
    await del();
    expect(txMock.game.updateMany).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/users/[id] — the rest of the sweep", () => {
  it("removes waitlist entries, which used to survive and skew the next entrant's position", async () => {
    await del();
    expect(txMock.waitlistEntry.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("anonymises reviews, drops game memberships and cancels bookings", async () => {
    await del();
    expect(txMock.review.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1" }, data: { reviewerName: "Deleted User" },
    });
    expect(txMock.gamePlayer.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(txMock.booking.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1" }, data: { status: "cancelled" },
    });
  });

  it("clears the session cookie and reports success", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { deleted: true } });
    expect(res.cookies.get("gg_session")?.value).toBe("");
  });
});

describe("DELETE /api/users/[id] — notifying abandoned players", () => {
  it("pushes to the players and waitlist of each cancelled game", async () => {
    txMock.game.findMany.mockResolvedValue([{ id: "h1" }]);
    prismaMock.game.findMany.mockResolvedValue([{ id: "h1", title: "Sunday 5v5" }]);
    prismaMock.gamePlayer.findMany.mockResolvedValue([{ gameId: "h1", userId: "p1" }]);
    prismaMock.waitlistEntry.findMany.mockResolvedValue([{ gameId: "h1", userId: "p2" }]);

    await del();
    await new Promise(r => setImmediate(r)); // the push is deliberately not awaited

    expect(sendPushMock).toHaveBeenCalledTimes(1);
    const [recipients, msg] = sendPushMock.mock.calls[0];
    expect(recipients.sort()).toEqual(["p1", "p2"]);
    expect(msg).toMatchObject({ category: "cancellation", data: { url: "/game/h1" } });
    expect(msg.body).toContain("Sunday 5v5");
  });

  it("sends nothing when the user hosted nothing", async () => {
    await del();
    await new Promise(r => setImmediate(r));
    expect(sendPushMock).not.toHaveBeenCalled();
  });
});
