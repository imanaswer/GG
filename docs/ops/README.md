# Operations & Release Docs

Production-readiness, release, and on-call documentation. (Docs reference each other by bare filename — they live together in this folder so those references resolve.)

## Release & go-live
- [GO_NO_GO_REPORT.md](GO_NO_GO_REPORT.md) — current verdict + evidence (**NO GO**)
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) — gate-by-gate how-to, followable with no prior context
- [LAUNCH_PLAYBOOK.md](LAUNCH_PLAYBOOK.md) — minute-by-minute launch timeline, roles, rollback triggers
- [POST_LAUNCH_CHECKLIST.md](POST_LAUNCH_CHECKLIST.md) — 24h / 7d / 30d + on-call + support

## On-call & runbooks
- [RUNBOOK.md](RUNBOOK.md) — operate/observe/diagnose the live system
- [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) — severity ladder, payment-incident handling
- [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md) — app + DB rollback, decision tree, RTO/RPO
- [OPERATIONS_MANUAL.md](OPERATIONS_MANUAL.md) — architecture, config, security & data model reference

## Audits & analysis
- [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md) — exhaustive code/security audit with scores
- [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) — performance/scale readiness report
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) — perf findings (Three.js hero, etc.)

Raw scan/validation evidence: `../../release-evidence/`. Load-test scripts: `../../loadtest/`.
