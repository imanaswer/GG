import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Host-triggered completion. This ONLY marks the game completed and records the
// host's attendance flags. It does NOT award any rewards — rewards (gamesPlayed,
// gamesOrganized, reliability, reputation) are granted exactly once, and only
// when an admin finalizes the game (POST /api/admin/games/[id] { action: "finalize" }).
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { attendance } = await req.json().catch(() => ({})) as { attendance?: Record<string, boolean> };

    const game = await prisma.game.findUnique({ where: { id }, select: { organizerId: true, status: true } });
    if (!game) return fail("Game not found", 404);
    if (game.organizerId !== session.id) return fail("Only the organiser can complete a game", 403);
    if (game.status === "cancelled") return fail("Cannot complete a cancelled game", 400);
    if (game.status === "completed" || game.status === "archived") return fail("Game already completed", 400);

    const hasAttendance = attendance && typeof attendance === "object" && Object.keys(attendance).length > 0;

    await prisma.game.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
        attendanceRecorded: hasAttendance ? true : undefined,
      },
    });

    // Record attendance flags only. No user stats / reputation are touched here;
    // that happens at admin finalization, which reads these flags.
    if (hasAttendance) {
      for (const [userId, attended] of Object.entries(attendance)) {
        await prisma.gamePlayer.updateMany({ where: { gameId: id, userId }, data: { attended } });
      }
    }

    return ok({ completed: true, pointsAwarded: false, awaitingAdminReview: true });
  } catch (e) { return handleErr(e); }
}
