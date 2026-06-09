import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { safeRecompute } from "@/lib/reputationService";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () => NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const good = (data: unknown) => NextResponse.json({ ok: true, data });

// Admin-only game actions. Admins bypass all host restrictions.
//   action: "cancel"   — terminal cancel (no rewards, ever).
//   action: "complete" — mark completed + optional attendance flags (no rewards).
//   action: "finalize" — grant rewards exactly once for a completed game.
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return unauthorized();
  const { id } = await params;

  let body: { action?: string; attendance?: Record<string, boolean> } = {};
  try { body = await req.json(); } catch { /* empty body allowed */ }
  const action = body.action;
  const attendance = body.attendance;
  const hasAttendance = !!attendance && typeof attendance === "object" && Object.keys(attendance).length > 0;

  const game = await prisma.game.findUnique({ where: { id }, select: { status: true } });
  if (!game) return bad("Game not found", 404);

  if (action === "cancel") {
    if (game.status === "completed" || game.status === "archived") return bad("Cannot cancel a completed game");
    if (game.status === "cancelled") return bad("Game is already cancelled");
    await prisma.game.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
    return good({ cancelled: true });
  }

  if (action === "complete") {
    if (game.status === "cancelled") return bad("Cannot complete a cancelled game");
    if (game.status === "completed" || game.status === "archived") return bad("Game already completed");
    await prisma.game.update({
      where: { id },
      data: { status: "completed", completedAt: new Date(), attendanceRecorded: hasAttendance ? true : undefined },
    });
    if (hasAttendance) {
      for (const [userId, attended] of Object.entries(attendance!)) {
        await prisma.gamePlayer.updateMany({ where: { gameId: id, userId }, data: { attended } });
      }
    }
    return good({ completed: true, pointsAwarded: false });
  }

  if (action === "finalize") {
    // Grant rewards exactly once, only for a completed (not cancelled) game.
    const result = await prisma.$transaction(async (tx) => {
      const g = await tx.game.findUnique({ where: { id }, select: { status: true, organizerId: true, pointsAwarded: true } });
      if (!g) return { ok: false as const, error: "Game not found", status: 404 };
      if (g.status === "cancelled") return { ok: false as const, error: "Cannot finalize a cancelled game", status: 400 };
      if (g.status !== "completed" && g.status !== "archived") return { ok: false as const, error: "Game must be completed before it can be finalized", status: 400 };
      if (g.pointsAwarded) return { ok: false as const, error: "Rewards have already been granted for this game", status: 409 };

      if (hasAttendance) {
        for (const [userId, attended] of Object.entries(attendance!)) {
          await tx.gamePlayer.updateMany({ where: { gameId: id, userId }, data: { attended } });
        }
      }

      // Atomically claim the award — guards against duplicate/concurrent finalize.
      const claim = await tx.game.updateMany({ where: { id, pointsAwarded: false }, data: { pointsAwarded: true, adminVerified: true } });
      if (claim.count === 0) return { ok: false as const, error: "Rewards have already been granted for this game", status: 409 };

      const players = await tx.gamePlayer.findMany({ where: { gameId: id }, select: { userId: true, attended: true } });
      const touchedUserIds: string[] = [];

      for (const p of players) {
        if (p.attended === true) {
          await tx.user.update({ where: { id: p.userId }, data: { gamesPlayed: { increment: 1 } } });
        }
        // Recompute attendance rate + reliability across all judged games for this player.
        const judged = await tx.gamePlayer.findMany({ where: { userId: p.userId, NOT: { attended: null } }, select: { attended: true } });
        const attendedCount = judged.filter(j => j.attended).length;
        const attendanceRate = judged.length > 0 ? Math.round((attendedCount / judged.length) * 100) : 100;
        const reviewAgg = await tx.review.aggregate({ where: { coachId: p.userId }, _avg: { rating: true }, _count: true });
        const reviewAvg = reviewAgg._count ? (reviewAgg._avg.rating ?? 4.5) : 4.5;
        const reliabilityScore = Math.round(((attendanceRate / 100) * 0.6 + (reviewAvg / 5) * 0.4) * 5 * 10) / 10;
        await tx.user.update({ where: { id: p.userId }, data: { attendanceRate, reliabilityScore } });
        touchedUserIds.push(p.userId);
      }

      // Organizing credit — granted once, here.
      await tx.user.update({ where: { id: g.organizerId }, data: { gamesOrganized: { increment: 1 } } });

      return { ok: true as const, touchedUserIds, organizerId: g.organizerId };
    }, { timeout: 20000 });

    if (!result.ok) return bad(result.error, result.status);

    // Reputation recompute (own writes) outside the transaction.
    await Promise.allSettled([
      ...result.touchedUserIds.map(uid => safeRecompute(uid)),
      safeRecompute(result.organizerId),
    ]);

    return good({ finalized: true, pointsAwarded: true, adminVerified: true, playersRewarded: result.touchedUserIds.length });
  }

  return bad("Unknown action");
}

// Admin delete — removes the game and all dependent records in one transaction
// so no orphaned rows are left behind.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSessionFromRequest(req)) return unauthorized();
  const { id } = await params;

  const game = await prisma.game.findUnique({ where: { id }, select: { id: true } });
  if (!game) return bad("Game not found", 404);

  await prisma.$transaction([
    prisma.waitlistEntry.deleteMany({ where: { gameId: id } }),
    prisma.gamePlayer.deleteMany({ where: { gameId: id } }),
    prisma.game.delete({ where: { id } }),
  ]);

  return good({ deleted: true });
}
