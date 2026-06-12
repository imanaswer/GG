# Dashboard Drill-Down Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin dashboard's metric cards clickable, deep-linking to the right admin page with filters that reproduce the card's number already applied, plus a visible chip explaining the filter.

**Architecture:** `StatCard` gains an optional `href` so a card renders as a Next.js `<Link>` (real anchor → Cmd/Ctrl-click + open-in-new-tab work). The dashboard passes hrefs per a fixed map. Two destination pages read filters from the URL (`useSearchParams`, wrapped in `<Suspense>` to keep production builds passing) and show a filter chip: the Games page filters to the metric's exact `now − 7d` + open/full window; the Bookings category view seeds `status`/`date` from the URL and adds a coach-only `active` (= pending+approved) pseudo-status. Every filtered destination's list total equals the card's number.

**Tech Stack:** Next.js (App Router, modified build — see `node_modules/next/dist/docs/`), React, TypeScript, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-12-dashboard-drill-down-design.md`

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/adminBookings/status.ts` | add `active` pseudo-status to `coachWhereForStatus` | Modify |
| `src/lib/adminBookings/status.test.ts` | unit test the `active` mapping | Create |
| `src/lib/adminGames.ts` | pure predicate replicating the "games this week" metric | Create |
| `src/lib/adminGames.test.ts` | unit test the predicate | Create |
| `src/components/admin/StatCard.tsx` | optional `href` → render as `<Link>` with hover affordance | Modify |
| `src/app/admin/page.tsx` | pass `href` to the 7 metric cards | Modify |
| `src/app/admin/games/page.tsx` | read `?range=week`, filter + chip, Suspense boundary | Modify |
| `src/components/admin/bookings/BookingsCategoryView.tsx` | seed `status`/`date` from URL, filter chip | Modify |
| `src/app/admin/bookings/[category]/page.tsx` | wrap category view in `<Suspense>` | Modify |

**Note for the implementer (AGENTS.md):** this is a modified Next.js. The relevant facts have already been confirmed from `node_modules/next/dist/docs/`: `<Link href>` renders an `<a>` and accepts `style`/`onMouseEnter` (no `legacyBehavior`); a client component calling `useSearchParams` **must** sit inside a `<Suspense>` boundary or the production build fails ("Missing Suspense boundary with useSearchParams"). Both are handled below.

---

### Task 1: `active` pseudo-status for coach bookings

**Files:**
- Modify: `src/lib/adminBookings/status.ts` (`coachWhereForStatus`, lines 46-49)
- Test: `src/lib/adminBookings/status.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/adminBookings/status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { coachWhereForStatus } from "./status";

describe("coachWhereForStatus", () => {
  it("returns empty where for all / empty", () => {
    expect(coachWhereForStatus("all")).toEqual({});
    expect(coachWhereForStatus("")).toEqual({});
  });

  it("maps a concrete status to equality", () => {
    expect(coachWhereForStatus("approved")).toEqual({ status: "approved" });
  });

  it("maps the 'active' pseudo-status to pending OR approved", () => {
    expect(coachWhereForStatus("active")).toEqual({ status: { in: ["pending", "approved"] } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/adminBookings/status.test.ts`
Expected: FAIL on the `active` case — currently returns `{ status: "active" }`, not `{ status: { in: [...] } }`.

- [ ] **Step 3: Implement the `active` branch**

In `src/lib/adminBookings/status.ts`, replace `coachWhereForStatus`:

```ts
/** Coach where-fragment is a plain status equality, plus the `active` pseudo-status. */
export function coachWhereForStatus(bucket: string): Record<string, unknown> {
  if (!bucket || bucket === "all") return {};
  if (bucket === "active") return { status: { in: ["pending", "approved"] } };
  return { status: bucket };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/adminBookings/status.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminBookings/status.ts src/lib/adminBookings/status.test.ts
git commit -m "feat(admin): add 'active' pseudo-status (pending+approved) for coach bookings"
```

---

### Task 2: "Games this week" metric predicate

**Files:**
- Create: `src/lib/adminGames.ts`
- Test: `src/lib/adminGames.test.ts`

This must mirror the overview metric exactly: `src/app/api/admin/overview/route.ts` computes
`gamesThisWeek` as `game.count({ where: { scheduledAt: { gte: now - 7*86400000 }, status: { in: ["open","full"] } } })`. Use the same **raw millisecond** arithmetic — do **not** use the IST day-bounds helpers.

- [ ] **Step 1: Write the failing test**

Create `src/lib/adminGames.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isGameInMetricWeek, GAMES_WEEK_MS } from "./adminGames";

const NOW = new Date("2026-06-12T12:00:00.000Z");
const iso = (msFromNow: number) => new Date(NOW.getTime() + msFromNow).toISOString();

describe("isGameInMetricWeek", () => {
  it("includes an open game scheduled now", () => {
    expect(isGameInMetricWeek(iso(0), "open", NOW)).toBe(true);
  });

  it("includes a full game 6 days in the past", () => {
    expect(isGameInMetricWeek(iso(-6 * 86_400_000), "full", NOW)).toBe(true);
  });

  it("includes a future open game", () => {
    expect(isGameInMetricWeek(iso(3 * 86_400_000), "open", NOW)).toBe(true);
  });

  it("excludes a game older than 7 days", () => {
    expect(isGameInMetricWeek(iso(-GAMES_WEEK_MS - 1), "open", NOW)).toBe(false);
  });

  it("includes a game exactly at the 7-day boundary", () => {
    expect(isGameInMetricWeek(iso(-GAMES_WEEK_MS), "open", NOW)).toBe(true);
  });

  it("excludes completed/cancelled games inside the window", () => {
    expect(isGameInMetricWeek(iso(0), "completed", NOW)).toBe(false);
    expect(isGameInMetricWeek(iso(0), "cancelled", NOW)).toBe(false);
  });

  it("excludes an unparseable date", () => {
    expect(isGameInMetricWeek("not-a-date", "open", NOW)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/adminGames.test.ts`
Expected: FAIL with "Cannot find module './adminGames'".

- [ ] **Step 3: Implement the predicate**

Create `src/lib/adminGames.ts`:

```ts
/** Rolling 7-day window (ms) used by the dashboard "Games This Week" metric. */
export const GAMES_WEEK_MS = 7 * 86_400_000;

/**
 * Replicates the overview metric (`/api/admin/overview`):
 * a game counts as "this week" when it is open/full and scheduled no earlier
 * than 7 days ago. Uses raw millisecond arithmetic to match the metric byte-for-byte.
 */
export function isGameInMetricWeek(scheduledAt: string, status: string, now: Date): boolean {
  if (status !== "open" && status !== "full") return false;
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= now.getTime() - GAMES_WEEK_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/adminGames.test.ts`
Expected: PASS (7 assertions across the cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminGames.ts src/lib/adminGames.test.ts
git commit -m "feat(admin): add games-this-week predicate matching the overview metric"
```

---

### Task 3: `StatCard` href support

**Files:**
- Modify: `src/components/admin/StatCard.tsx` (whole file)

No unit test — this is presentational. Verified by typecheck (Task 7) and the dashboard render.

- [ ] **Step 1: Replace the component with href-aware version**

Replace the entire contents of `src/components/admin/StatCard.tsx`:

```tsx
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  value: string | number;
  label: string;
  sub?: string;
  icon?: LucideIcon;
  color?: string;
  accent?: boolean;
  /** When set, the card renders as a navigational link with a hover affordance. */
  href?: string;
}

export function StatCard({ value, label, sub, icon: Icon, color = "#e63946", accent, href }: StatCardProps) {
  const rgb = color === "#e63946" ? "230,57,70" : "34,197,94";
  const baseBorder = accent ? `rgba(${rgb},0.25)` : "rgba(255,255,255,0.07)";
  const cardStyle: React.CSSProperties = {
    background: accent ? `rgba(${rgb},0.08)` : "#141414",
    border: `1px solid ${baseBorder}`,
    borderRadius: 12,
    padding: "18px 20px",
    display: "block",
    ...(href ? { textDecoration: "none", cursor: "pointer", transition: "border-color 0.15s" } : {}),
  };

  const inner = (
    <>
      {Icon && <Icon size={18} color={color} style={{ marginBottom: 10 }} />}
      <div style={{ fontSize: 28, fontWeight: 900, color: accent ? color : "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{sub}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={cardStyle}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(230,57,70,0.4)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = baseBorder; }}
      >
        {inner}
      </Link>
    );
  }

  return <div style={cardStyle}>{inner}</div>;
}
```

Note: the non-`href` branch is visually identical to the original (same background/border/padding; `display:"block"` is inert on a `<div>`). The games page passes no `href`, so its cards are unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/StatCard.tsx
git commit -m "feat(admin): StatCard renders as a Link when given an href"
```

---

### Task 4: Wire dashboard cards to destinations

**Files:**
- Modify: `src/app/admin/page.tsx` (lines 38-44, the 7 `<StatCard>` calls)

- [ ] **Step 1: Add `href` to each metric card**

Replace the 7 `<StatCard ... />` lines (currently lines 38-44) with:

```tsx
            <StatCard value={m?.totalUsers      ?? "—"} label="Total Users"        sub="Registered players"   icon={Users}          href="/admin/users" />
            <StatCard value={m?.totalCoaches    ?? "—"} label="Active Coaches"     sub="On the platform"      icon={Star}           href="/admin/coaches" />
            <StatCard value={m?.activeBookings  ?? "—"} label="Active Bookings"    sub="Pending + approved"  icon={CalendarCheck}  href="/admin/bookings/coaches?status=active" />
            <StatCard value={m?.gamesThisWeek   ?? "—"} label="Games This Week"    sub="Open + full"          icon={Gamepad2}       href="/admin/games?range=week" />
            <StatCard value={m?.campRegistrations?? "—"} label="Camp Registrations" sub="All camps"           icon={Tent}           href="/admin/bookings/camps?date=all" />
            <StatCard value={m?.workshopRegistrations ?? "—"} label="Workshop Sign-ups" sub="All workshops"   icon={Lightbulb}      href="/admin/bookings/workshops?date=all" />
            <StatCard value={`₹${(m?.revenueMonth ?? 0).toLocaleString("en-IN")}`} label="Revenue (Month)" sub="Paid transactions" icon={IndianRupee} accent color="#e63946" href="/admin/revenue" />
```

(Active Bookings deliberately omits `date=all`: the coach list's default `upcoming` preset is a no-op for coaches, so it already matches the date-less metric, and omitting it keeps the chip clean.)

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): deep-link dashboard metric cards to their pages"
```

---

### Task 5: Games page — `?range=week` filter + chip + Suspense

**Files:**
- Modify: `src/app/admin/games/page.tsx`

The current default export `AdminGames` becomes an inner component that reads the URL; a new default export wraps it in `<Suspense>` (required because `useSearchParams` in a client component breaks the production build without a boundary).

- [ ] **Step 1: Add imports**

At the top of `src/app/admin/games/page.tsx`, update the React import and add the others. Change line 2 from `import { useState } from "react";` to:

```tsx
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isGameInMetricWeek } from "@/lib/adminGames";
```

- [ ] **Step 2: Read the param and filter games**

Rename the existing component and read the flag. Change the declaration line
`export default function AdminGames() {` to:

```tsx
function AdminGamesInner() {
  const searchParams = useSearchParams();
  const weekOnly = searchParams.get("range") === "week";
```

Then change the `games` derivation (currently `const games = data?.games ?? [];`) to apply the filter:

```tsx
  const allGames = data?.games ?? [];
  const now = new Date();
  const games = weekOnly
    ? allGames.filter(g => isGameInMetricWeek(g.scheduledAt, g.status, now))
    : allGames;
```

(Leave the existing `const st = data?.stats;` line as-is. The stat cards keep showing platform-wide stats; only the grouped list below reacts to the week filter. The `now` const here is also reused by the existing `gameBuckets` IIFE — remove the inner `const now = new Date();` inside `gameBuckets` to avoid shadowing; see Step 3.)

- [ ] **Step 3: De-duplicate the `now` declaration in `gameBuckets`**

The `gameBuckets` IIFE (currently lines ~100-105) declares its own `const now = new Date();`. Replace that IIFE block with one that uses the outer `now`:

```tsx
  const gameBuckets = (() => {
    const out: Record<string, GameData[]> = { today: [], tomorrow: [], upcoming: [], past: [], unscheduled: [] };
    for (const g of games) out[bucketForCalendar(g.scheduledAt, now)].push(g);
    return out;
  })();
```

- [ ] **Step 4: Add the filter chip above the grouped list**

Immediately after the `<h1 ...>Games Tracker</h1>` element (currently line 111) and before the stat-cards grid `<div>`, insert:

```tsx
          {weekOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", borderRadius: 10, background: "rgba(230,57,70,0.10)", border: "1px solid rgba(230,57,70,0.3)", width: "fit-content" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fca5a5" }}>Showing open/full games scheduled within the last 7 days</span>
              <Link href="/admin/games" style={{ fontSize: 12, fontWeight: 700, color: "#fff", textDecoration: "none", lineHeight: 1 }} aria-label="Clear filter">✕</Link>
            </div>
          )}
```

- [ ] **Step 5: Add the Suspense-wrapped default export**

At the very end of the file, after the closing `}` of `AdminGamesInner`, add:

```tsx
export default function AdminGames() {
  return (
    <Suspense fallback={null}>
      <AdminGamesInner />
    </Suspense>
  );
}
```

- [ ] **Step 6: Typecheck and verify build-safety of the page**

Run: `npx tsc --noEmit`
Expected: no errors in `games/page.tsx` (no `now`/`games` redeclaration, imports resolve).

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/games/page.tsx
git commit -m "feat(admin): games page honors ?range=week with a filter chip"
```

---

### Task 6: Bookings category view — seed filters from URL + chip

**Files:**
- Modify: `src/components/admin/bookings/BookingsCategoryView.tsx`
- Modify: `src/app/admin/bookings/[category]/page.tsx` (Suspense boundary)

- [ ] **Step 1: Add imports to BookingsCategoryView**

At the top of `src/components/admin/bookings/BookingsCategoryView.tsx`, add:

```tsx
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { DatePreset } from "@/lib/adminBookings/types";
import { STATUS_LABELS } from "@/lib/adminBookings/status";
```

- [ ] **Step 2: Seed `status` and `date` initial state from the URL**

Inside `BookingsCategoryView`, replace the existing state declarations:

```tsx
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [tb, setTb] = useState<ToolbarState>({ q: "", date: "upcoming", from: "", to: "", sort: "upcoming", by: "session", group: "day" });
```

with URL-seeded versions:

```tsx
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const DATE_PRESETS = ["all", "today", "tomorrow", "upcoming", "past", "custom"];
  const initialDate = (DATE_PRESETS.includes(searchParams.get("date") ?? "") ? searchParams.get("date") : "upcoming") as DatePreset;

  const [status, setStatus] = useState(() => searchParams.get("status") ?? "all");
  const [page, setPage] = useState(1);
  const [tb, setTb] = useState<ToolbarState>(() => ({ q: "", date: initialDate, from: "", to: "", sort: "upcoming", by: "session", group: "day" }));
```

- [ ] **Step 3: Build the filter-chip descriptor and Clear handler**

Immediately after the state declarations (before the `params` `URLSearchParams` build), add:

```tsx
  const filterChips: string[] = [];
  if (status === "active") filterChips.push("Pending + Approved");
  else if (status !== "all") filterChips.push(STATUS_LABELS[status] ?? status);
  if (tb.date === "all") filterChips.push("All dates");

  const clearFilters = () => {
    setStatus("all");
    setTb(t => ({ ...t, date: "upcoming" }));
    setPage(1);
    router.replace(pathname);
  };
```

- [ ] **Step 4: Render the chip row under the page subtitle**

In the returned JSX, find the subtitle line
`<p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 18 }}>Showing {data?.total ?? 0} bookings</p>`
and insert immediately after it:

```tsx
      {filterChips.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Filtered:</span>
          {filterChips.map(c => (
            <span key={c} style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(230,57,70,0.12)", color: "#fca5a5", border: "1px solid rgba(230,57,70,0.3)" }}>{c}</span>
          ))}
          <button onClick={clearFilters} style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear</button>
        </div>
      )}
```

- [ ] **Step 5: Wrap the category view in a Suspense boundary**

In `src/app/admin/bookings/[category]/page.tsx`, add `Suspense` to the React import at the top:

```tsx
import { use, Suspense } from "react";
```

and wrap the `<BookingsCategoryView .../>` (currently line 20) in a boundary:

```tsx
        <Suspense fallback={null}>
          <BookingsCategoryView config={CATEGORY_CONFIGS[category as CategoryKey]} />
        </Suspense>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors — `status` is `string`, `initialDate` is `DatePreset`, `STATUS_LABELS`/`DatePreset` resolve.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/bookings/BookingsCategoryView.tsx src/app/admin/bookings/[category]/page.tsx
git commit -m "feat(admin): seed booking filters from URL and show a filter chip"
```

---

### Task 7: Full verification — types, tests, and the never-disagree invariant

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS, including the new `status.test.ts` and `adminGames.test.ts`.

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint the touched files**

Run: `npx next lint` (or the project's lint script if different)
Expected: no new errors in the changed files.

- [ ] **Step 4: Verify the invariant in the running app**

Start the dev server (`npm run dev`) and, signed in as admin, open `/admin`. For each filtered card, click it and confirm the destination list total equals the number on the card:

- **Active Bookings** → lands on `/admin/bookings/coaches?status=active`; chip shows "Pending + Approved"; "Showing N bookings" equals the card's Active Bookings number.
- **Games This Week** → lands on `/admin/games?range=week`; chip shows the 7-day message; the count of rows across the buckets equals the card's Games This Week number.
- **Camp Registrations** → `/admin/bookings/camps?date=all`; chip shows "All dates"; total equals the card number.
- **Workshop Sign-ups** → `/admin/bookings/workshops?date=all`; same check.
- **Total Users / Active Coaches / Revenue** → navigate to their pages (no chip).
- Confirm Cmd/Ctrl-click (and middle-click) on a card opens the destination in a new tab.

Per project memory, local authed admin APIs can return 500 under Upstash rate-limit placeholders; if a destination 500s locally, verify via Playwright with the admin API responses intercepted/mocked rather than treating it as a code defect.

- [ ] **Step 5: Production-build smoke (Suspense boundary check)**

Run: `npm run build`
Expected: build completes. Specifically, no "Missing Suspense boundary with useSearchParams" error for `/admin/games` or `/admin/bookings/[category]` (the Suspense wrappers from Tasks 5 & 6 prevent it).

- [ ] **Step 6: Final commit (if lint/build produced incidental fixes)**

```bash
git add -A
git commit -m "chore(admin): verify dashboard drill-down (types, tests, build)" || echo "nothing to commit"
```

---

## Self-review

**Spec coverage:**
- Card→destination map (all 7) → Task 4. ✓
- StatCard as real `<Link>` (Cmd/Ctrl-click, new tab) → Task 3, verified Task 7 Step 4. ✓
- Active Bookings = coach pending+approved, count-matching → Tasks 1 + 4. ✓
- Games `?range=week` matching the metric arithmetic → Tasks 2 + 5. ✓
- Camps/Workshops `date=all` to match all-registration counts → Tasks 4 + 6. ✓
- BookingsCategoryView seeds `status` AND `date` from URL → Task 6 Step 2. ✓
- Filter chip on every filtered destination (games + bookings) → Tasks 5 & 6; unfiltered pages (users/coaches/revenue) intentionally have none. ✓
- Suspense for `useSearchParams` in production build → Tasks 5 & 6, checked Task 7 Step 5. ✓
- Unit test for the games predicate → Task 2. ✓
- Never-disagree invariant verification → Task 7 Step 4. ✓

**Placeholder scan:** none — every code step contains complete code; commands have expected output.

**Type consistency:** `coachWhereForStatus(bucket: string)` (Task 1) is called with the string `status` state (Task 6). `isGameInMetricWeek(scheduledAt: string, status: string, now: Date)` (Task 2) is called with `g.scheduledAt`/`g.status` from `GameData` (Task 5). `StatCard` `href?: string` (Task 3) matches the string literals passed in Task 4. `ToolbarState.date: DatePreset` (existing) matches `initialDate as DatePreset` (Task 6). `STATUS_LABELS` and `DatePreset` are imported in Task 6 from their existing modules.
