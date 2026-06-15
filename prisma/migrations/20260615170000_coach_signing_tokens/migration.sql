-- Agreement signing now binds to the coach record, not a user account.

-- CreateTable: secure single-use signing-link tokens.
CREATE TABLE "CoachSigningToken" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachSigningToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachSigningToken_token_key" ON "CoachSigningToken"("token");
CREATE INDEX "CoachSigningToken_coachId_idx" ON "CoachSigningToken"("coachId");
ALTER TABLE "CoachSigningToken" ADD CONSTRAINT "CoachSigningToken_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CoachAgreement: userId becomes optional; uniqueness moves to (coachId, version).
ALTER TABLE "CoachAgreement" ALTER COLUMN "userId" DROP NOT NULL;
DROP INDEX IF EXISTS "CoachAgreement_userId_agreementVersion_key";
CREATE UNIQUE INDEX "CoachAgreement_coachId_agreementVersion_key" ON "CoachAgreement"("coachId", "agreementVersion");
