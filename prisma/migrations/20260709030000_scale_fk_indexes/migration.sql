-- Add indexes on columns that are filtered by real queries AND live on tables
-- that grow with user count. Prisma does NOT auto-index scalar FK columns, so
-- these were sequential scans that degrade as rows accumulate.
--
-- ponytail: plain CREATE INDEX takes a write lock (Prisma wraps migrations in a
-- transaction, so CREATE INDEX CONCURRENTLY is not usable here). Fine on the
-- current small tables. Once any of these tables holds ~1M+ rows, build the
-- index out-of-band with CREATE INDEX CONCURRENTLY in a separate, non-txn step.
--
-- Deliberately NOT indexed (curated/bounded tables — indexing would be waste):
--   Coach.sport, Coach.status (single low-freq admin count), Batch.coachId.

-- games grow with users; venue archival guard counts LIVE games at a venue.
CREATE INDEX "Game_venueId_idx" ON "Game"("venueId");

-- waitlist rows grow with games; lookup/count/delete are all by gameId.
CREATE INDEX "WaitlistEntry_gameId_idx" ON "WaitlistEntry"("gameId");

-- bookings grow with users. "my bookings" filters userId; admin + review-gate
-- eligibility filter coachId. Neither is served by an existing index.
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Booking_coachId_idx" ON "Booking"("coachId");

-- reviews grow with bookings. Coach detail lists reviews WHERE coachId ORDER BY
-- createdAt DESC and aggregates WHERE coachId. The unique [userId, coachId]
-- index leads with userId and cannot serve a coachId-only predicate.
CREATE INDEX "Review_coachId_createdAt_idx" ON "Review"("coachId", "createdAt" DESC);

-- registrations grow with users. "my camps/events/workshops" and reputation
-- counts filter userId; the unique + status indexes all lead with the entity id.
CREATE INDEX "CampRegistration_userId_registeredAt_idx" ON "CampRegistration"("userId", "registeredAt" DESC);
CREATE INDEX "EventRegistration_userId_registeredAt_idx" ON "EventRegistration"("userId", "registeredAt" DESC);
CREATE INDEX "WorkshopRegistration_userId_registeredAt_idx" ON "WorkshopRegistration"("userId", "registeredAt" DESC);

-- payments grow with users; "my payment history" filters userId alone. The
-- existing Payment indexes all lead with razorpayOrderId / entityType / status.
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt" DESC);
