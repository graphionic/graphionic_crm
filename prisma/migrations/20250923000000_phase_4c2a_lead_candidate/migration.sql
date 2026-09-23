-- CreateEnum
CREATE TYPE "LeadCandidateStatus" AS ENUM ('DISCOVERED', 'NEEDS_ENRICHMENT', 'VERIFICATION_PENDING', 'QUALIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "collectorRunId" TEXT;

-- CreateTable
CREATE TABLE "LeadCandidate" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "externalType" TEXT,
    "companyName" TEXT NOT NULL,
    "businessCategory" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "postcode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "discoverySourceId" TEXT,
    "discoveryRunId" TEXT NOT NULL,
    "status" "LeadCandidateStatus" NOT NULL DEFAULT 'DISCOVERED',
    "rejectionReason" TEXT,
    "enrichmentAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastEnrichmentAt" TIMESTAMP(3),
    "enrichmentProvider" TEXT,
    "qualifiedLeadId" TEXT,
    "rawTags" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadCandidate_qualifiedLeadId_key" ON "LeadCandidate"("qualifiedLeadId");

-- CreateIndex
CREATE INDEX "LeadCandidate_status_idx" ON "LeadCandidate"("status");

-- CreateIndex
CREATE INDEX "LeadCandidate_discoveryRunId_idx" ON "LeadCandidate"("discoveryRunId");

-- CreateIndex
CREATE INDEX "LeadCandidate_businessCategory_idx" ON "LeadCandidate"("businessCategory");

-- CreateIndex
CREATE INDEX "LeadCandidate_city_idx" ON "LeadCandidate"("city");

-- CreateIndex
CREATE INDEX "LeadCandidate_qualifiedLeadId_idx" ON "LeadCandidate"("qualifiedLeadId");

-- CreateIndex
CREATE INDEX "LeadCandidate_discoverySourceId_idx" ON "LeadCandidate"("discoverySourceId");

-- CreateIndex
CREATE INDEX "LeadCandidate_externalId_idx" ON "LeadCandidate"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCandidate_discoverySourceId_externalType_externalId_key" ON "LeadCandidate"("discoverySourceId", "externalType", "externalId");

-- CreateIndex
CREATE INDEX "Lead_collectorRunId_idx" ON "Lead"("collectorRunId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_collectorRunId_fkey" FOREIGN KEY ("collectorRunId") REFERENCES "CollectorRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCandidate" ADD CONSTRAINT "LeadCandidate_discoverySourceId_fkey" FOREIGN KEY ("discoverySourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCandidate" ADD CONSTRAINT "LeadCandidate_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "CollectorRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCandidate" ADD CONSTRAINT "LeadCandidate_qualifiedLeadId_fkey" FOREIGN KEY ("qualifiedLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
