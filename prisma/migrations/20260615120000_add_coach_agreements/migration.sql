-- Sequence backing the human-readable agreement number (race-safe).
CREATE SEQUENCE IF NOT EXISTS "coach_agreement_seq" START 1;

-- CreateTable
CREATE TABLE "CoachAgreement" (
    "id" TEXT NOT NULL,
    "agreementNumber" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "pdfPublicId" TEXT NOT NULL,
    "pdfResourceType" TEXT NOT NULL DEFAULT 'raw',
    "agreementHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SIGNED',
    "personalSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachAgreementAuditLog" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachAgreementAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachAgreement_agreementNumber_key" ON "CoachAgreement"("agreementNumber");
CREATE INDEX "CoachAgreement_coachId_idx" ON "CoachAgreement"("coachId");
CREATE INDEX "CoachAgreement_agreementNumber_idx" ON "CoachAgreement"("agreementNumber");
CREATE INDEX "CoachAgreement_acceptedAt_idx" ON "CoachAgreement"("acceptedAt");
CREATE INDEX "CoachAgreementAuditLog_agreementId_idx" ON "CoachAgreementAuditLog"("agreementId");

-- AddForeignKey
ALTER TABLE "CoachAgreement" ADD CONSTRAINT "CoachAgreement_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachAgreementAuditLog" ADD CONSTRAINT "CoachAgreementAuditLog_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CoachAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
