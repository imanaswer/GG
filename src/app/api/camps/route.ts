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
    const duration = p.get("duration");
    const age      = p.get("ageGroup");

    const where: Prisma.CampWhereInput = { status: { notIn: ["completed", "archived"] } };
    if (sport && sport !== "all") where.sport = sport;
    if (skill && skill !== "all") where.OR = [{ skillLevel: skill }, { skillLevel: "All Levels" }];
    if (age   && age   !== "all") where.ageGroup = age;

    let camps = await prisma.camp.findMany({
      where,
      orderBy: [{ featured: "desc" }, { startDate: "asc" }],
    });

    if (q) camps = camps.filter(c =>
      c.title.toLowerCase().includes(q) || c.sport.toLowerCase().includes(q)
    );

    if (duration && duration !== "all") {
      camps = camps.filter(c => {
        const days = parseInt(c.duration);
        if (duration === "short")  return days <= 5;
        if (duration === "medium") return days > 5 && days <= 10;
        if (duration === "long")   return days > 10;
        return true;
      });
    }

    return ok(camps);
  } catch (e) { return handleErr(e); }
}
