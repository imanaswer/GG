# GameGround — Launch Playbook

**Audience:** everyone in the launch. **Precondition:** `GO_NO_GO_REPORT.md` verdict is **GO** or **GO WITH KNOWN RISKS** signed by the RM. If **NO GO**, do not run this playbook.

## Roles (fill names before launch)
| Role | Person | Responsibility |
|---|---|---|
| Release Manager (RM) | _TBD_ | owns the go/no-go call, final deploy authorization |
| Incident Commander (IC) | _TBD_ | runs any incident during the window |
| Ops (hands on keyboard) | _TBD_ | executes deploy, migrations, verification |
| Payments watcher | _TBD_ | watches Razorpay + payment reconciliation |
| Comms | _TBD_ | stakeholder + customer updates |

## Minute-by-minute timeline (T = go-live)
| Time | Task | Owner | Success signal |
|---|---|---|---|
| **T‑60m** | War-room open (`#gg-incident`); confirm all roles present | RM | roll call done |
| T‑60m | Confirm GO_NO_GO signed; re-read rollback triggers below | RM | verdict = GO/GO-WITH-RISKS |
| T‑45m | Verify prod secrets present, **live** Razorpay keys, Sentry receiving | Ops | Gate 1 + Gate 7 green |
| T‑30m | Apply pending migrations to prod DB (`npm run db:deploy`); confirm 0 pending | Ops | `migrate status` clean |
| T‑20m | Confirm last-known-good deploy is identified + promotable (rollback ready) | Ops | deployment URL noted |
| T‑15m | Take a pre-launch DB snapshot (RPO anchor) | Ops | snapshot timestamp recorded |
| **T‑0** | Promote production deploy | Ops (RM authorizes) | deploy live |
| T+2m | Smoke: `/api/health` 200, `/api/ready` 200, home loads over HTTPS | Ops | all green |
| T+5m | Real end-to-end: sign up → book a **free** entity → confirm booking + email | Ops | booking + email OK |
| T+10m | Real end-to-end: **paid** entity via a live small payment → reconcile ledger + email + admin | Payments | Payment=booking=email=dashboard |
| T+15m | Confirm cache hits on listings; latency sane; Sentry quiet | Ops | `x-vercel-cache: HIT`, no new errors |
| T+30m | First status update to stakeholders | Comms | sent |
| T+60m | Go/no-continue check — hold or proceed to public announcement | RM | metrics within thresholds |

## Rollback triggers (any one → execute `ROLLBACK_RUNBOOK.md` immediately)
- Any **duplicate payment** or **seat sold without a paid Payment** (dupe query returns rows). **SEV1.**
- `/api/ready` = 503 sustained > 2 min (DB down).
- Error rate spike in Sentry beyond baseline, or a new unhandled exception on a payment route.
- Checkout failing for real users (not a gateway-wide Razorpay outage).
- p95 latency multiples above target and not recovering.

## Success metrics (first hour)
- 0 duplicate payments, 0 duplicate bookings (query = 0 rows).
- `/api/health` + `/api/ready` 200 throughout.
- ≥ 1 successful real paid transaction fully reconciled.
- Sentry: no new payment/auth exceptions.
- Listings cache-hit ratio healthy; p95 within target.

## War-room checklist
- ⬜ All roles present + reachable.
- ⬜ Dashboards open: Vercel, Supabase, Upstash, Razorpay, Sentry.
- ⬜ `ROLLBACK_RUNBOOK.md` + `INCIDENT_RESPONSE.md` open.
- ⬜ Last-known-good deploy URL pinned in channel.
- ⬜ Pre-launch DB snapshot timestamp pinned.
- ⬜ Payment dupe query ready to paste.

## Communication templates
**Internal go-live:**
> ✅ GameGround is live as of <time>. Watching payments + errors for 60 min. Report anything odd in #gg-incident.

**Customer announcement (only after T+60m green):**
> GameGround is now live! <one-line value prop + link>. 

**If we roll back:**
> ⚠️ We've temporarily reverted to stabilize an issue found during launch. No action needed. Update by <time>.

## Post-launch verification (T+60m → T+24h)
Hand off to `POST_LAUNCH_CHECKLIST.md` (24h/7d/30d). Do not close the war room until the RM confirms the first-hour success metrics are all green.

## Customer announcement checklist
- ⬜ First-hour metrics green + RM approval.
- ⬜ At least one real paid transaction reconciled cleanly.
- ⬜ Support briefed (`POST_LAUNCH_CHECKLIST.md` support section).
- ⬜ Status page / social copy ready.
- ⬜ Rollback still available if post-announcement traffic surfaces an issue.

## Escalation contacts
See `INCIDENT_RESPONSE.md` contacts table. Razorpay/Supabase/Vercel via their dashboards; keep account-manager contacts pinned in `#gg-incident`.
