import { prisma } from "@/lib/prisma";
import { safeRecompute } from "@/lib/reputationService";

// Finalizing is what turns a played game into reputation: gamesPlayed,
// gamesOrganized and attendanceRate all move here and nowhere else, and tiers,
// the leaderboard and the app's tier-up celebration are downstream of it.
//
// It used to live inline in the admin route, which meant a human had to click
// finalize on every pickup game in the city, forever, or progression quietly
// stopped. Extracted so the nightly cron can do it too — the admin click stays
// available as the override, not the only path.

/** A game can be auto-finalized once disputes have had time to arrive. */
export const AUTO_FINALIZE_DELAY_MS = 48 * 60 * 60_000;

export type FinalizeResult =
  | { ok: true; playersRewarded: number }
  | { ok: false; error: string; status: number };

export type FinalizeOptions = {
  /** Explicit per-user attendance from an admin. */
  attendance?: Record<string, boolean>;
  /**
   * Treat players nobody marked as having attended.
   *
   * Only the automatic path sets this. Nobody is present to take attendance for
   * an ordinary pickup game, so without it auto-finalize would award nothing and
   * leave every participant's record untouched — the manual click all over again.
   * The trade-off is real: attendanceRate feeds computeReputation, so once this
   * is the common path attendance trends to 100% and stops distinguishing
   * players. An admin finalizing by hand still overrides it per player.
   */
  assumeAttended?: boolean;
};

/**
 * Grant rewards exactly once for a completed game.
 *
 * Safe to call concurrently and repeatedly: the award is claimed with a
 * conditional update on `pointsAwarded`, so a second caller gets the 409 rather
 * than double-crediting anyone.
 */
export async function finalizeGame(gameId: string, opts: FinalizeOptions = {}): Promise<FinalizeResult> {
  const { attendance, assumeAttended = false } = opts;
  const hasAttendance = !!attendance && Object.keys(attendance).length > 0;

  const result = await prisma.$transaction(async (tx) => {
    const g = await tx.game.findUnique({ where: { id: gameId }, select: { status: true, organizerId: true, pointsAwarded: true } });
    if (!g) return { ok: false as const, error: "Game not found", status: 404 };
    if (g.status === "cancelled") return { ok: false as const, error: "Cannot finalize a cancelled game", status: 400 };
    if (g.status !== "completed" && g.status !== "archived") return { ok: false as const, error: "Game must be completed before it can be finalized", status: 400 };
    if (g.pointsAwarded) return { ok: false as const, error: "Rewards have already been granted for this game", status: 409 };

    if (hasAttendance) {
      for (const [userId, attended] of Object.entries(attendance!)) {
        await tx.gamePlayer.updateMany({ where: { gameId, userId }, data: { attended } });
      }
    }

    // Atomically claim the award — guards against duplicate/concurrent finalize.
    const claim = await tx.game.updateMany({ where: { id: gameId, pointsAwarded: false }, data: { pointsAwarded: true, adminVerified: !assumeAttended } });
    if (claim.count === 0) return { ok: false as const, error: "Rewards have already been granted for this game", status: 409 };

    if (assumeAttended) {
      // Cancelled participants are excluded — they were not there by definition.
      await tx.gamePlayer.updateMany({
        where: { gameId, attended: null, status: { not: "cancelled" } },
        data: { attended: true },
      });
    }

    const players = await tx.gamePlayer.findMany({ where: { gameId }, select: { userId: true, attended: true } });
    const touchedUserIds: string[] = [];

    for (const p of players) {
      if (p.attended === true) {
        await tx.user.update({ where: { id: p.userId }, data: { gamesPlayed: { increment: 1 } } });
      }
      // Recompute attendance rate + reliability across all judged games for this player.
      const judged = await tx.gamePlayer.findMany({ where: { userId: p.userId, NOT: { attended: null } }, select: { attended: true } });
      const attendedCount = judged.filter(j => j.attended).length;
      const attendanceRate = judged.length > 0 ? Math.round((attendedCount / judged.length) * 100) : 100;
      // Reliability is attendance, full stop. The other 40% of this used to be a
      // review average read as `Review.coachId = p.userId` — a Coach.id column
      // filtered by a User.id, so it never matched and every player silently got
      // the same 4.5 fallback, capping the whole score at 4.8. There is no review
      // data for a non-coach player in this schema, so the term is gone rather
      // than repointed at something it was never measuring.
      const reliabilityScore = Math.round((attendanceRate / 100) * 5 * 10) / 10;
      await tx.user.update({ where: { id: p.userId }, data: { attendanceRate, reliabilityScore } });
      touchedUserIds.push(p.userId);
    }

    // Organizing credit — granted once, here.
    await tx.user.update({ where: { id: g.organizerId }, data: { gamesOrganized: { increment: 1 } } });

    return { ok: true as const, touchedUserIds, organizerId: g.organizerId };
  }, { timeout: 20000 });

  if (!result.ok) return result;

  // Reputation recompute (own writes) outside the transaction.
  await Promise.allSettled([
    ...result.touchedUserIds.map(uid => safeRecompute(uid)),
    safeRecompute(result.organizerId),
  ]);

  return { ok: true, playersRewarded: result.touchedUserIds.length };
}

/** Games completed longer ago than the dispute window and still unfinalized. */
export async function findAutoFinalizable(now: Date, limit = 200): Promise<string[]> {
  const cutoff = new Date(now.getTime() - AUTO_FINALIZE_DELAY_MS);
  const rows = await prisma.game.findMany({
    where: {
      status: { in: ["completed", "archived"] },
      pointsAwarded: false,
      completedAt: { not: null, lt: cutoff },
    },
    select: { id: true },
    orderBy: { completedAt: "asc" },
    take: limit,
  });
  return rows.map(r => r.id);
}
