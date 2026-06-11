import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Public single-venue detail (used to auto-populate venue info in create-game).
// Only ACTIVE venues are surfaced publicly.
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const venue = await prisma.venue.findUnique({
      where: { id },
      select: {
        id: true, name: true, description: true, address: true,
        lat: true, lng: true, images: true, supportedSports: true, status: true,
      },
    });
    if (!venue || venue.status !== "ACTIVE") return fail("Venue not found", 404);
    return ok(venue);
  } catch (e) { return handleErr(e); }
}
