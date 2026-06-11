# GameGround Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard-style `/profile/[id]` with a progression-driven player-journey profile (dominant REP RankProgress, player hero card, unified upcoming, categorized achievements, dynamic motivation, seasonal strip, profile completion, grouped Games/Bookings tabs), with private data gated to the profile owner.

**Architecture:** Pure, unit-tested libs (`season`, `achievements`, `profileCompletion`, `profileGrouping`, `motivation`) hold all logic and are shared client/server. The profile API (`GET /api/users/[id]`) is extended to return games/registrations/upcoming/season/completion with owner gating. The page becomes a thin composition of focused presentational components in `src/components/profile/`. Achievements are computed on the client via the shared lib (it needs the streak from the activity endpoint, which the page already loads) so there is one definition and no duplicated streak logic.

**Tech Stack:** Next.js (App Router — read `node_modules/next/dist/docs/` before route/page work), Prisma + PostgreSQL, React Query, Framer Motion (already a dep), vitest, lucide-react, inline-style components.

**Spec:** `docs/superpowers/specs/2026-06-11-profile-redesign-design.md`

---

## Conventions

- Test runner: `npm test` (vitest); per-file: `npx vitest run <file>`. Follow `src/lib/bookingStatus.test.ts` style.
- Pure logic is TDD'd. Components/page/API verify via `npx tsc --noEmit` + `npm run build` (authed routes can 500 locally on the Upstash placeholder — build/typecheck is the bar; manual UI check noted at the end).
- Commit after every task. Work on the current branch.
- This Next.js is modified — read the relevant `node_modules/next/dist/docs/` guide before editing routes/pages. Dynamic page params: `const { id } = use(params)` with `params: Promise<{id:string}>` (see `src/app/coach/[id]/page.tsx`).

## Data realities the implementer must respect

- Tiers are flat: `bronze < silver < gold < elite < pro` (`src/lib/reputation.ts`, `TIERS`, `tierLevelInfo`). No sub-divisions.
- Streak is **weekly** (`streakWeeks` from `GET /api/users/[id]/activity`).
- **Coach bookings have no stored session datetime** — only `batch` (day/time strings) or 1:1. They cannot be date-sorted. The Upcoming card therefore selects the nearest **dated** item (game/workshop/camp/event); an approved coach booking is the fallback only when no dated items exist.

## File structure

```
src/lib/season.ts                     CREATE  monthly season window + season-REP weights
src/lib/season.test.ts                CREATE
src/lib/achievements.ts               CREATE  categorized catalog + computeAchievements
src/lib/achievements.test.ts          CREATE
src/lib/profileCompletion.ts          CREATE  computeProfileCompletion
src/lib/profileCompletion.test.ts     CREATE
src/lib/profileGrouping.ts            CREATE  group status + bucketing + selectUpcoming
src/lib/profileGrouping.test.ts       CREATE
src/lib/motivation.ts                 CREATE  motivationFor (dynamic prompt)
src/lib/motivation.test.ts            CREATE
src/app/api/users/[id]/route.ts       MODIFY  games[]/upcoming/registrations/completion/owner-gate
                                              + season block
src/hooks/useData.ts                  MODIFY  extend UserProfile + new types
src/components/profile/PlayerHeroCard.tsx        CREATE
src/components/profile/RankProgress.tsx          CREATE
src/components/profile/StatStrip.tsx             CREATE
src/components/profile/SeasonStrip.tsx           CREATE
src/components/profile/UpcomingCard.tsx          CREATE
src/components/profile/ProfileCompletionCard.tsx CREATE
src/components/profile/ActivityTimeline.tsx      CREATE
src/components/profile/AchievementsRail.tsx      CREATE
src/components/profile/MotivationCard.tsx        CREATE
src/components/profile/GamesTab.tsx              CREATE
src/components/profile/BookingsTab.tsx           CREATE
src/components/profile/ProfileTabs.tsx           CREATE
src/app/profile/[id]/page.tsx         REWRITE thin composition (own vs other)
src/components/profile/TeammatesRow.tsx          DELETE
src/components/profile/StatsAccordion.tsx        DELETE
src/components/profile/LookingForBanner.tsx      DELETE
src/components/profile/ProfileCTAs.tsx           DELETE
src/components/profile/RecentActivity.tsx        DELETE
```

---

# PHASE 1 — Pure libs (TDD)

## Task 1: season.ts

**Files:** Create `src/lib/season.ts`, `src/lib/season.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/season.test.ts
import { describe, it, expect } from "vitest";
import { currentSeason, seasonRep, SEASON_WEIGHTS } from "./season";

describe("currentSeason", () => {
  it("returns the monthly window with id, label, and bounds", () => {
    const s = currentSeason(new Date("2026-06-11T12:00:00.000Z"));
    expect(s.id).toBe("2026-06");
    expect(s.label).toBe("June 2026");
    expect(s.startsAt.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(s.endsAt.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });
  it("computes daysLeft inclusive of today", () => {
    const s = currentSeason(new Date("2026-06-29T12:00:00.000Z"));
    expect(s.daysLeft).toBe(2); // 29th and 30th
  });
});

describe("seasonRep", () => {
  it("weights in-window activity like the base reputation formula", () => {
    expect(seasonRep({ games: 2, organized: 1, camps: 0, events: 1, workshops: 0, reviews: 3 }))
      .toBe(2 * 10 + 1 * 25 + 1 * 20 + 3 * 5); // 80
    expect(seasonRep({ games: 0, organized: 0, camps: 0, events: 0, workshops: 0, reviews: 0 })).toBe(0);
  });
  it("exposes the weight table", () => {
    expect(SEASON_WEIGHTS).toEqual({ game: 10, organized: 25, camp: 30, event: 20, workshop: 15, review: 5 });
  });
});
```

- [ ] **Step 2: Run → FAIL** `npx vitest run src/lib/season.test.ts` (module not found)

- [ ] **Step 3: Implement**

```ts
// src/lib/season.ts
export interface Season { id: string; label: string; startsAt: Date; endsAt: Date; daysLeft: number; }

/** Per-action season-REP weights — same as the base reputation formula's base terms. */
export const SEASON_WEIGHTS = { game: 10, organized: 25, camp: 30, event: 20, workshop: 15, review: 5 } as const;

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** The season is the calendar month containing `now` (UTC). */
export function currentSeason(now: Date): Season {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  const startsAt = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const endsAt = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)); // day 0 of next month = last day
  const id = `${y}-${String(m + 1).padStart(2, "0")}`;
  const label = `${MONTHS[m]} ${y}`;
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft = Math.max(0, Math.round((endsAt.getTime() - startOfToday) / msPerDay));
  return { id, label, startsAt, endsAt, daysLeft };
}

export interface SeasonCounts { games: number; organized: number; camps: number; events: number; workshops: number; reviews: number; }

export function seasonRep(c: SeasonCounts): number {
  return (
    c.games * SEASON_WEIGHTS.game +
    c.organized * SEASON_WEIGHTS.organized +
    c.camps * SEASON_WEIGHTS.camp +
    c.events * SEASON_WEIGHTS.event +
    c.workshops * SEASON_WEIGHTS.workshop +
    c.reviews * SEASON_WEIGHTS.review
  );
}
```

- [ ] **Step 4: Run → PASS** `npx vitest run src/lib/season.test.ts`
- [ ] **Step 5: Commit** `git add src/lib/season.ts src/lib/season.test.ts && git commit -m "feat: season window + season-REP helpers"`

---

## Task 2: achievements.ts

**Files:** Create `src/lib/achievements.ts`, `src/lib/achievements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/achievements.test.ts
import { describe, it, expect } from "vitest";
import { computeAchievements, ACHIEVEMENT_CATEGORIES } from "./achievements";

const base = { gamesPlayed: 0, gamesOrganized: 0, attendanceRate: 100, streakWeeks: 0, tier: "bronze" };

describe("computeAchievements", () => {
  it("unlocks first-match at 1 game and reports progress when locked", () => {
    const a = computeAchievements({ ...base, gamesPlayed: 0 });
    const first = a.find(x => x.id === "first-match")!;
    expect(first.unlocked).toBe(false);
    expect(first.progress).toEqual({ current: 0, target: 1 });

    const a2 = computeAchievements({ ...base, gamesPlayed: 1 });
    expect(a2.find(x => x.id === "first-match")!.unlocked).toBe(true);
  });
  it("locks regular until 10 games with progress", () => {
    const r = computeAchievements({ ...base, gamesPlayed: 4 }).find(x => x.id === "regular")!;
    expect(r.unlocked).toBe(false);
    expect(r.progress).toEqual({ current: 4, target: 10 });
  });
  it("unlocks streak and reliable on consistency", () => {
    const a = computeAchievements({ ...base, streakWeeks: 4, attendanceRate: 96 });
    expect(a.find(x => x.id === "streak-4")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "reliable")!.unlocked).toBe(true);
  });
  it("unlocks tier achievements up to current tier", () => {
    const a = computeAchievements({ ...base, tier: "gold" });
    expect(a.find(x => x.id === "tier-bronze")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "tier-silver")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "tier-gold")!.unlocked).toBe(true);
    expect(a.find(x => x.id === "tier-elite")!.unlocked).toBe(false);
  });
  it("assigns every achievement to a known category", () => {
    for (const x of computeAchievements(base)) {
      expect(ACHIEVEMENT_CATEGORIES).toContain(x.category);
    }
  });
});
```

- [ ] **Step 2: Run → FAIL** `npx vitest run src/lib/achievements.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/achievements.ts
import { TIERS, type Tier } from "@/lib/reputation";

export const ACHIEVEMENT_CATEGORIES = ["sports", "consistency", "community", "competition"] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface AchievementStats {
  gamesPlayed: number;
  gamesOrganized: number;
  attendanceRate: number;
  streakWeeks: number;
  tier: string;
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
  season?: string; // reserved for future seasonal achievements
}

type Def = {
  id: string; category: AchievementCategory; icon: string; title: string; description: string;
  /** returns [current, target] for threshold achievements, or boolean for derived ones */
  eval: (s: AchievementStats) => { current: number; target: number };
};

const tierIndex = (t: string) => Math.max(0, TIERS.indexOf(t as Tier));

const DEFS: Def[] = [
  // Sports
  { id: "first-match", category: "sports", icon: "🏅", title: "First Match", description: "Play your first pickup game",
    eval: s => ({ current: s.gamesPlayed, target: 1 }) },
  { id: "regular", category: "sports", icon: "⚽", title: "Regular", description: "Join 10 games",
    eval: s => ({ current: s.gamesPlayed, target: 10 }) },
  { id: "veteran", category: "sports", icon: "🎽", title: "Veteran", description: "Join 50 games",
    eval: s => ({ current: s.gamesPlayed, target: 50 }) },
  { id: "organiser", category: "sports", icon: "🎯", title: "Organiser", description: "Organise your first game",
    eval: s => ({ current: s.gamesOrganized, target: 1 }) },
  // Consistency
  { id: "streak-4", category: "consistency", icon: "🔥", title: "4-Week Streak", description: "Play in 4 consecutive weeks",
    eval: s => ({ current: s.streakWeeks, target: 4 }) },
  { id: "streak-12", category: "consistency", icon: "🔥", title: "12-Week Streak", description: "Play in 12 consecutive weeks",
    eval: s => ({ current: s.streakWeeks, target: 12 }) },
  { id: "reliable", category: "consistency", icon: "💯", title: "Reliable", description: "Keep a 95%+ attendance rate",
    eval: s => ({ current: Math.round(s.attendanceRate), target: 95 }) },
  // Community
  { id: "team-player", category: "community", icon: "🤝", title: "Team Player", description: "Join 5 games with others",
    eval: s => ({ current: s.gamesPlayed, target: 5 }) },
  { id: "connector", category: "community", icon: "📣", title: "Connector", description: "Organise 3 games",
    eval: s => ({ current: s.gamesOrganized, target: 3 }) },
  // Competition (tier ladder)
  { id: "tier-bronze", category: "competition", icon: "🥉", title: "Bronze Tier", description: "Reach Bronze",
    eval: s => ({ current: tierIndex(s.tier) >= 0 ? 1 : 0, target: 1 }) },
  { id: "tier-silver", category: "competition", icon: "🥈", title: "Silver Tier", description: "Reach Silver",
    eval: s => ({ current: tierIndex(s.tier) >= 1 ? 1 : 0, target: 1 }) },
  { id: "tier-gold", category: "competition", icon: "🥇", title: "Gold Tier", description: "Reach Gold",
    eval: s => ({ current: tierIndex(s.tier) >= 2 ? 1 : 0, target: 1 }) },
  { id: "tier-elite", category: "competition", icon: "💎", title: "Elite Tier", description: "Reach Elite",
    eval: s => ({ current: tierIndex(s.tier) >= 3 ? 1 : 0, target: 1 }) },
  { id: "tier-pro", category: "competition", icon: "👑", title: "Pro Tier", description: "Reach Pro",
    eval: s => ({ current: tierIndex(s.tier) >= 4 ? 1 : 0, target: 1 }) },
];

export function computeAchievements(stats: AchievementStats): Achievement[] {
  return DEFS.map(d => {
    const { current, target } = d.eval(stats);
    const unlocked = current >= target;
    return {
      id: d.id, category: d.category, icon: d.icon, title: d.title, description: d.description,
      unlocked,
      progress: unlocked ? undefined : { current: Math.min(current, target), target },
    };
  });
}
```

- [ ] **Step 4: Run → PASS** `npx vitest run src/lib/achievements.test.ts`; also `npx tsc --noEmit` (exit 0)
- [ ] **Step 5: Commit** `git add src/lib/achievements.ts src/lib/achievements.test.ts && git commit -m "feat: categorized achievements catalog + compute"`

---

## Task 3: profileCompletion.ts

**Files:** Create `src/lib/profileCompletion.ts`, `src/lib/profileCompletion.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/profileCompletion.test.ts
import { describe, it, expect } from "vitest";
import { computeProfileCompletion } from "./profileCompletion";

describe("computeProfileCompletion", () => {
  it("is 0% with nothing done", () => {
    const r = computeProfileCompletion({ hasAvatar: false, hasFavoriteSport: false, gamesPlayed: 0, hasCompletedBooking: false });
    expect(r.pct).toBe(0);
    expect(r.items.map(i => i.done)).toEqual([false, false, false, false]);
  });
  it("is 75% with three of four done", () => {
    const r = computeProfileCompletion({ hasAvatar: true, hasFavoriteSport: true, gamesPlayed: 3, hasCompletedBooking: false });
    expect(r.pct).toBe(75);
    expect(r.items.find(i => i.key === "booking")!.done).toBe(false);
  });
  it("is 100% when all done", () => {
    const r = computeProfileCompletion({ hasAvatar: true, hasFavoriteSport: true, gamesPlayed: 1, hasCompletedBooking: true });
    expect(r.pct).toBe(100);
  });
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/profileCompletion.ts
export interface CompletionInput {
  hasAvatar: boolean;
  hasFavoriteSport: boolean;
  gamesPlayed: number;
  hasCompletedBooking: boolean;
}
export interface CompletionItem { key: string; label: string; done: boolean; }
export interface CompletionResult { pct: number; items: CompletionItem[]; }

export function computeProfileCompletion(input: CompletionInput): CompletionResult {
  const items: CompletionItem[] = [
    { key: "photo",   label: "Add a profile photo",     done: input.hasAvatar },
    { key: "sport",   label: "Add a favorite sport",    done: input.hasFavoriteSport },
    { key: "game",    label: "Join your first game",    done: input.gamesPlayed >= 1 },
    { key: "booking", label: "Complete your first booking", done: input.hasCompletedBooking },
  ];
  const done = items.filter(i => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}
```

- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `git add src/lib/profileCompletion.ts src/lib/profileCompletion.test.ts && git commit -m "feat: profile completion compute"`

---

## Task 4: profileGrouping.ts (group status, bucketing, upcoming selection)

**Files:** Create `src/lib/profileGrouping.ts`, `src/lib/profileGrouping.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/profileGrouping.test.ts
import { describe, it, expect } from "vitest";
import { gameGroupStatus, coachBookingGroupStatus, registrationGroupStatus, selectUpcoming } from "./profileGrouping";

const NOW = new Date("2026-06-11T12:00:00.000Z");
const future = "2026-06-20T10:00:00.000Z";
const past = "2026-06-01T10:00:00.000Z";

describe("gameGroupStatus", () => {
  it("cancelled status wins", () => expect(gameGroupStatus({ scheduledAt: future, status: "cancelled" }, NOW)).toBe("cancelled"));
  it("future = upcoming", () => expect(gameGroupStatus({ scheduledAt: future, status: "open" }, NOW)).toBe("upcoming"));
  it("past = completed", () => expect(gameGroupStatus({ scheduledAt: past, status: "open" }, NOW)).toBe("completed"));
});

describe("coachBookingGroupStatus", () => {
  it("maps booking lifecycle", () => {
    expect(coachBookingGroupStatus("cancelled")).toBe("cancelled");
    expect(coachBookingGroupStatus("rejected")).toBe("cancelled");
    expect(coachBookingGroupStatus("completed")).toBe("completed");
    expect(coachBookingGroupStatus("pending")).toBe("upcoming");
    expect(coachBookingGroupStatus("approved")).toBe("upcoming");
  });
});

describe("registrationGroupStatus", () => {
  it("cancelled wins, then past end = completed, else upcoming", () => {
    expect(registrationGroupStatus("cancelled", future, NOW)).toBe("cancelled");
    expect(registrationGroupStatus("registered", past, NOW)).toBe("completed");
    expect(registrationGroupStatus("registered", future, NOW)).toBe("upcoming");
  });
});

describe("selectUpcoming", () => {
  it("picks the nearest dated item", () => {
    const r = selectUpcoming([
      { type: "event", date: "2026-06-25T10:00:00.000Z", id: "e" },
      { type: "game",  date: "2026-06-12T10:00:00.000Z", id: "g" },
    ]);
    expect(r?.id).toBe("g");
  });
  it("breaks date ties by type priority (coach > game > workshop > camp > event)", () => {
    const r = selectUpcoming([
      { type: "event", date: future, id: "e" },
      { type: "game",  date: future, id: "g" },
    ]);
    expect(r?.id).toBe("g");
  });
  it("falls back to an undated coach booking only when no dated items exist", () => {
    expect(selectUpcoming([{ type: "coach", date: null, id: "c" }])?.id).toBe("c");
    expect(selectUpcoming([
      { type: "coach", date: null, id: "c" },
      { type: "game", date: future, id: "g" },
    ])?.id).toBe("g");
  });
  it("returns null when empty", () => expect(selectUpcoming([])).toBeNull());
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/profileGrouping.ts
export type GroupStatus = "upcoming" | "completed" | "cancelled";

export function gameGroupStatus(g: { scheduledAt: string; status: string }, now: Date): GroupStatus {
  if (g.status === "cancelled") return "cancelled";
  return new Date(g.scheduledAt).getTime() > now.getTime() ? "upcoming" : "completed";
}

export function coachBookingGroupStatus(status: string): GroupStatus {
  if (status === "cancelled" || status === "rejected") return "cancelled";
  if (status === "completed") return "completed";
  return "upcoming"; // pending | approved
}

export function registrationGroupStatus(status: string, parentEnd: string, now: Date): GroupStatus {
  if (status === "cancelled") return "cancelled";
  return new Date(parentEnd).getTime() < now.getTime() ? "completed" : "upcoming";
}

export type UpcomingType = "coach" | "game" | "workshop" | "camp" | "event";
const TYPE_PRIORITY: Record<UpcomingType, number> = { coach: 1, game: 2, workshop: 3, camp: 4, event: 5 };

export interface UpcomingCandidate { type: UpcomingType; date: string | null; id: string; [k: string]: unknown; }

/**
 * Nearest dated item wins (date asc); ties broken by type priority. Coach
 * bookings (date=null, no stored session datetime) are the fallback only when
 * no dated items exist.
 */
export function selectUpcoming<T extends UpcomingCandidate>(candidates: T[]): T | null {
  const dated = candidates.filter(c => c.date != null);
  if (dated.length) {
    dated.sort((a, b) => {
      const dt = new Date(a.date as string).getTime() - new Date(b.date as string).getTime();
      return dt !== 0 ? dt : TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    });
    return dated[0];
  }
  const undated = candidates.filter(c => c.date == null);
  if (!undated.length) return null;
  undated.sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);
  return undated[0];
}

/** Generic bucketer used by the Games/Bookings tabs. */
export function bucketByStatus<T>(items: T[], statusOf: (t: T) => GroupStatus): Record<GroupStatus, T[]> {
  const out: Record<GroupStatus, T[]> = { upcoming: [], completed: [], cancelled: [] };
  for (const it of items) out[statusOf(it)].push(it);
  return out;
}
```

- [ ] **Step 4: Run → PASS**; `npx tsc --noEmit` exit 0
- [ ] **Step 5: Commit** `git add src/lib/profileGrouping.ts src/lib/profileGrouping.test.ts && git commit -m "feat: profile grouping + upcoming selection helpers"`

---

## Task 5: motivation.ts

**Files:** Create `src/lib/motivation.ts`, `src/lib/motivation.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/motivation.test.ts
import { describe, it, expect } from "vitest";
import { motivationFor } from "./motivation";

describe("motivationFor", () => {
  it("prioritises REP to next tier", () => {
    expect(motivationFor({ pointsToNext: 80, nextTierLabel: "Silver", streakWeeks: 3, nearestLocked: null, topSport: "Football" }))
      .toBe("80 REP until Silver.");
  });
  it("falls back to streak when at/away from a tier boundary but streak active", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 3, nearestLocked: null, topSport: "Football" }))
      .toBe("Join 1 more game this week to keep your 3-week streak alive.");
  });
  it("falls back to nearest locked achievement", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 0, nearestLocked: { title: "Team Player", current: 2, target: 5 }, topSport: "Football" }))
      .toBe("Play 3 more games to unlock Team Player.");
  });
  it("falls back to an encouraging line using top sport", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 0, nearestLocked: null, topSport: "Football" }))
      .toBe("You're at the top — keep your Football game sharp! 👑");
  });
  it("handles no top sport in the final fallback", () => {
    expect(motivationFor({ pointsToNext: 0, nextTierLabel: null, streakWeeks: 0, nearestLocked: null, topSport: null }))
      .toBe("You're at the top — keep playing! 👑");
  });
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/motivation.ts
export interface MotivationInput {
  pointsToNext: number;
  nextTierLabel: string | null;
  streakWeeks: number;
  nearestLocked: { title: string; current: number; target: number } | null;
  topSport: string | null;
}

export function motivationFor(i: MotivationInput): string {
  if (i.pointsToNext > 0 && i.nextTierLabel) {
    return `${i.pointsToNext} REP until ${i.nextTierLabel}.`;
  }
  if (i.streakWeeks > 0) {
    return `Join 1 more game this week to keep your ${i.streakWeeks}-week streak alive.`;
  }
  if (i.nearestLocked) {
    const remaining = Math.max(1, i.nearestLocked.target - i.nearestLocked.current);
    return `Play ${remaining} more game${remaining === 1 ? "" : "s"} to unlock ${i.nearestLocked.title}.`;
  }
  return i.topSport
    ? `You're at the top — keep your ${i.topSport} game sharp! 👑`
    : "You're at the top — keep playing! 👑";
}
```

Note: the `nearestLocked` "Play N more games" phrasing assumes a game-count achievement (which the community/sports locked ones are). The caller (Task 18 page) selects the nearest locked **game-count** achievement to feed this, so the wording stays truthful.

- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `git add src/lib/motivation.ts src/lib/motivation.test.ts && git commit -m "feat: dynamic motivation prompt"`

---

# PHASE 2 — API + types

## Task 6: Extend profile API — games/upcoming/registrations/completion + owner gating

**Files:** Modify `src/app/api/users/[id]/route.ts`

Read the current GET first. Keep existing fields; add the new ones; gate private data. Use the helpers from Phase 1.

- [ ] **Step 1: Add imports** at top of the route:

```ts
import { gameGroupStatus, coachBookingGroupStatus, registrationGroupStatus, selectUpcoming, type GroupStatus } from "@/lib/profileGrouping";
import { computeProfileCompletion } from "@/lib/profileCompletion";
import { getSessionFromRequest } from "@/lib/auth";
```

- [ ] **Step 2: Determine owner** — at the start of GET, after resolving `id`:

```ts
const session = await getSessionFromRequest(_req).catch(() => null);
const isOwner = !!session && session.id === id;
```

(Confirm `getSessionFromRequest` signature from `src/lib/auth.ts`; it's used in `src/app/api/bookings/route.ts`. If GET's first arg is named `_req`, rename to `req` so it can be passed.)

- [ ] **Step 3: Fetch the games list + registrations + completed-booking flag.** Extend the existing `Promise.all` with:

```ts
// joined games (with game) — not cancelled handled in grouping
prisma.gamePlayer.findMany({
  where: { userId: id },
  include: { game: true },
  orderBy: { joinedAt: "desc" },
}),
// organized games
prisma.game.findMany({ where: { organizerId: id }, orderBy: { scheduledAt: "desc" } }),
// owner-only registrations
isOwner ? prisma.campRegistration.findMany({ where: { userId: id }, include: { camp: { select: { title: true, startDate: true, endDate: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
isOwner ? prisma.eventRegistration.findMany({ where: { userId: id }, include: { event: { select: { title: true, startDate: true, endDate: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
isOwner ? prisma.workshopRegistration.findMany({ where: { userId: id }, include: { workshop: { select: { title: true, startDate: true, endDate: true } } }, orderBy: { registeredAt: "desc" } }) : Promise.resolve([]),
// completed coach booking flag (owner completion check)
isOwner ? prisma.booking.count({ where: { userId: id, status: "completed" } }) : Promise.resolve(0),
```

- [ ] **Step 4: Build `games[]` with `groupStatus`.** After the queries:

```ts
const now = new Date();
const joined = joinedRows.map(gp => gp.game).filter(Boolean);
const gameList = [
  ...joined.map(g => ({ ...g, role: "player" as const })),
  ...organizedRows.map(g => ({ ...g, role: "organizer" as const })),
].map(g => ({
  id: g.id, sport: g.sport, title: g.title, location: g.location, scheduledAt: g.scheduledAt,
  status: g.status, role: g.role,
  groupStatus: gameGroupStatus({ scheduledAt: g.scheduledAt.toISOString(), status: g.status }, now) as GroupStatus,
}));
```

- [ ] **Step 5: Build owner-only `registrations[]` + `upcoming` + `profileCompletion`.**

```ts
const registrations = isOwner ? {
  camps: campRegs.map(r => ({ id: r.id, title: r.camp?.title ?? "Camp", startDate: r.camp?.startDate, endDate: r.camp?.endDate, status: r.status, paymentStatus: r.paymentStatus, groupStatus: registrationGroupStatus(r.status, (r.camp?.endDate ?? r.camp?.startDate ?? new Date()).toISOString(), now) })),
  events: eventRegs.map(r => ({ id: r.id, title: r.event?.title ?? "Event", startDate: r.event?.startDate, endDate: r.event?.endDate, status: r.status, paymentStatus: r.paymentStatus, groupStatus: registrationGroupStatus(r.status, (r.event?.endDate ?? r.event?.startDate ?? new Date()).toISOString(), now) })),
  workshops: workshopRegs.map(r => ({ id: r.id, title: r.workshop?.title ?? "Workshop", startDate: r.workshop?.startDate, endDate: r.workshop?.endDate, status: r.status, paymentStatus: r.paymentStatus, groupStatus: registrationGroupStatus(r.status, (r.workshop?.endDate ?? r.workshop?.startDate ?? new Date()).toISOString(), now) })),
} : undefined;

let upcoming = undefined as undefined | { type: string; id: string; title: string; date: string | null; location?: string; status?: string; href: string };
if (isOwner) {
  const candidates = [
    ...joined.filter(g => g.scheduledAt > now && g.status !== "cancelled").map(g => ({ type: "game" as const, id: g.id, date: g.scheduledAt.toISOString(), title: g.title, location: g.location, status: g.status, href: `/game/${g.id}` })),
    ...campRegs.filter(r => r.camp && r.status !== "cancelled" && r.camp.startDate > now).map(r => ({ type: "camp" as const, id: r.id, date: r.camp!.startDate.toISOString(), title: r.camp!.title, href: `/camps/${r.campId}` })),
    ...eventRegs.filter(r => r.event && r.status !== "cancelled" && r.event.startDate > now).map(r => ({ type: "event" as const, id: r.id, date: r.event!.startDate.toISOString(), title: r.event!.title, href: `/events/${r.eventId}` })),
    ...workshopRegs.filter(r => r.workshop && r.status !== "cancelled" && r.workshop.startDate > now).map(r => ({ type: "workshop" as const, id: r.id, date: r.workshop!.startDate.toISOString(), title: r.workshop!.title, href: `/workshops/${r.workshopId}` })),
    ...bookingsRows.filter(b => b.status === "approved").map(b => ({ type: "coach" as const, id: b.id, date: null, title: b.coach?.name ? `Coaching with ${b.coach.name}` : "Coaching session", href: `/bookings` })),
  ];
  upcoming = selectUpcoming(candidates) ?? undefined;
}

const profileCompletion = isOwner ? computeProfileCompletion({
  hasAvatar: !!user.avatarUrl,
  hasFavoriteSport: sports.length > 0,
  gamesPlayed,
  hasCompletedBooking: completedBookingCount > 0,
}) : undefined;
```

- [ ] **Step 6: Gate `bookings` to owner and add the new fields to the response.** Change the existing return to:

```ts
return ok({
  ...user, passwordHash: undefined, passwordResetToken: undefined, passwordResetExpiry: undefined,
  gamesPlayed, gamesOrganized, sports,
  games: gameList,
  upcoming,
  bookings: isOwner ? bookings : undefined,
  registrations,
  profileCompletion,
  playerRank, playerCount,
  // season added in Task 7
});
```

Remove the old `upcomingGames` and unlocked-only `achievements` from the response (achievements now computed client-side; `games` supersedes `upcomingGames`). Search the file for `upcomingGames`/`achievements` and delete those build steps.

- [ ] **Step 7: Verify** `npx tsc --noEmit` (exit 0) and `npm run build` (route compiles). Fix any Prisma field-name mismatches by checking `prisma/schema.prisma` (e.g. registration FK names `campId`/`eventId`/`workshopId`).

- [ ] **Step 8: Commit** `git add src/app/api/users/[id]/route.ts && git commit -m "feat: profile API games/upcoming/registrations/completion + owner gating"`

---

## Task 7: Add season block to profile API

**Files:** Modify `src/app/api/users/[id]/route.ts`

- [ ] **Step 1: Import** `import { currentSeason, seasonRep } from "@/lib/season";`

- [ ] **Step 2: Compute this user's season counts + season REP + rank.** Add to the GET body (after `now`):

```ts
const season = currentSeason(now);
const since = season.startsAt;

// This user's in-window activity counts.
const [sGames, sOrganized, sCamps, sEvents, sWorkshops, sReviews] = await Promise.all([
  prisma.gamePlayer.count({ where: { userId: id, joinedAt: { gte: since }, game: { status: { not: "cancelled" } } } }),
  prisma.game.count({ where: { organizerId: id, createdAt: { gte: since }, status: { not: "cancelled" } } }),
  prisma.campRegistration.count({ where: { userId: id, registeredAt: { gte: since }, status: { not: "cancelled" } } }),
  prisma.eventRegistration.count({ where: { userId: id, registeredAt: { gte: since }, status: { not: "cancelled" } } }),
  prisma.workshopRegistration.count({ where: { userId: id, registeredAt: { gte: since }, status: { not: "cancelled" } } }),
  prisma.review.count({ where: { authorId: id, createdAt: { gte: since } } }), // confirm Review author FK name in schema
]);
const mySeasonRep = seasonRep({ games: sGames, organized: sOrganized, camps: sCamps, events: sEvents, workshops: sWorkshops, reviews: sReviews });

// Season rank: aggregate in-window game activity per user (the dominant driver),
// then count users whose season game-REP exceeds this user's. Bounded by
// active-this-season users, not all users.
const seasonGameGroups = await prisma.gamePlayer.groupBy({
  by: ["userId"],
  where: { joinedAt: { gte: since }, game: { status: { not: "cancelled" } } },
  _count: { _all: true },
});
const myGameRep = sGames * 10;
const higherSeason = seasonGameGroups.filter(g => g.userId !== id && g._count._all * 10 > myGameRep).length;
const seasonRank = higherSeason + 1;
```

Note: season rank is ranked on the in-window **game** contribution (the only per-user activity cheaply aggregatable in one query); documented honestly as a games-based season standing. Other in-window activity still counts toward the user's displayed season REP.

- [ ] **Step 3: Add `season` to the response object:**

```ts
season: { id: season.id, label: season.label, daysLeft: season.daysLeft, rep: mySeasonRep, rank: seasonRank },
```

- [ ] **Step 4: Verify** `npx tsc --noEmit` and `npm run build`. Confirm `Review` author field name (`authorId` vs `userId` vs `reviewerId`) against `prisma/schema.prisma` and fix the `review.count` where clause accordingly.

- [ ] **Step 5: Commit** `git add src/app/api/users/[id]/route.ts && git commit -m "feat: season REP/rank/daysLeft in profile API"`

---

## Task 8: Extend useData types

**Files:** Modify `src/hooks/useData.ts`

- [ ] **Step 1: Replace the `UserProfile` type** with the extended shape (keep fields still used elsewhere; remove `upcomingGames`/`organizedGames`/old `achievements` if unused — grep first):

```ts
export type ProfileGameItem = {
  id: string; sport: string; title: string; location: string; scheduledAt: string;
  status: string; role: "player" | "organizer"; groupStatus: "upcoming" | "completed" | "cancelled";
};
export type ProfileRegItem = {
  id: string; title: string; startDate?: string; endDate?: string;
  status: string; paymentStatus: string; groupStatus: "upcoming" | "completed" | "cancelled";
};
export type ProfileUpcoming = {
  type: "coach" | "game" | "workshop" | "camp" | "event";
  id: string; title: string; date: string | null; location?: string; status?: string; href: string;
};
export type ProfileSeason = { id: string; label: string; daysLeft: number; rep: number; rank: number };
export type ProfileCompletion = { pct: number; items: { key: string; label: string; done: boolean }[] };

export type UserProfile = {
  id: string; name: string; username: string; email?: string; location?: string;
  bio?: string; avatarUrl?: string; role: string;
  reliabilityScore: number; gamesPlayed: number; gamesOrganized: number; attendanceRate: number;
  reputationScore: number; tier: string; tierUpdatedAt?: string;
  playerRank?: number; playerCount?: number;
  sports: { sport: string; games: number; level: string }[];
  games: ProfileGameItem[];
  upcoming?: ProfileUpcoming;
  bookings?: Booking[];
  registrations?: { camps: ProfileRegItem[]; events: ProfileRegItem[]; workshops: ProfileRegItem[] };
  profileCompletion?: ProfileCompletion;
  season: ProfileSeason;
  createdAt: string;
};
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`. This will surface every old reference to removed fields (`upcomingGames`, `organizedGames`, old `achievements`, `lookingFor`) — the page rewrite (Task 20) resolves them; for now, if other files break, note them (they should only be the profile page, which is rewritten next). If a non-profile file references them, keep that field on the type to avoid breakage.

- [ ] **Step 3: Commit** `git add src/hooks/useData.ts && git commit -m "feat: extend UserProfile type for redesign"`

---

# PHASE 3 — Components

> All components are client components (`"use client"`), dark theme, inline styles matching the codebase. Shared accent: tier color via `TIER_META` from `@/lib/reputation`. Use Framer Motion (`motion`, `animate`, `useMotionValue`, `useTransform`) where animation is specified.

## Task 9: RankProgress (the dominant hero)

**Files:** Create `src/components/profile/RankProgress.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/RankProgress.tsx
"use client";
import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { tierLevelInfo } from "@/lib/reputation";

export function RankProgress({ reputationScore }: { reputationScore: number }) {
  const info = tierLevelInfo(reputationScore);
  const rep = useMotionValue(0);
  const repText = useTransform(rep, v => Math.round(v).toLocaleString());
  const widthPct = useMotionValue(0);
  const width = useTransform(widthPct, v => `${v}%`);

  useEffect(() => {
    const a1 = animate(rep, reputationScore, { duration: 1.1, ease: "easeOut" });
    const a2 = animate(widthPct, info.progressPct, { duration: 1.1, ease: "easeOut" });
    return () => { a1.stop(); a2.stop(); };
  }, [reputationScore, info.progressPct, rep, widthPct]);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${info.colorDim}22 0%, #0d0d0d 60%)`,
      border: `1px solid ${info.color}33`, borderRadius: 24, padding: "32px 28px",
      boxShadow: `0 0 60px ${info.color}18`, position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 40 }}>{info.icon}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{info.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Current tier</div>
          </div>
        </div>
        {info.next && (
          <div style={{ textAlign: "right", opacity: 0.7 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{info.next.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Next tier</div>
          </div>
        )}
      </div>

      <div style={{ position: "relative", height: 16, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 18 }}>
        <motion.div style={{ width, height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${info.colorDim}, ${info.color})`, boxShadow: `0 0 16px ${info.color}` }} />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>
          <motion.span>{repText}</motion.span> <span style={{ fontSize: 20, color: info.color }}>REP</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
          {info.next ? `${info.next.pointsToNext} REP to ${info.next.label}` : "Top tier reached 👑"}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/RankProgress.tsx && git commit -m "feat: RankProgress hero component"`

---

## Task 10: PlayerHeroCard

**Files:** Create `src/components/profile/PlayerHeroCard.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/PlayerHeroCard.tsx
"use client";
import Image from "next/image";
import { Trophy, Flame, Star, Calendar } from "lucide-react";
import { TIER_META, type Tier } from "@/lib/reputation";

export interface PlayerHeroCardProps {
  name: string; username: string; avatarUrl?: string;
  tier: string; reputationScore: number; rank?: number; streakWeeks: number;
  joinedAt: string; favoriteSport?: string;
  bannerUrl?: string; frame?: string; membership?: string; // future cosmetics (ignored if absent)
}

export function PlayerHeroCard(p: PlayerHeroCardProps) {
  const meta = TIER_META[(p.tier as Tier)] ?? TIER_META.bronze;
  const joined = new Date(p.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  return (
    <div style={{
      position: "relative", borderRadius: 24, overflow: "hidden",
      border: `1px solid ${meta.color}40`,
      background: p.bannerUrl ? undefined : `radial-gradient(120% 120% at 0% 0%, ${meta.colorDim}33 0%, #0d0d0d 55%)`,
      boxShadow: `0 0 50px ${meta.color}14`,
    }}>
      {p.bannerUrl && <Image src={p.bannerUrl} alt="" fill style={{ objectFit: "cover", opacity: 0.35 }} />}
      <div style={{ position: "relative", padding: "26px 24px", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", border: `3px solid ${meta.color}`, flexShrink: 0, background: "#1c1c1c", boxShadow: `0 0 24px ${meta.color}55` }}>
          {p.avatarUrl
            ? <Image src={p.avatarUrl} alt={p.name} width={84} height={84} style={{ objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff" }}>{p.name.charAt(0).toUpperCase()}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>{p.name}</h1>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 100, background: `${meta.color}22`, color: meta.color, fontSize: 12, fontWeight: 800 }}>
              {meta.icon} {meta.label}
            </span>
            {p.membership && <span style={{ padding: "4px 10px", borderRadius: 100, background: "rgba(230,57,70,0.18)", color: "#e63946", fontSize: 11, fontWeight: 800 }}>{p.membership}</span>}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>@{p.username}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <Stat icon={<Star size={14} color={meta.color} />} label={`${p.reputationScore.toLocaleString()} REP`} />
            {p.rank ? <Stat icon={<Trophy size={14} color="#eab308" />} label={`#${p.rank}`} /> : null}
            <Stat icon={<Flame size={14} color="#f97316" />} label={`${p.streakWeeks} wk streak`} />
            <Stat icon={<Calendar size={14} color="rgba(255,255,255,0.5)" />} label={`Joined ${joined}`} />
            {p.favoriteSport && <Stat icon={<span>⚽</span>} label={p.favoriteSport} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{icon}{label}</span>;
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/PlayerHeroCard.tsx && git commit -m "feat: PlayerHeroCard"`

---

## Task 11: StatStrip

**Files:** Create `src/components/profile/StatStrip.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/StatStrip.tsx
"use client";
import { Gamepad2, CheckCircle, Star, Flame } from "lucide-react";

export function StatStrip({ gamesPlayed, attendanceRate, reputationScore, streakWeeks }: {
  gamesPlayed: number; attendanceRate: number; reputationScore: number; streakWeeks: number;
}) {
  const items = [
    { icon: <Gamepad2 size={18} color="#60a5fa" />, value: String(gamesPlayed), label: "Games Played" },
    { icon: <CheckCircle size={18} color="#4ade80" />, value: `${Math.round(attendanceRate)}%`, label: "Attendance" },
    { icon: <Star size={18} color="#eab308" />, value: reputationScore.toLocaleString(), label: "REP Earned" },
    { icon: <Flame size={18} color="#f97316" />, value: `${streakWeeks}w`, label: "Streak" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
      {items.map(it => (
        <div key={it.label} style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{it.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{it.value}</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}
```

Add responsive note: on mobile the 4 columns may be tight — wrap in a container that allows `grid-template-columns: repeat(2, 1fr)` under 420px via a CSS class. For simplicity keep 4 columns (values are short: "12", "96%", "320", "3w"); acceptable on mobile.

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/StatStrip.tsx && git commit -m "feat: StatStrip"`

---

## Task 12: SeasonStrip

**Files:** Create `src/components/profile/SeasonStrip.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/SeasonStrip.tsx
"use client";
import type { ProfileSeason } from "@/hooks/useData";

export function SeasonStrip({ season }: { season: ProfileSeason }) {
  const cells = [
    { value: `${season.rep.toLocaleString()}`, label: "Season REP" },
    { value: `#${season.rank}`, label: "Season Rank" },
    { value: `${season.daysLeft}d`, label: "Ends In" },
  ];
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(96,165,250,0.08), #0d0d0d)", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.06em" }}>Season · {season.label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {cells.map(c => (
          <div key={c.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{c.value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/SeasonStrip.tsx && git commit -m "feat: SeasonStrip"`

---

## Task 13: UpcomingCard

**Files:** Create `src/components/profile/UpcomingCard.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/UpcomingCard.tsx
"use client";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight, Compass } from "lucide-react";
import type { ProfileUpcoming } from "@/hooks/useData";

const BADGE: Record<string, { label: string; color: string }> = {
  coach:    { label: "COACH",    color: "#e63946" },
  game:     { label: "GAME",     color: "#60a5fa" },
  workshop: { label: "WORKSHOP", color: "#a78bfa" },
  camp:     { label: "CAMP",     color: "#4ade80" },
  event:    { label: "EVENT",    color: "#eab308" },
};

export function UpcomingCard({ upcoming }: { upcoming?: ProfileUpcoming }) {
  if (!upcoming) {
    return (
      <div style={{ background: "#0d0d0d", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 20, padding: "28px 20px", textAlign: "center" }}>
        <Compass size={28} color="rgba(255,255,255,0.4)" style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Nothing coming up</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Find a game and get back on the court.</div>
        <Link href="/play" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 18px", borderRadius: 100, background: "linear-gradient(135deg,#e63946,#b91c2d)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Find Games</Link>
      </div>
    );
  }
  const b = BADGE[upcoming.type] ?? BADGE.game;
  const when = upcoming.date ? new Date(upcoming.date).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Scheduled with coach";
  return (
    <div style={{ background: `linear-gradient(135deg, ${b.color}14, #0d0d0d)`, border: `1px solid ${b.color}33`, borderRadius: 20, padding: "18px 18px" }}>
      <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 6, background: `${b.color}22`, color: b.color, fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", marginBottom: 10 }}>{b.label}</span>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{upcoming.title}</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Calendar size={13} /> {when}</span>
        {upcoming.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {upcoming.location}</span>}
      </div>
      <Link href={upcoming.href} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 100, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>View Details <ArrowRight size={14} /></Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/UpcomingCard.tsx && git commit -m "feat: UpcomingCard"`

---

## Task 14: ProfileCompletionCard

**Files:** Create `src/components/profile/ProfileCompletionCard.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/ProfileCompletionCard.tsx
"use client";
import { Check } from "lucide-react";
import type { ProfileCompletion } from "@/hooks/useData";

export function ProfileCompletionCard({ completion }: { completion: ProfileCompletion }) {
  if (completion.pct >= 100) return null; // fully complete → no nudge
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Profile Completion</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: "#4ade80" }}>{completion.pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${completion.pct}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)", borderRadius: 100, transition: "width .6s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {completion.items.map(it => (
          <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: it.done ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.8)" }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: it.done ? "#22c55e" : "rgba(255,255,255,0.08)", flexShrink: 0 }}>
              {it.done && <Check size={11} color="#000" />}
            </span>
            <span style={{ textDecoration: it.done ? "line-through" : "none" }}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/ProfileCompletionCard.tsx && git commit -m "feat: ProfileCompletionCard"`

---

## Task 15: ActivityTimeline

**Files:** Create `src/components/profile/ActivityTimeline.tsx`

- [ ] **Step 1: Implement** (uses the existing `useUserActivity` hook; renders real items only)

```tsx
// src/components/profile/ActivityTimeline.tsx
"use client";
import Link from "next/link";
import { useUserActivity } from "@/hooks/useData";

function ago(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return "just now";
  if (h < 1) return `${m}m ago`;
  if (d < 1) return `${h}h ago`;
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export function ActivityTimeline({ userId }: { userId: string }) {
  const { data } = useUserActivity(userId);
  const items = (data?.items ?? []).slice(0, 5);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Recent Activity</span>
        <Link href={`/profile/${userId}/activity`} style={{ fontSize: 12, color: "#e63946", textDecoration: "none", fontWeight: 600 }}>View all</Link>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>No activity yet — join a game to get started.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i === items.length - 1 ? 0 : 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{it.icon}</span>
                {i !== items.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 16, background: "rgba(255,255,255,0.08)", marginTop: 4 }} />}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 13, color: "#e5e7eb" }}>{it.text}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{ago(it.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: `View all` links to `/profile/[id]/activity`. That route may not exist; if so, point it at the same profile with a future activity view — for now keep the link but it is acceptable for it to 404 until a history page exists, OR drop the link if the route is absent. Implementer: check for `src/app/profile/[id]/activity`; if absent, render "View all" as disabled text (no link). Pick one and keep it consistent.

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/ActivityTimeline.tsx && git commit -m "feat: ActivityTimeline"`

---

## Task 16: AchievementsRail (rail + full grid via variant)

**Files:** Create `src/components/profile/AchievementsRail.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/AchievementsRail.tsx
"use client";
import { Lock } from "lucide-react";
import { ACHIEVEMENT_CATEGORIES, type Achievement, type AchievementCategory } from "@/lib/achievements";

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  sports: "Sports", consistency: "Consistency", community: "Community", competition: "Competition",
};

function Badge({ a }: { a: Achievement }) {
  return (
    <div style={{
      width: 116, flexShrink: 0, textAlign: "center", padding: "16px 10px", borderRadius: 16,
      background: a.unlocked ? "rgba(234,179,8,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${a.unlocked ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.07)"}`,
      opacity: a.unlocked ? 1 : 0.7,
    }}>
      <div style={{ fontSize: 30, marginBottom: 6, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.unlocked ? a.icon : "🔒"}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{a.title}</div>
      {a.unlocked
        ? <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{a.description}</div>
        : a.progress && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{a.progress.current}/{a.progress.target}</div>}
    </div>
  );
}

/** variant="rail": horizontal highlights. variant="grid": full grid by category. */
export function AchievementsRail({ achievements, variant = "rail" }: { achievements: Achievement[]; variant?: "rail" | "grid" }) {
  if (variant === "rail") {
    const ordered = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
    return (
      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Achievements</div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {ordered.slice(0, 8).map(a => <Badge key={a.id} a={a} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {ACHIEVEMENT_CATEGORIES.map(cat => {
        const inCat = achievements.filter(a => a.category === cat);
        if (!inCat.length) return null;
        return (
          <div key={cat}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{CATEGORY_LABEL[cat]}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {inCat.map(a => <Badge key={a.id} a={a} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/AchievementsRail.tsx && git commit -m "feat: AchievementsRail (rail + grid)"`

---

## Task 17: MotivationCard

**Files:** Create `src/components/profile/MotivationCard.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/MotivationCard.tsx
"use client";
import { Sparkles } from "lucide-react";

export function MotivationCard({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, rgba(230,57,70,0.12), #0d0d0d)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 16, padding: "16px 18px" }}>
      <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(230,57,70,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Sparkles size={18} color="#e63946" />
      </span>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{message}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/MotivationCard.tsx && git commit -m "feat: MotivationCard"`

---

## Task 18: GamesTab

**Files:** Create `src/components/profile/GamesTab.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/profile/GamesTab.tsx
"use client";
import Link from "next/link";
import { bucketByStatus } from "@/lib/profileGrouping";
import type { ProfileGameItem } from "@/hooks/useData";

function GameCard({ g }: { g: ProfileGameItem }) {
  return (
    <Link href={`/game/${g.id}`} style={{ textDecoration: "none", display: "block", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{g.title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{g.sport} · {g.location}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: g.role === "organizer" ? "#eab308" : "#60a5fa", alignSelf: "flex-start" }}>{g.role === "organizer" ? "ORGANIZER" : "PLAYER"}</span>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>{new Date(g.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
    </Link>
  );
}

const GROUPS = [
  { key: "upcoming" as const, label: "Upcoming" },
  { key: "completed" as const, label: "Completed" },
  { key: "cancelled" as const, label: "Cancelled" },
];

export function GamesTab({ games }: { games: ProfileGameItem[] }) {
  const buckets = bucketByStatus(games, g => g.groupStatus);
  if (!games.length) return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", padding: "20px 0" }}>No games yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {GROUPS.map(grp => buckets[grp.key].length > 0 && (
        <div key={grp.key}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{grp.label} ({buckets[grp.key].length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {buckets[grp.key].map(g => <GameCard key={`${g.role}-${g.id}`} g={g} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/GamesTab.tsx && git commit -m "feat: GamesTab grouped cards"`

---

## Task 19: BookingsTab

**Files:** Create `src/components/profile/BookingsTab.tsx`

- [ ] **Step 1: Implement** (groups by type → status). Coach sessions come from `bookings` (Booking[]); workshops/camps/events from `registrations`.

```tsx
// src/components/profile/BookingsTab.tsx
"use client";
import { bucketByStatus, coachBookingGroupStatus } from "@/lib/profileGrouping";
import type { Booking, ProfileRegItem, UserProfile } from "@/hooks/useData";

const STATUS_GROUPS = [
  { key: "upcoming" as const, label: "Upcoming" },
  { key: "completed" as const, label: "Completed" },
  { key: "cancelled" as const, label: "Cancelled" },
];

function Row({ title, sub, status }: { title: string; sub: string; status: string }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "capitalize", alignSelf: "center" }}>{status}</span>
    </div>
  );
}

function TypeSection<T>({ label, items, statusOf, render }: { label: string; items: T[]; statusOf: (t: T) => "upcoming" | "completed" | "cancelled"; render: (t: T) => React.ReactNode }) {
  if (!items.length) return null;
  const buckets = bucketByStatus(items, statusOf);
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {STATUS_GROUPS.map(g => buckets[g.key].length > 0 && (
          <div key={g.key}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{g.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{buckets[g.key].map(render)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingsTab({ bookings, registrations }: { bookings: Booking[]; registrations: UserProfile["registrations"] }) {
  const empty = !bookings.length && !registrations?.camps.length && !registrations?.events.length && !registrations?.workshops.length;
  if (empty) return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", padding: "20px 0" }}>No bookings yet.</div>;
  const regStatus = (r: ProfileRegItem) => r.groupStatus;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <TypeSection label="Coach Sessions" items={bookings} statusOf={b => coachBookingGroupStatus(b.status)}
        render={(b) => <Row key={b.id} title={b.coachName ?? "Coaching session"} sub={b.sport ?? "1:1"} status={b.status} />} />
      <TypeSection label="Workshops" items={registrations?.workshops ?? []} statusOf={regStatus}
        render={(r) => <Row key={r.id} title={r.title} sub={r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : "—"} status={r.status} />} />
      <TypeSection label="Camps" items={registrations?.camps ?? []} statusOf={regStatus}
        render={(r) => <Row key={r.id} title={r.title} sub={r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : "—"} status={r.status} />} />
      <TypeSection label="Events" items={registrations?.events ?? []} statusOf={regStatus}
        render={(r) => <Row key={r.id} title={r.title} sub={r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : "—"} status={r.status} />} />
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`
- [ ] **Step 3: Commit** `git add src/components/profile/BookingsTab.tsx && git commit -m "feat: BookingsTab grouped by type+status"`

---

# PHASE 4 — Assembly & cleanup

## Task 20: ProfileTabs + page rewrite

**Files:** Create `src/components/profile/ProfileTabs.tsx`; Rewrite `src/app/profile/[id]/page.tsx`

- [ ] **Step 1: Create `ProfileTabs.tsx`** (presentational tab switcher)

```tsx
// src/components/profile/ProfileTabs.tsx
"use client";
export function ProfileTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 22 }}>
      {tabs.map(t => {
        const on = t === active;
        return (
          <button key={t} onClick={() => onChange(t)} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            padding: "10px 14px", fontSize: 13.5, fontWeight: on ? 800 : 600,
            color: on ? "#fff" : "rgba(255,255,255,0.5)", borderBottom: on ? "2px solid #e63946" : "2px solid transparent",
            whiteSpace: "nowrap",
          }}>{t}</button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/profile/[id]/page.tsx`.** Read the current file first for the data hooks and loading/error patterns, then replace the body with this composition. Settings tab is a link; achievements computed client-side via the shared lib using profile + activity streak.

```tsx
"use client";
import { use, useState, useMemo } from "react";
import Link from "next/link";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { useUserProfile, useUserActivity } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { tierLevelInfo } from "@/lib/reputation";
import { computeAchievements } from "@/lib/achievements";
import { motivationFor } from "@/lib/motivation";
import { PlayerHeroCard } from "@/components/profile/PlayerHeroCard";
import { RankProgress } from "@/components/profile/RankProgress";
import { StatStrip } from "@/components/profile/StatStrip";
import { SeasonStrip } from "@/components/profile/SeasonStrip";
import { UpcomingCard } from "@/components/profile/UpcomingCard";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
import { AchievementsRail } from "@/components/profile/AchievementsRail";
import { MotivationCard } from "@/components/profile/MotivationCard";
import { GamesTab } from "@/components/profile/GamesTab";
import { BookingsTab } from "@/components/profile/BookingsTab";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { TierUpBanner } from "@/components/profile/TierUpBanner";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const isOwn = user?.id === id;
  const { data: profile, isLoading, error } = useUserProfile(id);
  const { data: activity } = useUserActivity(id);
  const streakWeeks = activity?.streakWeeks ?? 0;

  const tabs = isOwn
    ? ["Overview", "Games", "Bookings", "Achievements", "Settings"]
    : ["Overview", "Games", "Achievements"];
  const [tab, setTab] = useState("Overview");

  const achievements = useMemo(() => profile ? computeAchievements({
    gamesPlayed: profile.gamesPlayed, gamesOrganized: profile.gamesOrganized,
    attendanceRate: profile.attendanceRate, streakWeeks, tier: profile.tier,
  }) : [], [profile, streakWeeks]);

  if (isLoading) return <><PremiumNav variant="solid" /><Center>Loading profile…</Center></>;
  if (error || !profile) return <><PremiumNav variant="solid" /><Center>Profile not found.</Center></>;

  const info = tierLevelInfo(profile.reputationScore);
  const nearestLocked = achievements
    .filter(a => !a.unlocked && (a.category === "sports" || a.category === "community") && a.progress)
    .sort((a, b) => (a.progress!.target - a.progress!.current) - (b.progress!.target - b.progress!.current))[0];
  const motivation = motivationFor({
    pointsToNext: info.next?.pointsToNext ?? 0,
    nextTierLabel: info.next?.label ?? null,
    streakWeeks,
    nearestLocked: nearestLocked ? { title: nearestLocked.title, current: nearestLocked.progress!.current, target: nearestLocked.progress!.target } : null,
    topSport: profile.sports[0]?.sport ?? null,
  });

  return (
    <>
      <PremiumNav variant="solid" />
      <main style={{ background: "#050505", minHeight: "100vh", paddingTop: 96, paddingBottom: 80 }}>
        <div className="container-lg" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760, margin: "0 auto", padding: "0 16px" }}>
          <PlayerHeroCard
            name={profile.name} username={profile.username} avatarUrl={profile.avatarUrl}
            tier={profile.tier} reputationScore={profile.reputationScore} rank={profile.playerRank}
            streakWeeks={streakWeeks} joinedAt={profile.createdAt} favoriteSport={profile.sports[0]?.sport}
          />
          {isOwn && <TierUpBanner tier={profile.tier} tierUpdatedAt={profile.tierUpdatedAt} isOwn={isOwn} />}

          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />

          {tab === "Overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <RankProgress reputationScore={profile.reputationScore} />
              <StatStrip gamesPlayed={profile.gamesPlayed} attendanceRate={profile.attendanceRate} reputationScore={profile.reputationScore} streakWeeks={streakWeeks} />
              <SeasonStrip season={profile.season} />
              {isOwn && <UpcomingCard upcoming={profile.upcoming} />}
              {isOwn && profile.profileCompletion && <ProfileCompletionCard completion={profile.profileCompletion} />}
              {isOwn && <ActivityTimeline userId={id} />}
              <AchievementsRail achievements={achievements} variant="rail" />
              {isOwn && <MotivationCard message={motivation} />}
            </div>
          )}
          {tab === "Games" && <GamesTab games={profile.games} />}
          {tab === "Bookings" && isOwn && <BookingsTab bookings={profile.bookings ?? []} registrations={profile.registrations} />}
          {tab === "Achievements" && <AchievementsRail achievements={achievements} variant="grid" />}
          {tab === "Settings" && isOwn && (
            <Link href="/profile/edit" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 20px", borderRadius: 100, background: "linear-gradient(135deg,#e63946,#b91c2d)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, alignSelf: "flex-start" }}>Edit profile & settings</Link>
          )}
        </div>
      </main>
    </>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14, paddingTop: 96 }}>{children}</main>;
}
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` and `npm run build`. Fix any leftover references (the old page used `nextGame`, `OverviewTab`, heatmap, etc. — all gone now).
- [ ] **Step 4: Commit** `git add src/components/profile/ProfileTabs.tsx "src/app/profile/[id]/page.tsx" && git commit -m "feat: rewrite profile page as progression-driven composition"`

---

## Task 21: Delete removed components + purge dead references

**Files:** Delete `TeammatesRow.tsx`, `StatsAccordion.tsx`, `LookingForBanner.tsx`, `ProfileCTAs.tsx`, `RecentActivity.tsx`

- [ ] **Step 1: Confirm nothing else imports them**

Run: `grep -rn "TeammatesRow\|StatsAccordion\|LookingForBanner\|ProfileCTAs\|RecentActivity\|IdentityHero\|ActivityHeatmap" src/ | grep -v "src/components/profile/\(TeammatesRow\|StatsAccordion\|LookingForBanner\|ProfileCTAs\|RecentActivity\).tsx"`
Expected: only matches inside the rewritten page should be gone already. `IdentityHero` is superseded by `PlayerHeroCard` — if unused, delete it too. If any match remains outside the files being deleted, fix that import first.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/profile/TeammatesRow.tsx src/components/profile/StatsAccordion.tsx src/components/profile/LookingForBanner.tsx src/components/profile/ProfileCTAs.tsx src/components/profile/RecentActivity.tsx
```
If `IdentityHero.tsx` is now unused: `git rm src/components/profile/IdentityHero.tsx`. Keep `TierUpBanner.tsx` and `identityTag.ts` (still used / harmless).

- [ ] **Step 3: Check the teammates/search endpoints aren't referenced by the page.** Grep `useTeammates`/search usage in the profile page (should be none). Leave the API endpoints in place (other code may use them) unless grep shows they were profile-only — do not delete shared APIs without confirmation.

- [ ] **Step 4: Verify** `npx tsc --noEmit` (exit 0) and `npm run build` (green).

- [ ] **Step 5: Commit** `git add -A && git commit -m "chore: remove dashboard-era profile components"`

---

## Task 22: Final verification + deliverables

- [ ] **Step 1: Full suite** `npm test` (all pass, including the 5 new lib suites) ; `npx tsc --noEmit` (0) ; `npm run build` (0).

- [ ] **Step 2: Capture bundle impact** — from `npm run build` output, record the `/profile/[id]` route's First Load JS before vs after (compare against `git show main:...` baseline or note the current value). Include in the completion report.

- [ ] **Step 3: Migration steps** — confirm none (no schema change). State explicitly.

- [ ] **Step 4: Manual check** — own profile + another user's profile at mobile (375px), tablet (768px), desktop widths. Per the saved Upstash caveat, authed routes may 500 locally; if so, verify against the deployed env or with API interception. Capture before/after + mobile screenshots for the report.

- [ ] **Step 5: Run the requesting-code-review skill** over the full diff.

- [ ] **Step 6: Commit any fixes** and report: before/after screenshots, mobile screenshots, components removed, components added, bundle impact, migration steps (none).

---

## Self-review notes (applied)

- **Spec coverage:** hero (T10), dominant RankProgress (T9), 4 stats (T11), seasonal (T1/T7/T12), profile completion (T3/T6/T14), unified upcoming w/ priority (T4/T6/T13), timeline real-only (T15), categorized collectible achievements (T2/T16), dynamic motivation (T5/T17), Games tab grouped (T18), Bookings tab type×status (T19), tabs + own/other (T20), privacy gating (T6/T7), removals (T21), future-ready slots (T10 hero props, T2 `season` field), verification + deliverables (T22).
- **Type consistency:** `ProfileGameItem`/`ProfileRegItem`/`ProfileUpcoming`/`ProfileSeason`/`ProfileCompletion` (T8) are consumed exactly as defined by T12–T20; `Achievement`/`AchievementStats` (T2) by T16/T20; `GroupStatus`/`selectUpcoming` (T4) by T6/T18/T19; `motivationFor` input (T5) matches the call in T20.
- **Known limitations documented:** coach bookings lack a session datetime (Upcoming fallback rule); season rank is games-based (single cheap aggregation) while displayed season REP includes all in-window activity; `View all` activity link depends on a history route that may not exist (implementer degrades gracefully).
