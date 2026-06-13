-- CreateTable
CREATE TABLE "EventUpdate" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventUpdate_eventId_pinned_createdAt_idx" ON "EventUpdate"("eventId", "pinned", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "EventUpdate" ADD CONSTRAINT "EventUpdate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SportEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
