# Game Scheduling Validation, Picker Redesign & Safe Join — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent past/expired game creation and joining, redesign the date/time picker, make joins race-safe, and ensure no raw Prisma/DB errors ever reach the UI.

**Architecture:** A single pure module (`src/lib/gameTime.ts`) holds all scheduling/join rules, imported by both backend routes and the frontend so logic can't drift. Backend stays authoritative; `handleErr` is hardened centrally so every route returns friendly `{ ok:false, error }`. A custom `DateTimePicker` (no new dependency) replaces the raw inputs.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 (Postgres), Zod, Vitest, React 19, framer-motion, sonner.

**Spec:** `docs/superpowers/specs/2026-06-11-game-scheduling-and-safe-join-design.md`

**Working branch:** `main` (user preference: commit directly to main).

**Conventions observed in this repo:**
- Tests live next to source as `*.test.ts` (e.g. `src/lib/adminBookings/actions.test.ts`), run with `npm run test` (vitest).
- Prisma is mocked in unit tests via `vi.hoisted` + `vi.mock("@/lib/prisma", ...)`.
- API routes use `ok()` / `fail()` / `handleErr()` from `src/lib/api.ts`.
- Run a single test file: `npx vitest run src/lib/gameTime.test.ts`.

---

## File Structure

- **Create** `src/lib/gameTime.ts` — pure scheduling/join rules.
- **Create** `src/lib/gameTime.test.ts` — unit tests for the rules.
- **Modify** `src/lib/api.ts` — add `ApiError`, harden `handleErr` (Prisma mapping, no raw leak).
- **Create** `src/lib/api.test.ts` — unit tests for `handleErr`.
- **Modify** `src/app/api/games/route.ts` — past/buffer validation on create.
- **Modify** `src/app/api/games/[id]/route.ts` — joinability + race-safe capacity.
- **Create** `src/app/api/games/[id]/route.test.ts` — join route tests (mocked prisma/auth).
- **Create** `src/components/ui/DateTimePicker.tsx` — calendar + 15-min time list.
- **Modify** `src/app/create-game/page.tsx` — integrate picker + pre-submit validation.
- **Modify** `src/app/play/page.tsx` — hide Join on non-joinable statuses.
- **Modify** `src/app/game/[id]/page.tsx` — hide Join on non-joinable statuses.

---

## Task 1: Shared scheduling/join rules (`gameTime.ts`)

**Files:**
- Create: `src/lib/gameTime.ts`
- Test: `src/lib/gameTime.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/gameTime.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  timeSlots, isSlotPast, validateGameSchedule, joinability, SCHEDULE_BUFFER_MIN,
} from "./gameTime";

describe("timeSlots", () => {
  const slots = timeSlots(15);
  it("produces 96 quarter-hour slots", () => {
    expect(slots).toHaveLength(96);
  });
  it("formats 24h value and 12h label", () => {
    expect(slots[0]).toEqual({ value: "00:00", label: "12:00 AM" });
    expect(slots[49]).toEqual({ value: "12:15", label: "12:15 PM" });
    expect(slots.find(s => s.value === "18:15")).toEqual({ value: "18:15", label: "6:15 PM" });
  });
});

describe("isSlotPast", () => {
  const now = new Date("2026-06-11T19:30:00");
  it("is true for an earlier slot today", () => {
    expect(isSlotPast("18:00", "2026-06-11", now)).toBe(true);
  });
  it("is true for the slot equal to now", () => {
    expect(isSlotPast("19:30", "2026-06-11", now)).toBe(true);
  });
  it("is false for a later slot today", () => {
    expect(isSlotPast("19:45", "2026-06-11", now)).toBe(false);
  });
  it("is false for any slot on a future date", () => {
    expect(isSlotPast("06:00", "2026-06-12", now)).toBe(false);
  });
});

describe("validateGameSchedule", () => {
  const now = new Date("2026-06-11T19:00:00");
  it("rejects a past time", () => {
    expect(validateGameSchedule(new Date("2026-06-11T18:00:00").toISOString(), now))
      .toEqual({ ok: false, message: "This game cannot be scheduled in the past." });
  });
  it("rejects within the 15-minute buffer", () => {
    expect(validateGameSchedule(new Date("2026-06-11T19:10:00").toISOString(), now))
      .toEqual({ ok: false, message: "Games must be scheduled at least 15 minutes in advance." });
  });
  it("accepts a time beyond the buffer", () => {
    expect(validateGameSchedule(new Date("2026-06-11T19:30:00").toISOString(), now))
      .toEqual({ ok: true });
  });
  it("uses a 15-minute buffer", () => {
    expect(SCHEDULE_BUFFER_MIN).toBe(15);
  });
});

describe("joinability", () => {
  const now = new Date("2026-06-11T19:00:00");
  const base = { organizerId: "org", status: "open", scheduledAt: "2026-06-11T20:00:00", duration: 60 };

  it("blocks the host first", () => {
    expect(joinability({ ...base }, now, "org")).toBe("You are already the host of this game.");
  });
  it("blocks cancelled/completed/archived", () => {
    expect(joinability({ ...base, status: "cancelled" }, now, "u1")).toBe("This game is no longer accepting players.");
    expect(joinability({ ...base, status: "completed" }, now, "u1")).toBe("This game is no longer accepting players.");
    expect(joinability({ ...base, status: "archived" }, now, "u1")).toBe("This game is no longer accepting players.");
  });
  it("blocks a game that already ended (start + duration < now)", () => {
    expect(joinability({ ...base, scheduledAt: "2026-06-11T17:00:00", duration: 60 }, now, "u1"))
      .toBe("This game has already ended.");
  });
  it("blocks a game that already started but not ended", () => {
    expect(joinability({ ...base, scheduledAt: "2026-06-11T18:30:00", duration: 60 }, now, "u1"))
      .toBe("This game has already started.");
  });
  it("returns null for a joinable future game", () => {
    expect(joinability({ ...base }, now, "u1")).toBeNull();
  });
  it("checks host before anything else", () => {
    expect(joinability({ ...base, status: "cancelled" }, now, "org"))
      .toBe("You are already the host of this game.");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gameTime.test.ts`
Expected: FAIL — `Failed to resolve import "./gameTime"`.

- [ ] **Step 3: Implement `gameTime.ts`**

Create `src/lib/gameTime.ts`:

```ts
// Single source of truth for game scheduling + join rules.
// Imported by both the API routes (authoritative) and the create-game UI
// so the two can never disagree. Pure functions only — no DB, no I/O.

export const SCHEDULE_BUFFER_MIN = 15;

export type TimeSlot = { value: string; label: string };

/** All slots in a day at `intervalMin` spacing. value = "HH:MM" (24h), label = "h:MM AM/PM". */
export function timeSlots(intervalMin = 15): TimeSlot[] {
  const out: TimeSlot[] = [];
  for (let m = 0; m < 24 * 60; m += intervalMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const period = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    out.push({ value, label: `${h12}:${String(min).padStart(2, "0")} ${period}` });
  }
  return out;
}

/** True if `slotValue` on `dateStr` (local) is at or before `now`. */
export function isSlotPast(slotValue: string, dateStr: string, now: Date): boolean {
  const slot = new Date(`${dateStr}T${slotValue}:00`);
  return slot.getTime() <= now.getTime();
}

export type ScheduleResult = { ok: true } | { ok: false; message: string };

/** Reject past times and times inside the booking buffer. */
export function validateGameSchedule(scheduledAtISO: string, now: Date): ScheduleResult {
  const when = new Date(scheduledAtISO).getTime();
  const diffMs = when - now.getTime();
  if (diffMs <= 0) return { ok: false, message: "This game cannot be scheduled in the past." };
  if (diffMs < SCHEDULE_BUFFER_MIN * 60_000) {
    return { ok: false, message: "Games must be scheduled at least 15 minutes in advance." };
  }
  return { ok: true };
}

export type JoinableGame = {
  organizerId: string;
  status: string;
  scheduledAt: Date | string;
  duration: number; // minutes
};

const CLOSED_STATUSES = ["cancelled", "completed", "archived"];

/**
 * First failing reason a user cannot join, or null if joinable.
 * Host check runs first (prevents duplicate participation), then status,
 * then ended-before-started so the more specific message wins.
 * Slot-availability and already-joined live in the route (they need extra queries).
 */
export function joinability(game: JoinableGame, now: Date, userId: string): string | null {
  if (game.organizerId === userId) return "You are already the host of this game.";
  if (CLOSED_STATUSES.includes(game.status)) return "This game is no longer accepting players.";
  const start = new Date(game.scheduledAt).getTime();
  const end = start + game.duration * 60_000;
  if (now.getTime() >= end) return "This game has already ended.";
  if (now.getTime() >= start) return "This game has already started.";
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gameTime.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gameTime.ts src/lib/gameTime.test.ts
git commit -m "feat: shared game scheduling + joinability rules"
```

---

## Task 2: Harden `handleErr` (no raw errors leak)

**Files:**
- Modify: `src/lib/api.ts:10-14`
- Test: `src/lib/api.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/api.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { handleErr, ApiError } from "./api";

async function body(res: Response) {
  return (await res.json()) as { ok: boolean; error?: string };
}

describe("handleErr", () => {
  it("passes an ApiError's userMessage and status through", async () => {
    const res = handleErr(new ApiError("This game has already started.", 400));
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ ok: false, error: "This game has already started." });
  });

  it("never echoes a raw Prisma error message", async () => {
    const raw = new Prisma.PrismaClientKnownRequestError(
      "Null constraint violation on the fields: (`userId`)",
      { code: "P2011", clientVersion: "7.0.0" },
    );
    const res = handleErr(raw);
    const j = await body(res);
    expect(j.ok).toBe(false);
    expect(j.error).toBe("Missing required information.");
    expect(j.error).not.toContain("prisma");
    expect(j.error).not.toContain("constraint");
  });

  it("maps P2025 (not found)", async () => {
    const raw = new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "7.0.0" });
    expect((await body(handleErr(raw))).error).toBe("The requested item no longer exists.");
  });

  it("returns a generic message for an unexpected Error (no raw message)", async () => {
    const res = handleErr(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    const j = await body(res);
    expect(res.status).toBe(500);
    expect(j.error).toBe("Something went wrong. Please try again.");
    expect(j.error).not.toContain("ECONNREFUSED");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/api.test.ts`
Expected: FAIL — `ApiError` is not exported; the raw-message assertions fail.

- [ ] **Step 3: Implement the hardened `handleErr` + `ApiError`**

In `src/lib/api.ts`, replace the import line and the `handleErr` block. Change line 1-2:

```ts
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { Prisma } from "@prisma/client";
```

Replace the existing `handleErr` (lines 10-14) with:

```ts
/** Thrown by routes for user-facing errors that handleErr should surface verbatim. */
export class ApiError extends Error {
  status: number;
  constructor(userMessage: string, status = 400) {
    super(userMessage);
    this.name = "ApiError";
    this.status = status;
  }
}

const PRISMA_MESSAGES: Record<string, string> = {
  P2002: "This conflicts with an existing record.",
  P2025: "The requested item no longer exists.",
  P2011: "Missing required information.",
  P2012: "Missing required information.",
  P2003: "Missing required information.",
};

export function handleErr(e: unknown) {
  if (e instanceof ApiError) return fail(e.message, e.status);
  if (e instanceof ZodError) return fail("Validation error", 422, e.flatten().fieldErrors);
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("[prisma]", e.code, e.message);
    return fail(PRISMA_MESSAGES[e.code] ?? "Something went wrong. Please try again.", 400);
  }
  // Anything else — including PrismaClientValidationError and unknown failures —
  // is logged server-side and returned as a generic message. Never echo e.message.
  console.error("[unhandled]", e);
  return fail("Something went wrong. Please try again.", 500);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/api.test.ts`
Expected: PASS.

- [ ] **Step 5: Audit intentional `throw new Error` in API routes**

Run: `grep -rn "throw new Error" src/app/api`
For each hit whose message is **user-facing** (meant to be shown), replace `throw new Error("msg")` with `throw new ApiError("msg", <status>)` (import `ApiError` from `@/lib/api`). Leave internal/guard throws alone — they should become generic. If there are no user-facing throws, note it and continue. (Routes already use `fail()` for user errors, so expect few or none.)

- [ ] **Step 6: Run the full suite to confirm nothing regressed**

Run: `npm run test`
Expected: all prior tests still pass plus the new `api.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts
git commit -m "fix: harden handleErr so no raw Prisma/DB errors reach the UI"
```

---

## Task 3: Past/buffer validation on game creation

**Files:**
- Modify: `src/app/api/games/route.ts:76-106` (the `POST` handler)

- [ ] **Step 1: Add the import**

At the top of `src/app/api/games/route.ts`, add to the existing imports:

```ts
import { validateGameSchedule } from "@/lib/gameTime";
```

- [ ] **Step 2: Add the check after parse**

In the `POST` handler, immediately after `const input = CreateGameSchema.parse(body);` (currently line 82), insert:

```ts
    const schedule = validateGameSchedule(input.scheduledAt, new Date());
    if (!schedule.ok) return fail(schedule.message, 400);
```

- [ ] **Step 3: Manually verify the wiring**

Run: `npx tsc --noEmit`
Expected: clean (no type errors). The logic itself is covered by Task 1's `validateGameSchedule` tests.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/games/route.ts
git commit -m "feat: reject past/too-soon game creation in the API"
```

---

## Task 4: Joinability + race-safe capacity on join

**Files:**
- Modify: `src/app/api/games/[id]/route.ts:43-80` (the `POST` handler)
- Test: `src/app/api/games/[id]/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/games/[id]/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, sessionMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock: any = {
    game: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    gamePlayer: { findUnique: vi.fn(), create: vi.fn() },
    waitlistEntry: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
  };
  const sessionMock = vi.fn();
  return { prismaMock, sessionMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getSessionFromRequest: sessionMock }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = {} as Request;
const future = new Date(Date.now() + 60 * 60_000).toISOString();
const past = new Date(Date.now() - 60 * 60_000).toISOString();

async function jsonOf(res: Response) {
  return (await res.json()) as { ok: boolean; error?: string; data?: { waitlisted?: boolean; joined?: boolean } };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockResolvedValue({ id: "u1" });
  prismaMock.gamePlayer.findUnique.mockResolvedValue(null);
});

it("rejects joining a game that already started, without touching gamePlayer.create", async () => {
  prismaMock.game.findUnique.mockResolvedValue({ organizerId: "org", status: "open", scheduledAt: past, duration: 60, slotsLeft: 5 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await POST(req as any, ctx("g1"));
  const j = await jsonOf(res);
  expect(res.status).toBe(400);
  expect(j.error).toBe("This game has already ended.");
  expect(prismaMock.gamePlayer.create).not.toHaveBeenCalled();
});

it("blocks the host from joining their own game", async () => {
  sessionMock.mockResolvedValue({ id: "org" });
  prismaMock.game.findUnique.mockResolvedValue({ organizerId: "org", status: "open", scheduledAt: future, duration: 60, slotsLeft: 5 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = await jsonOf(await POST(req as any, ctx("g1")));
  expect(j.error).toBe("You are already the host of this game.");
});

it("waitlists when the atomic slot claim finds no slot left", async () => {
  prismaMock.game.findUnique.mockResolvedValue({ organizerId: "org", status: "open", scheduledAt: future, duration: 60, slotsLeft: 1 });
  prismaMock.game.updateMany.mockResolvedValue({ count: 0 }); // someone else took the last slot
  prismaMock.waitlistEntry.findFirst.mockResolvedValue(null);
  prismaMock.waitlistEntry.count.mockResolvedValue(2);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = await jsonOf(await POST(req as any, ctx("g1")));
  expect(j.data?.waitlisted).toBe(true);
  expect(prismaMock.gamePlayer.create).not.toHaveBeenCalled();
});

it("joins when a slot is atomically claimed", async () => {
  prismaMock.game.findUnique
    .mockResolvedValueOnce({ organizerId: "org", status: "open", scheduledAt: future, duration: 60, slotsLeft: 3 })
    .mockResolvedValueOnce({ slotsLeft: 2, status: "open" }); // post-claim read
  prismaMock.game.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.gamePlayer.create.mockResolvedValue({ id: "gp1" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = await jsonOf(await POST(req as any, ctx("g1")));
  expect(j.data?.joined).toBe(true);
  expect(prismaMock.gamePlayer.create).toHaveBeenCalledWith({ data: { gameId: "g1", userId: "u1" } });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/api/games/[id]/route.test.ts"`
Expected: FAIL — current handler doesn't check end-time, doesn't use `updateMany`, etc.

- [ ] **Step 3: Rewrite the `POST` handler**

In `src/app/api/games/[id]/route.ts`, add the import near the top:

```ts
import { joinability } from "@/lib/gameTime";
```

Replace the entire `POST` handler (lines 43-80) with:

```ts
// JOIN
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(req);
    if (!session?.id) return fail("Authentication required", 401);

    const game = await prisma.game.findUnique({
      where: { id },
      select: { organizerId: true, status: true, scheduledAt: true, duration: true, slotsLeft: true },
    });
    if (!game) return fail("Game not found", 404);

    // Host / status / start-and-end-time checks (shared rules).
    const reason = joinability(game, new Date(), session.id);
    if (reason) return fail(reason, 400);

    // Already joined?
    const already = await prisma.gamePlayer.findUnique({
      where: { gameId_userId: { gameId: id, userId: session.id } },
      select: { id: true },
    });
    if (already) return fail("You have already joined this game.", 409);

    // Race-safe capacity claim: the conditional decrement is atomic in Postgres,
    // so two concurrent joins on the last slot can't both succeed. The loser falls
    // through to the waitlist. (Same pattern as the finalize handler's award claim.)
    const claim = await prisma.game.updateMany({
      where: { id, status: "open", slotsLeft: { gt: 0 } },
      data: { slotsLeft: { decrement: 1 } },
    });

    if (claim.count === 0) {
      const onWaitlist = await prisma.waitlistEntry.findFirst({ where: { gameId: id, userId: session.id }, select: { id: true } });
      if (onWaitlist) return fail("Already on waitlist", 409);
      const position = (await prisma.waitlistEntry.count({ where: { gameId: id } })) + 1;
      await prisma.waitlistEntry.create({ data: { gameId: id, userId: session.id, position } });
      return ok({ waitlisted: true, position });
    }

    // Slot claimed — create participation. If create fails, release the slot so the
    // count stays correct, then let handleErr map the error to a friendly message.
    try {
      await prisma.gamePlayer.create({ data: { gameId: id, userId: session.id } });
    } catch (createErr) {
      await prisma.game.update({ where: { id }, data: { slotsLeft: { increment: 1 } } });
      throw createErr;
    }

    // Flip to "full" if we took the last slot.
    const after = await prisma.game.findUnique({ where: { id }, select: { slotsLeft: true, status: true } });
    if (after && after.slotsLeft === 0 && after.status === "open") {
      await prisma.game.update({ where: { id }, data: { status: "full" } });
    }

    return ok({ joined: true, slotsLeft: after?.slotsLeft ?? 0, status: after?.slotsLeft === 0 ? "full" : "open" });
  } catch (e) { return handleErr(e); }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "src/app/api/games/[id]/route.test.ts"`
Expected: PASS (all four cases).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/games/[id]/route.ts" "src/app/api/games/[id]/route.test.ts"
git commit -m "fix: validate joinability and make slot capacity race-safe"
```

---

## Task 5: `DateTimePicker` component

**Files:**
- Create: `src/components/ui/DateTimePicker.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/ui/DateTimePicker.tsx`:

```tsx
"use client";
import { useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { timeSlots, isSlotPast } from "@/lib/gameTime";

type Props = {
  date: string;            // "YYYY-MM-DD" or ""
  time: string;            // "HH:MM" or ""
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
};

const RED = "#e63946";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DateTimePicker({ date, time, onDateChange, onTimeChange }: Props) {
  const now = new Date();
  const today = ymd(now);

  // Which month grid to show: the selected date's month, else the current month.
  const view = useMemo(() => (date ? new Date(`${date}T00:00:00`) : now), [date]);
  const [viewYear, viewMonth] = [view.getFullYear(), view.getMonth()];

  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay();
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(ymd(new Date(viewYear, viewMonth, d)));
    return cells;
  }, [viewYear, viewMonth]);

  const slots = useMemo(() => timeSlots(15), []);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the time list to the selected (or first enabled) slot.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>("[data-active='true'], [data-enabled='true']");
    el?.scrollIntoView({ block: "center" });
  }, [date]);

  const changeMonth = (delta: number) => {
    const m = new Date(viewYear, viewMonth + delta, 1);
    // Don't navigate to months entirely before the current month.
    if (m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() < now.getMonth())) return;
    onDateChange(date ? ymd(new Date(m.getFullYear(), m.getMonth(), Math.min(Number(date.slice(8)), new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()))) : "");
    // Note: we only move the view; selection is preserved if still valid. Simpler: store view via selecting first day is avoided.
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 168px", gap: 14 }} className="dtp-grid">
      {/* Calendar */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month"
            style={navBtn}><ChevronLeft size={16} /></button>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{MONTHS[viewMonth]} {viewYear}</div>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month"
            style={navBtn}><ChevronRight size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {DOW.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10.5, color: "rgba(255,255,255,0.4)", fontWeight: 600, padding: "2px 0" }}>{d}</div>)}
          {grid.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} />;
            const isPast = cell < today;
            const isToday = cell === today;
            const isSelected = cell === date;
            return (
              <button
                key={cell}
                type="button"
                disabled={isPast}
                onClick={() => { if (!isPast) onDateChange(cell); }}
                style={{
                  aspectRatio: "1", borderRadius: 9, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                  cursor: isPast ? "not-allowed" : "pointer",
                  border: isToday && !isSelected ? `1px solid ${RED}` : "1px solid transparent",
                  background: isSelected ? `linear-gradient(135deg, ${RED} 0%, #b91c2d 100%)` : "transparent",
                  color: isPast ? "rgba(255,255,255,0.18)" : isSelected ? "#fff" : "rgba(255,255,255,0.8)",
                }}
              >
                {Number(cell.slice(8))}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time list */}
      <div ref={listRef} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 6, maxHeight: 260, overflowY: "auto" }}>
        {!date && <div style={{ padding: 12, fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>Pick a date first</div>}
        {date && slots.map(s => {
          const disabled = isSlotPast(s.value, date, now);
          const active = s.value === time;
          return (
            <button
              key={s.value}
              type="button"
              disabled={disabled}
              data-active={active}
              data-enabled={!disabled && !active}
              onClick={() => onTimeChange(s.value)}
              style={{
                width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                background: active ? `linear-gradient(135deg, ${RED} 0%, #b91c2d 100%)` : "transparent",
                color: disabled ? "rgba(255,255,255,0.18)" : active ? "#fff" : "rgba(255,255,255,0.75)",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <style>{`@media (max-width:640px){ .dtp-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer",
};
```

> Note: month navigation preserves the selected day where valid; the view follows the selected date. Keep `changeMonth` simple — if a cleaner approach emerges during implementation (e.g. a small `viewDate` state), that's fine as long as past months stay unreachable and the existing `date`/`time` string contract is unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/DateTimePicker.tsx
git commit -m "feat: custom DateTimePicker (disabled past dates + 15-min slots)"
```

---

## Task 6: Wire the picker into create-game + pre-submit validation

**Files:**
- Modify: `src/app/create-game/page.tsx`

- [ ] **Step 1: Add imports**

In `src/app/create-game/page.tsx`, add to the imports:

```ts
import { toast } from "sonner";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { validateGameSchedule } from "@/lib/gameTime";
```

- [ ] **Step 2: Replace the raw date/time inputs**

Replace the two `FieldRow` blocks inside the Schedule `SectionCard` (currently lines 137-144 — the `<div className="two-col">…</div>` containing the `type="date"` and `type="time"` inputs) with:

```tsx
            <FieldRow label="Date & start time" required>
              <DateTimePicker
                date={form.date}
                time={form.time}
                onDateChange={d => set("date", d)}
                onTimeChange={t => set("time", t)}
              />
            </FieldRow>
```

- [ ] **Step 3: Add a guard in `handleSubmit`**

In `handleSubmit`, immediately after the existing required-fields early return (currently line 30), insert:

```ts
    const schedule = validateGameSchedule(new Date(`${form.date}T${form.time}:00`).toISOString(), new Date());
    if (!schedule.ok) { toast.error(schedule.message); return; }
```

- [ ] **Step 4: Verify build + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc clean; lint reports 0 errors (warnings ok).

- [ ] **Step 5: Manual smoke (optional but recommended)**

Run: `npm run dev`, open `/create-game`, confirm: past dates are greyed/unclickable, today is ringed, selecting today greys out passed time slots, picking a valid future slot lets you publish.

- [ ] **Step 6: Commit**

```bash
git add src/app/create-game/page.tsx
git commit -m "feat: use DateTimePicker on create-game + block past schedule on submit"
```

---

## Task 7: Hide Join on non-joinable games (frontend audit)

**Files:**
- Modify: `src/app/play/page.tsx` (`GameCard`, ~line 155-321)
- Modify: `src/app/game/[id]/page.tsx` (join button block, ~line 566-590)

Backend is authoritative; this is UX hygiene so closed games don't show a Join affordance. Note the `/play` "Recent Games" tab returns `completed` games — those currently still render a Join button.

- [ ] **Step 1: Guard the `GameCard` button in `play/page.tsx`**

In `src/app/play/page.tsx`, inside `GameCard`, just after `const isFull = game.slotsLeft === 0 || game.status === "full";` (line 160), add:

```ts
  const joinable = !["cancelled", "completed", "archived"].includes(game.status);
```

Then in the footer (the `<button>` around lines 303-322 with `onClick={() => join.mutate(game.id)}`), render a status chip instead of the button when not joinable. Wrap the existing button:

```tsx
            {joinable ? (
              <button
                disabled={join.isPending}
                onClick={() => join.mutate(game.id)}
                /* ...keep all existing style props unchanged... */
              >
                {join.isPending ? "…" : isFull ? "Waitlist" : "Join"}
              </button>
            ) : (
              <span style={{
                padding: "8px 16px", borderRadius: 100, fontSize: 12.5, fontWeight: 700,
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                {game.status === "completed" ? "Completed" : "Closed"}
              </span>
            )}
```

- [ ] **Step 2: Guard the detail-page button in `game/[id]/page.tsx`**

In `src/app/game/[id]/page.tsx`, find where `isFull` is defined and add alongside it:

```ts
  const joinable = !["cancelled", "completed", "archived"].includes(game.status);
```

Wrap the join `<button>` block (the `<Magnetic>` containing `onClick={isFull ? () => join.mutate(game.id) : handleJoin}`, ~lines 566-591) so it only renders when `joinable`. When not joinable, render in its place:

```tsx
                  <div style={{
                    height: 52, borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 700,
                  }}>
                    {game.status === "completed" ? "This game is over" : "This game is closed"}
                  </div>
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: tsc clean; 0 lint errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/play/page.tsx "src/app/game/[id]/page.tsx"
git commit -m "fix: hide Join action on cancelled/completed/archived games"
```

---

## Task 8: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the whole gate**

```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
```

Expected: tsc clean; lint 0 errors; all tests pass (existing 71 + new gameTime/api/route tests); build succeeds.

- [ ] **Step 2: Confirm no raw-error leakage path remains**

Run: `grep -rn "fail(e.message" src/ ; grep -rn "e.message, 400" src/lib/api.ts`
Expected: no matches (the old leaky pattern is gone).

- [ ] **Step 3: Final commit (if any verification fixups were needed)**

```bash
git add -A && git commit -m "chore: verification fixups for game scheduling + safe join"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Past-creation block (spec §2) → Task 3. ✅
- Date/time picker redesign (spec §6) → Tasks 5–6. ✅
- Join validation + null root cause (spec §3) → Task 4 (`joinability` + `session?.id` guard + create wrapped). ✅
- Centralized error handling, no raw leaks (spec §5) → Task 2. ✅
- Edit/reschedule standing requirement (spec §4) → documented; no route exists, none built (intentional). ✅
- Host-cannot-join, ordered first (added req 2) → Task 1 `joinability` + Task 4. ✅
- Frontend join audit (added req 3) → Task 7. ✅
- Race condition (added req 4) → Task 4 atomic `updateMany`. ✅
- 15-min buffer (added req 5) → Task 1 `validateGameSchedule` + Tasks 3/6. ✅
- Unit tests around business logic → Tasks 1, 2, 4. ✅

**Type consistency:** `validateGameSchedule(iso, now)`, `joinability(game, now, userId)`, `isSlotPast(value, dateStr, now)`, `timeSlots(interval)`, `ApiError(message, status)`, `DateTimePicker({date,time,onDateChange,onTimeChange})` — names/signatures used identically across tasks.

**Placeholder scan:** no TBD/TODO; every code step shows complete code.
