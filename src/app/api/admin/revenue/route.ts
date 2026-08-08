import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { REGISTRATION_REVENUE_WHERE } from "@/lib/paymentStatus";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [paidBookings, campRegs, eventRegs, gamePlayers] = await Promise.all([
    prisma.booking.findMany({
      where: { paymentStatus: "paid" },
      select: { id: true, amountPaid: true, approvedAt: true, createdAt: true, coach: { select: { name: true } }, user: { select: { name: true } } },
    }),
    // Only paid rows are revenue. Without this filter a pending or refunded
    // registration was still counted at full price.
    prisma.campRegistration.findMany({ where: REGISTRATION_REVENUE_WHERE, include: { camp: { select: { title: true, price: true } }, user: { select: { name: true } } } }),
    prisma.eventRegistration.findMany({ where: REGISTRATION_REVENUE_WHERE, include: { event: { select: { title: true, entryFeeAmount: true } }, user: { select: { name: true } } } }),
    prisma.gamePlayer.findMany({ where: { game: { status: { not: "cancelled" } } }, include: { game: { select: { title: true, costAmount: true } }, user: { select: { name: true } } } }),
  ]);

  const campRevenue  = campRegs.reduce((a, r) => a + (r.camp?.price ?? 0), 0);
  const eventRevenue = eventRegs.reduce((a, r) => a + (r.event?.entryFeeAmount ?? 0), 0);
  const gameRevenue  = gamePlayers.reduce((a, gp) => a + (gp.game?.costAmount ?? 0), 0);
  // Booking.amountPaid is in paise; revenue figures here are in rupees.
  const coachRevenue = paidBookings.reduce((a, b) => a + Math.round(b.amountPaid / 100), 0);

  const transactions = [
    ...campRegs.map(r => ({ id: r.id, type: "Camp", description: r.camp?.title ?? "Camp", player: r.user?.name, amount: r.camp?.price ?? 0, date: r.registeredAt, status: "paid" })),
    ...eventRegs.filter(r => (r.event?.entryFeeAmount ?? 0) > 0).map(r => ({ id: r.id, type: "Event", description: r.event?.title ?? "Event", player: r.user?.name, amount: r.event?.entryFeeAmount ?? 0, date: r.registeredAt, status: "paid" })),
    ...gamePlayers.filter(gp => (gp.game?.costAmount ?? 0) > 0).map(gp => ({ id: gp.id, type: "Game", description: gp.game?.title ?? "Game", player: gp.user?.name, amount: gp.game?.costAmount ?? 0, date: gp.joinedAt, status: "paid" })),
    ...paidBookings.map(b => ({ id: b.id, type: "Coach", description: b.coach?.name ?? "Coach session", player: b.user?.name, amount: Math.round(b.amountPaid / 100), date: b.approvedAt ?? b.createdAt, status: "paid" })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const total = campRevenue + eventRevenue + gameRevenue + coachRevenue;
  const thisMonth = transactions.filter(t => t.date >= monthAgo).reduce((a, t) => a + t.amount, 0);
  const thisWeek  = transactions.filter(t => t.date >= weekAgo).reduce((a, t) => a + t.amount, 0);
  const avgPerTx  = transactions.length > 0 ? Math.round(total / transactions.length) : 0;

  return NextResponse.json({
    summary: { total, thisMonth, thisWeek, avgPerTransaction: avgPerTx },
    breakdown: [
      { category: "Coach Bookings",      transactions: paidBookings.length,       total: coachRevenue, avg: paidBookings.length > 0 ? Math.round(coachRevenue / paidBookings.length) : 0 },
      { category: "Camp Registrations",  transactions: campRegs.length,           total: campRevenue,  avg: campRegs.length  > 0 ? Math.round(campRevenue  / campRegs.length)  : 0 },
      { category: "Event Entry Fees",    transactions: eventRegs.length,          total: eventRevenue, avg: eventRegs.length > 0 ? Math.round(eventRevenue / eventRegs.length) : 0 },
      { category: "Pickup Games (paid)", transactions: gamePlayers.length,        total: gameRevenue,  avg: gamePlayers.length > 0 ? Math.round(gameRevenue / gamePlayers.length) : 0 },
    ],
    transactions: transactions.map(t => ({ ...t, date: t.date.toISOString() })),
  });
}
