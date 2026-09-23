#!/usr/bin/env node
/**
 * ClientForge CRM — Phase 4C.3A.1 Enrichment Worker Skeleton Hardened
 * Provider-agnostic, fail-closed, no external calls
 * Single canonical claim implementation, ownership token via lockedBy
 *
 * Architecture:
 * GitHub Actions (future) -> Node 20 -> enrichment-worker.mjs -> Prisma -> Neon
 *
 * Default: enrichmentEnabled = false → exit 0 safely, no provider calls
 * Even if enabled without real provider → fail closed BEFORE claiming, no mock auto-use
 *
 * Worker ID uniqueness: enrichment-${GITHUB_RUN_ID || 'local'}-${GITHUB_RUN_ATTEMPT || '0'}-${pid}-${timestamp}-${randomUUID}
 * Ensures lockedBy serves as unique execution-scoped ownership token
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function generateWorkerId() {
  const runId = process.env.GITHUB_RUN_ID || 'local';
  const attempt = process.env.GITHUB_RUN_ATTEMPT || '0';
  const pid = process.pid;
  const ts = Date.now();
  const uuid = crypto.randomUUID();
  return `enrichment-${runId}-${attempt}-${pid}-${ts}-${uuid}`;
}

const WORKER_ID = generateWorkerId();

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

async function hasRealProvider() {
  // Phase 4C.3A.1: No real provider exists yet
  // In future, check ProviderCredential count for enrichment providers with enabled=true
  // For now, always return false to enforce fail-closed
  // This check happens BEFORE claiming to avoid PROCESSING->PENDING churn
  const count = await prisma.providerCredential.count({
    where: {
      enabled: true,
      provider: { in: ['hunter', 'dropcontact', 'apollo', 'snov', 'enrichment'] },
    },
  });
  // Even if count >0, in 4C.3A.1 we still have no real implementation, so fail closed
  // The count check is for future 4C.3B, but we log it
  return false; // No real provider in 4C.3A.1
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

// Canonical claim implementation — single source of truth, matches src/lib/enrichment.ts claimNextEnrichmentJobsSafe
async function claimNextJobs(workerId, limit) {
  const config = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
  const lockDurationMs = (config?.jobLockDurationMinutes || 10) * 60 * 1000;
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + lockDurationMs);

  return await prisma.$transaction(async (tx) => {
    const pendingJobs = await tx.enrichmentJob.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        AND: [{ OR: [{ lockedAt: null }, { lockExpiresAt: { lt: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });

    if (pendingJobs.length === 0) return [];

    const ids = pendingJobs.map(j => j.id);

    const updated = await tx.enrichmentJob.updateMany({
      where: {
        id: { in: ids },
        status: 'PENDING',
        OR: [{ lockedAt: null }, { lockExpiresAt: { lt: now } }],
      },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        lockExpiresAt,
      },
    });

    if (updated.count === 0) return [];

    const claimed = await tx.enrichmentJob.findMany({
      where: { id: { in: ids }, lockedBy: workerId, status: 'PROCESSING' },
    });
    return claimed;
  });
}

async function main() {
  console.log(`[enrichment] Starting Phase 4C.3A.1 worker — ID ${WORKER_ID}`);
  console.log(`[enrichment] Time: ${new Date().toISOString()}`);
  console.log(`[enrichment] Worker ID format: enrichment-\${GITHUB_RUN_ID}-\${GITHUB_RUN_ATTEMPT}-\${pid}-\${timestamp}-\${uuid} — unique per execution, serves as ownership token via lockedBy`);

  const config = await getEnrichmentConfig();
  console.log(`[enrichment] Config: enabled=${config.enabled} batchSize=${config.batchSize} dailyLimit=${config.dailyCandidateLimit} maxAttempts=${config.maxAttemptsPerCandidate} retryCooldown=${config.retryCooldownMinutes}m lockDuration=${config.jobLockDurationMinutes}m`);

  // Critical: default enrichment MUST be disabled → fail closed BEFORE any claim
  if (!config.enabled) {
    console.log('[enrichment] Enrichment disabled — exiting safely.');
    console.log('[enrichment] No jobs claimed, no attempts created, no candidates modified.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Fail-closed BEFORE claiming: check real provider availability
  const realProviderAvailable = await hasRealProvider();
  if (!realProviderAvailable) {
    console.log('[enrichment] No real enrichment provider configured in Phase 4C.3A.1 — failing closed BEFORE claiming');
    console.log('[enrichment] No jobs claimed, no external calls, no credits spent, exiting safely');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log('[enrichment] Enrichment enabled and provider available — checking for jobs');

  // Release expired locks only after confirming provider available (or before, but after enabled check)
  await releaseExpiredLocks();

  // Claim jobs using canonical implementation
  const claimed = await claimNextJobs(WORKER_ID, config.batchSize);

  console.log(`[enrichment] Claimed ${claimed.length} jobs with ownership token ${WORKER_ID}`);

  if (claimed.length === 0) {
    console.log('[enrichment] No pending jobs — exiting');
    await prisma.$disconnect();
    process.exit(0);
  }

  // In Phase 4C.3A.1, no real provider implementation exists even after hasRealProvider check (returns false above, so we never reach here)
  // This code path is for future 4C.3B when real provider exists
  console.log('[enrichment] Processing claimed jobs (future 4C.3B logic)');

  // For now, release back to PENDING (should not happen because hasRealProvider returns false)
  for (const job of claimed) {
    await prisma.enrichmentJob.updateMany({
      where: { id: job.id, lockedBy: WORKER_ID, status: 'PROCESSING' },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
        lockExpiresAt: null,
        metadata: {
          ...(job.metadata || {}),
          lastFailClosedAt: new Date().toISOString(),
          failClosedReason: 'no_real_provider_in_4c3a_1',
        },
      },
    });
  }

  console.log(`[enrichment] Released ${claimed.length} jobs back to PENDING — exiting safely`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('[enrichment] Fatal error:', e);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
