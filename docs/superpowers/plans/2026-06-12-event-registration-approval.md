# Event System Slice 2 — Registration Approval (extend `adminBookings`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the events category in the existing `adminBookings` framework a real approval workflow (approve/reject/refund + auto-vs-manual enforcement + user-visible status), reusing the same machinery the coaches category already uses — no parallel service, route, or table.

**Architecture:** A migration adds approval audit columns to `EventRegistration` and normalizes legacy `registered → approved`. Events gain *their own* status helpers in `adminBookings/status.ts` (the shared payment-bucket helpers stay untouched for camps/workshops). `adminBookings/actions.ts` gains an events approve/reject/refund branch (transactional, seat-aware, refunds only a real paid `Payment` row). The existing `/api/admin/bookings/events` route + `config.tsx` + UI are extended. Both registration creation paths enforce `approvalMode`. The detail page shows the user their approval status. The redundant read-only table on `/admin/events` is removed.

**Tech Stack:** Next.js 16.2, Prisma 7 + PostgreSQL (Supabase), React 19, `@tanstack/react-query`, zod, vitest (with a hand-rolled `prismaMock`).

**Spec:** `docs/superpowers/specs/2026-06-12-event-registration-approval-design.md`

## ⚠️ Pre-flight (once, before Task 1)
- [ ] Per `AGENTS.md`, skim the relevant Next 16 guide in `node_modules/next/dist/docs/` before editing route handlers.
- [ ] **Critical coupling:** Task 1 (migration) and Task 4 (events status logic in the route) change behavior that is only correct *together* — a normalized `rejected` paid row would otherwise show/count as "paid". Don't ship Task 1 to anyone's view without Tasks 2+4. (They're separate commits but one logical unit; Task 9 verifies the pair.)
- [ ] **Local Prisma note:** any throwaway DB script must use the `PrismaPg` adapter (see `src/lib/prisma.ts`); a bare `new PrismaClient()` has no datasource URL and fails.

---

## File Structure

**Modify:**
- `prisma/schema.prisma` (+ new migration dir) — `EventRegistration` audit columns.
- `src/lib/adminBookings/status.ts` (+ `status.test.ts`) — events-specific helpers + labels.
- `src/lib/adminBookings/actions.ts` (+ new `actions.events.test.ts`) — events approve/reject/refund.
- `src/app/api/admin/bookings/events/route.ts` — approval-axis where/counts/derive + CSV.
- `src/lib/adminBookings/config.tsx` — events rowActions/bulkActions/columns + `statusLabels`.
- `src/components/admin/bookings/SummaryCards.tsx`, `BookingsCategoryView.tsx` — category-aware filter labels.
- `src/app/api/events/[id]/route.ts`, `src/app/api/payments/verify/route.ts` — enforce `approvalMode`.
- `src/app/api/events/[id]/route.ts` (GET) + `src/hooks/useData.ts` + `src/app/events/[id]/page.tsx` — user approval status.
- `src/app/admin/events/page.tsx` (+ `src/app/api/admin/events/route.ts` GET) — remove the read-only registrations table.

---

## Task 1: Migration — approval audit columns + normalize status

**Files:** Modify `prisma/schema.prisma` (model `EventRegistration`, ~lines 335-348); new migration dir.

- [ ] **Step 1: Add columns.** In `model EventRegistration`, after the existing `cancelledAt   DateTime?` line, add:

```prisma
  approvedAt    DateTime?
  rejectedAt    DateTime?
  rejectionReason String?
```

- [ ] **Step 2: Create the migration WITHOUT applying (so we can add the data backfill).**

Run: `npx prisma migrate dev --create-only --name add_event_registration_approval`
Expected: creates `prisma/migrations/<ts>_add_event_registration_approval/migration.sql` with `ALTER TABLE` statements, not applied yet.

- [ ] **Step 3: Append the normalization backfill** to the generated `migration.sql` (add at the END of the file):

```sql
-- Normalize legacy approval status: old auto-accepted rows become "approved".
UPDATE "EventRegistration" SET status = 'approved' WHERE status = 'registered';
```

- [ ] **Step 4: Apply it.**

Run: `npm run db:migrate`
Expected: "Your database is now in sync with your schema." (If Prisma reports drift/reset — STOP and report; do not reset.)

- [ ] **Step 5: Verify + regenerate client.**

Run: `npx prisma migrate status` → "Database schema is up to date!"
Run: `npx prisma generate`

- [ ] **Step 6: Commit.**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(events): registration approval audit columns + normalize status"
```
(End every commit message in this plan with a blank line then `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: Events status helpers (TDD)

**Files:** Modify `src/lib/adminBookings/status.ts`; Test `src/lib/adminBookings/status.test.ts`.

Add events-specific helpers WITHOUT changing `deriveRegistrationStatus`,
`registrationWhereForStatus`, or any other category's behavior.

- [ ] **Step 1: Add failing tests** to `src/lib/adminBookings/status.test.ts` (append these `describe` blocks; keep the imports — extend the import line to include the new names `eventWhereForStatus, deriveEventRegistrationStatus, EVENT_STATUS_LABELS`):

```ts
describe("eventWhereForStatus (approval axis)", () => {
  it("returns {} for all/empty", () => {
    expect(eventWhereForStatus("all")).toEqual({});
    expect(eventWhereForStatus("")).toEqual({});
  });
  it("filters by the approval status directly", () => {
    expect(eventWhereForStatus("pending")).toEqual({ status: "pending" });
    expect(eventWhereForStatus("approved")).toEqual({ status: "approved" });
    expect(eventWhereForStatus("rejected")).toEqual({ status: "rejected" });
    expect(eventWhereForStatus("cancelled")).toEqual({ status: "cancelled" });
  });
});

describe("deriveEventRegistrationStatus", () => {
  it("returns the approval status verbatim (a rejected paid row is 'rejected', not 'paid')", () => {
    expect(deriveEventRegistrationStatus("pending")).toBe("pending");
    expect(deriveEventRegistrationStatus("approved")).toBe("approved");
    expect(deriveEventRegistrationStatus("rejected")).toBe("rejected");
    expect(deriveEventRegistrationStatus("cancelled")).toBe("cancelled");
  });
});

describe("EVENT_STATUS_LABELS", () => {
  it("labels pending as approval, not payment", () => {
    expect(EVENT_STATUS_LABELS.pending).toBe("Pending approval");
    expect(EVENT_STATUS_LABELS.approved).toBe("Approved");
    expect(EVENT_STATUS_LABELS.rejected).toBe("Rejected");
  });
});

describe("CATEGORY_STATUSES.events is the approval axis", () => {
  it("lists approval buckets", () => {
    expect(CATEGORY_STATUSES.events).toEqual(["pending", "approved", "rejected", "cancelled"]);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run src/lib/adminBookings/status.test.ts`
Expected: FAIL (undefined exports + old `CATEGORY_STATUSES.events`).

- [ ] **Step 3: Implement.** In `src/lib/adminBookings/status.ts`:
  - Change the `events` line in `CATEGORY_STATUSES` from
    `events: ["pending", "paid", "failed", "refunded", "cancelled"],`
    to `events: ["pending", "approved", "rejected", "cancelled"],`
  - Append these exports at the end of the file:

```ts
/** Events use an approval axis (status), with payment shown as a separate column. */
export const EVENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** Filter fragment for the events approval axis. */
export function eventWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  return { status: bucket };
}

/** Events display-status IS the approval status (payment shown separately). */
export function deriveEventRegistrationStatus(status: string): string {
  return status;
}
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run src/lib/adminBookings/status.test.ts`
Expected: PASS (existing + new tests).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/adminBookings/status.ts src/lib/adminBookings/status.test.ts
git commit -m "feat(events): approval-axis status helpers for adminBookings"
```

---

## Task 3: Actions — events approve/reject/refund (TDD)

**Files:** Modify `src/lib/adminBookings/actions.ts`; Test (new) `src/lib/adminBookings/actions.events.test.ts`.

- [ ] **Step 1: Add `approve`/`reject`/`refund` to `ALLOWED_ACTIONS.events`.** In `actions.ts` change the `events` line to:

```ts
  events:          ["approve", "reject", "refund", "cancel", "mark-paid", "mark-refunded"],
```

- [ ] **Step 2: Add the events approval branch in `applyAction`.** Insert this block **immediately after** the `isActionAllowed` guard and the `// NOTE: future audit log` comment, and **before** the `if (category === "coaches")` block:

```ts
  if (category === "events" && (action === "approve" || action === "reject" || action === "refund")) {
    await prisma.$transaction(async (tx) => {
      const reg = await tx.eventRegistration.findUnique({
        where: { id },
        select: { status: true, eventId: true, userId: true },
      });
      if (!reg) throw new Error("Not found");

      if (action === "approve") {
        if (reg.status === "approved") return;                 // idempotent
        if (reg.status !== "pending") throw new Error(`Cannot approve a ${reg.status} registration`);
        await tx.eventRegistration.update({ where: { id }, data: { status: "approved", approvedAt: new Date() } });
        return;
      }

      if (action === "reject") {
        if (reg.status === "rejected") return;                 // idempotent
        if (reg.status !== "pending") throw new Error(`Cannot reject a ${reg.status} registration`);
      } else { // refund
        if (reg.status === "cancelled") return;                // idempotent
        if (reg.status !== "approved") throw new Error("Can only refund an approved registration");
      }

      // Refund ONLY a genuinely paid Payment row (free events store paymentStatus
      // "paid" with no Payment row — they must not be marked refunded).
      const paid = await tx.payment.findFirst({
        where: { entityType: "event", entityId: reg.eventId, userId: reg.userId, status: "paid" },
        select: { id: true },
      });
      if (paid) await tx.payment.update({ where: { id: paid.id }, data: { status: "refunded" satisfies PaymentStatus } });

      await tx.eventRegistration.update({
        where: { id },
        data: {
          status: action === "reject" ? "rejected" : "cancelled",
          ...(action === "reject"
            ? { rejectedAt: new Date(), rejectionReason: meta?.rejectionReason ?? null }
            : { cancelledAt: new Date() }),
          ...(paid ? { paymentStatus: "refunded" satisfies PaymentStatus } : {}),
        },
      });

      // Release the held seat (mirror the generic cancel branch).
      const event = await tx.sportEvent.findUnique({ where: { id: reg.eventId }, select: { status: true } });
      await tx.sportEvent.update({
        where: { id: reg.eventId },
        data: { participants: { decrement: 1 }, status: event?.status === "Full" ? "Registration Open" : undefined },
      });
    });
    return;
  }
```

(`PaymentStatus` is already imported at the top of the file. `cancel`/`mark-paid`/`mark-refunded` for events still fall through to the existing generic registration branch unchanged.)

- [ ] **Step 3: Write the failing test file** `src/lib/adminBookings/actions.events.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const model = () => ({ update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    eventRegistration: model(), sportEvent: model(), payment: model(),
    $transaction: vi.fn(async (fn: (p: unknown) => unknown) => fn(prismaMock)),
  };
  return { prismaMock };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/bookings", () => ({
  approveBooking: vi.fn(), rejectBooking: vi.fn(), completeBooking: vi.fn(), cancelBooking: vi.fn(),
}));

import { applyAction, ALLOWED_ACTIONS } from "./actions";

beforeEach(() => vi.clearAllMocks());

describe("events approval actions", () => {
  it("allows approve/reject/refund for events", () => {
    expect(ALLOWED_ACTIONS.events).toEqual(expect.arrayContaining(["approve", "reject", "refund"]));
  });

  it("approve: pending -> approved, no counter change", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    await applyAction("events", "r1", "approve");
    expect(prismaMock.eventRegistration.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "approved" }) }));
    expect(prismaMock.sportEvent.update).not.toHaveBeenCalled();
  });

  it("approve: rejects a non-pending registration", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "approved", eventId: "e1", userId: "u1" });
    await applyAction("events", "r1", "approve"); // already approved -> idempotent no-op
    expect(prismaMock.eventRegistration.update).not.toHaveBeenCalled();
  });

  it("reject: releases the seat and refunds a paid Payment row", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    prismaMock.payment.findFirst.mockResolvedValue({ id: "p1" });
    prismaMock.sportEvent.findUnique.mockResolvedValue({ status: "Full" });
    await applyAction("events", "r1", "reject", { rejectionReason: "no spots" });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "refunded" } }));
    expect(prismaMock.eventRegistration.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "rejected", rejectionReason: "no spots", paymentStatus: "refunded" }) }));
    expect(prismaMock.sportEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ participants: { decrement: 1 }, status: "Registration Open" }) }));
  });

  it("reject: a FREE registration (no paid Payment row) is NOT marked refunded", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.sportEvent.findUnique.mockResolvedValue({ status: "Registration Open" });
    await applyAction("events", "r1", "reject");
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    const data = prismaMock.eventRegistration.update.mock.calls[0][0].data;
    expect(data.status).toBe("rejected");
    expect(data.paymentStatus).toBeUndefined();
  });

  it("refund: only from approved", async () => {
    prismaMock.eventRegistration.findUnique.mockResolvedValue({ status: "pending", eventId: "e1", userId: "u1" });
    await expect(applyAction("events", "r1", "refund")).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run — expect fail then pass.**

Run: `npx vitest run src/lib/adminBookings/actions.events.test.ts`
Expected: PASS after Step 1+2 are in place (run before Step 1/2 to see it fail on `ALLOWED_ACTIONS`/branch).

- [ ] **Step 5: Run the whole adminBookings suite to ensure no regressions.**

Run: `npx vitest run src/lib/adminBookings`
Expected: all pass.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/adminBookings/actions.ts src/lib/adminBookings/actions.events.test.ts
git commit -m "feat(events): approve/reject/refund actions with seat release + refund marking"
```

---

## Task 4: Route — approval-axis where/counts/derive + CSV

**Files:** Modify `src/app/api/admin/bookings/events/route.ts`.

- [ ] **Step 1: Swap the status helpers.** Change the import line
  `import { registrationWhereForStatus, deriveRegistrationStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";`
  to:
```ts
import { eventWhereForStatus, deriveEventRegistrationStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
```

- [ ] **Step 2: Use the approval axis in `toRow` and `buildWhere`.**
  - In `toRow`, change `status: deriveRegistrationStatus(r.status, r.paymentStatus),` to `status: deriveEventRegistrationStatus(r.status),`.
  - In `buildWhere`, change `...registrationWhereForStatus(status),` to `...eventWhereForStatus(status),`.

- [ ] **Step 3: Replace `statusCounts` with approval-bucket counts:**

```ts
async function statusCounts(countWhere: Record<string, unknown>): Promise<StatusCount[]> {
  const base = { ...countWhere }; delete base.status; delete base.paymentStatus;
  const [pending, approved, rejected, cancelled] = await Promise.all([
    prisma.eventRegistration.count({ where: { ...base, status: "pending" } }),
    prisma.eventRegistration.count({ where: { ...base, status: "approved" } }),
    prisma.eventRegistration.count({ where: { ...base, status: "rejected" } }),
    prisma.eventRegistration.count({ where: { ...base, status: "cancelled" } }),
  ]);
  const m: Record<string, number> = { pending, approved, rejected, cancelled };
  return CATEGORY_STATUSES.events.map(s => ({ status: s, count: m[s] ?? 0 }));
}
```

- [ ] **Step 4: Add a Payment column to the CSV** (so approval + payment are both exported). In the `if (p.get("format") === "csv")` block, fetch payment per row and extend headers/cells:

```ts
    const rows = await prisma.eventRegistration.findMany({ where, include: INCLUDE, orderBy: { registeredAt: "desc" } });
    const mapped = await Promise.all(rows.map(async r => ({ row: toRow(r, null), pay: await paymentFor(r.eventId, r.userId) })));
    const headers = ["Booking ID", "User", "Email", "Phone", "Event", "Team", "Date", "Approval", "Payment", "Created"];
    const csv = toCsv(headers, mapped.map(({ row: r, pay }) => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.team, r.sessionDate, r.status, pay?.status ?? "—", r.createdAt]));
```

- [ ] **Step 5: Forward the reject reason in PATCH.** The PATCH currently calls `applyBulk("events", list, action as BookingAction)`. The shared UI (`BookingsCategoryView.runAction`) sends the body as `{ ids, action, rejectionReason }` — note the key is **`rejectionReason`**, not `reason`. Thread it through:
```ts
  const { ids, id, action, rejectionReason } = body;
  // ...
  const results = await applyBulk("events", list, action as BookingAction, rejectionReason ? { rejectionReason } : undefined);
```
(`applyBulk`'s 4th param is `meta?: { rejectionReason?: string }`, and `applyAction` reads `meta?.rejectionReason` in the events branch — so the key must stay `rejectionReason` end-to-end.)

- [ ] **Step 6: Typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors in this route.

- [ ] **Step 7: Commit.**

```bash
git add "src/app/api/admin/bookings/events/route.ts"
git commit -m "feat(events): bookings route uses approval axis + CSV payment column"
```

---

## Task 5: Config + UI — events actions, payment column, approval labels

**Files:** Modify `src/lib/adminBookings/config.tsx`, `src/components/admin/bookings/SummaryCards.tsx`, `src/components/admin/bookings/BookingsCategoryView.tsx`.

- [ ] **Step 1: Add `statusLabels` to the config type.** In `config.tsx`, add to `interface CategoryConfig` (after `bulkActions`):
```ts
  statusLabels?: Record<string, string>;
```

- [ ] **Step 2: Rewrite the `events` config block** to mirror coaches' approval actions, add a Payment column, and supply approval labels. Replace the whole `events: { ... }` object with:

```tsx
  events: {
    key: "events", label: "Events", apiPath: "/api/admin/bookings/events",
    dateMode: "calendar",
    statusLabels: EVENT_STATUS_LABELS,
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "event", header: "Event", render: r => r.entityName },
      { key: "team", header: "Team", render: r => r.extra.team ?? "—" },
      { key: "payment", header: "Payment", render: r => r.payment?.status ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true, needsReason: true },
      { action: "refund", label: "Refund", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
```

  And add the import at the top of `config.tsx`:
```ts
import { EVENT_STATUS_LABELS } from "./status";
```

- [ ] **Step 3: Make `SummaryCards` accept category labels.** In `SummaryCards.tsx`, change the props to add `labels?` and use it:
  - Props type → add `labels?: Record<string, string>;`
  - The label render line `{status === "all" ? "All" : (STATUS_LABELS[status] ?? status)}` → `{status === "all" ? "All" : (labels?.[status] ?? STATUS_LABELS[status] ?? status)}`.

- [ ] **Step 4: Pass labels from `BookingsCategoryView`.**
  - Where it renders `<SummaryCards counts={...} active={status} onPick={...} />`, add `labels={config.statusLabels}`.
  - In the `filterChips` logic, change `filterChips.push(STATUS_LABELS[status] ?? status);` to `filterChips.push(config.statusLabels?.[status] ?? STATUS_LABELS[status] ?? status);`.

- [ ] **Step 5: Typecheck + lint.**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (no new errors).

- [ ] **Step 6: Commit.**

```bash
git add src/lib/adminBookings/config.tsx src/components/admin/bookings/SummaryCards.tsx src/components/admin/bookings/BookingsCategoryView.tsx
git commit -m "feat(events): events bookings tab gets approve/reject/refund + payment column"
```

---

## Task 6: Enforce `approvalMode` at both creation paths

**Files:** Modify `src/app/api/events/[id]/route.ts` (POST), `src/app/api/payments/verify/route.ts` (event branch).

- [ ] **Step 1: Free path.** In `src/app/api/events/[id]/route.ts` POST:
  - Add `approvalMode: true` to the event `select` (the one that already selects `participants, maxParticipants, registrationDeadline, entryFeeAmount, status, published`).
  - In the `eventRegistration.create({ data: {...} })`, add `status: event.approvalMode === "manual" ? "pending" : "approved"` alongside the existing `paymentStatus`.

- [ ] **Step 2: Paid path.** In the `event` branch of `src/app/api/payments/verify/route.ts`:
  - Add `approvalMode: true` to the `sportEvent.findUnique` select (currently `{ participants, maxParticipants, registrationDeadline }`).
  - In the `eventRegistration.create({ data: { eventId, userId, teamName, paymentStatus: "paid" } })`, add `status: event.approvalMode === "manual" ? "pending" : "approved"`.

- [ ] **Step 3: Typecheck.**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/api/events/[id]/route.ts" "src/app/api/payments/verify/route.ts"
git commit -m "feat(events): enforce approvalMode (manual -> pending) at registration"
```

---

## Task 7: User-facing approval status on the detail page

**Files:** Modify `src/app/api/events/[id]/route.ts` (GET), `src/hooks/useData.ts`, `src/app/events/[id]/page.tsx`.

- [ ] **Step 1: Return approval status from the detail GET.** In `src/app/api/events/[id]/route.ts` GET, the `userRegistration` object currently is `{ id: reg.id, paymentStatus: reg.paymentStatus, teamName: reg.teamName }`. Extend it (and the local type annotation a few lines above) to include `status` and `rejectionReason`:
```ts
    let userRegistration: { id: string; paymentStatus: string; teamName: string | null; status: string; rejectionReason: string | null } | null = null;
    // ...
      if (reg) userRegistration = { id: reg.id, paymentStatus: reg.paymentStatus, teamName: reg.teamName, status: reg.status, rejectionReason: reg.rejectionReason };
```

- [ ] **Step 2: Extend the client type.** In `src/hooks/useData.ts`, the `SportEvent` type's `userRegistration` field → add `status` and `rejectionReason`:
```ts
  userRegistration?: { id: string; paymentStatus: string; teamName?: string | null; status?: string; rejectionReason?: string | null } | null;
```

- [ ] **Step 3: Show approval states in the registration card.** In `src/app/events/[id]/page.tsx`, near the other derived consts (after `const isRegistered = !!event.userRegistration;`), add:
```tsx
  const regStatus = event.userRegistration?.status;
  const isPendingApproval = regStatus === "pending";
  const isRejected = regStatus === "rejected";
```
  Then in the sidebar registration block, BEFORE the existing `isRegistered && regPaid ? (...)` branch, add two guarded states (reuse the existing card styling pattern):
```tsx
{isRegistered && isRejected ? (
  <div style={{ padding: "16px", borderRadius: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", textAlign: "center" }}>
    <p style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>Registration declined</p>
    {event.userRegistration?.rejectionReason && (
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{event.userRegistration.rejectionReason}</p>
    )}
  </div>
) : isRegistered && isPendingApproval ? (
  <div style={{ padding: "16px", borderRadius: 16, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", textAlign: "center" }}>
    <p style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>Pending approval</p>
    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>The organizer is reviewing your registration</p>
  </div>
) : isRegistered && regPaid ? (
```
  (i.e. prepend the two new ternary branches in front of the current `isRegistered && regPaid ? (` — the rest of the existing chain is unchanged. Verify the ternary still closes correctly.)

- [ ] **Step 4: Typecheck + build.**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; build succeeds.

- [ ] **Step 5: Commit.**

```bash
git add "src/app/api/events/[id]/route.ts" src/hooks/useData.ts "src/app/events/[id]/page.tsx"
git commit -m "feat(events): show approval status on the event detail card"
```

---

## Task 8: Remove the redundant read-only table from `/admin/events`

**Files:** Modify `src/app/admin/events/page.tsx`, `src/app/api/admin/events/route.ts` (GET).

- [ ] **Step 1: Drop the registrations fetch from the admin GET.** In `src/app/api/admin/events/route.ts` GET, it currently `Promise.all([eventRegistration.findMany(...), sportEvent.findMany(...)])` and returns `{ registrations, events }`. Replace with just the events query and return `{ events }`:
```ts
export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const events = await prisma.sportEvent.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ events });
}
```
  (Remove the now-unused `eventRegistration` mapping code in that handler.)

- [ ] **Step 2: Remove the table from the page.** In `src/app/admin/events/page.tsx`:
  - Delete the `type Reg = {...}` declaration (line ~12).
  - Change the query generic from `useQuery<{ registrations: Reg[]; events: Ev[] }>` to `useQuery<{ events: Ev[] }>`.
  - Delete the entire registrations table block (the `<div style={{ background: "#141414"... }}>` wrapping the `<table>` … `No registrations yet` … `</table></div>`, roughly lines 133-157).
  - Remove the now-unused `td`/`th` style consts if they are only used by that table (grep within the file first; if the cards use them, keep).
  - Remove any now-unused imports (`Badge` may still be used by the event cards — check before removing).

- [ ] **Step 3: Typecheck + lint.**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean; no unused-var errors in the page.

- [ ] **Step 4: Commit.**

```bash
git add src/app/admin/events/page.tsx "src/app/api/admin/events/route.ts"
git commit -m "refactor(events): remove redundant read-only registrations table from /admin/events"
```

---

## Task 9: Full verification

- [ ] **Step 1: Unit tests.** Run: `npm test` — all pass (incl. the new status + actions.events tests).
- [ ] **Step 2: Static gates.** Run: `npx tsc --noEmit && npm run lint && npm run build` — clean.
- [ ] **Step 3: Runtime smoke test** (use the `PrismaPg`-adapter script pattern from `src/lib/prisma.ts`; run from repo root, `dotenv config({quiet:true})`):
  1. Start `npm run dev`.
  2. Seed a published event with `approvalMode:"manual"` and create a `pending` `EventRegistration` (paid: also insert a matching `Payment` row `status:"paid"`).
  3. `GET /api/admin/bookings/events` (with an admin cookie — or assert the query shape directly in the script): confirm the row's `status` is `pending` and the status counts show it under `pending` (NOT `paid`).
  4. Call the events `applyAction("events", regId, "approve")` (or PATCH the route) → registration `status` becomes `approved`; `participants` unchanged.
  5. On a second pending paid registration, `reject` it → `status='rejected'`, its `Payment` row `status='refunded'`, registration `paymentStatus='refunded'`, event `participants` decremented.
  6. `GET /api/events/[id]` as that user → `userRegistration.status` reflects the new value; the detail card copy matches.
  7. Delete all seeded rows; stop the dev server.
- [ ] **Step 4: Commit any smoke-fix.** `git add -A && git commit -m "fix(events): slice 2 smoke-test adjustments"` (only if needed).

---

## Notes for the implementer
- **DRY/Reuse:** This slice's whole point is reuse — do NOT create a new `eventRegistrationStatus.ts`, a new service file, a new admin route, or a new admin table. Everything lands in the existing `adminBookings` files.
- **Don't touch shared helpers:** `deriveRegistrationStatus`, `registrationWhereForStatus`, and the non-events entries of `CATEGORY_STATUSES`/`STATUS_LABELS` are used by camps/workshops — leave them alone.
- **YAGNI:** no email notifications, no real Razorpay refund API, no `RowActionDef.show` predicate (rely on backend validation like coaches).
- **Free-event guard:** refunds key off an actual paid `Payment` row, never the `paymentStatus` string.
