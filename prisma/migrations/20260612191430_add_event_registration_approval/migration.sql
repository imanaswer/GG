-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- Normalize legacy approval status: old auto-accepted rows become "approved".
UPDATE "EventRegistration" SET status = 'approved' WHERE status = 'registered';
