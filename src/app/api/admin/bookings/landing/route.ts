import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import type { LandingMetrics } from "@/lib/adminBookings/types";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();

  // Coaches
  const coachGroups = await prisma.booking.groupBy({ by: ["status"], _count: true });
  const cg = (s: string) => coachGroups.find(g => g.status === s)?._count ?? 0;
  const coaches: LandingMetrics = {
    total: coachGroups.reduce((a, g) => a + g._count, 0),
    pending: cg("pending"), active: cg("approved"), completed: cg("completed"),
    cancelled: cg("cancelled") + cg("rejected"),
  };

  // Play sessions (GamePlayer)
  const [gpTotal, gpCancelled, gpAttended, gpNoShow, gpJoined] = await Promise.all([
    prisma.gamePlayer.count(),
    prisma.gamePlayer.count({ where: { status: "cancelled" } }),
    prisma.gamePlayer.count({ where: { status: { not: "cancelled" }, attended: true } }),
    prisma.gamePlayer.count({ where: { status: { not: "cancelled" }, attended: false } }),
    prisma.gamePlayer.count({ where: { status: { not: "cancelled" }, attended: null } }),
  ]);
  const playSessions: LandingMetrics = {
    total: gpTotal, pending: null, active: gpJoined, completed: gpAttended,
    cancelled: gpCancelled + gpNoShow,
  };

  // Registration categories
  async function regMetrics(model: "campRegistration" | "eventRegistration" | "workshopRegistration",
                            parent: "camp" | "event" | "workshop"): Promise<LandingMetrics> {
    const m = (prisma as any)[model];
    const [total, pending, paid, cancelled, refunded] = await Promise.all([
      m.count(),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "pending" } }),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "paid" } }),
      m.count({ where: { status: "cancelled" } }),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "refunded" } }),
    ]);
    // completed = paid registrations whose parent end date has passed
    const completed = await m.count({
      where: { status: { not: "cancelled" }, paymentStatus: "paid", [parent]: { endDate: { lt: now } } },
    });
    return { total, pending, active: paid, completed, cancelled: cancelled + refunded };
  }

  const [camps, events, workshops] = await Promise.all([
    regMetrics("campRegistration", "camp"),
    regMetrics("eventRegistration", "event"),
    regMetrics("workshopRegistration", "workshop"),
  ]);

  return NextResponse.json({ coaches, "play-sessions": playSessions, workshops, camps, events });
}
