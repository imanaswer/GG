import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { ok, fail, handleErr, UpdateSlotSchema } from "@/lib/api";
import { canDeleteSlot } from "@/lib/venues";

type Ctx = { params: Promise<{ id: string; slotId: string }> };

// Statuses where a game still genuinely holds the slot (scheduled or live).
const LIVE_GAME_STATUSES = ["open", "full"];

// PATCH — edit slot times, or block/unblock it. Blocking a slot does NOT touch
// any game already on it; it only prevents future bookings (the create API and
// slot picker both treat isBlocked as unavailable).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);
    const { slotId } = await params;
    const input = UpdateSlotSchema.parse(await req.json());

    const existing = await prisma.venueSlot.findUnique({ where: { id: slotId }, select: { id: true } });
    if (!existing) return fail("Slot not found", 404);

    const data: Prisma.VenueSlotUpdateInput = {};
    if (input.startTime !== undefined) data.startTime = new Date(input.startTime);
    if (input.endTime !== undefined) data.endTime = new Date(input.endTime);
    if (input.isBlocked !== undefined) {
      data.isBlocked = input.isBlocked;
      // Clear the reason when unblocking; set it (if given) when blocking.
      data.blockReason = input.isBlocked ? (input.blockReason ?? null) : null;
    } else if (input.blockReason !== undefined) {
      data.blockReason = input.blockReason;
    }

    const slot = await prisma.venueSlot.update({ where: { id: slotId }, data });
    return ok(slot);
  } catch (e) { return handleErr(e); }
}

// DELETE — only when no scheduled/active game uses the slot. Otherwise the admin
// must block it instead.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);
    const { slotId } = await params;

    const existing = await prisma.venueSlot.findUnique({ where: { id: slotId }, select: { id: true } });
    if (!existing) return fail("Slot not found", 404);

    const liveGames = await prisma.game.count({
      where: { slotId, status: { in: LIVE_GAME_STATUSES } },
    });
    const guard = canDeleteSlot(liveGames);
    if (!guard.ok) return fail(guard.message, 409);

    await prisma.venueSlot.delete({ where: { id: slotId } });
    return ok({ deleted: true });
  } catch (e) { return handleErr(e); }
}
