import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";
import { cancelBooking, BookingTransitionError, BILLABLE_STATUSES } from "@/lib/bookings";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const role = new URL(req.url).searchParams.get("role");

    if (role === "coach") {
      const coach = await prisma.coach.findFirst({
        where: { OR: [{ userId: session.id }, { email: session.email }] },
        select: { id: true },
      });
      if (!coach) return ok({ pending: 0, approved: 0, list: [] });

      const coachBookings = await prisma.booking.findMany({
        where: { coachId: coach.id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      const list = coachBookings.map(b => ({ ...b, playerName: b.user?.name }));
      return ok({
        pending:  list.filter(b => b.status === "pending").length,
        approved: list.filter(b => (BILLABLE_STATUSES as string[]).includes(b.status)).length,
        list,
      });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: session.id },
      include: { coach: { select: { name: true, sport: true, location: true, imageUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(bookings.map(b => ({
      ...b,
      coachName: b.coach?.name,
      sport: b.coach?.sport,
      location: b.coach?.location,
      imageUrl: b.coach?.imageUrl,
    })));
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { coachId, batchId, note, phone } = await req.json();

    const coach = await prisma.coach.findUnique({ where: { id: coachId }, select: { id: true, seatsLeft: true } });
    if (!coach) return fail("Coach not found", 404);
    if (coach.seatsLeft <= 0) return fail("No seats available", 400);

    // Capture the player's mobile number so the team can reach them about the session.
    const cleanedPhone = typeof phone === "string" ? phone.trim() : "";
    if (cleanedPhone && !/^\+?[\d\s-]{7,20}$/.test(cleanedPhone)) {
      return fail("Please enter a valid mobile number", 400);
    }

    const booking = await prisma.$transaction(async tx => {
      if (cleanedPhone) {
        await tx.user.update({ where: { id: session.id }, data: { phone: cleanedPhone } });
      }
      if (batchId) {
        const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { seats: true, coachId: true } });
        if (batch && batch.coachId === coachId && batch.seats > 0) {
          await tx.batch.update({ where: { id: batchId }, data: { seats: { decrement: 1 } } });
          await tx.coach.update({ where: { id: coachId }, data: { seatsLeft: { decrement: 1 } } });
        }
      } else {
        await tx.coach.update({ where: { id: coachId }, data: { seatsLeft: { decrement: 1 } } });
      }
      return tx.booking.create({
        data: { userId: session.id, coachId, batchId: batchId ?? null, status: "pending", note },
      });
    });

    return ok(booking);
  } catch (e) { return handleErr(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { id, status } = await req.json();
    // Players/coaches may only cancel their own booking here.
    // Approve / reject / complete go through the admin route only.
    if (status && status !== "cancelled") return fail("Only cancellation is allowed here", 403);

    const booking = await prisma.booking.findUnique({ where: { id }, select: { userId: true } });
    if (!booking) return fail("Booking not found", 404);
    if (booking.userId !== session.id) return fail("Unauthorized", 403);

    try {
      const updated = await cancelBooking(id);
      return ok(updated);
    } catch (e) {
      if (e instanceof BookingTransitionError) return fail(e.message, 409);
      throw e;
    }
  } catch (e) { return handleErr(e); }
}
