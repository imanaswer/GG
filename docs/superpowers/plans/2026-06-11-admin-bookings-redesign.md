# Admin Bookings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single mixed admin bookings table with a configuration-driven, per-category booking management system (Coaches, Play Sessions, Workshops, Camps, Events) with server-side filtering/pagination, summary cards, a details drawer, per-row + bulk actions, and CSV export.

**Architecture:** One reusable `BookingsCategoryView` client component driven by per-category config objects. Each category has a dedicated `/api/admin/bookings/<key>` route (GET list+counts, PATCH actions, GET csv). All mutations flow through a central action service (`src/lib/adminBookings/actions.ts`) so a persistent audit log can be added later without touching routes. Pure logic (status derivation, query parsing, payment statuses, CSV) is unit-tested with vitest; routes/components are verified via typecheck + production build.

**Tech Stack:** Next.js (App Router, see `node_modules/next/dist/docs/`), Prisma + PostgreSQL, React Query (`@tanstack/react-query`), vitest, lucide-react, inline-style components.

**Spec:** `docs/superpowers/specs/2026-06-10-admin-bookings-redesign-design.md`

---

## Conventions for the implementing engineer

- This is a **modified** Next.js — before writing any route/page code, read the relevant guide under `node_modules/next/dist/docs/` (per repo `AGENTS.md`).
- Admin API routes guard with `if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`.
- Tests run with `npm test` (vitest). The only existing test is `src/lib/bookingStatus.test.ts` — follow its style.
- Commit after every task. Branch is `main` (repo owner commits directly to main).
- Migrations: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <name>` locally, or `npx prisma migrate deploy` against the live DB. Generate client with `npx prisma generate`.

## File structure (what gets created/modified)

```
prisma/schema.prisma                                  # MODIFY: status/cancelledAt/updatedAt fields
src/lib/paymentStatus.ts                              # CREATE: centralized payment status type
src/lib/paymentStatus.test.ts                         # CREATE
src/lib/adminBookings/types.ts                        # CREATE: shared TS types
src/lib/adminBookings/query.ts                        # CREATE: date-range/pagination/sort parsing
src/lib/adminBookings/query.test.ts                   # CREATE
src/lib/adminBookings/status.ts                       # CREATE: per-category status derivation + where-builders
src/lib/adminBookings/status.test.ts                  # CREATE
src/lib/adminBookings/csv.ts                          # CREATE: CSV serialization
src/lib/adminBookings/csv.test.ts                     # CREATE
src/lib/adminBookings/actions.ts                      # CREATE: central action service
src/lib/adminBookings/actions.test.ts                 # CREATE
src/lib/adminBookings/config.tsx                      # CREATE: CATEGORY_CONFIGS (columns/statuses/actions/drawer)
src/components/admin/bookings/SummaryCards.tsx        # CREATE
src/components/admin/bookings/BookingsToolbar.tsx     # CREATE
src/components/admin/bookings/BulkActionBar.tsx       # CREATE
src/components/admin/bookings/BookingDrawer.tsx       # CREATE
src/components/admin/bookings/BookingsCategoryView.tsx# CREATE
src/components/admin/AdminShell.tsx                   # MODIFY: expandable Bookings nav
src/app/admin/bookings/page.tsx                       # REPLACE: landing page (5 cards)
src/app/admin/bookings/[category]/page.tsx            # CREATE: renders BookingsCategoryView from config
src/app/api/admin/bookings/landing/route.ts          # CREATE: landing card metrics
src/app/api/admin/bookings/coaches/route.ts           # CREATE: GET/PATCH/csv
src/app/api/admin/bookings/play-sessions/route.ts     # CREATE
src/app/api/admin/bookings/workshops/route.ts         # CREATE
src/app/api/admin/bookings/camps/route.ts             # CREATE
src/app/api/admin/bookings/events/route.ts            # CREATE
src/app/api/payments/verify/route.ts                  # MODIFY: import paymentStatus constants
src/app/api/payments/webhook/route.ts                 # MODIFY: import paymentStatus constants
```

---

# PHASE 1 — Foundation

## Task 1: Centralized payment status type

**Files:**
- Create: `src/lib/paymentStatus.ts`
- Test: `src/lib/paymentStatus.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/paymentStatus.test.ts
import { describe, it, expect } from "vitest";
import { PAYMENT_STATUSES, isPaymentStatus, PAYMENT_STATUS_LABELS } from "./paymentStatus";

describe("paymentStatus", () => {
  it("exposes the four canonical statuses in order", () => {
    expect(PAYMENT_STATUSES).toEqual(["pending", "paid", "failed", "refunded"]);
  });
  it("validates known statuses and rejects unknown / legacy ones", () => {
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("refunded")).toBe(true);
    expect(isPaymentStatus("unpaid")).toBe(false); // legacy value is no longer valid
    expect(isPaymentStatus("")).toBe(false);
  });
  it("has a human label for every status", () => {
    for (const s of PAYMENT_STATUSES) {
      expect(PAYMENT_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/paymentStatus.test.ts`
Expected: FAIL — "Cannot find module './paymentStatus'".

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/paymentStatus.ts
/** Canonical payment statuses — the single source of truth. Never inline these strings. */
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending payment",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; color: string }> = {
  pending:  { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
  paid:     { bg: "rgba(34,197,94,0.15)",   color: "#4ade80" },
  failed:   { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
  refunded: { bg: "rgba(168,85,247,0.15)",  color: "#c084fc" },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/paymentStatus.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/paymentStatus.ts src/lib/paymentStatus.test.ts
git commit -m "feat: centralized payment status type"
```

---

## Task 2: Schema migration (status fields + payment status standardization)

**Files:**
- Modify: `prisma/schema.prisma` (models `CampRegistration`, `EventRegistration`, `WorkshopRegistration`, `GamePlayer`)

- [ ] **Step 1: Edit `CampRegistration`**

Replace the model body so it reads:

```prisma
model CampRegistration {
  id            String   @id @default(cuid())
  campId        String
  userId        String
  childName     String
  childAge      Int
  status        String   @default("registered")
  paymentStatus String   @default("pending")
  cancelledAt   DateTime?
  registeredAt  DateTime @default(now())
  updatedAt     DateTime @updatedAt
  camp Camp @relation(fields: [campId], references: [id])
  user User @relation(fields: [userId], references: [id])
  @@index([campId, status, registeredAt(sort: Desc)])
}
```

- [ ] **Step 2: Edit `EventRegistration`**

```prisma
model EventRegistration {
  id            String   @id @default(cuid())
  eventId       String
  userId        String
  teamName      String?
  status        String   @default("registered")
  paymentStatus String   @default("pending")
  cancelledAt   DateTime?
  registeredAt  DateTime @default(now())
  updatedAt     DateTime @updatedAt
  event SportEvent @relation(fields: [eventId], references: [id])
  user  User       @relation(fields: [userId], references: [id])
  @@index([eventId, status, registeredAt(sort: Desc)])
}
```

- [ ] **Step 3: Edit `WorkshopRegistration`**

```prisma
model WorkshopRegistration {
  id               String   @id @default(cuid())
  workshopId       String
  userId           String
  participantName  String
  participantAge   Int?
  registrationType String   @default("adult")
  status           String   @default("registered")
  paymentStatus    String   @default("pending")
  cancelledAt      DateTime?
  registeredAt     DateTime @default(now())
  updatedAt        DateTime @updatedAt
  workshop Workshop @relation(fields: [workshopId], references: [id])
  user     User     @relation(fields: [userId], references: [id])
  @@index([workshopId, status, registeredAt(sort: Desc)])
}
```

- [ ] **Step 4: Edit `GamePlayer`**

```prisma
model GamePlayer {
  id        String   @id @default(cuid())
  gameId    String
  userId    String
  attended  Boolean?
  status    String   @default("joined")
  cancelledAt DateTime?
  joinedAt  DateTime @default(now())
  updatedAt DateTime @updatedAt
  game Game @relation(fields: [gameId], references: [id])
  user User @relation(fields: [userId], references: [id])
  @@unique([gameId, userId])
  @@index([userId, joinedAt(sort: Desc)])
  @@index([gameId, status, joinedAt(sort: Desc)])
}
```

- [ ] **Step 5: Create the migration and backfill legacy paymentStatus**

Run: `npx prisma migrate dev --name admin_bookings_status_fields`

Then open the generated SQL file under `prisma/migrations/<timestamp>_admin_bookings_status_fields/migration.sql` and **append** a backfill so existing `"unpaid"` rows become `"pending"` (the new `@updatedAt` columns and new defaults only apply to new/updated rows; existing data keeps `"unpaid"` until backfilled):

```sql
UPDATE "CampRegistration"     SET "paymentStatus" = 'pending' WHERE "paymentStatus" = 'unpaid';
UPDATE "EventRegistration"    SET "paymentStatus" = 'pending' WHERE "paymentStatus" = 'unpaid';
UPDATE "WorkshopRegistration" SET "paymentStatus" = 'pending' WHERE "paymentStatus" = 'unpaid';
```

Re-run `npx prisma migrate dev` (it will detect the edited migration is already applied; if it complains, run the three UPDATE statements directly via `npx prisma db execute --stdin` piping the SQL, or `npx prisma migrate reset` only in a throwaway dev DB).

- [ ] **Step 6: Regenerate the client and typecheck**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: exit 0 (new fields available on the Prisma types).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add status/cancelledAt/updatedAt to registrations and GamePlayer; standardize paymentStatus"
```

---

## Task 3: Standardize existing payment-status string usages

**Files:**
- Modify: `src/app/api/payments/verify/route.ts`
- Modify: `src/app/api/payments/webhook/route.ts`

- [ ] **Step 1: Replace inline `"paid"` / `"failed"` / `"unpaid"` literals with constants**

In both files, add at the top:

```ts
import { PAYMENT_STATUSES } from "@/lib/paymentStatus";
```

Then replace each registration `paymentStatus` / Payment `status` literal with the constant lookup, e.g.:
- `paymentStatus: "paid"` → `paymentStatus: PAYMENT_STATUSES[1]` is unreadable; instead define a tiny local alias at top of each file: `const { ... } = ...`. Prefer named imports:

```ts
import { PaymentStatus } from "@/lib/paymentStatus";
// usage: paymentStatus: "paid" satisfies PaymentStatus
```

Concretely: keep the string literals but assert them against the type so drift fails typecheck. In `verify/route.ts` change every `paymentStatus: "paid"` to `paymentStatus: "paid" satisfies PaymentStatus` and Payment `status: "paid"` likewise. In `webhook/route.ts`, in `syncRegistrationStatus`, change the `"paid"`/`"failed"` arguments to `"paid" satisfies PaymentStatus` / `"failed" satisfies PaymentStatus`. Search for any `"unpaid"` and change to `"pending" satisfies PaymentStatus`.

- [ ] **Step 2: Verify the webhook refund path writes `"refunded"`**

In `webhook/route.ts`, if a `payment.refunded` / refund event is handled, ensure it calls `syncRegistrationStatus(..., "refunded" satisfies PaymentStatus)`. If no refund event is handled today, leave a one-line comment `// refund events are handled by admin "Mark refunded" action, not the webhook` and do nothing else.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. Any drifted literal (e.g. a stray `"unpaid"`) now errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/payments/verify/route.ts src/app/api/payments/webhook/route.ts
git commit -m "refactor: route payment statuses through centralized type"
```

---

## Task 4: Shared types

**Files:**
- Create: `src/lib/adminBookings/types.ts`

- [ ] **Step 1: Write the types file** (no test — pure type declarations)

```ts
// src/lib/adminBookings/types.ts
export type CategoryKey = "coaches" | "play-sessions" | "workshops" | "camps" | "events";

/** A single normalized row shown in any category table. Category-specific
 *  fields live in `extra`. */
export interface BookingRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  entityName: string;          // coach/game/workshop/camp/event name
  status: string;              // the derived display-status bucket key
  createdAt: string;           // ISO — booking/registration creation
  updatedAt: string | null;    // ISO
  sessionDate: string | null;  // ISO — session/event date for "upcoming" sort
  extra: Record<string, string>; // batch/sport/child/team/participant, etc.
  payment: PaymentInfo | null;
}

export interface PaymentInfo {
  amount: number;
  currency: string;
  status: string;
  razorpayPaymentId: string | null;
  paidAt: string | null;
}

export interface StatusCount { status: string; count: number; }

export interface ListResponse {
  rows: BookingRow[];
  total: number;        // total matching the filter (for pagination)
  page: number;
  pageSize: number;
  counts: StatusCount[];// per-status counts over the filtered set (excl. status filter)
}

export interface LandingMetrics {
  total: number;
  pending: number | null;   // null => render "—"
  active: number;
  completed: number;
  cancelled: number;
}

export type SortKey = "newest" | "oldest" | "upcoming" | "updated";
export type DatePreset = "all" | "today" | "week" | "month" | "custom";
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` → exit 0
```bash
git add src/lib/adminBookings/types.ts
git commit -m "feat: shared admin-bookings types"
```

---

## Task 5: Query helpers (date range, pagination, sort)

**Files:**
- Create: `src/lib/adminBookings/query.ts`
- Test: `src/lib/adminBookings/query.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/adminBookings/query.test.ts
import { describe, it, expect } from "vitest";
import { parsePagination, parseDateRange, orderByFor } from "./query";

describe("parsePagination", () => {
  it("defaults to page 1 size 25 and clamps", () => {
    expect(parsePagination(new URLSearchParams(""))).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 });
    expect(parsePagination(new URLSearchParams("page=3&pageSize=10"))).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
    expect(parsePagination(new URLSearchParams("pageSize=9999")).pageSize).toBe(100); // max clamp
    expect(parsePagination(new URLSearchParams("page=0")).page).toBe(1);              // min clamp
  });
});

describe("parseDateRange", () => {
  const now = new Date("2026-06-11T15:00:00.000Z");
  it("returns undefined for all", () => {
    expect(parseDateRange(new URLSearchParams("date=all"), now)).toBeUndefined();
  });
  it("today => gte start of today", () => {
    const r = parseDateRange(new URLSearchParams("date=today"), now)!;
    expect(r.gte.toISOString()).toBe("2026-06-11T00:00:00.000Z");
  });
  it("custom uses from/to inclusive", () => {
    const r = parseDateRange(new URLSearchParams("date=custom&from=2026-06-01&to=2026-06-05"), now)!;
    expect(r.gte.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(r.lte.toISOString()).toBe("2026-06-05T23:59:59.999Z");
  });
});

describe("orderByFor", () => {
  it("maps sort keys to prisma orderBy on the given date fields", () => {
    expect(orderByFor("newest", "createdAt", "sessionDate")).toEqual({ createdAt: "desc" });
    expect(orderByFor("oldest", "createdAt", "sessionDate")).toEqual({ createdAt: "asc" });
    expect(orderByFor("upcoming", "createdAt", "sessionDate")).toEqual({ sessionDate: "asc" });
    expect(orderByFor("updated", "createdAt", "sessionDate")).toEqual({ updatedAt: "desc" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/adminBookings/query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/adminBookings/query.ts
import type { SortKey } from "./types";

export interface Pagination { page: number; pageSize: number; skip: number; take: number; }

export function parsePagination(p: URLSearchParams): Pagination {
  const page = Math.max(1, parseInt(p.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(p.get("pageSize") ?? "25", 10) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export interface DateRange { gte: Date; lte?: Date; }

/** Returns a {gte, lte?} range for the requested preset, or undefined for "all". */
export function parseDateRange(p: URLSearchParams, now: Date): DateRange | undefined {
  const preset = p.get("date") ?? "all";
  if (preset === "all") return undefined;
  const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const endOfDay   = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  if (preset === "today") return { gte: startOfDay(now), lte: endOfDay(now) };
  if (preset === "week") {
    const gte = startOfDay(now); gte.setUTCDate(gte.getUTCDate() - 6);
    return { gte, lte: endOfDay(now) };
  }
  if (preset === "month") {
    const gte = startOfDay(now); gte.setUTCDate(gte.getUTCDate() - 29);
    return { gte, lte: endOfDay(now) };
  }
  if (preset === "custom") {
    const from = p.get("from"); const to = p.get("to");
    if (!from) return undefined;
    const gte = startOfDay(new Date(from + "T00:00:00.000Z"));
    const lte = to ? endOfDay(new Date(to + "T00:00:00.000Z")) : endOfDay(now);
    return { gte, lte };
  }
  return undefined;
}

/** Maps a sort key to a Prisma orderBy. `createdField` is the row's creation
 *  timestamp column (createdAt/registeredAt/joinedAt). */
export function orderByFor(sort: SortKey, createdField: string, sessionField: string): Record<string, "asc" | "desc"> {
  switch (sort) {
    case "oldest":   return { [createdField]: "asc" };
    case "upcoming": return { [sessionField]: "asc" };
    case "updated":  return { updatedAt: "desc" };
    case "newest":
    default:         return { [createdField]: "desc" };
  }
}

export function parseSort(p: URLSearchParams): SortKey {
  const s = p.get("sort");
  return (s === "oldest" || s === "upcoming" || s === "updated") ? s : "newest";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/adminBookings/query.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminBookings/query.ts src/lib/adminBookings/query.test.ts
git commit -m "feat: admin-bookings query helpers (pagination/date/sort)"
```

---

## Task 6: Status derivation per category

**Files:**
- Create: `src/lib/adminBookings/status.ts`
- Test: `src/lib/adminBookings/status.test.ts`

This module is the single place that turns raw model fields into a display
bucket, and a requested bucket back into a Prisma `where` fragment.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/adminBookings/status.test.ts
import { describe, it, expect } from "vitest";
import {
  deriveRegistrationStatus, deriveGamePlayerStatus,
  CATEGORY_STATUSES, registrationWhereForStatus, gamePlayerWhereForStatus,
} from "./status";

describe("deriveRegistrationStatus", () => {
  it("cancelled wins over payment", () => {
    expect(deriveRegistrationStatus("cancelled", "paid")).toBe("cancelled");
  });
  it("maps payment status when active", () => {
    expect(deriveRegistrationStatus("registered", "pending")).toBe("pending");
    expect(deriveRegistrationStatus("registered", "paid")).toBe("paid");
    expect(deriveRegistrationStatus("registered", "failed")).toBe("failed");
    expect(deriveRegistrationStatus("registered", "refunded")).toBe("refunded");
  });
});

describe("deriveGamePlayerStatus", () => {
  it("cancelled wins", () => expect(deriveGamePlayerStatus("cancelled", true)).toBe("cancelled"));
  it("attended true/false then joined", () => {
    expect(deriveGamePlayerStatus("joined", true)).toBe("attended");
    expect(deriveGamePlayerStatus("joined", false)).toBe("no-show");
    expect(deriveGamePlayerStatus("joined", null)).toBe("joined");
  });
});

describe("where builders", () => {
  it("registration: cancelled filters on status, others on paymentStatus", () => {
    expect(registrationWhereForStatus("cancelled")).toEqual({ status: "cancelled" });
    expect(registrationWhereForStatus("paid")).toEqual({ status: { not: "cancelled" }, paymentStatus: "paid" });
    expect(registrationWhereForStatus("all")).toEqual({});
  });
  it("gameplayer buckets", () => {
    expect(gamePlayerWhereForStatus("cancelled")).toEqual({ status: "cancelled" });
    expect(gamePlayerWhereForStatus("attended")).toEqual({ status: { not: "cancelled" }, attended: true });
    expect(gamePlayerWhereForStatus("no-show")).toEqual({ status: { not: "cancelled" }, attended: false });
    expect(gamePlayerWhereForStatus("joined")).toEqual({ status: { not: "cancelled" }, attended: null });
    expect(gamePlayerWhereForStatus("all")).toEqual({});
  });
  it("exposes the bucket list per category", () => {
    expect(CATEGORY_STATUSES.coaches).toEqual(["pending","approved","rejected","completed","cancelled"]);
    expect(CATEGORY_STATUSES["play-sessions"]).toEqual(["joined","attended","no-show","cancelled"]);
    expect(CATEGORY_STATUSES.camps).toEqual(["pending","paid","failed","refunded","cancelled"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/adminBookings/status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/adminBookings/status.ts
import type { CategoryKey } from "./types";

export const CATEGORY_STATUSES: Record<CategoryKey, string[]> = {
  coaches:         ["pending", "approved", "rejected", "completed", "cancelled"],
  "play-sessions": ["joined", "attended", "no-show", "cancelled"],
  workshops:       ["pending", "paid", "failed", "refunded", "cancelled"],
  camps:           ["pending", "paid", "failed", "refunded", "cancelled"],
  events:          ["pending", "paid", "failed", "refunded", "cancelled"],
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment", approved: "Approved", rejected: "Rejected",
  completed: "Completed", cancelled: "Cancelled", paid: "Paid", failed: "Failed",
  refunded: "Refunded", joined: "Joined", attended: "Attended", "no-show": "No-show",
};

/** Coach pending bucket is literally "pending" but the label differs from the
 *  registration "pending payment". Coaches use the same key; we relabel in UI. */

export function deriveRegistrationStatus(status: string, paymentStatus: string): string {
  if (status === "cancelled") return "cancelled";
  return paymentStatus; // pending | paid | failed | refunded
}

export function deriveGamePlayerStatus(status: string, attended: boolean | null): string {
  if (status === "cancelled") return "cancelled";
  if (attended === true) return "attended";
  if (attended === false) return "no-show";
  return "joined";
}

/** Prisma where-fragment for a registration model (camp/event/workshop). */
export function registrationWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  if (bucket === "cancelled") return { status: "cancelled" };
  return { status: { not: "cancelled" }, paymentStatus: bucket };
}

/** Prisma where-fragment for GamePlayer. */
export function gamePlayerWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  if (bucket === "cancelled") return { status: "cancelled" };
  if (bucket === "attended")  return { status: { not: "cancelled" }, attended: true };
  if (bucket === "no-show")   return { status: { not: "cancelled" }, attended: false };
  return { status: { not: "cancelled" }, attended: null }; // joined
}

/** Coach where-fragment is a plain status equality. */
export function coachWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  return { status: bucket };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/adminBookings/status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminBookings/status.ts src/lib/adminBookings/status.test.ts
git commit -m "feat: per-category booking status derivation and where-builders"
```

---

## Task 7: CSV serializer

**Files:**
- Create: `src/lib/adminBookings/csv.ts`
- Test: `src/lib/adminBookings/csv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/adminBookings/csv.test.ts
import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("emits header then rows", () => {
    const csv = toCsv(["ID", "Name"], [["1", "Asha"], ["2", "Ben"]]);
    expect(csv).toBe("ID,Name\r\n1,Asha\r\n2,Ben");
  });
  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv(["A"], [['he said "hi", ok\nbye']]);
    expect(csv).toBe('A\r\n"he said ""hi"", ok\nbye"');
  });
  it("renders null/undefined as empty", () => {
    expect(toCsv(["A", "B"], [[null as unknown as string, undefined as unknown as string]])).toBe("A,B\r\n,");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/adminBookings/csv.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/adminBookings/csv.ts
function cell(v: string | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | null | undefined)[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const r of rows) lines.push(r.map(cell).join(","));
  return lines.join("\r\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/adminBookings/csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminBookings/csv.ts src/lib/adminBookings/csv.test.ts
git commit -m "feat: CSV serializer for admin bookings export"
```

---

## Task 8: Central action service

**Files:**
- Create: `src/lib/adminBookings/actions.ts`
- Test: `src/lib/adminBookings/actions.test.ts`

This is the single funnel for every admin mutation. It validates the action is
allowed for the category, performs the transition transactionally (releasing
seats/slots), and returns a per-id result. A future audit log is one added call
here — no route changes.

- [ ] **Step 1: Write the failing test (pure validation logic, prisma mocked)**

```ts
// src/lib/adminBookings/actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(async (fn: any) => fn(txMock)) } }));
vi.mock("@/lib/bookings", () => ({
  approveBooking: vi.fn(async () => ({})), rejectBooking: vi.fn(async () => ({})),
  completeBooking: vi.fn(async () => ({})), cancelBooking: vi.fn(async () => ({})),
}));

const txMock: any = {};

import { isActionAllowed, ALLOWED_ACTIONS } from "./actions";

describe("isActionAllowed", () => {
  beforeEach(() => vi.clearAllMocks());
  it("coaches allow approve/reject/complete/cancel only", () => {
    expect(isActionAllowed("coaches", "approve")).toBe(true);
    expect(isActionAllowed("coaches", "mark-paid")).toBe(false);
  });
  it("camps allow cancel/mark-paid/mark-refunded only", () => {
    expect(isActionAllowed("camps", "mark-paid")).toBe(true);
    expect(isActionAllowed("camps", "mark-refunded")).toBe(true);
    expect(isActionAllowed("camps", "cancel")).toBe(true);
    expect(isActionAllowed("camps", "approve")).toBe(false);
  });
  it("play-sessions allow mark-attended/mark-no-show/cancel", () => {
    expect(isActionAllowed("play-sessions", "mark-attended")).toBe(true);
    expect(isActionAllowed("play-sessions", "mark-no-show")).toBe(true);
    expect(isActionAllowed("play-sessions", "cancel")).toBe(true);
    expect(isActionAllowed("play-sessions", "mark-paid")).toBe(false);
  });
  it("ALLOWED_ACTIONS is defined for every category", () => {
    for (const k of ["coaches","play-sessions","workshops","camps","events"] as const) {
      expect(Array.isArray(ALLOWED_ACTIONS[k])).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/adminBookings/actions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/adminBookings/actions.ts
import { prisma } from "@/lib/prisma";
import { approveBooking, rejectBooking, completeBooking, cancelBooking } from "@/lib/bookings";
import type { CategoryKey } from "./types";
import type { PaymentStatus } from "@/lib/paymentStatus";

export type BookingAction =
  | "approve" | "reject" | "complete" | "cancel"
  | "mark-paid" | "mark-refunded" | "mark-attended" | "mark-no-show";

export const ALLOWED_ACTIONS: Record<CategoryKey, BookingAction[]> = {
  coaches:         ["approve", "reject", "complete", "cancel"],
  "play-sessions": ["mark-attended", "mark-no-show", "cancel"],
  workshops:       ["cancel", "mark-paid", "mark-refunded"],
  camps:           ["cancel", "mark-paid", "mark-refunded"],
  events:          ["cancel", "mark-paid", "mark-refunded"],
};

export function isActionAllowed(category: CategoryKey, action: BookingAction): boolean {
  return ALLOWED_ACTIONS[category].includes(action);
}

export interface ActionResult { id: string; ok: boolean; error?: string; }

/** Maps each registration category to its prisma model + parent + seat counter. */
const REG = {
  camps:     { model: "campRegistration",     parent: "camp",       parentId: "campId",     counter: "participants", fullStatus: "full",  openStatus: "open" },
  events:    { model: "eventRegistration",    parent: "sportEvent", parentId: "eventId",    counter: "participants", fullStatus: "Full",  openStatus: "Registration Open" },
  workshops: { model: "workshopRegistration", parent: "workshop",   parentId: "workshopId", counter: "participants", fullStatus: "full",  openStatus: "open" },
} as const;

/**
 * Apply a single action to a single record. Throws on invalid action/record;
 * callers wrap each id and collect ActionResult[].
 */
export async function applyAction(
  category: CategoryKey,
  id: string,
  action: BookingAction,
  meta?: { rejectionReason?: string },
): Promise<void> {
  if (!isActionAllowed(category, action)) throw new Error(`Action ${action} not allowed for ${category}`);

  // NOTE: future audit log goes here — record (category, id, action, actor, ts).

  if (category === "coaches") {
    if (action === "approve")  { await approveBooking(id); return; }
    if (action === "reject")   { await rejectBooking(id, meta?.rejectionReason); return; }
    if (action === "complete") { await completeBooking(id); return; }
    if (action === "cancel")   { await cancelBooking(id); return; }
    throw new Error("Unsupported coach action");
  }

  if (category === "play-sessions") {
    if (action === "mark-attended") { await prisma.gamePlayer.update({ where: { id }, data: { attended: true } }); return; }
    if (action === "mark-no-show")  { await prisma.gamePlayer.update({ where: { id }, data: { attended: false } }); return; }
    if (action === "cancel") {
      await prisma.$transaction(async (tx) => {
        const gp = await tx.gamePlayer.findUnique({ where: { id }, select: { gameId: true, status: true } });
        if (!gp) throw new Error("Not found");
        if (gp.status === "cancelled") return; // idempotent
        await tx.gamePlayer.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
        const game = await tx.game.findUnique({ where: { id: gp.gameId }, select: { status: true } });
        await tx.game.update({
          where: { id: gp.gameId },
          data: { slotsLeft: { increment: 1 }, status: game?.status === "full" ? "open" : undefined },
        });
      });
      return;
    }
    throw new Error("Unsupported play-session action");
  }

  // Registration categories (camps/events/workshops)
  const cfg = REG[category as keyof typeof REG];
  if (action === "mark-paid") {
    await (prisma as any)[cfg.model].update({ where: { id }, data: { paymentStatus: "paid" satisfies PaymentStatus } });
    return;
  }
  if (action === "mark-refunded") {
    await (prisma as any)[cfg.model].update({ where: { id }, data: { paymentStatus: "refunded" satisfies PaymentStatus } });
    return;
  }
  if (action === "cancel") {
    await prisma.$transaction(async (tx) => {
      const reg = await (tx as any)[cfg.model].findUnique({ where: { id }, select: { status: true, [cfg.parentId]: true } });
      if (!reg) throw new Error("Not found");
      if (reg.status === "cancelled") return; // idempotent
      const parentId = reg[cfg.parentId];
      await (tx as any)[cfg.model].update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
      const parent = await (tx as any)[cfg.parent].findUnique({ where: { id: parentId }, select: { status: true } });
      await (tx as any)[cfg.parent].update({
        where: { id: parentId },
        data: { [cfg.counter]: { decrement: 1 }, status: parent?.status === cfg.fullStatus ? cfg.openStatus : undefined },
      });
    });
    return;
  }
  throw new Error("Unsupported registration action");
}

/** Apply an action across many ids, never throwing; returns per-id results. */
export async function applyBulk(
  category: CategoryKey, ids: string[], action: BookingAction, meta?: { rejectionReason?: string },
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const id of ids) {
    try { await applyAction(category, id, action, meta); results.push({ id, ok: true }); }
    catch (e) { results.push({ id, ok: false, error: e instanceof Error ? e.message : "failed" }); }
  }
  return results;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/adminBookings/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck (validates the `(prisma as any)` model names compile and bookings imports resolve)**

Run: `npx tsc --noEmit` → exit 0

- [ ] **Step 6: Commit**

```bash
git add src/lib/adminBookings/actions.ts src/lib/adminBookings/actions.test.ts
git commit -m "feat: central admin booking action service (single + bulk)"
```

---

## Task 9: Landing metrics API

**Files:**
- Create: `src/app/api/admin/bookings/landing/route.ts`

Returns one `LandingMetrics` object per category for the landing cards, each
computed with aggregate counts (never loading rows).

- [ ] **Step 1: Read the Next.js route-handler guide**

Run: `ls node_modules/next/dist/docs/` and read the route-handler/app-router file before writing.

- [ ] **Step 2: Implement**

```ts
// src/app/api/admin/bookings/landing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import type { LandingMetrics } from "@/lib/adminBookings/types";

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();

  // Coaches
  const coachGroups = await prisma.booking.groupBy({ by: ["status"], _count: true });
  const cg = (s: string) => coachGroups.find(g => g.status === s)?._count ?? 0;
  const coaches: LandingMetrics = {
    total: coachGroups.reduce((a, g) => a + g._count, 0),
    pending: cg("pending"), active: cg("approved"), completed: cg("completed"),
    cancelled: cg("cancelled") + cg("rejected"),
  };

  // Play sessions (GamePlayer)
  const [gpTotal, gpCancelled, gpAttended, gpNoShow, gpJoined] = await Promise.all([
    prisma.gamePlayer.count(),
    prisma.gamePlayer.count({ where: { status: "cancelled" } }),
    prisma.gamePlayer.count({ where: { status: { not: "cancelled" }, attended: true } }),
    prisma.gamePlayer.count({ where: { status: { not: "cancelled" }, attended: false } }),
    prisma.gamePlayer.count({ where: { status: { not: "cancelled" }, attended: null } }),
  ]);
  const playSessions: LandingMetrics = {
    total: gpTotal, pending: null, active: gpJoined, completed: gpAttended,
    cancelled: gpCancelled + gpNoShow,
  };

  // Registration categories
  async function regMetrics(model: "campRegistration" | "eventRegistration" | "workshopRegistration",
                            parent: "camp" | "sportEvent" | "workshop", dateField: "endDate"): Promise<LandingMetrics> {
    const m = (prisma as any)[model];
    const [total, pending, paid, cancelled, refunded] = await Promise.all([
      m.count(),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "pending" } }),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "paid" } }),
      m.count({ where: { status: "cancelled" } }),
      m.count({ where: { status: { not: "cancelled" }, paymentStatus: "refunded" } }),
    ]);
    // completed = paid registrations whose parent end date has passed
    const completed = await m.count({
      where: { status: { not: "cancelled" }, paymentStatus: "paid", [parent]: { endDate: { lt: now } } },
    });
    return { total, pending, active: paid, completed, cancelled: cancelled + refunded };
  }

  const [camps, events, workshops] = await Promise.all([
    regMetrics("campRegistration", "camp", "endDate"),
    regMetrics("eventRegistration", "sportEvent", "endDate"),
    regMetrics("workshopRegistration", "workshop", "endDate"),
  ]);

  return NextResponse.json({ coaches, "play-sessions": playSessions, workshops, camps, events });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → exit 0

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/bookings/landing/route.ts
git commit -m "feat: landing metrics API for booking category cards"
```

---

## Task 10: Sidebar — expandable Bookings nav

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Replace the flat `NAV` Bookings entry with an expandable group**

Change the `NAV` array's Bookings entry into a parent with children and render expansion. Replace the `import` line and `NAV` const:

```tsx
import { LayoutDashboard, CalendarCheck, Gamepad2, Tent, Wrench, Trophy, Users, Star, DollarSign, LogOut, Menu, ChevronDown, GraduationCap, Dumbbell } from "lucide-react";

const BOOKING_CHILDREN = [
  { href: "/admin/bookings/coaches",       label: "Coaches" },
  { href: "/admin/bookings/play-sessions", label: "Play Sessions" },
  { href: "/admin/bookings/workshops",     label: "Workshops" },
  { href: "/admin/bookings/camps",         label: "Camps" },
  { href: "/admin/bookings/events",        label: "Events" },
];

const NAV = [
  { href: "/admin",          label: "Overview",  icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings",  icon: CalendarCheck, children: BOOKING_CHILDREN },
  { href: "/admin/games",    label: "Games",     icon: Gamepad2 },
  { href: "/admin/camps",      label: "Camps",      icon: Tent },
  { href: "/admin/workshops", label: "Workshops",  icon: Wrench },
  { href: "/admin/events",    label: "Events",     icon: Trophy },
  { href: "/admin/users",    label: "Users",     icon: Users },
  { href: "/admin/coaches",  label: "Coaches",   icon: Star },
  { href: "/admin/revenue",  label: "Revenue",   icon: DollarSign },
];
```

- [ ] **Step 2: Render children when the Bookings group is active/expanded**

In `Sidebar`, replace the `NAV.map(...)` block with one that handles `children`:

```tsx
{NAV.map(({ href, label, icon: Icon, children }) => {
  const active = activeHref(href);
  return (
    <div key={href}>
      <Link href={href} onClick={onNavigate} style={{
        display: "flex", alignItems: "center", gap: 11, padding: "9px 12px",
        borderRadius: 9, marginBottom: 3, textDecoration: "none", fontSize: 13,
        fontWeight: active ? 700 : 500,
        background: active ? "rgba(230,57,70,0.12)" : "transparent",
        color: active ? "#fff" : "#6b7280",
        borderLeft: active ? "2px solid #e63946" : "2px solid transparent",
        transition: "all 0.15s",
      }}>
        <Icon size={16} />{label}
        {children && <ChevronDown size={13} style={{ marginLeft: "auto", transform: active ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s" }} />}
      </Link>
      {children && active && (
        <div style={{ marginLeft: 12, marginBottom: 4, borderLeft: "1px solid rgba(255,255,255,0.07)", paddingLeft: 6 }}>
          {children.map(c => {
            const cActive = activeHref(c.href);
            return (
              <Link key={c.href} href={c.href} onClick={onNavigate} style={{
                display: "block", padding: "7px 12px", borderRadius: 8, marginBottom: 2,
                textDecoration: "none", fontSize: 12.5,
                fontWeight: cActive ? 700 : 500,
                color: cActive ? "#fff" : "#6b7280",
                background: cActive ? "rgba(230,57,70,0.10)" : "transparent",
              }}>{c.label}</Link>
            );
          })}
        </div>
      )}
    </div>
  );
})}
```

Note: `isActive("/admin/bookings")` already uses `path.startsWith`, so it is true on any child route — the group auto-expands. Child `activeHref` also uses `startsWith`, correct for exact child pages.

- [ ] **Step 3: Typecheck & build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminShell.tsx
git commit -m "feat: expandable Bookings nav with 5 category children"
```

---

## Task 11: Landing page with 5 category cards

**Files:**
- Replace: `src/app/admin/bookings/page.tsx`

- [ ] **Step 1: Replace the old mixed-table page with the landing grid**

```tsx
// src/app/admin/bookings/page.tsx
"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Gamepad2, Wrench, Tent, Trophy } from "lucide-react";
import type { LandingMetrics } from "@/lib/adminBookings/types";

const CARDS = [
  { key: "coaches",       label: "Coaches",       icon: GraduationCap },
  { key: "play-sessions", label: "Play Sessions", icon: Gamepad2 },
  { key: "workshops",     label: "Workshops",     icon: Wrench },
  { key: "camps",         label: "Camps",         icon: Tent },
  { key: "events",        label: "Events",        icon: Trophy },
] as const;

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{value == null ? "—" : value}</div>
      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

export default function BookingsLanding() {
  const { data } = useQuery<Record<string, LandingMetrics>>({
    queryKey: ["admin", "bookings", "landing"],
    queryFn: () => fetch("/api/admin/bookings/landing").then(r => r.json()),
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Bookings</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Select a category to manage its bookings.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {CARDS.map(({ key, label, icon: Icon }) => {
          const m = data?.[key];
          return (
            <Link key={key} href={`/admin/bookings/${key}`} style={{
              textDecoration: "none", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: 18, display: "block", transition: "border-color .15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(230,57,70,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color="#e63946" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{label}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>{m ? `${m.total} total` : "…"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Metric label="Pending" value={m?.pending ?? 0} />
                <Metric label="Active" value={m?.active ?? 0} />
                <Metric label="Completed" value={m?.completed ?? 0} />
                <Metric label="Cancelled" value={m?.cancelled ?? 0} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0. (The old `/api/admin/bookings` route still exists and is now unused by the UI — leave it; it's harmless.)

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/bookings/page.tsx
git commit -m "feat: admin bookings landing page with 5 category cards"
```

---

# PHASE 2 — Coaches end-to-end (proves the framework)

## Task 12: Coaches list/action/CSV API

**Files:**
- Create: `src/app/api/admin/bookings/coaches/route.ts`

This route is the contract every other category route mirrors. It returns
`ListResponse`, handles `PATCH` (single id or `ids[]`), and `?format=csv`.

- [ ] **Step 1: Implement GET (list + counts), PATCH (actions), CSV**

```ts
// src/app/api/admin/bookings/coaches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { parsePagination, parseDateRange, parseSort, orderByFor } from "@/lib/adminBookings/query";
import { coachWhereForStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount } from "@/lib/adminBookings/types";

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...coachWhereForStatus(status) };
  if (range) where.createdAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { coach: { name: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

const INCLUDE = {
  user:  { select: { name: true, email: true, phone: true } },
  coach: { select: { name: true, sport: true } },
  batch: { select: { day: true, time: true } },
} as const;

function toRow(b: any): BookingRow {
  return {
    id: b.id, userId: b.userId, userName: b.user?.name ?? "—", userEmail: b.user?.email ?? "—",
    userPhone: b.user?.phone ?? null, entityName: b.coach?.name ?? "—", status: b.status,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt?.toISOString() ?? null,
    sessionDate: null,
    extra: {
      sport: b.coach?.sport ?? "—",
      session: b.batch ? `${b.batch.day} ${b.batch.time}` : "1:1",
      rejectionReason: b.rejectionReason ?? "",
      coachNote: b.coachNote ?? "",
      note: b.note ?? "",
    },
    payment: null, // coaches have no payments
  };
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  // CSV export — full filtered set, no pagination.
  if (p.get("format") === "csv") {
    const rows = await prisma.booking.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" } });
    const mapped = rows.map(toRow);
    const headers = ["Booking ID", "User", "Email", "Phone", "Coach", "Sport", "Session", "Status", "Created"];
    const csv = toCsv(headers, mapped.map(r => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.sport, r.extra.session, r.status, r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="coaches-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const orderBy = orderByFor(parseSort(p), "createdAt", "createdAt");

  // Counts exclude the status filter so all buckets show; keep date+search.
  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, grouped] = await Promise.all([
    prisma.booking.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.booking.count({ where }),
    prisma.booking.groupBy({ by: ["status"], where: countWhere, _count: true }),
  ]);
  const counts: StatusCount[] = CATEGORY_STATUSES.coaches.map(s => ({
    status: s, count: grouped.find(g => g.status === s)?._count ?? 0,
  }));

  const body: ListResponse = { rows: rows.map(toRow), total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids, id, action, rejectionReason } = await req.json();
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("coaches", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("coaches", list, action as BookingAction, { rejectionReason });
  return NextResponse.json({ results });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → exit 0

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/bookings/coaches/route.ts
git commit -m "feat: coaches bookings API (list/counts/actions/csv)"
```

---

## Task 13: Shared UI — SummaryCards

**Files:**
- Create: `src/components/admin/bookings/SummaryCards.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/bookings/SummaryCards.tsx
"use client";
import type { StatusCount } from "@/lib/adminBookings/types";
import { STATUS_LABELS } from "@/lib/adminBookings/status";

export function SummaryCards({
  counts, active, onPick,
}: { counts: StatusCount[]; active: string; onPick: (status: string) => void }) {
  const total = counts.reduce((a, c) => a + c.count, 0);
  const items = [{ status: "all", count: total }, ...counts];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`, gap: 10, marginBottom: 18 }}>
      {items.map(({ status, count }) => {
        const sel = active === status;
        return (
          <button key={status} onClick={() => onPick(status)} style={{
            textAlign: "left", background: sel ? "rgba(230,57,70,0.10)" : "#0d0d0d",
            border: `1px solid ${sel ? "rgba(230,57,70,0.4)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 12, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit",
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{count}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>
              {status === "all" ? "All" : (STATUS_LABELS[status] ?? status)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` → exit 0
```bash
git add src/components/admin/bookings/SummaryCards.tsx
git commit -m "feat: SummaryCards component"
```

---

## Task 14: Shared UI — BookingsToolbar (status tabs/date/search/sort/export)

**Files:**
- Create: `src/components/admin/bookings/BookingsToolbar.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/bookings/BookingsToolbar.tsx
"use client";
import { Search, Download } from "lucide-react";
import type { SortKey, DatePreset } from "@/lib/adminBookings/types";

export interface ToolbarState {
  q: string; date: DatePreset; from: string; to: string; sort: SortKey;
}

const inputStyle = {
  height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
  background: "#1c1c1c", color: "#fff", fontSize: 13, fontFamily: "inherit",
  padding: "0 10px", outline: "none",
} as const;

export function BookingsToolbar({
  state, onChange, onExport,
}: { state: ToolbarState; onChange: (s: ToolbarState) => void; onExport: () => void }) {
  const set = (patch: Partial<ToolbarState>) => onChange({ ...state, ...patch });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 10, color: "#6b7280" }} />
        <input value={state.q} onChange={e => set({ q: e.target.value })} placeholder="Search name, email, ID, entity…"
          style={{ ...inputStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
      </div>
      <select value={state.date} onChange={e => set({ date: e.target.value as DatePreset })} style={inputStyle}>
        <option value="all">All dates</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="custom">Custom…</option>
      </select>
      {state.date === "custom" && (
        <>
          <input type="date" value={state.from} onChange={e => set({ from: e.target.value })} style={inputStyle} />
          <input type="date" value={state.to} onChange={e => set({ to: e.target.value })} style={inputStyle} />
        </>
      )}
      <select value={state.sort} onChange={e => set({ sort: e.target.value as SortKey })} style={inputStyle}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="upcoming">Upcoming first</option>
        <option value="updated">Recently updated</option>
      </select>
      <button onClick={onExport} style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "#e5e7eb" }}>
        <Download size={14} /> Export CSV
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` → exit 0
```bash
git add src/components/admin/bookings/BookingsToolbar.tsx
git commit -m "feat: BookingsToolbar (search/date/sort/export)"
```

---

## Task 15: Shared UI — BulkActionBar (with confirm)

**Files:**
- Create: `src/components/admin/bookings/BulkActionBar.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/bookings/BulkActionBar.tsx
"use client";
import { useState } from "react";
import type { BookingAction } from "@/lib/adminBookings/actions";

export interface BulkActionDef { action: BookingAction; label: string; danger?: boolean; }

export function BulkActionBar({
  count, actions, onRun, onClear,
}: { count: number; actions: BulkActionDef[]; onRun: (a: BookingAction) => Promise<void>; onClear: () => void }) {
  const [pending, setPending] = useState<BookingAction | null>(null);
  if (count === 0) return null;

  const run = async (a: BulkActionDef) => {
    if (!confirm(`${a.label} ${count} selected booking(s)? This cannot be undone.`)) return;
    setPending(a.action);
    try { await onRun(a.action); } finally { setPending(null); }
  };

  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 20, marginTop: 12,
      display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
      background: "#141414", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
    }}>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{count} selected</span>
      <button onClick={onClear} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        {actions.map(a => (
          <button key={a.action} disabled={pending !== null} onClick={() => run(a)} style={{
            height: 34, padding: "0 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
            fontFamily: "inherit", cursor: pending ? "wait" : "pointer", border: "none",
            background: a.danger ? "rgba(239,68,68,0.15)" : "#4ade80",
            color: a.danger ? "#f87171" : "#000",
          }}>{pending === a.action ? "Working…" : a.label}</button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` → exit 0
```bash
git add src/components/admin/bookings/BulkActionBar.tsx
git commit -m "feat: BulkActionBar with confirmation"
```

---

## Task 16: Shared UI — BookingDrawer

**Files:**
- Create: `src/components/admin/bookings/BookingDrawer.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/bookings/BookingDrawer.tsx
"use client";
import { useState } from "react";
import { Badge } from "@/components/admin/Badge";
import type { BookingRow } from "@/lib/adminBookings/types";
import type { BookingAction } from "@/lib/adminBookings/actions";

export interface RowActionDef { action: BookingAction; label: string; danger?: boolean; needsReason?: boolean; }

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ paddingBottom: 10, marginTop: 14, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, color: "#e5e7eb", wordBreak: "break-all" }}>{value}</p>
    </div>
  );
}

export function BookingDrawer({
  row, actions, onAction, onClose,
}: { row: BookingRow; actions: RowActionDef[]; onAction: (a: BookingAction, reason?: string) => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-IN") : null;

  const run = async (a: RowActionDef) => {
    let reason: string | undefined;
    if (a.needsReason) { reason = prompt("Reason (shown to the user):") ?? undefined; }
    if (a.danger && !confirm(`${a.label}?`)) return;
    setBusy(true);
    try { await onAction(a.action, reason); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ width: 380, maxWidth: "100vw", background: "#0d0d0d", borderLeft: "1px solid rgba(255,255,255,0.1)", padding: 22, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Booking Detail</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <Badge status={row.status} />

        <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>User Information</p>
        <Field label="Name" value={row.userName} />
        <Field label="Email" value={row.userEmail} />
        <Field label="Phone" value={row.userPhone} />

        <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>Booking Information</p>
        <Field label="Booking ID" value={row.id} />
        <Field label="Entity" value={row.entityName} />
        {Object.entries(row.extra).map(([k, v]) => <Field key={k} label={k} value={v || null} />)}

        {row.payment && (
          <>
            <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>Payment Information</p>
            <Field label="Amount" value={`₹${row.payment.amount} ${row.payment.currency}`} />
            <Field label="Status" value={row.payment.status} />
            <Field label="Razorpay Payment" value={row.payment.razorpayPaymentId} />
            <Field label="Paid At" value={fmt(row.payment.paidAt)} />
          </>
        )}

        <p style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 6px" }}>Timestamps</p>
        <Field label="Created" value={fmt(row.createdAt)} />
        <Field label="Updated" value={fmt(row.updatedAt)} />
        {row.sessionDate && <Field label="Session/Event date" value={fmt(row.sessionDate)} />}

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.map(a => (
            <button key={a.action} disabled={busy} onClick={() => run(a)} style={{
              height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              cursor: busy ? "wait" : "pointer",
              border: a.danger ? "1px solid rgba(239,68,68,0.3)" : "none",
              background: a.danger ? "transparent" : "#4ade80",
              color: a.danger ? "#f87171" : "#000",
            }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` → exit 0
```bash
git add src/components/admin/bookings/BookingDrawer.tsx
git commit -m "feat: BookingDrawer with detail sections + actions"
```

---

## Task 17: Category config

**Files:**
- Create: `src/lib/adminBookings/config.tsx`

Declares each category's columns, row/bulk actions, and per-category badge
relabeling. The view component reads only from here.

- [ ] **Step 1: Implement**

```tsx
// src/lib/adminBookings/config.tsx
import type { CategoryKey, BookingRow } from "./types";
import type { RowActionDef } from "@/components/admin/bookings/BookingDrawer";
import type { BulkActionDef } from "@/components/admin/bookings/BulkActionBar";

export interface ColumnDef { key: string; header: string; render: (r: BookingRow) => string; }

export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  apiPath: string;
  columns: ColumnDef[];
  rowActions: RowActionDef[];
  bulkActions: BulkActionDef[];
}

const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-IN") : "—";

export const CATEGORY_CONFIGS: Record<CategoryKey, CategoryConfig> = {
  coaches: {
    key: "coaches", label: "Coaches", apiPath: "/api/admin/bookings/coaches",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "coach", header: "Coach", render: r => r.entityName },
      { key: "session", header: "Session", render: r => r.extra.session ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true, needsReason: true },
      { action: "complete", label: "Mark Completed" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "approve", label: "Approve" },
      { action: "reject", label: "Reject", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
  "play-sessions": {
    key: "play-sessions", label: "Play Sessions", apiPath: "/api/admin/bookings/play-sessions",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "game", header: "Game", render: r => r.entityName },
      { key: "sport", header: "Sport", render: r => r.extra.sport ?? "—" },
      { key: "date", header: "Date", render: r => fmtDate(r.sessionDate) },
    ],
    rowActions: [
      { action: "mark-attended", label: "Mark Attended" },
      { action: "mark-no-show", label: "Mark No-show", danger: true },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "mark-attended", label: "Mark Attended" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
  workshops: {
    key: "workshops", label: "Workshops", apiPath: "/api/admin/bookings/workshops",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "workshop", header: "Workshop", render: r => r.entityName },
      { key: "participant", header: "Participant", render: r => r.extra.participant ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
  camps: {
    key: "camps", label: "Camps", apiPath: "/api/admin/bookings/camps",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "camp", header: "Camp", render: r => r.entityName },
      { key: "child", header: "Child", render: r => r.extra.child ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
  events: {
    key: "events", label: "Events", apiPath: "/api/admin/bookings/events",
    columns: [
      { key: "id", header: "Booking ID", render: r => r.id },
      { key: "user", header: "User", render: r => r.userName },
      { key: "event", header: "Event", render: r => r.entityName },
      { key: "team", header: "Team", render: r => r.extra.team ?? "—" },
      { key: "created", header: "Created", render: r => fmtDate(r.createdAt) },
    ],
    rowActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
    bulkActions: [
      { action: "mark-paid", label: "Mark Paid" },
      { action: "mark-refunded", label: "Mark Refunded" },
      { action: "cancel", label: "Cancel", danger: true },
    ],
  },
};
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` → exit 0
```bash
git add src/lib/adminBookings/config.tsx
git commit -m "feat: per-category booking configs"
```

---

## Task 18: BookingsCategoryView (the framework component)

**Files:**
- Create: `src/components/admin/bookings/BookingsCategoryView.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/admin/bookings/BookingsCategoryView.tsx
"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/admin/Badge";
import { SummaryCards } from "./SummaryCards";
import { BookingsToolbar, type ToolbarState } from "./BookingsToolbar";
import { BulkActionBar } from "./BulkActionBar";
import { BookingDrawer } from "./BookingDrawer";
import type { CategoryConfig } from "@/lib/adminBookings/config";
import type { BookingRow, ListResponse } from "@/lib/adminBookings/types";
import type { BookingAction } from "@/lib/adminBookings/actions";

const PAGE_SIZE = 25;

export function BookingsCategoryView({ config }: { config: CategoryConfig }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [tb, setTb] = useState<ToolbarState>({ q: "", date: "all", from: "", to: "", sort: "newest" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<BookingRow | null>(null);

  const params = new URLSearchParams({
    status, page: String(page), pageSize: String(PAGE_SIZE), sort: tb.sort, date: tb.date,
    ...(tb.q ? { q: tb.q } : {}), ...(tb.date === "custom" ? { from: tb.from, to: tb.to } : {}),
  });
  const queryKey = ["admin", "bookings", config.key, params.toString()];
  const { data, isLoading } = useQuery<ListResponse>({
    queryKey, queryFn: () => fetch(`${config.apiPath}?${params}`).then(r => r.json()),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "bookings"] });

  const runAction = async (ids: string[], action: BookingAction, rejectionReason?: string) => {
    const r = await fetch(config.apiPath, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, rejectionReason }),
    });
    const body = await r.json();
    if (!r.ok) { toast.error(body.error ?? "Action failed"); return; }
    const failed = (body.results ?? []).filter((x: any) => !x.ok);
    if (failed.length) toast.error(`${failed.length} failed: ${failed[0].error}`);
    else toast.success("Done.");
    setSelected(new Set()); refresh();
  };

  const exportCsv = () => {
    const csvParams = new URLSearchParams(params); csvParams.set("format", "csv");
    window.open(`${config.apiPath}?${csvParams}`, "_blank");
  };

  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const th = { padding: "10px 12px", fontSize: 10, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: "left" as const };
  const td = { padding: "11px 12px", fontSize: 13, color: "#e5e7eb", borderTop: "1px solid rgba(255,255,255,0.05)" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{config.label} Bookings</h1>
      <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 18 }}>Showing {data?.total ?? 0} bookings</p>

      <SummaryCards counts={data?.counts ?? []} active={status} onPick={s => { setStatus(s); setPage(1); }} />
      <BookingsToolbar state={tb} onChange={s => { setTb(s); setPage(1); }} onExport={exportCsv} />

      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 36 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              {config.columns.map(c => <th key={c.key} style={th}>{c.header}</th>)}
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td style={td} colSpan={config.columns.length + 3}>Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td style={td} colSpan={config.columns.length + 3}>No bookings.</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <td style={td}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                {config.columns.map(c => <td key={c.key} style={td}>{c.render(r)}</td>)}
                <td style={td}><Badge status={r.status} /></td>
                <td style={td}>
                  <button onClick={() => setDrawer(r)} style={{ fontSize: 12, color: "#e63946", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ fontSize: 12, color: page <= 1 ? "#4b5563" : "#e5e7eb", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", cursor: page <= 1 ? "default" : "pointer" }}>Prev</button>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ fontSize: 12, color: page >= totalPages ? "#4b5563" : "#e5e7eb", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", cursor: page >= totalPages ? "default" : "pointer" }}>Next</button>
      </div>

      <BulkActionBar
        count={selected.size} actions={config.bulkActions}
        onRun={(a) => runAction([...selected], a)} onClear={() => setSelected(new Set())}
      />

      {drawer && (
        <BookingDrawer
          row={drawer} actions={config.rowActions}
          onAction={async (a, reason) => { await runAction([drawer.id], a, reason); setDrawer(null); }}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit` → exit 0
```bash
git add src/components/admin/bookings/BookingsCategoryView.tsx
git commit -m "feat: BookingsCategoryView framework component"
```

---

## Task 19: Category route page + wire Coaches end-to-end

**Files:**
- Create: `src/app/admin/bookings/[category]/page.tsx`

- [ ] **Step 1: Read the Next.js dynamic-route / params guide**

This Next version changed `params` handling. Read `node_modules/next/dist/docs/` for the params API (the coach detail page uses `const { id } = use(params)` with `params: Promise<{...}>` — mirror that).

- [ ] **Step 2: Implement the page**

```tsx
// src/app/admin/bookings/[category]/page.tsx
"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import { CATEGORY_CONFIGS } from "@/lib/adminBookings/config";
import { BookingsCategoryView } from "@/components/admin/bookings/BookingsCategoryView";
import type { CategoryKey } from "@/lib/adminBookings/types";

const VALID: CategoryKey[] = ["coaches", "play-sessions", "workshops", "camps", "events"];

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  if (!VALID.includes(category as CategoryKey)) return notFound();
  return <BookingsCategoryView config={CATEGORY_CONFIGS[category as CategoryKey]} />;
}
```

- [ ] **Step 3: Typecheck & build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0; the build output lists `/admin/bookings/[category]` and `/api/admin/bookings/coaches`.

- [ ] **Step 4: Manual verification (Coaches)**

Per saved memory, authed routes can 500 locally against the Upstash placeholder; if `npm run dev` returns 500 on the admin APIs, verify against the deployed env or with API interception. Otherwise:
- Visit `/admin/bookings` → 5 cards render with counts.
- Click Coaches → table loads, summary cards show counts, status tabs filter, search works, sort works, pagination works.
- Select rows → bulk bar appears → Approve with confirm → toast + refresh.
- Click View → drawer opens → Approve/Reject(reason)/Complete/Cancel work; invalid transition shows the 409 message.
- Export CSV downloads a file respecting the current filter.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/bookings/[category]/page.tsx
git commit -m "feat: dynamic category page; coaches bookings end-to-end"
```

---

# PHASE 3 — Remaining four categories

Each task mirrors the Coaches API contract (Task 12). The configs already exist
(Task 17) and the UI is shared, so each task is **only the API route** plus a
manual check. The differences are: the Prisma model, includes, `toRow` mapping,
where-builder, sort date fields, payment join, and CSV columns.

## Task 20: Play Sessions API

**Files:**
- Create: `src/app/api/admin/bookings/play-sessions/route.ts`

Play sessions read from `GamePlayer` joined to `Game`. `sessionDate` =
`game.scheduledAt` (enables "upcoming" sort). No `Payment` join in the row
(games are paid, but per spec the drawer Payment section is optional; include it
if a Payment exists for entityType "game").

- [ ] **Step 1: Implement**

```ts
// src/app/api/admin/bookings/play-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { parsePagination, parseDateRange, parseSort, orderByFor } from "@/lib/adminBookings/query";
import { gamePlayerWhereForStatus, deriveGamePlayerStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount } from "@/lib/adminBookings/types";

const INCLUDE = {
  user: { select: { name: true, email: true, phone: true } },
  game: { select: { title: true, sport: true, scheduledAt: true } },
} as const;

function toRow(p: any): BookingRow {
  return {
    id: p.id, userId: p.userId, userName: p.user?.name ?? "—", userEmail: p.user?.email ?? "—",
    userPhone: p.user?.phone ?? null, entityName: p.game?.title ?? "—",
    status: deriveGamePlayerStatus(p.status, p.attended),
    createdAt: p.joinedAt.toISOString(), updatedAt: p.updatedAt?.toISOString() ?? null,
    sessionDate: p.game?.scheduledAt?.toISOString() ?? null,
    extra: { sport: p.game?.sport ?? "—" }, payment: null,
  };
}

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...gamePlayerWhereForStatus(status) };
  if (range) where.joinedAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { game: { title: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

async function statusCounts(countWhere: Record<string, unknown>): Promise<StatusCount[]> {
  const base = { ...countWhere }; delete (base as any).status; delete (base as any).attended;
  const [cancelled, attended, noShow, joined] = await Promise.all([
    prisma.gamePlayer.count({ where: { ...base, status: "cancelled" } }),
    prisma.gamePlayer.count({ where: { ...base, status: { not: "cancelled" }, attended: true } }),
    prisma.gamePlayer.count({ where: { ...base, status: { not: "cancelled" }, attended: false } }),
    prisma.gamePlayer.count({ where: { ...base, status: { not: "cancelled" }, attended: null } }),
  ]);
  const m: Record<string, number> = { cancelled, attended, "no-show": noShow, joined };
  return CATEGORY_STATUSES["play-sessions"].map(s => ({ status: s, count: m[s] ?? 0 }));
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  if (p.get("format") === "csv") {
    const rows = await prisma.gamePlayer.findMany({ where, include: INCLUDE, orderBy: { joinedAt: "desc" } });
    const mapped = rows.map(toRow);
    const headers = ["Booking ID", "User", "Email", "Phone", "Game", "Sport", "Date", "Status", "Joined"];
    const csv = toCsv(headers, mapped.map(r => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.sport, r.sessionDate, r.status, r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="play-sessions-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const orderBy = orderByFor(parseSort(p), "joinedAt", "joinedAt"); // upcoming sort handled below
  // GamePlayer has no scheduledAt column; "upcoming" sorts by joinedAt as a fallback.

  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, counts] = await Promise.all([
    prisma.gamePlayer.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.gamePlayer.count({ where }),
    statusCounts(countWhere),
  ]);
  const body: ListResponse = { rows: rows.map(toRow), total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids, id, action } = await req.json();
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("play-sessions", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("play-sessions", list, action as BookingAction);
  return NextResponse.json({ results });
}
```

Note: "upcoming" sort uses `joinedAt` here because GamePlayer has no date column of its own; sorting by the related game date would require a raw query — out of scope. The toolbar still functions; document this in the manual check.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → exit 0

- [ ] **Step 3: Manual check** — `/admin/bookings/play-sessions`: rows load, status buckets (Joined/Attended/No-show/Cancelled) filter, Mark Attended / Mark No-show / Cancel work and release a game slot, CSV exports.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/bookings/play-sessions/route.ts
git commit -m "feat: play-sessions bookings API"
```

---

## Task 21: Workshops API

**Files:**
- Create: `src/app/api/admin/bookings/workshops/route.ts`

Reads `WorkshopRegistration` joined to `Workshop`. `sessionDate` =
`workshop.startDate`. Payment join: `Payment` where `entityType="workshop"`,
`entityId=workshopId`, `userId`.

- [ ] **Step 1: Implement**

```ts
// src/app/api/admin/bookings/workshops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { parsePagination, parseDateRange, parseSort, orderByFor } from "@/lib/adminBookings/query";
import { registrationWhereForStatus, deriveRegistrationStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount, PaymentInfo } from "@/lib/adminBookings/types";

const INCLUDE = {
  user: { select: { name: true, email: true, phone: true } },
  workshop: { select: { title: true, startDate: true } },
} as const;

async function paymentFor(workshopId: string, userId: string): Promise<PaymentInfo | null> {
  const pay = await prisma.payment.findFirst({
    where: { entityType: "workshop", entityId: workshopId, userId }, orderBy: { createdAt: "desc" },
  });
  return pay ? { amount: pay.amount, currency: pay.currency, status: pay.status, razorpayPaymentId: pay.razorpayPaymentId, paidAt: pay.paidAt?.toISOString() ?? null } : null;
}

function toRow(r: any, payment: PaymentInfo | null): BookingRow {
  return {
    id: r.id, userId: r.userId, userName: r.user?.name ?? "—", userEmail: r.user?.email ?? "—",
    userPhone: r.user?.phone ?? null, entityName: r.workshop?.title ?? "—",
    status: deriveRegistrationStatus(r.status, r.paymentStatus),
    createdAt: r.registeredAt.toISOString(), updatedAt: r.updatedAt?.toISOString() ?? null,
    sessionDate: r.workshop?.startDate?.toISOString() ?? null,
    extra: { participant: `${r.participantName}${r.participantAge ? ` (${r.participantAge})` : ""}`, type: r.registrationType },
    payment,
  };
}

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...registrationWhereForStatus(status) };
  if (range) where.registeredAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { workshop: { title: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

async function statusCounts(countWhere: Record<string, unknown>): Promise<StatusCount[]> {
  const base = { ...countWhere }; delete (base as any).status; delete (base as any).paymentStatus;
  const [cancelled, pending, paid, failed, refunded] = await Promise.all([
    prisma.workshopRegistration.count({ where: { ...base, status: "cancelled" } }),
    prisma.workshopRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "pending" } }),
    prisma.workshopRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "paid" } }),
    prisma.workshopRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "failed" } }),
    prisma.workshopRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "refunded" } }),
  ]);
  const m: Record<string, number> = { cancelled, pending, paid, failed, refunded };
  return CATEGORY_STATUSES.workshops.map(s => ({ status: s, count: m[s] ?? 0 }));
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  if (p.get("format") === "csv") {
    const rows = await prisma.workshopRegistration.findMany({ where, include: INCLUDE, orderBy: { registeredAt: "desc" } });
    const mapped = rows.map(r => toRow(r, null));
    const headers = ["Booking ID", "User", "Email", "Phone", "Workshop", "Participant", "Date", "Status", "Created"];
    const csv = toCsv(headers, mapped.map(r => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.participant, r.sessionDate, r.status, r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="workshops-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const orderBy = orderByFor(parseSort(p), "registeredAt", "registeredAt");
  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, counts] = await Promise.all([
    prisma.workshopRegistration.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.workshopRegistration.count({ where }),
    statusCounts(countWhere),
  ]);
  const withPay = await Promise.all(rows.map(async r => toRow(r, await paymentFor(r.workshopId, r.userId))));
  const body: ListResponse = { rows: withPay, total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids, id, action } = await req.json();
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("workshops", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("workshops", list, action as BookingAction);
  return NextResponse.json({ results });
}
```

- [ ] **Step 2: Typecheck** → `npx tsc --noEmit` exit 0
- [ ] **Step 3: Manual check** — `/admin/bookings/workshops`: buckets (Pending payment/Paid/Failed/Refunded/Cancelled), Mark Paid/Refunded/Cancel work; Cancel decrements `workshop.participants`; drawer shows Payment info; CSV exports.
- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/bookings/workshops/route.ts
git commit -m "feat: workshops bookings API"
```

---

## Task 22: Camps API

**Files:**
- Create: `src/app/api/admin/bookings/camps/route.ts`

Identical structure to Task 21 with these substitutions:
- Model: `prisma.campRegistration`; relation `camp { title, startDate }`; foreign key `campId`.
- `entityType` for payment join: `"camp"`.
- `extra`: `{ child: \`${r.childName} (${r.childAge})\` }`.
- CSV `Workshop`→`Camp`, `Participant`→`Child`; filename `camps-bookings.csv`.
- `CATEGORY_STATUSES.camps`, `isActionAllowed("camps", …)`, `applyBulk("camps", …)`.
- search `OR` uses `{ camp: { title: ... } }`.

- [ ] **Step 1: Implement** (copy Task 21's file and apply the substitutions above — full file, not a reference)

```ts
// src/app/api/admin/bookings/camps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { parsePagination, parseDateRange, parseSort, orderByFor } from "@/lib/adminBookings/query";
import { registrationWhereForStatus, deriveRegistrationStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount, PaymentInfo } from "@/lib/adminBookings/types";

const INCLUDE = {
  user: { select: { name: true, email: true, phone: true } },
  camp: { select: { title: true, startDate: true } },
} as const;

async function paymentFor(campId: string, userId: string): Promise<PaymentInfo | null> {
  const pay = await prisma.payment.findFirst({ where: { entityType: "camp", entityId: campId, userId }, orderBy: { createdAt: "desc" } });
  return pay ? { amount: pay.amount, currency: pay.currency, status: pay.status, razorpayPaymentId: pay.razorpayPaymentId, paidAt: pay.paidAt?.toISOString() ?? null } : null;
}

function toRow(r: any, payment: PaymentInfo | null): BookingRow {
  return {
    id: r.id, userId: r.userId, userName: r.user?.name ?? "—", userEmail: r.user?.email ?? "—",
    userPhone: r.user?.phone ?? null, entityName: r.camp?.title ?? "—",
    status: deriveRegistrationStatus(r.status, r.paymentStatus),
    createdAt: r.registeredAt.toISOString(), updatedAt: r.updatedAt?.toISOString() ?? null,
    sessionDate: r.camp?.startDate?.toISOString() ?? null,
    extra: { child: `${r.childName} (${r.childAge})` }, payment,
  };
}

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...registrationWhereForStatus(status) };
  if (range) where.registeredAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { camp: { title: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

async function statusCounts(countWhere: Record<string, unknown>): Promise<StatusCount[]> {
  const base = { ...countWhere }; delete (base as any).status; delete (base as any).paymentStatus;
  const [cancelled, pending, paid, failed, refunded] = await Promise.all([
    prisma.campRegistration.count({ where: { ...base, status: "cancelled" } }),
    prisma.campRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "pending" } }),
    prisma.campRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "paid" } }),
    prisma.campRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "failed" } }),
    prisma.campRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "refunded" } }),
  ]);
  const m: Record<string, number> = { cancelled, pending, paid, failed, refunded };
  return CATEGORY_STATUSES.camps.map(s => ({ status: s, count: m[s] ?? 0 }));
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  if (p.get("format") === "csv") {
    const rows = await prisma.campRegistration.findMany({ where, include: INCLUDE, orderBy: { registeredAt: "desc" } });
    const mapped = rows.map(r => toRow(r, null));
    const headers = ["Booking ID", "User", "Email", "Phone", "Camp", "Child", "Date", "Status", "Created"];
    const csv = toCsv(headers, mapped.map(r => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.child, r.sessionDate, r.status, r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="camps-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const orderBy = orderByFor(parseSort(p), "registeredAt", "registeredAt");
  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, counts] = await Promise.all([
    prisma.campRegistration.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.campRegistration.count({ where }),
    statusCounts(countWhere),
  ]);
  const withPay = await Promise.all(rows.map(async r => toRow(r, await paymentFor(r.campId, r.userId))));
  const body: ListResponse = { rows: withPay, total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids, id, action } = await req.json();
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("camps", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("camps", list, action as BookingAction);
  return NextResponse.json({ results });
}
```

- [ ] **Step 2: Typecheck** → exit 0
- [ ] **Step 3: Manual check** — `/admin/bookings/camps`: buckets + actions; Cancel decrements `camp.participants` and flips `full`→`open`; CSV exports.
- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/bookings/camps/route.ts
git commit -m "feat: camps bookings API"
```

---

## Task 23: Events API

**Files:**
- Create: `src/app/api/admin/bookings/events/route.ts`

Same as Task 22 with: model `prisma.eventRegistration`; relation
`event { title, startDate }` via `sportEvent`? — note the relation field on
`EventRegistration` is named `event` (see schema), so include `event: { select: { title: true, startDate: true } }`. Foreign key `eventId`. Payment `entityType="event"`. `extra`: `{ team: r.teamName ?? "—" }`. CSV header `Event`/`Team`; filename `events-bookings.csv`. Use `CATEGORY_STATUSES.events`, `isActionAllowed("events", …)`, `applyBulk("events", …)`, search `{ event: { title: ... } }`.

- [ ] **Step 1: Implement** (full file)

```ts
// src/app/api/admin/bookings/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { parsePagination, parseDateRange, parseSort, orderByFor } from "@/lib/adminBookings/query";
import { registrationWhereForStatus, deriveRegistrationStatus, CATEGORY_STATUSES } from "@/lib/adminBookings/status";
import { applyBulk, isActionAllowed, type BookingAction } from "@/lib/adminBookings/actions";
import { toCsv } from "@/lib/adminBookings/csv";
import type { BookingRow, ListResponse, StatusCount, PaymentInfo } from "@/lib/adminBookings/types";

const INCLUDE = {
  user: { select: { name: true, email: true, phone: true } },
  event: { select: { title: true, startDate: true } },
} as const;

async function paymentFor(eventId: string, userId: string): Promise<PaymentInfo | null> {
  const pay = await prisma.payment.findFirst({ where: { entityType: "event", entityId: eventId, userId }, orderBy: { createdAt: "desc" } });
  return pay ? { amount: pay.amount, currency: pay.currency, status: pay.status, razorpayPaymentId: pay.razorpayPaymentId, paidAt: pay.paidAt?.toISOString() ?? null } : null;
}

function toRow(r: any, payment: PaymentInfo | null): BookingRow {
  return {
    id: r.id, userId: r.userId, userName: r.user?.name ?? "—", userEmail: r.user?.email ?? "—",
    userPhone: r.user?.phone ?? null, entityName: r.event?.title ?? "—",
    status: deriveRegistrationStatus(r.status, r.paymentStatus),
    createdAt: r.registeredAt.toISOString(), updatedAt: r.updatedAt?.toISOString() ?? null,
    sessionDate: r.event?.startDate?.toISOString() ?? null,
    extra: { team: r.teamName ?? "—" }, payment,
  };
}

function buildWhere(p: URLSearchParams, now: Date) {
  const status = p.get("status") ?? "all";
  const q = p.get("q")?.trim();
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...registrationWhereForStatus(status) };
  if (range) where.registeredAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
  if (q) where.OR = [
    { id: { contains: q, mode: "insensitive" } },
    { user: { name: { contains: q, mode: "insensitive" } } },
    { user: { email: { contains: q, mode: "insensitive" } } },
    { event: { title: { contains: q, mode: "insensitive" } } },
  ];
  return where;
}

async function statusCounts(countWhere: Record<string, unknown>): Promise<StatusCount[]> {
  const base = { ...countWhere }; delete (base as any).status; delete (base as any).paymentStatus;
  const [cancelled, pending, paid, failed, refunded] = await Promise.all([
    prisma.eventRegistration.count({ where: { ...base, status: "cancelled" } }),
    prisma.eventRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "pending" } }),
    prisma.eventRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "paid" } }),
    prisma.eventRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "failed" } }),
    prisma.eventRegistration.count({ where: { ...base, status: { not: "cancelled" }, paymentStatus: "refunded" } }),
  ]);
  const m: Record<string, number> = { cancelled, pending, paid, failed, refunded };
  return CATEGORY_STATUSES.events.map(s => ({ status: s, count: m[s] ?? 0 }));
}

export async function GET(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams: p } = new URL(req.url);
  const now = new Date();
  const where = buildWhere(p, now);

  if (p.get("format") === "csv") {
    const rows = await prisma.eventRegistration.findMany({ where, include: INCLUDE, orderBy: { registeredAt: "desc" } });
    const mapped = rows.map(r => toRow(r, null));
    const headers = ["Booking ID", "User", "Email", "Phone", "Event", "Team", "Date", "Status", "Created"];
    const csv = toCsv(headers, mapped.map(r => [r.id, r.userName, r.userEmail, r.userPhone, r.entityName, r.extra.team, r.sessionDate, r.status, r.createdAt]));
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="events-bookings.csv"` } });
  }

  const { skip, take, page, pageSize } = parsePagination(p);
  const orderBy = orderByFor(parseSort(p), "registeredAt", "registeredAt");
  const countWhere = buildWhere(new URLSearchParams({ ...Object.fromEntries(p), status: "all" }), now);
  const [rows, total, counts] = await Promise.all([
    prisma.eventRegistration.findMany({ where, include: INCLUDE, orderBy, skip, take }),
    prisma.eventRegistration.count({ where }),
    statusCounts(countWhere),
  ]);
  const withPay = await Promise.all(rows.map(async r => toRow(r, await paymentFor(r.eventId, r.userId))));
  const body: ListResponse = { rows: withPay, total, page, pageSize, counts };
  return NextResponse.json(body);
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminSessionFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids, id, action } = await req.json();
  const list: string[] = Array.isArray(ids) ? ids : id ? [id] : [];
  if (!list.length || !action) return NextResponse.json({ error: "Missing ids/action" }, { status: 400 });
  if (!isActionAllowed("events", action as BookingAction)) return NextResponse.json({ error: "Action not allowed" }, { status: 400 });
  const results = await applyBulk("events", list, action as BookingAction);
  return NextResponse.json({ results });
}
```

- [ ] **Step 2: Typecheck** → exit 0
- [ ] **Step 3: Manual check** — `/admin/bookings/events`: buckets + actions; Cancel decrements `sportEvent.participants` and flips `Full`→`Registration Open`; CSV exports.
- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/bookings/events/route.ts
git commit -m "feat: events bookings API"
```

---

## Task 24: Final integration pass

**Files:**
- Delete (optional): `src/app/api/admin/bookings/route.ts` (the old mixed route) — only if nothing else imports it.

- [ ] **Step 1: Confirm nothing references the old route**

Run: `grep -rn "api/admin/bookings\"" src/ | grep -v "bookings/"`
If the only hits are removed/landing code, delete `src/app/api/admin/bookings/route.ts`. Otherwise leave it.

- [ ] **Step 2: Full test + typecheck + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all vitest suites pass, typecheck exit 0, build succeeds and lists all five `/api/admin/bookings/*` routes and `/admin/bookings/[category]`.

- [ ] **Step 3: Run the requesting-code-review skill** against the full diff before finishing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: finalize admin bookings redesign"
```

---

## Self-review notes (already applied)

- **Spec coverage:** category selector (Task 10/11), dedicated views (Task 19), per-category status (Task 6), filters/search/sort (Tasks 5/14), summary cards (Task 13, counts in Tasks 12/20-23), landing 5-metric cards (Tasks 9/11), drawer with all sections (Task 16), quick + bulk actions (Tasks 15/16/8), CSV export (Tasks 7/12/20-23), centralized payment status (Tasks 1/3), persistent-audit-ready action service (Task 8), server-side pagination/filtering + indexes (Tasks 2/5/12), 2–3-click UX (landing→category→status tab→action).
- **Type consistency:** `BookingRow`, `ListResponse`, `StatusCount`, `PaymentInfo`, `LandingMetrics`, `CategoryConfig`, `RowActionDef`, `BulkActionDef`, `BookingAction`, `SortKey`, `DatePreset` are defined once and reused; route `toRow` returns `BookingRow`; configs reference the shared action/column types.
- **Known limitations documented:** play-sessions "upcoming" sort falls back to `joinedAt`; "Mark refunded" updates `paymentStatus` only (no Razorpay refund call); landing "Completed" for registration categories is a derived overview metric.
