import { describe, it, expect, vi } from "vitest";
import { promoteFromWaitlist, nextWaitlistPosition } from "./waitlist";

// A hand-rolled transaction client. The behaviour under test is "who gets the
// freed seat", which is decided entirely by the sequence of calls made — so
// asserting on those calls is the real check, not a database round trip.
function tx(opts: {
  gameStatus?: string;
  queue?: { id: string; userId: string }[];
  existingPlayers?: string[];
  deletedUsers?: string[];
  maxPosition?: number | null;
}) {
  const {
    gameStatus = "full", queue = [], existingPlayers = [], deletedUsers = [], maxPosition = null,
  } = opts;
  const calls = {
    createdPlayers: [] as string[],
    deletedEntries: [] as string[],
    seatReleases: 0,
    reopened: 0,
  };
  const client = {
    game: {
      findUnique: vi.fn(async () => (gameStatus ? { status: gameStatus } : null)),
      updateMany: vi.fn(async (args: { data?: Record<string, unknown> }) => {
        if (args.data?.status === "open") calls.reopened++;
        else calls.seatReleases++;
        return { count: 1 };
      }),
    },
    waitlistEntry: {
      findMany: vi.fn(async () => queue),
      findFirst: vi.fn(async () => (maxPosition === null ? null : { position: maxPosition })),
      delete: vi.fn(async (args: { where: { id: string } }) => {
        calls.deletedEntries.push(args.where.id);
        return {};
      }),
    },
    gamePlayer: {
      findUnique: vi.fn(async (args: { where: { gameId_userId: { userId: string } } }) =>
        existingPlayers.includes(args.where.gameId_userId.userId) ? { id: "gp" } : null),
      create: vi.fn(async (args: { data: { userId: string } }) => {
        calls.createdPlayers.push(args.data.userId);
        return {};
      }),
    },
    user: {
      findUnique: vi.fn(async (args: { where: { id: string } }) =>
        ({ id: args.where.id, deletedAt: deletedUsers.includes(args.where.id) ? new Date() : null })),
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, calls };
}

describe("promoteFromWaitlist", () => {
  it("gives the seat to the longest-waiting player", async () => {
    const { client, calls } = tx({ queue: [{ id: "w1", userId: "first" }, { id: "w2", userId: "second" }] });
    const result = await promoteFromWaitlist(client, "g1");

    expect(result).toEqual({ userId: "first", gameId: "g1" });
    expect(calls.createdPlayers).toEqual(["first"]);
    expect(calls.deletedEntries).toEqual(["w1"]);
  });

  it("does NOT return the seat to open inventory when someone is queued", async () => {
    // The original bug: slotsLeft was incremented unconditionally, so the seat
    // went to whoever refreshed the page first and the queue was skipped.
    const { client, calls } = tx({ queue: [{ id: "w1", userId: "first" }] });
    await promoteFromWaitlist(client, "g1");

    expect(calls.seatReleases).toBe(0);
    expect(calls.reopened).toBe(0);
  });

  it("releases the seat and reopens the game when nobody is queued", async () => {
    const { client, calls } = tx({ queue: [] });
    const result = await promoteFromWaitlist(client, "g1");

    expect(result).toBeNull();
    expect(calls.seatReleases).toBe(1);
    expect(calls.reopened).toBe(1);
    expect(calls.createdPlayers).toEqual([]);
  });

  it("skips a queued user who is already in the game", async () => {
    const { client, calls } = tx({
      queue: [{ id: "w1", userId: "already" }, { id: "w2", userId: "next" }],
      existingPlayers: ["already"],
    });
    const result = await promoteFromWaitlist(client, "g1");

    expect(result?.userId).toBe("next");
    expect(calls.deletedEntries).toEqual(["w1", "w2"]); // stale entry cleaned up too
  });

  it("skips a deleted account rather than stalling the queue", async () => {
    const { client } = tx({
      queue: [{ id: "w1", userId: "gone" }, { id: "w2", userId: "live" }],
      deletedUsers: ["gone"],
    });
    expect((await promoteFromWaitlist(client, "g1"))?.userId).toBe("live");
  });

  it("promotes nobody into a cancelled game", async () => {
    const { client, calls } = tx({ gameStatus: "cancelled", queue: [{ id: "w1", userId: "first" }] });
    expect(await promoteFromWaitlist(client, "g1")).toBeNull();
    expect(calls.createdPlayers).toEqual([]);
    expect(calls.seatReleases).toBe(0);
  });
});

describe("nextWaitlistPosition", () => {
  it("starts at 1 on an empty queue", async () => {
    const { client } = tx({ maxPosition: null });
    expect(await nextWaitlistPosition(client, "g1")).toBe(1);
  });

  it("continues past the highest position, not the count", async () => {
    // count + 1 reused a number an existing entry already held once anyone had
    // been promoted or left, putting two people at the same position.
    const { client } = tx({ maxPosition: 7 });
    expect(await nextWaitlistPosition(client, "g1")).toBe(8);
  });
});
