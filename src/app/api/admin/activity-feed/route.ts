import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [bookings, gamePlayers, campRegs, eventRegs, users] = await Promise.all([
    prisma.booking.findMany({ include: { user: { select: { name: true } }, coach: { select: { name: true } } } }),
    prisma.gamePlayer.findMany({ include: { user: { select: { name: true } }, game: { select: { title: true } } } }),
    prisma.campRegistration.findMany({ include: { user: { select: { name: true } }, camp: { select: { title: true } } } }),
    prisma.eventRegistration.findMany({ include: { user: { select: { name: true } }, event: { select: { title: true } } } }),
    prisma.user.findMany({ where: { role: { not: "admin" } }, select: { name: true, createdAt: true } }),
  ]);

  const feed: { icon: string; actor: string; action: string; ts: Date }[] = [];
  bookings.forEach(b => feed.push({ icon: "🎓", actor: b.user?.name ?? "Player", action: `Booked ${b.coach?.name ?? "coach"} (${b.status})`, ts: b.createdAt }));
  gamePlayers.forEach(gp => feed.push({ icon: "🏃", actor: gp.user?.name ?? "Player", action: `Joined ${gp.game?.title ?? "game"}`, ts: gp.joinedAt }));
  campRegs.forEach(r => feed.push({ icon: "☀️", actor: r.user?.name ?? "Player", action: `Registered ${r.childName} for ${r.camp?.title ?? "camp"}`, ts: r.registeredAt }));
  eventRegs.forEach(r => feed.push({ icon: "🏆", actor: r.user?.name ?? "Player", action: `Registered for ${r.event?.title ?? "event"}${r.teamName ? ` as "${r.teamName}"` : ""}`, ts: r.registeredAt }));
  users.forEach(u => feed.push({ icon: "👤", actor: u.name, action: "Joined Game Ground", ts: u.createdAt }));

  feed.sort((a, b) => b.ts.getTime() - a.ts.getTime());

  const timeAgo = (d: Date) => {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  };

  return NextResponse.json({ feed: feed.slice(0, 25).map(f => ({ icon: f.icon, actor: f.actor, action: f.action, when: timeAgo(f.ts), ts: f.ts.toISOString() })) });
}
