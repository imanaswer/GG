import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { attendance } = await req.json() as { attendance?: Record<string, boolean> };

    const game = await prisma.game.findUnique({ where: { id }, select: { organizerId: true, status: true } });
    if (!game) return fail("Game not found", 404);
    if (game.organizerId !== session.id) return fail("Only the organiser can complete a game", 403);
    if (game.status === "completed") return fail("Game already completed", 400);

    await prisma.game.update({ where: { id }, data: { status: "completed", attendanceRecorded: true } });

    if (attendance && typeof attendance === "object") {
      for (const [userId, attended] of Object.entries(attendance)) {
        await prisma.gamePlayer.updateMany({ where: { gameId: id, userId }, data: { attended } });

        if (attended) {
          await prisma.user.update({ where: { id: userId }, data: { gamesPlayed: { increment: 1 } } });
        }

        const allGPs = await prisma.gamePlayer.findMany({ where: { userId, NOT: { attended: null } }, select: { attended: true } });
        const attendedCount = allGPs.filter(gp => gp.attended).length;
        const attendanceRate = allGPs.length > 0 ? Math.round((attendedCount / allGPs.length) * 100) : 100;

        // Reviews-on-user are coach reviews; this mirrors the original (quirky) logic where `reviews.coachId === userId`.
        const reviewAgg = await prisma.review.aggregate({ where: { coachId: userId }, _avg: { rating: true }, _count: true });
        const reviewAvg = reviewAgg._count ? (reviewAgg._avg.rating ?? 4.5) : 4.5;
        const reliabilityScore = Math.round(((attendanceRate / 100) * 0.6 + (reviewAvg / 5) * 0.4) * 5 * 10) / 10;

        await prisma.user.update({ where: { id: userId }, data: { attendanceRate, reliabilityScore } });
      }
    }

    return ok({ completed: true });
  } catch (e) { return handleErr(e); }
}
