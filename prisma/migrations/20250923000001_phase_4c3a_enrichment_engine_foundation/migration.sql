-- CreateEnum
CREATE TYPE "EnrichmentJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'VERIFICATION_PENDING', 'COMPLETED', 'FAILED', 'EXHAUSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnrichmentAttemptStatus" AS ENUM ('STARTED', 'SUCCESS', 'NO_RESULT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "ProviderCredential" ADD COLUMN     "dailyLimit" INTEGER,
ADD COLUMN     "monthlyLimit" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "EnrichmentConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyCandidateLimit" INTEGER NOT NULL DEFAULT 100,
    "batchSize" INTEGER NOT NULL DEFAULT 25,
    "maxAttemptsPerCandidate" INTEGER NOT NULL DEFAULT 3,
    "retryCooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "jobLockDurationMinutes" INTEGER NOT NULL DEFAULT 10,
    "providerDailyCreditLimit" INTEGER,
    "providerMonthlyCreditLimit" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrichmentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentJob" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "EnrichmentJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lockExpiresAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "resultEmail" TEXT,
    "resultDomain" TEXT,
    "resultWebsite" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrichmentJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "providerCredentialId" TEXT,
    "providerType" TEXT,
    "providerLabel" TEXT,
    "status" "EnrichmentAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "emailFound" TEXT,
    "domainFound" TEXT,
    "websiteFound" TEXT,
    "failureReason" TEXT,
    "providerResponseCode" TEXT,
    "costUnits" DOUBLE PRECISION,
    "creditsUsed" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrichmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrichmentConfig_key_key" ON "EnrichmentConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EnrichmentJob_candidateId_key" ON "EnrichmentJob"("candidateId");

-- CreateIndex
CREATE INDEX "EnrichmentJob_status_idx" ON "EnrichmentJob"("status");

-- CreateIndex
CREATE INDEX "EnrichmentJob_nextAttemptAt_idx" ON "EnrichmentJob"("nextAttemptAt");

-- CreateIndex
CREATE INDEX "EnrichmentJob_priority_idx" ON "EnrichmentJob"("priority");

-- CreateIndex
CREATE INDEX "EnrichmentJob_lockedBy_idx" ON "EnrichmentJob"("lockedBy");

-- CreateIndex
CREATE INDEX "EnrichmentJob_lockExpiresAt_idx" ON "EnrichmentJob"("lockExpiresAt");

-- CreateIndex
CREATE INDEX "EnrichmentJob_candidateId_idx" ON "EnrichmentJob"("candidateId");

-- CreateIndex
CREATE INDEX "EnrichmentAttempt_jobId_idx" ON "EnrichmentAttempt"("jobId");

-- CreateIndex
CREATE INDEX "EnrichmentAttempt_candidateId_idx" ON "EnrichmentAttempt"("candidateId");

-- CreateIndex
CREATE INDEX "EnrichmentAttempt_providerCredentialId_idx" ON "EnrichmentAttempt"("providerCredentialId");

-- CreateIndex
CREATE INDEX "EnrichmentAttempt_status_idx" ON "EnrichmentAttempt"("status");

-- CreateIndex
CREATE INDEX "EnrichmentAttempt_startedAt_idx" ON "EnrichmentAttempt"("startedAt");

-- CreateIndex
CREATE INDEX "EnrichmentAttempt_providerType_idx" ON "EnrichmentAttempt"("providerType");

-- AddForeignKey
ALTER TABLE "EnrichmentJob" ADD CONSTRAINT "EnrichmentJob_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "LeadCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrichmentAttempt" ADD CONSTRAINT "EnrichmentAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "EnrichmentJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrichmentAttempt" ADD CONSTRAINT "EnrichmentAttempt_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "LeadCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrichmentAttempt" ADD CONSTRAINT "EnrichmentAttempt_providerCredentialId_fkey" FOREIGN KEY ("providerCredentialId") REFERENCES "ProviderCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

