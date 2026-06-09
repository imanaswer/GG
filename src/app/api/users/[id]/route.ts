import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest, clearCookie } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) return fail("User not found", 404);

    const now = new Date();

    // Three targeted queries instead of one heavy include({ game: true }).
    // All three hit the GamePlayer(userId, joinedAt DESC) index added in
    // the perf migration. The streak compute moved to the activity endpoint
    // where the same 84-day slice already feeds the heatmap.
    const [
      gamesPlayed, gamesOrganized, bookingsRows, sportTallyRows, upcomingPlayerRows,
      higherRanked, playerCount,
    ] = await Promise.all([
      // Cancelled games never count toward a user's stats.
      prisma.gamePlayer.count({ where: { userId: id, game: { status: { not: "cancelled" } } } }),
      prisma.game.count({ where: { organizerId: id, status: { not: "cancelled" } } }),
      prisma.booking.findMany({
        where: { userId: id },
        include: { coach: { select: { name: true, sport: true, location: true, imageUrl: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.gamePlayer.findMany({
        where: { userId: id, game: { status: { not: "cancelled" } } },
        select: { game: { select: { sport: true } } },
      }),
      prisma.gamePlayer.findMany({
        where: {
          userId: id,
          game: { scheduledAt: { gt: now }, status: { not: "cancelled" } },
        },
        include: { game: true },
        orderBy: { joinedAt: "desc" },
      }),
      user.role === "admin"
        ? Promise.resolve(0)
        : prisma.user.count({
            where: {
              deletedAt: null,
              role: { not: "admin" },
              reputationScore: { gt: user.reputationScore },
            },
          }),
      prisma.user.count({ where: { deletedAt: null, role: { not: "admin" } } }),
    ]);

    const sportMap: Record<string, number> = {};
    for (const gp of sportTallyRows) {
      if (gp.game) sportMap[gp.game.sport] = (sportMap[gp.game.sport] ?? 0) + 1;
    }
    const sports = Object.entries(sportMap)
      .sort((a, b) => b[1] - a[1])
      .map(([sport, games]) => ({ sport, games, level: "Intermediate" }));

    const upcomingGames = upcomingPlayerRows.map(gp => gp.game).filter(Boolean);

    const achievements: { icon: string; title: string; description: string }[] = [];
    if (gamesPlayed >= 1)    achievements.push({ icon: "🏃", title: "First Game",  description: "Played your first pickup game" });
    if (gamesPlayed >= 10)   achievements.push({ icon: "⭐", title: "Regular",     description: "Joined 10+ games" });
    if (gamesOrganized >= 1) achievements.push({ icon: "🎯", title: "Organiser",   description: "Organised your first game" });
    if (user.attendanceRate >= 95) achievements.push({ icon: "💯", title: "Reliable", description: "95%+ attendance rate" });

    const bookings = bookingsRows.map(b => ({
      ...b,
      coachName: b.coach?.name,
      sport: b.coach?.sport,
      location: b.coach?.location,
      imageUrl: b.coach?.imageUrl,
    }));

    const playerRank = user.role === "admin" ? 0 : higherRanked + 1;

    return ok({
      ...user, passwordHash: undefined, passwordResetToken: undefined, passwordResetExpiry: undefined,
      gamesPlayed, gamesOrganized, sports, upcomingGames, bookings, achievements,
      playerRank, playerCount,
    });
  } catch (e) { return handleErr(e); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session || session.id !== id) return fail("Unauthorized", 403);

    const { name, bio, location, sports, phone, username, avatarUrl, lookingFor } = await req.json();

    let nextLookingFor: string | null | undefined;
    if (lookingFor === undefined) {
      nextLookingFor = undefined;
    } else if (typeof lookingFor === "string") {
      const trimmed = lookingFor.trim().replace(/[<>]/g, "").slice(0, 120);
      nextLookingFor = trimmed.length === 0 ? null : trimmed;
    } else if (lookingFor === null) {
      nextLookingFor = null;
    }

    if (username) {
      const taken = await prisma.user.findFirst({ where: { username, id: { not: id } }, select: { id: true } });
      if (taken) return fail("Username already taken", 409);
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name:     name     ?? undefined,
        bio:      bio      ?? undefined,
        location: location ?? undefined,
        sports:   sports   ?? undefined,
        phone:    phone    ?? undefined,
        username: username ?? undefined,
        avatarUrl: avatarUrl === undefined ? undefined : (avatarUrl === "" ? null : avatarUrl),
        lookingFor: nextLookingFor,
      },
    });

    return ok({ ...user, passwordHash: undefined });
  } catch (e) { return handleErr(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session || session.id !== id) return fail("Unauthorized", 403);

    const stamp = Date.now();
    await prisma.$transaction([
      prisma.review.updateMany({ where: { userId: id }, data: { reviewerName: "Deleted User" } }),
      prisma.gamePlayer.deleteMany({ where: { userId: id } }),
      prisma.booking.updateMany({ where: { userId: id }, data: { status: "cancelled" } }),
      prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          email: `deleted-${id}-${stamp}@deleted.local`,
          username: `deleted_${id}_${stamp}`,
          phone: null,
          avatarUrl: null,
          bio: null,
          reputationOverride: null,
        },
      }),
    ]);

    const res = NextResponse.json({ ok: true, data: { deleted: true } });
    const opts = clearCookie();
    res.cookies.set(opts.name, opts.value, { httpOnly: opts.httpOnly, path: opts.path, maxAge: opts.maxAge });
    return res;
  } catch (e) { return handleErr(e); }
}
