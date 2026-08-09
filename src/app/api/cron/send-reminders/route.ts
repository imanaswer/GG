import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emails } from "@/lib/email";
import { ok } from "@/lib/api";
import { sendPush } from "@/lib/push";
import { cronUnauthorized } from "@/lib/cron";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

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
  let pushed = 0;
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

    // One push per game rather than per player: the same reminder to everyone.
    const userIds = game.players.map(gp => gp.userId);
    pushed += await sendPush(userIds, {
      category: "reminder",
      title: `Tomorrow: ${game.title}`,
      body: `${game.location} at ${game.scheduledAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`,
      data: { url: `/game/${game.id}` },
    });
  }

  return ok({ reminders: sent, pushed });
}
