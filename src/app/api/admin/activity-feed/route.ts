import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

// Rows returned to the client, and the per-source read cap.
const FEED_SIZE = 25;

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only the newest FEED_SIZE of each source can survive the merge below, so there
  // is no reason to read more. This used to be six unbounded findMany calls whose
  // entire result set was loaded, sorted in JS, and then sliced to 25 — cost grew
  // with the size of the business for a fixed-size feed.
  const take = FEED_SIZE;
  const [bookings, gamePlayers, campRegs, eventRegs, workshopRegs, users] = await Promise.all([
    prisma.booking.findMany({ take, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } }, coach: { select: { name: true } } } }),
    prisma.gamePlayer.findMany({ take, orderBy: { joinedAt: "desc" }, where: { game: { status: { not: "cancelled" } } }, include: { user: { select: { name: true } }, game: { select: { title: true } } } }),
    prisma.campRegistration.findMany({ take, orderBy: { registeredAt: "desc" }, include: { user: { select: { name: true } }, camp: { select: { title: true } } } }),
    prisma.eventRegistration.findMany({ take, orderBy: { registeredAt: "desc" }, include: { user: { select: { name: true } }, event: { select: { title: true } } } }),
    prisma.workshopRegistration.findMany({ take, orderBy: { registeredAt: "desc" }, include: { user: { select: { name: true } }, workshop: { select: { title: true } } } }),
    prisma.user.findMany({ take, orderBy: { createdAt: "desc" }, where: { role: { not: "admin" }, deletedAt: null }, select: { name: true, createdAt: true } }),
  ]);

  const feed: { icon: string; actor: string; action: string; ts: Date }[] = [];
  bookings.forEach(b => feed.push({ icon: "🎓", actor: b.user?.name ?? "Player", action: `Booked ${b.coach?.name ?? "coach"} (${b.status})`, ts: b.createdAt }));
  gamePlayers.forEach(gp => feed.push({ icon: "🏃", actor: gp.user?.name ?? "Player", action: `Joined ${gp.game?.title ?? "game"}`, ts: gp.joinedAt }));
  campRegs.forEach(r => feed.push({ icon: "☀️", actor: r.user?.name ?? "Player", action: `Registered ${r.childName} for ${r.camp?.title ?? "camp"}`, ts: r.registeredAt }));
  eventRegs.forEach(r => feed.push({ icon: "🏆", actor: r.user?.name ?? "Player", action: `Registered for ${r.event?.title ?? "event"}${r.teamName ? ` as "${r.teamName}"` : ""}`, ts: r.registeredAt }));
  workshopRegs.forEach(r => feed.push({ icon: "💡", actor: r.user?.name ?? "Player", action: `Signed up for ${r.workshop?.title ?? "workshop"}`, ts: r.registeredAt }));
  users.forEach(u => feed.push({ icon: "👤", actor: u.name, action: "Joined Game Ground", ts: u.createdAt }));

  feed.sort((a, b) => b.ts.getTime() - a.ts.getTime());

  const timeAgo = (d: Date) => {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  };

  return NextResponse.json({ feed: feed.slice(0, FEED_SIZE).map(f => ({ icon: f.icon, actor: f.actor, action: f.action, when: timeAgo(f.ts), ts: f.ts.toISOString() })) });
}
