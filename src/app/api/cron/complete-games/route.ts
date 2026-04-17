import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60_000);

  // --- Games: mark completed when end time passes ---
  const openGames = await prisma.game.findMany({
    where: { status: { in: ["open", "full"] } },
    select: { id: true, scheduledAt: true, duration: true },
  });

  const gamesToComplete = openGames.filter(g => {
    const end = new Date(g.scheduledAt.getTime() + g.duration * 60_000);
    return end < now;
  });

  if (gamesToComplete.length > 0) {
    await prisma.game.updateMany({
      where: { id: { in: gamesToComplete.map(g => g.id) } },
      data: { status: "completed" },
    });
  }

  // --- Events: mark completed when endDate passes ---
  const eventsCompleted = await prisma.sportEvent.updateMany({
    where: {
      status: { notIn: ["Completed", "Archived"] },
      endDate: { lt: now },
    },
    data: { status: "Completed" },
  });

  // --- Camps: mark completed when endDate passes ---
  const campsCompleted = await prisma.camp.updateMany({
    where: {
      status: { notIn: ["completed", "archived"] },
      endDate: { lt: now },
    },
    data: { status: "completed" },
  });

  // --- Archive: games completed > 24h ago ---
  const completedGames = await prisma.game.findMany({
    where: { status: "completed" },
    select: { id: true, scheduledAt: true, duration: true },
  });

  const gamesToArchive = completedGames.filter(g => {
    const end = new Date(g.scheduledAt.getTime() + g.duration * 60_000);
    return end < oneDayAgo;
  });

  if (gamesToArchive.length > 0) {
    await prisma.game.updateMany({
      where: { id: { in: gamesToArchive.map(g => g.id) } },
      data: { status: "archived" },
    });
  }

  // --- Archive: events completed > 24h ago ---
  const eventsArchived = await prisma.sportEvent.updateMany({
    where: {
      status: "Completed",
      endDate: { lt: oneDayAgo },
    },
    data: { status: "Archived" },
  });

  // --- Archive: camps completed > 24h ago ---
  const campsArchived = await prisma.camp.updateMany({
    where: {
      status: "completed",
      endDate: { lt: oneDayAgo },
    },
    data: { status: "archived" },
  });

  return ok({
    checkedAt: now.toISOString(),
    gamesCompleted: gamesToComplete.length,
    gamesArchived: gamesToArchive.length,
    eventsCompleted: eventsCompleted.count,
    eventsArchived: eventsArchived.count,
    campsCompleted: campsCompleted.count,
    campsArchived: campsArchived.count,
  });
}
