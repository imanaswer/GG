# GameGround — Production Performance & Scalability Audit

**Date:** 2026-07-09 · **Scope:** performance, scalability, DB integrity, reliability. No business-logic changes except where required for correctness.
**Target:** safely serve 100 → 10,000 users without degradation or corruption.

Legend: 🟥 Critical · 🟧 High · 🟨 Medium · 🟦 Low · ✅ already sound · **UNVERIFIED** = needs staging/runtime to confirm.

---

## What changed in this pass (shipped)

| Change | File | Why |
|---|---|---|
| 9 new indexes on user-growth tables | `prisma/migrations/20260709030000_scale_fk_indexes/` + `schema.prisma` | FK/filter columns were sequential scans; Prisma doesn't auto-index scalar FKs |
| Coach search pushed into DB `where` | `src/app/api/coaches/route.ts:24` | was `findMany()` → **fetch every coach** → `.filter()` in Node |
| k6 + Artillery load scripts | `loadtest/` | Phase 11 deliverable (results UNVERIFIED until run on staging) |

Verified: `prisma validate` ✅ · `prisma migrate diff` confirms the 9 index DDLs match the generator byte-for-byte ✅ · `tsc --noEmit` ✅ · 286 tests pass ✅.

---

## Phase 1 — Database audit

**Overall the schema is already strong**: unique constraints for dedupe (`@@unique([campId,userId])` etc.), composite indexes on hot list paths (`[scheduledAt,status]`, `[gameId,status,joinedAt]`), sort-aware indexes, `razorpayPaymentId @unique` replay guard, `PaymentOrder` ledger. The gap was **scalar foreign-key columns and user-scoped filters with no index** — Prisma does not auto-index these, so they were seq scans that get linearly slower as rows accumulate.

### 🟧 Missing indexes on tables that grow with users — **FIXED**

Each was verified against a real query before adding (no speculative indexes):

| Index added | Driving query | File:line |
|---|---|---|
| `Game(venueId)` | count LIVE games at a venue (archival guard) | `admin/venues/[id]/route.ts:57` |
| `WaitlistEntry(gameId)` | waitlist find/count/delete | `games/[id]/route.ts:98-101` |
| `Booking(userId)` | "my bookings" | `bookings/route.ts:34` |
| `Booking(coachId)` | coach's bookings / review-eligibility | `bookings/route.ts:21`, `coaches/[id]/route.ts:23` |
| `Review(coachId, createdAt DESC)` | coach detail review list + `aggregate` | `coaches/[id]/route.ts:15`, `coaches/[id]/reviews/route.ts:42` |
| `CampRegistration(userId, registeredAt DESC)` | "my camps" + reputation counts | `users/[id]/route.ts:56`, `reputationService.ts:37` |
| `EventRegistration(userId, registeredAt DESC)` | "my events" | `users/[id]/route.ts:57` |
| `WorkshopRegistration(userId, registeredAt DESC)` | "my workshops" | `users/[id]/route.ts:58` |
| `Payment(userId, createdAt DESC)` | "my payment history" | `payments/history/route.ts:10` |

**Root cause:** the unique/composite indexes on the registration models all *lead* with the entity id (`campId`/`eventId`/`workshopId`), so a `WHERE userId = ?` predicate could not use them. Same for `Review` — `@@unique([userId,coachId])` leads with `userId`, so `WHERE coachId` (the coach-detail list) fell back to a seq scan.
**Perf impact:** at 1k+ users each of these was O(rows) per request. **Scalability impact:** the user profile page and coach detail page were the two worst offenders (multiple such queries each). **Regression risk:** none — additive indexes, no query/logic change.

### 🟦 Deliberately NOT indexed
`Coach.sport`, `Coach.status`, `Batch.coachId` — coaches are curated admin content bounded to dozens of rows; indexing a 50-row table is wasted write cost and maintenance. Add only if the coach catalog ever grows into the thousands.

### ✅ Constraints, cascades, timestamps
- Cascade deletes correct where intended (`VenueSlot`, `EventUpdate`, `CoachSigningToken`, audit logs). Other relations use default `Restrict` — appropriate (don't want a user delete to orphan payments).
- Soft delete via `User.deletedAt` — present. **UNVERIFIED**: confirm every user-listing query filters `deletedAt: null` (not audited exhaustively this pass).
- `updatedAt @updatedAt` present on mutable models. Timestamps consistent.

### 🟦 JSON columns
`Camp.coaches/dailySchedule/testimonials`, `SportEvent.schedule`, `Workshop.sessions/instructor/testimonials` are `Json`. Fine — read-with-parent, never queried by content. No action.

### 🟨 Large denormalized text/array columns
`Coach` carries `photos[]`, `features[]`, `certifications[]`, `description`, two image URLs. The listing endpoint returns **all** of them for every card (see Phase 8). Not a schema bug — a `select` gap in the query.

**Database score: 8/10** (was ~6.5 before this pass — good constraints/transactions all along; the FK-index gap was the one real hole).

---

## Phase 2 — Query optimization

### 🟧 Unbounded `findMany` — 76 of 81 have no `take:`
The table below applies the only lens that matters: **does this table grow with user count?**

| Endpoint | Table | Grows w/ users? | Verdict |
|---|---|---|---|
| `/api/games` | Game | **yes** | 🟧 needs pagination/cursor before 1k users |
| `/api/bookings`, admin bookings | Booking/Registration | **yes** | 🟧 admin lists already paginate (`skip`/`take`) ✅; user-facing `bookings/route.ts` does not |
| `users/[id]` activity, payments | Registration/Payment | **yes** | 🟨 bounded per-user in practice, but add `take` for safety |
| `/api/coaches`, `/api/venues`, `/api/camps`, `/api/workshops`, `/api/events` | curated content | no (dozens) | 🟦 pagination here would be speculative — leave |

**Recommendation (not shipped — needs product decision on cursor vs. page):** add `take: 50` + cursor to `/api/games` and `/api/bookings`. These are the only two read paths that grow unbounded with real traffic.

### 🟧 In-memory filtering — **FIXED (coaches)**
`coaches/route.ts` fetched **every** coach then `.filter()`'d the text query in Node. Now pushed into `where: { OR: [{ name: { contains } }, …] }`. **UNVERIFIED**: grep for the same pattern (`.filter(` after a `findMany`) elsewhere was not exhaustive — one confirmed and fixed.

### ✅ N+1
Spot-checked hot paths (`/api/games`, admin bookings, `users/[id]`) — all use `include`/`select` with `_count`, no per-row query loops. No N+1 found in audited routes.

### 🟨 `select` gaps → oversized payloads
`/api/coaches` and `/api/games` return full rows including large arrays. See Phase 8 — trim with `select` to card-shaped projections. Business-logic-safe but touches the frontend contract, so deferred to a UI-verified change.

**Performance score: 5/10** — good query *shapes*, but unbounded result sets + zero caching cap throughput.

---

## Phase 3 — Database consistency ✅

**This is the strongest area.** 15 files use `$transaction`; 10 use conditional atomic updates (`updateMany({ where: { …, slotsLeft: { gt: 0 } } })`) — the correct lock-free pattern for seat/slot claims. Combined with the `@@unique` dedupe constraints and the `razorpayPaymentId @unique` + `PaymentOrder` ledger, the concurrency story is sound:

- **Seat/slot counts:** conditional atomic decrement — a concurrent double-join fails closed (0 rows updated → rejected), no oversell. ✅
- **Duplicate registration:** DB `@@unique` → P2002 on concurrent double-submit. ✅
- **Payment replay:** `razorpayPaymentId @unique` (per-payment) + `PaymentOrder` binding (cross-entity). ✅

**No action required.** **UNVERIFIED**: confirm under real concurrency via the Artillery `duplicate-join` scenario (expect one 200, one 409 — never two seats).

**(consistency is folded into the DB score above.)**

---

## Phase 4 — Caching 🟧 (biggest untapped win)

**Near-zero caching exists** — only `sitemap.ts` sets `revalidate`. Every public listing (`/api/games`, `/coaches`, `/events`, `/camps`, `/workshops`) hits Postgres on **every** request. At 10k users browsing, this is the DB bottleneck, not the queries themselves.

**Recommended (lazy → correct order):**
1. **Curated content** (coaches, camps, workshops, events, venues) changes rarely → `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on the route responses, or Next.js `unstable_cache` with tag revalidation on admin mutation. Cuts DB reads on these paths by ~99%. **No Redis needed.**
2. **Games** (`scheduledAt`/`slotsLeft` change often) → short `s-maxage=10, stale-while-revalidate=30`. Stale seat counts self-correct on the join attempt (conditional atomic update rejects a full join), so brief staleness is safe.
3. **Redis (Upstash — already wired for rate limiting):** only if you outgrow CDN caching — e.g. a computed leaderboard/analytics that's expensive to recompute. Not needed for 100–1000 users.

**Do NOT cache:** anything user-scoped (`/api/auth/me`, `bookings`, `users/[id]`) or payment paths.

**Caching score: 2/10** — the single highest-leverage improvement remaining.

---

## Phase 5 — Next.js performance 🟧

**Evidence:** 97 of 108 `.tsx` files are `"use client"` (~90%). The four detail pages (`events/[id]` 1019 lines, `workshops/[id]` 990, `coach/[id]` 980, `camps/[id]` 925) and the homepage (891) are all client components fetching data client-side.

**Impact:** almost no Server Components / server data fetching / streaming. Each page ships its full JS bundle and data-fetches after hydration → slow TTFB-to-content, no SSR SEO for detail pages, large client bundles.
**Root cause:** app was built client-first (likely CRA-style habits carried into App Router).
**Fix (large, phased — recommendation only):** convert the read-only detail pages to Server Components that fetch on the server and pass data down; keep interactive islands (`"use client"`) small. Highest ROI on the 5 largest pages.
**Regression risk of the refactor:** high surface area — do it page-by-page behind the existing routes, verify each in the browser.

**Next.js score: 4/10** — architecture works but leaves most of the framework's performance on the table. **Deep per-route audit UNVERIFIED.**

---

## Phase 6 — React performance 🟨 UNVERIFIED

**Evidence gathered:** one small context (`AuthContext`) — not a god-provider, fine. 19 files use `useMemo`/`useCallback`/`memo` — reasonable. The 1000-line client pages are the re-render risk (large components with many `useState`), but a real re-render profile requires React DevTools on staging.
**Recommendation:** profile the 5 largest pages under interaction; split them into sections and memoize list rows. Not fixed this pass — no evidence of a *specific* hot re-render, and guessing would violate "do not guess."

**React score: 5/10 (UNVERIFIED)** — no red flags found, but not deep-profiled.

---

## Phase 7 — Media optimization 🟨

**9 files use raw `<img>`** instead of `next/image` (list: `page.tsx`, `workshops/[id]`, `admin/login`, all 4 auth pages, `AdminShell`, `MultiImageUpload`). `next.config` already whitelists `images.unsplash.com` (and presumably Cloudinary), so `next/image` is configured — just underused.
**Fix:** swap `<img>` → `next/image` with `sizes`/`fill` on the content pages (homepage, workshop detail). Auth/admin pages are low-traffic — lower priority. Cloudinary URLs already support `f_auto,q_auto` transforms; verify they're applied.
**Regression risk:** low — `next/image` needs explicit dimensions; test layout per swap.

**Media score: 5/10.**

---

## Phase 8 — API performance 🟨

- **Payload size:** `/api/coaches` and `/api/games` return full rows (large arrays, descriptions) for list views. Add card-shaped `select`. **UNVERIFIED** actual byte sizes — the k6 script asserts `< 500KB` per listing to catch this at load.
- **Compression:** Vercel gzips/brotlis responses at the edge by default. **UNVERIFIED** on the actual host — confirm `content-encoding: br` in prod response headers.
- **Rate limiting:** 7 route files gated (auth, upload, sensitive writes) via Upstash. Public GETs are unprotected but idempotent — CDN caching (Phase 4) is the right defense there, not per-IP limits.
- **Filtering/sorting/search:** now DB-side for coaches; other listings already filter in `where`.

**API efficiency score: 5/10** — correct shapes, but oversized list payloads and no response caching.

---

## Phase 9 — Memory / leaks ✅

- **Prisma:** single pooled client via `globalThis` singleton, `Pool({ max: 1 })` per serverless instance — correct pattern, no connection leak, no per-request client creation. ✅
- **No** module-level growing caches, `setInterval`, or unremoved listeners found in `src/lib`. ✅
- **Client:** `useEffect` cleanup not audited exhaustively — **UNVERIFIED**, but no global timers/subscriptions spotted.

**No action required.**

---

## Phase 10 — Scalability

| Concern | Status |
|---|---|
| Connection pooling | ✅ `max: 1` + pgbouncer (`DATABASE_URL`) + `DIRECT_URL` for migrations — textbook serverless setup |
| Stateless APIs | ✅ JWT cookie sessions, no server-side session store → horizontally scalable, no sticky sessions needed |
| Horizontal scaling | ✅ Vercel functions scale automatically given the above |
| Redis strategy | 🟦 Upstash present for rate limiting; extend to caching only if CDN caching proves insufficient |
| Background jobs / queues | 🟨 none. Reputation/tier recompute and (future) email/notification sends run inline. Fine to ~1k users; move to a queue (or cron) when a mutation fans out to heavy work |

**Verdict by tier:**
- **100–500 users:** ready as-is. ✅
- **1,000 users:** add Phase 4 caching on listings — otherwise DB read pressure on the homepage/browse paths becomes the ceiling.
- **5,000–10,000 users:** caching (P4) + pagination on `/api/games` & `/api/bookings` (P2) + convert the 5 heavy pages to Server Components (P5). None are blockers below this tier.

**Scalability score: 6/10** — infra pattern is right; missing caching + pagination cap the top end.

---

## Phase 11 — Load test plan (delivered, results UNVERIFIED)

`loadtest/k6-load.js` — ramps 100→500→1000 VUs across the 5 public listings; thresholds gate P50<200ms / P95<800ms / P99<1500ms / error<1% and flag any listing payload >500KB. Optional authed `joinGame` scenario.
`loadtest/artillery.yml` — same ramp plus a **duplicate-join** scenario firing the same join twice per VU to prove the seat/dedupe guards hold under contention (expect one 200, one 409/402).

**To run (needs seeded staging + a test user):**
```bash
BASE_URL=https://staging… TEST_EMAIL=… TEST_PASSWORD=… GAME_ID=<open-free-game> k6 run loadtest/k6-load.js
BASE_URL=https://staging… TEST_EMAIL=… TEST_PASSWORD=… GAME_ID=<open-free-game> artillery run loadtest/artillery.yml
```
Metrics captured: P50/P95/P99, error rate, payload size. DB/Redis/CPU/memory to be read from the Vercel + Supabase/Upstash dashboards during the run.

---

## Phase 12 — Scorecard

| Dimension | Score | Basis |
|---|---:|---|
| **Database** | 8/10 | strong constraints/transactions; FK-index gap fixed this pass |
| **Performance** | 5/10 | good query shapes; unbounded result sets + no caching |
| **Scalability** | 6/10 | correct pooling/stateless; missing caching + pagination |
| **Next.js** | 4/10 | ~90% client components; SSR/streaming unused |
| **React** | 5/10 | no red flags; large pages, not deep-profiled (UNVERIFIED) |
| **API efficiency** | 5/10 | DB-side filtering; oversized list payloads, no response cache |

### Overall production readiness
- **Ship-ready for 100–500 users today.** The security/integrity foundation (transactions, unique constraints, atomic seat claims, payment guards) is genuinely solid.
- **For 1,000+**, do these in order of ROI: **(1) response caching on public listings** (biggest win, no new infra), **(2) pagination on `/api/games` + `/api/bookings`**, **(3) `select` projections to shrink list payloads**, **(4) Server-Component conversion of the 5 heavy pages**.

**Nothing above 500 users is blocked by a correctness bug — only by throughput ceilings that caching and pagination lift.**

---

### Evidence integrity
Shipped changes are verified (`prisma validate`, `migrate diff` byte-match, `tsc`). Everything requiring a running DB, browser, or load harness is marked **UNVERIFIED** with the exact command to confirm it. No scores were raised without a change or evidence behind them.
