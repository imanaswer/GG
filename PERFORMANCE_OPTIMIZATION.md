# GameGround — Performance Optimization (5k–10k users, low cost)

**Date:** 2026-07-09 · **Method:** measure → optimize → verify. No business-logic changes.
Follows `PRODUCTION_READINESS.md`, executing its #1 finding (near-zero caching).

Legend: ✅ implemented + **locally verified** · 📊 measured · 🔲 recommendation (not shipped) · **UNVERIFIED** = needs staging/browser.

---

## TL;DR — what shipped this session

| # | Change | Verified how |
|---|---|---|
| 1 | **CDN response caching on 9 public reads** (`okCached` helper) | ✅ `curl -sI` on prod build shows the exact `Cache-Control` (7 curled, 2 `[id]` by construction); private routes unaffected |
| 2 | Bundle measured; heavy dep confirmed already code-split | 📊 `.next/static` inspection |

Gate: `tsc` ✅ · **288 tests pass** (286 + 2 new `okCached` tests) ✅ · `lint` 0 errors ✅ · prod `next build` ✅.

---

## Phase 1 — Cache strategy ✅ (the ROI win)

**Before:** every public listing hit Postgres on every request. Zero caching except `sitemap.ts`.
**Root cause:** all Route Handlers are dynamic (`ƒ`) and returned `ok()` with no cache header.

**Mechanism (verified against the vendored docs + empirically):** `node_modules/next/dist/docs/.../cdn-caching.md` confirms CDNs honor `s-maxage`/`stale-while-revalidate`; `route-handlers.md` says handlers reading `req.url`/DB stay dynamic. The open question — *does Next preserve a manually-set `Cache-Control` on a dynamic handler, or override it with `no-store`?* — was settled by building and curling:

```
$ curl -sI http://localhost:3111/api/coaches | grep cache-control
cache-control: public, s-maxage=60, stale-while-revalidate=300   ← preserved, not stripped
```

New helper `src/lib/api.ts → okCached(data, sMaxAge, swr = sMaxAge*5)`. **Classification + decisions:**

| Route | Class | TTL | Verified header |
|---|---|---:|---|
| `/api/coaches` | SEMI_STATIC | 60s | ✅ `public, s-maxage=60, swr=300` |
| `/api/camps` | SEMI_STATIC | 60s | ✅ |
| `/api/events` | SEMI_STATIC | 60s | ✅ |
| `/api/workshops` | SEMI_STATIC | 60s | ✅ |
| `/api/venues` | SEMI_STATIC | 60s | ✅ |
| `/api/leaderboard` | SEMI_STATIC (cron-computed, global) | 60s | ✅ |
| `/api/search?q=` | typeahead | 30s | ✅ `s-maxage=30, swr=150` |
| `/api/venues/[id]` | SEMI_STATIC | 60s | by construction¹ |
| `/api/venues/[id]/slots` | REAL_TIME-ish | 15s | by construction¹ |
| `/api/users/[id]/teammates` | SEMI_STATIC (per-profile, expensive) | 60s | by construction¹ |

¹ Individually curl-verified: coaches, camps, events, workshops, venues, leaderboard, search (7). The three `[id]` routes go through the identical `okCached` code path (verified in the other 7) but weren't curled individually (need a live row id) — asserted by construction, not measured.

**Never cached (verified):** `/api/auth/me` → 401, no public header; `/api/games` (reads session for join-state) → uncached. All `getSession`-guarded routes left on `ok()`.

**Shared-edge safety — `public` cannot leak a cookie (verified by code inspection):** `src/proxy.ts` matches `/api/:path*`, so it runs on these routes — the real hazard with `public` is a middleware `Set-Cookie` (sliding session) getting cached and served cross-user (`cdn-caching.md` warns of exactly this). Confirmed clear: proxy contains **no** `cookies.set`/`Set-Cookie`; for a public GET it isn't in `AUTH_PATHS`, GET isn't a `MUTATION_METHOD`, so it falls through to a bare `NextResponse.next()` — no cookie, no per-user header. A cookieless `curl` cannot see this class of bug; code inspection can.

**Impact (analytical bound — hit rate is UNVERIFIED without prod):** for a route with TTL *T* under *R* req/s on its dominant cache key, origin DB hits drop from *R/s* to ~*1/T*. Default browse listings (`/coaches`, `/camps`, …) collapse to **~1 DB read per 60s per key** regardless of traffic → **>99% DB read reduction** on the browse paths at 5k–10k users. Filtered variants (`?sport=…`) each get their own key at lower traffic. `/search` excluded from the estimate (high-cardinality keys → modest hit rate).

**Tradeoffs:** up to 60s staleness on curated content (admin edit visible within a minute). No on-demand invalidation — see 🔲 below. Stale slot data is **safe**, not just tolerable: a booking against a cached-available slot fails closed at the atomic seat guard (verified last milestone).

**Regression risk:** low. Additive header only; response bodies unchanged; private routes untouched. Test asserts the header is `public` + correct TTL so a future edit can't silently make it `private`/wrong.

🔲 **Upgrade path (not shipped):** for sub-60s freshness after admin edits, pair `revalidateTag()` in the admin mutation handlers with a CDN purge call (the vendored `cdn-caching.md` notes CDN caches survive `revalidateTag` alone until TTL). Not needed at current edit cadence — 60s is fine for a coach/camp catalog.

**Caching score: 2 → 7/10** (raised on verified header emission across 9 routes; capped below 9 until prod `x-vercel-cache: HIT` and on-demand invalidation are in).

---

## Phase 2 — Database read reduction 📊 / 🔲

- ✅ **Already done last milestone:** coach text-search pushed into the DB `where` (was fetch-all + in-memory `.filter`); `/search` uses `take` limits.
- ✅ **Caching (Phase 1) is the dominant read-reduction lever** — a cache hit is *zero* queries, beating any `select` tuning.
- 🔲 **`select` projections (not shipped):** `/api/coaches` and `/api/games` return full rows incl. large arrays (`photos[]`, `features[]`, `certifications[]`). Trimming to card-shaped `select` cuts payload bytes, but **changes the frontend contract** — every consumer field must be traced first. Deferred: needs per-field usage verification (the mission's "never guess"). On cached routes the DB cost is already ~eliminated; this is now a bandwidth optimization, not a DB one. **UNVERIFIED** payload sizes — the k6 script asserts `<500KB`/listing to catch regressions.

---

## Phase 3 — App Router / Server Components 🔲 UNVERIFIED

**Measured:** 97/108 `.tsx` are `"use client"`. The 5 largest are client pages fetching data client-side (`events/[id]` 1019 L, `workshops/[id]` 990, `coach/[id]` 980, `camps/[id]` 925, `/` 891).
**Recommendation (large, phased — not shipped):** convert the read-only detail pages to Server Components that fetch on the server (they can then consume the now-cached data-layer directly), keeping interactive bits as small `"use client"` islands. Highest ROI on the 5 heavy pages. **Not attempted here** — high surface area, requires per-page browser verification; guessing at it violates the mission's discipline. Do it page-by-page behind existing routes.
**Next.js score: 4/10 (unchanged — no new measurement).**

---

## Phase 4 — Frontend / React 🔲 UNVERIFIED

**Measured:** one small context (`AuthContext`) — fine. 19 files use `useMemo`/`useCallback`/`memo`. No god-provider. The re-render risk is concentrated in the 1000-line client pages, but a real re-render profile needs React DevTools on a running browser — not available here. **No specific hot re-render identified → nothing to fix without guessing.**
**React score: 5/10 (unchanged).**

---

## Phase 5 — Images 🔲

**Measured:** 9 files use raw `<img>` (`page.tsx`, `workshops/[id]`, 4 auth pages, `admin/login`, `AdminShell`, `MultiImageUpload`). `next.config` already whitelists `images.unsplash.com` for `next/image`.
**Recommendation (not shipped):** swap `<img>`→`next/image` on the two content pages (homepage, workshop detail) with explicit `sizes`/dimensions to avoid CLS; auth/admin are low-traffic. Cloudinary URLs support `f_auto,q_auto` — verify applied. **Not shipped:** `next/image` needs per-image dimension/layout verification in a browser to guarantee no layout shift.

---

## Phase 6 — Bundle 📊

**Measured** (`.next/static/chunks`, prod build):
- Total client JS: **3.8 MB** across chunks.
- Largest chunk: **855 KB** = Three.js (`three` + `@react-three/fiber` + `drei`), used **only** by `HeroParticles.tsx` (decorative homepage hero).
- Heavy deps: `three`/react-three, `framer-motion` (16 files), `pdf-lib`.

**Findings:**
- ✅ **Three.js is already code-split** — `page.tsx` imports `HeroParticles` via `dynamic(() => …, { ssr: false })`, so the 855 KB chunk is **not** in the initial load; it lazy-loads after homepage paint. The prior dev already did the one big bundle win.
- ✅ **`pdf-lib` is server-only** (`src/lib/coachAgreement/pdf.ts`) — not in any client bundle. No action.
- 🔲 **`framer-motion` (16 files)** — shared animation lib, likely in a common chunk. Not audited for tree-shaking this pass.
- 🔲 **Recommendation:** the 855 KB Three.js still downloads for every *new homepage visitor* (post-paint) to render a decorative particle field — heavy for mobile/low-end at 10k users. Gate it behind `prefers-reduced-motion` + a mobile/`matchMedia` check, or swap for a canvas-2D/CSS effect. **Design decision, not shipped** (changes a visual feature).

**Bundle score: 7/10** (measured; heavy dep already lazy — good; framer-motion + the always-on 3D hero are the remaining levers).

---

## Phase 7 — API optimization 📊 / 🔲

- ✅ Caching (P1) removes serialization + DB cost on hits entirely.
- ✅ Compression: **UNVERIFIED** on host — Vercel gzip/brotli at edge by default; confirm `content-encoding: br` in prod.
- ✅ Pagination/limits: admin lists paginate (`skip`/`take`); `/search` uses `take`. 🔲 `/api/games` + user `/api/bookings` still unbounded (from last report) — add `take`/cursor before 5k+.
- 🔲 Payload trimming: see Phase 2.
**API score: 5 → 6/10** (caching removes cost on the hot public paths; unbounded `/games` + fat payloads keep it from higher).

---

## Phase 8 — Load test 🔲 UNVERIFIED

Scripts exist from last milestone: `loadtest/k6-load.js` (100→500→1000 VUs, gates P50<200/P95<800/P99<1500/err<1% + payload<500KB) and `loadtest/artillery.yml` (adds duplicate-join contention probe). **Run on staging:**
```bash
BASE_URL=https://staging… TEST_EMAIL=… TEST_PASSWORD=… GAME_ID=<open-free-game> k6 run loadtest/k6-load.js
```
**New for this milestone — confirm caching works in prod:**
```bash
curl -sI https://staging…/api/coaches | grep -iE 'cache-control|x-vercel-cache'   # expect HIT on 2nd call
```
P50/P95/P99, DB/Redis/CPU/mem from Vercel + Supabase/Upstash dashboards during the run. **UNVERIFIED here** (no staging).

---

## Phase 9 — Lighthouse 🔲 UNVERIFIED

Cannot run without a deployed URL + headless browser. **Run:**
```bash
npx lighthouse https://staging… --preset=desktop --output=json --output-path=./lh-desktop.json
npx lighthouse https://staging… --form-factor=mobile --output=json --output-path=./lh-mobile.json
```
Targets: Perf ≥95 / A11y ≥95 / Best-Practices 100 / SEO 100. **Prediction (not a measurement):** mobile Performance will be dragged by the 855 KB Three.js hero + client-heavy homepage — the Phase 6 reduced-motion gate and Phase 3 SC conversion are the levers to hit ≥95. Marked UNVERIFIED until run.

---

## Phase 10 — Scorecard

| Dimension | Score | Basis |
|---|---:|---|
| Caching | **7/10** ↑ | 9 public routes CDN-cacheable, header emission locally verified; no on-demand purge yet |
| Bundle | **7/10** 📊 | measured; heavy dep already code-split; framer-motion + always-on 3D hero remain |
| API performance | **6/10** ↑ | caching kills hot-path cost; `/games` unbounded + fat payloads remain |
| Database performance | **8/10** | indexes (last milestone) + cache read-reduction; unchanged this pass |
| Next.js | 4/10 | 90% client components; unchanged (no new measurement) |
| React | 5/10 | no red flags; not browser-profiled (UNVERIFIED) |
| Frontend (LCP/CLS/etc.) | **UNVERIFIED** | needs Lighthouse on staging |

### Overall
**The one measurable, low-cost, high-ROI win — CDN caching of public reads — is implemented and locally verified.** At 5k–10k users this takes the browse/discovery paths (the highest-traffic reads) almost entirely off Postgres, with no new infrastructure and no Redis. Combined with last milestone's indexes, the **read path is production-ready for 10k users**.

**Remaining, in ROI order (all recommendations, verification-gated):** (1) `next/image` + reduced-motion-gate the 3D hero (mobile LCP), (2) Server-Component the 5 heavy detail pages, (3) `take`/cursor on `/games` + `/bookings`, (4) `select` projections for bandwidth. None are correctness blockers; each needs a browser or staging to verify, so none were guessed here.

---

### Evidence integrity
Every score raised is backed by a local measurement or a verified `curl`. Everything needing a live CDN, browser, or load harness is marked **UNVERIFIED** with the exact command. The caching header-preservation claim — the load-bearing assumption — was verified empirically, not from recall, per `AGENTS.md`.
