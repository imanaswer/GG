-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "location" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "sports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesOrganized" INTEGER NOT NULL DEFAULT 0,
    "attendanceRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "skillLevel" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "timing" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "totalSeats" INTEGER NOT NULL,
    "seatsLeft" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "slots" INTEGER NOT NULL,
    "slotsLeft" INTEGER NOT NULL,
    "skillLevel" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "cost" TEXT NOT NULL,
    "costAmount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "attendanceRecorded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "batchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "coachNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camp" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "dates" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "distance" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "priceDisplay" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "skillLevel" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "maxParticipants" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "included" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatToBring" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizer" TEXT NOT NULL,
    "organizerContact" TEXT NOT NULL,
    "coaches" JSONB NOT NULL DEFAULT '[]',
    "dailySchedule" JSONB NOT NULL DEFAULT '[]',
    "testimonials" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Camp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampRegistration" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "childAge" INTEGER NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "distance" TEXT NOT NULL DEFAULT '',
    "participants" INTEGER NOT NULL DEFAULT 0,
    "maxParticipants" INTEGER NOT NULL,
    "prizePool" TEXT NOT NULL,
    "entryFee" TEXT NOT NULL,
    "entryFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Registration Open',
    "description" TEXT NOT NULL,
    "format" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizer" TEXT NOT NULL,
    "organizerContact" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schedule" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamName" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_userId_key" ON "Coach"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_gameId_userId_key" ON "GamePlayer"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_coachId_key" ON "Review"("userId", "coachId");

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampRegistration" ADD CONSTRAINT "CampRegistration_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampRegistration" ADD CONSTRAINT "CampRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SportEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
