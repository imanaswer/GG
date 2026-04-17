import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const CANCEL_CUTOFF_MS = 90 * 60_000;

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const event = await prisma.sportEvent.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!event) return fail("Event not found", 404);
    const now = new Date();
    const status = (event.startDate <= now && event.endDate >= now) ? "Live" : event.status;

    let userRegistration: { id: string; paymentStatus: string; teamName: string | null } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const reg = event.registrations.find(r => r.userId === session.id);
      if (reg) userRegistration = { id: reg.id, paymentStatus: reg.paymentStatus, teamName: reg.teamName };
    }

    return ok({ ...event, status, registeredCount: event.registrations.length, userRegistration });
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { teamName } = await req.json().catch(() => ({}));

    const event = await prisma.sportEvent.findUnique({ where: { id }, select: { participants: true, maxParticipants: true, registrationDeadline: true, entryFeeAmount: true } });
    if (!event) return fail("Event not found", 404);
    if (event.participants >= event.maxParticipants) return fail("Event is full", 400);
    if (event.registrationDeadline < new Date()) return fail("Registration deadline has passed", 400);

    const existing = await prisma.eventRegistration.findFirst({ where: { eventId: id, userId: session.id }, select: { id: true } });
    if (existing) return fail("Already registered", 409);

    const newCount = event.participants + 1;
    const statusUpdate = newCount >= event.maxParticipants ? "Full" : undefined;
    const isFree = event.entryFeeAmount === 0;

    await prisma.$transaction([
      prisma.eventRegistration.create({ data: { eventId: id, userId: session.id, teamName, paymentStatus: isFree ? "free" : "unpaid" } }),
      prisma.sportEvent.update({ where: { id }, data: { participants: { increment: 1 }, status: statusUpdate } }),
    ]);

    return ok({ registered: true, participants: newCount });
  } catch (e) { return handleErr(e); }
}

// CANCEL REGISTRATION
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const reg = await prisma.eventRegistration.findFirst({ where: { eventId: id, userId: session.id }, select: { id: true } });
    if (!reg) return fail("Not registered for this event", 400);

    const event = await prisma.sportEvent.findUnique({ where: { id }, select: { startDate: true, status: true } });
    if (!event) return fail("Event not found", 404);

    const now = Date.now();
    const startTime = new Date(event.startDate).getTime();
    if (startTime - now < CANCEL_CUTOFF_MS) {
      return fail("Cancellation is not allowed within 90 minutes of the start time", 403);
    }

    await prisma.$transaction([
      prisma.eventRegistration.delete({ where: { id: reg.id } }),
      prisma.sportEvent.update({
        where: { id },
        data: { participants: { decrement: 1 }, status: event.status === "Full" ? "Registration Open" : undefined },
      }),
    ]);

    return ok({ cancelled: true });
  } catch (e) { return handleErr(e); }
}
