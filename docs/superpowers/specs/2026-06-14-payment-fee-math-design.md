# Event System Slice 5 — Payment Fee Math (server-authoritative)

**Date:** 2026-06-14
**Status:** Approved (design)
**Slice:** 5 (final) of the incremental event-system rebuild (Slices 1–4 shipped)

## Context

Slice 1 captured `gstPercent`, `convenienceFeePct`, and `currency` on `SportEvent`
but never charged them — Razorpay is charged the base `entryFeeAmount`. Worse, the
charged amount is **client-controlled**: the detail page calls
`createPaymentOrder({ amount: event.entryFeeAmount, … })`, and
`POST /api/payments/create-order` trusts that `amount` (`amount * 100` → Razorpay
order). A tampered client could pay ₹1 instead of ₹500. `verify` likewise stores
the client-sent `amount` in the `Payment` row.

This slice wires GST + convenience into the charge **and** makes the amount
**server-authoritative** for events — the fee-math feature and a real security fix
together.

Confirmed decisions:
- **Formula:** both percentages on the base fee — `gst = round(fee × gst%)`,
  `convenience = round(fee × conv%)`, `total = fee + gst + convenience` (rupees).
- **Scope:** events only. Camps/workshops/games keep today's client-trusted amount
  (flagged as a follow-up, not fixed here).
- **Always recompute server-side** for `entityType === "event"` (even fee-only
  events), never trusting the client number.
- **Server value at pay time wins** — `create-order` computes from the event's
  current stored values; no price-snapshot/quote token.

## Scope

**In scope:** a pure `computeEventCharge` helper; server-authoritative amount in
`create-order` and `verify` for events; a fee breakdown + correct "Pay ₹total" on
the detail page.

**Out of scope:** server-authoritative amounts for camps/workshops/games (known
follow-up — their client-sent amount is still trusted); refunding the
GST/convenience portion (Slice 2's mark-refunded already flips the whole Payment
row to `refunded`); coupons/discounts; multi-currency conversion (currency is
passed through to Razorpay, not converted).

## 1. Pure pricing helper — `src/lib/eventPricing.ts` (+ test)

```ts
export type EventCharge = { base: number; gst: number; convenience: number; total: number }; // all rupees

/** Authoritative charge for a paid event. Each component rounded to the nearest
 *  rupee, then summed. The single source of truth for both server and client. */
export function computeEventCharge(e: { entryFeeAmount: number; gstPercent?: number; convenienceFeePct?: number }): EventCharge {
  const base = Math.max(0, Math.round(e.entryFeeAmount || 0));
  const gst = Math.round(base * (e.gstPercent ?? 0) / 100);
  const convenience = Math.round(base * (e.convenienceFeePct ?? 0) / 100);
  return { base, gst, convenience, total: base + gst + convenience };
}
```

### Unit convention (important)

`computeEventCharge` works in **rupees**. The codebase stores `Payment.amount` in
**paise** (`create-order` returns `amount × 100`; the client passes that to
`verify`, which stores it) — this is uniform across all entity types. So the
Razorpay/`Payment` boundary multiplies rupees → paise (`× 100`); only the UI
breakdown shows rupees.

## 2. `create-order` — authoritative amount for events

`src/app/api/payments/create-order/route.ts`: when `entityType === "event"`,
load the event (`entryFeeAmount, gstPercent, convenienceFeePct, currency`),
compute `total = computeEventCharge(event).total` (rupees), and use
**`total * 100`** (paise) as the Razorpay order amount in the event's `currency`
— **ignoring the client-sent `amount`**. If the event is missing → 404; if
`total <= 0` → 400 ("This is a free event") (free events use the no-payment
register path). The dev-mode mock branch returns the same server-computed
`total * 100`. Other entity types: unchanged (still use the client `amount`).

## 3. `verify` — store the authoritative amount

`src/app/api/payments/verify/route.ts`, the `event` branch: it already loads the
event for capacity checks — add the fee fields to that `select`, compute
`total = computeEventCharge(event).total`, and store **`total * 100`** (paise,
matching the existing convention) as the `Payment` row's `amount` — replacing the
client-sent `amount`, so a tampered client can't record a wrong figure.
(Signature verification and the registration-create logic are unchanged.)

## 3b. Fix the pre-existing amount display (100× bug)

`src/components/admin/bookings/BookingDrawer.tsx` renders the payment amount as
`₹${row.payment.amount}` with no paise→rupee conversion, so every stored paise
amount shows 100× too large (a ₹500 charge displays "₹50000"). Fix the single
render to divide by 100: `₹${(row.payment.amount / 100).toLocaleString("en-IN")}`.
This is a uniform display correctness fix benefiting all categories (amounts are
paise everywhere), included here because this slice owns charge correctness.

## 4. User detail page — breakdown + correct total

`src/app/events/[id]/page.tsx`: compute `const charge = computeEventCharge(event)`.
When `event.entryFeeAmount > 0`:
- In the team modal's fee box (and/or the sidebar), render a breakdown: **Entry
  ₹base**, **GST (gstPercent%) ₹gst** (only when `gst > 0`), **Convenience
  (convenienceFeePct%) ₹convenience** (only when `convenience > 0`), **Total
  ₹total**.
- The register/pay button label reads **"Pay ₹{charge.total}"** (was the
  display string / base). The `payAndRegister` flow still calls
  `createPaymentOrder` (it may pass `charge.total` for optimistic UX), but the
  Razorpay checkout uses the server-returned `order.amount`, so the actual charge
  is authoritative regardless of the client value.

## 5. Testing

- `computeEventCharge`:
  - fee only (`gstPercent`/`convenienceFeePct` 0 or undefined) → `total = base`,
    `gst = 0`, `convenience = 0`.
  - GST + convenience → correct per-component rounding and sum (e.g. base 500,
    GST 18% → 90, conv 2% → 10, total 600).
  - rounding boundary (e.g. base 505, GST 18% → 90.9 → 91).
  - zero/negative fee → all zero.

## Component boundaries

- `eventPricing.ts` — pure math; no IO; shared by server + client.
- `create-order` / `verify` — derive the authoritative amount via the helper; the
  client never sets the event charge.
- Detail page — presentational breakdown; the server is the source of truth.

## Notes

- **Refund interaction:** Slice 2's reject/refund flips the whole `Payment` row to
  `refunded` — it refunds the full charged total (fee + GST + convenience), which
  is the intended behavior (the user gets everything back).
- **Follow-up (flagged):** `create-order`/`verify` still trust the client `amount`
  for camps/workshops/games. Closing that is a separate slice; this slice does not
  change their behavior.
