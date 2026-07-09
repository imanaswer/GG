import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { okCached, handleErr } from "@/lib/api";
import { slotAvailability } from "@/lib/venues";

// Public venue list for the create-game flow. Only ACTIVE venues are ever
// exposed; INACTIVE/ARCHIVED are admin-only. When a sport is supplied, only
// venues that support it are returned. Each venue carries an `openSlots` count
// (available windows within the look-ahead) so the host can pick a venue that
// actually has openings — computed with the same `slotAvailability` rules the
// slot picker uses, so the count never drifts.
const LOOKAHEAD_DAYS = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");

    const where: Prisma.VenueWhereInput = { status: "ACTIVE" };
    if (sport && sport !== "all") where.supportedSports = { has: sport };

    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60_000);

    const venues = await prisma.venue.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, description: true, address: true,
        lat: true, lng: true, images: true, supportedSports: true,
        slots: {
          where: { startTime: { gte: now, lte: horizon } },
          select: { startTime: true, isBlocked: true, game: { select: { id: true } } },
        },
      },
    });

    const withCounts = venues.map(({ slots, ...v }) => ({
      ...v,
      openSlots: slots.reduce(
        (n, s) =>
          n + (slotAvailability({ startTime: s.startTime, isBlocked: s.isBlocked, booked: !!s.game }, now).available ? 1 : 0),
        0,
      ),
    }));

    // SEMI_STATIC: venue list. Stale slot counts are safe — booking fails closed
    // at the atomic seat guard, and /venues/[id]/slots serves fresher data (15s).
    return okCached(withCounts, 60);
  } catch (e) { return handleErr(e); }
}
