import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { ok, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.toLowerCase().trim() ?? "";
    if (!q || q.length < 2) return ok({ coaches: [], games: [], camps: [], events: [] });

    const db = getDB();
    const match = (s: string) => s.toLowerCase().includes(q);

    const coaches = db.coaches
      .filter(c => c.status === "active" && (match(c.name) || match(c.sport) || match(c.location)))
      .slice(0, 3)
      .map(c => ({ id: c.id, type: "coach", title: c.name, subtitle: `${c.sport} · ${c.location}`, image: c.imageUrl, href: `/coach/${c.id}` }));

    const games = db.games
      .filter(g => g.status === "open" && (match(g.title) || match(g.sport) || match(g.location)))
      .slice(0, 3)
      .map(g => ({ id: g.id, type: "game", title: g.title, subtitle: `${g.sport} · ${g.location}`, image: g.imageUrl, href: `/game/${g.id}` }));

    const camps = db.camps
      .filter(c => c.status !== "completed" && (match(c.title) || match(c.sport)))
      .slice(0, 2)
      .map(c => ({ id: c.id, type: "camp", title: c.title, subtitle: `${c.sport} · ${c.dates}`, image: c.imageUrl, href: `/camps/${c.id}` }));

    const events = db.events
      .filter(e => e.status !== "Completed" && (match(e.title) || match(e.sport)))
      .slice(0, 2)
      .map(e => ({ id: e.id, type: "event", title: e.title, subtitle: `${e.sport} · ${e.date}`, image: e.imageUrl, href: `/events/${e.id}` }));

    return ok({ coaches, games, camps, events });
  } catch (e) { return handleErr(e); }
}
