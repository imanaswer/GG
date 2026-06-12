# Event System Slice 2 — Registration Approval + Admin Management

**Date:** 2026-06-12
**Status:** Approved (design)
**Slice:** 2 of the incremental event-system rebuild (Slice 1 = authoring + content model, shipped)

## Context

Slice 1 shipped the authoring wizard, content model, Draft/Publish, and added
`approvalMode` (`auto`/`manual`) to `SportEvent` — **captured but not enforced**.
This slice enforces it and turns registration management into a real workflow.

Existing pieces this slice builds on / mirrors:

- **`EventRegistration`**: `status` (free string, default `"registered"`),
  `paymentStatus` (canonical lib), `cancelledAt`. No approval audit columns yet.
- **Two registration creation paths**: free `POST /api/events/[id]` and the paid
  `payments/verify` event branch — both currently create an immediately-active
  registration and `participants++`.
- **Coach-booking approval** (`src/lib/bookingStatus.ts` pure state machine +
  `src/lib/bookings.ts` service) — the proven pattern to mirror for events:
  status vocab, terminal states, allowed transitions, audit timestamps,
  seat-release rules.
- **`src/lib/paymentStatus.ts`**: canonical `pending|paid|failed|refunded` with
  label/color maps. Reused as-is for the payment axis.
- **Admin table** (`/admin/events`): read-only; payment column hardcodes
  "Pending" (a bug); the admin GET already returns the real `paymentStatus`.

Confirmed product decisions:

1. **Paid + manual approval = pay first, then approve.** User pays → registration
   sits `pending` → admin approves or rejects; rejecting refunds.
2. **Refunds are bookkeeping** — mark `refunded`; the actual money-back is done in
   the Razorpay dashboard. No live refund API call this slice.
3. **Pending holds a seat** — pending + approved both consume capacity;
   reject/cancel/refund release it.
4. **Reject vs Refund split**: Reject declines a `pending` application (refunds if
   already paid); Refund returns money on an already-`approved` paid spot
   (cancels it).
5. **CSV export is client-side** (no new endpoint).
6. **No email notifications** this slice (in-app status only).

## Scope

**In scope**

- Approval state machine for event registrations (mirrors coach bookings).
- Enforce `approvalMode` at both registration creation paths.
- Admin approve / reject / refund (transactional, admin-only).
- Real payment + approval status in the admin table; row actions; status filter;
  client-side CSV export; a view-details drawer.
- User-facing approval status on the event detail registration card.

**Out of scope (later / deferred)**

- Email / push notifications on status change.
- Real Razorpay refund-API integration.
- Participant "My Registrations" dashboard (Slice 3).
- Reputation recompute on reject/cancel (left as-is).

## 1. Status model — `src/lib/eventRegistrationStatus.ts`

A new pure, unit-tested module mirroring `bookingStatus.ts`:

```
EVENT_REG_STATUSES = ["pending", "approved", "rejected", "cancelled"]
```

- **Transitions:** `pending → approved | rejected | cancelled`;
  `approved → cancelled`; `rejected` and `cancelled` are terminal.
- **Seat release:** `releasesSeat(to)` → true for `rejected` and `cancelled`.
- **Audit timestamp map:** `approved→approvedAt`, `rejected→rejectedAt`,
  `cancelled→cancelledAt`, `pending→null`.
- `assertTransition(from,to)` throws a typed `EventRegTransitionError` on an
  illegal move.

This is a *second axis*, independent of `paymentStatus` (pending/paid/failed/
refunded), which stays as the canonical `paymentStatus.ts` lib.

## 2. Migration `add_event_registration_approval`

On `EventRegistration` add (all optional): `approvedAt DateTime?`,
`rejectedAt DateTime?`, `rejectionReason String?`. (`cancelledAt` already exists.)

**Data normalization** in the same migration:
`UPDATE "EventRegistration" SET status='approved' WHERE status='registered';`
(old auto-accepted rows become `approved`; `cancelled` rows unchanged). After
this, `status` only ever holds the new vocab.

## 3. Enforce approval mode at creation

Both creation paths look up `event.approvalMode` and set the new registration's
`status`:

- `auto` → `status='approved'` (today's effective behavior).
- `manual` → `status='pending'`.

Both still `participants++` (pending holds a seat). Paths changed:
`src/app/api/events/[id]/route.ts` (free POST) and the `event` branch of
`src/app/api/payments/verify/route.ts` (paid). So **paid + manual**: the verify
route creates `{paymentStatus:'paid', status:'pending'}`; the admin decides later.

## 4. Service + admin API

New `src/lib/eventRegistrations.ts` service (mirrors `bookings.ts`), each function
transactional and admin-gated by the caller:

- **`approveRegistration(id)`**: `pending → approved`, stamp `approvedAt`.
- **`rejectRegistration(id, reason?)`**: `pending → rejected`, stamp `rejectedAt`
  + `rejectionReason`; release seat (`participants--`, flip event `Full →
  Registration Open` if applicable). **Refund marking is keyed off an actual paid
  `Payment` row**, not the `paymentStatus` string — free events store
  `paymentStatus='paid'` with no money/`Payment` row, so they must NOT be marked
  refunded. If a `Payment` row exists (by `entityType='event'`, `entityId`,
  `userId`, `status='paid'`), set both it and the registration's `paymentStatus`
  to `refunded`; otherwise leave `paymentStatus` untouched.
- **`refundRegistration(id)`**: requires `approved` AND a paid `Payment` row
  (i.e. a genuinely paid spot) → `cancelled`, registration `paymentStatus` +
  `Payment` row `refunded`, release seat. Not applicable to free registrations.

Each validates the current state via `assertTransition` and is a no-op-safe
single transaction.

**Routes:**

- `POST /api/admin/events/registrations/[id]` — body `{action, reason?}` where
  `action ∈ {approve, reject, refund}`; admin-guarded
  (`getAdminSessionFromRequest`); dispatches to the service; returns the updated
  registration. 422 on an invalid transition.
- Extend `GET /api/admin/events`: each registration row also returns `status`,
  `approvedAt`, `rejectedAt`, `rejectionReason`, and `paymentStatus` (already
  fetched — stop hardcoding "Pending" downstream), plus `playerPhone`.

## 5. Admin UI — `/admin/events`

- Replace the hardcoded "Pending" payment cell with the real `paymentStatus`
  rendered via `PAYMENT_STATUS_LABELS`/`PAYMENT_STATUS_COLORS`.
- Add an **Approval** column using a parallel label/color map from the new status
  lib.
- **Row actions**, conditional on state: **Approve** + **Reject** when `pending`;
  **Refund** when `approved` && `paymentStatus==='paid'` && `entryFee > 0` (the
  `entryFee>0` proxy keeps free registrations out; the service still does the
  authoritative paid-`Payment`-row check); **View details** opens
  a drawer/modal with full registrant info (name, email, phone, team, timestamps,
  rejection reason). Actions call the new route via a React Query mutation and
  invalidate `["admin-events"]`.
- **Status filter** chips: All / Pending / Approved / Rejected.
- **Export CSV** button: client-side `buildCsv(rows)` util → Blob download.
  Columns: Event, Name, Email, Phone, Team, Registered, Payment, Approval.

## 6. User-facing detail card

Extend the detail `GET` `userRegistration` payload with `status` and
`rejectionReason`. The registration card in `src/app/events/[id]/page.tsx` then
distinguishes:

- `pending` → "Pending approval" (awaiting organizer review).
- `approved` (+ paid/free) → existing "Registered" confirmation.
- `rejected` → "Registration declined" + `rejectionReason` if present.
- payment-pending / failed states stay as they are today.

## 7. Testing

- `eventRegistrationStatus.test.ts` — every legal/illegal transition, terminal
  states, `releasesSeat`, audit-timestamp map.
- Service behavior: seat release on reject, `Payment`-row refund marking, and the
  `Full → Registration Open` flip, validated with the existing test approach.

## Component boundaries

- `eventRegistrationStatus.ts` — pure state machine; no IO. Knows nothing about
  Prisma or payments.
- `eventRegistrations.ts` — orchestrates a transition + side effects (seat,
  payment row) in one transaction. Depends on the state machine + Prisma.
- Admin route — thin: auth + parse + delegate to the service.
- Admin page / detail page — presentational; call APIs, render canonical
  status maps.

## Later slices (reference)

3. Participant "My Registrations" dashboard. 4. Event updates / announcements.
5. Payment fee math. (Notifications may fold into a cross-cutting slice.)
