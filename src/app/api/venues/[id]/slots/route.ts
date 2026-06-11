import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";
import { slotAvailability } from "@/lib/venues";

type Ctx = { params: Promise<{ id: string }> };

// Upcoming slots for a venue, each annotated with availability. The picker shows
// blocked slots visually disabled but never selectable; booked/expired slots are
// omitted. By default only available slots are returned (?all=1 includes blocked
// ones so the UI can grey them out). Slots are never returned for a non-ACTIVE
// venue. Look-ahead is capped so the payload stays bounded.
const LOOKAHEAD_DAYS = 30;

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const includeBlocked = new URL(req.url).searchParams.get("all") === "1";

    const venue = await prisma.venue.findUnique({ where: { id }, select: { status: true } });
    if (!venue) return fail("Venue not found", 404);
    if (venue.status !== "ACTIVE") return ok([]); // not bookable → no slots offered

    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60_000);

    const slots = await prisma.venueSlot.findMany({
      where: { venueId: id, startTime: { gte: now, lte: horizon } },
      orderBy: { startTime: "asc" },
      include: { game: { select: { id: true } } },
    });

    const annotated = slots.map((s) => {
      const avail = slotAvailability(
        { startTime: s.startTime, isBlocked: s.isBlocked, booked: !!s.game },
        now,
      );
      return {
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        isBlocked: s.isBlocked,
        blockReason: s.blockReason,
        available: avail.available,
        reason: avail.available ? null : avail.reason,
      };
    });

    // Drop booked/expired entirely; keep blocked only when explicitly requested
    // (so they can render greyed-out). Available slots always pass through.
    const visible = annotated.filter((s) =>
      s.available || (includeBlocked && s.reason === "blocked"),
    );

    return ok(visible);
  } catch (e) { return handleErr(e); }
}
