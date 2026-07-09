# GameGround — Operations Runbook

**Audience:** on-call engineer, no prior context. **Scope:** how to operate, observe, and diagnose the live system. Companion docs: `INCIDENT_RESPONSE.md`, `ROLLBACK_RUNBOOK.md`, `OPERATIONS_MANUAL.md`, `RELEASE_CHECKLIST.md`.

## System at a glance
- **App:** Next.js 16 (Turbopack), deployed on **Vercel** (region hnd1/Tokyo). Serverless, stateless — no sticky sessions.
- **DB:** Supabase Postgres (`ap-northeast-1`), accessed via PgBouncer pooled URL (`:6543?pgbouncer=true`); migrations use direct URL (`:5432`).
- **Rate limiting / ephemeral:** Upstash Redis (fail-open — see below).
- **Payments:** Razorpay (orders + webhook). **Media:** Cloudinary. **Email:** Resend. **Analytics:** PostHog. **Errors:** Sentry (see `RELEASE_CHECKLIST.md` Gate 7 — must be wired before launch).

## Health & readiness
| Probe | URL | Healthy | Meaning |
|---|---|---|---|
| Liveness | `GET /api/health` | `200`, `Cache-Control: no-store`, `x-request-id` | process up |
| Readiness | `GET /api/ready` | `200` `database: up` | DB reachable; `503 database: down` → LB should drain |

```bash
curl -si https://<host>/api/health | head -1
curl -si https://<host>/api/ready  | head -1
```
Point uptime monitors at both. Alert on `/api/health` ≠ 200 (process down) and `/api/ready` = 503 (DB down).

## Observability
- **Structured logs:** every server error sink emits one JSON line (`ts, level, msg, ctx`) via `src/lib/logger.ts`. Two-layer secret redaction (key-based recursive + value-based env-scrub) — secrets never appear in logs.
- **Correlation:** `x-request-id` minted per `/api/*` request and echoed on the response. On Vercel, `x-vercel-id` is the platform id in the log drain. To trace a request: grab its `x-request-id`/`x-vercel-id` from the response, search the drain.
- **Read logs:** `vercel logs <deployment-url> --follow`.
- **Durable audit trails live in the DB, not logs:** `Payment` + `PaymentOrder` (money ledger), `CoachAgreementAuditLog` (view/download). These are the record of truth for disputes.

## Payment ledger — how money state is recorded
- `PaymentOrder` row is written **before** payment (order binding).
- `Payment` row per transaction; `razorpayPaymentId` is `@unique` → replays are no-ops (idempotent).
- Amounts are **server-authoritative** (`src/lib/checkout.ts`, paise) — never trust client amount.
- Seat/booking claim is a conditional atomic update → no overselling under contention.
- Webhook returns non-2xx on transient failure to force Razorpay retry; retries are idempotent.

**Consistency check (run any time):**
```bash
psql "$DATABASE_URL" -c "SELECT razorpay_payment_id,count(*) FROM \"Payment\" GROUP BY 1 HAVING count(*)>1;"  -- expect 0
```

## Cron jobs (Vercel Crons, UTC)
| Job | Time | Purpose |
|---|---|---|
| complete-games | 00:00 | finalize games, trigger reward finalization |
| recompute-reputation | 03:00 | rebuild reputation scores |
| send-reminders | 18:00 | booking reminders (non-blocking email) |

All require the `CRON_SECRET` header. Vercel surfaces run status; add a dead-man's-switch (healthchecks.io ping) for silent-failure detection.

## Common diagnostics
| Symptom | First look |
|---|---|
| 5xx spike | `vercel logs --follow`; check `/api/ready` (DB) and Sentry issues |
| Slow listings | `curl -sI …/api/coaches \| grep x-vercel-cache` — expect `HIT`; MISS every time = cache regression |
| Payments failing | Razorpay dashboard (gateway status) + webhook delivery log; check `RAZORPAY_WEBHOOK_SECRET` alignment |
| "too many connections" | confirm app uses pooled `:6543?pgbouncer=true` URL, not direct |
| Auth/writes 500 on Redis blip | should NOT happen — `safeLimit` fails open. If it does, the fail-open regressed (`src/lib/ratelimit.ts`) |

## Escalation
See `INCIDENT_RESPONSE.md` for severity ladder and contacts. DB restore → `ROLLBACK_RUNBOOK.md`.
