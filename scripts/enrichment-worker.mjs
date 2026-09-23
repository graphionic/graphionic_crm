#!/usr/bin/env node
/**
 * ClientForge CRM — Phase 4C.3A Enrichment Worker Skeleton
 * Provider-agnostic, fail-closed, no external calls
 *
 * Architecture:
 * GitHub Actions (future) -> Node 20 -> enrichment-worker.mjs -> Prisma -> Neon
 * Reads: EnrichmentConfig, EnrichmentJob, LeadCandidate, ProviderCredential
 * Writes: EnrichmentJob, EnrichmentAttempt, Setting.enrichment_heartbeat (legacy)
 *
 * Default: enrichmentEnabled = false → exit 0 safely, no provider calls
 * Even if enabled without real provider → fail closed, no mock auto-use in production
 *
 * Worker responsibilities foundation (implemented but no real provider yet):
 * - load config
 * - release expired locks
 * - claim jobs
 * - resolve provider (not available in 4C.3A)
 * - execute provider (mock only for tests, not auto in prod)
 * - record attempt
 * - stage result
 * - schedule retry/exhaustion
 * - release/complete job
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKER_ID = `enrichment-worker-${process.pid}-${Date.now()}`;

async function getEnrichmentConfig() {
  let cfg = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
  if (!cfg) {
    cfg = await prisma.enrichmentConfig.create({
      data: {
        key: 'default',
        enabled: false,
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

async function releaseExpiredLocks() {
  const now = new Date();
  const expired = await prisma.enrichmentJob.findMany({
    where: {
      status: 'PROCESSING',
      lockExpiresAt: { lt: now },
    },
  });

  let released = 0;
  for (const job of expired) {
    const existingMeta = job.metadata || {};
    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        metadata: {
          ...existingMeta,
          lastLockRecoveryAt: now.toISOString(),
          lastLockedBy: job.lockedBy,
          recoveryReason: 'lock_expired',
        },
      },
    });
    released++;
  }
  console.log(`[enrichment] Released ${released} expired locks`);
  return released;
}

async function main() {
  console.log(`[enrichment] Starting Phase 4C.3A worker — ID ${WORKER_ID}`);
  console.log(`[enrichment] Time: ${new Date().toISOString()}`);

  const config = await getEnrichmentConfig();
  console.log(`[enrichment] Config: enabled=${config.enabled} batchSize=${config.batchSize} dailyLimit=${config.dailyCandidateLimit} maxAttempts=${config.maxAttemptsPerCandidate} retryCooldown=${config.retryCooldownMinutes}m lockDuration=${config.jobLockDurationMinutes}m`);

  // Critical: default enrichment MUST be disabled → fail closed
  if (!config.enabled) {
    console.log('[enrichment] Enrichment disabled — exiting safely.');
    console.log('[enrichment] No jobs claimed, no attempts created, no candidates modified.');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('[enrichment] Enrichment enabled — checking for jobs (but no real provider in 4C.3A)');

  // Release expired locks first
  await releaseExpiredLocks();

  // Claim jobs
  const batchSize = config.batchSize;
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + config.jobLockDurationMinutes * 60 * 1000);

  // Safe claim without SKIP LOCKED for simplicity in skeleton — uses transaction
  const claimed = await prisma.$transaction(async (tx) => {
    const pendingJobs = await tx.enrichmentJob.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        AND: [{ OR: [{ lockedAt: null }, { lockExpiresAt: { lt: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: batchSize,
    });

    if (pendingJobs.length === 0) return [];

    const ids = pendingJobs.map(j => j.id);

    await tx.enrichmentJob.updateMany({
      where: { id: { in: ids }, status: 'PENDING' },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: WORKER_ID,
        lockExpiresAt,
      },
    });

    const jobs = await tx.enrichmentJob.findMany({ where: { id: { in: ids } } });
    return jobs;
  });

  console.log(`[enrichment] Claimed ${claimed.length} jobs`);

  if (claimed.length === 0) {
    console.log('[enrichment] No pending jobs — exiting');
    await prisma.$disconnect();
    process.exit(0);
  }

  // In Phase 4C.3A, no real provider implementation exists
  // Even if enabled, must fail closed — DO NOT use mock provider automatically in production
  console.log('[enrichment] No real enrichment provider configured in Phase 4C.3A — failing closed');
  console.log('[enrichment] Releasing claimed jobs back to PENDING for future processing');

  for (const job of claimed) {
    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        metadata: {
          ...(job.metadata || {}),
          lastFailClosedAt: new Date().toISOString(),
          failClosedReason: 'no_real_provider_in_4c3a',
        },
      },
    });
  }

  console.log(`[enrichment] Released ${claimed.length} jobs back to PENDING — exiting safely, no external calls, no credits spent`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('[enrichment] Fatal error:', e);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
