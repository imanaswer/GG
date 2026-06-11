# Admin date-based organization — foundation slice

**Date:** 2026-06-12
**Status:** Approved design, ready for implementation plan
**Author:** brainstorming session

## Goal

Operational visibility for admins: organize each booking module by the **actual
session/event date** so an admin can immediately see **what is happening Today,
Tomorrow, and Upcoming** — instead of a flat list sorted by booking-creation date.

This is the foundation slice. It deliberately **defers** the calendar view,
analytics/reporting, the dashboard "today" widget, structured Sport/Venue/
Coach/Organizer filters, and folding the standalone Games/Venues admin pages
into the unified system. Those come in later cycles.

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
3. **Default view per tab:** preset `upcoming`, sorted soonest-first, grouped by day.
4. **Group by calendar day**, client-side, with a `Group by date` toggle. Day
   headers show `Wed, Jun 10, 2026` with relative `Today` / `Tomorrow` labels on
   matching days. Server still does all filtering/sorting/pagination; grouping is
   pure presentation over the returned page (a day may straddle a page edge — fine).
5. **Coaches use weekday matching** (recurrence, not calendar dates) — see below.
6. **Keep** existing search, pagination, status filters, CSV export, bulk actions.

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
  today/tomorrow; surfaced under an "Unscheduled" group).
- Grouping for coaches is **by weekday** (Mon…Sun + Unscheduled), not calendar day,
  because the records recur. `toRow` sets `sessionDate = null` for coaches; the row
  carries the weekday in `extra` (already has batch info via `extra.session`).
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

- When `group="day"`, group the returned page's rows:
  - date modules → bucket by IST calendar day of `sessionDate`; header text
    `formatDayHeader(date)` → `Today` / `Tomorrow` / `Wed, Jun 10, 2026`.
  - coaches → bucket by weekday (from `extra`), plus an `Unscheduled` bucket.
  - Rows with null session date (date modules) sink into an `Unscheduled` bucket.
- When `group="off"`, render the existing flat table.
- A new small presentational helper (e.g. `groupRowsByDay` in a `grouping.ts`)
  keeps the view component lean and unit-testable.

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

- `groupRowsByDay` buckets calendar rows by IST day with correct Today/Tomorrow labels;
- coach rows bucket by normalized weekday; null/odd values → "Unscheduled".

Existing route/status/csv tests must stay green.

## Out of scope (deferred — stated so "across all modules" is managed)

- Calendar view (month/week/day).
- Dashboard "Today's sessions / upcoming actions" widget.
- Structured Sport / Venue / Coach / Organizer filters.
- Date-range reporting / analytics / revenue-by-period.
- Folding the standalone `/admin/games` and `/admin/venues` pages into the unified
  bookings system (Games are covered here via the `play-sessions` tab; the separate
  games admin page is unchanged this slice).
- Deriving full calendar occurrences for coach batches (we use weekday match only).
