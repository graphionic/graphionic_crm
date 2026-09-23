/**
 * ClientForge CRM — Phase 4C.3A.1 Enrichment Engine Foundation Hardened
 * Provider-agnostic, no external calls, fail-closed, budget-safe
 * Concurrency hardened: single canonical claim, ownership token via lockedBy
 *
 * Core principle: Discovery and enrichment are separate systems.
 *
 * Security:
 * - Never store full secret/API key in metadata
 * - Never expose encryptedValue to client
 * - Never log secrets
 * - Provider responses not blindly persisted
 * - Ownership guarded mutations prevent stale worker overwrite
 */

import { PrismaClient, EnrichmentJobStatus, EnrichmentAttemptStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------- Custom errors

export class JobOwnershipLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JOB_OWNERSHIP_LOST';
  }
}

// ---------------------------------------------------------------- Config helpers

export async function getEnrichmentConfig() {
  let cfg = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
  if (!cfg) {
    cfg = await prisma.enrichmentConfig.create({
      data: {
        key: 'default',
        enabled: false, // CRITICAL: default disabled
        dailyCandidateLimit: 100,
        batchSize: 25,
        maxAttemptsPerCandidate: 3,
        retryCooldownMinutes: 60,
        jobLockDurationMinutes: 10,
      },
    });
  }
  return cfg;
}

export async function isEnrichmentEnabled(): Promise<boolean> {
  const cfg = await getEnrichmentConfig();
  return cfg.enabled === true;
}

// ---------------------------------------------------------------- Result staging type (provider-neutral)

export type EnrichmentResult = {
  email?: string | null;
  domain?: string | null;
  website?: string | null;
  confidence?: number; // 0-1
  source?: string; // provider name or mock
};

// ---------------------------------------------------------------- Job eligibility

function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

export async function isCandidateEligibleForEnrichment(candidateId: string) {
  const candidate = await prisma.leadCandidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      status: true,
      email: true,
      website: true,
      qualifiedLeadId: true,
      enrichmentJob: { select: { id: true, status: true } },
    },
  });
  if (!candidate) return { eligible: false, reason: 'candidate_not_found' };
  if (candidate.status !== 'NEEDS_ENRICHMENT') return { eligible: false, reason: `status_not_needs_enrichment:${candidate.status}` };
  if (!isEmpty(candidate.email)) return { eligible: false, reason: 'email_present' };
  if (!isEmpty(candidate.website)) return { eligible: false, reason: 'website_present' };
  if (candidate.qualifiedLeadId) return { eligible: false, reason: 'already_qualified' };
  if (candidate.enrichmentJob) return { eligible: false, reason: `job_exists:${candidate.enrichmentJob.status}` };
  return { eligible: true, candidate };
}

// ---------------------------------------------------------------- STEP 5 — Job creation service

/**
 * ensureEnrichmentJob(candidateId)
 * Idempotent — calling twice must NOT create two jobs
 * Does NOT call external provider, does NOT change candidate to QUALIFIED, does NOT create Lead
 */
export async function ensureEnrichmentJob(candidateId: string) {
  const eligibility = await isCandidateEligibleForEnrichment(candidateId);
  if (!eligibility.eligible) {
    if (eligibility.reason?.startsWith('job_exists')) {
      const existing = await prisma.enrichmentJob.findUnique({ where: { candidateId } });
      return { created: false, job: existing, reason: eligibility.reason };
    }
    return { created: false, job: null, reason: eligibility.reason };
  }

  const config = await getEnrichmentConfig();

  try {
    const job = await prisma.enrichmentJob.create({
      data: {
        candidateId,
        status: EnrichmentJobStatus.PENDING,
        priority: 50,
        attemptCount: 0,
        maxAttempts: config.maxAttemptsPerCandidate,
        nextAttemptAt: new Date(),
      },
    });
    return { created: true, job, reason: null };
  } catch (e: any) {
    if (e.code === 'P2002') {
      const existing = await prisma.enrichmentJob.findUnique({ where: { candidateId } });
      return { created: false, job: existing, reason: 'job_exists_race' };
    }
    throw e;
  }
}

// ---------------------------------------------------------------- STEP 6 — Safe queue seeding

export type SeedOptions = {
  limit: number;
  category?: string;
  city?: string;
  candidateIds?: string[];
};

export async function seedEnrichmentJobs(options: SeedOptions) {
  const { limit, category, city, candidateIds } = options;
  if (limit <= 0) return { created: 0, jobs: [] };

  const where: any = {
    status: 'NEEDS_ENRICHMENT',
    qualifiedLeadId: null,
    enrichmentJob: null,
    OR: [{ email: null }, { email: '' }],
    AND: [{ OR: [{ website: null }, { website: '' }] }],
  };

  if (category) where.businessCategory = category;
  if (city) where.city = city;
  if (candidateIds && candidateIds.length > 0) where.id = { in: candidateIds };

  const candidates = await prisma.leadCandidate.findMany({
    where,
    select: { id: true, email: true, website: true, createdAt: true, businessCategory: true, city: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit * 2,
  });

  const eligible = candidates.filter(c => isEmpty(c.email) && isEmpty(c.website)).slice(0, limit);

  const config = await getEnrichmentConfig();
  const jobs: any[] = [];
  let created = 0;

  for (const cand of eligible) {
    try {
      const job = await prisma.enrichmentJob.create({
        data: {
          candidateId: cand.id,
          status: EnrichmentJobStatus.PENDING,
          priority: 50,
          attemptCount: 0,
          maxAttempts: config.maxAttemptsPerCandidate,
          nextAttemptAt: new Date(),
        },
      });
      jobs.push(job);
      created++;
    } catch (e: any) {
      if (e.code === 'P2002') continue;
      throw e;
    }
  }

  return { created, jobs, eligibleCandidates: eligible.length };
}

// ---------------------------------------------------------------- STEP 7 — Claim / Lock architecture — CANONICAL IMPLEMENTATION
// Single canonical function: claimNextEnrichmentJobsSafe
// Wrapper claimNextEnrichmentJobs calls safe variant
// SKIP LOCKED variant removed for ambiguity reduction — documented as future option, not needed for current scale
// If high concurrency needed, reintroduce with clear naming and use same ownership guarantees

/**
 * CANONICAL CLAIM — claimNextEnrichmentJobsSafe
 * Guarantees:
 * 1. only PENDING eligible jobs selected (nextAttemptAt <= now or null, not locked or expired)
 * 2. conditional update verifies job is still claimable (status PENDING AND (lockedAt null OR lockExpiresAt < now))
 * 3. lockedBy set to workerId (unique execution-scoped token)
 * 4. status becomes PROCESSING
 * 5. final returned rows MUST satisfy lockedBy = workerId AND status = PROCESSING
 * 6. worker never treats row owned by another worker as claimed (updated.count check + lockedBy filter)
 * 7. limit >1 safe, deterministic ordering priority desc createdAt asc id asc
 *
 * Ownership token: lockedBy serves as ownership token because WORKER_ID is unique per process/run:
 * format enrichment-${GITHUB_RUN_ID || 'local'}-${GITHUB_RUN_ATTEMPT || '0'}-${pid}-${timestamp}-${randomUUID}
 * This ensures stale worker cannot reuse same token after lock expiry.
 */
export async function claimNextEnrichmentJobs(workerId: string, limit: number) {
  return claimNextEnrichmentJobsSafe(workerId, limit);
}

export async function claimNextEnrichmentJobsSafe(workerId: string, limit: number) {
  const config = await getEnrichmentConfig();
  const lockDurationMs = config.jobLockDurationMinutes * 60 * 1000;
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + lockDurationMs);

  return await prisma.$transaction(async (tx) => {
    const pendingJobs = await tx.enrichmentJob.findMany({
      where: {
        status: EnrichmentJobStatus.PENDING,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        AND: [{ OR: [{ lockedAt: null }, { lockExpiresAt: { lt: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });

    if (pendingJobs.length === 0) return [];

    const ids = pendingJobs.map(j => j.id);

    // Atomic update — only update if still PENDING and not locked (optimistic)
    const updated = await tx.enrichmentJob.updateMany({
      where: {
        id: { in: ids },
        status: EnrichmentJobStatus.PENDING,
        OR: [{ lockedAt: null }, { lockExpiresAt: { lt: now } }],
      },
      data: {
        status: EnrichmentJobStatus.PROCESSING,
        lockedAt: now,
        lockedBy: workerId,
        lockExpiresAt,
      },
    });

    if (updated.count === 0) return [];

    // Only return jobs actually owned by this worker
    const claimed = await tx.enrichmentJob.findMany({
      where: { id: { in: ids }, lockedBy: workerId, status: EnrichmentJobStatus.PROCESSING },
    });
    return claimed;
  });
}

// ---------------------------------------------------------------- STEP 8 — Stale lock recovery

export async function releaseExpiredEnrichmentLocks() {
  const now = new Date();
  const expired = await prisma.enrichmentJob.findMany({
    where: {
      status: EnrichmentJobStatus.PROCESSING,
      lockExpiresAt: { lt: now },
    },
    select: { id: true, lockedBy: true, lockExpiresAt: true, metadata: true },
  });

  let released = 0;
  for (const job of expired) {
    const existingMeta = (job.metadata as any) || {};
    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        status: EnrichmentJobStatus.PENDING,
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        metadata: {
          ...existingMeta,
          lastLockRecoveryAt: now.toISOString(),
          lastLockedBy: job.lockedBy,
          lastLockExpiresAt: job.lockExpiresAt?.toISOString(),
          recoveryReason: 'lock_expired',
        },
      },
    });
    released++;
  }

  return { released, jobs: expired.map(j => j.id) };
}

// ---------------------------------------------------------------- STEP 9 — Attempt recording foundation — OWNERSHIP GUARDED
// LEGACY BYPASS REMOVED in 4C.3B.1.1 — provider attempts MUST go through reserveEnrichmentBudgetAtomically
// Canonical invariant: A provider-backed enrichment execution MUST NOT create STARTED directly.
// Only production path: executeEnrichmentAttempt → reserveEnrichmentBudgetAtomically → STARTED → COMMIT → adapter.enrich
// This function is now intentionally disabled to prevent budget bypass. Use reserveEnrichmentBudgetAtomically from enrichment-providers.ts

export async function startEnrichmentAttempt(params: {
  jobId: string;
  candidateId: string;
  providerCredentialId?: string | null;
  providerType?: string | null;
  providerLabel?: string | null;
  ownerToken: string;
}) {
  throw new Error(
    `LEGACY_BYPASS_REMOVED: startEnrichmentAttempt() is disabled in 4C.3B.1.1. Provider-backed attempts must go through reserveEnrichmentBudgetAtomically() in src/lib/enrichment-providers.ts which enforces global budget, provider budget, ownership, duplicate STARTED guard, and row locking. If you need a test helper, use direct Prisma create in isolated test code with TEST_ prefix.`
  );
}

// Internal TEST-ONLY helper for 4C.3A legacy tests that need to create attempts without budget (isolated, not for provider execution)
// Not exported as production path, but kept for backward compat inside this module if needed — use with TEST_ prefix only
async function _legacyStartEnrichmentAttemptInternal(params: {
  jobId: string;
  candidateId: string;
  providerCredentialId?: string | null;
  providerType?: string | null;
  providerLabel?: string | null;
  ownerToken: string;
}) {
  const { jobId, candidateId, providerCredentialId, providerType, providerLabel, ownerToken } = params;
  if (!ownerToken) throw new Error('ownerToken required');
  return await prisma.$transaction(async (tx) => {
    const job = await tx.enrichmentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== EnrichmentJobStatus.PROCESSING || job.lockedBy !== ownerToken) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}, current owner ${job.lockedBy} status ${job.status}`);
    }
    const attempt = await tx.enrichmentAttempt.create({
      data: {
        jobId,
        candidateId,
        providerCredentialId: providerCredentialId || null,
        providerType: providerType || null,
        providerLabel: providerLabel || null,
        status: EnrichmentAttemptStatus.STARTED,
        startedAt: new Date(),
        metadata: { ownerToken, startedBy: ownerToken, startedAt: new Date().toISOString(), legacyTestOnly: true },
      },
    });
    const updated = await tx.enrichmentJob.updateMany({
      where: { id: jobId, lockedBy: ownerToken, status: EnrichmentJobStatus.PROCESSING },
      data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
    });
    if (updated.count !== 1) throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: failed to increment attemptCount for job ${jobId}, ownership lost`);
    return attempt;
  });
}

export async function completeEnrichmentAttempt(params: {
  attemptId: string;
  emailFound?: string | null;
  domainFound?: string | null;
  websiteFound?: string | null;
  costUnits?: number | null;
  creditsUsed?: number | null;
  providerResponseCode?: string | null;
  metadata?: any;
  ownerToken: string;
}) {
  const { attemptId, emailFound, domainFound, websiteFound, costUnits, creditsUsed, providerResponseCode, metadata, ownerToken } = params;
  if (!ownerToken) throw new Error('ownerToken required');

  return await prisma.$transaction(async (tx) => {
    const attempt = await tx.enrichmentAttempt.findUnique({
      where: { id: attemptId },
      include: { job: true },
    });
    if (!attempt) throw new Error(`Attempt ${attemptId} not found`);

    const attemptOwner = (attempt.metadata as any)?.ownerToken;
    if (attemptOwner && attemptOwner !== ownerToken) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: attempt ${attemptId} owned by ${attemptOwner}, not ${ownerToken}`);
    }
    if (attempt.status !== EnrichmentAttemptStatus.STARTED) {
      throw new Error(`Attempt ${attemptId} not in STARTED state, current ${attempt.status}`);
    }
    if (attempt.job.lockedBy !== ownerToken || attempt.job.status !== EnrichmentJobStatus.PROCESSING) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${attempt.jobId} not owned by ${ownerToken}, current owner ${attempt.job.lockedBy}`);
    }

    const now = new Date();
    const durationMs = attempt.startedAt ? now.getTime() - attempt.startedAt.getTime() : null;

    const updatedAttempt = await tx.enrichmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: EnrichmentAttemptStatus.SUCCESS,
        finishedAt: now,
        durationMs,
        emailFound: emailFound || null,
        domainFound: domainFound || null,
        websiteFound: websiteFound || null,
        costUnits: costUnits ?? null,
        creditsUsed: creditsUsed ?? null,
        providerResponseCode: providerResponseCode || null,
        metadata: {
          ...(attempt.metadata as any),
          ...metadata,
          completedBy: ownerToken,
          ownerToken,
        },
      },
    });

    return updatedAttempt;
  });
}

export async function failEnrichmentAttempt(params: {
  attemptId: string;
  failureReason: string;
  providerResponseCode?: string | null;
  costUnits?: number | null;
  metadata?: any;
  ownerToken: string;
}) {
  const { attemptId, failureReason, providerResponseCode, costUnits, metadata, ownerToken } = params;
  if (!ownerToken) throw new Error('ownerToken required');

  return await prisma.$transaction(async (tx) => {
    const attempt = await tx.enrichmentAttempt.findUnique({
      where: { id: attemptId },
      include: { job: true },
    });
    if (!attempt) throw new Error(`Attempt ${attemptId} not found`);
    const attemptOwner = (attempt.metadata as any)?.ownerToken;
    if (attemptOwner && attemptOwner !== ownerToken) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: attempt ${attemptId} owned by ${attemptOwner}, not ${ownerToken}`);
    }
    if (attempt.job.lockedBy !== ownerToken || attempt.job.status !== EnrichmentJobStatus.PROCESSING) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${attempt.jobId} not owned by ${ownerToken}`);
    }
    if (attempt.status !== EnrichmentAttemptStatus.STARTED) {
      throw new Error(`Attempt ${attemptId} not in STARTED state`);
    }

    const now = new Date();
    const durationMs = attempt.startedAt ? now.getTime() - attempt.startedAt.getTime() : null;

    const updated = await tx.enrichmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: EnrichmentAttemptStatus.FAILED,
        finishedAt: now,
        durationMs,
        failureReason,
        providerResponseCode: providerResponseCode || null,
        costUnits: costUnits ?? null,
        metadata: {
          ...(attempt.metadata as any),
          ...metadata,
          failedBy: ownerToken,
          ownerToken,
        },
      },
    });

    return updated;
  });
}

export async function recordNoResult(params: {
  attemptId: string;
  providerResponseCode?: string | null;
  costUnits?: number | null;
  metadata?: any;
  ownerToken: string;
}) {
  const { attemptId, providerResponseCode, costUnits, metadata, ownerToken } = params;
  if (!ownerToken) throw new Error('ownerToken required');

  return await prisma.$transaction(async (tx) => {
    const attempt = await tx.enrichmentAttempt.findUnique({
      where: { id: attemptId },
      include: { job: true },
    });
    if (!attempt) throw new Error(`Attempt ${attemptId} not found`);
    const attemptOwner = (attempt.metadata as any)?.ownerToken;
    if (attemptOwner && attemptOwner !== ownerToken) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: attempt ${attemptId} owned by ${attemptOwner}, not ${ownerToken}`);
    }
    if (attempt.job.lockedBy !== ownerToken || attempt.job.status !== EnrichmentJobStatus.PROCESSING) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${attempt.jobId} not owned by ${ownerToken}`);
    }
    if (attempt.status !== EnrichmentAttemptStatus.STARTED) {
      throw new Error(`Attempt ${attemptId} not in STARTED state`);
    }

    const now = new Date();
    const durationMs = attempt.startedAt ? now.getTime() - attempt.startedAt.getTime() : null;

    const updated = await tx.enrichmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: EnrichmentAttemptStatus.NO_RESULT,
        finishedAt: now,
        durationMs,
        providerResponseCode: providerResponseCode || null,
        costUnits: costUnits ?? null,
        metadata: {
          ...(attempt.metadata as any),
          ...metadata,
          noResultBy: ownerToken,
          ownerToken,
        },
      },
    });

    return updated;
  });
}

// ---------------------------------------------------------------- STEP 10 — Result staging — OWNERSHIP GUARDED

export async function stageEnrichmentResult(jobId: string, result: EnrichmentResult, ownerToken: string) {
  if (!ownerToken) throw new Error('ownerToken required');

  const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (job.lockedBy !== ownerToken || job.status !== EnrichmentJobStatus.PROCESSING) {
    throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}, current owner ${job.lockedBy} status ${job.status}`);
  }

  const updated = await prisma.enrichmentJob.updateMany({
    where: { id: jobId, lockedBy: ownerToken, status: EnrichmentJobStatus.PROCESSING },
    data: {
      resultEmail: result.email || null,
      resultDomain: result.domain || null,
      resultWebsite: result.website || null,
      metadata: {
        ...((job.metadata as any) || {}),
        lastResult: {
          ...result,
          stagedAt: new Date().toISOString(),
          stagedBy: ownerToken,
        },
      },
    },
  });

  if (updated.count !== 1) {
    throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: failed to stage result for job ${jobId}`);
  }

  return await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
}

export async function transitionJobToVerificationPending(jobId: string, ownerToken: string) {
  if (!ownerToken) throw new Error('ownerToken required');

  return await prisma.$transaction(async (tx) => {
    const job = await tx.enrichmentJob.findUnique({ where: { id: jobId }, include: { candidate: true } });
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.lockedBy !== ownerToken || job.status !== EnrichmentJobStatus.PROCESSING) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}, current ${job.lockedBy} status ${job.status}`);
    }

    const updatedJob = await tx.enrichmentJob.update({
      where: { id: jobId },
      data: {
        status: EnrichmentJobStatus.VERIFICATION_PENDING,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        metadata: {
          ...((job.metadata as any) || {}),
          verificationTransitionAt: new Date().toISOString(),
          verificationTransitionBy: ownerToken,
        },
      },
    });

    await tx.leadCandidate.update({
      where: { id: job.candidateId },
      data: { status: 'VERIFICATION_PENDING' },
    });

    return updatedJob;
  });
}

// For tests only — stage mock result and transition candidate to VERIFICATION_PENDING with staged email
// Now requires ownerToken for hardened path, but provide fallback for legacy tests
export async function stageMockResultAndTransitionToVerification(jobId: string, result: EnrichmentResult, ownerToken?: string) {
  // If ownerToken not provided, use job's current lockedBy (for backward compat in simple tests)
  let token = ownerToken;
  if (!token) {
    const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
    token = job?.lockedBy || 'test-owner';
    // If job not locked, temporarily lock it for test
    if (!job?.lockedBy) {
      await prisma.enrichmentJob.update({
        where: { id: jobId },
        data: { lockedBy: token, lockedAt: new Date(), lockExpiresAt: new Date(Date.now() + 10 * 60 * 1000), status: EnrichmentJobStatus.PROCESSING },
      });
    }
  }
  const staged = await stageEnrichmentResult(jobId, result, token);
  const verificationJob = await transitionJobToVerificationPending(jobId, token);
  return verificationJob;
}

// ---------------------------------------------------------------- STEP 12 — Exhaustion policy — OWNERSHIP GUARDED

export async function handleJobRetryOrExhaustion(jobId: string, ownerToken: string) {
  if (!ownerToken) throw new Error('ownerToken required');

  const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);
  // For retry/exhaustion, job should be PROCESSING and owned, or if already PENDING due to recovery, old owner should not retry
  if (job.status === EnrichmentJobStatus.PROCESSING && job.lockedBy !== ownerToken) {
    throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}, current ${job.lockedBy}`);
  }
  // If job is already PENDING/EXHAUSTED, check if this owner is still valid — if lockedBy is null and status PENDING, it means it was recovered, old owner should fail
  if (job.status !== EnrichmentJobStatus.PROCESSING && job.lockedBy !== null && job.lockedBy !== ownerToken) {
    throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}`);
  }
  if (job.status === EnrichmentJobStatus.PROCESSING && job.lockedBy === null) {
    throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} lock cleared, ownership lost`);
  }

  const config = await getEnrichmentConfig();
  const maxAttempts = job.maxAttempts ?? config.maxAttemptsPerCandidate;
  const retryCooldownMinutes = config.retryCooldownMinutes;

  if (job.attemptCount < maxAttempts) {
    const nextAttemptAt = new Date(Date.now() + retryCooldownMinutes * 60 * 1000);
    // Conditional update with ownership check
    const updated = await prisma.enrichmentJob.updateMany({
      where: { id: jobId, lockedBy: ownerToken, status: EnrichmentJobStatus.PROCESSING },
      data: {
        status: EnrichmentJobStatus.PENDING,
        nextAttemptAt,
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        metadata: {
          ...((job.metadata as any) || {}),
          lastRetryAt: new Date().toISOString(),
          lastRetryBy: ownerToken,
        },
      },
    });
    if (updated.count !== 1) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: failed to retry job ${jobId}`);
    }
    const refreshed = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
    return { action: 'retry' as const, job: refreshed, nextAttemptAt };
  } else {
    const updated = await prisma.enrichmentJob.updateMany({
      where: { id: jobId, lockedBy: ownerToken, status: EnrichmentJobStatus.PROCESSING },
      data: {
        status: EnrichmentJobStatus.EXHAUSTED,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        failureReason: `Max attempts ${maxAttempts} reached`,
        metadata: {
          ...((job.metadata as any) || {}),
          exhaustedAt: new Date().toISOString(),
          exhaustedBy: ownerToken,
        },
      },
    });
    if (updated.count !== 1) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: failed to exhaust job ${jobId}`);
    }
    const refreshed = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
    return { action: 'exhausted' as const, job: refreshed };
  }
}

// ---------------------------------------------------------------- STEP 13 — Mock/No-op provider (test-only, no network, no credits)

export type MockProviderOutcome = 'SUCCESS' | 'NO_RESULT' | 'FAILED';

export class MockEnrichmentProvider {
  providerType = 'mock';
  providerLabel = 'mock-test';

  async enrich(candidate: { id: string; companyName: string; city?: string | null }, outcome: MockProviderOutcome = 'SUCCESS'): Promise<{ status: EnrichmentAttemptStatus; result?: EnrichmentResult; failureReason?: string }> {
    if (outcome === 'SUCCESS') {
      const fakeEmail = `contact@${candidate.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.test`;
      return {
        status: EnrichmentAttemptStatus.SUCCESS,
        result: {
          email: fakeEmail,
          domain: `${candidate.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.test`,
          website: null,
          confidence: 0.9,
          source: 'mock',
        },
      };
    } else if (outcome === 'NO_RESULT') {
      return { status: EnrichmentAttemptStatus.NO_RESULT };
    } else {
      return { status: EnrichmentAttemptStatus.FAILED, failureReason: 'mock_failure' };
    }
  }
}

// ---------------------------------------------------------------- Observability helpers

export async function getEnrichmentStats() {
  const [totalJobs, pending, processing, verificationPending, completed, failed, exhausted, cancelled] = await Promise.all([
    prisma.enrichmentJob.count(),
    prisma.enrichmentJob.count({ where: { status: EnrichmentJobStatus.PENDING } }),
    prisma.enrichmentJob.count({ where: { status: EnrichmentJobStatus.PROCESSING } }),
    prisma.enrichmentJob.count({ where: { status: EnrichmentJobStatus.VERIFICATION_PENDING } }),
    prisma.enrichmentJob.count({ where: { status: EnrichmentJobStatus.COMPLETED } }),
    prisma.enrichmentJob.count({ where: { status: EnrichmentJobStatus.FAILED } }),
    prisma.enrichmentJob.count({ where: { status: EnrichmentJobStatus.EXHAUSTED } }),
    prisma.enrichmentJob.count({ where: { status: EnrichmentJobStatus.CANCELLED } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [attemptsToday, successToday, noResultToday, failedToday] = await Promise.all([
    prisma.enrichmentAttempt.count({ where: { createdAt: { gte: today } } }),
    prisma.enrichmentAttempt.count({ where: { createdAt: { gte: today }, status: EnrichmentAttemptStatus.SUCCESS } }),
    prisma.enrichmentAttempt.count({ where: { createdAt: { gte: today }, status: EnrichmentAttemptStatus.NO_RESULT } }),
    prisma.enrichmentAttempt.count({ where: { createdAt: { gte: today }, status: EnrichmentAttemptStatus.FAILED } }),
  ]);

  const creditsAgg = await prisma.enrichmentAttempt.aggregate({
    where: { createdAt: { gte: today } },
    _sum: { creditsUsed: true, costUnits: true },
  });

  const eligibleCandidates = await prisma.leadCandidate.count({
    where: {
      status: 'NEEDS_ENRICHMENT',
      qualifiedLeadId: null,
      enrichmentJob: null,
      OR: [{ email: null }, { email: '' }],
      AND: [{ OR: [{ website: null }, { website: '' }] }],
    },
  });

  return {
    totalJobs,
    pending,
    processing,
    verificationPending,
    completed,
    failed,
    exhausted,
    cancelled,
    attemptsToday,
    successToday,
    noResultToday,
    failedToday,
    creditsUsedToday: creditsAgg._sum.creditsUsed || 0,
    costUnitsToday: creditsAgg._sum.costUnits || 0,
    eligibleCandidates,
  };
}
