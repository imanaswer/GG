-- Player-hosted games move OFF Game Ground's payment rails. Players pay the host
-- directly (UPI/cash); GG never collects, holds, refunds or settles that money.
-- costAmount is kept and becomes informational, so an online payment layer can be
-- added later without touching the schema again.
--
-- Every statement here is additive with a default or NULL: no column is dropped,
-- no row is rewritten, and existing games/players stay valid untouched.

-- ─── Game: host-collected payment details ────────────────────────────────────
ALTER TABLE "Game" ADD COLUMN "currency"      TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Game" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Game" ADD COLUMN "hostUpiId"     TEXT;
ALTER TABLE "Game" ADD COLUMN "hostQrUrl"     TEXT;
ALTER TABLE "Game" ADD COLUMN "paymentNote"   TEXT;
ALTER TABLE "Game" ADD COLUMN "venueNote"     TEXT;

-- Existing paid games predate the payment-method picker. Default them to UPI+cash
-- so their detail page renders a sensible section instead of a blank one; hosts
-- can change it. Free games keep NULL (no payment section is shown at all).
UPDATE "Game" SET "paymentMethod" = 'upi_cash' WHERE "costAmount" > 0;

-- ─── GamePlayer: advisory host-confirmed payment state ───────────────────────
-- Advisory only. The money moves outside GG, so this records what the host
-- confirms — not anything Game Ground has processed.
ALTER TABLE "GamePlayer" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "GamePlayer" ADD COLUMN "paidAt"        TIMESTAMP(3);

-- Players who already paid GG for a seat under the old flow are settled — do not
-- resurface them to the host as owing money.
UPDATE "GamePlayer" gp
   SET "paymentStatus" = 'paid', "paidAt" = p."paidAt"
  FROM "Payment" p
 WHERE p."entityType" = 'game'
   AND p."entityId"   = gp."gameId"
   AND p."userId"     = gp."userId"
   AND p."status"     = 'paid';

-- ─── Payment: link coach purchases to their Booking ──────────────────────────
-- Coach verify wrote the BOOKING id into entityId, where every other entity
-- writes the purchased entity's id. That made @@index([entityType, entityId])
-- useless for "all payments for coach X" — the admin coach revenue rollup groups
-- by entityId expecting a coachId and read back zero for every coach.
ALTER TABLE "Payment" ADD COLUMN "bookingId" TEXT;
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- Backfill: move the booking id to its own column, then correct entityId to the
-- coachId. Ordering matters — the second statement destroys the join key the
-- first one needs. Idempotent on re-run: after this, no coach Payment.entityId
-- matches a Booking id.
UPDATE "Payment" p SET "bookingId" = b."id"
  FROM "Booking" b
 WHERE p."entityType" = 'coach' AND p."entityId" = b."id";

UPDATE "Payment" p SET "entityId" = b."coachId"
  FROM "Booking" b
 WHERE p."entityType" = 'coach' AND p."bookingId" = b."id";

-- ─── WaitlistEntry: make the duplicate guard real ────────────────────────────
-- The join path checked for an existing entry with findFirst, which two
-- concurrent requests both pass. Deduplicate before adding the constraint,
-- keeping the earliest claim.
DELETE FROM "WaitlistEntry" w
 WHERE w."id" NOT IN (
   SELECT DISTINCT ON ("gameId", "userId") "id"
     FROM "WaitlistEntry"
    ORDER BY "gameId", "userId", "position" ASC, "createdAt" ASC
 );

CREATE UNIQUE INDEX "WaitlistEntry_gameId_userId_key" ON "WaitlistEntry"("gameId", "userId");

-- Promotion pops the lowest position for a game.
DROP INDEX IF EXISTS "WaitlistEntry_gameId_idx";
CREATE INDEX "WaitlistEntry_gameId_position_idx" ON "WaitlistEntry"("gameId", "position");
