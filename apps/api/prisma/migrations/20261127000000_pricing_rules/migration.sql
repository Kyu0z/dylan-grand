BEGIN;

ALTER TABLE "HotelSettings" ADD COLUMN "weekendEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "weekendSurchargeVnd" INTEGER NOT NULL DEFAULT 1000000;
CREATE TABLE "SpecialRatePeriod" ("id" TEXT NOT NULL PRIMARY KEY, "name" VARCHAR(120) NOT NULL, "startDate" DATE NOT NULL, "endDate" DATE NOT NULL, "amountVnd" INTEGER NOT NULL);
ALTER TABLE "DailyRate" ADD COLUMN "periodId" TEXT;
CREATE INDEX "DailyRate_periodId_idx" ON "DailyRate"("periodId");
ALTER TABLE "DailyRate" ADD CONSTRAINT "DailyRate_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "SpecialRatePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "RatePlanPolicy" ("code" "RatePlan" NOT NULL PRIMARY KEY, "discountPercent" INTEGER NOT NULL, "freeCancellationHours" INTEGER, "lateFee" VARCHAR(20) NOT NULL, "noShowFee" VARCHAR(20) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true);
INSERT INTO "RatePlanPolicy" ("code", "discountPercent", "freeCancellationHours", "lateFee", "noShowFee") VALUES ('FLEXIBLE', 0, 48, 'FIRST_NIGHT', 'FIRST_NIGHT'), ('NON_REFUNDABLE', 10, NULL, 'FULL', 'FULL');
ALTER TABLE "Booking" ADD COLUMN "ratePolicySnapshot" JSONB;
UPDATE "Booking" SET "ratePolicySnapshot" = CASE WHEN "ratePlan" = 'FLEXIBLE' THEN '{"code":"FLEXIBLE","discountPercent":0,"freeCancellationHours":48,"lateFee":"FIRST_NIGHT","noShowFee":"FIRST_NIGHT","active":true}'::jsonb ELSE '{"code":"NON_REFUNDABLE","discountPercent":10,"freeCancellationHours":null,"lateFee":"FULL","noShowFee":"FULL","active":true}'::jsonb END;

ALTER TABLE "HotelSettings" ADD CONSTRAINT "HotelSettings_weekendSurcharge_check" CHECK ("weekendSurchargeVnd" >= 0 AND "weekendSurchargeVnd" <= 2000000000);
ALTER TABLE "SpecialRatePeriod" ADD CONSTRAINT "SpecialRatePeriod_dates_price_check" CHECK ("endDate" >= "startDate" AND "endDate" - "startDate" < 366 AND "amountVnd" > 0 AND "amountVnd" <= 2000000000);
ALTER TABLE "RatePlanPolicy" ADD CONSTRAINT "RatePlanPolicy_valid_check" CHECK ("discountPercent" BETWEEN 0 AND 99 AND ("freeCancellationHours" IS NULL OR "freeCancellationHours" BETWEEN 0 AND 8760) AND "lateFee" IN ('FIRST_NIGHT', 'FULL', 'NONE') AND "noShowFee" IN ('FIRST_NIGHT', 'FULL', 'NONE'));

COMMIT;
