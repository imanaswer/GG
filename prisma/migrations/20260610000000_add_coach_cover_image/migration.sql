-- AlterTable: add a dedicated cover image for coaches.
-- Additive and defaulted, so existing rows are unaffected.
--   coverImageUrl — wide banner image used as the blurred hero background on the
--                   coach detail page (kept separate from imageUrl, the portrait).
ALTER TABLE "Coach" ADD COLUMN "coverImageUrl" TEXT NOT NULL DEFAULT '';
