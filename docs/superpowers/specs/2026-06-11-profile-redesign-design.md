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
- **`src/lib/season.ts`** — pure season helpers (§15): `currentSeason(now)` →
  `{ id, label, startsAt, endsAt, daysLeft }` (monthly windows) and
  `SEASON_WEIGHTS` (same per-action point weights as the base reputation
  formula) for computing in-window season REP. Unit-tested.
- **`src/lib/profileCompletion.ts`** — pure `computeProfileCompletion(input)`
  → `{ pct, items: { key, label, done }[] }` (§16). Unit-tested.

### Additional new components
- **`SeasonStrip`** — compact seasonal section (§15).
- **`ProfileCompletionCard`** — subtle completion checklist (§16, own-only).

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

**Selection priority** (server-side, deterministic): pick the **nearest upcoming
item by datetime**. When two items share the same datetime, break ties by type
priority: **1) Coach Session, 2) Game, 3) Workshop, 4) Camp, 5) Event.** This
prevents a distant event displacing an imminent coaching session. Encoded as an
explicit `(date asc, typePriority asc)` sort.

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

- **Overview** (own): Hero → RankProgress → StatStrip → SeasonStrip →
  UpcomingCard → ProfileCompletionCard → Timeline (5) → Achievements rail →
  MotivationCard. (RankProgress stays the dominant element; SeasonStrip and
  ProfileCompletionCard are compact and secondary.)
- **Games**: cards (not a plain list) grouped **Upcoming · Completed ·
  Cancelled** (joined + organized games). Visible to any viewer.
- **Bookings** (own only): grouped by **type** — Coach Sessions · Workshops ·
  Camps · Events — each with **Upcoming · Completed · Cancelled** subgroups.
- **Achievements**: full categorized grid. Visible to any viewer.
- **Settings** (own only): links to existing `/profile/edit` (no duplication).

**Others' profile** (viewer ≠ owner): tabs = **Overview · Games · Achievements**.
Overview for others = Hero + RankProgress + StatStrip + SeasonStrip +
Achievements rail only — no UpcomingCard, ProfileCompletionCard, MotivationCard,
timeline of private actions, Settings, or Bookings. (SeasonStrip is public
progression data, like REP/rank.)

---

## 11. API changes

The authoritative, complete list of API changes is **§19**. Summary: extend
`GET /api/users/[id]` with public `games[]`, `achievements[]`, and `season`;
owner-only `upcoming`, `registrations[]`, `profileCompletion`; and gate the
existing `bookings` to the owner. Achievement + season + completion computation
runs server-side via the shared libs so client and server agree. No schema
migration.

---

## 15. Seasonal progress (compact, secondary)

A small strip — **not** the focus; REP progression stays primary. Shows:
**Current Season** label · **REP Earned This Season** · **Season Rank** ·
**Season Ends In X Days**.

Grounded honestly (no fabricated metric):
- `src/lib/season.ts` defines seasons as **monthly windows** (`id` like
  `2026-06`, `label` like "June 2026", `startsAt`, `endsAt`, `daysLeft`) — the
  countdown is real.
- **Season REP** = points from the user's **real activity within the current
  window**, using the same per-action weights as the base reputation formula
  (`SEASON_WEIGHTS`: game joined 10, organized 25, camp 30, event 20, workshop
  15, review 5; no age bonus / decay since the window is fresh). Computed
  server-side from in-window timestamps.
- **Season Rank** = `1 + count of users whose season REP is higher`, computed
  via grouped in-window aggregation (a few `groupBy` queries merged in memory) —
  honest and well-defined, not a placeholder.

`SeasonStrip` is public (same visibility class as REP/rank). The component is
built so future **seasonal leaderboards / events / challenges** attach by adding
data, not redesigning (a `season` field already flows through achievements too).

## 16. Profile completion (subtle, own-only)

A subtle completion loop for new users. `src/lib/profileCompletion.ts` →
`computeProfileCompletion({ hasAvatar, hasFavoriteSport, gamesPlayed,
hasCompletedBooking })` returns `{ pct, items }` over four real checks:

- **Add profile photo** — `avatarUrl` set
- **Add favorite sport** — `sports` non-empty
- **Join first game** — `gamesPlayed ≥ 1`
- **Complete first booking** — a booking with status `completed` exists

`pct` = done/total. Rendered as a small ring/bar + checklist. **Owner-only**
(personal nudge); never shown to other viewers.

## 17. Privacy model (enforced server-side)

| Visibility | Fields |
|---|---|
| **Public** (any viewer) | Profile card, tier, REP, leaderboard rank, achievements, public game history (Games tab), SeasonStrip |
| **Owner only** | Bookings, upcoming item, private registrations (camps/events/workshops), motivation card, profile completion, activity timeline of private actions |

The API compares the session user id to `[id]` and omits owner-only fields for
non-owners. This **fixes the current leak** where any viewer sees a user's coach
bookings.

## 18. Component hierarchy

```
ProfilePage (/profile/[id])
├── PlayerHeroCard          (avatar, name, tier badge, REP, rank, streak, joined, sport; future: banner/frame/membership slots)
├── TierUpBanner            (subtle, one-time celebration — when tier just changed)
└── ProfileTabs
    ├── Overview (own)
    │   ├── RankProgress            ← dominant hero
    │   ├── StatStrip               (4 stats)
    │   ├── SeasonStrip             (season REP / rank / ends-in)
    │   ├── UpcomingCard            (owner-only; priority-sorted next item)
    │   ├── ProfileCompletionCard   (owner-only)
    │   ├── ActivityTimeline        (owner-only; max 5 real items)
    │   ├── AchievementsRail        (highlights)
    │   └── MotivationCard          (owner-only; dynamic)
    ├── Overview (other) → RankProgress · StatStrip · SeasonStrip · AchievementsRail
    ├── GamesTab            (cards grouped Upcoming/Completed/Cancelled)
    ├── BookingsTab (own)   (grouped by type → Upcoming/Completed/Cancelled)
    ├── AchievementsTab     (full categorized grid)
    └── Settings (own) → links to /profile/edit
```

## 19. API changes (complete list)

`GET /api/users/[id]` (extend; detect `isOwner = session.id === id`):
- **Add (public):** `games[]` (joined + organized, each with derived
  `groupStatus: upcoming|completed|cancelled`); `achievements[]` (full catalog
  unlocked + locked + progress, from `achievements.ts`); `season`
  (`{ id, label, daysLeft, rep, rank }` from `season.ts` + in-window aggregation).
- **Add (owner only):** `upcoming` (single nearest item across all 5 types,
  priority-tie-broken per §6); `registrations[]` (camps/events/workshops with
  derived status); `profileCompletion` (`{ pct, items }`). Keep existing
  `bookings` (coach) but **gate to owner** (currently leaked).
- **Gate existing private data:** `bookings` returned only when `isOwner`.
- Streak unchanged (continues from `GET /api/users/[id]/activity`).
- Performance: all additions via batched `Promise.all`; no per-row N+1. Season
  rank uses `groupBy` aggregation, not per-user loops.

No schema migration required — all new values are derived from existing tables
and timestamps. (Documented under "migration steps: none.")

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
  `profileGrouping.ts` (bucketing), `motivationFor` (priority logic),
  `season.ts` (window + daysLeft + season-REP weighting), `profileCompletion.ts`
  (pct + items).
- `tsc --noEmit` clean; `npm run build` green.
- Manual check on own + other-user profiles at mobile / tablet / desktop widths
  (noting the local Upstash 500 caveat for authed routes).
- **Deliverables on completion:** before/after screenshots (desktop + mobile),
  components removed, components added, **bundle impact** (route size delta from
  the build output), and **migration steps** (expected: none — all derived).

## Out of scope (YAGNI)
- Building a daily streak (real weekly streak is used).
- Actual cosmetics content (banners/frames/memberships) — only the extension
  points are added now.
- Redesigning `/profile/edit` (Settings links to it).
- Win-rate or any metric not reliably tracked.
