import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

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
      if (!coach) return ok({ pending: 0, confirmed: 0, list: [] });

      const coachBookings = await prisma.booking.findMany({
        where: { coachId: coach.id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      const list = coachBookings.map(b => ({ ...b, playerName: b.user?.name }));
      return ok({
        pending:   list.filter(b => b.status === "pending").length,
        confirmed: list.filter(b => b.status === "confirmed").length,
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

    const { coachId, batchId, note } = await req.json();

    const coach = await prisma.coach.findUnique({ where: { id: coachId }, select: { id: true, seatsLeft: true } });
    if (!coach) return fail("Coach not found", 404);
    if (coach.seatsLeft <= 0) return fail("No seats available", 400);

    const booking = await prisma.$transaction(async tx => {
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

    const { id, status, coachNote } = await req.json();
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { coach: { select: { id: true, userId: true, email: true } } },
    });
    if (!booking) return fail("Booking not found", 404);

    const coach = booking.coach;
    const isCoach  = coach?.userId === session.id || coach?.email === session.email;
    const isPlayer = booking.userId === session.id;
    if (!isCoach && !isPlayer) return fail("Unauthorized", 403);

    const prev = booking.status;
    const updated = await prisma.$transaction(async tx => {
      const u = await tx.booking.update({
        where: { id },
        data: { status, coachNote: coachNote ?? undefined },
      });

      if (prev !== "cancelled" && status === "cancelled" && coach) {
        await tx.coach.update({ where: { id: coach.id }, data: { seatsLeft: { increment: 1 } } });
        if (booking.batchId) {
          await tx.batch.update({ where: { id: booking.batchId }, data: { seats: { increment: 1 } } });
        }
      }
      return u;
    });

    return ok(updated);
  } catch (e) { return handleErr(e); }
}
