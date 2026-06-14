import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { joinability } from "@/lib/gameTime";

type Ctx = { params: Promise<{ id: string }> };

const CANCEL_CUTOFF_MS = 90 * 60_000;

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        organizer: { select: { name: true, reliabilityScore: true, gamesOrganized: true, avatarUrl: true, phone: true } },
        players:   { include: { user: { select: { name: true, username: true, avatarUrl: true, reliabilityScore: true, tier: true, reputationScore: true } } } },
      },
    });
    if (!game) return fail("Game not found", 404);

    // The organiser's phone is private ("only shown to organisers and
    // participants"), so it is returned only to authenticated requests and
    // never leaked to logged-out visitors.
    const session = await getSessionFromRequest(req);
    const organizerPublic = game.organizer
      ? {
          name: game.organizer.name,
          reliabilityScore: game.organizer.reliabilityScore,
          gamesOrganized: game.organizer.gamesOrganized,
          avatarUrl: game.organizer.avatarUrl,
        }
      : null;

    return ok({
      ...game,
      organizer: organizerPublic,
      organizerName: game.organizer?.name,
      organizerRating: game.organizer?.reliabilityScore,
      organizerGames: game.organizer?.gamesOrganized,
      organizerAvatar: game.organizer?.avatarUrl,
      organizerPhone: session ? game.organizer?.phone ?? null : null,
      players: game.players.map(gp => ({
        id: gp.id, userId: gp.userId,
        name: gp.user?.name ?? "Unknown",
        username: gp.user?.username ?? "",
        avatarUrl: gp.user?.avatarUrl,
        rating: gp.user?.reliabilityScore ?? 4.5,
        tier: gp.user?.tier ?? "bronze",
        reputationScore: gp.user?.reputationScore ?? 0,
        joinedAt: gp.joinedAt,
      })),
    });
  } catch (e) { return handleErr(e); }
}

// JOIN
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session?.id) return fail("Authentication required", 401);

    const game = await prisma.game.findUnique({
      where: { id },
      select: { organizerId: true, status: true, scheduledAt: true, duration: true, slotsLeft: true },
    });
    if (!game) return fail("Game not found", 404);

    // Host / status / start-and-end-time checks (shared rules).
    const reason = joinability(game, new Date(), session.id);
    if (reason) return fail(reason, 400);

    // Already joined?
    const already = await prisma.gamePlayer.findUnique({
      where: { gameId_userId: { gameId: id, userId: session.id } },
      select: { id: true },
    });
    if (already) return fail("You have already joined this game.", 409);

    // Race-safe capacity claim: the conditional decrement is atomic in Postgres,
    // so two concurrent joins on the last slot can't both succeed. The loser falls
    // through to the waitlist. (Same pattern as the finalize handler's award claim.)
    // Joining only creates participation records — no permanent counters/reputation
    // are touched here; that happens exclusively at admin finalization.
    const claim = await prisma.game.updateMany({
      where: { id, status: "open", slotsLeft: { gt: 0 } },
      data: { slotsLeft: { decrement: 1 } },
    });

    if (claim.count === 0) {
      const onWaitlist = await prisma.waitlistEntry.findFirst({ where: { gameId: id, userId: session.id }, select: { id: true } });
      if (onWaitlist) return fail("Already on waitlist", 409);
      const position = (await prisma.waitlistEntry.count({ where: { gameId: id } })) + 1;
      await prisma.waitlistEntry.create({ data: { gameId: id, userId: session.id, position } });
      return ok({ waitlisted: true, position });
    }

    // Slot claimed — create participation. If create fails, release the slot so the
    // count stays correct, then let handleErr map the error to a friendly message.
    try {
      await prisma.gamePlayer.create({ data: { gameId: id, userId: session.id } });
    } catch (createErr) {
      await prisma.game.update({ where: { id }, data: { slotsLeft: { increment: 1 } } });
      throw createErr;
    }

    // Flip to "full" if we took the last slot.
    const after = await prisma.game.findUnique({ where: { id }, select: { slotsLeft: true, status: true } });
    if (after && after.slotsLeft === 0 && after.status === "open") {
      await prisma.game.update({ where: { id }, data: { status: "full" } });
    }

    return ok({ joined: true, slotsLeft: after?.slotsLeft ?? 0, status: after?.slotsLeft === 0 ? "full" : "open" });
  } catch (e) { return handleErr(e); }
}

// LEAVE
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const gp = await prisma.gamePlayer.findUnique({ where: { gameId_userId: { gameId: id, userId: session.id } }, select: { id: true } });
    if (!gp) return fail("Not in this game", 400);

    const game = await prisma.game.findUnique({ where: { id }, select: { scheduledAt: true, status: true } });
    if (!game) return fail("Game not found", 404);

    const now = Date.now();
    const startTime = new Date(game.scheduledAt).getTime();
    if (startTime - now < CANCEL_CUTOFF_MS) {
      return fail("Cancellation is not allowed within 90 minutes of the start time", 403);
    }

    await prisma.$transaction([
      prisma.gamePlayer.delete({ where: { id: gp.id } }),
      prisma.game.update({
        where: { id },
        data: { slotsLeft: { increment: 1 }, status: game.status === "full" ? "open" : undefined },
      }),
    ]);

    return ok({ left: true });
  } catch (e) { return handleErr(e); }
}
