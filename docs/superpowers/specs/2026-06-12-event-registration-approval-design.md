# Event System Slice 2 — Registration Approval (extend `adminBookings`)

**Date:** 2026-06-12
**Status:** Approved (design) — revised after discovering the existing `adminBookings` framework
**Slice:** 2 of the incremental event-system rebuild (Slice 1 = authoring + content model, shipped)

## Context & the pivot

Slice 1 added `approvalMode` (`auto`/`manual`) to `SportEvent` — captured but not
enforced. Mid-design we found the codebase **already has a unified registration
manager**: `src/app/admin/bookings/[category]/page.tsx` + the per-category route
`/api/admin/bookings/events` + the `src/lib/adminBookings/*` toolkit
(`actions.ts`, `status.ts`, `config.tsx`, `csv.ts`, `types.ts`, `query.ts`). The
**coaches** category already implements a full approve/reject/cancel approval
workflow inside this framework via the pure `bookingStatus.ts` machine +
`bookings.ts` service. The **events** category is wired payment-only today
(`cancel` / `mark-paid` / `mark-refunded`; status buckets pending/paid/failed/
refunded/cancelled).

**Therefore Slice 2 extends the events category inside `adminBookings` — it does
NOT build a parallel service, route, or admin table.** This is smaller and more
correct than the first draft of this spec (which has been replaced).

Confirmed product decisions (unchanged from earlier): pay-first-then-approve;
refunds are bookkeeping (mark `refunded`, manual money-back); pending holds a
seat; **Reject** declines a `pending` application (refunds if a paid `Payment`
row exists); **Refund** returns money on an already-`approved` paid spot (cancels
it); CSV already exists in the route; no email notifications this slice.

New decisions from the pivot:
- **Remove** the Slice-1 read-only registrations table from `/admin/events` (it's
  redundant with the bookings tab and hardcodes a wrong "Pending" payment). All
  registration management lives in the `/admin/bookings` **Events** tab.
- The Events tab filter becomes **approval-centric** (Pending / Approved /
  Rejected / Cancelled); payment status shows as a separate column.

## ⚠️ Critical coupling

The migration (status normalization) and the events status-display logic **must
ship and be tested together**. `deriveRegistrationStatus(status, paymentStatus)`
returns `paymentStatus` for any non-cancelled row. The moment the migration sets
a paid registration's `status` to `rejected`, the *current* logic would still
show/count it as **paid** (active) in the Events tab. The events-specific status
helpers (below) must land in the same change as the migration, with a regression
test asserting a `rejected` row is excluded from the paid bucket and renders as
"rejected."

## Status model — two axes, events-specific helpers

`EventRegistration` has two independent axes:
- **Approval** (the `status` column): `pending | approved | rejected | cancelled`.
- **Payment** (`paymentStatus`): canonical `pending | paid | failed | refunded`.

**Do NOT mutate the shared `status.ts` functions** (`deriveRegistrationStatus`,
`registrationWhereForStatus`, `CATEGORY_STATUSES`) — camps/workshops depend on
them. Mirror the precedent set by `coachWhereForStatus` (which already diverges
from the payment-bucket model) and add **events-specific** helpers in
`src/lib/adminBookings/status.ts`:

- `CATEGORY_STATUSES.events` → `["pending", "approved", "rejected", "cancelled"]`
  (approval buckets).
- `eventWhereForStatus(bucket)` → `{}` for all; otherwise `{ status: bucket }`.
- `EVENT_STATUS_LABELS` / `EVENT_STATUS_COLORS` for the approval axis — note the
  collision: shared `STATUS_LABELS.pending = "Pending payment"`, but the events
  approval **pending** must read **"Pending approval."** Use the events map for
  the events tab's status chip + filter chips.
- Payment continues to surface via `BookingRow.payment` (already fetched by the
  route's `paymentFor`).

## 1. Migration `add_event_registration_approval`

On `EventRegistration` add (all optional): `approvedAt DateTime?`,
`rejectedAt DateTime?`, `rejectionReason String?`. (`cancelledAt` exists.)
Normalize in the same migration:
`UPDATE "EventRegistration" SET status='approved' WHERE status='registered';`
After this, `status` holds only `pending|approved|rejected|cancelled`.

## 2. Enforce approval mode at creation

Both creation paths read `event.approvalMode` and set the new registration's
`status`: `auto → "approved"` (today's effective behavior), `manual → "pending"`.
Both still `participants++` (pending holds a seat).

- Free path: `src/app/api/events/[id]/route.ts` POST.
- Paid path: the `event` branch of `src/app/api/payments/verify/route.ts`
  (creates `{paymentStatus:"paid", status: auto?"approved":"pending"}`).

## 3. Actions — extend `src/lib/adminBookings/actions.ts`

- `ALLOWED_ACTIONS.events` → add `"approve"`, `"reject"`, `"refund"` (keep
  `cancel`; `mark-paid`/`mark-refunded` may remain for back-compat but are not
  surfaced as primary event actions).
- `applyAction` gains an **events approval branch** (before the generic
  registration branch), all transactional:
  - **approve**: load reg; `assert` from `pending`; set `status="approved"`,
    `approvedAt=now`. No counter change (seat already held). Idempotent if
    already approved.
  - **reject**: load reg (`status`, `eventId`, `paymentStatus`); idempotent if
    already `rejected`; set `status="rejected"`, `rejectedAt=now`,
    `rejectionReason=meta?.rejectionReason`; **release seat** (decrement event
    `participants`, flip `Full → Registration Open` — replicate the existing
    shared `cancel` branch's decrement logic); **refund only if a paid `Payment`
    row exists** (`findFirst {entityType:"event", entityId, userId,
    status:"paid"}`) → set that `Payment.status="refunded"` and the reg
    `paymentStatus="refunded"`. Free events (no `Payment` row) are NOT marked
    refunded.
  - **refund**: require `status==="approved"` AND a paid `Payment` row → set
    `status="cancelled"`, reg `paymentStatus="refunded"`, `Payment.status=
    "refunded"`, release seat.
- `meta.rejectionReason` is already plumbed `applyBulk → applyAction`; the route's
  PATCH passes the body through (verify it forwards `reason`/`meta`).

The generic `cancel` events branch (shared) stays as-is (status→cancelled +
seat release, no refund) for plain cancellations.

## 4. Route — `/api/admin/bookings/events`

- GET: swap `registrationWhereForStatus` → `eventWhereForStatus`, and compute
  **approval-axis** status counts (pending/approved/rejected/cancelled) instead
  of the payment-bucket counts; `toRow` sets `status =
  deriveEventRegistrationStatus(r.status)` (the approval value) while `payment`
  keeps the payment info. CSV export already works; add an "Approval"/"Payment"
  split to its columns.
- PATCH: already dispatches `applyBulk("events", ids, action)`; confirm it
  forwards `reason` into `meta.rejectionReason`. No structural change.

## 5. Admin UI — `src/lib/adminBookings/config.tsx` (events block)

- `rowActions`: `Approve`, `Reject` (`danger`, `needsReason`), `Refund`
  (`danger`), `Cancel` (`danger`) — mirror the coaches block. `RowActionDef` has
  no conditional-display predicate, so (like coaches) all are shown and the
  backend enforces validity (invalid transition → `ok:false`, surfaced as a
  per-row error). *Optional polish:* add an optional `show?(row)` predicate to
  `RowActionDef` to hide inapplicable actions; not required for correctness.
- `bulkActions`: `Approve`, `Reject`, `Cancel`.
- `columns`: add a **Payment** column (`r.payment?.status ?? "—"`). The status
  chip/filter use `EVENT_STATUS_LABELS`/`COLORS`.
- Surface the events approval label/color map wherever the shared page renders
  the status chip and the filter chips (locate the chip renderer; pass a
  category-aware label map rather than reusing `STATUS_LABELS` verbatim).

## 6. Remove the redundant `/admin/events` table

Delete the read-only registrations table (and its `Reg` type, the `registrations`
half of the admin-events query, and the now-unused table styles) from
`src/app/admin/events/page.tsx`. Keep the event overview cards + the authoring
wizard. The admin events GET (`/api/admin/events`) may keep returning
registrations or drop them — drop the `registrations` fetch if nothing else uses
it (check first).

## 7. User-facing detail card

Extend the detail `GET` `userRegistration` payload with `status` +
`rejectionReason`. The registration card in `src/app/events/[id]/page.tsx` then
shows: `pending → "Pending approval"`, `approved (+paid/free) →` existing
"Registered", `rejected → "Registration declined"` (+ reason). Payment-pending/
failed states unchanged.

## 8. Testing

- Events status helpers (`eventWhereForStatus`, `deriveEventRegistrationStatus`,
  label/color maps) — unit tests, including the **regression**: a `rejected` paid
  row is NOT in the paid/approved bucket and renders as "rejected."
- `applyAction` events branch — approve (no counter change), reject (seat
  release + refund-mark only when a paid `Payment` row exists; free event NOT
  refunded), refund (cancel + refund + seat release), and idempotency.

## Component boundaries

- `adminBookings/status.ts` — pure where/derive/label helpers; events helpers
  added alongside (not replacing) the shared/coach ones.
- `adminBookings/actions.ts` — the only place that mutates registrations; events
  approval transitions live in its events branch, transactional.
- Route/config/pages — thin: auth + delegate + render via config.

## Out of scope (later)

Email/push notifications; real Razorpay refund API; participant "My
Registrations" dashboard (Slice 3); reputation recompute on reject/cancel.
