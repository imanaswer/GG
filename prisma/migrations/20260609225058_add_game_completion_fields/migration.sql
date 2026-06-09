-- AlterTable: add game completion / admin-finalization lifecycle fields.
-- All additive and defaulted, so existing rows are unaffected.
--   completedAt   — set when a game's duration expires (cron) or a host/admin completes it.
--   cancelledAt   — set when a game is cancelled (host with 0 players, or admin override).
--   adminVerified — true once an admin has reviewed/finalized the completed game.
--   pointsAwarded — true once rewards have been granted (guards against duplicate awards).
ALTER TABLE "Game" ADD COLUMN     "completedAt" TIMESTAMP(3);
ALTER TABLE "Game" ADD COLUMN     "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Game" ADD COLUMN     "adminVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Game" ADD COLUMN     "pointsAwarded" BOOLEAN NOT NULL DEFAULT false;
