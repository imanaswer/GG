import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDB();

  const feed: { icon: string; actor: string; action: string; when: string; ts: string }[] = [];

  db.bookings.forEach(b => {
    const u = db.users.find(u => u.id === b.userId);
    const c = db.coaches.find(c => c.id === b.coachId);
    feed.push({ icon: "🎓", actor: u?.name ?? "Player", action: `Booked ${c?.name ?? "coach"} (${b.status})`, when: b.createdAt, ts: b.createdAt });
  });
  db.gamePlayers.forEach(gp => {
    const u = db.users.find(u => u.id === gp.userId);
    const g = db.games.find(g => g.id === gp.gameId);
    feed.push({ icon: "🏃", actor: u?.name ?? "Player", action: `Joined ${g?.title ?? "game"}`, when: gp.joinedAt, ts: gp.joinedAt });
  });
  db.campRegistrations.forEach(r => {
    const u = db.users.find(u => u.id === r.userId);
    const c = db.camps.find(c => c.id === r.campId);
    feed.push({ icon: "☀️", actor: u?.name ?? "Player", action: `Registered ${r.childName} for ${c?.title ?? "camp"}`, when: r.registeredAt, ts: r.registeredAt });
  });
  db.eventRegistrations.forEach(r => {
    const u = db.users.find(u => u.id === r.userId);
    const e = db.events.find(e => e.id === r.eventId);
    feed.push({ icon: "🏆", actor: u?.name ?? "Player", action: `Registered for ${e?.title ?? "event"}${r.teamName ? ` as "${r.teamName}"` : ""}`, when: r.registeredAt, ts: r.registeredAt });
  });
  db.users.filter(u => u.role !== "admin").forEach(u => {
    feed.push({ icon: "👤", actor: u.name, action: "Joined Game Ground", when: u.createdAt, ts: u.createdAt });
  });

  feed.sort((a, b) => b.ts.localeCompare(a.ts));

  const timeAgo = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  };

  return NextResponse.json({ feed: feed.slice(0, 25).map(f => ({ ...f, when: timeAgo(f.ts) })) });
}
