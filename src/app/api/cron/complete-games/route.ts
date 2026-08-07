import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60_000);

  // --- Games: mark completed when end time passes ---
  // Completion is automatic and grants NO rewards — rewards are only granted
  // when an admin finalizes the game. We stamp completedAt so the 1-hour
  // visibility window can be measured precisely.
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
      data: { status: "completed", completedAt: now },
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

  // --- Workshops: mark completed when endDate passes ---
  // There was no workshop branch at all, so Workshop.status never left "open" and
  // the list endpoint's `notIn: ["completed","archived","closed"]` filter could
  // never match anything — every workshop ever created stayed on /workshops.
  const workshopsCompleted = await prisma.workshop.updateMany({
    where: {
      status: { notIn: ["completed", "archived"] },
      endDate: { lt: now },
    },
    data: { status: "completed" },
  });

  // --- Archive: games completed > 1h ago (visibility window per business rules) ---
  // Completed games stay visible for only 1 hour, then move to "archived" which
  // every public/feed query already hides. Prefer the precise completedAt stamp;
  // fall back to end time for any legacy rows completed before completedAt existed.
  const completedGames = await prisma.game.findMany({
    where: { status: "completed" },
    select: { id: true, scheduledAt: true, duration: true, completedAt: true },
  });

  const gamesToArchive = completedGames.filter(g => {
    if (g.completedAt) return g.completedAt < oneHourAgo;
    const end = new Date(g.scheduledAt.getTime() + g.duration * 60_000);
    return end < oneHourAgo;
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

  // --- Archive: workshops completed > 24h ago ---
  const workshopsArchived = await prisma.workshop.updateMany({
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
    workshopsCompleted: workshopsCompleted.count,
    workshopsArchived: workshopsArchived.count,
  });
}
