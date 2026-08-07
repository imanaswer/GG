import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["pending", "paid"] as const;
type PaymentStatus = (typeof STATUSES)[number];

/**
 * Mark a participant's host-collected entry fee as paid or pending.
 *
 * This records a claim, not a transaction — Game Ground does not process
 * player-hosted game payments and has no way to verify one. The host's mark is
 * the meaningful one; a player may mark their own row as a courtesy so the host
 * knows to look for the transfer.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json().catch(() => ({}));
    const paymentStatus = body?.paymentStatus as PaymentStatus | undefined;
    const targetUserId = typeof body?.userId === "string" ? body.userId : session.id;
    if (!paymentStatus || !(STATUSES as readonly string[]).includes(paymentStatus)) {
      return fail("paymentStatus must be \"paid\" or \"pending\"", 400);
    }

    const game = await prisma.game.findUnique({ where: { id }, select: { organizerId: true, costAmount: true } });
    if (!game) return fail("Game not found", 404);
    if (game.costAmount <= 0) return fail("This game is free — there is nothing to pay", 400);

    // The host tracks everyone; a player may only speak for themselves.
    const isHost = game.organizerId === session.id;
    if (!isHost && targetUserId !== session.id) {
      return fail("Only the host can update another player's payment status", 403);
    }

    const updated = await prisma.gamePlayer.updateMany({
      where: { gameId: id, userId: targetUserId },
      data: {
        paymentStatus,
        paidAt: paymentStatus === "paid" ? new Date() : null,
      },
    });
    if (updated.count === 0) return fail("That player has not joined this game", 404);

    return ok({ userId: targetUserId, paymentStatus, confirmedByHost: isHost });
  } catch (e) { return handleErr(e); }
}
