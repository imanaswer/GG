# Coach Session Approval Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-gated approval workflow for coach bookings (pending → approved/rejected → completed/cancelled) with a centralized status state machine, audit timestamps, double-booking protection, email notifications, and dashboard surfaces for admin, coach, and player.

**Architecture:** All booking status rules live in two small modules — `src/lib/bookingStatus.ts` (pure state machine: transitions, terminal/billable sets, audit-timestamp map; unit-tested with vitest) and `src/lib/bookings.ts` (transactional service that applies those rules against Prisma + handles seat release and the double-booking guard). Every route calls the service instead of inlining status strings. Seats stay held at booking time; reject/cancel release the held seat. Approve/reject/complete are admin-only; the player route only allows self-cancel.

**Tech Stack:** Next.js 16 (App Router route handlers — native `Request`/`NextResponse`), Prisma 7 + PostgreSQL, React 19 + TanStack Query, vitest (newly added, scoped to pure logic), Resend email (existing `src/lib/email.ts`, no-op without `RESEND_API_KEY`).

**Spec:** `docs/superpowers/specs/2026-06-10-coach-session-approval-design.md`

**Conventions to honor:**
- Per `AGENTS.md`, this Next.js has unfamiliar APIs — route handlers use native `Request`/`NextResponse`; PATCH is never cached (confirmed in `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`). Follow the existing route files' style.
- Stored status values after this work: `pending | approved | rejected | completed | cancelled`. The legacy `"confirmed"` value is migrated to `"approved"` and removed from code.
- Commit after every task. You are on `main` (the user commits directly to `main`).

---

## File Structure

**New files:**
- `src/lib/bookingStatus.ts` — pure state machine (no Prisma import).
- `src/lib/bookingStatus.test.ts` — vitest unit tests for the pure logic.
- `src/lib/bookings.ts` — transactional booking service (imports Prisma + re-exports `bookingStatus`).
- `vitest.config.ts` — vitest config scoped to `src/**/*.test.ts`.
- `prisma/migrations/20260610120000_add_booking_approval/migration.sql` — audit columns + `confirmed→approved` backfill.
- `src/app/bookings/page.tsx` — player "My Coaching Sessions" page (five status groups).

**Modified files:**
- `package.json` — add `vitest` dev dep + `test` script.
- `prisma/schema.prisma` — add audit columns to `Booking`.
- `src/lib/email.ts` — add `bookingApproved` + `bookingRejected` templates.
- `src/app/api/admin/bookings/route.ts` — PATCH dispatches to the service + sends email + 409 on conflict.
- `src/app/api/bookings/route.ts` — PATCH locked to player self-cancel; GET coach counts use billable statuses.
- `src/app/api/coaches/[id]/reviews/route.ts` — review eligibility requires `completed`.
- `src/app/api/admin/revenue/route.ts` — count billable statuses.
- `src/app/api/admin/overview/route.ts` — confirm-rate + active-bookings use new vocabulary.
- `src/app/api/admin/coaches/route.ts` — `confirmedBookings` counts billable statuses.
- `src/components/Shared.tsx` — `StatusBadge` gains `approved`/`rejected`.
- `src/components/admin/Badge.tsx` — gains `approved`/`rejected`.
- `src/hooks/useData.ts` — `Booking` type gains audit fields; `useCancelBooking` sends `{ id, status }`.
- `src/app/admin/bookings/page.tsx` — status tabs + Approve/Reject/Complete + reject-reason prompt.
- `src/app/coach/dashboard/bookings/page.tsx` — view-only, tabbed (Pending/Upcoming/Completed/Cancelled).
- `src/app/coach/dashboard/page.tsx` — stat label `confirmed`→`approved`; recent-booking badge uses `StatusBadge`.
- `src/app/coach/[id]/page.tsx` — booking-status UI `confirmed`→`approved`; review hint text.

---

## Task 1: Set up vitest + pure booking state machine (TDD)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/bookingStatus.ts`
- Test: `src/lib/bookingStatus.test.ts`

- [ ] **Step 1: Install vitest**

Run:
```bash
npm install -D vitest
```
Expected: vitest added to `devDependencies`, no errors.

- [ ] **Step 2: Add the `test` script**

In `package.json`, inside `"scripts"`, add a `test` entry next to `lint`:
```json
    "lint": "eslint",
    "test": "vitest run",
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/bookingStatus.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  releasesSeat,
  STATUS_TIMESTAMP,
  BILLABLE_STATUSES,
  TERMINAL_STATUSES,
  BookingTransitionError,
} from "./bookingStatus";

describe("canTransition", () => {
  it("allows the valid forward transitions", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("approved", "completed")).toBe(true);
    expect(canTransition("approved", "cancelled")).toBe(true);
  });

  it("blocks transitions out of terminal states", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("cancelled", "approved")).toBe(false);
    expect(canTransition("completed", "approved")).toBe(false);
  });

  it("blocks illegal jumps and no-ops", () => {
    expect(canTransition("pending", "completed")).toBe(false);
    expect(canTransition("pending", "pending")).toBe(false);
    expect(canTransition("approved", "approved")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("throws BookingTransitionError on an illegal transition", () => {
    expect(() => assertTransition("rejected", "approved")).toThrow(BookingTransitionError);
  });
  it("does not throw on a legal transition", () => {
    expect(() => assertTransition("pending", "approved")).not.toThrow();
  });
});

describe("releasesSeat", () => {
  it("releases the held seat only when entering cancelled or rejected", () => {
    expect(releasesSeat("cancelled")).toBe(true);
    expect(releasesSeat("rejected")).toBe(true);
    expect(releasesSeat("approved")).toBe(false);
    expect(releasesSeat("completed")).toBe(false);
  });
});

describe("audit + metric sets", () => {
  it("maps each terminal/approval status to its timestamp column", () => {
    expect(STATUS_TIMESTAMP.approved).toBe("approvedAt");
    expect(STATUS_TIMESTAMP.rejected).toBe("rejectedAt");
    expect(STATUS_TIMESTAMP.completed).toBe("completedAt");
    expect(STATUS_TIMESTAMP.cancelled).toBe("cancelledAt");
    expect(STATUS_TIMESTAMP.pending).toBeNull();
  });
  it("counts only approved + completed as billable", () => {
    expect(BILLABLE_STATUSES).toEqual(["approved", "completed"]);
  });
  it("marks rejected/completed/cancelled terminal", () => {
    expect(TERMINAL_STATUSES).toEqual(["rejected", "completed", "cancelled"]);
  });
});
```

- [ ] **Step 5: Run the test, verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./bookingStatus` (module not created yet).

- [ ] **Step 6: Implement `src/lib/bookingStatus.ts`**

```ts
// Pure booking status state machine. No Prisma / IO imports — keep it unit-testable.

export const BOOKING_STATUSES = ["pending", "approved", "rejected", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Statuses no transition can leave.
export const TERMINAL_STATUSES: BookingStatus[] = ["rejected", "completed", "cancelled"];

// Statuses that count toward business metrics (coach stats, revenue, analytics).
export const BILLABLE_STATUSES: BookingStatus[] = ["approved", "completed"];

export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
};

// Audit column stamped when a booking enters a given status.
export const STATUS_TIMESTAMP: Record<
  BookingStatus,
  "approvedAt" | "rejectedAt" | "completedAt" | "cancelledAt" | null
> = {
  pending: null,
  approved: "approvedAt",
  rejected: "rejectedAt",
  completed: "completedAt",
  cancelled: "cancelledAt",
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class BookingTransitionError extends Error {
  readonly code = "INVALID_TRANSITION";
  constructor(from: string, to: string) {
    super(`Cannot change booking from "${from}" to "${to}"`);
    this.name = "BookingTransitionError";
  }
}

export class BookingConflictError extends Error {
  readonly code = "BOOKING_CONFLICT";
  constructor(message = "A conflicting approved booking already exists for this slot") {
    super(message);
    this.name = "BookingConflictError";
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new BookingTransitionError(from, to);
}

// The held seat is released when a booking enters cancelled or rejected.
export function releasesSeat(to: BookingStatus): boolean {
  return to === "cancelled" || to === "rejected";
}
```

- [ ] **Step 7: Run the test, verify it passes**

Run: `npm test`
Expected: PASS — all assertions green.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/bookingStatus.ts src/lib/bookingStatus.test.ts
git commit -m "feat: pure booking status state machine + vitest setup

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Prisma migration — audit columns + confirmed→approved backfill

**Files:**
- Modify: `prisma/schema.prisma:160-173` (the `Booking` model)
- Create: `prisma/migrations/20260610120000_add_booking_approval/migration.sql`

- [ ] **Step 1: Add audit columns to the `Booking` model**

In `prisma/schema.prisma`, change the `Booking` model so it reads (add the four `...At` columns and `rejectionReason` after `coachNote`):
```prisma
model Booking {
  id        String   @id @default(cuid())
  userId    String
  coachId   String
  batchId   String?
  status    String   @default("pending")
  note      String?
  coachNote String?
  rejectionReason String?
  approvedAt  DateTime?
  rejectedAt  DateTime?
  completedAt DateTime?
  cancelledAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user  User   @relation(fields: [userId], references: [id])
  coach Coach  @relation(fields: [coachId], references: [id])
  batch Batch? @relation(fields: [batchId], references: [id])
}
```

- [ ] **Step 2: Create the migration SQL by hand**

The pooled local URL can 500 on `prisma migrate dev` (see project memory), so write the migration file directly. Create `prisma/migrations/20260610120000_add_booking_approval/migration.sql`:
```sql
-- AlterTable: booking approval audit trail
ALTER TABLE "Booking"
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Backfill legacy status: "confirmed" is now "approved"
UPDATE "Booking" SET "status" = 'approved' WHERE "status" = 'confirmed';
```

- [ ] **Step 3: Apply the migration**

Run:
```bash
npm run db:deploy
```
Expected: `Applying migration 20260610120000_add_booking_approval` then "All migrations have been applied." (If it reports the DB is unreachable, the engineer must supply a working `DATABASE_URL`/`DIRECT_URL` — do not skip this step.)

- [ ] **Step 4: Regenerate the Prisma client**

Run:
```bash
npm run db:generate
```
Expected: "Generated Prisma Client" — the client now knows the new `Booking` fields.

- [ ] **Step 5: Verify the backfill**

Run:
```bash
npx prisma studio --browser none &>/dev/null & sleep 1; echo "open Booking table to confirm no rows remain with status='confirmed'"; npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.booking.count({where:{status:'confirmed'}}).then(n=>{console.log('confirmed rows remaining:', n); return prisma.\$disconnect();})"
```
Expected: `confirmed rows remaining: 0`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260610120000_add_booking_approval/migration.sql
git commit -m "feat: add booking approval audit columns + backfill confirmed->approved

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Transactional booking service (`src/lib/bookings.ts`)

**Files:**
- Create: `src/lib/bookings.ts`

This is the single entry point every route uses. Behaviour is verified end-to-end in Tasks 5/11/12 and via the pure tests from Task 1; this task is verified by a type-check.

- [ ] **Step 1: Create `src/lib/bookings.ts`**

```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type BookingStatus,
  assertTransition,
  releasesSeat,
  STATUS_TIMESTAMP,
  BookingConflictError,
} from "@/lib/bookingStatus";

// Re-export the pure state machine so callers import everything from "@/lib/bookings".
export * from "@/lib/bookingStatus";

/**
 * Move a booking to `to`, enforcing the state machine in one transaction:
 *  - validates the transition (throws BookingTransitionError → 409)
 *  - on approval, blocks a duplicate approved booking for the same user+coach+batch
 *    (throws BookingConflictError → 409)
 *  - releases the held seat when entering cancelled/rejected
 *  - stamps the matching audit column
 */
export async function transitionBooking(
  id: string,
  to: BookingStatus,
  opts: { reason?: string | null } = {},
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      select: { id: true, status: true, coachId: true, batchId: true, userId: true },
    });
    if (!booking) throw new Error("Booking not found");

    const from = booking.status as BookingStatus;
    assertTransition(from, to);

    if (to === "approved") {
      const conflict = await tx.booking.findFirst({
        where: {
          id: { not: id },
          userId: booking.userId,
          coachId: booking.coachId,
          batchId: booking.batchId,
          status: "approved",
        },
        select: { id: true },
      });
      if (conflict) throw new BookingConflictError();
    }

    if (releasesSeat(to)) {
      await tx.coach.update({ where: { id: booking.coachId }, data: { seatsLeft: { increment: 1 } } });
      if (booking.batchId) {
        await tx.batch.update({ where: { id: booking.batchId }, data: { seats: { increment: 1 } } });
      }
    }

    const data: Prisma.BookingUpdateInput = { status: to };
    const stamp = STATUS_TIMESTAMP[to];
    if (stamp) (data as Record<string, unknown>)[stamp] = new Date();
    if (to === "rejected") data.rejectionReason = opts.reason ?? null;

    return tx.booking.update({ where: { id }, data });
  });
}

export const approveBooking = (id: string) => transitionBooking(id, "approved");
export const rejectBooking = (id: string, reason?: string | null) =>
  transitionBooking(id, "rejected", { reason });
export const completeBooking = (id: string) => transitionBooking(id, "completed");
export const cancelBooking = (id: string) => transitionBooking(id, "cancelled");
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors referencing `src/lib/bookings.ts`. (Pre-existing unrelated errors, if any, are out of scope — but the booking files must be clean.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/bookings.ts
git commit -m "feat: transactional booking transition service with seat release + conflict guard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Approval / rejection email templates

**Files:**
- Modify: `src/lib/email.ts` (add two entries to the `emails` object)

- [ ] **Step 1: Add the templates**

In `src/lib/email.ts`, inside the `emails` object (e.g. right after the `newBookingForCoach` entry, before the closing `};`), add:
```ts
  bookingApproved: (playerName: string, coachName: string, slot: string, address: string, phone: string) => ({
    subject: "Your coaching session has been approved 🎉 — Game Ground",
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#e63946;margin:0 0 12px">Session Approved! 🎉</h2>
      <p style="color:#9ca3af">Hi ${playerName}, your coaching session with <strong style="color:#fff">${coachName}</strong> has been approved.</p>
      <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px">
        <p style="color:#fff;font-weight:700;margin:0 0 8px">Session Details</p>
        <p style="color:#9ca3af;margin:4px 0">📅 ${slot}</p>
        ${address ? `<p style="color:#9ca3af;margin:4px 0">📍 ${address}</p>` : ""}
        ${phone ? `<p style="color:#9ca3af;margin:4px 0">📞 ${phone}</p>` : ""}
      </div>
    </div>${footer}`,
  }),

  bookingRejected: (playerName: string, coachName: string, slot: string, reason?: string) => ({
    subject: "Update on your coaching session request — Game Ground",
    html: `${brand}<div style="padding:28px">
      <h2 style="color:#fff;margin:0 0 12px">Booking Request Rejected</h2>
      <p style="color:#9ca3af">Hi ${playerName}, your coaching session request with <strong style="color:#fff">${coachName}</strong> (${slot}) was rejected.</p>
      ${reason ? `<div style="margin-top:16px;padding:14px;background:#1a1a1a;border-radius:8px;border-left:3px solid #e63946"><p style="color:#9ca3af;margin:0">Reason: ${reason}</p></div>` : ""}
      <p style="color:#9ca3af;margin-top:16px;font-size:13px">You can browse other coaches and request a new session anytime.</p>
    </div>${footer}`,
  }),
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add bookingApproved + bookingRejected email templates

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Admin bookings API — dispatch to service + notify + 409

**Files:**
- Modify: `src/app/api/admin/bookings/route.ts` (PATCH handler + add imports + a notify helper)

The GET handler is unchanged. Replace the PATCH and add imports/helper.

- [ ] **Step 1: Update the imports at the top of the file**

Replace the existing import block with:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import {
  approveBooking,
  rejectBooking,
  completeBooking,
  cancelBooking,
  BookingTransitionError,
  BookingConflictError,
} from "@/lib/bookings";
import { sendEmail, emails } from "@/lib/email";
```

- [ ] **Step 2: Replace the PATCH handler and add the notify helper**

Replace the entire existing `export async function PATCH(...) { ... }` with:
```ts
type DecidedBooking = {
  id: string; userId: string; coachId: string; batchId: string | null; rejectionReason: string | null;
};

async function notifyBookingDecision(booking: DecidedBooking, status: string) {
  if (status !== "approved" && status !== "rejected") return;
  const [user, coach, batch] = await Promise.all([
    prisma.user.findUnique({ where: { id: booking.userId }, select: { name: true, email: true } }),
    prisma.coach.findUnique({ where: { id: booking.coachId }, select: { name: true, address: true, phone: true } }),
    booking.batchId
      ? prisma.batch.findUnique({ where: { id: booking.batchId }, select: { day: true, time: true } })
      : Promise.resolve(null),
  ]);
  if (!user?.email) return;
  const slot = batch ? `${batch.day} ${batch.time}` : "your requested session";
  const coachName = coach?.name ?? "your coach";
  const tpl =
    status === "approved"
      ? emails.bookingApproved(user.name, coachName, slot, coach?.address ?? "", coach?.phone ?? "")
      : emails.bookingRejected(user.name, coachName, slot, booking.rejectionReason ?? undefined);
  await sendEmail({ to: user.email, ...tpl });
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status, rejectionReason } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

  try {
    let updated;
    if (status === "approved") updated = await approveBooking(id);
    else if (status === "rejected") updated = await rejectBooking(id, rejectionReason);
    else if (status === "completed") updated = await completeBooking(id);
    else if (status === "cancelled") updated = await cancelBooking(id);
    else return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    // Best-effort email; never fail the status change on a mail error.
    await notifyBookingDecision(updated, status).catch((e) => console.error("[booking email]", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookingTransitionError || e instanceof BookingConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification (dev server)**

Run the dev server (`npm run dev`), log into the admin panel, then in another terminal exercise the endpoint with the admin cookie. Quick path: in the admin Bookings UI you build in Task 9 you'll click these; for now verify the API directly using a pending booking id from `prisma studio`:
```bash
# Approve (expect {"ok":true} and an [EMAIL ...] log line in the dev server console)
curl -s -X PATCH localhost:3000/api/admin/bookings -H 'Content-Type: application/json' \
  -b 'gg_admin=<ADMIN_JWT>' -d '{"id":"<PENDING_ID>","status":"approved"}'
# Approving an already-terminal booking -> 409
curl -s -X PATCH localhost:3000/api/admin/bookings -H 'Content-Type: application/json' \
  -b 'gg_admin=<ADMIN_JWT>' -d '{"id":"<REJECTED_ID>","status":"approved"}'
```
Expected: first returns `{"ok":true}` + a console `[EMAIL — no RESEND_API_KEY] To: ... Subject: Your coaching session has been approved`; second returns HTTP 409 with an `error` message.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/bookings/route.ts
git commit -m "feat: admin booking PATCH uses approval service, sends email, 409 on conflict

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Lock down player/coach booking API + billable coach counts

**Files:**
- Modify: `src/app/api/bookings/route.ts` (PATCH → player self-cancel only; GET coach branch → billable counts)
- Modify: `src/hooks/useData.ts` (`useCancelBooking` payload; `Booking` type)

- [ ] **Step 1: Update imports + GET coach counts in `src/app/api/bookings/route.ts`**

Add to the imports at the top:
```ts
import { cancelBooking, BookingTransitionError, BILLABLE_STATUSES } from "@/lib/bookings";
```
Then in the GET handler's coach branch, replace the early-return and the `return ok({...})` so counts use billable statuses. Change:
```ts
      if (!coach) return ok({ pending: 0, confirmed: 0, list: [] });
```
to:
```ts
      if (!coach) return ok({ pending: 0, approved: 0, list: [] });
```
and change:
```ts
      return ok({
        pending:   list.filter(b => b.status === "pending").length,
        confirmed: list.filter(b => b.status === "confirmed").length,
        list,
      });
```
to:
```ts
      return ok({
        pending:  list.filter(b => b.status === "pending").length,
        approved: list.filter(b => (BILLABLE_STATUSES as string[]).includes(b.status)).length,
        list,
      });
```

- [ ] **Step 2: Replace the PATCH handler (player self-cancel only)**

Replace the entire existing `export async function PATCH(...)` in `src/app/api/bookings/route.ts` with:
```ts
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { id, status } = await req.json();
    // Players/coaches may only cancel their own booking here.
    // Approve / reject / complete go through the admin route only.
    if (status && status !== "cancelled") return fail("Only cancellation is allowed here", 403);

    const booking = await prisma.booking.findUnique({ where: { id }, select: { userId: true } });
    if (!booking) return fail("Booking not found", 404);
    if (booking.userId !== session.id) return fail("Unauthorized", 403);

    try {
      const updated = await cancelBooking(id);
      return ok(updated);
    } catch (e) {
      if (e instanceof BookingTransitionError) return fail(e.message, 409);
      throw e;
    }
  } catch (e) { return handleErr(e); }
}
```

- [ ] **Step 3: Fix the cancel hook payload + extend the `Booking` type in `src/hooks/useData.ts`**

Change `useCancelBooking`'s `mutationFn` body from:
```ts
    mutationFn: bookingId => f("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) }),
```
to (the API expects `id` + `status`, not `bookingId` — this also fixes the currently-broken cancel):
```ts
    mutationFn: id => f("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "cancelled" }) }),
```
And extend the `Booking` type to expose the new fields the player page reads:
```ts
export type Booking = {
  id: string; userId: string; coachId: string; batchId?: string;
  status: string; note?: string; coachName?: string; sport?: string;
  imageUrl?: string; location?: string; createdAt: string; updatedAt: string;
  rejectionReason?: string | null;
  approvedAt?: string | null; rejectedAt?: string | null;
  completedAt?: string | null; cancelledAt?: string | null;
};
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

With the dev server running and logged in as a player who owns a pending booking:
```bash
# Self-cancel own booking -> ok
curl -s -X PATCH localhost:3000/api/bookings -H 'Content-Type: application/json' -b 'gg_token=<PLAYER_JWT>' -d '{"id":"<OWN_PENDING_ID>","status":"cancelled"}'
# Attempt to approve via this route -> 403
curl -s -X PATCH localhost:3000/api/bookings -H 'Content-Type: application/json' -b 'gg_token=<PLAYER_JWT>' -d '{"id":"<OWN_PENDING_ID>","status":"approved"}'
# Attempt to cancel someone else's booking -> 403
curl -s -X PATCH localhost:3000/api/bookings -H 'Content-Type: application/json' -b 'gg_token=<PLAYER_JWT>' -d '{"id":"<OTHER_ID>","status":"cancelled"}'
```
Expected: first `{"ok":true,...}`; second `403 Only cancellation is allowed here`; third `403 Unauthorized`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/bookings/route.ts src/hooks/useData.ts
git commit -m "feat: restrict /api/bookings PATCH to player self-cancel; billable coach counts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Update legacy "confirmed" consumers (reviews, revenue, overview, coaches)

**Files:**
- Modify: `src/app/api/coaches/[id]/reviews/route.ts`
- Modify: `src/app/api/admin/revenue/route.ts`
- Modify: `src/app/api/admin/overview/route.ts`
- Modify: `src/app/api/admin/coaches/route.ts`

- [ ] **Step 1: Review eligibility → `completed` only**

In `src/app/api/coaches/[id]/reviews/route.ts`, change the eligibility query and error message. Replace:
```ts
    const hasBooking = await prisma.booking.findFirst({
      where: { coachId, userId: session.id, status: "confirmed" },
      select: { id: true },
    });
    if (!hasBooking) return fail("You can only review coaches you've had a confirmed booking with", 403);
```
with:
```ts
    const hasBooking = await prisma.booking.findFirst({
      where: { coachId, userId: session.id, status: "completed" },
      select: { id: true },
    });
    if (!hasBooking) return fail("You can only review a coach after a completed session", 403);
```

- [ ] **Step 2: Revenue → count billable statuses**

In `src/app/api/admin/revenue/route.ts`, add the import after the existing imports:
```ts
import { BILLABLE_STATUSES } from "@/lib/bookings";
```
Then replace:
```ts
    prisma.booking.count({ where: { status: "confirmed" } }),
```
with:
```ts
    prisma.booking.count({ where: { status: { in: BILLABLE_STATUSES } } }),
```
(The destructured variable is named `confirmedBookings`; leave the name — it now holds the billable count and the rest of the file uses it unchanged.)

- [ ] **Step 3: Overview → confirm-rate uses billable; active-bookings excludes rejected**

In `src/app/api/admin/overview/route.ts`, add the import:
```ts
import { BILLABLE_STATUSES } from "@/lib/bookings";
```
Change the active-bookings count (operational: pending + approved only) from:
```ts
    prisma.booking.count({ where: { status: { not: "cancelled" } } }),
```
to:
```ts
    prisma.booking.count({ where: { status: { in: ["pending", "approved"] } } }),
```
Change the confirm-rate calc from:
```ts
  const confirmRate = bookings.length > 0
    ? Math.round((bookings.filter(b => b.status === "confirmed").length / bookings.length) * 100) : 0;
```
to:
```ts
  const confirmRate = bookings.length > 0
    ? Math.round((bookings.filter(b => (BILLABLE_STATUSES as string[]).includes(b.status)).length / bookings.length) * 100) : 0;
```
(The `cancelRate` line already uses `"cancelled"` — leave it.)

- [ ] **Step 4: Admin coaches → billable count**

In `src/app/api/admin/coaches/route.ts`, add the import:
```ts
import { BILLABLE_STATUSES } from "@/lib/bookings";
```
Change:
```ts
      confirmedBookings: bookings.filter(b => b.status === "confirmed").length,
```
to:
```ts
      confirmedBookings: bookings.filter(b => (BILLABLE_STATUSES as string[]).includes(b.status)).length,
```
(Property name kept so the admin coaches UI is untouched; it now means "approved + completed".)

- [ ] **Step 5: Type-check + grep for stragglers**

Run:
```bash
npx tsc --noEmit
grep -rn '"confirmed"' src/app | grep -v node_modules
```
Expected: type-check clean; the grep returns **no** matches under `src/app/api`. (UI string matches in `coach/[id]` and `coach/dashboard` are handled in Tasks 8/10.)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/coaches/[id]/reviews/route.ts src/app/api/admin/revenue/route.ts src/app/api/admin/overview/route.ts src/app/api/admin/coaches/route.ts
git commit -m "feat: review eligibility requires completed; metrics count approved+completed

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Status badges — add approved / rejected

**Files:**
- Modify: `src/components/Shared.tsx` (`StatusBadge` color map)
- Modify: `src/components/admin/Badge.tsx` (`Badge` color map)

- [ ] **Step 1: Extend `StatusBadge`**

In `src/components/Shared.tsx`, add `approved` and `rejected` to the `map` (place them with the other booking statuses):
```ts
    pending:   { bg: "rgba(234,179,8,0.08)",  color: "#fbbf24", border: "rgba(234,179,8,0.2)"  },
    approved:  { bg: "rgba(34,197,94,0.08)",  color: "#4ade80", border: "rgba(34,197,94,0.2)"  },
    rejected:  { bg: "rgba(239,68,68,0.08)",  color: "#f87171", border: "rgba(239,68,68,0.2)"  },
    confirmed: { bg: "rgba(34,197,94,0.08)",  color: "#4ade80", border: "rgba(34,197,94,0.2)"  },
    cancelled: { bg: "rgba(239,68,68,0.08)",  color: "#f87171", border: "rgba(239,68,68,0.2)"  },
```
(Leave `confirmed`/`open`/`full`/`completed` entries as-is for backward compatibility.)

- [ ] **Step 2: Extend admin `Badge`**

In `src/components/admin/Badge.tsx`, add to the `map`:
```ts
    approved:          { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
    rejected:          { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
```
(Place them after the `confirmed` entry.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Shared.tsx src/components/admin/Badge.tsx
git commit -m "feat: add approved/rejected status badges

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Admin Coach Bookings UI — tabs + Approve/Reject/Complete

**Files:**
- Modify: `src/app/admin/bookings/page.tsx`

Add status tabs, route the mutation through the new statuses, add a reject-reason prompt, and surface 409 conflicts.

- [ ] **Step 1: Update the `Booking` type + mutation in the page**

In `src/app/admin/bookings/page.tsx`, replace the `patch` mutation so it can send a reason and report conflicts. Replace:
```ts
  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });
```
with:
```ts
  const patch = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const r = await fetch("/api/admin/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, rejectionReason }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Action failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
    onError: (e: Error) => alert(e.message),
  });

  const reject = (id: string) => {
    const reason = prompt("Optional: reason for rejection (shown to the player)") ?? undefined;
    patch.mutate({ id, status: "rejected", rejectionReason: reason || undefined });
  };
```
Add `import { toast } from "sonner";` is **not** required (we use `alert` for the conflict to avoid new wiring); leave imports otherwise unchanged.

- [ ] **Step 2: Replace the status filter values with the new vocabulary**

In the filters block, change the status options array from:
```ts
            {[{ val: status, set: setStatus, opts: ["all","pending","confirmed","cancelled"], label: "Status" },
```
to:
```ts
            {[{ val: status, set: setStatus, opts: ["all","pending","approved","rejected","completed","cancelled"], label: "Status" },
```

- [ ] **Step 3: Add quick status tabs above the table**

Immediately before the `{/* Filters */}` block, insert a tab row that drives the existing `status` filter (Pending / Approved / Rejected / Completed). Add:
```tsx
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {([
              ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["completed", "Completed"], ["all", "All"],
            ] as [string, string][]).map(([val, label]) => (
              <button key={val} onClick={() => { setStatus(val); setPage(1); }}
                style={{ padding: "7px 16px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  background: status === val ? "#e63946" : "transparent",
                  color: status === val ? "#fff" : "#9ca3af",
                  border: `1px solid ${status === val ? "#e63946" : "rgba(255,255,255,0.12)"}` }}>
                {label}
              </button>
            ))}
          </div>
```

- [ ] **Step 4: Replace the row action buttons (table) with Approve / Reject / Complete**

In the table body, replace the actions cell block:
```tsx
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {b.status === "pending" && (
                            <button onClick={() => patch.mutate({ id: b.id, status: "confirmed" })} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
                          )}
                          {b.status !== "cancelled" && (
                            <button onClick={() => patch.mutate({ id: b.id, status: "cancelled" })} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#f87171", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                          )}
                        </div>
                      </td>
```
with:
```tsx
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {b.status === "pending" && (
                            <>
                              <button onClick={() => patch.mutate({ id: b.id, status: "approved" })} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Approve</button>
                              <button onClick={() => reject(b.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#f87171", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Reject</button>
                            </>
                          )}
                          {b.status === "approved" && (
                            <button onClick={() => patch.mutate({ id: b.id, status: "completed" })} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Mark Completed</button>
                          )}
                        </div>
                      </td>
```

- [ ] **Step 5: Replace the drawer action buttons**

In the drawer, replace:
```tsx
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {drawer.status === "pending" && <button onClick={() => { patch.mutate({ id: drawer.id, status: "confirmed" }); setDrawer(null); }} style={{ height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Confirm Booking</button>}
                {drawer.status !== "cancelled" && <button onClick={() => { patch.mutate({ id: drawer.id, status: "cancelled" }); setDrawer(null); }} style={{ height: 40, borderRadius: 9, fontSize: 13, fontWeight: 600, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>Cancel Booking</button>}
              </div>
```
with:
```tsx
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {drawer.status === "pending" && (
                  <>
                    <button onClick={() => { patch.mutate({ id: drawer.id, status: "approved" }); setDrawer(null); }} style={{ height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, background: "#4ade80", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Approve Booking</button>
                    <button onClick={() => { reject(drawer.id); setDrawer(null); }} style={{ height: 40, borderRadius: 9, fontSize: 13, fontWeight: 600, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>Reject Booking</button>
                  </>
                )}
                {drawer.status === "approved" && (
                  <button onClick={() => { patch.mutate({ id: drawer.id, status: "completed" }); setDrawer(null); }} style={{ height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, background: "#60a5fa", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Mark Completed</button>
                )}
              </div>
```

- [ ] **Step 6: Type-check + manual UI check**

Run: `npx tsc --noEmit`
Then with the dev server running, open `/admin/bookings`, confirm: tabs filter rows; a Pending row shows player/coach/batch/booked-on/contact (drawer); Approve moves it to Approved; Reject prompts for a reason then moves it to Rejected; an Approved row offers Mark Completed; approving a conflicting duplicate shows the 409 `alert`.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/bookings/page.tsx
git commit -m "feat: admin coach-bookings tabs + approve/reject/complete actions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Coach dashboard — view-only, tabbed

**Files:**
- Modify: `src/app/coach/dashboard/bookings/page.tsx` (remove approve/reject; tab by status)
- Modify: `src/app/coach/dashboard/page.tsx` (stat label + recent badge)

- [ ] **Step 1: Rewrite the coach bookings page as read-only tabs**

A coach must see the bookings made *with them*, so this page uses the coach
endpoint (`/api/bookings?role=coach`, which returns `{ list }` with
`playerName`), not the player `useBookings` hook. Replace the entire contents of
`src/app/coach/dashboard/bookings/page.tsx` with:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/Shared";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const TABS = [
  { key: "pending",   label: "Pending Requests", match: (s: string) => s === "pending" },
  { key: "upcoming",  label: "Upcoming Sessions", match: (s: string) => s === "approved" },
  { key: "completed", label: "Completed", match: (s: string) => s === "completed" },
  { key: "cancelled", label: "Cancelled", match: (s: string) => s === "cancelled" || s === "rejected" },
] as const;

export default function CoachBookings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { data, isLoading } = useQuery<{ list: { id: string; status: string; note?: string; createdAt: string; playerName?: string }[] }>({
    queryKey: ["coach-bookings"],
    queryFn: () => fetch("/api/bookings?role=coach").then(r => r.json()).then(d => d.data ?? d),
    enabled: !!user,
  });
  const bookings = data?.list;
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");

  useEffect(() => {
    if (!loading && (!user || user.role !== "coach")) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return <div style={{ minHeight: "100vh", background: "#080808" }}><PremiumNav /></div>;

  const active = TABS.find(t => t.key === tab)!;
  const list = (bookings ?? []).filter(b => active.match(b.status));

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <Link href="/coach/dashboard" style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>My Bookings</h1>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: tab === t.key ? "#e63946" : "transparent",
                color: tab === t.key ? "#fff" : "#9ca3af",
                border: `1px solid ${tab === t.key ? "#e63946" : "rgba(255,255,255,0.12)"}` }}>
              {t.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>
          Bookings are reviewed and approved by the Game Ground team. You&apos;ll see them here once their status updates.
        </p>

        {isLoading ? (
          <p style={{ color: "#6b7280" }}>Loading…</p>
        ) : !list.length ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#9ca3af", fontSize: 16 }}>Nothing here yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.map(b => (
              <div key={b.id} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e63946", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 18, flexShrink: 0 }}>
                      {(b as { playerName?: string }).playerName?.[0] ?? "P"}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{(b as { playerName?: string }).playerName ?? "Player"}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>Requested {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      {b.note && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>&quot;{b.note}&quot;</p>}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update the coach dashboard stat label + recent badge**

In `src/app/coach/dashboard/page.tsx`:
- Change the query generic + stat to use `approved` instead of `confirmed`. Replace `confirmed: number` in the `useQuery` generic with `approved: number`, and change the stat line:
```ts
    { icon: Users,    label: "Confirmed Students", value: bookings?.confirmed ?? "—", color: "#4ade80" },
```
to:
```ts
    { icon: Users,    label: "Approved Students", value: bookings?.approved ?? "—", color: "#4ade80" },
```
- Replace the hand-rolled status `<span>` in the recent-bookings list with `StatusBadge`. Add `import { StatusBadge } from "@/components/Shared";` at the top, then replace:
```tsx
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: b.status === "confirmed" ? "rgba(34,197,94,0.15)" : b.status === "pending" ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)", color: b.status === "confirmed" ? "#4ade80" : b.status === "pending" ? "#eab308" : "#f87171", textTransform: "capitalize" }}>{b.status}</span>
```
with:
```tsx
                <StatusBadge status={b.status} />
```
- Update the "Quick Actions" copy that says "Confirm or reject booking requests" → "Track booking requests & their status".

- [ ] **Step 3: Type-check + manual check**

Run: `npx tsc --noEmit`
Then with the dev server running, log in as a coach: `/coach/dashboard/bookings` shows the four tabs, no Confirm/Reject buttons; `/coach/dashboard` shows "Approved Students" and badge statuses.

- [ ] **Step 4: Commit**

```bash
git add src/app/coach/dashboard/bookings/page.tsx src/app/coach/dashboard/page.tsx
git commit -m "feat: coach dashboard view-only, tabbed by booking status

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Player bookings page + coach detail status copy

**Files:**
- Create: `src/app/bookings/page.tsx`
- Modify: `src/app/coach/[id]/page.tsx` (status copy `confirmed`→`approved`; review hint)

- [ ] **Step 1: Create the player "My Coaching Sessions" page**

Create `src/app/bookings/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PremiumNav } from "@/components/premium/PremiumNav";
import { useAuth } from "@/context/AuthContext";
import { useBookings, useCancelBooking } from "@/hooks/useData";
import { StatusBadge } from "@/components/Shared";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const GROUPS = [
  { key: "pending",   label: "Pending Approval", match: (s: string) => s === "pending" },
  { key: "approved",  label: "Approved",         match: (s: string) => s === "approved" },
  { key: "completed", label: "Completed",        match: (s: string) => s === "completed" },
  { key: "rejected",  label: "Rejected",         match: (s: string) => s === "rejected" },
  { key: "cancelled", label: "Cancelled",        match: (s: string) => s === "cancelled" },
] as const;

export default function PlayerBookings() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { data: bookings, isLoading } = useBookings();
  const cancel = useCancelBooking();
  const [tab, setTab] = useState<(typeof GROUPS)[number]["key"]>("pending");

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/bookings");
  }, [user, loading, router]);

  if (loading || !user) return <div style={{ minHeight: "100vh", background: "#080808" }}><PremiumNav /></div>;

  const group = GROUPS.find(g => g.key === tab)!;
  const list = (bookings ?? []).filter(b => group.match(b.status));

  return (
    <div style={{ minHeight: "100vh", background: "#080808" }}>
      <PremiumNav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <Link href="/profile" style={{ width: 36, height: 36, borderRadius: 9, background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#9ca3af" }}><ArrowLeft size={17} /></Link>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>My Coaching Sessions</h1>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {GROUPS.map(g => (
            <button key={g.key} onClick={() => setTab(g.key)}
              style={{ padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: tab === g.key ? "#e63946" : "transparent",
                color: tab === g.key ? "#fff" : "#9ca3af",
                border: `1px solid ${tab === g.key ? "#e63946" : "rgba(255,255,255,0.12)"}` }}>
              {g.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color: "#6b7280" }}>Loading…</p>
        ) : !list.length ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#9ca3af", fontSize: 16 }}>No {group.label.toLowerCase()} sessions.</p>
            <Link href="/coach" style={{ color: "#e63946", fontSize: 14, textDecoration: "none" }}>Find a coach →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.map(b => (
              <div key={b.id} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <Link href={`/coach/${b.coachId}`} style={{ fontSize: 15, fontWeight: 700, color: "#fff", textDecoration: "none" }}>{b.coachName ?? "Coach"}</Link>
                    {b.sport && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{b.sport}{b.location ? ` · ${b.location}` : ""}</p>}
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Requested {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {b.status === "rejected" && (
                  <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>Your booking request was rejected.</p>
                    {b.rejectionReason && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Reason: {b.rejectionReason}</p>}
                  </div>
                )}

                {(b.status === "pending" || b.status === "approved") && (
                  <button onClick={() => cancel.mutate(b.id)} disabled={cancel.isPending}
                    style={{ marginTop: 12, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "transparent", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel booking
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update coach detail status copy (`confirmed` → `approved`)**

In `src/app/coach/[id]/page.tsx`, the booking-confirmation block (around lines 674–712) compares `bookingStatus === "confirmed"`. Replace every `bookingStatus === "confirmed"` with `bookingStatus === "approved"`, and every `bookingStatus !== "confirmed"` with `bookingStatus !== "approved"`. The user-visible strings stay sensible:
- `"Session confirmed!"` → `"Session approved!"`
- `"Your session has been confirmed by the coach. See you on the court!"` → `"Your session has been approved. See you on the court!"`
- The pending copy `"Waiting for confirmation from the team..."` and `"You'll be notified once confirmed"` may stay as-is (they describe the pending state).

Run this to confirm none remain:
```bash
grep -n 'bookingStatus === "confirmed"\|bookingStatus !== "confirmed"' src/app/coach/[id]/page.tsx
```
Expected: no matches after editing.

- [ ] **Step 3: Update the review hint text**

In `src/app/coach/[id]/page.tsx`, change:
```tsx
                              {review.text.length}/500 · Must have a confirmed booking to review
```
to:
```tsx
                              {review.text.length}/500 · Must have a completed session to review
```

- [ ] **Step 4: Add a nav/profile link to the new page (discoverability)**

In `src/app/profile/[id]/page.tsx`, find where the profile shows actions/links for the owner and add a link to `/bookings` labeled "My Coaching Sessions". If there is an obvious actions row (e.g. near an "Edit Profile" link), add:
```tsx
<Link href="/bookings" style={{ padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}>My Coaching Sessions</Link>
```
(If no such row exists, skip this step — the page is still reachable at `/bookings`; note that you skipped it.)

- [ ] **Step 5: Type-check + manual check**

Run: `npx tsc --noEmit`
Then as a player, visit `/bookings`: tabs group your bookings; a rejected booking shows "Your booking request was rejected." + reason; pending/approved offer Cancel.

- [ ] **Step 6: Commit**

```bash
git add src/app/bookings/page.tsx src/app/coach/[id]/page.tsx src/app/profile/[id]/page.tsx
git commit -m "feat: player coaching-sessions page + coach detail approved-status copy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests + type-check + build**

Run:
```bash
npm test && npx tsc --noEmit && npm run build
```
Expected: tests pass; no type errors in booking files; build succeeds.

- [ ] **Step 2: Full lifecycle walkthrough (dev server)**

With `npm run dev`, perform the 6 spec checks + the review additions:
1. As a player, book a coach (`/coach/<id>`) → booking appears `pending` in `/bookings` and the seat count drops on the coach page.
2. As admin (`/admin/bookings`), Approve it → status `approved`; player `/bookings` shows Approved; dev console logs the approval email.
3. Create a second pending booking; admin Reject with a reason → `rejected`; player sees "Your booking request was rejected." + reason; seat returns; rejection email logged.
4. Double-booking: approve a booking, then create + approve another identical (same player + coach + batch) → 409 `alert` in admin UI; second stays pending.
5. Authorization: as the player, `curl` PATCH `/api/bookings` with `status:"approved"` → 403; only `/api/admin/bookings` (admin cookie) can approve.
6. Status display: badges render `pending/approved/rejected/completed/cancelled` in admin, coach, and player views; coach view has no approve/reject buttons.
7. Transitions: admin `curl` attempts `rejected→approved`, `completed→approved`, `cancelled→approved` → all 409.
8. Metrics: a `pending`/`rejected`/`cancelled` booking does not increase the coach "Approved Students" count or `/admin/revenue` Coach Bookings count; an `approved`/`completed` one does.
9. Review gating: with only an `approved` (not completed) booking, POST `/api/coaches/<id>/reviews` → 403; after admin marks it `completed`, the review succeeds.

- [ ] **Step 3: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test: verify coach session approval workflow end-to-end

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Spec Coverage Map

| Spec requirement | Task |
|---|---|
| Statuses pending/approved/rejected/completed/cancelled; default pending | 1, 2 |
| Admin Coach Bookings section with tabs + pending details + Approve/Reject | 9 |
| Approve action (status, confirmed, visible to player/coach) | 5, 9, 10, 11 |
| Reject action (status, timestamp, optional reason, player message) | 2, 5, 9, 11 |
| Coach availability / double-booking protection | 3, 12 |
| Player dashboard with five states | 11 |
| Coach dashboard with four groupings | 10 |
| Notifications on approval/rejection (email infra) | 4, 5 |
| Security: only admins approve/reject; protected routes | 5, 6, 12 |
| Req #1 Approved-only business metrics (approved+completed) | 6, 7 |
| Req #2 Review eligibility = completed only | 7, 11 |
| Req #3 Cancellation rules (player cancel, release seat, terminal) | 3, 6, 11 |
| Req #4 Status transition validation (terminal states, invalid blocked) | 1, 3, 12 |
| Req #5 Audit trail timestamps | 1, 2, 3 |
| Req #6 Centralized status logic | 1, 3 |
| Testing (6 checks + additions) | 1, 12 |
