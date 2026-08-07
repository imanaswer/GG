import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { ok, fail, handleErr } from "@/lib/api";
import { sendPush } from "@/lib/push";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const isAdmin = await getAdminSessionFromRequest(req);
    const session = await getSessionFromRequest(req);
    if (!session && !isAdmin) return fail("Authentication required", 401);

    const game = await prisma.game.findUnique({ where: { id }, select: { organizerId: true, status: true } });
    if (!game) return fail("Game not found", 404);

    // Authorization: admins may always cancel; otherwise only the organiser.
    if (!isAdmin && game.organizerId !== session!.id) return fail("Only the organiser can cancel", 403);

    if (game.status === "completed" || game.status === "archived") return fail("Cannot cancel a completed game", 400);
    if (game.status === "cancelled") return fail("Game is already cancelled", 400);

    // Host restriction (enforced server-side, not just in the UI): a host may
    // cancel their own game ONLY when nobody has joined. Admins bypass this.
    if (!isAdmin) {
      const participantCount = await prisma.gamePlayer.count({ where: { gameId: id } });
      if (participantCount > 0) {
        return fail("This game cannot be cancelled because players have already joined. Please contact an administrator.", 403);
      }
    }

    // Cancellation grants no rewards and triggers no leaderboard/reputation
    // updates. Because rewards are only ever granted at admin finalization, a
    // cancelled game can never have earned credit, so there is nothing to reverse.
    // Releasing slotId frees the venue slot so it can be booked again — the
    // @unique constraint would otherwise keep it permanently consumed.
    const cancelled = await prisma.game.update({
      where: { id },
      data: { status: "cancelled", cancelledAt: new Date(), slotId: null },
      select: { title: true, scheduledAt: true },
    });

    // Everyone who joined, plus anyone still queued — a waitlisted player is
    // waiting on a game that is no longer happening.
    const [players, queued] = await Promise.all([
      prisma.gamePlayer.findMany({ where: { gameId: id, status: { not: "cancelled" } }, select: { userId: true } }),
      prisma.waitlistEntry.findMany({ where: { gameId: id }, select: { userId: true } }),
    ]);
    const affected = [...new Set([...players, ...queued].map(r => r.userId))];
    void sendPush(affected, {
      category: "cancellation",
      title: "Game cancelled",
      body: `${cancelled.title} has been cancelled by the organiser.`,
      data: { url: `/game/${id}` },
    });

    return ok({ cancelled: true, notified: affected.length });
  } catch (e) { return handleErr(e); }
}
