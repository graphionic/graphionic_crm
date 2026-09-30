-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_leadId_fkey";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy child tables first
DROP TABLE IF EXISTS "EnrichmentAttempt" CASCADE;
DROP TABLE IF EXISTS "EnrichmentJob" CASCADE;
DROP TABLE IF EXISTS "LeadCandidate" CASCADE;
DROP TABLE IF EXISTS "CollectorState" CASCADE;
DROP TABLE IF EXISTS "GoogleApiUsage" CASCADE;
DROP TABLE IF EXISTS "GoogleApiCache" CASCADE;
DROP TABLE IF EXISTS "GoogleCollectionConfig" CASCADE;
DROP TABLE IF EXISTS "CollectorRun" CASCADE;
DROP TABLE IF EXISTS "DataSource" CASCADE;
DROP TABLE IF EXISTS "LeadCategory" CASCADE;
DROP TABLE IF EXISTS "CollectorLocation" CASCADE;
DROP TABLE IF EXISTS "ProviderCredential" CASCADE;
DROP TABLE IF EXISTS "CollectorConfig" CASCADE;
DROP TABLE IF EXISTS "EnrichmentConfig" CASCADE;
DROP TABLE IF EXISTS "CollectionRule" CASCADE;

-- Drop obsolete Lead relation column
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "collectorRunId";

-- Drop legacy enums
DROP TYPE IF EXISTS "EnrichmentJobStatus" CASCADE;
DROP TYPE IF EXISTS "EnrichmentAttemptStatus" CASCADE;
DROP TYPE IF EXISTS "LeadCandidateStatus" CASCADE;
DROP TYPE IF EXISTS "GoogleOperation" CASCADE;
DROP TYPE IF EXISTS "GoogleRequestStatus" CASCADE;
DROP TYPE IF EXISTS "GoogleErrorClassification" CASCADE;
