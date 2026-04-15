import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [regs, camps] = await Promise.all([
    prisma.campRegistration.findMany({
      include: { user: { select: { name: true, email: true, phone: true } }, camp: { select: { title: true, sport: true } } },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.camp.findMany(),
  ]);
  const registrations = regs.map(r => ({
    id: r.id, campId: r.campId, userId: r.userId, childName: r.childName, childAge: r.childAge,
    paymentStatus: r.paymentStatus, registeredAt: r.registeredAt,
    parentName: r.user?.name, parentEmail: r.user?.email, parentPhone: r.user?.phone,
    campTitle: r.camp?.title, campSport: r.camp?.sport,
  }));
  return NextResponse.json({ registrations, camps });
}
