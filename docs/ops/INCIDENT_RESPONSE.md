# GameGround — Incident Response Plan

**Audience:** on-call + incident commander. **Goal:** contain, communicate, resolve, learn. No prior context assumed.

## Severity ladder
| Sev | Definition | Examples | Response time | Who |
|---|---|---|---|---|
| **SEV1** | Money at risk or total outage | duplicate charges, seats sold without payment, site down, DB down | **immediate**, page IC | IC + eng + RM |
| **SEV2** | Major feature broken, no money loss | checkout fails for all, login broken, webhook backlog | < 30 min | on-call eng |
| **SEV3** | Degraded / partial | one listing slow, email delays, image upload failing | < 4 h | on-call eng |
| **SEV4** | Cosmetic / low impact | copy bug, minor UI | next business day | backlog |

## First 5 minutes (any SEV1/2)
1. **Acknowledge** the page. Declare an incident in the war-room channel (`#gg-incident`).
2. **Assign roles:** Incident Commander (coordinates), Ops (hands on keyboard), Comms (updates stakeholders).
3. **Assess blast radius:** `/api/health`, `/api/ready`, Sentry issue rate, Vercel/Supabase/Upstash/Razorpay status pages.
4. **Stabilize before diagnosing.** If a recent deploy is implicated → **roll back first** (`ROLLBACK_RUNBOOK.md`), diagnose after. Reverting is faster than root-causing live.
5. **Communicate** initial status (template below).

## Payment incident (SEV1) — special handling
Money bugs are the top risk for this app. If you suspect duplicate charges / phantom seats / orphan bookings:
1. **Do not "fix" data by hand first.** Snapshot the evidence:
   ```bash
   psql "$DATABASE_URL" -c "SELECT razorpay_payment_id,count(*) FROM \"Payment\" GROUP BY 1 HAVING count(*)>1;"
   psql "$DATABASE_URL" -c "SELECT * FROM \"Payment\" WHERE \"createdAt\" > now()-interval '1 hour' ORDER BY \"createdAt\" DESC;"
   ```
2. Cross-check Razorpay dashboard (source of truth for gateway) vs `Payment`/`PaymentOrder` vs booking rows.
3. If a guard failed (replay/seat), that is a **defect** → unfreeze code with RM sign-off; capture the exact request ordering (`x-request-id`).
4. Refunds go through Razorpay dashboard; then reconcile `Payment.status` + release seats.

## Degradation map (by design — what should self-heal)
| Failure | Blast radius | Expected behavior | Your action if not behaving |
|---|---|---|---|
| DB outage | total | `/api/ready`→503, LB drains; cached listings serve stale up to TTL | restore (`ROLLBACK_RUNBOOK.md`) if Supabase doesn't auto-heal |
| Redis (Upstash) outage | rate limiting only | **fails open** — traffic flows, limits degraded, warn logged | if 500s appear, fail-open regressed → rollback |
| Cloudinary outage | images + uploads | existing URLs 404 gracefully; uploads error to user | none — no data loss (URLs stored) |
| Email (Resend) outage | reminders/notifs | non-blocking — booking/payment still completes | monitor Resend; backfill notices if needed |
| Razorpay outage | new payments only | checkout fails cleanly; no partial state | wait out gateway; existing bookings unaffected |
| Webhook outage/delay | status sync lag | Razorpay retries; `@unique` makes replays idempotent | monitor webhook backlog; it self-heals on retry |
| Server crash | single request | stateless — next request hits fresh instance | none |
| Bad deploy | site-wide | — | **Vercel instant rollback** (seconds) |

## Communication templates
**Initial (within 15 min):**
> 🔴 [SEV_] Investigating <symptom> affecting <scope> since <time>. Impact: <who/what>. Next update in 30 min. IC: <name>.

**Update:**
> 🟠 [SEV_] Update: <what we know / what we're doing>. Mitigation: <rollback/restore/none>. Next update <time>.

**Resolved:**
> 🟢 [SEV_] Resolved at <time>. Root cause: <one line>. Follow-up: postmortem by <date>.

## After resolution
- **Blameless postmortem** within 48h for SEV1/2: timeline, root cause, what detected it, what delayed resolution, action items with owners.
- File action items; if a guard failed, add a regression test before re-freezing.

## Contacts (fill before launch)
| Role | Name | Channel |
|---|---|---|
| Incident Commander | _TBD_ | |
| On-call engineer | _TBD_ | |
| Release Manager | _TBD_ | |
| Razorpay support | dashboard / _acct mgr_ | |
| Supabase support | dashboard | |
| Vercel support | dashboard | |
