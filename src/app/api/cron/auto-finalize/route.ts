import { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { finalizeGame, findAutoFinalizable, AUTO_FINALIZE_DELAY_MS } from "@/lib/gameFinalize";
import { findAutoCompletable, autoCompleteDays } from "@/lib/bookingAutoComplete";
import { completeBooking } from "@/lib/bookings";
import { sendPush } from "@/lib/push";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { cronUnauthorized } from "@/lib/cron";

export const maxDuration = 60;

/**
 * Close out work that finished but that nobody clicked a button for.
 *
 * Both halves existed only as an admin action, which meant reputation, tiers,
 * the leaderboard and every coach review were gated behind a human finalising
 * each item by hand — forever, at any volume. Automatic is now the normal path
 * and the admin click is the override.
 *
 * Both sweeps are idempotent: games claim their award with a conditional update,
 * and a booking already moved out of "approved" is rejected by the state machine.
 * A failed run can simply be re-run, and one bad row never aborts the batch.
 */
export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const now = new Date();

  // ── Games: grant rewards once the dispute window has passed ────────────────
  const gameIds = await findAutoFinalizable(now);
  let gamesFinalized = 0;
  const gamesSkipped: { id: string; reason: string }[] = [];

  for (const id of gameIds) {
    try {
      // No attendance was recorded, so everyone still unmarked is credited as
      // present — see assumeAttended in gameFinalize.ts for what that costs.
      const result = await finalizeGame(id, { assumeAttended: true });
      if (result.ok) gamesFinalized++;
      else gamesSkipped.push({ id, reason: result.error });
    } catch (e) {
      logger.error("auto-finalize game failed", { gameId: id, err: e });
      gamesSkipped.push({ id, reason: "error" });
    }
  }

  // ── Coach bookings: complete once the enrollment window has elapsed ────────
  // Completing releases the held seat back to the coach and unblocks the review,
  // which was a 403 until this moment.
  const bookings = await findAutoCompletable(now);
  let bookingsCompleted = 0;
  const bookingsSkipped: { id: string; reason: string }[] = [];

  for (const b of bookings) {
    try {
      await completeBooking(b.id);
      bookingsCompleted++;
      const coach = await prisma.coach.findUnique({ where: { id: b.coachId }, select: { name: true } });
      void sendPush(b.userId, {
        category: "review",
        title: "How did it go?",
        body: `Your sessions with ${coach?.name ?? "your coach"} have wrapped up. Leave a review.`,
        data: { url: `/coach/${b.coachId}` },
      });
    } catch (e) {
      // A booking someone cancelled or completed in the meantime throws from the
      // state machine — expected, not an incident.
      logger.info("auto-complete booking skipped", { bookingId: b.id, err: e });
      bookingsSkipped.push({ id: b.id, reason: e instanceof Error ? e.message : "error" });
    }
  }

  return ok({
    checkedAt: now.toISOString(),
    games: {
      windowHours: AUTO_FINALIZE_DELAY_MS / 3_600_000,
      candidates: gameIds.length,
      finalized: gamesFinalized,
      skipped: gamesSkipped,
      // Each sweep is capped; a backlog drains over successive runs rather than
      // timing out in one.
      capped: gameIds.length === 200,
    },
    bookings: {
      windowDays: autoCompleteDays(),
      candidates: bookings.length,
      completed: bookingsCompleted,
      skipped: bookingsSkipped,
      capped: bookings.length === 200,
    },
  });
}
