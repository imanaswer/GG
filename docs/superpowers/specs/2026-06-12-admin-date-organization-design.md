# Admin date-based organization — foundation slice

**Date:** 2026-06-12
**Status:** Approved design, ready for implementation plan
**Author:** brainstorming session

## Goal

Operational visibility for admins: organize each booking module by the **actual
session/event date** so an admin can immediately see **what is happening Today,
Tomorrow, and Upcoming** — instead of a flat list sorted by booking-creation date.

This is the foundation slice. It covers the five unified booking tabs **and** the
standalone `/admin/games` page. It deliberately **defers** the calendar view,
analytics/reporting, the dashboard "today" widget, structured Sport/Venue/
Coach/Organizer filters, the `/admin/venues` page, and any deeper refactor of the
Games page to share components. Those come in later cycles.

## Context: what already exists

The unified admin-bookings system in `src/lib/adminBookings/` already covers five
categories — `coaches`, `play-sessions`, `workshops`, `camps`, `events` — each with:

- a shared server route pattern (`src/app/api/admin/bookings/<cat>/route.ts`) doing
  server-side filtering, pagination, status counts, CSV export, bulk actions;
- a shared client view (`BookingsCategoryView`) + toolbar (`BookingsToolbar`);
- shared helpers in `query.ts` (pagination, date range, sort), `status.ts`, `config.tsx`, `types.ts`.

**The core gap:** the date filter currently operates on the *booking-creation*
timestamp (`registeredAt` / `joinedAt` / `createdAt`) and the day-boundary math is
done in **UTC**, so "Today" is wrong by +5:30 for this single-city (Kozhikode / IST)
app. We switch the primary date axis to the **session/event date**, computed in IST.

### Session-date source per module (verified against `schema.prisma`)

| Category (tab)   | Module noun | Session date source        | Column type |
|------------------|-------------|----------------------------|-------------|
| `play-sessions`  | Games       | `game.scheduledAt`         | `DateTime`  |
| `camps`          | Camps       | `camp.startDate`           | `DateTime`  |
| `workshops`      | Workshops   | `workshop.startDate`       | `DateTime`  |
| `events`         | Events      | `event.startDate`          | `DateTime`  |
| `coaches`        | Coach bookings | **none** — recurring `batch.day` (weekday string) | — |

All four date-bearing fields are full `DateTime` (no `@db.Date`). Because IST has no
DST (fixed +5:30), a **single IST day-boundary helper** buckets every `DateTime`
value into the correct IST calendar day regardless of whether it was stored as a
real event instant or a midnight value. No per-module timezone special-casing.

## Design decisions (locked during brainstorming)

1. **Date axis = session date, default.** New query param `by=session|booking`
   (default `session`). A small "By: Session date / Booking date" toggle in the
   toolbar lets admins still find "bookings made today" via `by=booking`.
2. **Presets narrowed to the operational set:** `today`, `tomorrow`, `upcoming`
   (≥ start of today), plus `past`, `all`, and `custom` retained for completeness.
   The legacy rolling `week` / `month` presets are replaced. `Completed` and
   `Cancelled` remain **status** filters (existing `SummaryCards`) — they are NOT
   duplicated as date presets.
3. **Default view per tab:** preset `upcoming` (session ≥ start of today),
   sorted soonest-first, grouped into the three relative buckets below.
4. **Group into three relative buckets — `Today` / `Tomorrow` / `Upcoming`** —
   rendered as collapsible sections (▼), client-side. `Today` = session falls on
   the current IST calendar day; `Tomorrow` = next IST day; `Upcoming` = everything
   later. (NOT per-calendar-day headers — the admin examples show exactly these three
   collapsible sections.) Within `Upcoming`, rows stay sorted soonest-first and each
   row shows its own date. Server still does all filtering/sorting/pagination;
   bucketing is pure presentation over the returned page.
5. **Coaches use weekday matching** (recurrence, not calendar dates): `Today` =
   batch meets today's weekday, `Tomorrow` = tomorrow's weekday, `Upcoming` = all
   other batches; batch-less bookings → `Unscheduled`. See below.
6. **Keep** existing search, pagination, status filters, CSV export, bulk actions.
7. **Standalone `/admin/games` page is in scope** — it gets the same
   Today/Tomorrow/Upcoming bucketing (most operationally important: "what matches
   are on today"), reusing the shared IST date core. See its own section.

## Architecture

### 1. Timezone + presets core — `src/lib/adminBookings/query.ts`

Add IST-aware helpers (fixed +5:30 offset, no DST):

- `istDayBounds(now, offsetDays)` → `{ gte, lte }` UTC instants for the IST calendar
  day `offsetDays` away from `now`.
- `parseDateRange(p, now)` extended to the new presets:
  - `today` → `istDayBounds(now, 0)`
  - `tomorrow` → `istDayBounds(now, +1)`
  - `upcoming` → `{ gte: start-of-today-IST }` (no upper bound)
  - `past` → `{ lt: start-of-today-IST }`
  - `all` → undefined
  - `custom` → from/to as IST day bounds (existing behaviour, IST-corrected)
- `parseSort` default becomes `upcoming` (session asc); `orderByFor` already
  supports a session field. When ordering by the session relation, use Prisma
  `{ nulls: "last" }` so null/undated rows sink.

### 2. Per-route session-date wiring — the four date modules

Each of `play-sessions`, `camps`, `workshops`, `events` route's `buildWhere`/order
gains a `by`-aware branch:

- `by=session`: apply the range to the **related** date field via nested relation
  filter, e.g. camps → `where.camp = { startDate: { gte, lte } }`, order →
  `{ camp: { startDate: dir } }`. (Prisma supports relation `where`/`orderBy`.)
- `by=booking`: existing behaviour on `registeredAt` / `joinedAt`.

The route's `toRow` already emits `sessionDate` — unchanged. CSV export respects the
same `where`.

### 3. Coaches — weekday matching — `coaches/route.ts` + a small helper

A coach `Booking` has no date; it has an optional `batch` with `day` (weekday string,
e.g. `"Monday"`) and `time`. Operational meaning of "today's coach bookings" =
**batches that meet today**.

- New helper `weekdayName(date, istOffset)` and a normalizer matching `batch.day`
  values to a canonical weekday (case-insensitive, trim).
- `by=session` presets map to weekday filters, server-side:
  - `today` → `where.batch = { day: <todayWeekdayIST> }`
  - `tomorrow` → `where.batch = { day: <tomorrowWeekdayIST> }`
  - `upcoming` / `all` → no weekday filter (batches recur indefinitely)
- Bookings with `batchId = null` → treated as **"Unscheduled"** (excluded from
  today/tomorrow; surfaced under an "Unscheduled" bucket below `Upcoming`).
- The three-bucket view still applies to coaches: a row goes to `Today` if its batch
  weekday is today's, `Tomorrow` if tomorrow's, `Upcoming` otherwise, `Unscheduled`
  if no batch. `toRow` sets `sessionDate = null` for coaches and carries the weekday
  in `extra` (already has batch info via `extra.session`) so the client can bucket it.
- `by=booking` for coaches falls back to the normal calendar presets on `createdAt`.

### 4. Toolbar — `src/components/admin/bookings/BookingsToolbar.tsx`

- Replace the date `<select>` options with: All dates / Today / Tomorrow / Upcoming /
  Past / Custom.
- Add a `By:` toggle (Session date | Booking date) bound to `ToolbarState.by`.
- Add a `Group by date` switch bound to `ToolbarState.group` (`"day" | "off"`).
- Per-category awareness: a `supportsSessionDate` / `dateMode` hint from
  `CategoryConfig` lets the coaches tab label the toggle appropriately and the
  grouped view pick weekday vs calendar-day headers.

### 5. Grouped rendering — `BookingsCategoryView`

- When `group="day"` (default), bucket the returned page's rows into the three
  collapsible sections **Today / Tomorrow / Upcoming** (+ **Unscheduled** when any
  row lacks a date), via a shared helper `bucketRows(rows, dateMode, now)`:
  - `dateMode="calendar"` (the four date modules) → compare each row's `sessionDate`
    against IST today/tomorrow bounds; later → `Upcoming`; null → `Unscheduled`.
  - `dateMode="weekday"` (coaches) → compare each row's batch weekday to
    today's/tomorrow's IST weekday; else `Upcoming`; no batch → `Unscheduled`.
  - Empty buckets are hidden. Each section header shows its label + a count and is
    collapsible (▼/▶). `Upcoming` rows show their own date inline.
- When `group="off"`, render the existing flat table.
- The helper lives in a new `src/lib/adminBookings/grouping.ts`, pure + unit-tested.

### 5b. Standalone Games page — `/admin/games`

The Games Tracker (`src/app/admin/games/page.tsx` + `api/admin/games/route.ts`) is a
single un-paginated fetch, flat table, sorted by `createdAt desc`. Bring it into the
same operational model with minimal churn:

- Route: order by `scheduledAt asc` instead of `createdAt desc` (stats unchanged).
- Page: reuse the shared IST date core + `bucketRows(..., "calendar", now)` to render
  the games table as **Today / Tomorrow / Upcoming** collapsible sections (with a
  `Past` section, collapsed by default, for older/cancelled/completed games so the
  drawer/finalize flow stays reachable). The existing row markup, detail drawer, and
  admin actions are unchanged — only the list is wrapped in date sections.
- No pagination is added this slice (the list is bounded); grouping is client-side
  over the fetched set, consistent with the page's current shape. If volume grows, a
  server-side date filter can be added later without changing the UI contract.

### 6. Types — `src/lib/adminBookings/types.ts`

- `DatePreset = "all" | "today" | "tomorrow" | "upcoming" | "past" | "custom"`.
- `DateAxis = "session" | "booking"`.
- `ToolbarState` gains `by: DateAxis` and `group: "day" | "off"`.
- `CategoryConfig` gains a `dateMode: "calendar" | "weekday"` field.

## Data flow

1. Toolbar state (`q`, `status`, `date` preset, `by`, `group`, `from/to`, `sort`,
   `page`) → query string.
2. Route `GET` builds a `where` from status + the `by`-aware date filter, orders by
   session (or booking) field with `nulls: last`, paginates server-side, returns
   `{ rows, total, page, pageSize, counts }` (unchanged shape — `sessionDate`
   already present).
3. Client renders: if `group="day"`, `groupRowsByDay(rows, dateMode)` injects
   headers; else flat table. Pagination/status/search/CSV all unchanged.

## Edge cases & correctness

- **IST 00:00–05:30 boundary:** the canonical bug. Pinned by tests asserting that a
  session at `2026-06-12T19:00:00Z` (= 00:30 IST Jun 13) buckets to Jun 13, not Jun 12.
- **Null session dates** (date modules) → `nulls: last` in orderBy + "Unscheduled"
  group; never appear in Today/Tomorrow.
- **Coach `batch.day` format variance** → normalize case/whitespace; unknown/empty →
  "Unscheduled".
- **Coach `by=session` + `upcoming`** → no weekday filter (recurs forever), grouped by
  weekday.
- **Page-straddling days** → accepted; a calendar day can continue onto the next page.

## Testing

Extend `src/lib/adminBookings/query.test.ts` (TDD, before route changes):

- new presets `today` / `tomorrow` / `upcoming` / `past` produce correct **IST** UTC
  bounds, including the 00:00–05:30 IST edge;
- `parseSort` default = `upcoming`; orderBy emits `nulls: last` for the session field.

Add `grouping.test.ts`:

- `bucketRows(..., "calendar", now)` sorts calendar rows into Today / Tomorrow /
  Upcoming / Unscheduled correctly across the IST midnight + 00:00–05:30 edge;
- `bucketRows(..., "weekday", now)` buckets coach rows by normalized weekday;
  batch-less / unparseable → "Unscheduled".

Existing route/status/csv tests must stay green. Manually verify the
standalone `/admin/games` page renders the three sections after the reorder.

## Out of scope (deferred — stated so "across all modules" is managed)

- Calendar view (month/week/day).
- Dashboard "Today's sessions / upcoming actions" widget.
- Structured Sport / Venue / Coach / Organizer filters.
- Date-range reporting / analytics / revenue-by-period.
- Folding the standalone `/admin/venues` page into the unified system, and
  refactoring `/admin/games` to share the `BookingsCategoryView` component (this
  slice only adds date sections to the existing Games page in place).
- Deriving full calendar occurrences for coach batches (we use weekday match only).
