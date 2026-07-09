import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { okCached, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q = p.get("q")?.toLowerCase();
    const sport = p.get("sport");
    const level = p.get("skillLevel");
    const type = p.get("type");
    const available = p.get("available") === "true";

    const where: Prisma.CoachWhereInput = {};
    if (sport && sport !== "all") where.sport = sport;
    // `type` is a comma-joined string ("Academy, Personal Trainer"), so match on
    // substring — a coach tagged with several types still matches a single-type
    // filter. Safe because no COACH_TYPE is a substring of another.
    if (type  && type  !== "all") where.type  = { contains: type, mode: "insensitive" };
    if (available) where.seatsLeft = { gt: 0 };

    // Combine independent OR-groups (level, text search) under AND so neither
    // clobbers the other. Text search runs in the DB — no more fetch-all + filter.
    const and: Prisma.CoachWhereInput[] = [];
    if (level && level !== "all") and.push({ OR: [{ skillLevel: level }, { skillLevel: "All Levels" }] });
    if (q) and.push({ OR: [
      { name:     { contains: q, mode: "insensitive" } },
      { sport:    { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ] });
    if (and.length) where.AND = and;

    const coaches = await prisma.coach.findMany({ where });
    // SEMI_STATIC: curated content, changes on admin edit. 60s fresh + 5m stale.
    return okCached(coaches, 60);
  } catch (e) { return handleErr(e); }
}
