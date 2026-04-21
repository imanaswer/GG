import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const CANCEL_CUTOFF_MS = 90 * 60_000;

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const workshop = await prisma.workshop.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!workshop) return fail("Workshop not found", 404);

    let userRegistration: {
      id: string; paymentStatus: string;
      participantName: string; participantAge: number | null; registrationType: string;
    } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const reg = workshop.registrations.find(r => r.userId === session.id);
      if (reg) userRegistration = {
        id: reg.id, paymentStatus: reg.paymentStatus,
        participantName: reg.participantName, participantAge: reg.participantAge,
        registrationType: reg.registrationType,
      };
    }

    return ok({ ...workshop, registeredCount: workshop.registrations.length, userRegistration });
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { participantName, participantAge, registrationType } = await req.json();
    if (!participantName) return fail("participantName is required", 400);
    if (!registrationType) return fail("registrationType is required", 400);
    if (registrationType === "youth" && !participantAge) return fail("participantAge is required for youth registration", 400);

    const workshop = await prisma.workshop.findUnique({
      where: { id },
      select: { participants: true, maxParticipants: true, registrationDeadline: true, price: true, status: true },
    });
    if (!workshop) return fail("Workshop not found", 404);
    if (["closed", "completed", "archived"].includes(workshop.status)) return fail("Registrations are closed for this workshop", 409);
    if (workshop.participants >= workshop.maxParticipants) return fail("Workshop is full", 400);
    if (workshop.registrationDeadline < new Date()) return fail("Registration deadline has passed", 400);

    const existing = await prisma.workshopRegistration.findFirst({ where: { workshopId: id, userId: session.id }, select: { id: true } });
    if (existing) return fail("Already registered", 409);

    const newCount = workshop.participants + 1;
    const statusUpdate = newCount >= workshop.maxParticipants ? "full" : undefined;
    const isFree = workshop.price === 0;

    await prisma.$transaction([
      prisma.workshopRegistration.create({
        data: {
          workshopId: id, userId: session.id,
          participantName, participantAge: participantAge ? parseInt(String(participantAge)) : null,
          registrationType, paymentStatus: isFree ? "free" : "unpaid",
        },
      }),
      prisma.workshop.update({ where: { id }, data: { participants: { increment: 1 }, status: statusUpdate } }),
    ]);

    return ok({ registered: true, participants: newCount });
  } catch (e) { return handleErr(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const reg = await prisma.workshopRegistration.findFirst({ where: { workshopId: id, userId: session.id }, select: { id: true } });
    if (!reg) return fail("Not registered for this workshop", 400);

    const workshop = await prisma.workshop.findUnique({ where: { id }, select: { startDate: true, status: true } });
    if (!workshop) return fail("Workshop not found", 404);

    const now = Date.now();
    const startTime = new Date(workshop.startDate).getTime();
    if (startTime - now < CANCEL_CUTOFF_MS) {
      return fail("Cancellation is not allowed within 90 minutes of the start time", 403);
    }

    await prisma.$transaction([
      prisma.workshopRegistration.delete({ where: { id: reg.id } }),
      prisma.workshop.update({
        where: { id },
        data: { participants: { decrement: 1 }, status: workshop.status === "full" ? "open" : undefined },
      }),
    ]);

    return ok({ cancelled: true });
  } catch (e) { return handleErr(e); }
}
