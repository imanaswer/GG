-- CreateIndex
CREATE INDEX "Game_organizerId_createdAt_idx" ON "Game"("organizerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Game_scheduledAt_status_idx" ON "Game"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "GamePlayer_userId_joinedAt_idx" ON "GamePlayer"("userId", "joinedAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Payment_razorpayPaymentId_idx" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_entityType_entityId_idx" ON "Payment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt" DESC);
