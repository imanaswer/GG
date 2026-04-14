import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db  = getDB();
  const now = new Date();

  // Since payments may be empty (demo), generate from bookings/regs
  const paidBookings = db.bookings.filter(b => b.status === "confirmed").length;
  const campRevenue  = db.campRegistrations.reduce((a, r) => {
    const camp = db.camps.find(c => c.id === r.campId);
    return a + (camp?.price ?? 0);
  }, 0);
  const eventRevenue = db.eventRegistrations.reduce((a, r) => {
    const ev = db.events.find(e => e.id === r.eventId);
    return a + (ev?.entryFeeAmount ?? 0);
  }, 0);
  const gameRevenue  = db.gamePlayers.reduce((a, gp) => {
    const g = db.games.find(g => g.id === gp.gameId);
    return a + (g?.costAmount ?? 0);
  }, 0);

  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const transactions = [
    ...db.campRegistrations.map(r => {
      const camp = db.camps.find(c => c.id === r.campId);
      const user = db.users.find(u => u.id === r.userId);
      return { id: r.id, type: "Camp", description: camp?.title ?? "Camp", player: user?.name, amount: camp?.price ?? 0, date: r.registeredAt, status: "paid" };
    }),
    ...db.eventRegistrations.filter(r => { const e = db.events.find(e => e.id === r.eventId); return (e?.entryFeeAmount ?? 0) > 0; }).map(r => {
      const ev = db.events.find(e => e.id === r.eventId);
      const user = db.users.find(u => u.id === r.userId);
      return { id: r.id, type: "Event", description: ev?.title ?? "Event", player: user?.name, amount: ev?.entryFeeAmount ?? 0, date: r.registeredAt, status: "paid" };
    }),
    ...db.gamePlayers.filter(gp => { const g = db.games.find(g => g.id === gp.gameId); return (g?.costAmount ?? 0) > 0; }).map(gp => {
      const g = db.games.find(g => g.id === gp.gameId);
      const u = db.users.find(u => u.id === gp.userId);
      return { id: gp.id, type: "Game", description: g?.title ?? "Game", player: u?.name, amount: g?.costAmount ?? 0, date: gp.joinedAt, status: "paid" };
    }),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const total = campRevenue + eventRevenue + gameRevenue;
  const thisMonth = transactions.filter(t => new Date(t.date) >= monthAgo).reduce((a, t) => a + t.amount, 0);
  const thisWeek  = transactions.filter(t => new Date(t.date) >= weekAgo).reduce((a, t) => a + t.amount, 0);
  const avgPerTx  = transactions.length > 0 ? Math.round(total / transactions.length) : 0;

  return NextResponse.json({
    summary: { total, thisMonth, thisWeek, avgPerTransaction: avgPerTx },
    breakdown: [
      { category: "Coach Bookings",      transactions: paidBookings,              total: paidBookings * 1045, avg: 1045 },
      { category: "Camp Registrations",  transactions: db.campRegistrations.length, total: campRevenue, avg: db.campRegistrations.length > 0 ? Math.round(campRevenue / db.campRegistrations.length) : 0 },
      { category: "Event Entry Fees",    transactions: db.eventRegistrations.length, total: eventRevenue, avg: db.eventRegistrations.length > 0 ? Math.round(eventRevenue / db.eventRegistrations.length) : 0 },
      { category: "Pickup Games (paid)", transactions: db.gamePlayers.length,     total: gameRevenue,  avg: db.gamePlayers.length > 0 ? Math.round(gameRevenue / db.gamePlayers.length) : 0 },
    ],
    transactions,
  });
}
