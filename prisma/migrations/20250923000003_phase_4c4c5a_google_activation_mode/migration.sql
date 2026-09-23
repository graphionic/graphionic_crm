-- AlterTable — Phase 4C.4C.5A Limited Activation Architecture
ALTER TABLE "GoogleCollectionConfig" ADD COLUMN "activationMode" TEXT NOT NULL DEFAULT 'DISABLED';
ALTER TABLE "GoogleCollectionConfig" ADD COLUMN "canaryScopes" JSONB;
ALTER TABLE "GoogleCollectionConfig" ADD COLUMN "canaryPerRunRequestLimit" INTEGER DEFAULT 3;
ALTER TABLE "GoogleCollectionConfig" ADD COLUMN "canaryDailyRequestLimit" INTEGER DEFAULT 5;
ALTER TABLE "GoogleCollectionConfig" ADD COLUMN "canaryMonthlyRequestLimit" INTEGER;
