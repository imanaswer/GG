import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        organizer: { select: { name: true, reliabilityScore: true, gamesOrganized: true, avatarUrl: true } },
        players:   { include: { user: { select: { name: true, username: true, avatarUrl: true, reliabilityScore: true } } } },
      },
    });
    if (!game) return fail("Game not found", 404);

    return ok({
      ...game,
      organizerName: game.organizer?.name,
      organizerRating: game.organizer?.reliabilityScore,
      organizerGames: game.organizer?.gamesOrganized,
      organizerAvatar: game.organizer?.avatarUrl,
      players: game.players.map(gp => ({
        id: gp.id, userId: gp.userId,
        name: gp.user?.name ?? "Unknown",
        username: gp.user?.username ?? "",
        avatarUrl: gp.user?.avatarUrl,
        rating: gp.user?.reliabilityScore ?? 4.5,
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
    if (!session) return fail("Authentication required", 401);

    const game = await prisma.game.findUnique({ where: { id }, select: { organizerId: true, slotsLeft: true, status: true } });
    if (!game) return fail("Game not found", 404);
    if (game.organizerId === session.id) return fail("You cannot join your own game", 400);

    const already = await prisma.gamePlayer.findUnique({ where: { gameId_userId: { gameId: id, userId: session.id } }, select: { id: true } });
    if (already) return fail("Already joined this game", 409);

    if (game.slotsLeft <= 0 || game.status === "full") {
      const onWaitlist = await prisma.waitlistEntry.findFirst({ where: { gameId: id, userId: session.id }, select: { id: true } });
      if (onWaitlist) return fail("Already on waitlist", 409);
      const position = await prisma.waitlistEntry.count({ where: { gameId: id } }) + 1;
      await prisma.waitlistEntry.create({ data: { gameId: id, userId: session.id, position } });
      return ok({ waitlisted: true, position });
    }

    const newSlotsLeft = game.slotsLeft - 1;
    await prisma.$transaction([
      prisma.gamePlayer.create({ data: { gameId: id, userId: session.id } }),
      prisma.game.update({
        where: { id },
        data: { slotsLeft: { decrement: 1 }, status: newSlotsLeft === 0 ? "full" : undefined },
      }),
      prisma.user.update({ where: { id: session.id }, data: { gamesPlayed: { increment: 1 } } }),
    ]);

    return ok({ joined: true, slotsLeft: newSlotsLeft, status: newSlotsLeft === 0 ? "full" : game.status });
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

    const game = await prisma.game.findUnique({ where: { id }, select: { status: true } });
    await prisma.$transaction([
      prisma.gamePlayer.delete({ where: { id: gp.id } }),
      prisma.game.update({
        where: { id },
        data: { slotsLeft: { increment: 1 }, status: game?.status === "full" ? "open" : undefined },
      }),
    ]);

    return ok({ left: true });
  } catch (e) { return handleErr(e); }
}
