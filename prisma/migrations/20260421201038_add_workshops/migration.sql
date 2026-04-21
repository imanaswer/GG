-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'single',
    "sessionCount" INTEGER NOT NULL DEFAULT 1,
    "sessionDuration" TEXT NOT NULL DEFAULT '',
    "sessions" JSONB NOT NULL DEFAULT '[]',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "distance" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "priceDisplay" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL DEFAULT 'all',
    "skillLevel" TEXT NOT NULL DEFAULT 'All Levels',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "maxParticipants" INTEGER NOT NULL,
    "instructor" JSONB NOT NULL DEFAULT '{}',
    "testimonials" JSONB NOT NULL DEFAULT '[]',
    "imageUrl" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizer" TEXT NOT NULL,
    "organizerContact" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopRegistration" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantAge" INTEGER,
    "registrationType" TEXT NOT NULL DEFAULT 'adult',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopRegistration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkshopRegistration" ADD CONSTRAINT "WorkshopRegistration_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopRegistration" ADD CONSTRAINT "WorkshopRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
