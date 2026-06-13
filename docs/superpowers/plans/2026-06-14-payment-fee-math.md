# Event System Slice 5 — Payment Fee Math (server-authoritative) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Charge the real total (base fee + GST + convenience) for paid events, computed server-side from the event (closing the client-tampered-amount hole), and show the user the breakdown.

**Architecture:** A pure `computeEventCharge` helper (rupees) is the single source of truth. `create-order` and `verify` derive the event charge from the stored event fields and ignore the client `amount`; the Razorpay/`Payment` boundary multiplies ×100 (paise). The detail page renders a breakdown and the correct "Pay ₹total". A one-line display fix corrects a pre-existing 100× amount render.

**Tech Stack:** Next.js 16.2 (route handlers), Prisma 7, React 19, Razorpay, vitest. Amounts: rupees in the helper/UI, paise at Razorpay + in `Payment.amount`.

**Spec:** `docs/superpowers/specs/2026-06-14-payment-fee-math-design.md`

## Pre-flight
- [ ] Per `AGENTS.md`, skim the Next 16 route-handler guide in `node_modules/next/dist/docs/` before editing the payment routes.
- [ ] **Unit convention:** `computeEventCharge` returns **rupees**. `Payment.amount` and the Razorpay order are in **paise** (`× 100`). Keep this straight in every task.

---

## File Structure
- Create `src/lib/eventPricing.ts` (+ `eventPricing.test.ts`) — `computeEventCharge`.
- Modify `src/app/api/payments/create-order/route.ts` — server-authoritative event amount.
- Modify `src/app/api/payments/verify/route.ts` — store authoritative amount (event branch).
- Modify `src/app/events/[id]/page.tsx` — fee breakdown + "Pay ₹total".
- Modify `src/components/admin/bookings/BookingDrawer.tsx` — fix 100× amount display.

---

## Task 1: `eventPricing.ts` — `computeEventCharge` (TDD)

**Files:** Create `src/lib/eventPricing.ts`; Test `src/lib/eventPricing.test.ts`.

- [ ] **Step 1: Write the failing tests.** Create `src/lib/eventPricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeEventCharge } from "./eventPricing";

describe("computeEventCharge", () => {
  it("fee only (no gst/conv) → total equals base", () => {
    expect(computeEventCharge({ entryFeeAmount: 500 })).toEqual({ base: 500, gst: 0, convenience: 0, total: 500 });
  });
  it("applies both percentages to the base fee", () => {
    expect(computeEventCharge({ entryFeeAmount: 500, gstPercent: 18, convenienceFeePct: 2 }))
      .toEqual({ base: 500, gst: 90, convenience: 10, total: 600 });
  });
  it("rounds each component to the nearest rupee", () => {
    // 18% of 505 = 90.9 → 91
    expect(computeEventCharge({ entryFeeAmount: 505, gstPercent: 18 }).gst).toBe(91);
  });
  it("zero or negative fee → all zero", () => {
    expect(computeEventCharge({ entryFeeAmount: 0, gstPercent: 18 })).toEqual({ base: 0, gst: 0, convenience: 0, total: 0 });
    expect(computeEventCharge({ entryFeeAmount: -50 }).base).toBe(0);
  });
});
```

- [ ] **Step 2: Run — verify fail.**

Run: `npx vitest run src/lib/eventPricing.test.ts`
Expected: FAIL ("Cannot find module './eventPricing'").

- [ ] **Step 3: Implement `src/lib/eventPricing.ts`:**

```ts
export type EventCharge = { base: number; gst: number; convenience: number; total: number }; // all rupees

/**
 * Authoritative charge for a paid event: both percentages applied to the base
 * fee, each component rounded to the nearest rupee, then summed. Pure — the
 * single source of truth for server (× 100 → paise) and client (display).
 */
export function computeEventCharge(e: { entryFeeAmount: number; gstPercent?: number; convenienceFeePct?: number }): EventCharge {
  const base = Math.max(0, Math.round(e.entryFeeAmount || 0));
  const gst = Math.round(base * (e.gstPercent ?? 0) / 100);
  const convenience = Math.round(base * (e.convenienceFeePct ?? 0) / 100);
  return { base, gst, convenience, total: base + gst + convenience };
}
```

- [ ] **Step 4: Run — verify pass.**

Run: `npx vitest run src/lib/eventPricing.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/eventPricing.ts src/lib/eventPricing.test.ts
git commit -m "feat(events): event charge helper (fee + GST + convenience)"
```
(End every commit message in this plan with a blank line then `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: `create-order` — server-authoritative amount for events

**Files:** Modify `src/app/api/payments/create-order/route.ts`.

This route currently destructures `{ amount, entityType, entityId, currency }` from the body and trusts `amount`. Make events derive the amount server-side.

- [ ] **Step 1: Add imports** at the top:
```ts
import { prisma } from "@/lib/prisma";
import { computeEventCharge } from "@/lib/eventPricing";
```

- [ ] **Step 2: Replace the body-parse + validation block.** The handler currently has:
```ts
    const { amount, entityType, entityId, currency = "INR" } = await req.json();
    if (!amount || !entityType || !entityId) return fail("amount, entityType, entityId required", 400);
```
Replace those two lines with:
```ts
    const body = await req.json();
    const { entityType, entityId } = body;
    if (!entityType || !entityId) return fail("entityType, entityId required", 400);

    let amount: number = body.amount;
    let currency: string = body.currency ?? "INR";

    // Events: server-authoritative — never trust the client-sent amount.
    if (entityType === "event") {
      const event = await prisma.sportEvent.findUnique({
        where: { id: entityId },
        select: { entryFeeAmount: true, gstPercent: true, convenienceFeePct: true, currency: true },
      });
      if (!event) return fail("Event not found", 404);
      const total = computeEventCharge(event).total;
      if (total <= 0) return fail("This is a free event", 400);
      amount = total;
      currency = event.currency || "INR";
    } else if (!amount) {
      return fail("amount, entityType, entityId required", 400);
    }
```
The rest of the handler (the dev-mode mock branch returning `amount: amount * 100, currency`, and the real Razorpay `fetch` with `amount: amount * 100, currency`) is unchanged — it now uses the server-computed `amount`/`currency` for events.

- [ ] **Step 3: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/api/payments/create-order/route.ts"
git commit -m "feat(payments): server-authoritative charge for event orders (fee+GST+convenience)"
```

---

## Task 3: `verify` — store the authoritative amount (event branch)

**Files:** Modify `src/app/api/payments/verify/route.ts`.

- [ ] **Step 1: Add the import** at the top:
```ts
import { computeEventCharge } from "@/lib/eventPricing";
```

- [ ] **Step 2: In the `if (entityType === "event")` branch:**
  - Extend the event `select` to add the fee fields. It currently is:
    ```ts
    const event = await prisma.sportEvent.findUnique({ where: { id: entityId }, select: { participants: true, maxParticipants: true, registrationDeadline: true, approvalMode: true } });
    ```
    Change the `select` to also include `entryFeeAmount: true, gstPercent: true, convenienceFeePct: true, currency: true`.
  - After the `existing` duplicate-check and before the `$transaction`, add:
    ```ts
      const chargePaise = computeEventCharge(event).total * 100;
    ```
  - In the `prisma.payment.create` data inside the transaction, change `amount: amount ?? 0, currency: "INR",` to:
    ```ts
            amount: chargePaise, currency: event.currency || "INR",
    ```
  Leave the `eventRegistration.create` and `sportEvent.update` parts of the transaction unchanged. Do NOT touch the camp/game/workshop branches.

- [ ] **Step 3: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/api/payments/verify/route.ts"
git commit -m "feat(payments): store authoritative event charge on the Payment row"
```

---

## Task 4: Detail page — fee breakdown + correct "Pay ₹total"

**Files:** Modify `src/app/events/[id]/page.tsx`.

- [ ] **Step 1: Import + compute the charge.**
  - Add import: `import { computeEventCharge } from "@/lib/eventPricing";`
  - Near the other derived consts (e.g. after `const spotsLeft = …`), add:
    ```tsx
    const charge = computeEventCharge(event);
    const feeLines: { label: string; amount: number }[] = [{ label: "Entry fee", amount: charge.base }];
    if (charge.gst > 0) feeLines.push({ label: `GST (${event.gstPercent ?? 0}%)`, amount: charge.gst });
    if (charge.convenience > 0) feeLines.push({ label: `Convenience (${event.convenienceFeePct ?? 0}%)`, amount: charge.convenience });
    ```

- [ ] **Step 2: Replace the modal fee box** (the `{event.entryFeeAmount > 0 && ( … )}` block inside the team modal that currently shows "Entry fee: {event.entryFee}" + the Razorpay note) with a breakdown:
```tsx
                {event.entryFeeAmount > 0 && (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)" }}>
                    {feeLines.map(l => (
                      <div key={l.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.72)", marginBottom: 5 }}>
                        <span>{l.label}</span><span>₹{l.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#fff", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 7, marginTop: 3 }}>
                      <span>Total</span><span style={{ color: "#ff6b74" }}>₹{charge.total.toLocaleString("en-IN")}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
                      Secure payment via Razorpay. Slot reserved after payment.
                    </p>
                  </div>
                )}
```

- [ ] **Step 3: Fix the sidebar register-button label.** Find the button label expression that reads `(event.entryFeeAmount > 0 ? \`Pay ${event.entryFee}\` : "Register")` and change the paid branch to use the computed total:
```tsx
                                  : <>{isTeam ? "Register your team" : (event.entryFeeAmount > 0 ? `Pay ₹${charge.total.toLocaleString("en-IN")}` : "Register")} <ChevronRight size={16} /></>}
```
(Only the `Pay ${event.entryFee}` → `Pay ₹${charge.total.toLocaleString("en-IN")}` part changes; keep the surrounding ternary/JSX intact.)

- [ ] **Step 4: Typecheck + build.**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; build succeeds. (If the build fails on a Google Fonts fetch — transient network — re-run `npm run build` once.)

- [ ] **Step 5: Commit.**

```bash
git add "src/app/events/[id]/page.tsx"
git commit -m "feat(events): show fee breakdown and charge the GST/convenience total"
```

---

## Task 5: Fix the pre-existing 100× amount display

**Files:** Modify `src/components/admin/bookings/BookingDrawer.tsx`.

`Payment.amount` is stored in paise, but the drawer renders `₹${row.payment.amount}` (so ₹500 shows as "₹50000").

- [ ] **Step 1: Fix the render.** Find the line:
```tsx
            <Field label="Amount" value={`₹${row.payment.amount} ${row.payment.currency}`} />
```
Change it to divide by 100:
```tsx
            <Field label="Amount" value={`₹${(row.payment.amount / 100).toLocaleString("en-IN")} ${row.payment.currency}`} />
```

- [ ] **Step 2: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add src/components/admin/bookings/BookingDrawer.tsx
git commit -m "fix(payments): render Payment amount in rupees (was 100x too large)"
```

---

## Task 6: Full verification

- [ ] **Step 1: Unit tests.** Run: `npm test` — all pass (incl. the new `eventPricing` tests).
- [ ] **Step 2: Static gates.** Run: `npx tsc --noEmit && npm run build` — clean. (Lint: run targeted `npx eslint` on the slice's files; repo-wide lint has pre-existing errors in the user-edited `src/app/page.tsx`.)
- [ ] **Step 3: Runtime smoke** (use the `PrismaPg`-adapter script pattern from `src/lib/prisma.ts`; run from repo root; `dotenv config({quiet:true})`. Set `RAZORPAY_KEY_ID`/`SECRET` are likely unset locally → create-order runs its dev-mode mock branch, which is fine for asserting the amount math):
  1. Seed a published paid event: `entryFeeAmount: 500, gstPercent: 18, convenienceFeePct: 2`.
  2. Assert `computeEventCharge(event).total === 600`.
  3. Hit `POST /api/payments/create-order` with a **tampered** body `{ amount: 1, entityType: "event", entityId }` and a valid user session cookie (or call the route's logic): confirm the returned `amount` is **`60000`** (600 × 100 paise), NOT `100` — i.e. the client `amount: 1` was ignored. (If exercising via HTTP is impractical without a session, instead assert via a direct unit-style check that the route computes from the event; at minimum confirm `computeEventCharge` is used.)
  4. Seed a free event (`entryFeeAmount: 0`) and confirm create-order for it returns a 400 "This is a free event".
  5. Delete seeded rows.
- [ ] **Step 4: Commit any smoke fix.** `git add -A && git commit -m "fix(payments): slice 5 smoke-test adjustments"` (only if needed).

---

## Notes for the implementer
- **Single source of truth:** `computeEventCharge` is used by create-order, verify, and the detail page — never inline the fee math.
- **Units:** helper = rupees; Razorpay order amount + `Payment.amount` = paise (`× 100`). The UI shows rupees.
- **Scope:** only the `event` branches of create-order/verify change. Do NOT touch camp/workshop/game branches (their client-trusted amount is a separate follow-up).
- **Security intent:** the client `amount` is ignored for events in create-order, and verify recomputes rather than trusting the client — a tampered client cannot change what's charged or recorded.
