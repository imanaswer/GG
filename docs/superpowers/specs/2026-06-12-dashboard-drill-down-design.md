# Dashboard drill-down navigation — design

**Date:** 2026-06-12
**Status:** Approved (pending user review of this spec)

## Goal

Turn the admin dashboard's metric cards (`/admin/page.tsx`) from static numbers into
navigation shortcuts. Clicking a card deep-links to the relevant admin page with the
filters that reproduce the card's number already applied, plus a visible chip/banner
explaining why the page is filtered.

**Hard invariant:** for every card that lands on a filtered list, the list's total must
equal the number shown on the card. The metric and the destination must never disagree.

Scope is **deep-links only**. The optional preview modal/drawer and the future
per-record "View Details" page are explicitly out of scope for this phase.

## Card → destination map

The dashboard renders 7 metric cards. Final mapping:

| Card | Destination | Why / chip |
|---|---|---|
| Total Users | `/admin/users` | navigate only, no filter |
| Active Coaches | `/admin/coaches` | navigate only, no filter |
| Active Bookings | `/admin/bookings/coaches?status=active` | chip: "Pending + Approved coach bookings" |
| Games This Week | `/admin/games?range=week` | chip: "Open/full games scheduled in the last 7 days" |
| Camp Registrations | `/admin/bookings/camps?date=all` | chip: "All camp registrations" |
| Workshop Sign-ups | `/admin/bookings/workshops?date=all` | chip: "All workshop registrations" |
| Revenue (Month) | `/admin/revenue` | navigate only, no filter |

### Why these destinations (the non-obvious parts)

- **Active Bookings counts only coach bookings.** The metric is
  `prisma.booking.count({ where: { status: { in: ["pending","approved"] } } })`, and the
  `Booking` model is the coach-booking model. The camps/workshops/events/play-sessions
  categories are separate models with different status vocabularies and are *not* in that
  number. The `/admin/bookings` landing page is a hub of 5 category cards with no unified
  "active" total, so it can never match the card. Therefore the card deep-links to the
  **coaches** booking list filtered to pending+approved. (User-confirmed.)

- **`active` is a pseudo-status.** Coach statuses are
  pending/approved/rejected/completed/cancelled — there is no single "active" status.
  `status=active` is interpreted server-side as `status IN (pending, approved)`.

- **Camps/Workshops need `date=all`.** `BookingsCategoryView` defaults its date filter to
  `upcoming`, which for calendar-mode categories filters the session date to
  `>= today` — hiding past registrations. But the metrics are
  `campRegistration.count()` / `workshopRegistration.count()` = **all** registrations.
  Without `date=all` the list would show fewer rows than the card, breaking the invariant.
  Coaches do **not** need `date=all`: `coachDateWhere` treats the default `upcoming` preset
  as a no-op, so the coach list already matches the (date-less) metric. Omitting `date=all`
  there also keeps the coaches banner clean ("Pending + Approved" with no date clause).

- **Games "this week" replicates the metric arithmetic exactly.** The metric is
  `scheduledAt >= now - 7*86400000ms` AND `status IN (open, full)` — a raw 7-day rolling
  window, **not** an IST calendar week. The filter must use the same raw millisecond
  arithmetic, not the IST day-bounds helpers in `adminBookings/query.ts`.

## Components & changes

### 1. `StatCard` (`src/components/admin/StatCard.tsx`)

Add an optional `href?: string` prop.

- When `href` is present, render the card as a Next.js `<Link href={href}>` (proper anchor
  semantics: keyboard focus, Cmd/Ctrl-click and "open in new tab" work for free) with a
  hover affordance — cursor pointer + red border highlight matching the dashboard's
  existing quick-links (`rgba(230,57,70,0.4)` on hover).
- When `href` is absent, render exactly as today (a plain `<div>`). The games-page
  StatCards pass no `href` and are visually unchanged.

All existing visual styling (value/label/sub/icon/accent) is preserved in both branches.

### 2. Dashboard page (`src/app/admin/page.tsx`)

Pass `href` to each of the 7 metric cards per the map above. No other change.

### 3. Games page (`src/app/admin/games/page.tsx`)

- Read `?range=week` via `useSearchParams()`.
- New pure, unit-tested helper (new file `src/lib/adminGames.ts`):
  ```ts
  export const GAMES_WEEK_MS = 7 * 86_400_000;
  export function isGameInMetricWeek(
    scheduledAt: string, status: string, now: Date,
  ): boolean {
    if (status !== "open" && status !== "full") return false;
    const t = new Date(scheduledAt).getTime();
    if (Number.isNaN(t)) return false;
    return t >= now.getTime() - GAMES_WEEK_MS;
  }
  ```
  This mirrors the overview metric's predicate byte-for-byte.
- When `range=week`, filter `games` through this predicate **before** bucketing into
  Today/Tomorrow/Upcoming/Past.
- Show a dismissible filter chip: "Showing open/full games scheduled within the last
  7 days" with a ✕ that clears the filter (a `<Link href="/admin/games">`).

### 4. `BookingsCategoryView` (`src/components/admin/bookings/BookingsCategoryView.tsx`)

- Seed initial filter state from the URL via `useSearchParams()`:
  - `status` initial = `searchParams.get("status") ?? "all"`
  - `tb.date` initial = `searchParams.get("date") ?? "upcoming"` (other toolbar fields keep
    their current defaults)
- Add a filter banner shown when `status !== "all"` OR `date !== "upcoming"`. The banner
  reflects the *current* effective filter so it stays accurate as the user changes filters,
  and disappears when filters return to default. Text is built from:
  - status part: `active` → "Pending + Approved"; other non-`all` → `STATUS_LABELS[status]`;
    `all` → omitted
  - date part: `all` → "all dates"; otherwise omitted (the toolbar already shows the date
    preset, so we only surface the deep-link-relevant `all` case)
  - Example results: "Showing Pending + Approved Coaches bookings",
    "Showing all Camps registrations".
  - Includes a "Clear" action that resets to `status=all`, `date=upcoming`.

### 5. `coachWhereForStatus` (`src/lib/adminBookings/status.ts`)

Add the `active` pseudo-status:
```ts
export function coachWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  if (bucket === "active") return { status: { in: ["pending", "approved"] } };
  return { status: bucket };
}
```
The coach `counts` query is computed with `status: "all"`, so per-status SummaryCards
counts are unaffected. Only the filtered `where`/`total` honor `active`.

## Edge cases & notes

- **No SummaryCards tab highlights when `status=active`** — there is no "active" tab. This
  is acceptable; the banner carries the meaning. Clicking any real tab switches `status`
  and updates/clears the banner normally.
- **`useSearchParams` Suspense:** this Next.js version may require a `<Suspense>` boundary
  around components that call `useSearchParams()`. Verify against
  `node_modules/next/dist/docs/` during implementation and wrap if required.
- **AGENTS.md:** this is a modified Next.js. Read the relevant routing docs
  (`Link`, `useSearchParams`) under `node_modules/next/dist/docs/` before writing code.

## Testing & verification

- **Unit:** test `isGameInMetricWeek` (open/full pass, other statuses fail, boundary at
  `now - 7d`, NaN date → false).
- **Type/build:** `tsc`/lint clean.
- **The real check — invariant verification (manual/Playwright):** load `/admin`, then for
  each filtered card confirm the destination list total equals the card number:
  Active Bookings == coach pending+approved, Games This Week == open/full ≥ now-7d,
  Camp/Workshop == all registrations. Per project memory, local authed admin APIs can 500
  under Upstash rate-limit placeholders; intercept/mocked APIs in Playwright if needed to
  verify the authed UI.

## Out of scope (future phases)

- Preview modal/drawer on card click (today/tomorrow/upcoming + "View All").
- Per-record "View Details" page (user, contact, venue, date/time, status, payment, notes,
  history).
- Redefining "Active Bookings" as a platform-wide cross-category needs-action metric.
