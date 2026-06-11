import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest, clearCookie } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { gameGroupStatus, registrationGroupStatus, selectUpcoming, type GroupStatus } from "@/lib/profileGrouping";
import { computeProfileCompletion } from "@/lib/profileCompletion";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) return fail("User not found", 404);

    const session = await getSessionFromRequest(req).catch(() => null);
    const isOwner = !!session && session.id === id;

    const now = new Date();

    // Three targeted queries instead of one heavy include({ game: true }).
    // All three hit the GamePlayer(userId, joinedAt DESC) index added in
    // the perf migration. The streak compute moved to the activity endpoint
    // where the same 84-day slice already feeds the heatmap.
    const [
      gamesPlayed, gamesOrganized, bookingsRows, sportTallyRows,
      higherRanked, playerCount,
      joinedRows, organizedRows, campRegs, eventRegs, workshopRegs, completedBookingCount,
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
      prisma.gamePlayer.findMany({ where: { userId: id }, include: { game: true }, orderBy: { joinedAt: "desc" } }),
      prisma.game.findMany({ where: { organizerId: id }, orderBy: { scheduledAt: "desc" } }),
      isOwner ? prisma.campRegistration.findMany({ where: { userId: id }, include: { camp: { select: { title: true, startDate: true, endDate: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
      isOwner ? prisma.eventRegistration.findMany({ where: { userId: id }, include: { event: { select: { title: true, startDate: true, endDate: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
      isOwner ? prisma.workshopRegistration.findMany({ where: { userId: id }, include: { workshop: { select: { title: true, startDate: true, endDate: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
      isOwner ? prisma.booking.count({ where: { userId: id, status: "completed" } }) : Promise.resolve(0),
    ]);

    const sportMap: Record<string, number> = {};
    for (const gp of sportTallyRows) {
      if (gp.game) sportMap[gp.game.sport] = (sportMap[gp.game.sport] ?? 0) + 1;
    }
    const sports = Object.entries(sportMap)
      .sort((a, b) => b[1] - a[1])
      .map(([sport, games]) => ({ sport, games, level: "Intermediate" }));

    const joined = joinedRows.map(gp => gp.game).filter(Boolean);
    const gameList = [
      ...joined.map(g => ({ ...g, role: "player" as const })),
      ...organizedRows.map(g => ({ ...g, role: "organizer" as const })),
    ].map(g => ({
      id: g.id, sport: g.sport, title: g.title, location: g.location, scheduledAt: g.scheduledAt,
      status: g.status, role: g.role,
      groupStatus: gameGroupStatus({ scheduledAt: g.scheduledAt.toISOString(), status: g.status }, now) as GroupStatus,
    }));

    const registrations = isOwner ? {
      camps: campRegs.map(r => ({ id: r.id, title: r.camp?.title ?? "Camp", startDate: r.camp?.startDate, endDate: r.camp?.endDate, status: r.status, paymentStatus: r.paymentStatus, groupStatus: registrationGroupStatus(r.status, (r.camp?.endDate ?? r.camp?.startDate ?? new Date()).toISOString(), now) })),
      events: eventRegs.map(r => ({ id: r.id, title: r.event?.title ?? "Event", startDate: r.event?.startDate, endDate: r.event?.endDate, status: r.status, paymentStatus: r.paymentStatus, groupStatus: registrationGroupStatus(r.status, (r.event?.endDate ?? r.event?.startDate ?? new Date()).toISOString(), now) })),
      workshops: workshopRegs.map(r => ({ id: r.id, title: r.workshop?.title ?? "Workshop", startDate: r.workshop?.startDate, endDate: r.workshop?.endDate, status: r.status, paymentStatus: r.paymentStatus, groupStatus: registrationGroupStatus(r.status, (r.workshop?.endDate ?? r.workshop?.startDate ?? new Date()).toISOString(), now) })),
    } : undefined;

    let upcoming: { type: string; id: string; title: string; date: string | null; location?: string; status?: string; href: string } | undefined = undefined;
    if (isOwner) {
      const candidates = [
        ...joined.filter(g => g.scheduledAt > now && g.status !== "cancelled").map(g => ({ type: "game" as const, id: g.id, date: g.scheduledAt.toISOString(), title: g.title, location: g.location, status: g.status, href: `/game/${g.id}` })),
        ...campRegs.filter(r => r.camp && r.status !== "cancelled" && r.camp.startDate > now).map(r => ({ type: "camp" as const, id: r.id, date: r.camp!.startDate.toISOString(), title: r.camp!.title, href: `/camps/${r.campId}` })),
        ...eventRegs.filter(r => r.event && r.status !== "cancelled" && r.event.startDate > now).map(r => ({ type: "event" as const, id: r.id, date: r.event!.startDate.toISOString(), title: r.event!.title, href: `/events/${r.eventId}` })),
        ...workshopRegs.filter(r => r.workshop && r.status !== "cancelled" && r.workshop.startDate > now).map(r => ({ type: "workshop" as const, id: r.id, date: r.workshop!.startDate.toISOString(), title: r.workshop!.title, href: `/workshops/${r.workshopId}` })),
        ...bookingsRows.filter(b => b.status === "approved").map(b => ({ type: "coach" as const, id: b.id, date: null, title: b.coach?.name ? `Coaching with ${b.coach.name}` : "Coaching session", href: `/bookings` })),
      ];
      upcoming = selectUpcoming(candidates) ?? undefined;
    }

    const profileCompletion = isOwner ? computeProfileCompletion({
      hasAvatar: !!user.avatarUrl,
      hasFavoriteSport: sports.length > 0,
      gamesPlayed,
      hasCompletedBooking: completedBookingCount > 0,
    }) : undefined;

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
      gamesPlayed, gamesOrganized, sports, playerRank, playerCount,
      games: gameList, upcoming, bookings: isOwner ? bookings : undefined, registrations, profileCompletion,
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
