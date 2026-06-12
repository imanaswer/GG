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
    const m = (prisma as unknown as Record<string, { count: (args?: unknown) => Promise<number> }>)[model];
    const [total, pending, paid, cancelled, refunded] = await Promise.all([
      m.count(),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "pending" } }),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "paid", [parent]: { endDate: { gte: now } } } }),
      m.count({ where: { status: "cancelled" } }),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "refunded" } }),
    ]);
    // completed = paid registrations whose parent end date has passed
    const completed = await m.count({
      where: { status: { not: "cancelled" }, paymentStatus: "paid", [parent]: { endDate: { lt: now } } },
    });
    return { total, pending, active: paid, completed, cancelled: cancelled + refunded };
  }

  async function eventMetrics(): Promise<LandingMetrics> {
    const [total, pending, activeApproved, completedApproved, rejectedOrCancelled] = await Promise.all([
      prisma.eventRegistration.count(),
      prisma.eventRegistration.count({ where: { status: "pending" } }),
      prisma.eventRegistration.count({ where: { status: "approved", event: { endDate: { gte: now } } } }),
      prisma.eventRegistration.count({ where: { status: "approved", event: { endDate: { lt: now } } } }),
      prisma.eventRegistration.count({ where: { status: { in: ["rejected", "cancelled"] } } }),
    ]);
    return { total, pending, active: activeApproved, completed: completedApproved, cancelled: rejectedOrCancelled };
  }

  const [camps, events, workshops] = await Promise.all([
    regMetrics("campRegistration", "camp"),
    eventMetrics(),
    regMetrics("workshopRegistration", "workshop"),
  ]);

  return NextResponse.json({ coaches, "play-sessions": playSessions, workshops, camps, events });
}
