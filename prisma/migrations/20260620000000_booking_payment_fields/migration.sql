-- Coach sessions can now be paid for instantly. Track payment state on the booking.
-- Both columns are additive with safe defaults so existing rows stay valid.
ALTER TABLE "Booking" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "Booking" ADD COLUMN "amountPaid" INTEGER NOT NULL DEFAULT 0;
