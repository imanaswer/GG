import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers, totalCoaches, activeBookings, gamesThisWeek, campRegistrations,
    revenueAgg, gameSlotsAgg, bookings, users, camps, upcomingGames, pendingBookings, lowSeatCoaches,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "admin" } } }),
    prisma.coach.count({ where: { status: "active" } }),
    prisma.booking.count({ where: { status: { not: "cancelled" } } }),
    prisma.game.count({ where: { scheduledAt: { gte: weekAgo }, status: { in: ["open", "full"] } } }),
    prisma.campRegistration.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "paid", createdAt: { gte: monthStart } } }),
    prisma.game.aggregate({ _sum: { slots: true, slotsLeft: true } }),
    prisma.booking.findMany({ select: { id: true, status: true, createdAt: true, coachId: true } }),
    prisma.user.findMany({ where: { role: { not: "admin" } }, select: { reliabilityScore: true } }),
    prisma.camp.findMany({ select: { id: true, title: true, participants: true, maxParticipants: true, status: true } }),
    prisma.game.findMany({ where: { scheduledAt: { gte: now }, status: { in: ["open", "full"] } }, select: { id: true, title: true, scheduledAt: true, slots: true, slotsLeft: true } }),
    prisma.booking.findMany({ where: { status: "pending" }, select: { id: true, coachId: true, createdAt: true } }),
    prisma.coach.findMany({ where: { seatsLeft: 0 }, select: { id: true, name: true } }),
  ]);

  const revenueMonth = revenueAgg._sum.amount ?? 0;
  const totalSlots = gameSlotsAgg._sum.slots ?? 0;
  const slotsLeft = gameSlotsAgg._sum.slotsLeft ?? 0;
  const filledSlots = totalSlots - slotsLeft;
  const slotFillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const confirmRate = bookings.length > 0
    ? Math.round((bookings.filter(b => b.status === "confirmed").length / bookings.length) * 100) : 0;
  const cancelRate = bookings.length > 0
    ? Math.round((bookings.filter(b => b.status === "cancelled").length / bookings.length) * 100) : 0;
  const avgReliability = users.length > 0
    ? (users.reduce((a, u) => a + u.reliabilityScore, 0) / users.length).toFixed(1) : "5.0";

  const alerts: { type: string; message: string; severity: string }[] = [];
  camps.forEach(c => { if (c.participants >= c.maxParticipants && c.status !== "full") alerts.push({ type: "camp", message: `${c.title} is full but status not updated`, severity: "warning" }); });
  upcomingGames.forEach(g => {
    const hoursUntil = (g.scheduledAt.getTime() - now.getTime()) / 3600000;
    if (hoursUntil > 0 && hoursUntil < 2 && g.slots - g.slotsLeft < 3) alerts.push({ type: "game", message: `${g.title} starts in ${Math.round(hoursUntil)}hr with only ${g.slots - g.slotsLeft} players`, severity: "urgent" });
  });
  const coachById = new Map((await prisma.coach.findMany({ select: { id: true, name: true } })).map(c => [c.id, c.name]));
  pendingBookings.forEach(b => {
    const hoursOld = (now.getTime() - b.createdAt.getTime()) / 3600000;
    if (hoursOld > 48) alerts.push({ type: "booking", message: `Pending booking for ${coachById.get(b.coachId) ?? "coach"} is ${Math.round(hoursOld)}hrs old`, severity: "warning" });
  });
  lowSeatCoaches.forEach(c => alerts.push({ type: "coach", message: `${c.name} has 0 seats — may need new batches`, severity: "info" }));

  return NextResponse.json({
    metrics: { totalUsers, totalCoaches, activeBookings, gamesThisWeek, campRegistrations, revenueMonth },
    health: { slotFillRate, confirmRate, avgReliability, cancelRate },
    alerts: alerts.slice(0, 10),
  });
}
