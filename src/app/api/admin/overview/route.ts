import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { BILLABLE_STATUSES } from "@/lib/bookings";
import { logOpsSafe } from "@/lib/ops";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers, totalCoaches, activeBookings, gamesThisWeek, campRegistrations, workshopRegistrations,
    revenueAgg, gameSlotsAgg, bookings, users, camps, upcomingGames, pendingBookings, lowSeatCoaches,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "admin" } } }),
    prisma.coach.count({ where: { status: "active" } }),
    prisma.booking.count({ where: { status: { in: ["pending", "approved"] } } }),
    prisma.game.count({ where: { scheduledAt: { gte: weekAgo }, status: { in: ["open", "full"] } } }),
    prisma.campRegistration.count(),
    prisma.workshopRegistration.count(),
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
    ? Math.round((bookings.filter(b => (BILLABLE_STATUSES as string[]).includes(b.status)).length / bookings.length) * 100) : 0;
  const cancelRate = bookings.length > 0
    ? Math.round((bookings.filter(b => b.status === "cancelled").length / bookings.length) * 100) : 0;
  const avgReliability = users.length > 0
    ? (users.reduce((a, u) => a + u.reliabilityScore, 0) / users.length).toFixed(1) : "5.0";

  // `id` is the entity the alert is ABOUT. The dedupeKey must key on it, never on
  // the message: messages embed ticking values ("starts in 2hr", "is 49hrs old"),
  // so keying on text would mint a brand-new work item every hour for the same
  // problem, and resolved rows would not stay resolved.
  const alerts: { type: string; id: string; message: string; severity: string }[] = [];
  camps.forEach(c => { if (c.participants >= c.maxParticipants && c.status !== "full") alerts.push({ type: "camp", id: c.id, message: `${c.title} is full but status not updated`, severity: "warning" }); });
  upcomingGames.forEach(g => {
    const hoursUntil = (g.scheduledAt.getTime() - now.getTime()) / 3600000;
    if (hoursUntil > 0 && hoursUntil < 2 && g.slots - g.slotsLeft < 3) alerts.push({ type: "game", id: g.id, message: `${g.title} starts in ${Math.round(hoursUntil)}hr with only ${g.slots - g.slotsLeft} players`, severity: "urgent" });
  });
  const coachById = new Map((await prisma.coach.findMany({ select: { id: true, name: true } })).map(c => [c.id, c.name]));
  pendingBookings.forEach(b => {
    const hoursOld = (now.getTime() - b.createdAt.getTime()) / 3600000;
    if (hoursOld > 48) alerts.push({ type: "booking", id: b.id, message: `Pending booking for ${coachById.get(b.coachId) ?? "coach"} is ${Math.round(hoursOld)}hrs old`, severity: "warning" });
  });
  lowSeatCoaches.forEach(c => alerts.push({ type: "coach", id: c.id, message: `${c.name} has 0 seats — may need new batches`, severity: "info" }));

  // The alerts above are recomputed on every request and vanish with it: they could
  // not be dismissed, assigned, or acted on, and nothing recorded that anyone had
  // seen one. The urgent ones are now also written to the inbox, where they can be
  // claimed and resolved. dedupeKey makes repeated detection one row, not one per
  // poll — the overview is polled every 30 seconds.
  for (const a of alerts) {
    if (a.severity === "info") continue; // not worth a work item
    logOpsSafe(() => ({
      type: `alert.${a.type}`,
      severity: "action" as const,
      title: `[GG] ${a.message}`,
      link: "/admin/inbox",
      entityType: a.type,
      entityId: a.id,
      // rule + entity, NOT the message — see the note on the alerts array above.
      dedupeKey: `alert:${a.type}:${a.id}`,
    }));
  }

  const tierGroups = await prisma.user.groupBy({
    by: ["tier"],
    where: { deletedAt: null, role: { not: "admin" } },
    _count: { _all: true },
  });
  const tierDistribution: Record<string, number> = { bronze: 0, silver: 0, gold: 0, elite: 0, pro: 0 };
  for (const g of tierGroups) {
    if (g.tier in tierDistribution) tierDistribution[g.tier] = g._count._all;
  }

  const trends = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000);
    return { name: d.toLocaleDateString("en-US", { weekday: "short" }), dateStr: d.toISOString().split("T")[0], bookings: 0, revenue: 0 };
  });

  bookings.forEach(b => {
    const dStr = b.createdAt.toISOString().split("T")[0];
    const day = trends.find(t => t.dateStr === dStr);
    if (day) day.bookings++;
  });

  const recentPayments = await prisma.payment.findMany({
    where: { status: "paid", createdAt: { gte: weekAgo } },
    select: { amount: true, createdAt: true }
  });
  
  recentPayments.forEach(p => {
    const dStr = p.createdAt.toISOString().split("T")[0];
    const day = trends.find(t => t.dateStr === dStr);
    if (day) day.revenue += p.amount;
  });

  return NextResponse.json({
    metrics: { totalUsers, totalCoaches, activeBookings, gamesThisWeek, campRegistrations, workshopRegistrations, revenueMonth },
    health: { slotFillRate, confirmRate, avgReliability, cancelRate },
    tierDistribution,
    alerts: alerts.slice(0, 10),
    trends: trends.map(({ name, bookings, revenue }) => ({ name, bookings, revenue }))
  });
}
