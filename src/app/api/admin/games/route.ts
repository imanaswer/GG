import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { getDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDB();
  const games = db.games.map(g => {
    const organizer = db.users.find(u => u.id === g.organizerId);
    const players   = db.gamePlayers.filter(gp => gp.gameId === g.id).map(gp => {
      const u = db.users.find(u => u.id === gp.userId);
      return { userId: gp.userId, name: u?.name ?? "?", joinedAt: gp.joinedAt, reliabilityScore: u?.reliabilityScore ?? 0 };
    });
    const waitlist = db.waitlist.filter(w => w.gameId === g.id).length;
    return { ...g, organizerName: organizer?.name, organizerReliability: organizer?.reliabilityScore, players, waitlistCount: waitlist };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ games, stats: { total: games.length, open: games.filter(g => g.status === "open").length, full: games.filter(g => g.status === "full").length, waitlisted: games.reduce((a, g) => a + g.waitlistCount, 0) } });
}
