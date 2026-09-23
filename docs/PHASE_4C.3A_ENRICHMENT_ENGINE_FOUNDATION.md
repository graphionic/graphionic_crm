# Phase 4C.3A — Enrichment Engine Foundation (No External Provider Calls)

**Date:** 2026-09-23  
**Status:** Implemented, tested, build passing, production-safe  
**HEAD:** ec8598d33a8dbcf6d1fa527fcf2ac90530b75f8b (collector 4C.2C) + 4C.3A enrichment foundation  
**Migration:** `20250923000001_phase_4c3a_enrichment_engine_foundation` — additive only, no DROP/TRUNCATE

## Objective
Build provider-agnostic enrichment architecture to process `LeadCandidate NEEDS_ENRICHMENT` through controlled lifecycle. Future pipeline: `NEEDS → Enrichment Job → Provider Selection → Attempt → Potential Email/Domain/Website → VERIFICATION_PENDING → TRUE_NO_SITE verification → QUALIFIED → Lead`. Phase stops BEFORE real external provider execution.

**Core principle:** Discovery and enrichment separate. Collector remains independently reliable. Do NOT put enrichment API calls inside `collector-worker.mjs`.

## Strict Do NOT (Verified)
- No integration with Hunter/Dropcontact/Apollo/Snov/OpenAI/Google Places/Maps
- No external enrichment API calls, no credits spent
- No auto enrich/qualify production candidates
- No production Leads created by enrichment in this phase
- No collector/GitHub triggers, no rotation/CollectorState modification
- No weakening of TRUE_NO_SITE/hasLiveWebsite/email-domain verification
- No historical CollectorRun metadata modification
- No candidate/Lead deletion, no DB reset, no destructive migration
- No hardcoded API keys, no secrets to client/logs
- No reuse of collector worker as enrichment worker

## Architecture

### Models
- **EnrichmentConfig** (`key` default, `enabled` default false, `dailyCandidateLimit` 100, `batchSize` 25, `maxAttemptsPerCandidate` 3, `retryCooldownMinutes` 60, `jobLockDurationMinutes` 10, `providerDailyCreditLimit`, `providerMonthlyCreditLimit`, metadata, timestamps)
- **EnrichmentJob** (`id`, `candidateId` UNIQUE, `status` PENDING PROCESSING VERIFICATION_PENDING COMPLETED FAILED EXHAUSTED CANCELLED, `priority`, `attemptCount`, `maxAttempts`, `nextAttemptAt`, `lockedAt`, `lockedBy`, `lockExpiresAt`, `lastAttemptAt`, `completedAt`, `resultEmail`, `resultDomain`, `resultWebsite`, `failureReason`, `metadata`, timestamps, relations candidate)
- **EnrichmentAttempt** (`id`, `jobId`, `candidateId`, `providerCredentialId` nullable, `providerType`, `providerLabel`, `status` STARTED SUCCESS NO_RESULT FAILED SKIPPED, `startedAt`, `finishedAt`, `durationMs`, `emailFound`, `domainFound`, `websiteFound`, `failureReason`, `providerResponseCode`, `costUnits`, `creditsUsed`, `metadata`, `createdAt`, relations job candidate providerCredential)
- **ProviderCredential extension** — added `priority` default 50, `dailyLimit`, `monthlyLimit`, relation `enrichmentAttempts`
- **LeadCandidate** — relations `enrichmentJob`, `enrichmentAttemptRecords`, preserve discovery identity [discoverySourceId externalType externalId] and qualifiedLeadId

Enums:
- `EnrichmentJobStatus`: PENDING PROCESSING VERIFICATION_PENDING COMPLETED FAILED EXHAUSTED CANCELLED
- `EnrichmentAttemptStatus`: STARTED SUCCESS NO_RESULT FAILED SKIPPED

### Config & Budget Foundation
- Uses `EnrichmentConfig` separate from `CollectorConfig` (CollectorConfig remains for collector)
- Global enabled default false → fail-closed
- Daily candidate limit, batch size, max attempts per candidate, retry cooldown, lock duration, provider daily/monthly credit limits
- No secret storage in enrichment tables

### Services (`src/lib/enrichment.ts`)
- `getEnrichmentConfig()` — upsert default disabled
- `isEnrichmentEnabled()` — boolean
- `isCandidateEligibleForEnrichment(candidateId)` — checks NEEDS_ENRICHMENT, empty email/website, qualifiedLeadId null, no existing job
- `ensureEnrichmentJob(candidateId)` — idempotent, P2002 safe, only NEEDS no email no website not qualified no active job, no external call, no status change to QUALIFIED, no Lead
- `seedEnrichmentJobs({limit category city candidateIds})` — deterministic order priority/createdAt/id, only clean queue NEEDS empty email/website qualifiedLeadId null no existing jobs, DO NOT execute prod in this phase
- `claimNextEnrichmentJobs(workerId, limit)` — wrapper to safe variant, only PENDING nextAttemptAt <= now not locked, transaction safe, sets PROCESSING lockedAt lockedBy lockExpiresAt, avoids findMany then update race
- `claimNextEnrichmentJobsSafe()` — optimistic locking transaction
- `claimNextEnrichmentJobsWithSkipLocked()` — raw SQL FOR UPDATE SKIP LOCKED variant for future, parameterized
- `releaseExpiredEnrichmentLocks()` — PROCESSING lockExpiresAt < now → PENDING preserve attempt history, metadata recoveryReason
- `startEnrichmentAttempt()`, `completeEnrichmentAttempt()`, `failEnrichmentAttempt()`, `recordNoResult()` — lifecycle only, no API
- `stageEnrichmentResult(jobId, {email domain website confidence source})` — provider-neutral staging to job result fields, no immediate Lead
- `transitionJobToVerificationPending(jobId)` — job VERIFICATION_PENDING, candidate VERIFICATION_PENDING, no Lead
- `stageMockResultAndTransitionToVerification()` — test-only helper
- `handleJobRetryOrExhaustion(jobId)` — if attempts < max → FAILED/NO_RESULT → PENDING nextAttemptAt future, else EXHAUSTED candidate remains NEEDS not REJECTED
- `MockEnrichmentProvider` — no network, no credentials, deterministic SUCCESS/NO_RESULT/FAILED, test-only not auto prod
- `getEnrichmentStats()` — counts total pending processing verificationPending completed failed exhausted eligibleNow + daily attempts success noResult failed credits used

### Worker Skeleton (`scripts/enrichment-worker.mjs`)
- Fail-closed: loads EnrichmentConfig, if enabled != true logs "Enrichment disabled — exiting safely." exit 0, no jobs claimed, no attempts, no candidates modified
- If enabled: releases expired locks, claims jobs safe transaction, if enabled but no real provider in 4C.3A releases jobs back to PENDING with failClosedReason no_real_provider_in_4c3a, no external calls, no credits, no mock auto in prod
- Responsibilities documented: load config, release locks, claim, resolve provider, execute, record, stage, retry/exhaustion
- Node --check passing

### Admin Observability
- APIs:
  - `GET /api/enrichment/stats` — stats + safe config + providerCount, no secrets
  - `GET /api/enrichment/config` — safe config only (id key enabled limits timestamps)
  - `GET /api/enrichment/jobs` — paginated jobs with candidate include companyName city businessCategory, status filter, page/pageSize, safe
- UI: Collector Control Center enrichment tab:
  - Tab extended to include "enrichment" with count totalJobs
  - Read-only metrics: Eligible Candidates, Pending, Processing, Verification Pending, Completed, Failed, Exhausted, Attempts Today, Success, NoResult, Failed, Credits Used
  - Config summary: Enrichment Disabled, Daily Limit, Batch Size, MaxAttempts, Retry Cooldown, Lock Duration, provider section "No provider configured"
  - Jobs table with status filter, pagination, Job/Candidate, Status badge, Attempts, Next Attempt, Locked, Result, Created
  - No Enrich Now/Retry/Qualify buttons (read-only)
- Candidate detail drawer enhanced:
  - Job status, Attempt count, Next attempt, Last attempt (lockedBy), Provider, Result summary
  - Recent attempts list (5 max) with status providerType email/domain
  - No action buttons, read-only
  - Existing fields preserved: Business, Pipeline Timeline, Contact, Location, Discovery, Qualification, Raw Source Data

### Verification Boundary
- ENRICHMENT SUCCESS != QUALIFIED
- Must pass email validation generic policy website checks hasLiveWebsite TRUE_NO_SITE before QUALIFIED
- Enrichment result staged to job result fields → VERIFICATION_PENDING → future verification worker checks TRUE_NO_SITE → QUALIFIED → Lead
- Tech debt: verification currently lives in collector-worker.mjs; future enrichment verification should reuse hasLiveWebsite check to prevent email domain with live website being marked as NO_SITE (Emma Clinic case)

### Security
- No secret storage in EnrichmentJob/Attempt metadata
- ProviderCredential encryptedValue never returned to client UI (existing getProviderCredentials masks)
- Enrichment APIs return safe config only, no encryptedValue
- No secrets logged

## Test Matrix A-L (All Passing)

Script: `scripts/test-enrichment-4c3a.mjs`

- **A Job idempotency:** ensureEnrichmentJob twice same candidate → 1 job, same id
- **B Ineligible website:** candidate with website present → no job, reason website_present
- **C Ineligible email:** candidate with email present → no job, reason email_present
- **D Qualified candidate:** candidate QUALIFIED or qualifiedLeadId present → no job
- **E Claim locking:** claim 2 jobs with 2 workers → different jobs, no duplicate processing
- **F Expired lock recovery:** PROCESSING job with lockExpiresAt past → releaseExpired → PENDING, locked fields null, metadata recoveryReason
- **G NO_RESULT retry:** attempt NO_RESULT, attemptCount < max → PENDING nextAttemptAt future
- **H FAILED retry:** attempt FAILED, attemptCount < max → PENDING nextAttemptAt future
- **I Exhaustion:** attemptCount = maxAttempts → EXHAUSTED, candidate remains NEEDS_ENRICHMENT not REJECTED
- **J Staged success VERIFICATION_PENDING no Lead:** stage result SUCCESS → job VERIFICATION_PENDING, candidate VERIFICATION_PENDING, Lead count unchanged
- **K Disabled worker exits 0:** config enabled=false → worker logs "Enrichment disabled — exiting safely." exit 0
- **L No real provider fail closed:** config enabled=true but no provider, job claimed → released back to PENDING with failClosedReason no_real_provider_in_4c3a, no external calls, no credits

Production data safety after migration verified:
- Lead 88, Candidate 156, Run 8, State 8, NEEDS 108, REJECTED 48, QUALIFIED 0, Job 0, Attempt 0
- NEEDS with website 0
- EnrichmentConfig enabled=false batch 25 daily 100 maxAttempts 3
- No candidate status change, no jobs seeded

Migration safety:
- SQL additive only: CREATE TYPE, ALTER TABLE ADD COLUMN, CREATE TABLE, CREATE INDEX, ADD FOREIGN KEY
- No DROP, no TRUNCATE
- `prisma migrate status` up to date, 2 migrations

Build validation:
- `prisma validate` OK
- `node --check enrichment-worker.mjs` OK
- `npm run build` passing (Next.js 15.5.25)

## Future 4C.3B Plan
- Real provider selection (Hunter, Dropcontact, Apollo, Snov) using ProviderCredential priority/dailyLimit/monthlyLimit
- Provider execution with credit tracking, costUnits, creditsUsed
- Budget enforcement: dailyCandidateLimit, providerDailyCreditLimit, providerMonthlyCreditLimit
- Verification worker: hasLiveWebsite check for staged domain/website, email generic policy, TRUE_NO_SITE
- Qualification: VERIFICATION_PENDING → QUALIFIED → Lead creation
- Scheduling: GitHub Actions workflow_dispatch fail-closed, only when enabled
- Observability: credits used, provider health, retry metrics
- No auto-seeding until provider ready and budget approved

## Files
- `prisma/schema.prisma` — EnrichmentConfig, EnrichmentJob, EnrichmentAttempt, enums, ProviderCredential extension, LeadCandidate relations
- `prisma/migrations/20250923000001_phase_4c3a_enrichment_engine_foundation/migration.sql` — additive migration
- `src/lib/enrichment.ts` — enrichment engine foundation
- `scripts/enrichment-worker.mjs` — fail-closed worker skeleton
- `src/app/api/enrichment/stats/route.ts` — stats API
- `src/app/api/enrichment/config/route.ts` — config API
- `src/app/api/enrichment/jobs/route.ts` — jobs API
- `src/app/(app)/settings/lead-collection/client.tsx` — enrichment tab + candidate drawer enhancement
- `src/lib/collector.ts` — getLeadCandidateById enhanced with enrichmentJob and enrichmentAttemptRecords
- `scripts/test-enrichment-4c3a.mjs` — test matrix A-L
- `docs/PHASE_4C.3A_ENRICHMENT_ENGINE_FOUNDATION.md` — this doc
