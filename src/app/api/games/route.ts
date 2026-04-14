import { NextRequest } from "next/server";
import { getDB, saveDB, uid, type Game } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr, CreateGameSchema } from "@/lib/api";

const SPORT_IMAGES: Record<string, string> = {
  Basketball: "https://images.unsplash.com/photo-1546519638399-1274d96f2a0a?w=800&q=80",
  Football: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",
  Cricket: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",
  Badminton: "https://images.unsplash.com/photo-1613918431703-aa50889e3be8?w=800&q=80",
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
    const db = getDB();

    let games = db.games;
    if (status !== "all") games = games.filter(g => status === "open" ? g.status !== "cancelled" && g.status !== "completed" : g.status === status);
    if (q) games = games.filter(g => g.title.toLowerCase().includes(q) || g.sport.toLowerCase().includes(q) || g.location.toLowerCase().includes(q));
    if (sport && sport !== "all") games = games.filter(g => g.sport === sport);
    if (level && level !== "all") games = games.filter(g => g.skillLevel === level || g.skillLevel === "All Levels");
    if (cost === "free") games = games.filter(g => g.costAmount === 0);
    if (cost === "paid") games = games.filter(g => g.costAmount > 0);

    // Enrich with organizer info
    const enriched = games.map(g => {
      const org = db.users.find(u => u.id === g.organizerId);
      const playerCount = db.gamePlayers.filter(gp => gp.gameId === g.id).length;
      return { ...g, organizerName: org?.name, organizerRating: org?.reliabilityScore, organizerGames: org?.gamesOrganized, playerCount };
    }).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    return ok(enriched);
  } catch (e) { return handleErr(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const body = await req.json();
    const input = CreateGameSchema.parse(body);
    const db = getDB();

    const game: Game = {
      id: uid("g_"), sport: input.sport, title: input.title,
      location: input.location, address: input.address ?? input.location,
      scheduledAt: input.scheduledAt, duration: input.duration,
      slots: input.slots, slotsLeft: input.slots,
      skillLevel: input.skillLevel, organizerId: session.id,
      cost: input.cost, costAmount: input.costAmount,
      description: input.description ?? "",
      rules: input.rules ?? [],
      imageUrl: SPORT_IMAGES[input.sport] ?? SPORT_IMAGES["Basketball"],
      status: "open", createdAt: new Date().toISOString(),
    };

    db.games.push(game);
    const user = db.users.find(u => u.id === session.id);
    if (user) user.gamesOrganized++;
    saveDB(db);

    return ok(game, 201);
  } catch (e) { return handleErr(e); }
}
