import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [users, coaches, games, camps] = await Promise.all([
      // Search users by name, email, or phone
      prisma.user.findMany({
        where: {
          role: { not: "admin" },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, email: true, phone: true }
      }),
      // Search coaches by name or sport
      prisma.coach.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sport: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, status: true }
      }),
      // Search games by title or location
      prisma.game.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, scheduledAt: true, location: true }
      }),
      // Search camps
      prisma.camp.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, startDate: true }
      })
    ]);

    const results = [
      ...users.map(u => ({
        type: "user",
        id: u.id,
        title: u.name || "Unknown User",
        subtitle: `${u.email || ''} ${u.phone ? `· ${u.phone}` : ''}`,
        url: `/admin/users?highlight=${u.id}`
      })),
      ...coaches.map(c => ({
        type: "coach",
        id: c.id,
        title: c.name,
        subtitle: `Status: ${c.status}`,
        url: `/admin/coaches?highlight=${c.id}`
      })),
      ...games.map(g => ({
        type: "game",
        id: g.id,
        title: g.title,
        subtitle: `${new Date(g.scheduledAt).toLocaleDateString()} · ${g.location}`,
        url: `/admin/games?highlight=${g.id}`
      })),
      ...camps.map(c => ({
        type: "camp",
        id: c.id,
        title: c.title,
        subtitle: `Starts: ${new Date(c.startDate).toLocaleDateString()}`,
        url: `/admin/camps?highlight=${c.id}`
      }))
    ];

    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (error) {
    console.error("Admin search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
