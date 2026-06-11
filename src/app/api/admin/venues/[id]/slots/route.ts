import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { ok, fail, handleErr, CreateSlotSchema, BulkSlotSchema } from "@/lib/api";
import { generateSlots } from "@/lib/venues";

type Ctx = { params: Promise<{ id: string }> };

// POST — create slots for a venue. Two modes, chosen by payload shape:
//   • single: { startTime, endTime } (ISO)
//   • bulk:   { fromDate, toDate, dayStart, dayEnd, slotMinutes }
// Bulk generation is idempotent thanks to the @@unique([venueId, startTime])
// constraint + skipDuplicates, so re-running over an overlapping range is safe.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminSessionFromRequest(req))) return fail("Admin authentication required", 401);
    const { id } = await params;

    const venue = await prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!venue) return fail("Venue not found", 404);

    const body = await req.json();

    if ("fromDate" in body || "slotMinutes" in body) {
      const input = BulkSlotSchema.parse(body);
      const windows = generateSlots(input);
      if (windows.length === 0) return fail("That range produced no slots. Check the times and interval.", 400);
      const result = await prisma.venueSlot.createMany({
        data: windows.map((w) => ({ venueId: id, startTime: w.startTime, endTime: w.endTime })),
        skipDuplicates: true,
      });
      return ok({ created: result.count, generated: windows.length }, 201);
    }

    const input = CreateSlotSchema.parse(body);
    const slot = await prisma.venueSlot.create({
      data: { venueId: id, startTime: new Date(input.startTime), endTime: new Date(input.endTime) },
    });
    return ok(slot, 201);
  } catch (e) { return handleErr(e); }
}
