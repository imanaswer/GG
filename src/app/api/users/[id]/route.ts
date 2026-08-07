import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest, clearCookie } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { gameGroupStatus, registrationGroupStatus, selectUpcoming, type GroupStatus } from "@/lib/profileGrouping";
import { computeProfileCompletion } from "@/lib/profileCompletion";
import { currentSeason, seasonRep } from "@/lib/season";
import { progressToNextTier } from "@/lib/reputation";
import { requireSignedAgreement, AgreementGateError } from "@/lib/coachAgreement/gate";
import { sendPush } from "@/lib/push";
import { flagBookingRefundDue } from "@/lib/refunds";
import type { PaymentStatus } from "@/lib/paymentStatus";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Tell everyone booked into games that were cancelled by their host's account
 * deletion. Runs after the delete transaction commits — a push is a side effect
 * and must never hold a database transaction open.
 */
async function notifyCancelled(gameIds: string[]) {
  const [games, players, queued] = await Promise.all([
    prisma.game.findMany({ where: { id: { in: gameIds } }, select: { id: true, title: true } }),
    prisma.gamePlayer.findMany({ where: { gameId: { in: gameIds }, status: { not: "cancelled" } }, select: { gameId: true, userId: true } }),
    prisma.waitlistEntry.findMany({ where: { gameId: { in: gameIds } }, select: { gameId: true, userId: true } }),
  ]);

  for (const game of games) {
    const affected = [...new Set(
      [...players, ...queued].filter(r => r.gameId === game.id).map(r => r.userId),
    )];
    if (!affected.length) continue;
    void sendPush(affected, {
      category: "cancellation",
      title: "Game cancelled",
      body: `${game.title} has been cancelled — the organiser's account was deleted.`,
      data: { url: `/game/${game.id}` },
    });
  }
}

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
      isOwner ? prisma.booking.findMany({
        where: { userId: id },
        include: { coach: { select: { name: true, sport: true, location: true, imageUrl: true } } },
        orderBy: { createdAt: "desc" },
      }) : Promise.resolve([]),
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
      isOwner ? prisma.eventRegistration.findMany({ where: { userId: id }, include: { event: { select: { title: true, startDate: true, endDate: true, entryFeeAmount: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
      isOwner ? prisma.workshopRegistration.findMany({ where: { userId: id }, include: { workshop: { select: { title: true, startDate: true, endDate: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
      isOwner ? prisma.booking.count({ where: { userId: id, status: "completed" } }) : Promise.resolve(0),
    ]);

    const season = currentSeason(now);
    const since = season.startsAt;

    const [sGames, sOrganized, sCamps, sEvents, sWorkshops, sReviews, seasonGameGroups] = await Promise.all([
      prisma.gamePlayer.count({ where: { userId: id, joinedAt: { gte: since }, game: { status: { not: "cancelled" } } } }),
      prisma.game.count({ where: { organizerId: id, createdAt: { gte: since }, status: { not: "cancelled" } } }),
      prisma.campRegistration.count({ where: { userId: id, registeredAt: { gte: since }, status: { not: "cancelled" } } }),
      prisma.eventRegistration.count({ where: { userId: id, registeredAt: { gte: since }, status: "approved" } }),
      prisma.workshopRegistration.count({ where: { userId: id, registeredAt: { gte: since }, status: { not: "cancelled" } } }),
      prisma.review.count({ where: { userId: id, createdAt: { gte: since } } }),
      // season rank driver: per-user in-window game activity
      prisma.gamePlayer.groupBy({ by: ["userId"], where: { joinedAt: { gte: since }, game: { status: { not: "cancelled" } } }, _count: { _all: true } }),
    ]);

    const mySeasonRep = seasonRep({ games: sGames, organized: sOrganized, camps: sCamps, events: sEvents, workshops: sWorkshops, reviews: sReviews });

    const myGameRep = sGames * 10;
    const higherSeason = seasonGameGroups.filter(g => g.userId !== id && g._count._all * 10 > myGameRep).length;
    const seasonRank = higherSeason + 1;

    const sportMap: Record<string, number> = {};
    for (const gp of sportTallyRows) {
      if (gp.game) sportMap[gp.game.sport] = (sportMap[gp.game.sport] ?? 0) + 1;
    }
    const sportActivity = Object.entries(sportMap)
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
      events: eventRegs.map(r => ({ id: r.id, entityId: r.eventId, title: r.event?.title ?? "Event", startDate: r.event?.startDate, endDate: r.event?.endDate, status: r.status, paymentStatus: r.paymentStatus, entryFeeAmount: r.event?.entryFeeAmount, rejectionReason: r.rejectionReason, groupStatus: registrationGroupStatus(r.status, (r.event?.endDate ?? r.event?.startDate ?? new Date()).toISOString(), now) })),
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
      hasFavoriteSport: (user.sports?.length ?? 0) > 0,
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
      googleId: undefined, reputationOverride: undefined,
      email: isOwner ? user.email : undefined, phone: isOwner ? user.phone : undefined,
      gamesPlayed, gamesOrganized, sportActivity, playerRank, playerCount,
      games: gameList, upcoming, bookings: isOwner ? bookings : undefined, registrations, profileCompletion,
      // Rank progress is served rather than recomputed by clients — the mobile app
      // used to mirror TIER_THRESHOLDS locally and drifted. This is the one source.
      progress: progressToNextTier(user.reputationScore),
      season: { id: season.id, label: season.label, daysLeft: season.daysLeft, rep: mySeasonRep, rank: seasonRank },
    });
  } catch (e) { return handleErr(e); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session || session.id !== id) return fail("Unauthorized", 403);

    // A JWT minted before deletion stays valid until it expires (there is still no
    // revocation), and could write name/bio/phone/username onto the tombstone.
    // GET on this file already guards on deletedAt; this matches it.
    const target = await prisma.user.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!target || target.deletedAt) return fail("Account not found", 404);

    // Coaches must have a signed Partnership Agreement before editing/publishing their profile.
    if (session.role === "coach") await requireSignedAgreement(session.id);

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
  } catch (e) {
    if (e instanceof AgreementGateError) return fail(e.message, e.status);
    return handleErr(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session || session.id !== id) return fail("Unauthorized", 403);

    const stamp = Date.now();
    const now = new Date();

    // Interactive form, not the array form: the seat give-back needs to read the
    // games before it deletes the rows that identify them, and doing that read
    // inside the transaction closes the read/write race.
    const cancelledGameIds = await prisma.$transaction(async (tx) => {
      // Seats to hand back, and which of those games were full only because this
      // user held one. Deliberately limited to games that have not happened:
      // bumping slotsLeft on a completed game would make a finished game look
      // joinable again.
      const joined = await tx.gamePlayer.findMany({
        where: { userId: id, game: { status: { in: ["open", "full"] } } },
        select: { gameId: true, game: { select: { status: true } } },
      });
      const joinedIds = joined.map(j => j.gameId);
      const wasFullIds = joined.filter(j => j.game?.status === "full").map(j => j.gameId);

      // Captured BEFORE the cancel below, because updateMany returns no ids and
      // re-querying for cancelled games afterwards would also sweep up games this
      // user cancelled weeks ago — and then notify their players a second time.
      const hosted = await tx.game.findMany({
        where: { organizerId: id, status: { in: ["open", "full"] } },
        select: { id: true },
      });
      const hostedIds = hosted.map(g => g.id);

      await tx.review.updateMany({ where: { userId: id }, data: { reviewerName: "Deleted User" } });
      await tx.gamePlayer.deleteMany({ where: { userId: id } });
      // Waitlist rows have no cascade and were previously left behind, where they
      // kept their position and skewed the count+1 the next entrant is given.
      await tx.waitlistEntry.deleteMany({ where: { userId: id } });
      // Coach bookings: only the LIVE ones. A blanket updateMany rewrote completed
      // and rejected bookings too — terminal states the booking state machine
      // forbids leaving — destroying the record that the session happened, and it
      // released no seat, so every deleted student cost their coach a seat forever.
      // transitionBooking is the one correct mover but opens its own transaction,
      // so its three effects (seat give-back, cancelledAt, refund flag) are inlined.
      const liveBookings = await tx.booking.findMany({
        where: { userId: id, status: { in: ["pending", "approved"] } },
        select: { id: true, coachId: true, batchId: true, paymentStatus: true },
      });
      if (liveBookings.length) {
        // One statement per DISTINCT coach, incrementing by how many seats this
        // user held there. NOT an `updateMany` over an id list: Booking carries no
        // unique on (userId, coachId), so a user can hold two live bookings with
        // the same coach and updateMany would bump that coach exactly once —
        // re-creating a smaller version of the leak this is fixing.
        const seatsPerCoach = new Map<string, number>();
        const seatsPerBatch = new Map<string, number>();
        for (const b of liveBookings) {
          seatsPerCoach.set(b.coachId, (seatsPerCoach.get(b.coachId) ?? 0) + 1);
          if (b.batchId) seatsPerBatch.set(b.batchId, (seatsPerBatch.get(b.batchId) ?? 0) + 1);
        }
        for (const [coachId, n] of seatsPerCoach) {
          await tx.coach.update({ where: { id: coachId }, data: { seatsLeft: { increment: n } } });
        }
        for (const [batchId, n] of seatsPerBatch) {
          await tx.batch.update({ where: { id: batchId }, data: { seats: { increment: n } } });
        }
        await tx.booking.updateMany({
          where: { id: { in: liveBookings.map(b => b.id) } },
          data: { status: "cancelled", cancelledAt: now },
        });
        // Money already taken stays taken until an admin transfers it back, so
        // flag it rather than letting the charge silently stand — same rule the
        // self-cancel path follows (src/lib/refunds.ts).
        for (const b of liveBookings.filter(b => b.paymentStatus === "paid")) {
          if (await flagBookingRefundDue(tx, b.id)) {
            await tx.booking.update({ where: { id: b.id }, data: { paymentStatus: "refund_pending" satisfies PaymentStatus } });
          }
        }
      }

      // Release the seats. Two statements rather than one update per game: this
      // runs inside an interactive transaction over a max:1 pool, so a user with
      // a dozen games would otherwise be a dozen sequential round trips against
      // the only connection, under Prisma's 5s interactive timeout.
      if (joinedIds.length) {
        await tx.game.updateMany({ where: { id: { in: joinedIds } }, data: { slotsLeft: { increment: 1 } } });
        if (wasFullIds.length) {
          await tx.game.updateMany({ where: { id: { in: wasFullIds } }, data: { status: "open" } });
        }
      }

      // Hosted games do not survive their host. Left alone they stay on the public
      // list, joinable, with a dead tap-to-chat link — and hold their VenueSlot
      // forever, since slotId is @unique and only the cancel path releases it.
      // Past and completed games are untouched: they are historical record.
      //
      // This deliberately bypasses the rule in games/[id]/cancel that a host may
      // not cancel a game people have joined. Deletion has to resolve to
      // something, and the alternative — refusing to delete an account while it
      // hosts a game — leaves a user stranded with no way out.
      if (hostedIds.length) {
        await tx.game.updateMany({
          where: { id: { in: hostedIds } },
          data: { status: "cancelled", cancelledAt: now, slotId: null },
        });
      }

      await tx.user.update({
        where: { id },
        data: {
          deletedAt: now,
          email: `deleted-${id}-${stamp}@deleted.local`,
          username: `deleted_${id}_${stamp}`,
          // Reviews were already anonymised; game listings were not, so a deleted
          // account's real name kept appearing publicly as organizerName.
          name: "Deleted User",
          // Both @unique. Left set, the next social sign-in resolves straight back
          // to this tombstone — and the unique constraint means a fresh create
          // could never take their place either.
          googleId: null,
          appleId: null,
          phone: null,
          avatarUrl: null,
          bio: null,
          reputationOverride: null,
        },
      });

      return hostedIds;
    });

    // Deferred to after commit, matching how the cancel route notifies: players
    // whose game just disappeared deserve the same push they would have got had
    // the host cancelled it by hand. The deleted user's own GamePlayer rows are
    // already gone, so nobody is notified about their own deletion.
    if (cancelledGameIds.length) void notifyCancelled(cancelledGameIds);

    const res = NextResponse.json({ ok: true, data: { deleted: true } });
    const opts = clearCookie();
    res.cookies.set(opts.name, opts.value, { httpOnly: opts.httpOnly, path: opts.path, maxAge: opts.maxAge });
    return res;
  } catch (e) { return handleErr(e); }
}
