-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "reputationScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'bronze',
ADD COLUMN     "tierUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "User_reputationScore_idx" ON "User"("reputationScore" DESC);

-- CreateIndex
CREATE INDEX "User_tier_idx" ON "User"("tier");
