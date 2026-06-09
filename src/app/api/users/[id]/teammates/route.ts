import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export type Teammate = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  tier: string;
  sharedGames: number;
  lastPlayedAt: string;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
    if (!user || user.deletedAt) return fail("User not found", 404);

    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const myGames = await prisma.gamePlayer.findMany({
      where: { userId: id, joinedAt: { gte: since }, game: { status: { not: "cancelled" } } },
      select: { gameId: true },
    });
    if (!myGames.length) return ok({ teammates: [] });

    const others = await prisma.gamePlayer.findMany({
      where: {
        gameId: { in: myGames.map(g => g.gameId) },
        userId: { not: id },
      },
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true, tier: true, deletedAt: true } },
      },
    });

    const grouped = new Map<string, { user: typeof others[number]["user"]; sharedGames: number; lastPlayedAt: Date }>();
    for (const gp of others) {
      if (!gp.user || gp.user.deletedAt) continue;
      const existing = grouped.get(gp.userId);
      if (!existing) {
        grouped.set(gp.userId, { user: gp.user, sharedGames: 1, lastPlayedAt: gp.joinedAt });
      } else {
        existing.sharedGames += 1;
        if (gp.joinedAt > existing.lastPlayedAt) existing.lastPlayedAt = gp.joinedAt;
      }
    }

    const teammates: Teammate[] = Array.from(grouped.values())
      .sort((a, b) => b.sharedGames - a.sharedGames || b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime())
      .slice(0, 6)
      .map(t => ({
        id: t.user!.id,
        name: t.user!.name,
        username: t.user!.username,
        avatarUrl: t.user!.avatarUrl,
        tier: t.user!.tier,
        sharedGames: t.sharedGames,
        lastPlayedAt: t.lastPlayedAt.toISOString(),
      }));

    return ok({ teammates });
  } catch (e) { return handleErr(e); }
}
