import { NextRequest } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  // Verify Vercel cron header in production
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db  = getDB();
  const now = new Date();
  let completed = 0;

  for (const game of db.games) {
    if (game.status !== "open" && game.status !== "full") continue;
    const end = new Date(new Date(game.scheduledAt).getTime() + game.duration * 60_000);
    if (end < now) { game.status = "completed"; completed++; }
  }

  if (completed > 0) saveDB(db);
  return ok({ completed, checkedAt: now.toISOString() });
}
