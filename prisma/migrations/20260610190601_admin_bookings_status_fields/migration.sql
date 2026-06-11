-- Add status / cancelledAt / updatedAt audit fields to registration models and GamePlayer,
-- and standardize paymentStatus default to 'pending'.
--
-- updatedAt is application-managed (@updatedAt) with no DB default. To remain safe on tables
-- that already contain rows, we add it WITH a transient default (CURRENT_TIMESTAMP) and then
-- DROP that default, leaving the column NOT NULL with no default — exactly what Prisma expects
-- (so no schema drift on subsequent migrations).

-- AlterTable: CampRegistration
ALTER TABLE "CampRegistration" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'registered',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "paymentStatus" SET DEFAULT 'pending';
ALTER TABLE "CampRegistration" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable: EventRegistration
ALTER TABLE "EventRegistration" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'registered',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "paymentStatus" SET DEFAULT 'pending';
ALTER TABLE "EventRegistration" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable: GamePlayer
ALTER TABLE "GamePlayer" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'joined',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "GamePlayer" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable: WorkshopRegistration
ALTER TABLE "WorkshopRegistration" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'registered',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "paymentStatus" SET DEFAULT 'pending';
ALTER TABLE "WorkshopRegistration" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Backfill legacy paymentStatus 'unpaid' -> 'pending' on existing rows
UPDATE "CampRegistration"     SET "paymentStatus" = 'pending' WHERE "paymentStatus" = 'unpaid';
UPDATE "EventRegistration"    SET "paymentStatus" = 'pending' WHERE "paymentStatus" = 'unpaid';
UPDATE "WorkshopRegistration" SET "paymentStatus" = 'pending' WHERE "paymentStatus" = 'unpaid';

-- CreateIndex
CREATE INDEX "CampRegistration_campId_status_registeredAt_idx" ON "CampRegistration"("campId", "status", "registeredAt" DESC);

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_registeredAt_idx" ON "EventRegistration"("eventId", "status", "registeredAt" DESC);

-- CreateIndex
CREATE INDEX "GamePlayer_gameId_status_joinedAt_idx" ON "GamePlayer"("gameId", "status", "joinedAt" DESC);

-- CreateIndex
CREATE INDEX "WorkshopRegistration_workshopId_status_registeredAt_idx" ON "WorkshopRegistration"("workshopId", "status", "registeredAt" DESC);
