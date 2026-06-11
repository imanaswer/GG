import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { ok, fail, handleErr, UpdateVenueSchema } from "@/lib/api";
import { canDeleteVenue } from "@/lib/venues";

type Ctx = { params: Promise<{ id: string }> };

const LIVE_GAME_STATUSES = ["open", "full"];

// GET — full venue detail incl. its slots (admin sees every slot, any status).
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);
    const { id } = await params;
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        slots: {
          orderBy: { startTime: "asc" },
          include: { game: { select: { id: true, title: true, status: true } } },
        },
      },
    });
    if (!venue) return fail("Venue not found", 404);
    return ok(venue);
  } catch (e) { return handleErr(e); }
}

// PATCH — edit fields and/or change status (enable/disable/archive all flow
// through `status`). Partial update.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);
    const { id } = await params;
    const input = UpdateVenueSchema.parse(await req.json());

    const existing = await prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return fail("Venue not found", 404);

    const venue = await prisma.venue.update({ where: { id }, data: input });
    return ok(venue);
  } catch (e) { return handleErr(e); }
}

// DELETE — only when no active/upcoming games reference the venue. Otherwise the
// admin must disable or archive instead.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);
    const { id } = await params;

    const existing = await prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return fail("Venue not found", 404);

    const liveGames = await prisma.game.count({
      where: { venueId: id, status: { in: LIVE_GAME_STATUSES } },
    });
    const guard = canDeleteVenue(liveGames);
    if (!guard.ok) return fail(guard.message, 409);

    // Slots cascade (onDelete: Cascade); historical games keep their venueId set
    // to NULL (onDelete: SetNull) so their snapshot location/address survives.
    await prisma.venue.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return handleErr(e); }
}
