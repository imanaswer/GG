import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [regs, events] = await Promise.all([
    prisma.eventRegistration.findMany({
      include: { user: { select: { name: true, email: true } }, event: { select: { title: true, type: true, entryFeeAmount: true } } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.sportEvent.findMany(),
  ]);
  const registrations = regs.map(r => ({
    id: r.id, eventId: r.eventId, userId: r.userId, teamName: r.teamName,
    paymentStatus: r.paymentStatus, registeredAt: r.registeredAt,
    playerName: r.user?.name, playerEmail: r.user?.email,
    eventTitle: r.event?.title, eventType: r.event?.type, entryFee: r.event?.entryFeeAmount ?? 0,
  }));
  return NextResponse.json({ registrations, events });
}
