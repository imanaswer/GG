import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr, CreateGameSchema } from "@/lib/api";
import { validateGameSchedule } from "@/lib/gameTime";
import { isBookableVenue, venueSupportsSport, slotAvailability, slotDurationMinutes } from "@/lib/venues";
import { toWhatsAppNumber } from "@/lib/whatsapp";
import { gameImage } from "@/lib/premium-images";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q = p.get("q")?.toLowerCase();
    const sport = p.get("sport");
    const level = p.get("skillLevel");
    const cost = p.get("cost");
    const status = p.get("status") || "open";

    // The public list must NEVER expose cancelled or archived games.
    const HIDDEN = ["cancelled", "archived"];
    const ONE_HOUR_MS = 60 * 60_000;
    const where: Prisma.GameWhereInput = {};
    if (status === "open") {
      where.status = { notIn: ["cancelled", "completed", "archived"] };
    } else if (status === "completed") {
      // Recent Games: completed games stay visible for only 1 hour after completion.
      where.status = "completed";
      where.completedAt = { gte: new Date(Date.now() - ONE_HOUR_MS) };
    } else if (status === "all") {
      where.status = { notIn: HIDDEN };
    } else if (HIDDEN.includes(status)) {
      // Ignore attempts to list hidden games publicly.
      where.status = { notIn: HIDDEN };
    } else {
      where.status = status;
    }
    if (sport && sport !== "all") where.sport = sport;
    if (level && level !== "all") where.OR = [{ skillLevel: level }, { skillLevel: "All Levels" }];
    if (cost === "free") where.costAmount = 0;
    if (cost === "paid") where.costAmount = { gt: 0 };

    let games = await prisma.game.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        organizer: { select: { name: true, reliabilityScore: true, gamesOrganized: true } },
        _count:    { select: { players: true } },
      },
    });

    if (q) games = games.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.sport.toLowerCase().includes(q) ||
      g.location.toLowerCase().includes(q)
    );

    const enriched = games.map(g => ({
      ...g,
      organizerName: g.organizer?.name,
      organizerRating: g.organizer?.reliabilityScore,
      organizerGames: g.organizer?.gamesOrganized,
      playerCount: g._count.players,
    }));

    return ok(enriched);
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    // A host must be reachable: the game page offers participants a tap-to-chat
    // link to the organiser, so we require a WhatsApp number on the profile
    // before a game can be created.
    const host = await prisma.user.findUnique({ where: { id: session.id }, select: { phone: true } });
    if (!toWhatsAppNumber(host?.phone)) {
      return fail("Add a WhatsApp number to your profile before hosting a game.", 400);
    }

    const body = await req.json();
    const input = CreateGameSchema.parse(body);

    // Resolve the chosen slot + its venue. Everything about *where* and *when*
    // the game happens is derived from these — the host never types it.
    const slot = await prisma.venueSlot.findUnique({
      where: { id: input.slotId },
      include: { venue: true, game: { select: { id: true } } },
    });
    if (!slot) return fail("This slot is no longer available.", 400);

    const venue = slot.venue;
    if (!isBookableVenue(venue.status)) return fail("This venue is not available for booking.", 400);
    if (!venueSupportsSport(venue.supportedSports, input.sport)) {
      return fail("This venue does not support the selected sport.", 400);
    }

    // Block/booked/expired check (a non-cancelled game holds the slot; cancelling
    // a game releases its slotId, so slot.game present ⇒ genuinely booked).
    const avail = slotAvailability(
      { startTime: slot.startTime, isBlocked: slot.isBlocked, booked: !!slot.game },
      new Date(),
    );
    if (!avail.available) return fail(avail.message, 400);

    // Authoritative scheduling rule (past + 15-min buffer), derived from the slot.
    const schedule = validateGameSchedule(slot.startTime.toISOString(), new Date());
    if (!schedule.ok) return fail(schedule.message, 400);

    const duration = slotDurationMinutes(slot.startTime, slot.endTime);

    // Creating a game does not touch any permanent counter and triggers no
    // reputation recompute. The organizing credit is granted exactly once, only
    // when an admin finalizes the completed game, so cancelled games never earn
    // leaderboard/reputation credit. location/address/lat/lng are snapshotted
    // from the venue so the game survives the venue being archived later.
    try {
      const game = await prisma.game.create({
        data: {
          sport: input.sport, title: input.title,
          location: venue.name, address: venue.address,
          lat: venue.lat, lng: venue.lng,
          venueId: venue.id, slotId: slot.id,
          scheduledAt: slot.startTime, duration,
          // The host occupies one of the slots they advertise, so the game is
          // born with one seat taken (slots >= 2, so slotsLeft >= 1 — a game can
          // never be created already full). No GamePlayer row is created: the
          // organizer is shown as the host, not as a joined player, and a host
          // row would make cancel/route.ts's participant count non-zero from
          // birth and block hosts from cancelling their own empty games.
          slots: input.slots, slotsLeft: input.slots - 1,
          skillLevel: input.skillLevel, organizerId: session.id,
          cost: input.cost, costAmount: input.costAmount,
          // Host-collected fee details. Only stored for paid games — a free game
          // must not carry payment details, or its detail page renders a fee
          // section for a fee that does not exist.
          paymentMethod: input.costAmount > 0 ? input.paymentMethod ?? null : null,
          hostUpiId:     input.costAmount > 0 ? input.hostUpiId?.trim() || null : null,
          hostQrUrl:     input.costAmount > 0 ? input.hostQrUrl ?? null : null,
          paymentNote:   input.costAmount > 0 ? input.paymentNote?.trim() || null : null,
          venueNote:     input.costAmount > 0 ? input.venueNote?.trim() || null : null,
          description: input.description ?? "",
          rules: input.rules ?? [],
          // Seeded on slotId (unique per game, and known before the insert) so
          // each game draws a different frame from its sport's pool instead of
          // every Badminton game wearing the same photo.
          imageUrl: gameImage(input.sport, slot.id).src,
          status: "open",
        },
      });
      return ok(game, 201);
    } catch (e) {
      // CRITICAL double-booking guard: Game.slotId is @unique, so two concurrent
      // bookings of the same slot race to INSERT — exactly one wins, the loser
      // hits P2002. Map it to the friendly message rather than leaking Prisma.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail("This slot is no longer available.", 409);
      }
      throw e;
    }
  } catch (e) { return handleErr(e); }
}
