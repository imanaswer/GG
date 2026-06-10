# Coach Session Approval Workflow — Design

**Date:** 2026-06-10
**Status:** Approved (pending implementation plan)

## Problem

When a player books a coaching session, the booking is created and a seat is
immediately held, but there is no admin review step. Coaches can also confirm
their own bookings. We need an admin-gated approval workflow:

```
Player books → PENDING → Admin reviews → APPROVED or REJECTED → Player notified
```

## Goals

- New bookings are `pending` and require **admin** approval.
- Only admins can approve, reject, or complete a booking. Players and coaches
  cannot approve their own sessions.
- Reject stores a timestamp and optional reason; the player sees a clear message.
- Approval is protected against double-booking.
- Player, coach, and admin dashboards reflect the full status lifecycle.
- Players are notified by email on approval and rejection, reusing existing
  email infrastructure.

## Non-Goals (YAGNI)

- No in-app notification center / `Notification` model. Email + toast only.
- No per-session calendar datetime on bookings. Session timing is derived from
  the linked batch's `day`/`time` strings (the data model has no booking-level
  datetime, and the booking flow does not collect one).
- No change to the seat-hold timing: seats remain held at booking time.
- No automated `completed` transition. Admin marks bookings completed manually.

## Current State (as found)

- `Booking` model: `status` (default `"pending"`), `note`, `coachNote`,
  `userId`, `coachId`, optional `batchId`. No approval timestamps or reason.
- The de-facto "approved" state today is the string `"confirmed"`, which is
  relied on in: `api/coaches/[id]/reviews` (review-eligibility),
  `api/admin/revenue`, `api/admin/overview`, `api/admin/coaches`,
  `api/bookings` GET (coach counts), `coach/[id]/page.tsx` UI, `admin/page.tsx`.
- Seats are decremented when a **pending** booking is created (a hold). Cancel
  releases the seat. There is no reject path yet.
- `/api/bookings` PATCH lets **both** the coach and the player change status —
  a coach can set `"confirmed"` on their own booking (security gap).
- `/api/admin/bookings` PATCH is admin-guarded (`getAdminSessionFromRequest`)
  and can set arbitrary status.
- Booking email templates (`bookingMade`, `bookingConfirmed`,
  `newBookingForCoach`) exist in `src/lib/email.ts` but are **never sent** from
  anywhere. There is no `Notification` model.
- Badge components: `src/components/Shared.tsx` (`StatusBadge`) and
  `src/components/admin/Badge.tsx` only know `pending` / `confirmed` /
  `cancelled`.

## Status Vocabulary

Stored status values become:

| Status      | Meaning                                             |
|-------------|-----------------------------------------------------|
| `pending`   | New booking, awaiting admin review (default)        |
| `approved`  | Admin approved; session confirmed                   |
| `rejected`  | Admin rejected                                      |
| `completed` | Session done (admin-marked)                         |
| `cancelled` | Cancelled by the player or admin                    |

The legacy `"confirmed"` value is migrated to `"approved"` and removed from the
codebase.

## Design

### 1. Data model

Add three non-destructive (nullable) columns to `Booking`:

```prisma
model Booking {
  // ...existing fields...
  rejectionReason String?
  rejectedAt      DateTime?
  approvedAt      DateTime?
}
```

Migration `..._add_booking_approval` includes the schema change plus a data
backfill:

```sql
UPDATE "Booking" SET status = 'approved' WHERE status = 'confirmed';
```

Apply with `npm run db:deploy` (per project convention; the dev migrate flow may
500 against the pooled URL locally).

### 2. Seat & double-booking model (hold-at-booking, confirmed)

Seats stay held at booking time (unchanged POST behaviour). The workflow makes
the lifecycle coherent:

- **Reject** releases the held seat: `coach.seatsLeft++`, and `batch.seats++`
  if the booking is batched. Mirrors the existing cancel logic. Runs in a
  transaction. Releasing only happens on the `pending → rejected` transition
  (guard against double-release).
- **Approve** re-validates inside a transaction:
  1. The booking is still `pending` (else 409 — already decided).
  2. The same user has **no other `approved` booking** for the same
     `coachId` + `batchId` (prevents double-booking; test #4). 409 on conflict.
  3. On success: `status = 'approved'`, `approvedAt = now()`. (The seat is
     already held from booking time, so no seat change is needed.)

  There is no DB unique constraint to lean on, so the conflict check lives
  inside the transaction.

- **Complete**: admin-only `approved → completed`. No seat change.
- **Cancel** (player): `pending`/`approved` → `cancelled`, releases the seat
  (existing behaviour, retained).

### 3. API & authorization

**`src/lib/bookings.ts`** (new) holds the transactional helpers so route
handlers stay thin and the logic is unit-testable:

- `approveBooking(id)` → runs the approve transaction above; throws a typed
  conflict error surfaced as HTTP 409.
- `rejectBooking(id, reason?)` → sets `status='rejected'`, `rejectedAt=now()`,
  `rejectionReason=reason ?? null`, releases the seat.
- `completeBooking(id)` → `approved → completed`.

**`/api/admin/bookings` PATCH** (admin-only — already guarded) is the **only**
path to `approved` / `rejected` / `completed`. Body: `{ id, status,
rejectionReason? }`. Dispatches to the helper, then sends the player email
(below). Returns 409 with a message on booking conflicts.

**`/api/bookings` PATCH** (player/coach session) is locked down (test #5):
- A **player** may only set `status='cancelled'` on a booking they own.
- A **coach** gets no status-write power (the coach-confirm branch is removed).
- Any attempt to set `approved`/`rejected`/`completed` here → 403.

### 4. Notifications (email)

Add two templates to `src/lib/email.ts`:

- `bookingApproved(playerName, coachName, slot, address, phone)` →
  "Your coaching session has been approved."
- `bookingRejected(playerName, coachName, slot, reason?)` →
  "Your coaching session request has been rejected." (+ reason if present)

The admin PATCH handler calls `sendEmail` after a successful approve/reject,
fetching the player's email and the coach's contact details. `sendEmail` is a
graceful no-op without `RESEND_API_KEY` (logs in dev), so this is safe locally.
Email failures are logged and do **not** fail the status update.

### 5. UI

**Admin → Coach Bookings (`/admin/bookings`):**
- Add status **tabs**: Pending / Approved / Rejected / Completed (filter the
  existing query; keep the search + sport filters).
- Pending rows surface: player name, coach name, **session slot** (derived from
  batch `day`/`time`), booking date, contact (email/phone — already fetched).
- Actions: **Approve** and **Reject**. Reject opens a small prompt for an
  optional reason. A 409 conflict shows an error toast and refetches.
- Approved rows expose a **Mark Completed** action.

**Player dashboard (coach booking views):**
- Show all five states: Pending Approval / Approved / Rejected / Completed /
  Cancelled.
- Rejected bookings display "Your booking request was rejected." plus the reason
  when present.

**Coach dashboard (`/coach/dashboard` + `/coach/dashboard/bookings`):**
- Becomes **view-only** for approval. Remove the Confirm / Reject buttons and
  the `/api/bookings` PATCH call.
- Reorganize into: Pending Requests / Upcoming Sessions (approved) / Completed /
  Cancelled.

**Badges:**
- Add `approved`, `rejected`, `completed` entries to `StatusBadge`
  (`src/components/Shared.tsx`) and `admin/Badge.tsx` (test #6). Keep a sensible
  color mapping (approved=green, rejected=red, completed=blue/muted,
  pending=amber, cancelled=grey).

**Legacy `"confirmed"` consumers updated in the same change:**
`api/coaches/[id]/reviews`, `api/admin/revenue`, `api/admin/overview`,
`api/admin/coaches`, `api/bookings` GET (coach `confirmed` count → `approved`),
`coach/[id]/page.tsx`, `admin/page.tsx` copy.

### 6. Next.js 16 caveat

Per `AGENTS.md`, the project's Next.js has unfamiliar APIs. Before editing any
route handler, read the relevant guide under `node_modules/next/dist/docs/`
(route handlers / request APIs) to confirm conventions.

## Testing

Maps to the six required checks:

1. Player books a session → status `pending`, seat held.
2. Admin approves → `approved`, `approvedAt` set, approval email sent.
3. Admin rejects → `rejected`, `rejectedAt` set, reason stored, rejection email
   sent, seat released.
4. Double-booking prevented: approving when the user already has an `approved`
   booking for the same coach+batch → 409, no state change.
5. Unauthorized: player/coach calling `/api/bookings` PATCH cannot reach
   `approved`/`rejected`/`completed` (403); only the admin route can.
6. UI reflects status correctly: badges and admin tabs render all five states;
   player sees the rejection message; coach view is read-only.

## Risks

- **Vocabulary migration is wide.** Every `"confirmed"` consumer must be updated
  in the same change or reviews/revenue/stats break silently. The list in §5 is
  the authoritative checklist.
- **Local DB migration** may not run via `db:migrate` against the pooled URL;
  use `db:deploy` and verify the backfill.
