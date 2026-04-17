import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q      = p.get("q")?.toLowerCase();
    const sport  = p.get("sport");
    const type   = p.get("type");
    const diff   = p.get("difficulty");
    const when   = p.get("when");
    const now    = new Date();

    const where: Prisma.SportEventWhereInput = { status: { notIn: ["Completed", "Archived"] } };
    if (sport && sport !== "all") where.sport = sport;
    if (type  && type  !== "all") where.type  = type;
    if (diff  && diff  !== "all") where.difficulty = diff;
    if (when  && when  !== "all") {
      const week  = new Date(now.getTime() + 7  * 86400000);
      const month = new Date(now.getTime() + 30 * 86400000);
      if (when === "this-week")  where.startDate = { lte: week };
      if (when === "this-month") where.startDate = { lte: month };
      if (when === "upcoming")   where.startDate = { gt: now };
    }

    let events = await prisma.sportEvent.findMany({ where });

    events = events.map(ev => {
      if (ev.startDate <= now && ev.endDate >= now) return { ...ev, status: "Live" };
      return ev;
    });

    if (q) events = events.filter(e => e.title.toLowerCase().includes(q) || e.sport.toLowerCase().includes(q));

    events.sort((a, b) => {
      if (a.status === "Live" && b.status !== "Live") return -1;
      if (b.status === "Live" && a.status !== "Live") return 1;
      if (b.featured && !a.featured) return 1;
      if (a.featured && !b.featured) return -1;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    return ok(events);
  } catch (e) { return handleErr(e); }
}
