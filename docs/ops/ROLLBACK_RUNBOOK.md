# GameGround — Rollback Runbook

**Audience:** on-call, under pressure. **Principle:** when a deploy is implicated, roll back **first**, diagnose after. Reverting is faster than root-causing live.

## Rollback decision tree
```
Something is wrong in production
│
├─ Did it start right after a deploy? ───────── YES ─► APP ROLLBACK (below). Fast, reversible.
│                                                        Did that fix it? ── YES ─► done, postmortem.
│                                                                          └─ NO ─► continue ▼
│
├─ Is the DB the problem? (/api/ready = 503, data corruption, bad migration)
│        │
│        ├─ Bad migration / data corruption ──► DB RESTORE / PITR (below). Slow, last resort.
│        └─ Transient / Supabase incident ────► wait for auto-heal + Supabase status; escalate.
│
├─ Is a dependency down? (Redis/Cloudinary/Email/Razorpay)
│        └─► NOT a rollback. See INCIDENT_RESPONSE.md degradation map — most self-heal.
│
└─ Unclear ──► declare incident, App rollback to last-known-good as the safe default.
```

## App rollback (Vercel) — seconds, no data loss
```bash
vercel ls                                  # list deployments; find last-known-good (before the bad one)
vercel promote <good-deployment-url>       # OR Dashboard → Deployments → prior → Promote to Production
curl -sI https://<host>/ | head -1         # confirm 200
curl -si https://<host>/api/health | head -1
```
- **Verify you promoted the right build:** check a known marker (reverted behavior / version).
- **CDN cache:** if the old behavior lingers, the CDN may be serving cached HTML — purge or wait TTL.
- **Record** time-to-healthy (target < 5 min).

## Database rollback — minutes to <1h, LAST RESORT
Prisma migrations are **forward-only**. There is no `migrate down`. Two paths:

**A) Restore to a pre-incident point (canonical):**
1. Supabase Dashboard → Database → Backups.
2. Restore a **daily snapshot** or **PITR** to a timestamp just before the incident, into the target project.
3. Verify row counts + spot-check a payment record:
   ```bash
   psql "$RESTORED_DB" -c "SELECT (SELECT count(*) FROM \"Payment\"),(SELECT count(*) FROM \"Booking\");"
   psql "$RESTORED_DB" -c "SELECT id,status,amount FROM \"Payment\" ORDER BY \"createdAt\" DESC LIMIT 3;"
   ```
4. Repoint the app's `DATABASE_URL`/`DIRECT_URL` if restoring into a new project.

**B) Compensating migration (for a specific bad additive change):**
- The four recent migrations are **additive** (indexes + unique constraints) — safe to leave in place during an app rollback.
- A destructive future migration must ship with a tested down-path or you fall back to (A).

## RTO / RPO
- **RTO target:** ≤ 1 hour. App rollback = minutes; DB restore dominates (small DB typically < 30 min). **Measure during the drill — do not assume.**
- **RPO target:** ≤ 5 min **with PITR enabled**; up to 24h with daily-snapshot-only. **Confirm which plan is active — PITR is a launch blocker for a payment app.**

## Combined bad-deploy-with-migration rollback (worst case)
1. App rollback to the pre-migration build (Vercel promote).
2. If the migration corrupted data → DB restore to pre-migration snapshot (path A).
3. Re-verify: `/api/ready` 200, payment consistency query returns 0 dupes.
4. Postmortem; add a regression test before re-deploying the fix.

## Evidence to capture (every rollback)
- `vercel promote` output + measured time-to-healthy.
- If DB restored: pre/post row counts, spot-check payment, measured RTO.
- Timeline for the postmortem.
