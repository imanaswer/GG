-- Sign in with Apple (mobile, GameGround Mobile Developer PRD §5.2).
-- Apple's `sub` is the stable per-developer-team user id and is the lookup key for returning
-- users, exactly as googleId is for Google. Nullable: every existing account has no Apple identity,
-- and Postgres treats NULLs as distinct so the unique index does not collide across them.
ALTER TABLE "User" ADD COLUMN "appleId" TEXT;
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
