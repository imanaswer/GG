-- Server-side order-intent ledger. verify binds the razorpay order to (user, entity,
-- amount) so a signed cheap-entity payment cannot be replayed against an expensive one.
CREATE TABLE "PaymentOrder" (
    "razorpayOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("razorpayOrderId")
);
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt" DESC);
