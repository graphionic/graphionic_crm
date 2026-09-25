#!/usr/bin/env node

/**
 * CLIENTFORGE CRM — PRODUCTION AUTOMATED ENRICHMENT WORKER
 * 
 * Pipeline:
 * LeadCandidate (NEEDS_ENRICHMENT) → scheduled worker → public_web_research
 * → website & email verification → QUALIFIED when warranted → automatic Lead creation
 * 
 * Invariants & Guarantees:
 * 1. Strictly bounded batch size (default 10 candidates per run, configurable in EnrichmentConfig).
 * 2. Fair candidate selection: unattempted candidates prioritized before cooldown retries.
 * 3. Zero paid APIs, zero Google Places API calls, zero browser automation.
 * 4. Qualification invariant: useful business email + confirmed absence of live website = QUALIFIED.
 * 5. Live website discovered → Candidate marked REJECTED (existing_website), never promoted to Lead.
 * 6. Emma Clinic protection: email domain actively verified for absence of live website.
 * 7. Deduplication: prevents duplicate CRM Lead creation for re-encountered businesses.
 * 8. Fail-closed: refuses to execute if global enrichment is disabled in EnrichmentConfig.
 */

import { PrismaClient, EnrichmentJobStatus } from '@prisma/client';
import crypto from 'node:crypto';
import { 
  productionProviderRegistry, 
  executeEnrichmentAttempt 
} from '../src/lib/enrichment-providers.ts';
import { 
  PublicWebResearchAdapter,
  registerPublicWebResearchAdapter 
} from '../src/lib/public-web-research-adapter.ts';
import { 
  getEnrichmentConfig, 
  releaseExpiredEnrichmentLocks, 
  claimNextEnrichmentJobsSafe, 
  handleJobRetryOrExhaustion 
} from '../src/lib/enrichment.ts';

const prisma = new PrismaClient();

// Ensure public_web_research adapter is registered
registerPublicWebResearchAdapter(productionProviderRegistry);

function generateWorkerId() {
  const runId = process.env.GITHUB_RUN_ID || 'local';
  const attempt = process.env.GITHUB_RUN_ATTEMPT || '0';
  const pid = process.pid;
  const ts = Date.now();
  const uuid = crypto.randomUUID().slice(0, 8);
  return `enrichment-${runId}-${attempt}-${pid}-${ts}-${uuid}`;
}

const WORKER_ID = generateWorkerId();

/**
 * Select and queue candidates with fair scheduling:
 * 1. Candidates with enrichmentAttempts === 0 (never attempted) ordered by createdAt ASC.
 * 2. If needed, retried candidates with enrichmentAttempts < maxAttempts AND cooldown elapsed.
 */
async function selectAndQueueEligibleCandidates(limit, config) {
  const now = new Date();
  const cooldownMinutes = config.retryCooldownMinutes || 60;
  const cooldownThreshold = new Date(now.getTime() - cooldownMinutes * 60 * 1000);
  const maxAttempts = config.maxAttemptsPerCandidate || 3;

  // 1. First priority: Fresh unattempted candidates with no existing job
  const freshCandidates = await prisma.leadCandidate.findMany({
    where: {
      status: 'NEEDS_ENRICHMENT',
      qualifiedLeadId: null,
      enrichmentJob: null,
      enrichmentAttempts: 0,
      OR: [{ email: null }, { email: '' }],
      AND: [{ OR: [{ website: null }, { website: '' }] }],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit,
  });

  const queuedCandidateIds = [];

  for (const cand of freshCandidates) {
    try {
      await prisma.enrichmentJob.create({
        data: {
          candidateId: cand.id,
          status: EnrichmentJobStatus.PENDING,
          priority: 50,
          attemptCount: 0,
          maxAttempts,
          nextAttemptAt: now,
        },
      });
      queuedCandidateIds.push(cand.id);
    } catch (e) {
      if (e.code === 'P2002') continue; // race condition handled
      throw e;
    }
  }

  // 2. Second priority: If more jobs needed to reach limit, check for cooled-down retries
  const remainingNeeded = limit - queuedCandidateIds.length;
  if (remainingNeeded > 0) {
    const retryableCandidates = await prisma.leadCandidate.findMany({
      where: {
        status: 'NEEDS_ENRICHMENT',
        qualifiedLeadId: null,
        enrichmentJob: null,
        enrichmentAttempts: { gt: 0, lt: maxAttempts },
        lastEnrichmentAt: { lte: cooldownThreshold },
        OR: [{ email: null }, { email: '' }],
        AND: [{ OR: [{ website: null }, { website: '' }] }],
      },
      orderBy: [{ enrichmentAttempts: 'asc' }, { lastEnrichmentAt: 'asc' }, { createdAt: 'asc' }],
      take: remainingNeeded,
    });

    for (const cand of retryableCandidates) {
      try {
        await prisma.enrichmentJob.create({
          data: {
            candidateId: cand.id,
            status: EnrichmentJobStatus.PENDING,
            priority: 40,
            attemptCount: cand.enrichmentAttempts,
            maxAttempts,
            nextAttemptAt: now,
          },
        });
        queuedCandidateIds.push(cand.id);
      } catch (e) {
        if (e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  return queuedCandidateIds.length;
}

async function runEnrichmentWorker(options = {}) {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('CLIENTFORGE PRODUCTION AUTOMATED ENRICHMENT WORKER');
  console.log('================================================================');
  console.log(`Worker ID: ${WORKER_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const config = await getEnrichmentConfig();
  const batchSize = options.batchSize || config.batchSize || 10;

  console.log(`Configuration:`);
  console.log(` - Global Enabled: ${config.enabled}`);
  console.log(` - Batch Size: ${batchSize} candidates/run`);
  console.log(` - Max Attempts: ${config.maxAttemptsPerCandidate}`);
  console.log(` - Retry Cooldown: ${config.retryCooldownMinutes} minutes`);
  console.log(` - Daily Limit: ${config.dailyCandidateLimit}`);

  // Safety gate: refuse to execute if globally disabled
  if (!config.enabled && !options.allowPocOverride) {
    console.log('\n[SAFETY GATE] Global enrichment is DISABLED in EnrichmentConfig (enabled=false).');
    console.log('[SAFETY GATE] Worker exiting safely with code 0 — 0 candidates modified.');
    return {
      status: 'DISABLED',
      executed: false,
      reason: 'ENRICHMENT_DISABLED',
      selected: 0,
      attempted: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // Safety check: ensure only public_web_research is active
  const googleConfig = await prisma.googleCollectionConfig.findFirst({ where: { key: 'default' } });
  if (googleConfig?.enabled) {
    console.error('\n[SAFETY VIOLATION] Google Places is unexpectedly enabled — failing closed.');
    process.exit(1);
  }

  // Ensure public_web_research provider credential is ready
  let publicCred = await prisma.providerCredential.findFirst({
    where: { provider: 'public_web_research' },
  });
  if (!publicCred) {
    publicCred = await prisma.providerCredential.create({
      data: {
        provider: 'public_web_research',
        label: 'Public Web Research (Zero-Cost)',
        encryptedValue: 'PUBLIC_RESEARCH_NO_SECRET',
        keyHint: 'PUBLIC',
        enabled: true,
        status: 'connected',
        priority: 100,
      },
    });
  }

  // 1. Release expired locks from past crashed runs
  const recoveredLocks = await releaseExpiredEnrichmentLocks();
  if (recoveredLocks.released > 0) {
    console.log(`\nRecovered ${recoveredLocks.released} expired job locks.`);
  }

  // 2. Queue fresh candidates to fill batch
  const queuedCount = await selectAndQueueEligibleCandidates(batchSize, config);
  console.log(`\nCandidate Queueing: seeded ${queuedCount} ready candidate jobs.`);

  // 3. Atomically claim batch of jobs
  const claimedJobs = await claimNextEnrichmentJobsSafe(WORKER_ID, batchSize);
  console.log(`Claimed ${claimedJobs.length} jobs with worker token ${WORKER_ID}`);

  if (claimedJobs.length === 0) {
    console.log('\nNo pending eligible enrichment jobs found — exiting safely.');
    return {
      status: 'IDLE',
      executed: true,
      selected: 0,
      attempted: 0,
      durationMs: Date.now() - startTime,
    };
  }

  const adapter = productionProviderRegistry.resolve('public_web_research') || new PublicWebResearchAdapter();

  const stats = {
    selected: claimedJobs.length,
    attempted: 0,
    identityMatched: 0,
    emailsDiscovered: 0,
    acceptedBusinessEmails: 0,
    liveWebsitesDiscovered: 0,
    confirmedNoSiteCount: 0,
    qualified: 0,
    leadsCreated: 0,
    duplicatePrevented: 0,
    unresolved: 0,
    rejected: 0,
    errors: 0,
    failureReasons: {},
    processed: [],
  };

  // 4. Process each claimed candidate sequentially to respect database connection limits
  for (let i = 0; i < claimedJobs.length; i++) {
    const job = claimedJobs[i];
    const candidate = await prisma.leadCandidate.findUnique({
      where: { id: job.candidateId },
      include: { discoverySource: true },
    });

    if (!candidate) {
      console.log(`[${i + 1}/${claimedJobs.length}] Candidate ${job.candidateId} not found, skipping.`);
      continue;
    }

    console.log(`\n--- [${i + 1}/${claimedJobs.length}] Processing "${candidate.companyName}" (${candidate.city || 'Unknown'}, ${candidate.country || 'Unknown'}) ---`);
    stats.attempted++;

    try {
      const execResult = await executeEnrichmentAttempt({
        jobId: job.id,
        candidateId: candidate.id,
        ownerToken: WORKER_ID,
        estimatedCredits: 0,
        allowPocMode: options.allowPocOverride || config.enabled,
      });

      if (!execResult.result) {
        console.log(`  ! Execution blocked: ${execResult.reason || execResult.error?.message}`);
        stats.unresolved++;
        continue;
      }

      const result = execResult.result;
      const outcomeReason = result.metadata?.reason || result.failureReason || 'UNKNOWN';
      stats.failureReasons[outcomeReason] = (stats.failureReasons[outcomeReason] || 0) + 1;

      if (result.metadata?.source) {
        stats.identityMatched++;
      }

      if (result.email) {
        stats.emailsDiscovered++;
      }

      // -----------------------------------------------------------
      // Branch 1: Live website discovered -> Disqualify candidate
      // -----------------------------------------------------------
      if (result.metadata?.isLiveWebsite || result.metadata?.reason === 'LIVE_WEBSITE_FOUND' || result.metadata?.reason === 'EMAIL_DOMAIN_HAS_LIVE_SITE' || result.website) {
        stats.liveWebsitesDiscovered++;
        stats.rejected++;
        const discoveredSite = result.website || `https://${result.domain}`;
        console.log(`  ✗ DISQUALIFIED (Live Site Found): ${candidate.companyName} → ${discoveredSite}`);

        await prisma.leadCandidate.update({
          where: { id: candidate.id },
          data: {
            status: 'REJECTED',
            rejectionReason: 'existing_website',
            lastEnrichmentAt: new Date(),
            enrichmentAttempts: { increment: 1 },
            metadata: {
              ...(candidate.metadata || {}),
              enrichmentOutcome: 'REJECTED_EXISTING_WEBSITE',
              discoveredWebsite: discoveredSite,
              enrichmentAttemptId: execResult.attempt?.id,
              enrichedAt: new Date().toISOString(),
              evidence: result.metadata,
            },
          },
        });

        await prisma.enrichmentJob.update({
          where: { id: job.id },
          data: {
            status: EnrichmentJobStatus.COMPLETED,
            completedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lockExpiresAt: null,
          },
        });

        stats.processed.push({
          candidateId: candidate.id,
          companyName: candidate.companyName,
          outcome: 'REJECTED_EXISTING_WEBSITE',
          website: discoveredSite,
        });

      // -----------------------------------------------------------
      // Branch 2: Confirmed NO_SITE + Verified Business Email -> Qualify & Create Lead
      // -----------------------------------------------------------
      } else if (result.metadata?.confirmedNoSite === true && result.email) {
        stats.confirmedNoSiteCount++;
        stats.acceptedBusinessEmails++;
        console.log(`  ✓ QUALIFIED (True NO_SITE + Email): ${candidate.companyName} → ${result.email}`);

        // Deduplication check: Lead with same email OR same companyName+city
        const existingLead = await prisma.lead.findFirst({
          where: {
            OR: [
              { email: { equals: result.email, mode: 'insensitive' } },
              {
                AND: [
                  { companyName: { equals: candidate.companyName, mode: 'insensitive' } },
                  { city: { equals: candidate.city || '', mode: 'insensitive' } },
                ],
              },
            ],
          },
        });

        if (existingLead) {
          stats.duplicatePrevented++;
          console.log(`  Deduplication: Lead already exists (${existingLead.id}) — linking candidate.`);

          await prisma.leadCandidate.update({
            where: { id: candidate.id },
            data: {
              status: 'REJECTED',
              rejectionReason: 'duplicate_lead',
              qualifiedLeadId: existingLead.id,
              lastEnrichmentAt: new Date(),
              enrichmentAttempts: { increment: 1 },
            },
          });

          await prisma.enrichmentJob.update({
            where: { id: job.id },
            data: {
              status: EnrichmentJobStatus.COMPLETED,
              completedAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              lockExpiresAt: null,
            },
          });

          stats.processed.push({
            candidateId: candidate.id,
            companyName: candidate.companyName,
            outcome: 'DUPLICATE_LINKED',
            leadId: existingLead.id,
          });
        } else {
          stats.qualified++;
          stats.leadsCreated++;

          // Automatic Lead creation into CRM /leads
          const newLead = await prisma.lead.create({
            data: {
              companyName: candidate.companyName,
              businessCategory: candidate.businessCategory || 'Medical',
              address: candidate.address || candidate.city,
              city: candidate.city,
              country: candidate.country || 'UK',
              postcode: candidate.postcode,
              phone: candidate.phone,
              email: result.email,
              website: null, // Confirmed NO_SITE
              websiteStatus: 'none',
              segment: 'NO_SITE',
              source: candidate.discoverySource?.name || 'public_web_research',
              status: 'NEW',
              score: 0,
            },
          });

          console.log(`  ★ AUTOMATIC LEAD CREATED: ${candidate.companyName} (Lead ID: ${newLead.id})`);

          await prisma.leadCandidate.update({
            where: { id: candidate.id },
            data: {
              status: 'QUALIFIED',
              email: result.email,
              website: null,
              qualifiedLeadId: newLead.id,
              lastEnrichmentAt: new Date(),
              enrichmentAttempts: { increment: 1 },
              metadata: {
                ...(candidate.metadata || {}),
                enrichmentOutcome: 'QUALIFIED_LEAD_CREATED',
                leadId: newLead.id,
                enrichedAt: new Date().toISOString(),
                evidence: result.metadata,
              },
            },
          });

          await prisma.enrichmentJob.update({
            where: { id: job.id },
            data: {
              status: EnrichmentJobStatus.COMPLETED,
              completedAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              lockExpiresAt: null,
            },
          });

          stats.processed.push({
            candidateId: candidate.id,
            companyName: candidate.companyName,
            outcome: 'QUALIFIED_LEAD_CREATED',
            email: result.email,
            leadId: newLead.id,
          });
        }

      // -----------------------------------------------------------
      // Branch 3: Unresolved (NO_RESULT) -> Cooldown & Future Retry
      // -----------------------------------------------------------
      } else {
        stats.unresolved++;
        console.log(`  - UNRESOLVED: ${candidate.companyName} (${outcomeReason})`);

        await prisma.leadCandidate.update({
          where: { id: candidate.id },
          data: {
            status: 'NEEDS_ENRICHMENT',
            lastEnrichmentAt: new Date(),
            enrichmentAttempts: { increment: 1 },
          },
        });

        await handleJobRetryOrExhaustion(job.id, WORKER_ID);

        stats.processed.push({
          candidateId: candidate.id,
          companyName: candidate.companyName,
          outcome: 'UNRESOLVED',
          reason: outcomeReason,
        });
      }

    } catch (err) {
      console.error(`  ! Error processing candidate ${candidate.companyName}:`, err);
      stats.errors++;
      try {
        await handleJobRetryOrExhaustion(job.id, WORKER_ID);
      } catch {}
    }
  }

  const durationMs = Date.now() - startTime;
  console.log('\n================================================================');
  console.log('PRODUCTION ENRICHMENT RUN SUMMARY');
  console.log('================================================================');
  console.log(JSON.stringify({
    workerId: WORKER_ID,
    batchSize,
    selected: stats.selected,
    attempted: stats.attempted,
    identityMatched: stats.identityMatched,
    emailsDiscovered: stats.emailsDiscovered,
    acceptedBusinessEmails: stats.acceptedBusinessEmails,
    liveWebsitesDiscovered: stats.liveWebsitesDiscovered,
    confirmedNoSiteCount: stats.confirmedNoSiteCount,
    qualified: stats.qualified,
    leadsCreated: stats.leadsCreated,
    duplicatePrevented: stats.duplicatePrevented,
    unresolved: stats.unresolved,
    rejected: stats.rejected,
    errors: stats.errors,
    failureReasons: stats.failureReasons,
    durationMs,
  }, null, 2));

  return {
    status: 'COMPLETED',
    executed: true,
    stats,
    durationMs,
  };
}

export { runEnrichmentWorker, selectAndQueueEligibleCandidates };

// Direct execution from CLI / GitHub Actions
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnrichmentWorker()
    .then((result) => {
      console.log('\nEnrichment worker finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nFatal error in enrichment worker:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
