import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const segment = p.get("segment") ?? "all";
  const now = new Date();

  const rows = await prisma.user.findMany({
    where: { role: { not: "admin" }, deletedAt: null },
    include: {
      _count: {
        select: {
          bookings: true,
          gamePlayers: true,
          campRegistrations: true,
          eventRegistrations: true,
        },
      },
    },
  });

  let users = rows.map(u => {
    const bookings = u._count.bookings;
    const games    = u._count.gamePlayers;
    const camps    = u._count.campRegistrations;
    const events   = u._count.eventRegistrations;
    const activity = bookings + games + camps + events;
    return {
      id: u.id, name: u.name, username: u.username, role: u.role, location: u.location,
      gamesPlayed: u.gamesPlayed, bookings, reliabilityScore: u.reliabilityScore,
      attendanceRate: u.attendanceRate, createdAt: u.createdAt, activity, phone: u.phone,
    };
  });

  if (segment === "active")   users = [...users].sort((a, b) => b.activity - a.activity);
  if (segment === "new")      users = users.filter(u => (now.getTime() - u.createdAt.getTime()) < 7 * 86400000);
  if (segment === "inactive") users = users.filter(u => u.activity === 0);

  return NextResponse.json({ users, total: users.length });
}
