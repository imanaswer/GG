import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emails } from "@/lib/email";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now     = new Date();
  const tmrwMin = new Date(now.getTime() + 20 * 3600_000);
  const tmrwMax = new Date(now.getTime() + 28 * 3600_000);

  const games = await prisma.game.findMany({
    where: { status: { in: ["open", "full"] }, scheduledAt: { gte: tmrwMin, lte: tmrwMax } },
    include: {
      organizer: { select: { name: true } },
      players:   { include: { user: { select: { email: true, name: true } } } },
    },
  });

  let sent = 0;
  for (const game of games) {
    for (const gp of game.players) {
      if (!gp.user) continue;
      await sendEmail({
        to: gp.user.email,
        ...emails.gameJoined(
          gp.user.name,
          game.title,
          game.location,
          game.scheduledAt.toLocaleString("en-IN"),
          game.organizer?.name ?? "Organiser",
        ),
      });
      sent++;
    }
  }

  return ok({ reminders: sent });
}
