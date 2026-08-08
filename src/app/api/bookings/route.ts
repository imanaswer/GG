import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr, ApiError } from "@/lib/api";
import { cancelBooking, BookingTransitionError, BILLABLE_STATUSES } from "@/lib/bookings";
import { coachAdmission } from "@/lib/checkout";
import { logOps } from "@/lib/ops";

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

    const coach = await prisma.coach.findUnique({ where: { id: coachId }, select: { id: true, seatsLeft: true, status: true } });
    if (!coach) return fail("Coach not found", 404);
    // Seats AND approval — a self-registered coach sits at "pending_approval"
    // until an admin activates them, and was bookable in the meantime.
    const refusal = coachAdmission(coach);
    if (refusal) return fail(refusal.message, refusal.status);

    // Capture the player's mobile number so the team can reach them about the session.
    const cleanedPhone = typeof phone === "string" ? phone.trim() : "";
    if (cleanedPhone && !/^\+?[\d\s-]{7,20}$/.test(cleanedPhone)) {
      return fail("Please enter a valid mobile number", 400);
    }

    // Conditional seat claim (updateMany with a seatsLeft>0 guard): 0 rows means
    // someone else took the last seat, so seatsLeft can never go negative under
    // concurrency. Booking's @@unique([userId,coachId]) blocks duplicate bookings.
    let booking;
    try {
      booking = await prisma.$transaction(async tx => {
        if (cleanedPhone) {
          await tx.user.update({ where: { id: session.id }, data: { phone: cleanedPhone } });
        }
        // The coach seat is claimed unconditionally — the nesting used to be
        // inverted, so an unusable batchId (full, another coach's, nonexistent)
        // silently skipped the claim and created a booking holding NO seat.
        // Cancelling that booking then released a seat it never took, and
        // seatsLeft climbed past totalSeats. Matches payments/verify.
        const claim = await tx.coach.updateMany({ where: { id: coachId, seatsLeft: { gt: 0 } }, data: { seatsLeft: { decrement: 1 } } });
        if (claim.count === 0) throw new ApiError("No seats available", 409);
        if (batchId) {
          const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { seats: true, coachId: true } });
          if (!batch || batch.coachId !== coachId) throw new ApiError("That batch is not available", 400);
          if (batch.seats <= 0) throw new ApiError("That batch is full", 409);
          await tx.batch.update({ where: { id: batchId }, data: { seats: { decrement: 1 } } });
        }
        return tx.booking.create({
          data: { userId: session.id, coachId, batchId: batchId ?? null, status: "pending", note },
        });
      });
    } catch (e) {
      if (e instanceof ApiError) return fail(e.message, e.status);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("You already have a booking with this coach", 409);
      throw e;
    }

    // A free coach booking lands at "pending" and waits for a human. Nothing told
    // anyone it was waiting, so it sat until someone happened to look.
    void logOps({
      type: "booking.created",
      severity: "action",
      title: "[GG] New coach booking — needs approval",
      body: `${session.name ?? "A player"} requested a session. It holds a seat until approved or rejected.`,
      link: "/admin/bookings/coaches?status=pending",
      entityType: "coach", entityId: coachId, userId: session.id,
      dedupeKey: `booking.created:${booking.id}`,
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
