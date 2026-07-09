import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, okCached, handleErr } from "@/lib/api";

const VALID_TYPES = new Set(["players", "organizers"]);
const VALID_PERIODS = new Set(["all", "month"]);

const LIMIT = 100;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "players").toLowerCase();
    const period = (url.searchParams.get("period") ?? "all").toLowerCase();
    if (!VALID_TYPES.has(type))   return ok({ rows: [], type, period });
    if (!VALID_PERIODS.has(period)) return ok({ rows: [], type, period });

    const where: Prisma.UserWhereInput = { deletedAt: null, role: { not: "admin" } };

    if (period === "month") {
      const since = new Date(Date.now() - MONTH_MS);
      where.OR = [
        { gamePlayers: { some: { joinedAt: { gte: since }, game: { status: { not: "cancelled" } } } } },
        { organizedGames: { some: { createdAt: { gte: since }, status: { not: "cancelled" } } } },
        { reviews: { some: { createdAt: { gte: since } } } },
        { campRegistrations: { some: { registeredAt: { gte: since } } } },
        { eventRegistrations: { some: { registeredAt: { gte: since } } } },
        { workshopRegistrations: { some: { registeredAt: { gte: since } } } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      type === "organizers"
        ? [{ gamesOrganized: "desc" }, { reputationScore: "desc" }]
        : [{ reputationScore: "desc" }, { gamesPlayed: "desc" }];

    if (type === "organizers") where.gamesOrganized = { gt: 0 };

    const rows = await prisma.user.findMany({
      where,
      orderBy,
      take: LIMIT,
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        location: true,
        tier: true,
        reputationScore: true,
        gamesPlayed: true,
        gamesOrganized: true,
        attendanceRate: true,
        reliabilityScore: true,
      },
    });

    // SEMI_STATIC: global ranking, recomputed by cron. Cache per (type, period).
    return okCached({
      type,
      period,
      generatedAt: new Date().toISOString(),
      rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
    }, 60);
  } catch (e) { return handleErr(e); }
}
