import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, handleErr } from "@/lib/api";

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
    if (type  && type  !== "all") where.type  = type;
    if (level && level !== "all") where.OR = [{ skillLevel: level }, { skillLevel: "All Levels" }];
    if (available) where.seatsLeft = { gt: 0 };

    let coaches = await prisma.coach.findMany({ where });
    if (q) coaches = coaches.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.sport.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
    );
    return ok(coaches);
  } catch (e) { return handleErr(e); }
}
