import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db  = getDB();
  const now = new Date();

  const totalUsers    = db.users.filter(u => u.role !== "admin").length;
  const totalCoaches  = db.coaches.filter(c => c.status === "active").length;
  const activeBookings = db.bookings.filter(b => b.status !== "cancelled").length;
  const gamesThisWeek = db.games.filter(g => {
    const d = new Date(g.scheduledAt);
    const wk = new Date(now.getTime() - 7 * 86400000);
    return d >= wk && (g.status === "open" || g.status === "full");
  }).length;
  const campRegistrations = db.campRegistrations.length;
  const revenueMonth  = db.payments.filter(p => {
    const d = new Date(p.createdAt);
    return d.getMonth() === now.getMonth() && p.status === "paid";
  }).reduce((a, p) => a + p.amount, 0);

  const totalSlots  = db.games.reduce((a, g) => a + g.slots, 0);
  const filledSlots = db.games.reduce((a, g) => a + (g.slots - g.slotsLeft), 0);
  const slotFillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const confirmRate = db.bookings.length > 0
    ? Math.round((db.bookings.filter(b => b.status === "confirmed").length / db.bookings.length) * 100) : 0;
  const avgReliability = db.users.length > 0
    ? (db.users.reduce((a, u) => a + u.reliabilityScore, 0) / db.users.length).toFixed(1) : "5.0";
  const cancelRate = db.bookings.length > 0
    ? Math.round((db.bookings.filter(b => b.status === "cancelled").length / db.bookings.length) * 100) : 0;

  // Alerts
  const alerts: { type: string; message: string; severity: string }[] = [];
  db.camps.forEach(c => { if (c.participants >= c.maxParticipants && c.status !== "full") alerts.push({ type: "camp", message: `${c.title} is full but status not updated`, severity: "warning" }); });
  db.games.forEach(g => {
    const gTime = new Date(g.scheduledAt).getTime();
    const hoursUntil = (gTime - now.getTime()) / 3600000;
    if (hoursUntil > 0 && hoursUntil < 2 && g.slots - g.slotsLeft < 3) alerts.push({ type: "game", message: `${g.title} starts in ${Math.round(hoursUntil)}hr with only ${g.slots - g.slotsLeft} players`, severity: "urgent" });
  });
  db.bookings.forEach(b => {
    const hoursOld = (now.getTime() - new Date(b.createdAt).getTime()) / 3600000;
    if (b.status === "pending" && hoursOld > 48) {
      const coach = db.coaches.find(c => c.id === b.coachId);
      alerts.push({ type: "booking", message: `Pending booking for ${coach?.name ?? "coach"} is ${Math.round(hoursOld)}hrs old`, severity: "warning" });
    }
  });
  db.coaches.forEach(c => { if (c.seatsLeft === 0) alerts.push({ type: "coach", message: `${c.name} has 0 seats — may need new batches`, severity: "info" }); });

  return NextResponse.json({
    metrics: { totalUsers, totalCoaches, activeBookings, gamesThisWeek, campRegistrations, revenueMonth },
    health: { slotFillRate, confirmRate, avgReliability, cancelRate },
    alerts: alerts.slice(0, 10),
  });
}
