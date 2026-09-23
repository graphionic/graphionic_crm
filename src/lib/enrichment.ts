/**
 * ClientForge CRM — Phase 4C.3A Enrichment Engine Foundation
 * Provider-agnostic, no external calls, fail-closed, budget-safe
 *
 * Core principle: Discovery and enrichment are separate systems.
 * Collector: finds businesses, persists LeadCandidate, classifies rejects, creates Leads only when qualified
 * Enrichment: operates ONLY on persisted LeadCandidates requiring enrichment
 *
 * Enums:
 * - EnrichmentJobStatus: PENDING, PROCESSING, VERIFICATION_PENDING, COMPLETED, FAILED, EXHAUSTED, CANCELLED
 * - EnrichmentAttemptStatus: STARTED, SUCCESS, NO_RESULT, FAILED, SKIPPED
 *
 * Security:
 * - Never store full secret/API key in metadata
 * - Never expose encryptedValue to client
 * - Never log secrets
 * - Provider responses not blindly persisted
 */

import { PrismaClient, EnrichmentJobStatus, EnrichmentAttemptStatus } from '@prisma/client';

const prisma = new PrismaClient();

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
    // If job already exists, return it (idempotency)
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
    // Unique constraint violation — another worker created job concurrently, return existing (idempotent)
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
  category?: string; // businessCategory slug
  city?: string;
  candidateIds?: string[];
};

export async function seedEnrichmentJobs(options: SeedOptions) {
  const { limit, category, city, candidateIds } = options;
  if (limit <= 0) return { created: 0, jobs: [] };

  // Select only clean queue: NEEDS_ENRICHMENT, email empty, website empty, qualifiedLeadId null, no existing job
  const where: any = {
    status: 'NEEDS_ENRICHMENT',
    qualifiedLeadId: null,
    enrichmentJob: null,
    OR: [{ email: null }, { email: '' }],
    AND: [
      { OR: [{ website: null }, { website: '' }] },
    ],
  };

  if (category) where.businessCategory = category;
  if (city) where.city = city;
  if (candidateIds && candidateIds.length > 0) where.id = { in: candidateIds };

  // Additional safety: ensure email and website empty (redundant with OR above but explicit)
  // Prisma doesn't support easy empty check, so we filter in query and double-check in code

  const candidates = await prisma.leadCandidate.findMany({
    where,
    select: { id: true, email: true, website: true, createdAt: true, businessCategory: true, city: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // deterministic: createdAt / id
    take: limit * 2, // over-fetch to allow filtering empty strings
  });

  // Filter empty strings precisely
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
      if (e.code === 'P2002') {
        // Already has job, skip
        continue;
      }
      throw e;
    }
  }

  return { created, jobs, eligibleCandidates: eligible.length };
}

// ---------------------------------------------------------------- STEP 7 — Claim / Lock architecture

/**
 * claimNextEnrichmentJobs(workerId, limit)
 * Requirements:
 * - only PENDING jobs
 * - nextAttemptAt <= now OR null
 * - not actively locked
 * When claimed: status=PROCESSING, lockedAt=now, lockedBy=workerId, lockExpiresAt=now+configured duration
 * Safe transaction variant — avoids race via optimistic locking
 * For true SKIP LOCKED, use raw SQL variant claimNextEnrichmentJobsWithSkipLocked if needed (future)
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
        AND: [
          {
            OR: [{ lockedAt: null }, { lockExpiresAt: { lt: now } }],
          },
        ],
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

    const claimed = await tx.enrichmentJob.findMany({ where: { id: { in: ids }, lockedBy: workerId, status: EnrichmentJobStatus.PROCESSING } });
    return claimed;
  });
}

// Raw SQL variant with FOR UPDATE SKIP LOCKED (optional, not used in build to avoid TS error)
// Uses $queryRawUnsafe safely with parameterized limit, and Prisma updateMany for IN clause
export async function claimNextEnrichmentJobsWithSkipLocked(workerId: string, limit: number) {
  const config = await getEnrichmentConfig();
  const lockDurationMs = config.jobLockDurationMinutes * 60 * 1000;
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + lockDurationMs);

  return await prisma.$transaction(async (tx) => {
    const rows = (await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "EnrichmentJob" WHERE status = 'PENDING'::"EnrichmentJobStatus" AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW()) AND ("lockedAt" IS NULL OR "lockExpiresAt" < NOW()) ORDER BY priority DESC, "createdAt" ASC, id ASC LIMIT $1 FOR UPDATE SKIP LOCKED`,
      limit
    )) as any as { id: string }[];

    if (!rows || rows.length === 0) return [];
    const ids = rows.map((r: any) => r.id);
    await tx.enrichmentJob.updateMany({
      where: { id: { in: ids } },
      data: { status: EnrichmentJobStatus.PROCESSING, lockedAt: now, lockedBy: workerId, lockExpiresAt },
    });
    return await tx.enrichmentJob.findMany({ where: { id: { in: ids } } });
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

// ---------------------------------------------------------------- STEP 9 — Attempt recording foundation

export async function startEnrichmentAttempt(params: {
  jobId: string;
  candidateId: string;
  providerCredentialId?: string | null;
  providerType?: string | null;
  providerLabel?: string | null;
}) {
  const { jobId, candidateId, providerCredentialId, providerType, providerLabel } = params;
  const attempt = await prisma.enrichmentAttempt.create({
    data: {
      jobId,
      candidateId,
      providerCredentialId: providerCredentialId || null,
      providerType: providerType || null,
      providerLabel: providerLabel || null,
      status: EnrichmentAttemptStatus.STARTED,
      startedAt: new Date(),
    },
  });

  // Increment attemptCount and update lastAttemptAt
  await prisma.enrichmentJob.update({
    where: { id: jobId },
    data: {
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });

  return attempt;
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
}) {
  const { attemptId, emailFound, domainFound, websiteFound, costUnits, creditsUsed, providerResponseCode, metadata } = params;
  const now = new Date();
  const attempt = await prisma.enrichmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error(`Attempt ${attemptId} not found`);

  const durationMs = attempt.startedAt ? now.getTime() - attempt.startedAt.getTime() : null;

  const updatedAttempt = await prisma.enrichmentAttempt.update({
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
      metadata: metadata || null,
    },
  });

  return updatedAttempt;
}

export async function failEnrichmentAttempt(params: {
  attemptId: string;
  failureReason: string;
  providerResponseCode?: string | null;
  costUnits?: number | null;
  metadata?: any;
}) {
  const { attemptId, failureReason, providerResponseCode, costUnits, metadata } = params;
  const now = new Date();
  const attempt = await prisma.enrichmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error(`Attempt ${attemptId} not found`);
  const durationMs = attempt.startedAt ? now.getTime() - attempt.startedAt.getTime() : null;

  const updated = await prisma.enrichmentAttempt.update({
    where: { id: attemptId },
    data: {
      status: EnrichmentAttemptStatus.FAILED,
      finishedAt: now,
      durationMs,
      failureReason,
      providerResponseCode: providerResponseCode || null,
      costUnits: costUnits ?? null,
      metadata: metadata || null,
    },
  });

  return updated;
}

export async function recordNoResult(params: {
  attemptId: string;
  providerResponseCode?: string | null;
  costUnits?: number | null;
  metadata?: any;
}) {
  const { attemptId, providerResponseCode, costUnits, metadata } = params;
  const now = new Date();
  const attempt = await prisma.enrichmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error(`Attempt ${attemptId} not found`);
  const durationMs = attempt.startedAt ? now.getTime() - attempt.startedAt.getTime() : null;

  const updated = await prisma.enrichmentAttempt.update({
    where: { id: attemptId },
    data: {
      status: EnrichmentAttemptStatus.NO_RESULT,
      finishedAt: now,
      durationMs,
      providerResponseCode: providerResponseCode || null,
      costUnits: costUnits ?? null,
      metadata: metadata || null,
    },
  });

  return updated;
}

// ---------------------------------------------------------------- STEP 10 — Result staging

/**
 * stageEnrichmentResult — provider-neutral staging
 * Does NOT create Lead, does NOT automatically qualify
 * Future flow: Provider result → Job.resultEmail/Domain/Website → Candidate VERIFICATION_PENDING → verification → qualification
 * Phase 4C.3A may implement lifecycle helper for staging a MOCK result in tests, but NOT for production
 */
export async function stageEnrichmentResult(jobId: string, result: EnrichmentResult) {
  const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const updated = await prisma.enrichmentJob.update({
    where: { id: jobId },
    data: {
      resultEmail: result.email || null,
      resultDomain: result.domain || null,
      resultWebsite: result.website || null,
      metadata: {
        ...((job.metadata as any) || {}),
        lastResult: {
          ...result,
          stagedAt: new Date().toISOString(),
        },
      },
    },
  });

  return updated;
}

/**
 * Transition job to VERIFICATION_PENDING after successful staging
 * Candidate transitions to VERIFICATION_PENDING (not QUALIFIED)
 * NO Lead created here
 */
export async function transitionJobToVerificationPending(jobId: string) {
  const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId }, include: { candidate: true } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  // Update job status
  const updatedJob = await prisma.enrichmentJob.update({
    where: { id: jobId },
    data: {
      status: EnrichmentJobStatus.VERIFICATION_PENDING,
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lockExpiresAt: null,
    },
  });

  // Update candidate to VERIFICATION_PENDING
  await prisma.leadCandidate.update({
    where: { id: job.candidateId },
    data: {
      status: 'VERIFICATION_PENDING',
      // Do NOT set email/website yet — verification will decide
      // For mock tests, we may set staged values in separate helper
    },
  });

  return updatedJob;
}

// For tests only — stage mock result and transition candidate to VERIFICATION_PENDING with staged email
export async function stageMockResultAndTransitionToVerification(jobId: string, result: EnrichmentResult) {
  const job = await stageEnrichmentResult(jobId, result);
  const verificationJob = await transitionJobToVerificationPending(jobId);

  // For test purposes, also update candidate with staged email? But keep verification boundary
  // We will NOT automatically create Lead — that is future phase
  // For TEST J, we want candidate to be VERIFICATION_PENDING with resultEmail populated in job, not necessarily in candidate

  return verificationJob;
}

// ---------------------------------------------------------------- STEP 12 — Exhaustion policy

export async function handleJobRetryOrExhaustion(jobId: string) {
  const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const config = await getEnrichmentConfig();
  const maxAttempts = job.maxAttempts ?? config.maxAttemptsPerCandidate;
  const retryCooldownMinutes = config.retryCooldownMinutes;

  if (job.attemptCount < maxAttempts) {
    // Retry: PENDING + nextAttemptAt future
    const nextAttemptAt = new Date(Date.now() + retryCooldownMinutes * 60 * 1000);
    const updated = await prisma.enrichmentJob.update({
      where: { id: jobId },
      data: {
        status: EnrichmentJobStatus.PENDING,
        nextAttemptAt,
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
      },
    });
    return { action: 'retry', job: updated, nextAttemptAt };
  } else {
    // Exhausted
    const updated = await prisma.enrichmentJob.update({
      where: { id: jobId },
      data: {
        status: EnrichmentJobStatus.EXHAUSTED,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        failureReason: `Max attempts ${maxAttempts} reached`,
      },
    });
    // Candidate remains NEEDS_ENRICHMENT (do NOT reject)
    // Do NOT change candidate status
    return { action: 'exhausted', job: updated };
  }
}

// ---------------------------------------------------------------- STEP 13 — Mock/No-op provider (test-only, no network, no credits)

export type MockProviderOutcome = 'SUCCESS' | 'NO_RESULT' | 'FAILED';

export class MockEnrichmentProvider {
  providerType = 'mock';
  providerLabel = 'mock-test';

  async enrich(candidate: { id: string; companyName: string; city?: string | null }, outcome: MockProviderOutcome = 'SUCCESS'): Promise<{ status: EnrichmentAttemptStatus; result?: EnrichmentResult; failureReason?: string }> {
    // No network, no credentials, no credits
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

  // Credits used today (sum)
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
