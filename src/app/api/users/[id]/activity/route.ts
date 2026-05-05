import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";
import { TIER_META, type Tier } from "@/lib/reputation";

type Ctx = { params: Promise<{ id: string }> };

export type ActivityItem = {
  id: string;
  kind: "joined" | "organized" | "tier-up" | "registration" | "review";
  icon: string;
  text: string;
  href?: string;
  ts: string;
};

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, tier: true, tierUpdatedAt: true },
    });
    if (!user || user.deletedAt) return fail("User not found", 404);

    // Streak window: at most 53 weeks back from today; that's the cap
    // computeStreakWeeks supports.
    const now = Date.now();
    const streakWindowMs = 53 * 7 * 24 * 60 * 60 * 1000;
    const streakSince = new Date(now - streakWindowMs);

    const [joinedRows, streakSlice, organizedRows, campRegs, eventRegs, workshopRegs, reviews] = await Promise.all([
      prisma.gamePlayer.findMany({
        where: { userId: id },
        include: { game: { select: { id: true, title: true, sport: true, scheduledAt: true } } },
        orderBy: { joinedAt: "desc" },
        take: 10,
      }),
      prisma.gamePlayer.findMany({
        where: { userId: id, joinedAt: { gte: streakSince } },
        select: { joinedAt: true },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.game.findMany({
        where: { organizerId: id },
        select: { id: true, title: true, sport: true, createdAt: true, slots: true, slotsLeft: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.campRegistration.findMany({
        where: { userId: id },
        include: { camp: { select: { id: true, title: true } } },
        orderBy: { registeredAt: "desc" },
        take: 5,
      }),
      prisma.eventRegistration.findMany({
        where: { userId: id },
        include: { event: { select: { id: true, title: true } } },
        orderBy: { registeredAt: "desc" },
        take: 5,
      }),
      prisma.workshopRegistration.findMany({
        where: { userId: id },
        include: { workshop: { select: { id: true, title: true } } },
        orderBy: { registeredAt: "desc" },
        take: 5,
      }),
      prisma.review.findMany({
        where: { userId: id },
        include: { coach: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const items: ActivityItem[] = [];

    for (const gp of joinedRows) {
      if (!gp.game) continue;
      const attended = gp.attended;
      const suffix = attended === true ? " · attended ✓" : attended === false ? " · missed" : "";
      items.push({
        id: `gp_${gp.id}`,
        kind: "joined",
        icon: "🏃",
        text: `Joined ${gp.game.title}${suffix}`,
        href: `/game/${gp.game.id}`,
        ts: gp.joinedAt.toISOString(),
      });
    }

    for (const g of organizedRows) {
      const filled = g.slots - g.slotsLeft;
      items.push({
        id: `org_${g.id}`,
        kind: "organized",
        icon: "🎯",
        text: `Organized ${g.title} — ${filled}/${g.slots} joined`,
        href: `/game/${g.id}`,
        ts: g.createdAt.toISOString(),
      });
    }

    for (const r of campRegs) {
      items.push({
        id: `camp_${r.id}`,
        kind: "registration",
        icon: "☀️",
        text: `Registered for ${r.camp?.title ?? "camp"}`,
        href: r.camp ? `/camps/${r.camp.id}` : undefined,
        ts: r.registeredAt.toISOString(),
      });
    }

    for (const r of eventRegs) {
      items.push({
        id: `event_${r.id}`,
        kind: "registration",
        icon: "🏆",
        text: `Registered for ${r.event?.title ?? "event"}`,
        href: r.event ? `/events/${r.event.id}` : undefined,
        ts: r.registeredAt.toISOString(),
      });
    }

    for (const r of workshopRegs) {
      items.push({
        id: `wsp_${r.id}`,
        kind: "registration",
        icon: "💡",
        text: `Signed up for ${r.workshop?.title ?? "workshop"}`,
        href: r.workshop ? `/workshops/${r.workshop.id}` : undefined,
        ts: r.registeredAt.toISOString(),
      });
    }

    for (const r of reviews) {
      items.push({
        id: `rev_${r.id}`,
        kind: "review",
        icon: "⭐",
        text: `Reviewed ${r.coach?.name ?? "coach"} (${r.rating}★)`,
        href: r.coach ? `/coach/${r.coach.id}` : undefined,
        ts: r.createdAt.toISOString(),
      });
    }

    if (user.tierUpdatedAt && user.tier !== "bronze") {
      const ts = new Date(user.tierUpdatedAt);
      if (Date.now() - ts.getTime() < 30 * 24 * 60 * 60 * 1000) {
        const meta = TIER_META[user.tier as Tier];
        items.push({
          id: `tier_${ts.getTime()}`,
          kind: "tier-up",
          icon: meta?.icon ?? "🏆",
          text: `Reached ${meta?.label ?? user.tier} tier`,
          href: "/leaderboard",
          ts: ts.toISOString(),
        });
      }
    }

    items.sort((a, b) => b.ts.localeCompare(a.ts));

    // Heatmap: per-day counts for the last 84 days. Reuses streakSlice
    // (which covers 53 weeks) so we avoid a second query.
    const heatmapStartMs = now - 84 * 24 * 60 * 60 * 1000;
    const dayCounts: Record<string, number> = {};
    for (const gp of streakSlice) {
      const t = gp.joinedAt.getTime();
      if (t < heatmapStartMs) continue;
      const key = gp.joinedAt.toISOString().slice(0, 10);
      dayCounts[key] = (dayCounts[key] ?? 0) + 1;
    }

    // Streak: consecutive ISO weeks ending with the current week, ≥1 game per week.
    const streakWeeks = computeStreakWeeks(streakSlice.map(s => s.joinedAt));

    // Most active weekday for the heatmap caption.
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
    for (const [day, count] of Object.entries(dayCounts)) {
      const d = new Date(day);
      weekdayTotals[d.getDay()] += count;
    }
    let mostActiveDay: string | null = null;
    let mostActiveCount = 0;
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      if (weekdayTotals[i] > mostActiveCount) {
        mostActiveCount = weekdayTotals[i];
        mostActiveDay = labels[i];
      }
    }

    const heatmapTotal = Object.values(dayCounts).reduce((a, b) => a + b, 0);

    return ok({
      items: items.slice(0, 5),
      streakWeeks,
      heatmap: {
        dayCounts,
        total: heatmapTotal,
        mostActiveDay,
        windowDays: 84,
      },
    });
  } catch (e) { return handleErr(e); }
}

function startOfIsoWeek(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay() || 7;       // Mon=1..Sun=7
  x.setDate(x.getDate() - (day - 1));
  return x.getTime();
}

function computeStreakWeeks(joinDates: Date[]): number {
  if (!joinDates.length) return 0;
  const weeksWithGame = new Set<number>();
  for (const d of joinDates) weeksWithGame.add(startOfIsoWeek(d));

  let cursor = startOfIsoWeek(new Date());
  let streak = 0;
  for (let i = 0; i < 53; i++) {
    if (!weeksWithGame.has(cursor)) break;
    streak += 1;
    cursor -= 7 * 24 * 60 * 60 * 1000;
  }
  return streak;
}
