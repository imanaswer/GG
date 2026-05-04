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

    const [gamesPlayed, gamesOrganized, bookingsRows, playerRows] = await Promise.all([
      prisma.gamePlayer.count({ where: { userId: id } }),
      prisma.game.count({ where: { organizerId: id } }),
      prisma.booking.findMany({
        where: { userId: id },
        include: { coach: { select: { name: true, sport: true, location: true, imageUrl: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.gamePlayer.findMany({
        where: { userId: id },
        include: { game: true },
      }),
    ]);

    const sportMap: Record<string, number> = {};
    for (const gp of playerRows) {
      if (gp.game) sportMap[gp.game.sport] = (sportMap[gp.game.sport] ?? 0) + 1;
    }
    const sports = Object.entries(sportMap)
      .sort((a, b) => b[1] - a[1])
      .map(([sport, games]) => ({ sport, games, level: "Intermediate" }));

    const now = new Date();
    const upcomingGames = playerRows
      .map(gp => gp.game)
      .filter(g => !!g && g.scheduledAt > now && g.status !== "cancelled");

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

    // Streak: consecutive ISO weeks ending with the current week, in which the user
    // joined ≥1 game. 0 if no game this week. Caps at 52 to avoid runaway loops.
    const streakWeeks = computeStreakWeeks(playerRows.map(p => p.joinedAt));

    // Leaderboard rank by reputationScore (1-indexed). Excludes admins + soft-deleted.
    const [playerRank, playerCount] = await Promise.all([
      user.role === "admin"
        ? Promise.resolve(0)
        : prisma.user.count({
            where: {
              deletedAt: null,
              role: { not: "admin" },
              reputationScore: { gt: user.reputationScore },
            },
          }).then(higher => higher + 1),
      prisma.user.count({ where: { deletedAt: null, role: { not: "admin" } } }),
    ]);

    return ok({
      ...user, passwordHash: undefined, passwordResetToken: undefined, passwordResetExpiry: undefined,
      gamesPlayed, gamesOrganized, sports, upcomingGames, bookings, achievements,
      streakWeeks, playerRank, playerCount,
    });
  } catch (e) { return handleErr(e); }
}

function startOfIsoWeek(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay() || 7;       // Mon=1..Sun=7
  x.setDate(x.getDate() - (day - 1));
  return x.getTime();
}

function computeStreakWeeks(joinDates: Date[]): number {
  if (!joinDates.length) return 0;
  const weeksWithGame = new Set<number>();
  for (const d of joinDates) weeksWithGame.add(startOfIsoWeek(d));

  const now = new Date();
  let cursor = startOfIsoWeek(now);
  let streak = 0;
  for (let i = 0; i < 52; i++) {
    if (!weeksWithGame.has(cursor)) break;
    streak += 1;
    cursor -= 7 * 24 * 60 * 60 * 1000;
  }
  return streak;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session || session.id !== id) return fail("Unauthorized", 403);

    const { name, bio, location, sports, phone, username, avatarUrl } = await req.json();

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
