-- Append-only ops event log: notification outbox, work queue, and admin audit trail.
--
-- Purely additive. No ALTER, no DROP, no foreign key, so it is safe to apply while
-- the currently deployed code (which knows nothing about this table) is still
-- serving traffic, and the rollback is a single DROP TABLE.

CREATE TABLE "OpsEvent" (
    "id"            TEXT NOT NULL,
    "type"          TEXT NOT NULL,
    -- "info" = activity feed | "action" = needs a human | "audit" = never notified
    "severity"      TEXT NOT NULL DEFAULT 'info',
    "title"         TEXT NOT NULL,
    "body"          TEXT,
    "link"          TEXT,

    "entityType"    TEXT,
    "entityId"      TEXT,
    -- Plain strings, deliberately NOT foreign keys: nothing cascades and no lock is
    -- taken on "User" while a booking transaction commits.
    "userId"        TEXT,
    "actorId"       TEXT,
    "actorName"     TEXT,

    -- Natural key for "this already happened". The UNIQUE index below is the dedupe:
    -- a second insert raises P2002, which the caller swallows.
    "dedupeKey"     TEXT,
    "meta"          JSONB,

    -- Channels already delivered, so a retry sends only what is still missing.
    "channels"      TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attempts"      INTEGER NOT NULL DEFAULT 0,
    "attemptedAt"   TIMESTAMP(3),
    "deliveredAt"   TIMESTAMP(3),

    "claimedById"   TEXT,
    "claimedByName" TEXT,
    "claimedAt"     TIMESTAMP(3),
    "resolvedAt"    TIMESTAMP(3),

    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpsEvent_dedupeKey_key" ON "OpsEvent"("dedupeKey");
CREATE INDEX "OpsEvent_createdAt_idx" ON "OpsEvent"("createdAt" DESC);
-- The dispatch sweep: undelivered rows under the attempt cap.
CREATE INDEX "OpsEvent_deliveredAt_attempts_idx" ON "OpsEvent"("deliveredAt", "attempts");
-- The inbox: unresolved rows needing action, newest first.
CREATE INDEX "OpsEvent_severity_resolvedAt_createdAt_idx" ON "OpsEvent"("severity", "resolvedAt", "createdAt" DESC);
