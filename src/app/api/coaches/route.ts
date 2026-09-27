import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COACH_PUBLIC_SELECT } from "@/lib/coachPublic";
import { okCached, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q = p.get("q")?.toLowerCase();
    const sport = p.get("sport");
    const level = p.get("skillLevel");
    const type = p.get("type");
    const available = p.get("available") === "true";

    // Only approved coaches are public. Self-service registration creates the row
    // as "pending_approval"; without this every signup was listed on /learn — with
    // the name, phone and address they typed — before anyone had reviewed them.
    const where: Prisma.CoachWhereInput = { status: "active" };
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

    // Public + CDN-cached: never the contact columns (see coachPublic.ts).
    const coaches = await prisma.coach.findMany({ where, select: COACH_PUBLIC_SELECT });
    // SEMI_STATIC: curated content, changes on admin edit. 60s fresh + 5m stale.
    return okCached(coaches, 60);
  } catch (e) { return handleErr(e); }
}
