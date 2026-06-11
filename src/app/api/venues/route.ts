import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, handleErr } from "@/lib/api";

// Public venue list for the create-game flow. Only ACTIVE venues are ever
// exposed; INACTIVE/ARCHIVED are admin-only. When a sport is supplied, only
// venues that support it are returned, so incompatible venues never appear.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");

    const where: Prisma.VenueWhereInput = { status: "ACTIVE" };
    if (sport && sport !== "all") where.supportedSports = { has: sport };

    const venues = await prisma.venue.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, description: true, address: true,
        lat: true, lng: true, images: true, supportedSports: true,
      },
    });

    return ok(venues);
  } catch (e) { return handleErr(e); }
}
