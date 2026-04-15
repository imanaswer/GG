import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const camp = await prisma.camp.findUnique({
      where: { id },
      include: { registrations: true },
    });
    if (!camp) return fail("Camp not found", 404);
    return ok({ ...camp, registeredCount: camp.registrations.length });
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
