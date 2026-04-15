import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [confirmedBookings, campRegs, eventRegs, gamePlayers] = await Promise.all([
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.campRegistration.findMany({ include: { camp: { select: { title: true, price: true } }, user: { select: { name: true } } } }),
    prisma.eventRegistration.findMany({ include: { event: { select: { title: true, entryFeeAmount: true } }, user: { select: { name: true } } } }),
    prisma.gamePlayer.findMany({ include: { game: { select: { title: true, costAmount: true } }, user: { select: { name: true } } } }),
  ]);

  const campRevenue  = campRegs.reduce((a, r) => a + (r.camp?.price ?? 0), 0);
  const eventRevenue = eventRegs.reduce((a, r) => a + (r.event?.entryFeeAmount ?? 0), 0);
  const gameRevenue  = gamePlayers.reduce((a, gp) => a + (gp.game?.costAmount ?? 0), 0);

  const transactions = [
    ...campRegs.map(r => ({ id: r.id, type: "Camp", description: r.camp?.title ?? "Camp", player: r.user?.name, amount: r.camp?.price ?? 0, date: r.registeredAt, status: "paid" })),
    ...eventRegs.filter(r => (r.event?.entryFeeAmount ?? 0) > 0).map(r => ({ id: r.id, type: "Event", description: r.event?.title ?? "Event", player: r.user?.name, amount: r.event?.entryFeeAmount ?? 0, date: r.registeredAt, status: "paid" })),
    ...gamePlayers.filter(gp => (gp.game?.costAmount ?? 0) > 0).map(gp => ({ id: gp.id, type: "Game", description: gp.game?.title ?? "Game", player: gp.user?.name, amount: gp.game?.costAmount ?? 0, date: gp.joinedAt, status: "paid" })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const total = campRevenue + eventRevenue + gameRevenue;
  const thisMonth = transactions.filter(t => t.date >= monthAgo).reduce((a, t) => a + t.amount, 0);
  const thisWeek  = transactions.filter(t => t.date >= weekAgo).reduce((a, t) => a + t.amount, 0);
  const avgPerTx  = transactions.length > 0 ? Math.round(total / transactions.length) : 0;

  return NextResponse.json({
    summary: { total, thisMonth, thisWeek, avgPerTransaction: avgPerTx },
    breakdown: [
      { category: "Coach Bookings",      transactions: confirmedBookings,         total: confirmedBookings * 1045, avg: 1045 },
      { category: "Camp Registrations",  transactions: campRegs.length,           total: campRevenue,  avg: campRegs.length  > 0 ? Math.round(campRevenue  / campRegs.length)  : 0 },
      { category: "Event Entry Fees",    transactions: eventRegs.length,          total: eventRevenue, avg: eventRegs.length > 0 ? Math.round(eventRevenue / eventRegs.length) : 0 },
      { category: "Pickup Games (paid)", transactions: gamePlayers.length,        total: gameRevenue,  avg: gamePlayers.length > 0 ? Math.round(gameRevenue / gamePlayers.length) : 0 },
    ],
    transactions: transactions.map(t => ({ ...t, date: t.date.toISOString() })),
  });
}
