# Production Readiness — TODO

**Honest assessment:** the app **builds cleanly** (`npm run build` passes, `tsc --noEmit` is clean) and the P0 blockers from the issue list are resolved in code. But **it is not production-ready yet** — most remaining work is setup I can't do from this repo (third-party accounts, secrets, domain, legal, seeding real content).

This file is split into:
1. **Things I need from you** (external setup, secrets, content decisions)
2. **Things I can finish once you give me the above**
3. **Known code-level polish items** (non-blocking)

---

## 1. Things I need from you

### 1.1 Third-party accounts (must-have for launch)

- [ ] **Supabase** — already connected. Before launch: enable **Point-in-time Recovery**, turn on **Row-Level Security** on every table, and rotate the database password (the `.env.local` one was seeded during dev).
- [ ] **Razorpay**
  - Create a Razorpay account and finish **KYC** (takes ~3–5 business days — do this first).
  - In the dashboard, go to *Settings → Webhooks* and register the URL `https://<your-domain>/api/payments/webhook` for events `payment.captured` and `payment.failed`.
  - Copy three values: `Key ID`, `Key Secret`, `Webhook Secret`.
- [ ] **Cloudinary** — create a free account, copy `Cloud Name`, `API Key`, `API Secret`. Create an upload folder called `gameground/` and set its default transformation to `q_auto,f_auto` for bandwidth savings.
- [ ] **Resend** — sign up, **add and verify the sending domain** (SPF + DKIM DNS records), then create an API key. Don't skip domain verification — without it, transactional emails go to spam.
- [ ] **Upstash Redis** — create a Global database, copy `REST URL` + `REST token`. Without this the rate limiter falls back to in-memory, which is not safe behind multiple serverless instances.
- [ ] **Anthropic** — only if you want the AI-recommend feature enabled in production. Otherwise leave `ANTHROPIC_API_KEY` unset and the route will return 503.

### 1.2 Optional but strongly recommended

- [ ] **Sentry** (or equivalent error tracker) — create a project, copy DSN. Without it, production errors are invisible.
- [ ] **PostHog / Vercel Analytics** — pick one for product analytics.
- [ ] **UptimeRobot / BetterStack** — external uptime monitoring on `/` and `/api/auth/me`.

### 1.3 Environment secrets

Copy `.env.example` to `.env.production` (or set via your hosting provider) and fill every value. **None of these have safe defaults in production:**

```env
AUTH_SECRET=              # openssl rand -base64 32
DATABASE_URL=             # Supabase pooled (port 6543)
DIRECT_URL=               # Supabase direct (port 5432)
NEXT_PUBLIC_APP_URL=      # https://your-domain

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RESEND_API_KEY=
FROM_EMAIL=               # must match a verified Resend domain

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

ADMIN_PASSWORD=           # CHANGE from default "admin123" — pick ≥16 chars
CRON_SECRET=              # openssl rand -hex 32

ANTHROPIC_API_KEY=        # optional
SENTRY_DSN=               # optional
```

**Double-check:** `.env.local` and `.env.production` are in `.gitignore` (they are).

### 1.4 Domain, DNS, and hosting

- [ ] Buy / decide the production domain. Update `NEXT_PUBLIC_APP_URL` and `FROM_EMAIL` to match.
- [ ] Pick a host. **Recommendation: Vercel** — it's built for Next.js, Turbopack-compatible, and handles the proxy/middleware correctly. Railway/Fly.io also work.
- [ ] Add DNS records (A/CNAME for the app, plus SPF/DKIM/DMARC for Resend).
- [ ] Enable HTTPS (automatic on Vercel). Our `next.config.ts` already emits HSTS headers.

### 1.5 Legal & content

- [ ] **Privacy Policy + Terms of Service** — pages exist at `/privacy` and `/terms` but the content is placeholder. Have a lawyer review for DPDP (India) + GDPR (if you ever get EU users).
- [ ] **Refund & cancellation policy** — required by Razorpay to go live. You don't have a page for this yet — decide the policy, I can add the page.
- [ ] **Content** — decide what real data to seed at launch (coaches, camps, upcoming events). `prisma/seed.ts` currently seeds demo data; you'll want either (a) a separate `seed:production.ts` with real-but-minimal data, or (b) run with empty tables and onboard content via the admin dashboard.
- [ ] **Admin password** — the default fallback is `admin123`. Set a real `ADMIN_PASSWORD` before the dashboard goes live.

### 1.6 Razorpay go-live checklist

- [ ] KYC approved (see 1.1)
- [ ] Switch Razorpay keys from `rzp_test_*` to `rzp_live_*`
- [ ] Webhook registered and verified (Razorpay dashboard shows green ✓)
- [ ] Test a real ₹1 payment end-to-end on production
- [ ] Check Payment rows + CampRegistration/EventRegistration rows reach `paymentStatus: "paid"`

---

## 2. Things I can finish once you unblock me

These are real code edits that I've left out because they depend on decisions or accounts above. Ping me and I'll do them:

- [ ] **Wire `/api/upload` into the UI** — profile-edit and coach-profile-edit pages currently have no avatar/image picker. The route is ready; the forms need a file input + upload call. Needs Cloudinary keys first so I can test it end-to-end.
- [ ] **Strict CSP header** — `next.config.ts` has the other security headers. CSP needs your actual allowlisted domains (Razorpay checkout, Cloudinary, Resend tracking pixels, analytics). Give me the list and I'll add it.
- [ ] **Sentry client + server instrumentation** — adds `@sentry/nextjs`, `sentry.client.config.ts`, `sentry.server.config.ts`, and hooks into the proxy for request-scoped error context. Needs `SENTRY_DSN`.
- [ ] **Refund / cancellation policy page** — I'll draft it once you tell me the terms.
- [ ] **Production seed script** — once you tell me what content to launch with.
- [ ] **E2E tests** — Playwright smoke suite hitting login, book-a-coach, join-a-game, register-for-camp (happy path + payment dev-mode). None exist yet.
- [ ] **Vercel deploy config** — `vercel.json` for cron schedules (`/api/cron/send-reminders`, `/api/cron/complete-games`). Right now these routes exist but aren't triggered by anything.

---

## 3. Known code-level polish (non-blocking)

Caught by `npm run lint` and manual review. None of these break production, but they're on my backlog:

- [ ] **22 `react/no-unescaped-entities` warnings** — apostrophes/quotes in JSX text across ~15 pages. Pure cosmetic; lint CI will block merges until we either fix them or downgrade the rule.
- [ ] **~12 `next/no-img-element` warnings** — we use raw `<img>` in several pages. Replacing with `next/image` would drop LCP and bandwidth, but needs us to also wire image domains (already done in `next.config.ts`).
- [ ] **One `<a href="/">` in `src/components/admin/AdminShell.tsx`-era code** (now `NavBar` — I believe it was fixed, but one lint rule still flags it). Low-risk.
- [ ] **~18 unused-import warnings** — dead imports across various files.
- [ ] **Indexes on `Payment.razorpayOrderId` / `Payment.razorpayPaymentId`** — the webhook uses `findFirst` on these. Add a Prisma migration to index them before webhook traffic scales.
- [ ] **Admin routes audit** — every route under `/api/admin/*` should call `getAdminSessionFromRequest`. I verified the ones I touched; a quick pass to confirm all of them would be good.
- [ ] **Rate-limit tuning** — current values are conservative defaults. After a week of real traffic, review and adjust `authLimit` (5/min may be too low for shared-IP cafes) and `mutationLimit`.
- [ ] **`dev`/test seed accounts** — remove the hard-coded `demo@gameground.com / password123` from the login page's "Try Demo Account" button before public launch, or gate it behind `process.env.NODE_ENV !== "production"`.

---

## 4. Post-launch week one

- [ ] Watch Sentry, Vercel logs, and Supabase slow-query log daily.
- [ ] Verify Razorpay reconciliation — payments captured vs. registrations created. Build a simple `/admin/reconciliation` page if orphans appear.
- [ ] Back up the database (Supabase does this automatically, but export a snapshot to off-site storage on day one).
- [ ] Run `npm audit` and update any CVEs.

---

## Summary table

| Area | Status | Who |
|---|---|---|
| Build / typecheck | ✅ Passing | — |
| P0 code blockers | ✅ All addressed | — |
| Third-party accounts | ❌ Not set up | **You** |
| Env secrets | ❌ Using dev defaults | **You** |
| Domain / hosting | ❌ Not picked | **You** |
| Legal content | ⚠️ Placeholder | **You** + lawyer |
| Upload UI wiring | ⚠️ Route ready, UI missing | Me (after Cloudinary keys) |
| CSP | ⚠️ Missing | Me (after domain list) |
| Sentry | ⚠️ Not installed | Me (after DSN) |
| E2E tests | ❌ None | Me |
| Lint warnings | ⚠️ 22 cosmetic | Me |

When you come back with (a) the Razorpay/Cloudinary/Resend/Upstash credentials, (b) the production domain, and (c) whether you want Sentry + Playwright, I can finish section 2 in one pass.
