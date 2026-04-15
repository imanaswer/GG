import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.game.findMany({
    include: {
      organizer: { select: { name: true, reliabilityScore: true } },
      players:   { include: { user: { select: { name: true, reliabilityScore: true } } } },
      waitlist:  { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const games = rows.map(g => ({
    ...g,
    organizerName: g.organizer?.name,
    organizerReliability: g.organizer?.reliabilityScore,
    players: g.players.map(p => ({ userId: p.userId, name: p.user?.name ?? "?", joinedAt: p.joinedAt, reliabilityScore: p.user?.reliabilityScore ?? 0 })),
    waitlistCount: g.waitlist.length,
  }));
  return NextResponse.json({
    games,
    stats: {
      total: games.length,
      open: games.filter(g => g.status === "open").length,
      full: games.filter(g => g.status === "full").length,
      waitlisted: games.reduce((a, g) => a + g.waitlistCount, 0),
    },
  });
}
