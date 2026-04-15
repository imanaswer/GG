import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.toLowerCase().trim() ?? "";
    if (!q || q.length < 2) return ok({ coaches: [], games: [], camps: [], events: [] });

    const insensitive = { contains: q, mode: "insensitive" as const };

    const [coachRows, gameRows, campRows, eventRows] = await Promise.all([
      prisma.coach.findMany({
        where: { status: "active", OR: [{ name: insensitive }, { sport: insensitive }, { location: insensitive }] },
        take: 3,
      }),
      prisma.game.findMany({
        where: { status: "open", OR: [{ title: insensitive }, { sport: insensitive }, { location: insensitive }] },
        take: 3,
      }),
      prisma.camp.findMany({
        where: { status: { not: "completed" }, OR: [{ title: insensitive }, { sport: insensitive }] },
        take: 2,
      }),
      prisma.sportEvent.findMany({
        where: { status: { not: "Completed" }, OR: [{ title: insensitive }, { sport: insensitive }] },
        take: 2,
      }),
    ]);

    return ok({
      coaches: coachRows.map(c => ({ id: c.id, type: "coach", title: c.name,  subtitle: `${c.sport} · ${c.location}`, image: c.imageUrl, href: `/coach/${c.id}` })),
      games:   gameRows.map(g  => ({ id: g.id, type: "game",  title: g.title, subtitle: `${g.sport} · ${g.location}`, image: g.imageUrl, href: `/game/${g.id}` })),
      camps:   campRows.map(c  => ({ id: c.id, type: "camp",  title: c.title, subtitle: `${c.sport} · ${c.dates}`,    image: c.imageUrl, href: `/camps/${c.id}` })),
      events:  eventRows.map(e => ({ id: e.id, type: "event", title: e.title, subtitle: `${e.sport} · ${e.date}`,     image: e.imageUrl, href: `/events/${e.id}` })),
    });
  } catch (e) { return handleErr(e); }
}
