import type { Prisma } from "@prisma/client";

// The waitlist used to be write-only: entries were created and nothing anywhere
// promoted anyone. When a player left, the seat was returned to open inventory
// and went to whoever refreshed the page first, while the people who had queued
// for it kept waiting. Both the website and the app advertise the waitlist, so
// both were making a promise the system could not keep.
//
// One function, called from every path that frees a seat, so the seat can never
// go back to the open pool while someone is queued for it.

type Tx = Prisma.TransactionClient;

export type Promotion = { userId: string; gameId: string };

/**
 * Give a freed seat to the longest-waiting player, or return it to open
 * inventory if nobody is queued.
 *
 * Call INSIDE the same transaction that removed the departing player, so the
 * seat is never briefly both released and unassigned.
 *
 * Returns the promoted player, or null if the seat went back to the open pool.
 */
export async function promoteFromWaitlist(tx: Tx, gameId: string): Promise<Promotion | null> {
  const game = await tx.game.findUnique({ where: { id: gameId }, select: { status: true } });
  // A cancelled/completed game has no seat worth passing on.
  if (!game || ["cancelled", "completed", "archived"].includes(game.status)) return null;

  // Oldest claim first. Take a few so a stale entry — a user who has since joined
  // by other means, or whose account is gone — doesn't block the whole queue.
  const queued = await tx.waitlistEntry.findMany({
    where: { gameId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, userId: true },
    take: 10,
  });

  for (const entry of queued) {
    const alreadyIn = await tx.gamePlayer.findUnique({
      where: { gameId_userId: { gameId, userId: entry.userId } },
      select: { id: true },
    });
    if (alreadyIn) {
      // They got in another way — drop the dead entry and try the next person.
      await tx.waitlistEntry.delete({ where: { id: entry.id } });
      continue;
    }

    const user = await tx.user.findUnique({ where: { id: entry.userId }, select: { id: true, deletedAt: true } });
    if (!user || user.deletedAt) {
      await tx.waitlistEntry.delete({ where: { id: entry.id } });
      continue;
    }

    // The seat transfers directly: slotsLeft is deliberately NOT incremented,
    // because the seat never returns to the open pool. The game stays full.
    await tx.gamePlayer.create({ data: { gameId, userId: entry.userId } });
    await tx.waitlistEntry.delete({ where: { id: entry.id } });
    return { userId: entry.userId, gameId };
  }

  // Nobody left to promote — release the seat.
  await tx.game.updateMany({
    where: { id: gameId },
    data: { slotsLeft: { increment: 1 } },
  });
  await tx.game.updateMany({
    where: { id: gameId, status: "full" },
    data: { status: "open" },
  });
  return null;
}

/**
 * Next position for a new waitlist entry.
 *
 * Highest position + 1, not count + 1: promotions and departures leave gaps, and
 * counting produced a number an existing entry already held, so two people could
 * sit at "position 3" and the queue order stopped being meaningful.
 */
export async function nextWaitlistPosition(tx: Tx, gameId: string): Promise<number> {
  const last = await tx.waitlistEntry.findFirst({
    where: { gameId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? 0) + 1;
}
