-- AlterTable: passwordHash becomes nullable (Google-only accounts have no password)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable: add googleId (Google "sub"); nullable so password-only users keep NULL
ALTER TABLE "User" ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
