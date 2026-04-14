import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { ok, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q = p.get("q")?.toLowerCase();
    const sport = p.get("sport");
    const level = p.get("skillLevel");
    const type = p.get("type");
    const available = p.get("available") === "true";

    let coaches = getDB().coaches;
    if (q) coaches = coaches.filter(c => c.name.toLowerCase().includes(q) || c.sport.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
    if (sport && sport !== "all") coaches = coaches.filter(c => c.sport === sport);
    if (level && level !== "all") coaches = coaches.filter(c => c.skillLevel === level || c.skillLevel === "All Levels");
    if (type && type !== "all") coaches = coaches.filter(c => c.type === type);
    if (available) coaches = coaches.filter(c => c.seatsLeft > 0);

    // Strip internal fields, strip batches from list view
    return ok(coaches.map(({ batches: _b, ...c }) => c));
  } catch (e) { return handleErr(e); }
}
