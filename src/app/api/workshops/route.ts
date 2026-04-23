import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q        = p.get("q")?.toLowerCase();
    const sport    = p.get("sport");
    const skill    = p.get("skillLevel");
    const session  = p.get("sessionType");
    const audience = p.get("audienceType");

    const where: Prisma.WorkshopWhereInput = { status: { notIn: ["completed", "archived", "closed"] } };
    if (sport    && sport    !== "all") where.sport = sport;
    if (skill    && skill    !== "all") where.OR = [{ skillLevel: skill }, { skillLevel: "All Levels" }];
    if (session  && session  !== "all") where.sessionType = session;
    if (audience && audience !== "all") where.audienceType = audience;

    let workshops = await prisma.workshop.findMany({
      where,
      orderBy: [{ featured: "desc" }, { startDate: "asc" }],
    });

    if (q) workshops = workshops.filter(w =>
      w.title.toLowerCase().includes(q) || w.sport.toLowerCase().includes(q)
    );

    return ok(workshops);
  } catch (e) { return handleErr(e); }
}
