# GameGround — Operations Manual

**Audience:** any engineer taking over operations, no prior context. This is the reference; `RUNBOOK.md` is the quick-diagnostic companion.

## 1. Architecture
- **Frontend + API:** single Next.js 16 app (Turbopack), App Router, Route Handlers under `src/app/api/*` (~69 routes). Middleware in `src/proxy.ts` (request-id minting, admin gating).
- **Hosting:** Vercel serverless, region hnd1 (Tokyo). Stateless functions; no local disk state.
- **Data:** Supabase Postgres via Prisma 7. Pooled connection (PgBouncer, `:6543`) for the app; direct (`:5432`, `DIRECT_URL`) for migrations.
- **Rate limiting / ephemeral counters:** Upstash Redis (`src/lib/ratelimit.ts`).
- **External services:** Razorpay (payments), Cloudinary (media, browser-direct signed upload), Resend (email), PostHog (product analytics), Sentry (errors — wire before launch).

## 2. Environments & config
23 environment variables (names below; values live only in Vercel + local `.env.local`, which is git-ignored). `NEXT_PUBLIC_*` are shipped to the browser — **never** put a secret in one.

Secrets: `ADMIN_JWT_SECRET`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `CLOUDINARY_API_KEY/SECRET`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RAZORPAY_KEY_ID/SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `UPSTASH_REDIS_REST_URL/TOKEN`.
Public: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_POSTHOG_HOST/KEY`, `FROM_EMAIL`.

Production must use **live** Razorpay keys (`rzp_live_*`), not `rzp_test_*`. See `RELEASE_CHECKLIST.md` Gate 1.

## 3. Deploy
```bash
git push origin main          # CI must be green (RELEASE_CHECKLIST Gate 9)
# Vercel auto-deploys main; or: vercel --prod
npm run db:deploy             # apply pending migrations (uses DIRECT_URL) — do this BEFORE app depends on new schema
```
Migration order matters: apply DB migrations before/with the deploy that needs them. Migrations are forward-only (rollback = restore, see `ROLLBACK_RUNBOOK.md`).

## 4. Security model (as built)
- **Admin auth:** JWT cookie; `verifyAdminToken` asserts role + scope; middleware gates `/admin/*`.
- **Payments:** server-authoritative amounts (`src/lib/checkout.ts`, paise); `razorpayPaymentId @unique` (replay guard); `PaymentOrder` ledger (cross-entity binding); webhook signature verified.
- **Registration integrity:** `@@unique` constraints + conditional atomic seat claim → no overselling / duplicate registration.
- **Uploads:** byte-sniffed (`src/lib/imageSniff.ts`), browser-direct signed Cloudinary upload.
- **Rate limiting:** Upstash, **fail-open** (`safeLimit`) — a Redis outage degrades limits, not availability.
- **Secret hygiene:** logger redacts secrets in two layers; `.env.local` git-ignored; run gitleaks in CI.

## 5. Data model — money tables (source of truth for disputes)
- `PaymentOrder` — written before payment; binds order to entity+amount+user.
- `Payment` — one row per transaction; `razorpayPaymentId` unique; `amount` in **paise**; `status` (created/paid/failed/refunded).
- Registration/booking tables per entity (games, events, camps, workshops, coaches) — seat is claimed atomically.
- `CoachAgreementAuditLog` — legal view/download audit.

## 6. Routine operations
| Task | Command / place |
|---|---|
| View logs | `vercel logs <url> --follow` |
| Check health | `curl -si https://<host>/api/ready` |
| Payment reconciliation | dupe query in `RUNBOOK.md` |
| Apply migration | `npm run db:deploy` |
| Inspect DB | `npx prisma studio` (dev) / `psql "$DATABASE_URL"` |
| Rotate a secret | Vercel env → update → redeploy; then invalidate old at provider |
| Rollback | `ROLLBACK_RUNBOOK.md` |

## 7. Capacity notes (from local validation; staging load test pending)
- Listings are CDN-cached (`okCached`, 15–60s fresh + stale-while-revalidate) — most read traffic should hit the edge.
- Scale-oriented FK/userId indexes are in migration `20260709030000_scale_fk_indexes` (verify applied).
- Real capacity numbers require the staging load test (`RELEASE_CHECKLIST.md` Gate 5 / `loadtest/`). Do not assume throughput.

## 8. Known limitations (see GO_NO_GO_REPORT.md for the authoritative list)
- Sentry not yet wired; several launch gates require staging/sandbox/dashboards not available in the build environment.
- Test coverage ~71% overall (payment path `checkout.ts` ~100%, `api.ts` ~97%); admin/reputation/ratelimit modules lower.
- 26 ESLint warnings (0 errors). Mobile Lighthouse expected to be dragged by a large Three.js hero.
