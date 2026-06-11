import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { ok, fail, handleErr, CreateVenueSchema } from "@/lib/api";

// Statuses that mean a game still "occupies" the venue/slot (upcoming or live).
const LIVE_GAME_STATUSES = ["open", "full"];

// GET /api/admin/venues — full venue list (all statuses) + dashboard analytics.
export async function GET(req: NextRequest) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);

    const now = new Date();
    const venues = await prisma.venue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { slots: true } },
        slots: { select: { isBlocked: true, startTime: true, game: { select: { status: true } } } },
      },
    });

    const rows = venues.map((v) => {
      const upcomingSlots = v.slots.filter((s) => s.startTime >= now);
      const bookedUpcoming = upcomingSlots.filter((s) => s.game && LIVE_GAME_STATUSES.includes(s.game.status)).length;
      const blockedSlots = v.slots.filter((s) => s.isBlocked).length;
      const upcomingGames = v.slots.filter((s) => s.game && LIVE_GAME_STATUSES.includes(s.game.status) && s.startTime >= now).length;
      return {
        id: v.id, name: v.name, description: v.description, address: v.address,
        lat: v.lat, lng: v.lng, images: v.images, supportedSports: v.supportedSports,
        status: v.status, createdAt: v.createdAt,
        slotCount: v._count.slots,
        blockedSlots,
        upcomingGames,
        occupancyRate: upcomingSlots.length ? Math.round((bookedUpcoming / upcomingSlots.length) * 100) : 0,
      };
    });

    const analytics = {
      totalVenues: rows.length,
      activeVenues: rows.filter((r) => r.status === "ACTIVE").length,
      inactiveVenues: rows.filter((r) => r.status === "INACTIVE").length,
      archivedVenues: rows.filter((r) => r.status === "ARCHIVED").length,
      upcomingGames: rows.reduce((a, r) => a + r.upcomingGames, 0),
      blockedSlots: rows.reduce((a, r) => a + r.blockedSlots, 0),
      occupancyRate: rows.length
        ? Math.round(rows.reduce((a, r) => a + r.occupancyRate, 0) / rows.length)
        : 0,
    };

    return ok({ venues: rows, analytics });
  } catch (e) { return handleErr(e); }
}

// POST /api/admin/venues — create a venue.
export async function POST(req: NextRequest) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);
    const input = CreateVenueSchema.parse(await req.json());
    const venue = await prisma.venue.create({
      data: {
        name: input.name, description: input.description ?? "", address: input.address,
        lat: input.lat, lng: input.lng, images: input.images ?? [],
        supportedSports: input.supportedSports, status: input.status ?? "ACTIVE",
      },
    });
    return ok(venue, 201);
  } catch (e) { return handleErr(e); }
}
