-- Replay guard: a Razorpay payment id may be recorded at most once.
-- Postgres treats NULLs as distinct, so pre-payment / dev rows with a NULL
-- razorpayPaymentId are unaffected. Replaces the prior non-unique index.
DROP INDEX IF EXISTS "Payment_razorpayPaymentId_idx";
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
