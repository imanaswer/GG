-- One SIGNED agreement row per coach per version: makes a concurrent
-- double-submit fail closed (P2002) instead of creating duplicate legal records.
CREATE UNIQUE INDEX "CoachAgreement_userId_agreementVersion_key" ON "CoachAgreement"("userId", "agreementVersion");
