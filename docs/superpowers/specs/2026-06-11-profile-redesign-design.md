# GameGround Profile Redesign — Design Spec

**Date:** 2026-06-11
**Status:** Approved (with 10 refinements folded in)

## Goal

Replace the dashboard-style profile (`/profile/[id]`) with a fun, motivating,
**progression-driven player journey** — closer to Duolingo / Nike Run Club /
Chess.com / a gaming profile card than a SaaS analytics page. A viewer should
instantly grasp: who they are, their tier, their REP progress, and what to do
next. **Progression (REP → next tier) is the hero of the page.**

Hard rule: **no fake metrics.** Every number/label is grounded in real data.

---

## 1. Data reality (what grounds each element)

All from the existing schema / libs — confirmed present:

| Element | Source |
|---|---|
| Tier | `User.tier` + `src/lib/reputation.ts` (Bronze→Silver→Gold→Elite→Pro; thresholds 0/100/300/700/1500) |
| REP | `User.reputationScore` |
| Next-tier progress | `tierLevelInfo(score)` → `{ label, next, progressPct, pointsToNext }` (reused as-is) |
| Leaderboard rank | `playerRank` (already computed in the profile API) |
| Streak | Real consecutive-**week** streak from `/api/users/[id]/activity`, labeled "🔥 N week streak" |
| Stats | `gamesPlayed`, `attendanceRate`, `reputationScore` (REP), streak — **no win rate** |
| Joined date | `User.createdAt` |
| Favorite sport | Top sport from the user's game tally (`sports[0]`), optional |
| Activity | `/api/users/[id]/activity` items (real recorded actions only) |
| Achievements | Derived from real counters via new shared `src/lib/achievements.ts` |

No "Bronze III" sub-divisions exist; progression uses the real flat tiers
(**Bronze → Silver**, etc.).

---

## 2. Architecture & component map (refactor, do not duplicate)

### New components (`src/components/profile/`)
- **`PlayerHeroCard`** — premium player/membership card: avatar, display name,
  username, **tier badge**, REP, leaderboard rank, streak, joined date, optional
  favorite-sport chip. Glassmorphism + subtle gradient + animated glow. Accepts
  optional `bannerUrl` / `frame` / `membership` slots (rendered only if present)
  for future cosmetics — see §10.
- **`RankProgress`** — THE hero of the page (§3).
- **`StatStrip`** — 4 compact horizontal stat cards (§ stats).
- **`UpcomingCard`** — single next item across all 5 types + category badge +
  empty state (§ upcoming).
- **`ActivityTimeline`** — clean vertical timeline, max 5 real items, "View all".
- **`AchievementsRail`** — categorized, collectible badges (overview: horizontal
  rail; Achievements tab: full grid) (§ achievements).
- **`MotivationCard`** — dynamic prompt generated from real profile data (§ motivation).
- **`ProfileTabs`** — tab switcher (§ tabs).
- **`GamesTab`**, **`BookingsTab`**, **`AchievementsTab`** — tab body panels.

### New lib
- **`src/lib/achievements.ts`** — a pure, data-driven catalog + a
  `computeAchievements(stats)` function returning, per achievement:
  `{ id, category, icon, title, description, unlocked, progress?: { current, target } }`.
  Categories: **Sports · Consistency · Community · Competition**. Used by both
  the API (server) and components (client) so the set is defined once.
- **`src/lib/profileGrouping.ts`** — small pure helpers to bucket items into
  `Upcoming | Completed | Cancelled` (Games tab) and per-type groups (Bookings
  tab). Unit-tested.

### Removed (deleted or stopped-using)
`TeammatesRow`, `StatsAccordion`, `LookingForBanner` (overview), `ProfileCTAs`
(share/leaderboard/create), `RecentActivity` (→ `ActivityTimeline`), the heatmap,
the search bar. No heatmaps/graphs/analytics widgets/accordions/admin tables
anywhere (§9).

### Reused
`reputation.ts` `tierLevelInfo()` (powers `RankProgress` unchanged), `Shared`
(`fmtDate`, `SkillBadge`, `StatusBadge`), `IdentityHero` logic folded into
`PlayerHeroCard`, `TierUpBanner` kept as a subtle one-time celebratory banner,
Framer Motion (already a dep) for progress/count-up/micro-interactions.

The 1,144-line `/profile/[id]/page.tsx` becomes a thin composition: data
fetching + `PlayerHeroCard` + `ProfileTabs` + the active tab's panel.

---

## 3. RankProgress — the visual hero (most important)

Largest, most prominent section; visually dominant over everything else.

```
   Bronze ━━━━━━━━━━━━●━━━━━━━━ Silver
                320 REP
              80 REP to Silver
```

- Big current-tier badge (left) → animated progress bar → next-tier badge (right).
- Animated fill to `progressPct`; REP **counts up** on mount (Framer Motion).
- Center: large **current REP**; below: **"N REP to {nextTier}"**.
- Milestone markers on the bar at tier thresholds.
- At max tier (Pro): full bar + "Top tier reached 👑".
- All values from `tierLevelInfo(reputationScore)`.

---

## 4. PlayerHeroCard

A gaming-profile-card × sports-membership-card feel — premium, clean, not a
traditional user header. Contents: avatar, display name, `@username`, **tier
badge**, REP, **#rank leaderboard**, **streak**, **joined {Mon YYYY}**, optional
favorite-sport chip. Subtle sport-accent gradient keyed to tier color, soft
animated glow, glassmorphism panel. Future cosmetic slots (`bannerUrl`, `frame`,
`membership`) are optional props, ignored when absent.

---

## 5. Stats strip

Exactly 4 compact horizontal cards: **Games Played · Attendance Rate · REP
Earned · Current Streak (weeks)**. Icon + value + label. No win rate. No
accordion.

---

## 6. UpcomingCard (unified "next thing to do")

Shows the **single soonest upcoming item** across all five types, with a small
**category badge**:

```
[GAME]  Football Match
        Tomorrow • 7:00 PM • Kozhikode
        Status: Confirmed
        [ View Details ]
```

- Category badge: `GAME | COACH | WORKSHOP | CAMP | EVENT`.
- Fields: name, date, time, location, status; single CTA **View Details** →
  the item's page.
- Empty state: illustration + **Find Games** button (→ `/play`).
- Own-profile only (it is the user's personal next action).

---

## 7. ActivityTimeline

Clean vertical timeline of **real recorded actions only** (from the activity
endpoint): e.g. "Joined Football Match — 2h ago", "Booked Coaching Session —
Yesterday", "Joined Workshop — 3d ago", "Attended Event". Max 5; **View all**
links to full history. No fabricated entries; if there is no activity, show a
short empty line, not filler.

---

## 8. Achievements (collectible, categorized)

`src/lib/achievements.ts` defines a catalog grouped into four categories:

- **Sports** — e.g. 🏅 First Match (gamesPlayed≥1), ⚽ Regular (≥10), 🎯 Organiser (gamesOrganized≥1)
- **Consistency** — e.g. 🔥 4-Week Streak (streak≥4), 💯 Reliable (attendance≥95)
- **Community** — e.g. 🤝 Team Player (played with N teammates / reviews given), 📣 Connector
- **Competition** — e.g. ⭐ Bronze Tier, 🔒 Silver Tier, 🔒 Gold Tier (tier reached)

Each entry: `{ id, category, icon, title, description, unlocked, progress? }`.
Locked entries show a lock + **progress toward unlock** ("3 / 10 games"). Catalog
is pure config so seasonal/new achievements are additions, not rewrites (§10).
Overview: horizontal rail of a few highlights. Achievements tab: full grid by
category.

Targets must be grounded in real counters; only ship achievements whose
unlock condition is computable from existing data.

---

## 9. MotivationCard (dynamic, never hardcoded)

A single prompt chosen at render from real data, by priority:
1. If `pointsToNext > 0`: **"{pointsToNext} REP until {nextTier}."**
2. Else if streak active and a game would extend it: **"Join 1 more game this
   week to keep your {streak}-week streak alive."**
3. Else nearest locked achievement: **"Complete {target-current} more games to
   unlock {title}."**
4. Fallback (max tier, all near-term goals met): an encouraging line derived
   from their top sport.

Implemented as a pure `motivationFor(profile)` helper (unit-tested) — no
hardcoded strings tied to a specific user.

---

## 10. Tabs

In-page tabs via `ProfileTabs`. **Overview is lightweight.**

- **Overview** (own): Hero → RankProgress → StatStrip → UpcomingCard → Timeline
  (5) → Achievements rail → MotivationCard.
- **Games**: cards (not a plain list) grouped **Upcoming · Completed ·
  Cancelled** (joined + organized games). Visible to any viewer.
- **Bookings** (own only): grouped by **type** — Coach Sessions · Workshops ·
  Camps · Events — each with **Upcoming · Completed · Cancelled** subgroups.
- **Achievements**: full categorized grid. Visible to any viewer.
- **Settings** (own only): links to existing `/profile/edit` (no duplication).

**Others' profile** (viewer ≠ owner): tabs = **Overview · Games · Achievements**.
Overview for others = Hero + RankProgress + StatStrip + Achievements rail only —
no UpcomingCard, MotivationCard, timeline of private actions, Settings, or
Bookings.

---

## 11. API changes (`/api/users/[id]`)

Extend the existing route; **gate private data to the owner** (compare session
user id to `[id]`):

- **Always returned** (any viewer): core profile, `playerRank`, `gamesPlayed`,
  `gamesOrganized`, `attendanceRate`, `reputationScore`, `tier`, `sports`,
  `createdAt`, the **games list** (joined + organized, each with a derived
  `groupStatus`: upcoming/completed/cancelled), and the **achievements catalog**
  (unlocked + locked + progress) from `achievements.ts`.
- **Owner only**: `upcoming` (soonest item across all 5 types), `bookings`
  (coach), and `registrations` (camps/events/workshops, each with derived
  status). Non-owners receive these as omitted/empty — fixing the current leak
  where any viewer sees a user's coach bookings.
- Streak continues to come from `/api/users/[id]/activity` (no change there).

Achievement computation runs server-side via the shared lib so client and server
agree. Keep queries efficient (no N+1 fan-out; batch with `Promise.all`).

---

## 12. Visual style & mobile

Dark, premium, sports-inspired, minimal, slightly playful. Smooth gradients,
glassmorphism on hero/cards, animated progress fill + REP count-up, hover/press
micro-interactions. **Mobile-first**, single column on phones; hero → progress →
stats → upcoming → achievements stack naturally; tabs scroll horizontally on
small screens. Looks excellent on mobile / tablet / desktop.

Explicitly avoided: dense tables, heatmaps, graphs, analytics widgets, stat
accordions, enterprise-SaaS chrome, excessive borders, information overload.

---

## 13. Future-ready (no redesign for these later)

Design so these slot in by adding data/props, not restructuring:
- **Profile banners / frames** — optional `bannerUrl` / `frame` props on
  `PlayerHeroCard`.
- **Premium memberships** — optional `membership` badge slot on the hero;
  achievement category list is open.
- **Seasonal achievements** — `achievements.ts` catalog supports a `season`
  field; rendering is category-driven, so new entries just appear.
- **Team memberships** — Overview composes panels by a config array, so a future
  "Teams" panel/tab is an addition.

---

## 14. Verification

- Unit tests (vitest): `achievements.ts` (`computeAchievements`),
  `profileGrouping.ts` (bucketing), `motivationFor` (priority logic).
- `tsc --noEmit` clean; `npm run build` green.
- Manual check on own + other-user profiles at mobile / tablet / desktop widths
  (noting the local Upstash 500 caveat for authed routes).
- Deliverables on completion: screenshots (desktop + mobile), and the
  components changed / removed / added list.

## Out of scope (YAGNI)
- Building a daily streak (real weekly streak is used).
- Actual cosmetics content (banners/frames/memberships) — only the extension
  points are added now.
- Redesigning `/profile/edit` (Settings links to it).
- Win-rate or any metric not reliably tracked.
