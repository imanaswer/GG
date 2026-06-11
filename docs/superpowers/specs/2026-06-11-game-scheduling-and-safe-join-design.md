# Game Scheduling Validation, Picker Redesign & Safe Join — Design

**Date:** 2026-06-11
**Status:** Approved (design); pending spec review

## Goal

Three connected problems:

1. Games can be created (and, in any future edit flow, edited) into the past.
2. The create-game date/time picker UX is poor (raw `<input type="date|time">`).
3. Joining a past/expired game surfaces a raw Prisma error to the user
   (`Invalid prisma.gamePlayer.create() invocation: Null constraint violation...`),
   and there is no validation preventing joins of past/closed games.

Underlying all three: friendly, structured errors only — no Prisma/stack/DB text
ever reaches the UI.

## Decisions (confirmed with user)

- **Date/time picker:** custom-built React component, **no new dependency**
  (framer-motion is already installed). Matches the app's bespoke premium UI.
- **Error envelope:** keep the existing `{ ok, error }` shape used by every route
  and the frontend fetcher `f`. We satisfy the spec's intent (`{ success: false,
  message }`) by **hardening the shared `handleErr`**, not by renaming fields
  across ~30 consumers.
- **15-minute scheduling buffer:** included (item 5) — applies everywhere via the
  shared helper.

## Root-cause analysis (verified in code)

- **Raw Prisma error in UI:** `handleErr` (`src/lib/api.ts:12`) does
  `if (e instanceof Error) return fail(e.message, 400)` — it echoes the raw error
  message. Chain: `handleErr` → `fail(e.message)` → JSON `{ ok:false, error:<raw> }`
  → frontend fetcher `f` (`src/hooks/useData.ts:10`) throws `new Error(j.error)` →
  `onError: toast.error(e.message)`. So the raw Prisma text is rendered verbatim.
- **Join has no time check:** `POST /api/games/[id]` (`src/app/api/games/[id]/route.ts`)
  validates existence, ownership, cancelled/completed/archived, already-joined, and
  slots — but never checks whether the start time has passed. Past games (still
  `status:"open"` because rewards/finalize never ran) are joinable.
- **Null `userId` path:** `gamePlayer.create({ data: { gameId: id, userId: session.id } })`
  can only write a null/missing `userId` if `session.id` is undefined (stale/malformed
  JWT). Defensive guard added; the deterministic gaps are the missing time check + the
  leaky error handler.
- **Create has no past-date check:** `CreateGameSchema` (`scheduledAt: z.string().datetime()`)
  accepts any valid datetime, including the past.
- **Race condition (confirmed):** join is check-then-act *outside* a transaction —
  it reads `slotsLeft`, checks `<= 0`, then in a separate `$transaction` creates the
  `GamePlayer` and decrements. Two concurrent requests on the last slot both pass the
  check → overbooking (`slotsLeft` can go negative). The `@@unique([gameId, userId])`
  only stops the *same* user double-joining, not two different users overbooking.
- **No edit/reschedule routes exist today:** there are no PATCH/PUT handlers on games;
  `admin/games/[id]` only does finalize/cancel/attendance (not `scheduledAt`). Item 1 is
  therefore a forward-looking standing requirement, not a route to build now.

## Components

### 1. Shared pure logic — `src/lib/gameTime.ts` (new, fully unit-tested)

One module imported by both frontend and backend so the rules cannot drift.

- `SCHEDULE_BUFFER_MIN = 15`
- `timeSlots(intervalMin = 15): { value: string; label: string }[]`
  — 96 slots/day, e.g. `{ value: "18:15", label: "6:15 PM" }`.
- `isSlotPast(slotValue: string, dateStr: string, now: Date): boolean`
  — for a slot on `dateStr`, is it at/earlier than `now` (only meaningful when
  `dateStr` is today).
- `validateGameSchedule(scheduledAtISO: string, now: Date): { ok: true } | { ok: false; message: string }`
  — ordered:
  - `scheduledAt <= now` → `{ ok:false, message: "This game cannot be scheduled in the past." }`
  - `scheduledAt < now + 15min` → `{ ok:false, message: "Games must be scheduled at least 15 minutes in advance." }`
  - else `{ ok:true }`
- `joinability(game, now: Date, userId: string): string | null`
  — pure; takes an already-fetched game `{ organizerId, status, scheduledAt, duration }`.
  Returns the **first** failing message, or `null` if joinable. Order:
  1. `organizerId === userId` → `"You are already the host of this game."`
  2. `status ∈ {cancelled, completed, archived}` → `"This game is no longer accepting players."`
  3. `now >= scheduledAt + duration*60s` → `"This game has already ended."`
  4. `now >= scheduledAt` → `"This game has already started."`
  (Already-joined and full/slot checks stay in the route because they need extra DB
  queries; the host check is moved here and runs **before** the duplicate-player check,
  per item 2.)

### 2. Backend — create (`POST /api/games`)

After `CreateGameSchema.parse(body)`, call `validateGameSchedule(input.scheduledAt, new Date())`;
if not ok → `fail(result.message, 400)`. Explicit check (not a Zod `.refine`) so the
message is clean rather than a 422 field-error blob.

### 3. Backend — join (`POST /api/games/[id]`)

- Add defensive `if (!session.id) return fail("Authentication required", 401)` (closes
  the null-`userId` path).
- Fetch game with `{ organizerId, status, scheduledAt, duration, slotsLeft }`.
- `404` if not found.
- Run `joinability(game, now, session.id)`; if it returns a message → `fail(message, 400)`.
  (Host check now lives here, message `"You are already the host of this game."`, before
  the duplicate check.)
- Already-joined check (existing) → `"You have already joined this game."` (409).
- **Race-safe capacity claim** (item 4): replace check-then-act with an atomic
  conditional update inside one transaction, mirroring the finalize handler's
  `updateMany`-with-guard pattern:
  ```
  const claim = await prisma.game.updateMany({
    where: { id, slotsLeft: { gt: 0 }, status: "open" },
    data: { slotsLeft: { decrement: 1 } },
  });
  if (claim.count === 0) { ...full → existing waitlist behavior... }
  // else create the GamePlayer; if status should flip to "full", update it.
  ```
  `updateMany` with the `slotsLeft: { gt: 0 }` guard is atomic in Postgres, so only one
  of two concurrent last-slot joins succeeds; the loser falls through to waitlist. The
  `GamePlayer.create` is wrapped so a unique-violation (same user, P2002) maps to a
  friendly "already joined" via the hardened `handleErr`. Flip `status:"full"` when
  the decrement brings `slotsLeft` to 0.

### 4. Edit / reschedule / admin-edit (item 1)

No such routes exist yet. **Standing requirement:** any future edit/reschedule/admin-edit
flow that can change `scheduledAt` MUST call `validateGameSchedule()` with the same
semantics. Documented here; no route built in this change (YAGNI — not requested).

### 5. Error-handling hardening — `handleErr` (`src/lib/api.ts`)

Stop echoing raw `e.message`. New behavior:

- `ZodError` → 422 friendly (unchanged).
- New lightweight `ApiError` class (carries `userMessage` + `status`) → passed through
  as `fail(userMessage, status)`. Grep `src/app/api` for `throw new Error("user-facing…")`
  and convert the few intentional ones to `ApiError`/`fail` so no intended message is lost.
- `Prisma.PrismaClientKnownRequestError` → mapped + **server-logged**. `handleErr` is
  context-agnostic, so each code maps to one neutral message (route-specific cases like
  "already joined" are handled explicitly in the route, before the DB call):
  - `P2002` (unique) → `"This conflicts with an existing record."`
  - `P2025` (not found) → `"The requested item no longer exists."`
  - `P2011 / P2012 / P2003` (null/missing/fk) → `"Missing required information."`
- Anything else (incl. `PrismaClientValidationError`, unknown) → `console.error` the
  real error server-side, return generic `"Something went wrong. Please try again."` (500).

Because `handleErr` is shared by every route, this guarantees no Prisma/stack/DB text
reaches the UI across all game-related (and other) APIs.

### 6. Frontend — `DateTimePicker` + create-game page

New `src/components/ui/DateTimePicker.tsx`:

- **Calendar:** month grid with prev/next nav; past dates disabled and unclickable;
  today highlighted (ring); selected highlighted (fill); responsive, touch-friendly
  targets; framer-motion for open/transition.
- **Time:** scrollable list of 15-min slots (`timeSlots()`), labels like `6:00 PM`;
  when the selected date is today, slots where `isSlotPast` is true are disabled;
  auto-scrolls to the first enabled slot.
- Emits the chosen `{ date, time }`; create-game page composes `scheduledAt` as before.
- On submit, the page also runs `validateGameSchedule` and shows a friendly toast if it
  fails — backend remains authoritative.

### 7. Frontend join-action audit (item 3)

Audit every surface that renders a Join action — `game/[id]/page.tsx`, `play/page.tsx`
cards, and any shared game card/`page.tsx` listing — and ensure games with status
`cancelled`, `completed`, or `archived` do **not** show a Join button (show a status
chip instead). Backend remains authoritative; this is UX hygiene.

### 8. Tests (TDD)

Vitest unit tests:
- `gameTime.ts`: `timeSlots` (count/format), `isSlotPast`, `validateGameSchedule`
  (past, within-buffer, ok, boundary at exactly now and now+15), `joinability`
  (each branch + ordering: host before duplicate, ended before started).
- `handleErr`: Prisma known-error → mapped/generic (never raw), `ApiError` passthrough,
  plain `Error` → generic.

## Out of scope (YAGNI)

- Renaming the `{ ok, error }` envelope to `{ success, message }`.
- Building an edit/reschedule route (none requested; standing requirement documented).
- Changing payment-driven join (`payments/verify`) beyond it sharing the hardened
  `handleErr`.
- Any calendar/date library.
