import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const games = await prisma.game.findMany({
    where: { status: { in: ["open", "full"] } },
    select: { id: true, scheduledAt: true, duration: true },
  });

  const toComplete = games.filter(g => {
    const end = new Date(g.scheduledAt.getTime() + g.duration * 60_000);
    return end < now;
  });

  if (toComplete.length > 0) {
    await prisma.game.updateMany({
      where: { id: { in: toComplete.map(g => g.id) } },
      data: { status: "completed" },
    });
  }

  return ok({ completed: toComplete.length, checkedAt: now.toISOString() });
}
