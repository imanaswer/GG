# Coach Session Direct-Pay — Design

**Date:** 2026-06-20
**Status:** Approved, pending implementation plan

## Problem

Booking a coach session today is a two-step, admin-gated flow: the client submits a
request (`POST /api/bookings`), the booking is created as `pending`, a seat is held, and
an admin must approve it before it is confirmed. No money changes hands on the platform —
the mobile number is captured only so "the team can confirm your session."

Events, camps, games, and workshops already collect payment up front through a Razorpay
rail (`create-order` → checkout → `verify`). **Coaches are the only entity not wired into
that rail.** The goal is to let a client pay and confirm a coach session instantly, making
booking faster and more convenient, while preserving the free admin-confirmed path for
coaches without a fixed price.

## Decisions (locked)

1. **Client chooses.** The booking panel offers both a "Pay & book instantly" path and the
   existing free "Request session" (admin-confirmed) path. We do not remove admin approval.
2. **Instant-pay only when the price is fixed.** The instant button appears only when
   `priceMin === priceMax && priceMin > 0`. The charge is that fixed amount (`priceMin`).
   Coaches with a price range or no price are request-only — no ambiguous charges.
3. **Reuse the existing Razorpay rail.** No new payment infrastructure; add a `coach`
   branch to the existing `create-order` and `verify` routes.
4. **Track payment on the booking** via two new `Booking` fields plus a `Payment` row.

## Architecture

### Two booking paths

| Path | Trigger | Endpoint | Result |
|------|---------|----------|--------|
| Request session (free) | Always available | `POST /api/bookings` (unchanged) | `Booking` `status: pending`, seat held, awaits admin approval |
| Pay & book instantly | Shown only when `priceMin === priceMax && priceMin > 0` | `create-order` → Razorpay → `verify` | `Booking` `status: approved`, `paymentStatus: paid`, seat held on success |

Both paths apply at coach level and per-batch. Batches have no price column, so they use
the coach's fixed price.

### Instant-pay flow

1. Client clicks **"Pay & book instantly — ₹X"**.
2. `POST /api/payments/create-order` with `{ entityType: "coach", entityId: coachId, batchId?, phone? }`.
   - Server-authoritative: load the coach; assert `priceMin === priceMax && priceMin > 0`
     (else `400`); assert `seatsLeft > 0` (else `400`); set `amount = priceMin`.
   - Dev mode (no `RAZORPAY_KEY_ID`/`SECRET`): return the existing mock order so local
     testing works.
3. Razorpay checkout via the existing client helper, with the phone number prefilled.
4. `POST /api/payments/verify` with `entityType: "coach"`. New `coach` branch:
   - Verify the signature (skipped in dev mode, same as today).
   - Re-check `seatsLeft > 0` (else `400` — seat may have been taken between order and verify).
   - In a single `$transaction`:
     - Create the `Booking`: `status: "approved"`, `paymentStatus: "paid"`,
       `amountPaid: <paise>`, `approvedAt: now`, `note`, `batchId?`.
     - Create the `Payment`: `entityType: "coach"`, `entityId: <booking.id>`,
       `amount: <paise>`, `status: "paid"`, `paidAt: now`, razorpay ids.
     - Decrement `coach.seatsLeft` (and the `batch.seats` if a batch was chosen).
     - Persist the phone number to `user.phone` if provided.
   - Return the confirmed booking.

Seat-holding rule is consistent with events: the seat is committed only on successful
payment. The free path continues to hold the seat at request time.

### Why land paid bookings at `approved`

The booking state machine (`src/lib/bookingStatus.ts`) already allows a booking to exist
as `approved` and supports `approved → cancelled` (which releases the seat). A paid booking
therefore skips `pending` entirely and shows as confirmed. `BILLABLE_STATUSES` already
includes `approved`, so paid bookings count toward metrics with no state-machine change.

## Data model

One migration, applied via `db:deploy`:

```prisma
model Booking {
  // ...existing fields...
  paymentStatus String @default("unpaid") // "unpaid" | "paid"
  amountPaid    Int    @default(0)        // paise, matches Payment.amount units
}
```

- Free request bookings keep the defaults (`unpaid`, `0`).
- Instant-paid bookings carry `paid` and the real amount.
- Payments are also recorded in the existing `Payment` table with `entityType: "coach"`,
  `entityId: <bookingId>`, so the payment ties to the specific booking (not just the coach).

Rationale for the two fields rather than relying solely on the `Payment` table: admin and
coach booking lists render directly from `Booking`, so a `paymentStatus`/`amountPaid` read
avoids a fragile cross-table join keyed on `entityId`.

## Admin / coach visibility

- Paid bookings arrive already `approved`, so existing admin and coach dashboards show them
  as confirmed with no flow change.
- Add a **"Paid ₹X"** badge to coach booking rows, keyed off `paymentStatus === "paid"`
  and `amountPaid`.
- **Revenue route** (`src/app/api/admin/revenue/route.ts`): replace the hardcoded
  `confirmedBookings * 1045` placeholder (line 37) with the real
  `sum(amountPaid)` over paid coach bookings, and add coach payments to the transactions
  feed (type "Coach", amount from `amountPaid`, date from `approvedAt`/`createdAt`).

## UI

Coach detail page (`src/app/coach/[id]/page.tsx`) booking panel:

- Compute `isFixedPrice = coach.priceMin === coach.priceMax && coach.priceMin > 0`.
- When `isFixedPrice`: render two buttons — primary **"Pay & book instantly — ₹{priceMin}"**
  and secondary **"Request session"**. Otherwise render only **"Request session"** (current
  behavior, button label may stay "Book a session").
- Same two-button treatment on each batch's action when `isFixedPrice`.
- The mobile-number field and its helper text remain, used by both paths.

## Out of scope

- **Refunds.** Cancelling a paid booking releases the seat through the existing state
  machine, but refunding money is handled manually by an admin — identical to how paid
  events behave today. No automated refund is built.
- Per-session price field on the coach (considered and rejected in favor of the
  fixed-price gate). Range-priced coaches stay request-only.

## Edge cases

| Case | Handling |
|------|----------|
| Coach has a price range or `priceMin === 0` | No instant button; request-only |
| Seat taken between order and verify | `verify` re-checks `seatsLeft`, returns `400` |
| Dev mode (no Razorpay keys) | Mock order from `create-order`; `verify` skips signature and still creates the booking |
| Duplicate instant booking by same user | Acceptable for v1 (multiple sessions allowed); no unique guard added |

## Testing

- Unit: `create-order` coach branch (fixed-price gate, seat check, amount = `priceMin`).
- Unit: `verify` coach branch (seat re-check, transaction creates Booking + Payment +
  decrements seats, status/paymentStatus values).
- Existing booking state-machine tests remain green (no transition changes).
- Manual/dev-mode: instant-pay end to end with no Razorpay keys creates an `approved`,
  `paid` booking; range-priced coach shows only the request button.
