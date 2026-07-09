-- One registration per user per camp/event/workshop. Closes the check-then-act
-- duplicate-registration race (concurrent verify calls) at the DB level.
-- NOTE: if the table already holds duplicate (xId,userId) rows, dedupe them before
-- deploying or this index creation will fail.
CREATE UNIQUE INDEX "CampRegistration_campId_userId_key" ON "CampRegistration"("campId", "userId");
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");
CREATE UNIQUE INDEX "WorkshopRegistration_workshopId_userId_key" ON "WorkshopRegistration"("workshopId", "userId");
