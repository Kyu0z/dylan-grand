ALTER TABLE "User"
    ADD COLUMN "googleId" VARCHAR(255),
    ADD COLUMN "avatarUrl" VARCHAR(2048),
    ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "hasLocalPassword" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

CREATE TABLE "GoogleAuthChallenge" (
    "nonce" VARCHAR(64) NOT NULL,
    "origin" VARCHAR(300) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleAuthChallenge_pkey" PRIMARY KEY ("nonce")
);
CREATE INDEX "GoogleAuthChallenge_expiresAt_idx" ON "GoogleAuthChallenge"("expiresAt");
