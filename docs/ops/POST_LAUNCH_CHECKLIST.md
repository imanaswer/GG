# GameGround — Post-Launch Checklist

**Audience:** on-call + RM. **Use:** work top-down from go-live. Every ⬜ needs a real observation, not an assumption.

## First 24 hours (high alert)
**Monitoring schedule:** eyes on dashboards every **30 min** for the first 4h, then **hourly** to 24h.

- ⬜ Sentry: error rate flat/low; no new unhandled exception classes. Triage every new issue.
- ⬜ `/api/health` + `/api/ready`: 200 continuously (uptime monitor green).
- ⬜ **Payments:** every real transaction reconciles — Razorpay dashboard = `Payment` ledger = booking = confirmation email. Run the dupe query hourly:
  `psql "$DATABASE_URL" -c "SELECT razorpay_payment_id,count(*) FROM \"Payment\" GROUP BY 1 HAVING count(*)>1;"` → **0 rows**.
- ⬜ Webhook delivery: Razorpay dashboard shows successful deliveries; no growing retry backlog.
- ⬜ Latency: p95 within target on listings; cache-hit ratio (`x-vercel-cache: HIT`) healthy.
- ⬜ DB: Supabase connections not near pool limit; no slow-query pileup.
- ⬜ Redis: Upstash ops normal; no fail-open warnings flooding logs.
- ⬜ Cron jobs fired on schedule (complete-games 00:00, recompute-reputation 03:00, send-reminders 18:00 UTC).
- ⬜ First customer signups/bookings succeed end-to-end (watch a few real ones).
- ⬜ Rollback path confirmed reachable (don't execute — just confirm last-known-good deploy is promotable).

## First 7 days
- ⬜ Daily payment reconciliation (dupe query + spot-check refunds).
- ⬜ Review Sentry trends; fix any recurring error (defect → unfreeze with RM sign-off).
- ⬜ Confirm daily backups are actually being taken (Supabase → Backups shows recent snapshots).
- ⬜ Review load vs capacity: are we near any limit (DB connections, Vercel function concurrency, Redis)?
- ⬜ Lighthouse/CWV re-check on real traffic (field data via PostHog/Vercel Analytics).
- ⬜ Cost check: Cloudinary/Resend/Upstash/Razorpay usage within expected envelope.
- ⬜ Any SEV1/2? Postmortem completed with action items.

## First 30 days
- ⬜ Run a **restore drill** if not done pre-launch, or re-validate PITR window and measured RTO/RPO.
- ⬜ Review 30-day error budget / uptime; set SLOs formally.
- ⬜ Address deferred quality gates: ESLint warnings (26), coverage uplift on critical paths, bundle/Three.js mobile-perf optimization ticket.
- ⬜ Security: schedule recurring `npm audit` / gitleaks / semgrep in CI; rotate any credentials on the normal cadence.
- ⬜ Capacity planning from real traffic; decide if any scale work is now justified (was frozen pre-launch).
- ⬜ Retro on the launch itself; update these runbooks with what was learned.

## On-call checklist (every shift)
- ⬜ Confirm you can reach: Vercel, Supabase, Upstash, Razorpay, Sentry dashboards + `#gg-incident`.
- ⬜ Skim overnight Sentry issues + cron run status.
- ⬜ Know where `ROLLBACK_RUNBOOK.md` and `INCIDENT_RESPONSE.md` are.
- ⬜ Verify uptime monitors are green at shift start.

## Support checklist (customer-facing issues)
- ⬜ "I paid but no booking" → check `Payment` by email/`razorpay_payment_id`; if `paid` with no booking = defect, escalate SEV1; if `failed` = advise retry.
- ⬜ "Charged twice" → run dupe query; if real, refund via Razorpay + escalate SEV1.
- ⬜ "Refund not received" → Razorpay refunds take 5–7 business days; confirm `Payment.status = refunded`.
- ⬜ "Can't log in" → check auth/Google OAuth; check rate-limit fail-open isn't blocking.
- ⬜ Log every customer-reported money issue as an incident, even if it turns out benign.
