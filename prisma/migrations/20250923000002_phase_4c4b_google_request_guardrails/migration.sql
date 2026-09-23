-- CreateEnum
CREATE TYPE "GoogleOperation" AS ENUM ('TEXT_SEARCH', 'NEARBY_SEARCH', 'PLACE_DETAILS', 'GEOCODING');

-- CreateEnum
CREATE TYPE "GoogleRequestStatus" AS ENUM ('RESERVED', 'SUCCESS', 'NO_RESULT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoogleErrorClassification" AS ENUM ('AUTH_ERROR', 'QUOTA_EXCEEDED', 'RATE_LIMITED', 'SERVER_ERROR', 'INVALID_REQUEST', 'NETWORK_ERROR', 'UNKNOWN');

-- CreateTable
CREATE TABLE "GoogleCollectionConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "failClosed" BOOLEAN NOT NULL DEFAULT true,
    "perRunRequestLimit" INTEGER NOT NULL DEFAULT 10,
    "dailyRequestLimit" INTEGER NOT NULL DEFAULT 50,
    "monthlyRequestLimit" INTEGER NOT NULL DEFAULT 500,
    "dailyCostUnitLimit" INTEGER,
    "monthlyCostUnitLimit" INTEGER,
    "cacheEnabled" BOOLEAN NOT NULL DEFAULT true,
    "queryCacheTtlHours" INTEGER NOT NULL DEFAULT 24,
    "placeDetailsCacheTtlHours" INTEGER NOT NULL DEFAULT 168,
    "retryLimit" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCollectionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleApiUsage" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "operation" "GoogleOperation" NOT NULL,
    "status" "GoogleRequestStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "requestSentAt" TIMESTAMP(3),
    "requestUnits" INTEGER NOT NULL DEFAULT 1,
    "estimatedCostUnits" INTEGER,
    "actualCostUnits" INTEGER,
    "collectorRunId" TEXT NOT NULL,
    "workerId" TEXT,
    "queryFingerprint" TEXT NOT NULL,
    "placeId" TEXT,
    "errorClassification" "GoogleErrorClassification",
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleApiCache" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "queryFingerprint" TEXT NOT NULL,
    "operation" "GoogleOperation" NOT NULL,
    "responseMetadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "placeId" TEXT,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleApiCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCollectionConfig_key_key" ON "GoogleCollectionConfig"("key");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_sourceId_reservedAt_idx" ON "GoogleApiUsage"("sourceId", "reservedAt");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_collectorRunId_reservedAt_idx" ON "GoogleApiUsage"("collectorRunId", "reservedAt");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_status_reservedAt_idx" ON "GoogleApiUsage"("status", "reservedAt");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_operation_status_reservedAt_idx" ON "GoogleApiUsage"("operation", "status", "reservedAt");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_sourceId_queryFingerprint_operation_status_idx" ON "GoogleApiUsage"("sourceId", "queryFingerprint", "operation", "status");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_placeId_idx" ON "GoogleApiUsage"("placeId");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_workerId_idx" ON "GoogleApiUsage"("workerId");

-- CreateIndex
CREATE INDEX "GoogleApiUsage_queryFingerprint_idx" ON "GoogleApiUsage"("queryFingerprint");

-- CreateIndex
CREATE INDEX "GoogleApiCache_expiresAt_idx" ON "GoogleApiCache"("expiresAt");

-- CreateIndex
CREATE INDEX "GoogleApiCache_operation_idx" ON "GoogleApiCache"("operation");

-- CreateIndex
CREATE INDEX "GoogleApiCache_queryFingerprint_idx" ON "GoogleApiCache"("queryFingerprint");

-- CreateIndex
CREATE INDEX "GoogleApiCache_sourceId_idx" ON "GoogleApiCache"("sourceId");

-- CreateIndex
CREATE INDEX "GoogleApiCache_placeId_idx" ON "GoogleApiCache"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleApiCache_sourceId_queryFingerprint_operation_key" ON "GoogleApiCache"("sourceId", "queryFingerprint", "operation");

-- AddForeignKey
ALTER TABLE "GoogleApiUsage" ADD CONSTRAINT "GoogleApiUsage_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleApiUsage" ADD CONSTRAINT "GoogleApiUsage_collectorRunId_fkey" FOREIGN KEY ("collectorRunId") REFERENCES "CollectorRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleApiCache" ADD CONSTRAINT "GoogleApiCache_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
