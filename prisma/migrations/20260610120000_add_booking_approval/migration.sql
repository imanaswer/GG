-- AlterTable: booking approval audit trail
ALTER TABLE "Booking"
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Backfill legacy status: "confirmed" is now "approved"
UPDATE "Booking" SET "status" = 'approved' WHERE "status" = 'confirmed';
