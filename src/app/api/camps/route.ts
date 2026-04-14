import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { ok, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q        = p.get("q")?.toLowerCase();
    const sport    = p.get("sport");
    const skill    = p.get("skillLevel");
    const duration = p.get("duration");
    const age      = p.get("ageGroup");
    const db       = getDB();

    let camps = db.camps.filter(c => c.status !== "completed");

    if (q)    camps = camps.filter(c => c.title.toLowerCase().includes(q) || c.sport.toLowerCase().includes(q));
    if (sport && sport !== "all") camps = camps.filter(c => c.sport === sport);
    if (skill && skill !== "all") camps = camps.filter(c => c.skillLevel === skill || c.skillLevel === "All Levels");
    if (age   && age   !== "all") camps = camps.filter(c => c.ageGroup === age);
    if (duration && duration !== "all") {
      camps = camps.filter(c => {
        const days = parseInt(c.duration);
        if (duration === "short")  return days <= 5;
        if (duration === "medium") return days > 5 && days <= 10;
        if (duration === "long")   return days > 10;
        return true;
      });
    }

    return ok(camps.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.startDate.localeCompare(b.startDate)));
  } catch (e) { return handleErr(e); }
}
