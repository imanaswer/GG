import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { ok, handleErr } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams: p } = new URL(req.url);
    const q      = p.get("q")?.toLowerCase();
    const sport  = p.get("sport");
    const type   = p.get("type");
    const diff   = p.get("difficulty");
    const when   = p.get("when");
    const db     = getDB();
    const now    = new Date();

    let events = db.events.filter(e => e.status !== "Completed");

    // Auto-compute live
    events = events.map(ev => {
      if (new Date(ev.startDate) <= now && new Date(ev.endDate) >= now) return { ...ev, status: "Live" as const };
      return ev;
    });

    if (q)    events = events.filter(e => e.title.toLowerCase().includes(q) || e.sport.toLowerCase().includes(q));
    if (sport && sport !== "all") events = events.filter(e => e.sport === sport);
    if (type  && type  !== "all") events = events.filter(e => e.type  === type);
    if (diff  && diff  !== "all") events = events.filter(e => e.difficulty === diff);
    if (when  && when  !== "all") {
      const week  = new Date(now.getTime() + 7  * 86400000).toISOString();
      const month = new Date(now.getTime() + 30 * 86400000).toISOString();
      events = events.filter(e => {
        if (when === "this-week")  return e.startDate <= week;
        if (when === "this-month") return e.startDate <= month;
        if (when === "upcoming")   return new Date(e.startDate) > now;
        return true;
      });
    }

    return ok(events.sort((a, b) => {
      if (a.status === "Live" && b.status !== "Live") return -1;
      if (b.status === "Live" && a.status !== "Live") return 1;
      if (b.featured && !a.featured) return 1;
      if (a.featured && !b.featured) return -1;
      return a.startDate.localeCompare(b.startDate);
    }));
  } catch (e) { return handleErr(e); }
}
