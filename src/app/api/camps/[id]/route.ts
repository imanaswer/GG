import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const CANCEL_CUTOFF_MS = 90 * 60_000;

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const camp = await prisma.camp.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!camp) return fail("Camp not found", 404);

    let userRegistration: { id: string; paymentStatus: string; childName: string; childAge: number } | null = null;
    const session = await getSessionFromRequest(req);
    if (session) {
      const reg = camp.registrations.find(r => r.userId === session.id);
      if (reg) userRegistration = { id: reg.id, paymentStatus: reg.paymentStatus, childName: reg.childName, childAge: reg.childAge };
    }

    return ok({ ...camp, registeredCount: camp.registrations.length, userRegistration });
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);
    const { childName, childAge } = await req.json();
    if (!childName || !childAge) return fail("childName and childAge are required", 400);

    const camp = await prisma.camp.findUnique({ where: { id }, select: { participants: true, maxParticipants: true } });
    if (!camp) return fail("Camp not found", 404);
    if (camp.participants >= camp.maxParticipants) return fail("Camp is full", 400);

    const existing = await prisma.campRegistration.findFirst({ where: { campId: id, userId: session.id }, select: { id: true } });
    if (existing) return fail("Already registered", 409);

    const newCount = camp.participants + 1;
    const statusUpdate = newCount >= camp.maxParticipants ? "full" : undefined;

    await prisma.$transaction([
      prisma.campRegistration.create({
        data: { campId: id, userId: session.id, childName, childAge: parseInt(String(childAge)) },
      }),
      prisma.camp.update({ where: { id }, data: { participants: { increment: 1 }, status: statusUpdate } }),
    ]);

    return ok({ registered: true, slotsLeft: camp.maxParticipants - newCount });
  } catch (e) { return handleErr(e); }
}

// CANCEL REGISTRATION
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const reg = await prisma.campRegistration.findFirst({ where: { campId: id, userId: session.id }, select: { id: true } });
    if (!reg) return fail("Not registered for this camp", 400);

    const camp = await prisma.camp.findUnique({ where: { id }, select: { startDate: true, status: true } });
    if (!camp) return fail("Camp not found", 404);

    const now = Date.now();
    const startTime = new Date(camp.startDate).getTime();
    if (startTime - now < CANCEL_CUTOFF_MS) {
      return fail("Cancellation is not allowed within 90 minutes of the start time", 403);
    }

    await prisma.$transaction([
      prisma.campRegistration.delete({ where: { id: reg.id } }),
      prisma.camp.update({
        where: { id },
        data: { participants: { decrement: 1 }, status: camp.status === "full" ? "open" : undefined },
      }),
    ]);

    return ok({ cancelled: true });
  } catch (e) { return handleErr(e); }
}
