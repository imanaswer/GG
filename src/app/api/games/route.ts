import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr, CreateGameSchema } from "@/lib/api";

const SPORT_IMAGES: Record<string, string> = {
  Basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
  Football: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",
  Cricket: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",
  Badminton: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80",
  Tennis: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
  Volleyball: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80",
  Fitness: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q = p.get("q")?.toLowerCase();
    const sport = p.get("sport");
    const level = p.get("skillLevel");
    const cost = p.get("cost");
    const status = p.get("status") || "open";

    const where: Prisma.GameWhereInput = {};
    if (status === "open")      where.status = { notIn: ["cancelled", "completed"] };
    else if (status !== "all")  where.status = status;
    if (sport && sport !== "all") where.sport = sport;
    if (level && level !== "all") where.OR = [{ skillLevel: level }, { skillLevel: "All Levels" }];
    if (cost === "free") where.costAmount = 0;
    if (cost === "paid") where.costAmount = { gt: 0 };

    let games = await prisma.game.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        organizer: { select: { name: true, reliabilityScore: true, gamesOrganized: true } },
        _count:    { select: { players: true } },
      },
    });

    if (q) games = games.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.sport.toLowerCase().includes(q) ||
      g.location.toLowerCase().includes(q)
    );

    const enriched = games.map(g => ({
      ...g,
      organizerName: g.organizer?.name,
      organizerRating: g.organizer?.reliabilityScore,
      organizerGames: g.organizer?.gamesOrganized,
      playerCount: g._count.players,
    }));

    return ok(enriched);
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json();
    const input = CreateGameSchema.parse(body);

    const [game] = await prisma.$transaction([
      prisma.game.create({
        data: {
          sport: input.sport, title: input.title,
          location: input.location, address: input.address ?? input.location,
          scheduledAt: new Date(input.scheduledAt),
          duration: input.duration,
          slots: input.slots, slotsLeft: input.slots,
          skillLevel: input.skillLevel, organizerId: session.id,
          cost: input.cost, costAmount: input.costAmount,
          description: input.description ?? "",
          rules: input.rules ?? [],
          imageUrl: SPORT_IMAGES[input.sport] ?? SPORT_IMAGES["Basketball"],
          status: "open",
        },
      }),
      prisma.user.update({ where: { id: session.id }, data: { gamesOrganized: { increment: 1 } } }),
    ]);

    return ok(game, 201);
  } catch (e) { return handleErr(e); }
}
