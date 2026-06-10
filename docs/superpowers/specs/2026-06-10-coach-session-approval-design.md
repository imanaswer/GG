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

## Status State Machine (single source of truth)

All transition rules, terminal states, audit-timestamp mapping, seat-release
rules, and "which statuses count for business metrics" live in **one** module
(`src/lib/bookings.ts`). Routes must call these helpers rather than inlining
status checks (future-proofing requirement #6).

**Allowed transitions:**

```
pending  → approved | rejected | cancelled
approved → completed | cancelled
rejected   (terminal)
cancelled  (terminal)
completed  (terminal)
```

Any other transition (e.g. `rejected → approved`, `cancelled → approved`,
`completed → approved`) is rejected by backend validation with HTTP 409 and no
state change. A no-op (same → same) is also rejected.

**Seat release rule:** a transition **into** `cancelled` or `rejected` releases
the held seat (`coach.seatsLeft++`, and `batch.seats++` when batched). Seats are
held continuously from `pending` through `approved`, so cancelling an approved
booking still releases the seat. `completed` does not release (the seat was
consumed).

**Audit-timestamp mapping:** each terminal/approval transition stamps exactly
one column — `approved → approvedAt`, `rejected → rejectedAt`,
`completed → completedAt`, `cancelled → cancelledAt`.

**Business-metric statuses:** `BILLABLE_STATUSES = ['approved', 'completed']`.
Only these count toward coach stats, revenue, upcoming/confirmed counts, and
dashboard analytics. `pending`, `rejected`, and `cancelled` never affect
business metrics (requirement #1).

**Review eligibility:** only a `completed` booking unlocks a review — an
approved-but-not-completed booking does not (requirement #2). The flow is
`pending → approved → completed → review allowed`.

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

Add the audit columns to `Booking` (all nullable → non-destructive). Full audit
trail per requirement #5:

```prisma
model Booking {
  // ...existing fields...
  rejectionReason String?
  approvedAt      DateTime?
  rejectedAt      DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
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

Seats stay held at booking time (unchanged POST behaviour). Every transition
flows through the state machine in `src/lib/bookings.ts`, which validates the
transition, stamps the audit column, and applies the seat-release rule in one
transaction:

- **Approve** (`pending → approved`) re-validates inside the transaction:
  1. The transition is legal (source is `pending`; else 409).
  2. The same user has **no other `approved` booking** for the same
     `coachId` + `batchId` (prevents double-booking; test #4). 409 on conflict.
  3. On success: `status = 'approved'`, `approvedAt = now()`. The seat is
     already held from booking time, so no seat change.

  There is no DB unique constraint to lean on, so the conflict check lives
  inside the transaction.

- **Reject** (`pending → rejected`): stamps `rejectedAt`, stores optional
  `rejectionReason`, releases the held seat.
- **Complete** (`approved → completed`, admin-only): stamps `completedAt`, no
  seat change.
- **Cancel** (`pending`/`approved` → `cancelled`): stamps `cancelledAt`,
  releases the held seat. A `cancelled` (or `rejected`/`completed`) booking can
  never transition to `approved`/`completed` — the state machine rejects it
  (requirement #3 + #4).

### 3. API & authorization

**`src/lib/bookings.ts`** (new) is the single source of truth for status logic
(requirement #6). It exports:

- Constants: `BOOKING_STATUSES`, `TERMINAL_STATUSES`, `BILLABLE_STATUSES =
  ['approved','completed']`, the `ALLOWED_TRANSITIONS` map, and the
  `STATUS_TIMESTAMP` map (status → audit column).
- `canTransition(from, to)` / `assertTransition(from, to)` — pure validation;
  `assertTransition` throws a typed `BookingTransitionError` surfaced as 409.
- `transitionBooking(id, to, { reason?, actorCheck? })` — the one transactional
  helper used by every route: loads the booking, asserts the transition, applies
  the seat-release rule (release on `cancelled`/`rejected`), runs the
  approve double-booking conflict check when `to==='approved'`, stamps the audit
  column, and returns the updated row. Thin wrappers `approveBooking`,
  `rejectBooking(id, reason?)`, `completeBooking`, `cancelBooking` call it.

Routes never inline status strings or seat math — they call these helpers.

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

**Legacy `"confirmed"` consumers updated in the same change** (this is the
authoritative checklist — miss one and metrics/reviews break silently):

- `api/coaches/[id]/reviews` — review-eligibility changes from `"confirmed"` to
  **`completed` only** (requirement #2). An approved booking does not unlock a
  review.
- `api/admin/revenue`, `api/admin/overview`, `api/admin/coaches`,
  `api/bookings` GET (coach counts), `coach/dashboard` analytics — count
  `BILLABLE_STATUSES` (`approved` + `completed`) instead of `"confirmed"`
  (requirement #1). `pending`/`rejected`/`cancelled` are excluded.
- `coach/[id]/page.tsx` UI and `admin/page.tsx` copy — replace `"confirmed"`
  wording/state with `approved`.

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

Additional checks for the requirements added in review:

7. Invalid transitions are blocked (409, no state change): `rejected → approved`,
   `cancelled → approved`, `completed → approved`, and same → same.
8. Business metrics count `approved + completed` only — a `pending`/`rejected`/
   `cancelled` booking does not move coach stats, revenue, or analytics.
9. Review eligibility requires `completed`: an `approved`-but-not-`completed`
   booking is rejected by `api/coaches/[id]/reviews` (403).
10. Cancel by the player releases the seat, stamps `cancelledAt`, and the
    booking cannot later be approved/completed.
11. Audit timestamps are stamped on the matching transition (`approvedAt`,
    `rejectedAt`, `completedAt`, `cancelledAt`) and only that one.

## Risks

- **Vocabulary migration is wide.** Every `"confirmed"` consumer must be updated
  in the same change or reviews/revenue/stats break silently. The list in §5 is
  the authoritative checklist.
- **Local DB migration** may not run via `db:migrate` against the pooled URL;
  use `db:deploy` and verify the backfill.
