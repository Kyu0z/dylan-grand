ALTER TABLE "HotelSettings"
  ADD COLUMN "phone" VARCHAR(32),
  ADD COLUMN "address" VARCHAR(300),
  ADD COLUMN "descriptionEn" VARCHAR(2000),
  ADD COLUMN "descriptionVi" VARCHAR(2000);
ALTER TABLE "RoomType"
  ADD COLUMN "descriptionEn" VARCHAR(2000),
  ADD COLUMN "descriptionVi" VARCHAR(2000),
  ADD COLUMN "sizeSqm" INTEGER,
  ADD COLUMN "bedsEn" VARCHAR(100),
  ADD COLUMN "bedsVi" VARCHAR(100),
  ADD COLUMN "viewEn" VARCHAR(100),
  ADD COLUMN "viewVi" VARCHAR(100),
  ADD COLUMN "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Guest"
  ADD COLUMN "preferences" VARCHAR(1000),
  ADD COLUMN "favoriteRoomCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TABLE "ContactInquiry" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(180) NOT NULL,
  "topic" VARCHAR(60) NOT NULL,
  "message" VARCHAR(2000) NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactInquiry_resolved_createdAt_idx" ON "ContactInquiry"("resolved", "createdAt");

ALTER TABLE "RoomType"
  ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "FolioAdjustment"
  ADD COLUMN "idempotencyKey" VARCHAR(100);
CREATE UNIQUE INDEX "FolioAdjustment_idempotencyKey_key" ON "FolioAdjustment"("idempotencyKey");
