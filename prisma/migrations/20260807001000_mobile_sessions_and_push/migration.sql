-- Mobile clients get refresh tokens and push targets.
--
-- Before this, signToken issued one 7-day JWT and nothing else: any 401 logged
-- the user straight out, the session hard-expired at 7 days with no silent
-- refresh, and logout revoked nothing — a token captured from a "logged out"
-- device stayed valid for the rest of its week. The web cookie session is
-- unchanged; this is additive.

-- ─── RefreshToken ────────────────────────────────────────────────────────────
-- Only the SHA-256 of the token is stored, so a database leak cannot be replayed
-- as a working session.
CREATE TABLE "RefreshToken" (
    "id"        TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    -- Links every rotation of a single login. A token that was already rotated
    -- and is presented again was copied: the whole family is revoked.
    "familyId"  TEXT NOT NULL,
    "deviceId"  TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_deviceId_idx" ON "RefreshToken"("userId", "deviceId");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── DeviceToken ─────────────────────────────────────────────────────────────
-- One row per install, not per user: a phone and a tablet must both receive.
CREATE TABLE "DeviceToken" (
    "id"              TEXT NOT NULL,
    "token"           TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "deviceId"        TEXT,
    "platform"        TEXT NOT NULL DEFAULT 'unknown',
    -- Categories this device does NOT want. Empty = wants everything, so a new
    -- device is opted in and a category added later is delivered by default.
    "mutedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSeenAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
