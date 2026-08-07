import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { progressToNextTier } from "@/lib/reputation";
import { hostPayment } from "@/lib/hostPayment";

export const dynamic = "force-dynamic";

// The home screen composed server-side, in one request.
//
// Clients used to assemble it from /games + /coaches and stitch the result
// together, which made the single-request latency target impossible to measure
// let alone meet, and meant every client re-implemented the section rules.
//
// Every query below is a narrow select against an existing index and they all
// run concurrently, so the response costs roughly one round trip rather than the
// sum of its sections.

const GAME_FIELDS = {
  id: true, sport: true, title: true, location: true, scheduledAt: true, duration: true,
  slots: true, slotsLeft: true, skillLevel: true, cost: true, costAmount: true, currency: true,
  imageUrl: true, status: true, organizerId: true,
  paymentMethod: true, hostUpiId: true, hostQrUrl: true, paymentNote: true, venueNote: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 86_400_000);

    const [user, myGameRows, openGames, coaches, camps, events, waitlisted] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, name: true, username: true, avatarUrl: true, tier: true, reputationScore: true, sports: true, location: true },
      }),

      // What this user has committed to — the reason they opened the app.
      prisma.gamePlayer.findMany({
        where: {
          userId: session.id,
          status: { not: "cancelled" },
          game: { status: { in: ["open", "full"] }, scheduledAt: { gte: now } },
        },
        select: { paymentStatus: true, game: { select: GAME_FIELDS } },
        orderBy: { game: { scheduledAt: "asc" } },
        take: 5,
      }),

      // Games they could still join. The host's own games are excluded — they are
      // already in the "hosting" half of upcoming, and offering someone a seat at
      // their own game is noise.
      prisma.game.findMany({
        where: {
          status: "open",
          slotsLeft: { gt: 0 },
          scheduledAt: { gte: now, lte: soon },
          organizerId: { not: session.id },
          players: { none: { userId: session.id } },
        },
        select: GAME_FIELDS,
        orderBy: { scheduledAt: "asc" },
        take: 10,
      }),

      prisma.coach.findMany({
        where: { status: "active" },
        select: { id: true, name: true, sport: true, location: true, imageUrl: true, rating: true, reviewCount: true, price: true, seatsLeft: true },
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        take: 6,
      }),

      prisma.camp.findMany({
        where: { status: { in: ["open", "full"] }, startDate: { gte: now } },
        select: { id: true, title: true, sport: true, location: true, startDate: true, endDate: true, imageUrl: true, price: true, priceDisplay: true, participants: true, maxParticipants: true },
        orderBy: { startDate: "asc" },
        take: 4,
      }),

      prisma.sportEvent.findMany({
        where: { published: true, status: { notIn: ["Cancelled", "Completed", "Archived"] }, startDate: { gte: now } },
        select: { id: true, title: true, sport: true, location: true, startDate: true, imageUrl: true, entryFeeAmount: true, participants: true, maxParticipants: true },
        orderBy: { startDate: "asc" },
        take: 4,
      }),

      // Surfaced because a waitlisted player has no other signal that they are
      // still queued — the game shows as full everywhere else.
      prisma.waitlistEntry.findMany({
        where: { userId: session.id, game: { status: { in: ["open", "full"] }, scheduledAt: { gte: now } } },
        select: { position: true, game: { select: GAME_FIELDS } },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
    ]);

    if (!user) return fail("User not found", 404);

    const shape = (g: typeof openGames[number]) => ({ ...g, hostPayment: hostPayment(g) });

    return ok({
      user: {
        ...user,
        // Same served-not-recomputed rule as GET /api/users/:id.
        progress: progressToNextTier(user.reputationScore),
      },
      sections: {
        upcoming: myGameRows.map(r => ({ ...shape(r.game), myPaymentStatus: r.paymentStatus })),
        waitlisted: waitlisted.map(w => ({ ...shape(w.game), waitlistPosition: w.position })),
        openGames: openGames.map(shape),
        coaches,
        camps,
        events,
      },
      generatedAt: now.toISOString(),
    });
  } catch (e) { return handleErr(e); }
}
