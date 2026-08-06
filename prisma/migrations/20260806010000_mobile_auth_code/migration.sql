-- One-time authorization codes for the mobile Google handoff (Developer PRD §5.2).
-- Short-lived and single-use: `expiresAt` bounds the window, `usedAt` burns the code on exchange.
-- Only the SHA-256 of the code is stored, so a database read cannot replay a live code.
CREATE TABLE "MobileAuthCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAuthCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileAuthCode_codeHash_key" ON "MobileAuthCode"("codeHash");
CREATE INDEX "MobileAuthCode_expiresAt_idx" ON "MobileAuthCode"("expiresAt");
CREATE INDEX "MobileAuthCode_userId_idx" ON "MobileAuthCode"("userId");

ALTER TABLE "MobileAuthCode" ADD CONSTRAINT "MobileAuthCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
