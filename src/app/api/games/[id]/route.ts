import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { promoteFromWaitlist, nextWaitlistPosition } from "@/lib/waitlist";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { joinability, withinCancelCutoff, CANCEL_CUTOFF_MESSAGE } from "@/lib/gameTime";
import { hostPayment } from "@/lib/hostPayment";
import { refundPolicy } from "@/lib/refundPolicy";
import { sendPush } from "@/lib/push";

type Ctx = { params: Promise<{ id: string }> };

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
      // How players pay the host, or null for a free game. Served rather than
      // assembled client-side so web and app show identical payment terms.
      hostPayment: hostPayment(game),
      // The terms in force, or null on a free game. Served so a wording change
      // reaches installed apps without a release.
      refundPolicy: refundPolicy("game", game.costAmount),
      organizer: organizerPublic,
      organizerName: game.organizer?.name,
      organizerRating: game.organizer?.reliabilityScore,
      organizerGames: game.organizer?.gamesOrganized,
      organizerAvatar: game.organizer?.avatarUrl,
      // "Only shown to organisers and participants" — any session used to do,
      // which let one account harvest every host's number.
      organizerPhone: session && (game.organizerId === session.id || game.players.some(p => p.userId === session.id))
        ? game.organizer?.phone ?? null
        : null,
      players: game.players.map(gp => ({
        id: gp.id, userId: gp.userId,
        name: gp.user?.name ?? "Unknown",
        username: gp.user?.username ?? "",
        avatarUrl: gp.user?.avatarUrl,
        rating: gp.user?.reliabilityScore ?? 4.5,
        tier: gp.user?.tier ?? "bronze",
        reputationScore: gp.user?.reputationScore ?? 0,
        joinedAt: gp.joinedAt,
        // Advisory: what the host has confirmed receiving. Only meaningful on a
        // paid game, and only the host acts on it.
        paymentStatus: gp.paymentStatus,
        paidAt: gp.paidAt,
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
      select: { organizerId: true, status: true, scheduledAt: true, duration: true, slotsLeft: true, costAmount: true },
    });
    if (!game) return fail("Game not found", 404);

    // No payment gate: a player-hosted game's entry fee is collected by the host
    // directly, outside Game Ground. Joining is what this endpoint grants; the
    // fee is settled between player and host afterwards and tracked advisorily
    // on GamePlayer.paymentStatus.

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
      try {
        const position = await prisma.$transaction(async (tx) => {
          const p = await nextWaitlistPosition(tx, id);
          await tx.waitlistEntry.create({ data: { gameId: id, userId: session.id, position: p } });
          return p;
        });
        return ok({ waitlisted: true, position });
      } catch (e) {
        // @@unique([gameId, userId]) — two concurrent requests both passed the
        // findFirst check above; exactly one row survives.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          return fail("Already on waitlist", 409);
        }
        throw e;
      }
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

    if (withinCancelCutoff(game.scheduledAt, new Date())) return fail(CANCEL_CUTOFF_MESSAGE, 403);

    // The freed seat goes to the longest-waiting player if anyone is queued, and
    // only falls back to open inventory when nobody is. Incrementing slotsLeft
    // unconditionally — what this did before — handed the seat to whoever
    // refreshed first and skipped the queue entirely.
    const promoted = await prisma.$transaction(async (tx) => {
      await tx.gamePlayer.delete({ where: { id: gp.id } });
      return promoteFromWaitlist(tx, id);
    });

    if (promoted) {
      const g = await prisma.game.findUnique({ where: { id }, select: { title: true, scheduledAt: true } });
      void sendPush(promoted.userId, {
        category: "waitlist",
        title: "A spot opened up",
        body: `You're in for ${g?.title ?? "the game"}.`,
        data: { url: `/game/${id}` },
      });
    }

    return ok({ left: true, promoted: promoted?.userId ?? null });
  } catch (e) { return handleErr(e); }
}
