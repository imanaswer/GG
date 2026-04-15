import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const event = await prisma.sportEvent.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!event) return fail("Event not found", 404);
    const now = new Date();
    const status = (event.startDate <= now && event.endDate >= now) ? "Live" : event.status;
    return ok({ ...event, status, registeredCount: event.registrations.length });
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { teamName } = await req.json().catch(() => ({}));

    const event = await prisma.sportEvent.findUnique({ where: { id }, select: { participants: true, maxParticipants: true, registrationDeadline: true } });
    if (!event) return fail("Event not found", 404);
    if (event.participants >= event.maxParticipants) return fail("Event is full", 400);
    if (event.registrationDeadline < new Date()) return fail("Registration deadline has passed", 400);

    const existing = await prisma.eventRegistration.findFirst({ where: { eventId: id, userId: session.id }, select: { id: true } });
    if (existing) return fail("Already registered", 409);

    const newCount = event.participants + 1;
    const statusUpdate = newCount >= event.maxParticipants ? "Full" : undefined;

    await prisma.$transaction([
      prisma.eventRegistration.create({ data: { eventId: id, userId: session.id, teamName } }),
      prisma.sportEvent.update({ where: { id }, data: { participants: { increment: 1 }, status: statusUpdate } }),
    ]);

    return ok({ registered: true, participants: newCount });
  } catch (e) { return handleErr(e); }
}
