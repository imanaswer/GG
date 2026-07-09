# GameGround — Production Release Checklist

**Owner:** Release Manager · **Audience:** any engineer, no prior context assumed.
**Rule:** The release is **BLOCKED** until every gate below is ✅ with attached evidence. Do **not** tick a box you have not personally demonstrated. The codebase is **frozen** — touch code only if a gate uncovers a real defect, and if you do, re-run every gate downstream of the change.

**Stack under test:** Vercel (host) · Supabase Postgres (`ap-northeast-1`, PgBouncer) · Upstash Redis · Razorpay · Cloudinary · Resend · PostHog.

---

## 0. Sign-off board (fill as you go)

| # | Gate | Blocker? | Status | Evidence link |
|---|------|:--------:|:------:|---------------|
| 1 | Production secrets present & correct | 🔴 | ⬜ | |
| 2 | Migrations applied to staging DB | 🔴 | ⬜ | |
| 3 | Staging deploy: HTTPS/cookies/headers/CSP/compression/cache/DNS | 🔴 | ⬜ | |
| 4 | Payment validation (Razorpay sandbox, 15 scenarios) | 🔴 | ⬜ | |
| 5 | Load test (100/500/1000 VUs, 0 dup bookings/payments) | 🔴 | ⬜ | |
| 6 | Backups + PITR + **actual restore drill** | 🔴 | ⬜ | |
| 7 | Error monitoring (Sentry) + alerts wired | 🔴 | ⬜ | |
| 8 | Security scans (ZAP, Semgrep, Gitleaks, npm audit) — 0 Crit/High | 🔴 | ⬜ | |
| 9 | CI enforcing quality gates (branch protection) | 🔴 | ⬜ | |
| 10 | Lighthouse (desktop + mobile, CWV) | 🟡 | ⬜ | |
| 11 | Accessibility (axe + keyboard + SR + contrast) | 🟡 | ⬜ | |
| 12 | Observability: structured logs + correlation IDs live | 🟡 | ⬜ | |
| 13 | Rollback drill (app + DB) demonstrated | 🔴 | ⬜ | |

🔴 = hard blocker · 🟡 = quality gate (run it; document any exception with RM approval).

**Evidence store:** create `release-evidence/YYYY-MM-DD/` (git-ignored or a shared drive). Every gate writes its artifacts there. Name files per the "Evidence" line in each gate.

---

## How to read each gate
Each gate has: **Why** · **Prerequisites** · **Install** · **Commands** · **Expected output** · **Pass/Fail** · **Common failures & fixes** · **Evidence for sign-off**.

Run the gates **in order** — later gates depend on a deployed, seeded staging environment produced by gates 1–3.

---

## GATE 1 — Production secrets present & correct

**Why.** A payment app that boots with a wrong or missing secret either fails closed (outage) or, worse, fails open (unsigned payments accepted, admin JWT forgeable). This is the cheapest gate and it gates everything else.

**Prerequisites.** Vercel project access (Production + Preview scopes). The canonical list of 23 variables below (extracted from source, values redacted).

**Install.** Vercel CLI:
```bash
npm i -g vercel@latest && vercel --version
vercel login
vercel link            # link cwd to the GameGround project
```

**Commands.**
```bash
# List what Production actually has (names only, no values printed):
vercel env ls production

# Compare against the required set:
cat > /tmp/required-env.txt <<'EOF'
ADMIN_JWT_SECRET
ADMIN_PASSWORD
AUTH_SECRET
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CRON_SECRET
DATABASE_URL
DIRECT_URL
FROM_EMAIL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_GOOGLE_MAPS_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_POSTHOG_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY
SENTRY_DSN
UPSTASH_REDIS_REST_TOKEN
UPSTASH_REDIS_REST_URL
EOF
vercel env ls production | awk '{print $1}' | sort -u > /tmp/have-env.txt
echo "=== MISSING in production ==="; comm -23 <(sort /tmp/required-env.txt) /tmp/have-env.txt
```

**Expected output.** The `MISSING` list is **empty**. `RAZORPAY_KEY_ID` starts with `rzp_live_` (not `rzp_test_`) for the real production release; `NEXT_PUBLIC_APP_URL` is the production URL over `https://`.

**Pass/Fail.**
- **PASS:** all 23 present in Production scope; live Razorpay keys; `NODE_ENV=production` implied by Vercel; no `rzp_test_` in prod.
- **FAIL:** any missing, or a test key in production scope, or a secret pasted into a `NEXT_PUBLIC_*` var (those are shipped to the browser — instant leak).

**Common failures & fixes.**
- *Var set in Preview but not Production* → re-add with `vercel env add NAME production`.
- *Secret in a `NEXT_PUBLIC_` name* → rotate it immediately, move to a non-public name.
- *`DATABASE_URL` points at PgBouncer but migrations need direct* → that's what `DIRECT_URL` is for; confirm both set (Prisma uses `directUrl` for migrations).

**Evidence.** `release-evidence/.../gate1-env-ls.txt` (names only — **never** commit values) + a screenshot of Vercel → Settings → Environment Variables showing the Razorpay key is `rzp_live_*`.

---

## GATE 2 — Migrations applied to the staging DB

**Why.** Four unapplied migrations carry the production-critical guards: `payment_id_unique_replay_guard` (payment replay), `registration_unique_constraints` (overselling/dup-registration), `payment_order_ledger` (cross-entity replay), `scale_fk_indexes` (query performance under load). If these aren't in the DB, gates 4 and 5 will produce false results.

**Prerequisites.** A **staging** Supabase project (never run the drill against production). Its pooled + direct connection strings.

**Install.** None (uses repo's `prisma`).

**Commands.**
```bash
# Point at STAGING (pooled for app, direct for DDL):
export DATABASE_URL="postgres://…staging…:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgres://…staging…:5432/postgres"

npx prisma migrate status        # shows applied vs pending
npm run db:deploy                # = prisma migrate deploy (forward-only, no data loss)
npx prisma migrate status        # confirm 0 pending
```

**Expected output.** `migrate status` ends with **"Database schema is up to date!"** and lists these as applied:
`20260709000000_payment_id_unique_replay_guard`, `…010000_registration_unique_constraints`, `…020000_payment_order_ledger`, `…030000_scale_fk_indexes`.

**Pass/Fail.**
- **PASS:** 0 pending migrations; `migrate status` clean.
- **FAIL:** any "Following migrations have not yet been applied", or a failed migration in the `_prisma_migrations` table.

**Common failures & fixes.**
- *`migrate deploy` fails on a unique constraint* → existing rows violate the new constraint (e.g. pre-existing duplicate registrations). Clean the offending rows in staging, re-run. **This is a real defect signal** — the same dirty data may exist in prod; plan a data-cleanup migration before prod deploy.
- *PgBouncer error "prepared statement already exists"* → you ran DDL through the pooled URL; use `DIRECT_URL` for migrations.

**Evidence.** `gate2-migrate-status.txt` showing "up to date" + the four migration names.

---

## GATE 3 — Staging deployment & edge config

**Why.** Everything downstream tests the deployed artifact, not localhost. HTTPS, secure cookies, CSP, compression, and cache headers are the app's first line of defense and its performance floor.

**Prerequisites.** Gates 1–2 green. A staging domain (e.g. `staging.gameground.app`) with DNS pointed at Vercel.

**Install.** `curl` (present), `dig` (present on macOS).

**Commands.**
```bash
export STAGING=https://staging.gameground.app

# Deploy current frozen commit to a staging alias:
vercel deploy --prebuilt=false          # or `vercel --prod` against the staging project
vercel alias set <deployment-url> staging.gameground.app

# 1) HTTPS + redirect
curl -sI http://staging.gameground.app | grep -i location      # expect https:// 308
# 2) Security + cache headers on a public listing
curl -sI $STAGING/api/coaches
# 3) Cookie flags on an authed response (login first, inspect Set-Cookie)
curl -sI -X POST $STAGING/api/auth/login -d '{"email":"…","password":"…"}' -H 'content-type: application/json' | grep -i set-cookie
# 4) Compression
curl -sI -H 'Accept-Encoding: br, gzip' $STAGING/ | grep -i content-encoding
# 5) DNS
dig +short staging.gameground.app
# 6) Health/readiness
curl -si $STAGING/api/health | head -1
curl -si $STAGING/api/ready | head -1
```

**Expected output.**
- HTTP→HTTPS: `308` with `location: https://…`.
- `/api/coaches`: `200`, `cache-control: public, s-maxage=60, stale-while-revalidate=300` (from `okCached`), and `x-request-id: …`.
- `Set-Cookie` on session: `HttpOnly; Secure; SameSite=Lax` (or Strict). **No** session cookie without `Secure`.
- `content-encoding: br` or `gzip`.
- `dig` returns Vercel IPs / CNAME.
- `/api/health` → `200`; `/api/ready` → `200` with `database: up`.

**Pass/Fail.**
- **PASS:** all six above match.
- **FAIL:** any session cookie missing `HttpOnly`+`Secure`; no HTTPS redirect; no compression; `/api/ready` ≠ 200; missing `x-request-id`.

**CSP note.** Confirm a `Content-Security-Policy` header is present on HTML responses (`curl -sI $STAGING/ | grep -i content-security`). If absent, that is a **defect** (unfreeze to add CSP via `next.config` headers or middleware) — a payment app must ship CSP. Verify Razorpay's checkout domain (`checkout.razorpay.com`, `api.razorpay.com`), Cloudinary, PostHog, and Google Maps are allow-listed, or checkout/analytics will break.

**Common failures & fixes.**
- *`cache-control` on `/api/coaches` shows `no-store`* → the `okCached` header is being stripped; check the route still calls the helper (regression).
- *CSP blocks Razorpay* → widen `script-src`/`frame-src` to Razorpay domains; re-test a real checkout in gate 4.
- *DNS not resolving* → propagation; verify the CNAME in Vercel → Domains shows "Valid Configuration".

**Evidence.** `gate3-headers.txt` (all curl `-I` outputs), `gate3-dig.txt`, a screenshot of Vercel → Domains "Valid Configuration".

---

## GATE 4 — Payment validation (Razorpay Sandbox)

**Why.** This is the highest-consequence gate. Money + seats must stay perfectly consistent under every failure ordering. The idempotency guards (`razorpayPaymentId @unique`, `PaymentOrder` binding, conditional atomic seat-claim) are unit-tested but **have never been exercised end-to-end against the real gateway**. Unit tests prove the guard's logic; only the sandbox proves the guard actually fires on the real webhook/callback race.

**Prerequisites.** Gate 3 green. Razorpay **Test Mode** keys in staging (`rzp_test_*`). Razorpay Dashboard → Webhooks pointed at `https://staging…/api/payments/webhook` with `RAZORPAY_WEBHOOK_SECRET` matching staging env. A seeded paid game/event/camp/workshop/coach in staging DB, plus a test user. Razorpay [test cards & test UPI](https://razorpay.com/docs/payments/payments/test-card-details/) (`success@razorpay` UPI VPA; card `4111 1111 1111 1111`; failure VPA `failure@razorpay`).

**Install.** None (browser + `psql` for DB assertions).
```bash
brew install libpq && brew link --force libpq   # for psql, if absent
```

**Commands / procedure.** For **each** paid entity type at least once, run the full matrix. Drive the real checkout in a browser against staging; after each, assert DB state:
```bash
export DATABASE_URL="…staging pooled…"
# After a payment attempt, assert exactly-once:
psql "$DATABASE_URL" -c "SELECT razorpay_payment_id, count(*) FROM \"Payment\" GROUP BY 1 HAVING count(*)>1;"   # expect 0 rows
psql "$DATABASE_URL" -c "SELECT id, status, amount FROM \"Payment\" ORDER BY \"createdAt\" DESC LIMIT 5;"
psql "$DATABASE_URL" -c "SELECT id, status FROM \"PaymentOrder\" ORDER BY \"createdAt\" DESC LIMIT 5;"
# Seat/booking count matches paid registrations (per entity):
psql "$DATABASE_URL" -c "SELECT \"gameId\", count(*) FROM \"GamePlayer\" GROUP BY 1 ORDER BY 2 DESC LIMIT 5;"
```

**The 15-scenario matrix (tick each):**

| # | Scenario | Expected end-state |
|---|----------|--------------------|
| 1 | UPI success (`success@razorpay`) | 1 Payment `paid`, 1 booking/seat, 1 confirmation email, admin dashboard shows it |
| 2 | Card success (`4111 1111 1111 1111`) | same as #1 |
| 3 | Net Banking success | same as #1 |
| 4 | Failed payment (`failure@razorpay`) | Payment `failed` or none; **no** booking; seat not consumed |
| 5 | Cancelled (close modal) | no Payment `paid`; no booking; order may exist `created` |
| 6 | Timeout (leave modal open past order expiry) | order `expired`; retry starts a fresh order; no double seat |
| 7 | Duplicate webhook (Razorpay resends same event) | still exactly 1 Payment row; 2nd webhook is a no-op 200 |
| 8 | Webhook **before** frontend callback | booking confirmed by webhook; callback is idempotent no-op |
| 9 | Frontend callback **before** webhook | booking confirmed by verify; later webhook idempotent |
| 10 | Browser refresh mid-checkout | no duplicate order/payment; state recovers |
| 11 | Two tabs, same order | one succeeds, other 409/402; never two seats |
| 12 | Refund (full) via dashboard | Payment `refunded`; booking cancelled; seat released |
| 13 | Partial refund | Payment reflects partial; booking policy honored |
| 14 | Expired order reuse attempt | rejected; must create new order |
| 15 | Payment retry after failure | new order, single successful Payment, single seat |

**Expected output.** After the full matrix: the exactly-once query returns **0 duplicate rows**; every `paid` Payment maps to exactly one booking; every `failed`/`cancelled` leaves **no** booking and **no** consumed seat; refunds release seats; admin dashboard, DB, and confirmation email agree row-for-row.

**Pass/Fail.**
- **PASS:** all 15 scenarios end in the expected state; 0 duplicate `razorpay_payment_id`; 0 orphan bookings; 0 phantom seats; amounts match server-computed charge (paise) exactly.
- **FAIL:** any duplicate payment, any seat consumed without a `paid` Payment, any booking without a payment, any amount mismatch, or a webhook that 500s and never self-heals.

**Common failures & fixes.**
- *Webhook signature invalid* → staging `RAZORPAY_WEBHOOK_SECRET` ≠ the secret configured in Razorpay Dashboard. Align them.
- *Scenario 7/8/9 creates two rows* → **real defect**, unfreeze: the `@unique` guard or `PaymentOrder` binding isn't covering that path. File with the exact ordering.
- *Amount mismatch* → client sent a stale price; server should recompute from DB (`lib/checkout.ts`). If prod shows client-trusted amount, that's a defect.

**Evidence.** `gate4-matrix.md` — one row per scenario with: screenshot of Razorpay dashboard payment, the `psql` output proving exactly-once, and the confirmation email. Sign-off requires all 15.

---

## GATE 5 — Load test (100 / 500 / 1000 users)

**Why.** Proves latency SLOs hold and — critically for a booking app — that concurrency guards prevent **duplicate bookings/payments** under real contention, not just in unit tests. The Artillery `duplicate-join` scenario fires the same join twice per VU on purpose.

**Prerequisites.** Gate 3 green. A seeded staging DB with: one **open, free** game (`GAME_ID`), a load-test user (`TEST_EMAIL`/`TEST_PASSWORD`). Staging should mirror prod instance sizing or results won't transfer.

**Install.**
```bash
brew install k6                       # macOS
npm i -g artillery@latest
k6 version && artillery --version
```

**Commands.**
```bash
export BASE_URL=https://staging.gameground.app
export TEST_EMAIL=loadtest@example.com TEST_PASSWORD='…'
export GAME_ID=<open-free-game-id>

# k6: read-traffic sweep 100→500→1000 VUs (thresholds fail the run)
k6 run loadtest/k6-load.js | tee release-evidence/$(date +%F)/gate5-k6.txt

# Artillery: idempotency/dup-booking probe under load
artillery run loadtest/artillery.yml | tee release-evidence/$(date +%F)/gate5-artillery.txt

# After the run, assert NO duplicate bookings/payments were created:
psql "$DATABASE_URL" -c "SELECT \"gameId\",\"userId\",count(*) FROM \"GamePlayer\" GROUP BY 1,2 HAVING count(*)>1;"  # expect 0
psql "$DATABASE_URL" -c "SELECT razorpay_payment_id,count(*) FROM \"Payment\" GROUP BY 1 HAVING count(*)>1;"          # expect 0
```

**Measure alongside** (screenshots): Supabase dashboard (CPU, connections, slow queries), Upstash (ops, latency), Vercel Analytics (function duration), and `x-vercel-cache: HIT` ratio on cached listings (`curl -sI $BASE_URL/api/coaches | grep -i x-vercel-cache`).

**Expected output.** k6 summary shows **all thresholds ✓**: `http_req_failed rate<0.01`, `p(50)<200ms`, `p(95)<800ms`, `p(99)<1500ms`. Artillery `ensure` passes: `p95<800`, `p99<1500`, `http.codes.500: 0`. Duplicate-join phase shows a mix of `200` and `409/402` — **never two seats for one user**.

**Pass/Fail.**
- **PASS:** all thresholds green; error rate <1%; **0** duplicate bookings; **0** duplicate payments; cache-hit ratio on listings > ~80%.
- **FAIL:** any threshold breached, error rate ≥1%, any duplicate booking/payment row, DB connection pool exhausted (`too many connections`), or Redis errors cascading to 500s.

**Common failures & fixes.**
- *`too many connections`* → PgBouncer pool too small or app not using pooled URL; raise pool / confirm `DATABASE_URL` is the `:6543?pgbouncer=true` endpoint.
- *p95 blows past 800ms on listings* → cache not hitting (`x-vercel-cache: MISS` every time) — check `okCached` TTLs and that CDN isn't bypassed by a cookie/vary.
- *Duplicate seats appear* → **real defect**, unfreeze: the conditional atomic seat-claim isn't holding under contention. Capture the two rows + timestamps.
- *Redis 429/errors → 500s* → the fail-open guard (`safeLimit`) should degrade limits, not availability; if 500s appear, the fail-open regressed.

**Evidence.** `gate5-k6.txt`, `gate5-artillery.txt` (both showing thresholds passed), the two `psql` "0 rows" outputs, dashboard screenshots for CPU/mem/DB/Redis/cache-hit.

---

## GATE 6 — Backups, PITR & restore drill

**Why.** For a payment app, an un-tested backup is not a backup. You must prove you can recover to a known-good point and know your RTO/RPO by measurement, not assumption.

**Prerequisites.** Supabase Dashboard access (Pro plan for PITR). A throwaway target project for the restore.

**Install.** None (dashboard + `psql`).

**Commands / procedure.**
```bash
# 1) Confirm plan & PITR:
#    Dashboard → Database → Backups. Note: plan, daily-backup retention, PITR on/off + window.
# 2) Take a baseline row count on staging BEFORE the drill:
psql "$STAGING_DB" -c "SELECT (SELECT count(*) FROM \"Payment\") AS payments, (SELECT count(*) FROM \"Booking\") AS bookings, now();"
# 3) Perform an ACTUAL restore:
#    Dashboard → Database → Backups → restore a daily snapshot (or PITR to a timestamp) into the throwaway project.
#    Record start & end times → RTO.
# 4) Verify restored data:
psql "$RESTORED_DB" -c "SELECT (SELECT count(*) FROM \"Payment\"), (SELECT count(*) FROM \"Booking\");"
psql "$RESTORED_DB" -c "SELECT id,status,amount FROM \"Payment\" ORDER BY \"createdAt\" DESC LIMIT 3;"  # spot-check a real record
```

**Migration rollback path.** Prisma migrations are forward-only. Document: rollback = restore DB to the pre-migration snapshot (steps above) **or** apply a hand-written compensating down-migration. The four recent migrations are additive (indexes + unique constraints) and safe to leave in place on a partial rollback; a destructive future migration needs a tested down-path before it ships.

**Expected output.** Restored project's row counts match (or exceed, if PITR to "now") the pre-drill baseline; the spot-checked Payment record is intact; measured RTO recorded.

**Pass/Fail.**
- **PASS:** restore completed; row counts consistent; spot-check payment present and correct; PITR confirmed enabled with a stated window (target RPO ≤ 5 min); RTO measured and ≤ 1 hour.
- **FAIL:** PITR disabled (Free/Pro-without-PITR) — **hard blocker for a payment app**; or restore produced missing/corrupt payment rows; or RTO unacceptable.

**Common failures & fixes.**
- *No PITR available* → upgrade plan / enable the PITR add-on before launch. Non-negotiable.
- *Restore row counts lower than baseline* → snapshot older than expected; use PITR to the precise timestamp instead of the daily snapshot.

**Evidence.** `gate6-restore.md`: screenshots of Backups panel (plan + PITR window), the pre/post `psql` row counts, and the measured RTO (start/end timestamps).

---

## GATE 7 — Error monitoring (Sentry) & alerts

**Why.** Without error monitoring you are blind to production exceptions. PostHog is product analytics, **not** error monitoring — Sentry (or equivalent) is required. Alerts turn a silent failure into a page.

**Prerequisites.** Sentry account + project DSN. `SENTRY_DSN` env var exists in `.env.local`/Vercel (confirmed in gate 1) but **the SDK is not yet installed** — this is the one place the freeze is expected to lift (adding monitoring is not a feature change; get RM approval, treat as an ops change).

**Install & wire.**
```bash
npx @sentry/wizard@latest -i nextjs      # generates config, reads SENTRY_DSN
# Then wrap the unhandled branch of the central error handler:
#   in src/lib/api.ts handleErr → Sentry.captureException(e) for the 500 path.
```

**Commands.**
```bash
# Trigger a deliberate test error against staging and confirm it lands in Sentry:
curl -si $STAGING/api/__sentry_test 2>/dev/null   # or hit a route that 500s in staging
# Confirm alerts:
#   Sentry → Alerts → create rules: (a) any new issue, (b) error rate spike,
#   (c) a dedicated rule tagged transaction=/api/payments/* and =/api/payments/webhook.
```

**Alert coverage required** (Phase-4 mapping): **payment alerts** (errors on `/api/payments/*`), **webhook alerts** (`/api/payments/webhook` 500s — these force Razorpay retries, so a sustained rate means real trouble), **database alerts** (Supabase → point an uptime check at `/api/ready`; alert on 503), **uptime** (`/api/health` 200).

**Expected output.** The deliberate test error appears in Sentry within seconds, with a redacted payload (no secrets — the logger's redaction must hold in the Sentry event too). Alert rules exist and a test alert fires to the on-call channel.

**Pass/Fail.**
- **PASS:** test exception visible in Sentry; secrets redacted; payment/webhook/DB/uptime alert rules created and test-fired.
- **FAIL:** SDK not capturing; secrets visible in the Sentry event; any of the four alert classes missing.

**Common failures & fixes.**
- *No events arriving* → wrong DSN / SDK not initialized in the server runtime (Next.js needs both client and server Sentry config). Check `sentry.server.config.ts`.
- *Secrets in Sentry event* → add `beforeSend` scrub, or route through the existing redacting logger before capture.

**Evidence.** `gate7-sentry.md`: screenshot of the captured test error (secrets redacted), and screenshots of the 4 alert rules + one test-alert delivery.

---

## GATE 8 — Security scans (ZAP, Semgrep, Gitleaks, npm audit)

**Why.** Catches injected secrets, known-vulnerable deps, insecure patterns, and live-endpoint issues before an attacker does. Required: **0 Critical, 0 High**.

**Prerequisites.** Gate 3 (staging URL) for ZAP. Docker for ZAP.

**Install.**
```bash
# npm audit — already available:
npm audit --audit-level=high
# Gitleaks (secret scan of git history):
brew install gitleaks
# Semgrep (SAST):
pipx install semgrep    # or: brew install semgrep
# OWASP ZAP (DAST) via Docker:
docker pull zaproxy/zap-stable
```

**Commands.**
```bash
# 1) Dependencies
npm audit --audit-level=high ; echo "audit exit=$?"

# 2) Secret scan — full history
gitleaks detect --source . --redact -v | tee release-evidence/$(date +%F)/gate8-gitleaks.txt

# 3) SAST
semgrep --config=auto --error --json -o release-evidence/$(date +%F)/gate8-semgrep.json .
semgrep --config=auto .   # human-readable summary

# 4) DAST against staging (baseline passive scan):
docker run --rm -t zaproxy/zap-stable zap-baseline.py \
  -t https://staging.gameground.app -r gate8-zap.html
```

**Expected output.**
- `npm audit`: exit 0 at `--audit-level=high` (current baseline: 0 High/Critical, 5 moderate + 1 low, all dev-tooling — **document each moderate** with why it's not in the runtime request path).
- `gitleaks`: **"no leaks found"**.
- `semgrep`: 0 ERROR-severity findings.
- ZAP baseline: 0 High/Critical alerts (Medium items triaged; e.g. confirm CSP/anti-clickjacking from gate 3).

**Pass/Fail.**
- **PASS:** 0 Critical + 0 High across all four tools; gitleaks clean; every remaining Medium/Moderate explicitly triaged and signed off by RM.
- **FAIL:** any Critical/High; any real secret in git history (rotate it immediately — a redact doesn't un-leak a pushed secret); any Semgrep ERROR on an auth/payment path.

**Common failures & fixes.**
- *Gitleaks flags `.env.local`* → it should be git-ignored; if it was ever committed, **rotate every key in it** and scrub history.
- *Semgrep flags a false positive* → add a scoped `# nosemgrep: rule-id` with justification, or a `.semgrepignore`; never blanket-disable.
- *ZAP flags missing security headers* → likely CSP/HSTS gap from gate 3; fix at the edge, re-scan.

**Evidence.** `gate8-audit.txt`, `gate8-gitleaks.txt` ("no leaks found"), `gate8-semgrep.json`, `gate8-zap.html`. A triage note for every non-zero finding.

---

## GATE 9 — CI enforcing quality gates

**Why.** A frozen codebase stays frozen only if CI blocks any PR that breaks the build/tests/audit. Config exists (`.github/workflows/ci.yml`) but isn't enforced until branch protection requires it.

**Prerequisites.** GitHub admin on the repo. Workflow pushed.

**Install.** `gh` CLI: `brew install gh && gh auth login`.

**Commands.**
```bash
git push origin main                       # ensure ci.yml is on the default branch
gh workflow list
gh run list --workflow=ci.yml --limit 3    # confirm it runs green on HEAD
# Enable branch protection requiring the gate job:
gh api -X PUT repos/:owner/:repo/branches/main/protection \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=required-gates' \
  -F 'enforce_admins=true' \
  -F 'required_pull_request_reviews[required_approving_review_count]=1'
gh api repos/:owner/:repo/branches/main/protection | jq '.required_status_checks'
```

**Expected output.** Latest `ci.yml` run is ✅ (Prisma validate/generate, `tsc`, ESLint, tests, `next build`, `npm audit --audit-level=high`). Branch-protection API returns the `required-gates` context as required, `strict: true`.

**Pass/Fail.**
- **PASS:** CI green on HEAD; `main` requires the gate check to pass before merge; enforced for admins.
- **FAIL:** CI red; or protection not requiring the check (anyone can merge a broken build).

**Common failures & fixes.**
- *CI red on `npm audit`* → a High/Critical slipped in; block until fixed (ties to gate 8).
- *Context name mismatch* → the required context string must match the job name exactly as GitHub reports it; copy it from a completed run's checks.

**Evidence.** `gate9-ci.md`: link to the green run + `gh api …/protection` JSON showing the required check.

---

## GATE 10 — Lighthouse (desktop + mobile, Core Web Vitals)

**Why.** Performance and CWV are user-facing quality and SEO signals. Known risk: the ~855 KB Three.js hero drags mobile Performance (`PERFORMANCE_OPTIMIZATION.md`).

**Prerequisites.** Gate 3 staging URL. Chrome installed.

**Install.** `npm i -g lighthouse`.

**Commands.**
```bash
lighthouse $STAGING --preset=desktop --output=html --output-path=release-evidence/$(date +%F)/gate10-desktop.html --quiet
lighthouse $STAGING --form-factor=mobile --throttling-method=simulate --output=html --output-path=release-evidence/$(date +%F)/gate10-mobile.html --quiet
```

**Expected output.** Category scores + CWV (LCP, CLS, TBT/INP) for both profiles.

**Pass/Fail (targets; RM may accept exceptions with a note).**
- **PASS:** Desktop Performance ≥ 90; Mobile Performance ≥ 70; Accessibility ≥ 90; SEO ≥ 90; Best-Practices ≥ 90; LCP < 2.5s, CLS < 0.1.
- **FAIL / EXCEPTION:** below target. If mobile Performance is dragged solely by the Three.js hero, RM may accept it as a documented known-limitation with a post-launch optimization ticket — **but it must be recorded, not silently passed.**

**Common failures & fixes.**
- *Low mobile perf from hero* → lazy-load/defer Three.js below the fold, or serve a static poster on mobile. Post-launch ticket acceptable if RM signs.
- *CLS from images* → ensure `next/image` width/height set.

**Evidence.** `gate10-desktop.html`, `gate10-mobile.html` + a one-line score summary in the sign-off board.

---

## GATE 11 — Accessibility

**Why.** Legal + ethical baseline; also overlaps with Lighthouse a11y. Keyboard-only and screen-reader users must be able to book and pay.

**Prerequisites.** Gate 3 staging URL. Chrome. A screen reader (VoiceOver on macOS: ⌘F5).

**Install.** `npm i -g @axe-core/cli`.

**Commands.**
```bash
# Automated axe over key pages:
for p in / /play /coaches /events /camps /workshops; do
  axe "$STAGING$p" --save "release-evidence/$(date +%F)/gate11-axe$(echo $p|tr / _).json"
done
```
Then **manual**: tab through the checkout flow (keyboard only) — every control reachable, visible focus ring, logical focus order; open the payment modal and confirm focus is trapped and returns on close; run VoiceOver over the booking flow; check contrast on the maroon/gold brand tokens against text.

**Expected output.** axe JSON per page; manual notes.

**Pass/Fail.**
- **PASS:** 0 axe **critical/serious** violations; full checkout completable by keyboard alone; focus order logical; contrast ≥ 4.5:1 for body text; SR announces form labels + errors.
- **FAIL:** any critical/serious axe violation, keyboard trap, unlabeled payment field, or contrast < 4.5:1 on essential text.

**Common failures & fixes.**
- *Contrast fail on gold `#c9a227` text on light bg* → use it for large text/accents only, darken for body text.
- *Modal not focus-trapped* → real defect on a payment surface; unfreeze to fix.

**Evidence.** `gate11-axe-*.json` + `gate11-manual.md` (keyboard + SR + contrast notes with screenshots).

---

## GATE 12 — Observability: structured logs & correlation IDs live

**Why.** When gate 4/5 or production misbehaves, you need to trace one request end-to-end. Logger + redaction + `x-request-id` are shipped and unit-verified; this gate confirms they're actually visible in the deployed log drain.

**Prerequisites.** Gate 3. Vercel log access (or a wired drain to Datadog/Better Stack).

**Commands.**
```bash
# Confirm request-id echoes on staging:
curl -sI $STAGING/api/coaches | grep -i x-request-id
# Trigger a handled error and read the drain:
vercel logs <deployment-url> --follow    # observe one JSON line per error, secrets redacted
```

**Expected output.** Every `/api/*` response carries `x-request-id`. Error logs appear as single-line JSON with `ts,level,msg,ctx` and **no** secret values (DB password inside a `DATABASE_URL` error must not appear). On Vercel, `x-vercel-id` is the platform correlation id in the drain.

**Pass/Fail.**
- **PASS:** `x-request-id` present; structured JSON logs visible in the drain; redaction holds (spot-check an error line for secrets).
- **FAIL:** raw `console.error` stack traces with secrets; no request id; logs not reaching any searchable drain.

**Common failures & fixes.**
- *Logs only in Vercel's ephemeral console, not searchable* → wire a Log Drain (Vercel → Settings → Log Drains) to Datadog/Better Stack. This is the documented "drain UNVERIFIED" step.

**Evidence.** `gate12-logs.md`: a redacted JSON log line screenshot + the `x-request-id` header capture.

---

## GATE 13 — Rollback drill (app + database)

**Why.** You must prove you can undo a bad deploy fast, before you need to at 3am. Untested rollback = no rollback.

**Prerequisites.** Gates 3 + 6. A prior known-good deployment in Vercel history.

**Commands / procedure.**
```bash
# --- Application rollback (Vercel instant) ---
vercel ls                                   # find the previous Production deployment
vercel promote <previous-deployment-url>    # or Dashboard → Deployments → prior → Promote to Production
curl -sI $STAGING/ | head -1                # confirm 200 on the rolled-back build
# Time it: record start → healthy. Target: seconds.

# --- Database rollback ---
# Documented + drilled in Gate 6: restore to pre-migration snapshot OR apply compensating down-migration.
# For the drill, restore staging to the Gate-6 baseline timestamp and confirm row counts.
```

**Expected output.** After app rollback, staging serves the previous build (verify a known marker — e.g. a version string or the reverted commit's behavior). DB restore returns the baseline row counts from gate 6.

**Pass/Fail.**
- **PASS:** app rolled back and healthy in < 5 min; DB restore path demonstrated (gate 6) with consistent row counts; the full runbook (who does what, in what order) written down.
- **FAIL:** promote fails; or no tested DB-rollback path; or the process isn't documented for on-call.

**Common failures & fixes.**
- *Promoted build still shows new behavior* → CDN cache; purge or wait TTL; confirm the correct deployment was promoted.
- *Migration can't be rolled back* → that's why gate 6's snapshot-restore is the canonical DB rollback for forward-only migrations.

**Evidence.** `gate13-rollback.md`: the `vercel promote` output + measured time-to-healthy, and a reference to the gate-6 restore evidence, plus the written on-call runbook.

---

## Final release decision

**The release is APPROVED only when all 🔴 blockers (gates 1–9, 13) are ✅ with attached evidence, and 🟡 gates 10–12 are either ✅ or carry a written, RM-approved exception.**

Sign-off block (RM fills at the end):
```
Release: GameGround <commit-sha>
Date/time:
Blockers green (1–9,13): [ ] all evidenced
Quality gates (10–12):   [ ] green / [ ] exception (attach note)
Known limitations:       (list)
Remaining risks:         (list + owner + mitigation)
Decision:  [ ] GO   [ ] NO-GO
Release Manager:         (name / signature)
```

**Do not deploy to production on a NO-GO. Do not tick a box without evidence in `release-evidence/`.**

---

### Appendix — what is already proven (this environment, code-level)
Refreshed locally on the frozen tree (re-run any time):
- `npm audit --audit-level=high` → **0 Critical / 0 High** (5 moderate + 1 low, all dev-tooling).
- `tsc --noEmit` → exit 0.
- `vitest run` → **293/293 passing, 43 files**.

These are the correctness/security floor gates 8 and CI (9) build on. Everything else in this checklist requires the staging environment, the Razorpay sandbox, and the Vercel/Supabase/Sentry dashboards — it cannot be produced from a local workstation and must be executed by the engineer following this document.
