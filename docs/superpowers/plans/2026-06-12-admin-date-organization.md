# Admin Date-Based Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize every admin booking module (Coach Bookings, Play Sessions, Camps, Workshops, Events) and the standalone `/admin/games` page by **actual session/event date**, grouped into collapsible **Today / Tomorrow / Upcoming** sections, so admins instantly see what's happening operationally.

**Architecture:** Add an IST-aware (Asia/Kolkata, fixed +5:30, no DST) date core to the existing `src/lib/adminBookings/` system. Server routes filter/sort by the session date (on the related model) via a shared `buildDateQuery` helper, with coach bookings matched by recurring weekday. The client groups the returned page into three collapsible relative buckets via a pure `bucketRows` helper. The standalone Games page reuses the same date core in place.

**Tech Stack:** Next.js 16 (App Router, Turbopack), Prisma, React, @tanstack/react-query, Vitest. Branch: **main** (user preference: commit directly to main, no feature branch).

**Spec:** `docs/superpowers/specs/2026-06-12-admin-date-organization-design.md`

---

## File Structure

**Create:**
- `src/lib/adminBookings/grouping.ts` — pure client/server-safe bucketing (`bucketForCalendar`, `bucketForWeekday`, `bucketRows`, `BUCKET_ORDER`, `BUCKET_LABELS`).
- `src/lib/adminBookings/grouping.test.ts` — unit tests for bucketing.
- `src/components/admin/bookings/BookingsTable.tsx` — the table markup, extracted so it can render a flat list or one-per-bucket.

**Modify:**
- `src/lib/adminBookings/query.ts` — IST helpers, new date presets, `buildDateQuery`, `coachDateWhere`.
- `src/lib/adminBookings/query.test.ts` — update existing assertions to IST, add preset tests.
- `src/lib/adminBookings/types.ts` — `DatePreset`, `DateAxis`.
- `src/lib/adminBookings/config.tsx` — add `dateMode` per category.
- `src/app/api/admin/bookings/{camps,events,workshops,play-sessions}/route.ts` — use `buildDateQuery`.
- `src/app/api/admin/bookings/coaches/route.ts` — use `coachDateWhere`, add `extra.weekday`.
- `src/components/admin/bookings/BookingsToolbar.tsx` — new presets, By toggle, Group toggle.
- `src/components/admin/bookings/BookingsCategoryView.tsx` — default state, `by` param, grouped rendering.
- `src/app/api/admin/games/route.ts` — order by `scheduledAt asc`.
- `src/app/admin/games/page.tsx` — render Today/Tomorrow/Upcoming/Past sections.

---

## Task 1: IST date core + new presets in `query.ts`

**Files:**
- Modify: `src/lib/adminBookings/query.ts`
- Test: `src/lib/adminBookings/query.test.ts`

- [ ] **Step 1: Update the existing date tests to IST + add new presets (write failing tests first)**

Replace the entire `describe("parseDateRange", ...)` block in `src/lib/adminBookings/query.test.ts` with:

```ts
describe("parseDateRange (IST)", () => {
  // 2026-06-11T15:00:00Z == 2026-06-11 20:30 IST → IST "today" is Jun 11
  const now = new Date("2026-06-11T15:00:00.000Z");

  it("returns undefined for all", () => {
    expect(parseDateRange(new URLSearchParams("date=all"), now)).toBeUndefined();
  });

  it("today => IST day bounds (Jun 11 00:00 IST = Jun 10 18:30Z)", () => {
    const r = parseDateRange(new URLSearchParams("date=today"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-06-10T18:30:00.000Z");
    expect(r.lte!.toISOString()).toBe("2026-06-11T18:29:59.999Z");
  });

  it("tomorrow => next IST day bounds", () => {
    const r = parseDateRange(new URLSearchParams("date=tomorrow"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-06-11T18:30:00.000Z");
    expect(r.lte!.toISOString()).toBe("2026-06-12T18:29:59.999Z");
  });

  it("upcoming => from start of IST today, no upper bound", () => {
    const r = parseDateRange(new URLSearchParams("date=upcoming"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-06-10T18:30:00.000Z");
    expect(r.lte).toBeUndefined();
  });

  it("past => up to 1ms before start of IST today, no lower bound", () => {
    const r = parseDateRange(new URLSearchParams("date=past"), now)!;
    expect(r.gte).toBeUndefined();
    expect(r.lte!.toISOString()).toBe("2026-06-10T18:29:59.999Z");
  });

  it("custom interprets from/to as IST days", () => {
    const r = parseDateRange(new URLSearchParams("date=custom&from=2026-06-01&to=2026-06-05"), now)!;
    expect(r.gte!.toISOString()).toBe("2026-05-31T18:30:00.000Z");
    expect(r.lte!.toISOString()).toBe("2026-06-05T18:29:59.999Z");
  });

  it("handles the 00:00–05:30 IST edge (19:00Z == 00:30 IST next day)", () => {
    const lateNow = new Date("2026-06-12T19:00:00.000Z"); // 00:30 IST Jun 13
    const r = parseDateRange(new URLSearchParams("date=today"), lateNow)!;
    expect(r.gte!.toISOString()).toBe("2026-06-12T18:30:00.000Z"); // Jun 13 IST start
  });
});

describe("istWeekday", () => {
  it("returns the IST weekday name for today and tomorrow", () => {
    // 2026-06-12T19:00:00Z == 2026-06-13 00:30 IST → Saturday
    const now = new Date("2026-06-12T19:00:00.000Z");
    expect(istWeekday(now, 0)).toBe("Saturday");
    expect(istWeekday(now, 1)).toBe("Sunday");
  });
});
```

Update the import line at the top of the file to:

```ts
import { parsePagination, parseDateRange, orderByFor, istWeekday } from "./query";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/adminBookings/query.test.ts`
Expected: FAIL — `istWeekday` is not exported; `parseDateRange` returns old UTC values / lacks `tomorrow`/`upcoming`/`past`.

- [ ] **Step 3: Rewrite the date section of `query.ts`**

In `src/lib/adminBookings/query.ts`, replace the `DateRange` interface and the entire `parseDateRange` function with:

```ts
export const IST_OFFSET_MIN = 330; // Asia/Kolkata, fixed +5:30, no DST

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** IST weekday name for the day `offsetDays` from `now`. */
export function istWeekday(now: Date, offsetDays = 0): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000 + offsetDays * 86_400_000);
  return WEEKDAYS[ist.getUTCDay()];
}

/** UTC instant bounds for the IST calendar day `offsetDays` from `now`. */
export function istDayBounds(now: Date, offsetDays = 0): { gte: Date; lte: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const y = ist.getUTCFullYear(), mo = ist.getUTCMonth(), d = ist.getUTCDate() + offsetDays;
  return istDayBoundsFor(y, mo, d);
}

function istDayBoundsFor(y: number, moZeroBased: number, d: number): { gte: Date; lte: Date } {
  const startUtc = Date.UTC(y, moZeroBased, d, 0, 0, 0, 0) - IST_OFFSET_MIN * 60_000;
  const endUtc = Date.UTC(y, moZeroBased, d, 23, 59, 59, 999) - IST_OFFSET_MIN * 60_000;
  return { gte: new Date(startUtc), lte: new Date(endUtc) };
}

/** Both bounds optional: `upcoming` has only gte, `past` has only lte. */
export interface DateRange { gte?: Date; lte?: Date; }

/** Returns a UTC {gte?, lte?} range for the requested IST preset, or undefined for "all". */
export function parseDateRange(p: URLSearchParams, now: Date): DateRange | undefined {
  const preset = p.get("date") ?? "all";
  if (preset === "all") return undefined;
  if (preset === "today") return istDayBounds(now, 0);
  if (preset === "tomorrow") return istDayBounds(now, 1);
  if (preset === "upcoming") return { gte: istDayBounds(now, 0).gte };
  if (preset === "past") return { lte: new Date(istDayBounds(now, 0).gte.getTime() - 1) };
  if (preset === "custom") {
    const from = p.get("from"); const to = p.get("to");
    if (!from) return undefined;
    const fromBounds = istDayFromString(from);
    const toBounds = to ? istDayFromString(to) : istDayBounds(now, 0);
    return { gte: fromBounds.gte, lte: toBounds.lte };
  }
  return undefined;
}

function istDayFromString(s: string): { gte: Date; lte: Date } {
  const [y, mo, d] = s.split("-").map(Number);
  return istDayBoundsFor(y, mo - 1, d);
}
```

Note: `orderByFor` and `parseSort` stay as-is for now (Task 2 adds `buildDateQuery`). The routes that still call `orderByFor` keep working until their own task migrates them.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/adminBookings/query.test.ts`
Expected: PASS (all `parseDateRange (IST)`, `istWeekday`, plus unchanged `parsePagination`/`orderByFor`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminBookings/query.ts src/lib/adminBookings/query.test.ts
git commit -m "feat(admin): IST-aware date presets (today/tomorrow/upcoming/past)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `buildDateQuery` + `coachDateWhere` helpers

**Files:**
- Modify: `src/lib/adminBookings/query.ts`
- Modify: `src/lib/adminBookings/types.ts` (add `DateAxis`)
- Test: `src/lib/adminBookings/query.test.ts`

- [ ] **Step 1: Add `DateAxis` to types**

In `src/lib/adminBookings/types.ts`, replace the line:

```ts
export type DatePreset = "all" | "today" | "week" | "month" | "custom";
```

with:

```ts
export type DatePreset = "all" | "today" | "tomorrow" | "upcoming" | "past" | "custom";
export type DateAxis = "session" | "booking";
```

- [ ] **Step 2: Write failing tests for the two helpers**

Append to `src/lib/adminBookings/query.test.ts`:

```ts
import { buildDateQuery, coachDateWhere } from "./query";

describe("buildDateQuery", () => {
  const now = new Date("2026-06-11T15:00:00.000Z");
  const AXIS = { sessionRelation: "camp", sessionField: "startDate", bookingField: "registeredAt" };

  it("session axis (default) filters + orders on the related date field", () => {
    const { where, orderBy } = buildDateQuery(new URLSearchParams("date=upcoming"), now, AXIS);
    expect(where).toEqual({ camp: { startDate: { gte: new Date("2026-06-10T18:30:00.000Z") } } });
    expect(orderBy).toEqual({ camp: { startDate: "asc" } }); // default sort = upcoming
  });

  it("newest sort on session axis orders the related field desc", () => {
    const { orderBy } = buildDateQuery(new URLSearchParams("date=all&sort=newest"), now, AXIS);
    expect(orderBy).toEqual({ camp: { startDate: "desc" } });
  });

  it("booking axis filters + orders on the booking field", () => {
    const { where, orderBy } = buildDateQuery(new URLSearchParams("by=booking&date=today&sort=oldest"), now, AXIS);
    expect(where).toEqual({ registeredAt: { gte: new Date("2026-06-10T18:30:00.000Z"), lte: new Date("2026-06-11T18:29:59.999Z") } });
    expect(orderBy).toEqual({ registeredAt: "asc" });
  });

  it("no range (all) yields empty where", () => {
    const { where } = buildDateQuery(new URLSearchParams("date=all"), now, AXIS);
    expect(where).toEqual({});
  });
});

describe("coachDateWhere", () => {
  // 2026-06-11T15:00Z → IST Thursday Jun 11
  const now = new Date("2026-06-11T15:00:00.000Z");

  it("today matches the IST weekday on the batch relation (case-insensitive)", () => {
    expect(coachDateWhere(new URLSearchParams("date=today"), now))
      .toEqual({ batch: { is: { day: { equals: "Thursday", mode: "insensitive" } } } });
  });
  it("tomorrow matches the next IST weekday", () => {
    expect(coachDateWhere(new URLSearchParams("date=tomorrow"), now))
      .toEqual({ batch: { is: { day: { equals: "Friday", mode: "insensitive" } } } });
  });
  it("upcoming / all apply no weekday filter", () => {
    expect(coachDateWhere(new URLSearchParams("date=upcoming"), now)).toEqual({});
    expect(coachDateWhere(new URLSearchParams("date=all"), now)).toEqual({});
  });
  it("booking axis falls back to createdAt range", () => {
    expect(coachDateWhere(new URLSearchParams("by=booking&date=today"), now))
      .toEqual({ createdAt: { gte: new Date("2026-06-10T18:30:00.000Z"), lte: new Date("2026-06-11T18:29:59.999Z") } });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/adminBookings/query.test.ts`
Expected: FAIL — `buildDateQuery` / `coachDateWhere` are not exported.

- [ ] **Step 4: Implement the helpers in `query.ts`**

Add near the top of `src/lib/adminBookings/query.ts` (after the existing `import type { SortKey } from "./types";` line, widen it):

```ts
import type { SortKey, DateAxis } from "./types";
```

Then append to the end of `query.ts`:

```ts
export interface AxisOpts {
  /** to-one relation holding the session date, e.g. "camp" (omit for coaches). */
  sessionRelation?: string;
  /** date field on that relation, e.g. "startDate". */
  sessionField?: string;
  /** booking/creation timestamp scalar, e.g. "registeredAt" | "joinedAt". */
  bookingField: string;
}

/** Builds the Prisma where-fragment + orderBy for the date axis (`by=session|booking`). */
export function buildDateQuery(p: URLSearchParams, now: Date, opts: AxisOpts): {
  where: Record<string, unknown>;
  orderBy: Record<string, unknown>;
} {
  const by: DateAxis = p.get("by") === "booking" ? "booking" : "session";
  const sort = parseSort(p);
  const useSession = by === "session" && !!opts.sessionRelation && !!opts.sessionField;

  const range = parseDateRange(p, now);
  let where: Record<string, unknown> = {};
  if (range) {
    const f: Record<string, Date> = {};
    if (range.gte) f.gte = range.gte;
    if (range.lte) f.lte = range.lte;
    where = useSession
      ? { [opts.sessionRelation!]: { [opts.sessionField!]: f } }
      : { [opts.bookingField]: f };
  }

  let orderBy: Record<string, unknown>;
  if (sort === "updated") {
    orderBy = { updatedAt: "desc" };
  } else if (useSession) {
    const dir = sort === "newest" ? "desc" : "asc"; // upcoming & oldest → asc
    orderBy = { [opts.sessionRelation!]: { [opts.sessionField!]: dir } };
  } else {
    orderBy = { [opts.bookingField]: sort === "oldest" ? "asc" : "desc" };
  }
  return { where, orderBy };
}

/** Coach bookings have no calendar date — match the recurring batch weekday instead. */
export function coachDateWhere(p: URLSearchParams, now: Date): Record<string, unknown> {
  const by: DateAxis = p.get("by") === "booking" ? "booking" : "session";
  if (by === "booking") {
    const range = parseDateRange(p, now);
    if (!range) return {};
    const f: Record<string, Date> = {};
    if (range.gte) f.gte = range.gte;
    if (range.lte) f.lte = range.lte;
    return { createdAt: f };
  }
  const preset = p.get("date") ?? "all";
  if (preset === "today") return { batch: { is: { day: { equals: istWeekday(now, 0), mode: "insensitive" } } } };
  if (preset === "tomorrow") return { batch: { is: { day: { equals: istWeekday(now, 1), mode: "insensitive" } } } };
  return {}; // upcoming / all / past / custom → no weekday filter
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/adminBookings/query.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/adminBookings/query.ts src/lib/adminBookings/query.test.ts src/lib/adminBookings/types.ts
git commit -m "feat(admin): buildDateQuery + coachDateWhere date-axis helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Client-side bucketing — `grouping.ts`

**Files:**
- Create: `src/lib/adminBookings/grouping.ts`
- Test: `src/lib/adminBookings/grouping.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/adminBookings/grouping.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { bucketForCalendar, bucketForWeekday, bucketRows } from "./grouping";

// 2026-06-11T15:00Z == 2026-06-11 20:30 IST (Thursday)
const now = new Date("2026-06-11T15:00:00.000Z");

describe("bucketForCalendar", () => {
  it("buckets by IST calendar day", () => {
    expect(bucketForCalendar("2026-06-11T05:00:00.000Z", now)).toBe("today");     // Jun 11 10:30 IST
    expect(bucketForCalendar("2026-06-12T05:00:00.000Z", now)).toBe("tomorrow");
    expect(bucketForCalendar("2026-06-20T05:00:00.000Z", now)).toBe("upcoming");
    expect(bucketForCalendar("2026-06-01T05:00:00.000Z", now)).toBe("past");
  });
  it("handles the IST midnight edge", () => {
    // 2026-06-11T19:00Z == 00:30 IST Jun 12 → tomorrow
    expect(bucketForCalendar("2026-06-11T19:00:00.000Z", now)).toBe("tomorrow");
  });
  it("null / invalid → unscheduled", () => {
    expect(bucketForCalendar(null, now)).toBe("unscheduled");
    expect(bucketForCalendar("not-a-date", now)).toBe("unscheduled");
  });
});

describe("bucketForWeekday", () => {
  it("matches today/tomorrow IST weekday case-insensitively", () => {
    expect(bucketForWeekday("Thursday", now)).toBe("today");
    expect(bucketForWeekday("friday", now)).toBe("tomorrow");
    expect(bucketForWeekday("Monday", now)).toBe("upcoming");
  });
  it("empty / unknown → unscheduled", () => {
    expect(bucketForWeekday("", now)).toBe("unscheduled");
    expect(bucketForWeekday("someday", now)).toBe("unscheduled");
    expect(bucketForWeekday(undefined, now)).toBe("unscheduled");
  });
});

describe("bucketRows", () => {
  it("groups calendar rows into the bucket map", () => {
    const rows = [
      { sessionDate: "2026-06-11T05:00:00.000Z" },
      { sessionDate: "2026-06-12T05:00:00.000Z" },
      { sessionDate: null },
    ];
    const out = bucketRows(rows, "calendar", now);
    expect(out.today).toHaveLength(1);
    expect(out.tomorrow).toHaveLength(1);
    expect(out.unscheduled).toHaveLength(1);
  });
  it("groups weekday rows via extra.weekday", () => {
    const rows = [
      { sessionDate: null, extra: { weekday: "Thursday" } },
      { sessionDate: null, extra: { weekday: "" } },
    ];
    const out = bucketRows(rows, "weekday", now);
    expect(out.today).toHaveLength(1);
    expect(out.unscheduled).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/adminBookings/grouping.test.ts`
Expected: FAIL — module `./grouping` does not exist.

- [ ] **Step 3: Implement `grouping.ts`**

Create `src/lib/adminBookings/grouping.ts`:

```ts
import { istDayBounds, istWeekday } from "./query";

export type Bucket = "today" | "tomorrow" | "upcoming" | "past" | "unscheduled";

export const BUCKET_ORDER: Bucket[] = ["today", "tomorrow", "upcoming", "past", "unscheduled"];

export const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
  past: "Past",
  unscheduled: "Unscheduled",
};

export function bucketForCalendar(sessionDate: string | null | undefined, now: Date): Bucket {
  if (!sessionDate) return "unscheduled";
  const t = new Date(sessionDate).getTime();
  if (Number.isNaN(t)) return "unscheduled";
  const today = istDayBounds(now, 0);
  const tomorrow = istDayBounds(now, 1);
  if (t < today.gte.getTime()) return "past";
  if (t <= today.lte.getTime()) return "today";
  if (t <= tomorrow.lte.getTime()) return "tomorrow";
  return "upcoming";
}

const WEEKDAY_SET = new Set(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);

export function bucketForWeekday(weekday: string | null | undefined, now: Date): Bucket {
  const day = (weekday ?? "").trim().toLowerCase();
  if (!WEEKDAY_SET.has(day)) return "unscheduled";
  if (day === istWeekday(now, 0).toLowerCase()) return "today";
  if (day === istWeekday(now, 1).toLowerCase()) return "tomorrow";
  return "upcoming";
}

export interface RowLike { sessionDate?: string | null; extra?: Record<string, string>; }

export function bucketRows<T extends RowLike>(
  rows: T[], dateMode: "calendar" | "weekday", now: Date,
): Record<Bucket, T[]> {
  const out: Record<Bucket, T[]> = { today: [], tomorrow: [], upcoming: [], past: [], unscheduled: [] };
  for (const r of rows) {
    const b = dateMode === "weekday"
      ? bucketForWeekday(r.extra?.weekday, now)
      : bucketForCalendar(r.sessionDate, now);
    out[b].push(r);
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/adminBookings/grouping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminBookings/grouping.ts src/lib/adminBookings/grouping.test.ts
git commit -m "feat(admin): pure Today/Tomorrow/Upcoming row bucketing helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Add `dateMode` to category config

**Files:**
- Modify: `src/lib/adminBookings/config.tsx`

- [ ] **Step 1: Extend the `CategoryConfig` interface**

In `src/lib/adminBookings/config.tsx`, add `dateMode` to the interface:

```ts
export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  apiPath: string;
  dateMode: "calendar" | "weekday";
  columns: ColumnDef[];
  rowActions: RowActionDef[];
  bulkActions: BulkActionDef[];
}
```

- [ ] **Step 2: Set `dateMode` on each config**

Add the field to each of the five entries in `CATEGORY_CONFIGS`. Coaches is the only `"weekday"`:

- `coaches`: add `dateMode: "weekday",` (right after `apiPath: "/api/admin/bookings/coaches",`)
- `play-sessions`: add `dateMode: "calendar",`
- `workshops`: add `dateMode: "calendar",`
- `camps`: add `dateMode: "calendar",`
- `events`: add `dateMode: "calendar",`

- [ ] **Step 3: Verify the type compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/adminBookings/config.tsx
git commit -m "feat(admin): add dateMode (calendar/weekday) to category config

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Wire the four calendar routes to `buildDateQuery`

Apply the identical refactor to `camps`, `events`, `workshops`, and `play-sessions`. Each route currently imports `orderByFor` and uses `parseDateRange` directly in `buildWhere`. Replace with a module-level `AXIS` const + `buildDateQuery`.

**Files:**
- Modify: `src/app/api/admin/bookings/camps/route.ts`
- Modify: `src/app/api/admin/bookings/events/route.ts`
- Modify: `src/app/api/admin/bookings/workshops/route.ts`
- Modify: `src/app/api/admin/bookings/play-sessions/route.ts`

The `AXIS` value per route:

| Route          | sessionRelation | sessionField  | bookingField   |
|----------------|-----------------|---------------|----------------|
| camps          | `camp`          | `startDate`   | `registeredAt` |
| events         | `event`         | `startDate`   | `registeredAt` |
| workshops      | `workshop`      | `startDate`   | `registeredAt` |
| play-sessions  | `game`          | `scheduledAt` | `joinedAt`     |

- [ ] **Step 1: camps — update import**

In `src/app/api/admin/bookings/camps/route.ts`, change the query import line:

```ts
import { parsePagination, buildDateQuery } from "@/lib/adminBookings/query";
```

(Remove `parseDateRange`, `parseSort`, `orderByFor` from that import — they're no longer used.)

- [ ] **Step 2: camps — add AXIS const and rewrite `buildWhere`**

Directly above `function buildWhere(`, add:

```ts
const AXIS = { sessionRelation: "camp", sessionField: "startDate", bookingField: "registeredAt" };
```

Replace the two range lines inside `buildWhere`:

```ts
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...registrationWhereForStatus(status) };
  if (range) where.registeredAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
```

with:

```ts
  const { where: dateWhere } = buildDateQuery(p, now, AXIS);
  const where: Record<string, unknown> = { ...registrationWhereForStatus(status), ...dateWhere };
```

- [ ] **Step 3: camps — use buildDateQuery for orderBy in GET**

In `GET`, replace:

```ts
  const orderBy = orderByFor(parseSort(p), "registeredAt", "registeredAt");
```

with:

```ts
  const { orderBy } = buildDateQuery(p, now, AXIS);
```

- [ ] **Step 4: events — apply Steps 1–3 with `AXIS = { sessionRelation: "event", sessionField: "startDate", bookingField: "registeredAt" }`**

In `src/app/api/admin/bookings/events/route.ts`: same import change; add the `event` AXIS const above `buildWhere`; replace the `range`/`where.registeredAt` lines exactly as in Step 2 (the file uses `registeredAt` identically); replace the `orderByFor(...)` line in GET with `const { orderBy } = buildDateQuery(p, now, AXIS);`.

- [ ] **Step 5: workshops — apply Steps 1–3 with `AXIS = { sessionRelation: "workshop", sessionField: "startDate", bookingField: "registeredAt" }`**

In `src/app/api/admin/bookings/workshops/route.ts`: identical to camps/events (it also filters on `registeredAt`).

- [ ] **Step 6: play-sessions — apply Steps 1–3 with `AXIS = { sessionRelation: "game", sessionField: "scheduledAt", bookingField: "joinedAt" }`**

In `src/app/api/admin/bookings/play-sessions/route.ts` the booking field is `joinedAt`. Replace inside `buildWhere`:

```ts
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...gamePlayerWhereForStatus(status) };
  if (range) where.joinedAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
```

with:

```ts
  const { where: dateWhere } = buildDateQuery(p, now, AXIS);
  const where: Record<string, unknown> = { ...gamePlayerWhereForStatus(status), ...dateWhere };
```

and in GET replace the line (the trailing comment may be removed too):

```ts
  const orderBy = orderByFor(parseSort(p), "joinedAt", "joinedAt"); // GamePlayer has no own session date; "upcoming" falls back to joinedAt
```

with `const { orderBy } = buildDateQuery(p, now, AXIS);`. Update the import line the same way (keep `parsePagination`, add `buildDateQuery`, drop `parseDateRange`/`parseSort`/`orderByFor`).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. If any "declared but never read" error appears for `parseSort`/`parseDateRange`/`orderByFor`, remove it from that file's import.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/bookings/camps/route.ts src/app/api/admin/bookings/events/route.ts src/app/api/admin/bookings/workshops/route.ts src/app/api/admin/bookings/play-sessions/route.ts
git commit -m "feat(admin): filter+sort camps/events/workshops/games bookings by session date

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Wire the coaches route (weekday matching)

**Files:**
- Modify: `src/app/api/admin/bookings/coaches/route.ts`

- [ ] **Step 1: Update the import**

Change the query import line to:

```ts
import { parsePagination, parseSort, orderByFor, coachDateWhere } from "@/lib/adminBookings/query";
```

(Drop `parseDateRange`; keep `parseSort`/`orderByFor` — coaches still orders on `createdAt`.)

- [ ] **Step 2: Rewrite the date portion of `buildWhere`**

Replace:

```ts
  const range = parseDateRange(p, now);
  const where: Record<string, unknown> = { ...coachWhereForStatus(status) };
  if (range) where.createdAt = { gte: range.gte, ...(range.lte ? { lte: range.lte } : {}) };
```

with:

```ts
  const where: Record<string, unknown> = { ...coachWhereForStatus(status), ...coachDateWhere(p, now) };
```

- [ ] **Step 3: Expose the batch weekday for client bucketing**

In `toRow`, add a `weekday` field to `extra` so the client can group coach rows. Change the `extra` object to:

```ts
    extra: {
      sport: b.coach?.sport ?? "—",
      session: b.batch ? `${b.batch.day} ${b.batch.time}` : "1:1",
      weekday: b.batch?.day ?? "",
      rejectionReason: b.rejectionReason ?? "",
      coachNote: b.coachNote ?? "",
      note: b.note ?? "",
    },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/bookings/coaches/route.ts
git commit -m "feat(admin): coach bookings filter by batch weekday (today/tomorrow)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Toolbar — new presets, By toggle, Group toggle

**Files:**
- Modify: `src/components/admin/bookings/BookingsToolbar.tsx`

- [ ] **Step 1: Extend `ToolbarState` and the imports**

At the top of `src/components/admin/bookings/BookingsToolbar.tsx`, change the type import to include `DateAxis`:

```ts
import type { SortKey, DatePreset, DateAxis } from "@/lib/adminBookings/types";
```

Change the `ToolbarState` interface to:

```ts
export interface ToolbarState {
  q: string; date: DatePreset; from: string; to: string; sort: SortKey; by: DateAxis; group: "day" | "off";
}
```

- [ ] **Step 2: Replace the date `<select>` options and add the toggles**

Replace the existing date `<select>` block:

```tsx
      <select value={state.date} onChange={e => set({ date: e.target.value as DatePreset })} style={inputStyle}>
        <option value="all">All dates</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="custom">Custom…</option>
      </select>
```

with:

```tsx
      <select value={state.date} onChange={e => set({ date: e.target.value as DatePreset })} style={inputStyle}>
        <option value="upcoming">Upcoming</option>
        <option value="today">Today</option>
        <option value="tomorrow">Tomorrow</option>
        <option value="past">Past</option>
        <option value="all">All dates</option>
        <option value="custom">Custom…</option>
      </select>
      <select value={state.by} onChange={e => set({ by: e.target.value as DateAxis })} style={inputStyle} title="Which date the filter uses">
        <option value="session">By: Session date</option>
        <option value="booking">By: Booking date</option>
      </select>
      <button
        onClick={() => set({ group: state.group === "day" ? "off" : "day" })}
        style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: state.group === "day" ? "#e63946" : "#9ca3af" }}
      >
        {state.group === "day" ? "▼ Grouped" : "Group by date"}
      </button>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: FAIL with errors in `BookingsCategoryView.tsx` (its `useState<ToolbarState>` initializer is missing `by`/`group`). That's expected — Task 9 fixes it. Confirm the only errors are in `BookingsCategoryView.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/bookings/BookingsToolbar.tsx
git commit -m "feat(admin): toolbar presets + By/Group toggles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Extract `BookingsTable`

**Files:**
- Create: `src/components/admin/bookings/BookingsTable.tsx`

- [ ] **Step 1: Create the table component**

Create `src/components/admin/bookings/BookingsTable.tsx`:

```tsx
"use client";
import { Badge } from "@/components/admin/Badge";
import type { CategoryConfig } from "@/lib/adminBookings/config";
import type { BookingRow } from "@/lib/adminBookings/types";

const th = { padding: "10px 12px", fontSize: 10, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: "left" as const };
const td = { padding: "11px 12px", fontSize: 13, color: "#e5e7eb", borderTop: "1px solid rgba(255,255,255,0.05)" };

export function BookingsTable({
  rows, config, selected, onToggle, onView, loading,
  showSelectAll = true, allSelected = false, onToggleAll,
}: {
  rows: BookingRow[];
  config: CategoryConfig;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onView: (r: BookingRow) => void;
  loading?: boolean;
  showSelectAll?: boolean;
  allSelected?: boolean;
  onToggleAll?: () => void;
}) {
  const colSpan = config.columns.length + 3;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 36 }}>
              {showSelectAll && <input type="checkbox" checked={allSelected} onChange={onToggleAll} />}
            </th>
            {config.columns.map(c => <th key={c.key} style={th}>{c.header}</th>)}
            <th style={th}>Status</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td style={td} colSpan={colSpan}>Loading…</td></tr>}
          {!loading && rows.length === 0 && <tr><td style={td} colSpan={colSpan}>No bookings.</td></tr>}
          {rows.map(r => (
            <tr key={r.id}>
              <td style={td}><input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} /></td>
              {config.columns.map(c => <td key={c.key} style={td}>{c.render(r)}</td>)}
              <td style={td}><Badge status={r.status} /></td>
              <td style={td}>
                <button onClick={() => onView(r)} style={{ fontSize: 12, color: "#e63946", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: still only the pre-existing `BookingsCategoryView.tsx` errors from Task 7 (the new file itself compiles). Fixed next task.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/bookings/BookingsTable.tsx
git commit -m "refactor(admin): extract BookingsTable for reuse in grouped view

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Grouped rendering in `BookingsCategoryView`

**Files:**
- Modify: `src/components/admin/bookings/BookingsCategoryView.tsx`

- [ ] **Step 1: Update imports and default state**

In `src/components/admin/bookings/BookingsCategoryView.tsx`, add imports below the existing ones:

```ts
import { BookingsTable } from "./BookingsTable";
import { bucketRows, BUCKET_ORDER, BUCKET_LABELS } from "@/lib/adminBookings/grouping";
```

Change the initial toolbar state to default to grouped upcoming-by-session:

```ts
  const [tb, setTb] = useState<ToolbarState>({ q: "", date: "upcoming", from: "", to: "", sort: "upcoming", by: "session", group: "day" });
```

Add a collapsed-buckets state (after the `drawer` state line):

```ts
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["past"]));
```

- [ ] **Step 2: Send the `by` param to the server**

In the `params` `URLSearchParams`, add `by`:

```ts
  const params = new URLSearchParams({
    status, page: String(page), pageSize: String(PAGE_SIZE), sort: tb.sort, date: tb.date, by: tb.by,
    ...(tb.q ? { q: tb.q } : {}), ...(tb.date === "custom" ? { from: tb.from, to: tb.to } : {}),
  });
```

(`group` is intentionally NOT sent — it is client-only presentation.)

- [ ] **Step 3: Replace the flat `<table>` block with grouped/flat rendering**

Delete the entire existing `<div style={{ background: "#0d0d0d", ... }}> … </table> … </div>` block (the table) and replace it with:

```tsx
      {tb.group === "off" ? (
        <BookingsTable
          rows={rows} config={config} selected={selected} onToggle={toggle}
          onView={setDrawer} loading={isLoading}
          allSelected={allSelected} onToggleAll={toggleAll}
        />
      ) : (
        (() => {
          const buckets = bucketRows(rows, config.dateMode, new Date());
          const visible = BUCKET_ORDER.filter(b => buckets[b].length > 0);
          if (!isLoading && visible.length === 0) {
            return <BookingsTable rows={[]} config={config} selected={selected} onToggle={toggle} onView={setDrawer} loading={isLoading} showSelectAll={false} />;
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {visible.map(b => {
                const isOpen = !collapsed.has(b);
                return (
                  <div key={b}>
                    <button
                      onClick={() => setCollapsed(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; })}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 6 }}
                    >
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{isOpen ? "▼" : "▶"}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{BUCKET_LABELS[b]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{buckets[b].length}</span>
                    </button>
                    {isOpen && (
                      <BookingsTable
                        rows={buckets[b]} config={config} selected={selected}
                        onToggle={toggle} onView={setDrawer} showSelectAll={false}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (the Task 7 errors are now resolved).

- [ ] **Step 5: Run the full unit test suite**

Run: `npm run test`
Expected: PASS (all prior tests + the new query/grouping tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/bookings/BookingsCategoryView.tsx
git commit -m "feat(admin): collapsible Today/Tomorrow/Upcoming grouped booking view

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Standalone `/admin/games` page by date

**Files:**
- Modify: `src/app/api/admin/games/route.ts`
- Modify: `src/app/admin/games/page.tsx`

- [ ] **Step 1: Order games by scheduled time**

In `src/app/api/admin/games/route.ts`, change:

```ts
    orderBy: { createdAt: "desc" },
```

to:

```ts
    orderBy: { scheduledAt: "asc" },
```

- [ ] **Step 2: Import the bucketing helper into the page**

In `src/app/admin/games/page.tsx`, add below the existing imports:

```ts
import { bucketForCalendar, BUCKET_ORDER, BUCKET_LABELS } from "@/lib/adminBookings/grouping";
```

Add a collapsed-state hook next to the other `useState` calls (Past collapsed by default):

```ts
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(new Set(["past"]));
```

- [ ] **Step 3: Extract a single-row renderer**

The current `games.map(g => { … return (<tr>…</tr>); })` body becomes a reusable function so each bucket's table can call it. Directly above the `return (` of the component, add:

```tsx
  const renderGameRow = (g: GameData) => {
    const filled = g.slots - g.slotsLeft;
    const pct = Math.round((filled / g.slots) * 100);
    return (
      <tr key={g.id} onClick={() => openDrawer(g)} style={{ cursor: "pointer" }}
        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"}
        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
      >
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{g.title}</span>
          <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{g.sport}</span>
          {(g.status === "completed" || g.status === "archived") && (g.pointsAwarded
            ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "#4ade80" }}>✓ finalized</span>
            : <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "#eab308" }}>● awaiting review</span>)}
        </td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#9ca3af" }}>
          {g.organizerName}
          {g.organizerReliability && <span style={{ marginLeft: 6, fontSize: 11, color: "#eab308" }}>★ {g.organizerReliability.toFixed(1)}</span>}
        </td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#9ca3af", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.location}</td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(g.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: 12, color: "#fff", marginBottom: 4 }}>{filled}/{g.slots}</div>
          <div style={{ height: 4, background: "#1c1c1c", borderRadius: 99, width: 70, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
          </div>
        </td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.cost === "Free" ? "#4ade80" : "#fff" }}>{g.cost}</td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}><Badge status={g.status} /></td>
        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.waitlistCount > 0 ? "#eab308" : "#6b7280" }}>{g.waitlistCount}</td>
      </tr>
    );
  };

  const gameBuckets = (() => {
    const out: Record<string, GameData[]> = { today: [], tomorrow: [], upcoming: [], past: [], unscheduled: [] };
    const now = new Date();
    for (const g of games) out[bucketForCalendar(g.scheduledAt, now)].push(g);
    return out;
  })();
```

- [ ] **Step 4: Replace the single games table with per-bucket sections**

Replace the table container block:

```tsx
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111" }}>
                  <tr>{["Game","Organiser","Location","Date & Time","Slots","Cost","Status","Waitlist"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {!games.length ? (
                    <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No games found</td></tr>
                  ) : games.map(g => {
                    const filled = g.slots - g.slotsLeft;
                    const pct    = Math.round((filled / g.slots) * 100);
                    return (
                      <tr key={g.id} onClick={() => openDrawer(g)} style={{ cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                      >
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{g.title}</span>
                          <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{g.sport}</span>
                          {(g.status === "completed" || g.status === "archived") && (g.pointsAwarded
                            ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "#4ade80" }}>✓ finalized</span>
                            : <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "#eab308" }}>● awaiting review</span>)}
                        </td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#9ca3af" }}>
                          {g.organizerName}
                          {g.organizerReliability && <span style={{ marginLeft: 6, fontSize: 11, color: "#eab308" }}>★ {g.organizerReliability.toFixed(1)}</span>}
                        </td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#9ca3af", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.location}</td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(g.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ fontSize: 12, color: "#fff", marginBottom: 4 }}>{filled}/{g.slots}</div>
                          <div style={{ height: 4, background: "#1c1c1c", borderRadius: 99, width: 70, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#ef4444" : "#e63946", borderRadius: 99 }} />
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.cost === "Free" ? "#4ade80" : "#fff" }}>{g.cost}</td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}><Badge status={g.status} /></td>
                        <td style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: g.waitlistCount > 0 ? "#eab308" : "#6b7280" }}>{g.waitlistCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
```

with this per-bucket sectioned version:

```tsx
          {!games.length ? (
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "40px", textAlign: "center", color: "#6b7280" }}>No games found</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {BUCKET_ORDER.filter(b => gameBuckets[b].length > 0).map(b => {
                const isOpen = !collapsedBuckets.has(b);
                return (
                  <div key={b}>
                    <button
                      onClick={() => setCollapsedBuckets(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; })}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 8 }}
                    >
                      <span style={{ fontSize: 13, color: "#6b7280" }}>{isOpen ? "▼" : "▶"}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{BUCKET_LABELS[b]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(230,57,70,0.15)", color: "#e63946" }}>{gameBuckets[b].length}</span>
                    </button>
                    {isOpen && (
                      <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ background: "#111" }}>
                              <tr>{["Game","Organiser","Location","Date & Time","Slots","Cost","Status","Waitlist"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                              ))}</tr>
                            </thead>
                            <tbody>{gameBuckets[b].map(renderGameRow)}</tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/games/route.ts src/app/admin/games/page.tsx
git commit -m "feat(admin): organize Games tracker by Today/Tomorrow/Upcoming

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 2: Unit tests**

Run: `npm run test`
Expected: PASS. The suite should now include the new `query` IST/preset/`buildDateQuery`/`coachDateWhere` tests and the `grouping` tests (count increases from the prior 71).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS (Next 16 build completes).

- [ ] **Step 4: Manual smoke (dev server)**

Run: `npm run dev`, log into `/admin`, then verify:
- Each bookings tab (`/admin/bookings/camps`, `/events`, `/workshops`, `/play-sessions`, `/coaches`) opens defaulting to **Upcoming**, grouped into collapsible **Today / Tomorrow / Upcoming** sections, soonest first.
- Switching the date dropdown to **Today** / **Tomorrow** narrows the list server-side; **Past** shows past sessions; **All dates** shows everything.
- The **By: Session date / Booking date** toggle changes which date the filter uses (booking shows creation-date filtering).
- The **Group by date** button toggles between grouped sections and the flat table.
- The **Coaches** tab groups by batch weekday (today's weekday → Today), batch-less bookings under **Unscheduled**.
- `/admin/games` shows games under **Today / Tomorrow / Upcoming / Past** (Past collapsed), clicking a row still opens the detail drawer and admin actions work.
- Search, status summary cards, pagination, and CSV export still work on the bookings tabs.

> Note (from memory `local-upstash-placeholder-500s`): some authed admin APIs can 500 locally if Upstash/rate-limit env is unset. If a tab 500s locally, that's the known local-env issue, not this change — verify the query logic via the unit tests, which cover the date math directly.

- [ ] **Step 5: Final commit (only if Step 4 required tweaks)**

```bash
git add -A
git commit -m "fix(admin): date-organization smoke-test adjustments

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** session-date axis (Tasks 5–6), IST correctness (Task 1), three-bucket grouping (Tasks 3, 9), coaches weekday (Tasks 2, 6, 3), standalone Games page (Task 10), kept search/pagination/status/CSV (unchanged code paths, verified Task 11). Calendar/analytics/venues explicitly out of scope per spec.
- **Type consistency:** `DatePreset`/`DateAxis` (types.ts) used identically in toolbar, view, query; `buildDateQuery`/`coachDateWhere`/`bucketRows`/`BUCKET_ORDER`/`BUCKET_LABELS` signatures match across producer and consumers; `dateMode` flows config → view → `bucketRows`.
- **Null-date sort:** the four calendar relations (`camp/event/workshop.startDate`, `game.scheduledAt`) are non-null `DateTime`, so relation `orderBy` needs no `nulls: last`; coaches order on non-null `createdAt`. Confirmed against `schema.prisma`.
