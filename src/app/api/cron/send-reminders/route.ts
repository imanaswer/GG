import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { sendEmail, emails } from "@/lib/email";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db      = getDB();
  const now     = new Date();
  const tmrwMin = new Date(now.getTime() + 20 * 3600_000);
  const tmrwMax = new Date(now.getTime() + 28 * 3600_000);
  let sent = 0;

  for (const game of db.games.filter(g => g.status === "open" || g.status === "full")) {
    const gameTime = new Date(game.scheduledAt);
    if (gameTime >= tmrwMin && gameTime <= tmrwMax) {
      const players = db.gamePlayers.filter(gp => gp.gameId === game.id);
      const organiser = db.users.find(u => u.id === game.organizerId);
      for (const gp of players) {
        const user = db.users.find(u => u.id === gp.userId);
        if (user) {
          await sendEmail({
            to: user.email,
            ...emails.gameJoined(user.name, game.title, game.location, new Date(game.scheduledAt).toLocaleString("en-IN"), organiser?.name ?? "Organiser"),
          });
          sent++;
        }
      }
    }
  }
  return ok({ reminders: sent });
}
