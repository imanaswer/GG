-- H2 fix: durably record a Razorpay capture on the order ledger so a payment that
-- is captured but never reaches the client /verify path (tab closed) is visible and
-- reconcilable, instead of silently lost. Not stored as a Payment row — that would
-- trip verify's razorpayPaymentId replay guard and still leave the user without a seat.
ALTER TABLE "PaymentOrder" ADD COLUMN "capturedAt" TIMESTAMP(3);
ALTER TABLE "PaymentOrder" ADD COLUMN "razorpayPaymentId" TEXT;

-- Reconciliation scan: PaymentOrder with capturedAt set but no paid Payment.
CREATE INDEX "PaymentOrder_capturedAt_idx" ON "PaymentOrder"("capturedAt");
