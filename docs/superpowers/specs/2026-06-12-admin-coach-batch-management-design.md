# Admin Coach Batch Management — Design

**Date:** 2026-06-12
**Status:** Approved (ready for implementation plan)

## Problem

Coaches can be created and edited from **Admin → Coaches**, but there is no
workflow for creating or managing a coach's **batches**. The `Batch` model
already exists (`schema.prisma:94` — `{ id, coachId, day, time, level, seats }`),
yet:

- The **only** code path that ever creates a batch is coach self-registration
  (`/api/coaches/register`). Those batches are frozen afterward — nothing can
  edit or delete them.
- The admin coaches API (`/api/admin/coaches`) **GET**s batches but the UI never
  shows them, and **POST/PUT ignore batches entirely**. An admin-created coach
  therefore has zero batches and no way to add any.
- The coach dashboard shows "Active Batches: 3" as a hardcoded placeholder
  (out of scope here — admin is the chosen management surface).

The public coach page (`/coach/[id]`) and the booking flow (`/api/bookings`)
are already batch-aware: students pick a batch and booking decrements that
batch's `seats`. The missing piece is purely the **admin authoring side**.

## Decisions (from brainstorming)

- **Management surface: Admin only.** Coaches/registration stay read-only
  consumers; admins own batch authoring, consistent with the rest of the
  platform's admin governance.
- **Mental model:** batches are the coach's published schedule options that the
  admin sets when adding/editing the coach, so students can see them and join.
- **No schema change.** The `Batch` model is sufficient.
- **`Batch.seats` is *remaining* availability** (starts at capacity, the booking
  flow decrements it, public page treats `seats === 0` as "Full"). There is no
  separate capacity field; we work with this as-is and do **not** introduce a
  capacity/remaining split.
- **Seat reconciliation:** at **creation** (POST), with batches present, set
  `Coach.totalSeats = seatsLeft = sumSeats(batches)` (no bookings exist yet, so
  this is correct — matches the rule registration already uses). On **edit**
  (PUT), do NOT reset the counters to the batch-seat sum: `Batch.seats` is
  *remaining* availability (the booking flow decrements `batch.seats` and
  `coach.seatsLeft` in lockstep, `bookings/route.ts:72-73`), so resetting would
  wipe booking history and corrupt capacity on every unrelated save. Instead
  apply the **net change** in batch seats as a delta to both coach counters, so
  an unrelated edit is a no-op and added/removed batches adjust availability
  correctly. A coach with no batches keeps using the manual seat fields. Because
  the backend owns the counters whenever batches exist, the edit modal shows a
  read-only hint (not editable seat inputs) in that case.

## Approach

**Approach A — inline batch editor inside the existing Add/Edit Coach modal.**
A repeatable "Batches" section at the bottom of the coach form; saving the coach
saves its batches in the same request. Chosen over a separate per-coach batch
panel (B) and over both (C) because it is the smallest change that fully closes
the gap, reuses the existing modal-driven admin UI, and matches how the workflow
was described ("admins put batches when adding the coach").

## Components

### 1. `src/lib/coachBatches.ts` (new, pure, unit-tested)

Isolated, DB-free logic so the route stays thin and the diff is testable
(mirrors the existing `src/lib/adminBookings/*` split + vitest convention).

- `normalizeBatches(input): Batch[]` — coerce and validate each incoming row
  (`day`, `time`, `level`, `seats`); drop fully-empty rows; reject negative or
  NaN seats. Throws / returns an error signal the route maps to **400**.
- `reconcileBatches(existingIds, incoming): { toCreate, toUpdate, toDeleteIds }`
  — diff incoming rows (those carrying an existing `id` vs. new ones) against the
  batches currently in the DB for that coach.
- `sumSeats(batches): number` — coach seat total.

### 2. `src/app/api/admin/coaches/route.ts`

- **POST** — create the coach with nested `batches.create`; set
  `totalSeats = seatsLeft = sumSeats(batches)`, falling back to the manual value
  when there are no batches.
- **PUT** — inside a `$transaction`:
  1. `reconcileBatches` → create new, update changed, delete removed.
  2. **Before deleting a batch, null out `batchId` on its bookings**
     (`Booking.batchId` is already nullable; the booking still belongs to the
     coach), so deletion never hits a foreign-key error.
  3. Recompute `totalSeats`/`seatsLeft` from the surviving batches.
- Invalid batch payloads → **400** with a message.

### 3. `src/app/admin/coaches/page.tsx`

- `Coach` type and form state gain
  `batches: { id?: string; day: string; time: string; level: string; seats: number }[]`.
  Edit loads the coach's existing batches into the form.
- New inline **"Batches"** section in the Add/Edit modal: one row per batch —
  **Day** (select), **Time** (text, e.g. "6:00–7:00 AM"), **Level** (skill
  select), **Seats** (number), and a per-row **remove** (trash) button — plus a
  **"+ Add batch"** button and an empty state when there are none.
- When ≥1 batch exists, the existing **Total Seats / Seats Left** inputs collapse
  to a read-only "Derived from batches: N" line; with no batches they remain
  manually editable as today.
- Optionally surface a small batch count in the coaches table (GET already
  returns `batches`).

## Data flow

Admin saves coach + batches in one request → admin GET re-fetches with batches →
public coach page and booking flow (already batch-aware) immediately reflect the
published batches. No changes to public or booking code.

## Error handling

- Invalid batch rows rejected with **400** before any write.
- PUT's reconcile (booking-detach + delete) and seat recompute are **atomic** in
  a single transaction — a failure leaves coach and batches consistent.

## Testing

- **TDD** on `src/lib/coachBatches.ts`:
  - `normalizeBatches` — empty-row dropping, negative/NaN seat rejection,
    coercion of string seats.
  - `reconcileBatches` — pure add / pure edit / pure delete / mixed diffs;
    unknown ids; empty incoming wiping all.
  - `sumSeats` — basic and empty.
- Route wiring verified against the existing gate: `tsc --noEmit`,
  `npm run build`, `npm run test` (vitest), `npm run lint`.

## Out of scope

- Coach-side (self-service) batch management.
- Replacing the hardcoded "Active Batches: 3" tile on the coach dashboard.
- Introducing a separate batch capacity vs. remaining-seats field.
- Any change to the public coach page or booking flow.
