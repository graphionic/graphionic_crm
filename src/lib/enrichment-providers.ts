/**
 * ClientForge CRM — Phase 4C.3B.1 Provider Abstraction, Usage Accounting & Hard Budget Guardrails
 * No real provider HTTP calls — provider execution is test-only adapters
 *
 * Key concepts:
 * - Provider interface normalized
 * - Registry with fail-closed for unknown provider
 * - Selection with priority and budget awareness
 * - Usage accounting from EnrichmentAttempt (UTC boundaries)
 * - Global and provider budget gates with atomic reservation via row locking
 * - Failure classification
 * - Fallback policy foundation (disabled by default)
 */

import { PrismaClient } from '@prisma/client';
import { JobOwnershipLostError } from './enrichment';

const prisma = new PrismaClient();

// ---------------------------------------------------------------- Timezone semantics — UTC

export function getUTCStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function getUTCStartOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------- Failure classification

export type ProviderFailureKind =
  | 'AUTH_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PROVIDER_DOWN'
  | 'INVALID_REQUEST'
  | 'NO_CREDITS'
  | 'UNKNOWN_PROVIDER_ERROR'
  | 'NO_RESULT' // not failure, but classification for completeness
  | 'SUCCESS';

export type ProviderError = {
  kind: ProviderFailureKind;
  message: string;
  safeMetadata?: Record<string, any>; // never secrets
  providerResponseCode?: string;
  retryable?: boolean;
};

// ---------------------------------------------------------------- Normalized result contract

export type NormalizedEnrichmentResult = {
  status: 'SUCCESS' | 'NO_RESULT' | 'FAILED';
  email?: string | null;
  domain?: string | null;
  website?: string | null;
  confidence?: number; // 0-1
  costUnits?: number; // credits or cost
  creditsUsed?: number;
  providerReference?: string; // e.g., request id
  metadata?: Record<string, any>; // safe only
  failureKind?: ProviderFailureKind;
  failureReason?: string;
};

// ---------------------------------------------------------------- Provider capabilities

export type ProviderCapabilities = {
  canFindEmail: boolean;
  canFindDomain: boolean;
  canFindWebsite: boolean;
  supportsConfidence: boolean;
  estimatedCostPerRequest: number; // default credit cost
};

// ---------------------------------------------------------------- Provider interface

export interface EnrichmentProvider {
  providerType: string; // e.g., 'hunter', 'dropcontact', 'mock-success'
  providerLabel: string; // human label
  capabilities: ProviderCapabilities;
  // Optional cost estimation per candidate
  estimateCost?(candidate: { id: string; companyName: string; city?: string | null; businessCategory?: string }): number;
  // Main enrich method — for 4C.3B.1 only test adapters implement, real adapters throw
  enrich(
    candidate: { id: string; companyName: string; city?: string | null; businessCategory?: string; country?: string | null },
    context: { credentialId?: string | null; ownerToken: string; attemptId: string }
  ): Promise<NormalizedEnrichmentResult>;
  normalizeResult?(raw: any): NormalizedEnrichmentResult;
  healthCheck?(): Promise<{ healthy: boolean; kind?: ProviderFailureKind }>;
}

// ---------------------------------------------------------------- Provider registry

type RegistryEntry = {
  adapter: EnrichmentProvider;
  registeredAt: Date;
};

class ProviderRegistryImpl {
  private adapters: Map<string, RegistryEntry> = new Map();

  register(adapter: EnrichmentProvider) {
    if (!adapter.providerType) throw new Error('providerType required');
    this.adapters.set(adapter.providerType, { adapter, registeredAt: new Date() });
  }

  unregister(providerType: string) {
    this.adapters.delete(providerType);
  }

  resolve(providerType: string): EnrichmentProvider | null {
    return this.adapters.get(providerType)?.adapter || null;
  }

  availableProviders(): EnrichmentProvider[] {
    return Array.from(this.adapters.values()).map(e => e.adapter);
  }

  isRegistered(providerType: string): boolean {
    return this.adapters.has(providerType);
  }

  clear() {
    this.adapters.clear();
  }
}

// Singleton production registry — never contains test adapters
export const productionProviderRegistry = new ProviderRegistryImpl();

// Test registry — for tests only, isolated
export const testProviderRegistry = new ProviderRegistryImpl();

// ---------------------------------------------------------------- Budget block reasons

export type GlobalBudgetBlockReason =
  | 'ENRICHMENT_DISABLED'
  | 'GLOBAL_DAILY_CANDIDATE_LIMIT_REACHED'
  | 'GLOBAL_DAILY_CREDIT_LIMIT_REACHED'
  | 'GLOBAL_MONTHLY_CREDIT_LIMIT_REACHED';

export type ProviderBudgetBlockReason =
  | 'PROVIDER_DISABLED'
  | 'NO_PROVIDER_CONFIGURED'
  | 'NO_PROVIDER_ADAPTER'
  | 'PROVIDER_DAILY_LIMIT_REACHED'
  | 'PROVIDER_MONTHLY_LIMIT_REACHED'
  | 'UNKNOWN_PROVIDER';

export type BudgetBlockReason = GlobalBudgetBlockReason | ProviderBudgetBlockReason;

// ---------------------------------------------------------------- Usage accounting — derived from EnrichmentAttempt

export type GlobalUsage = {
  attemptsToday: number;
  candidatesProcessedToday: number; // unique candidateId today
  successfulToday: number;
  noResultToday: number;
  failedToday: number;
  creditsUsedToday: number;
  costUnitsToday: number;
  creditsUsedThisMonth: number;
  costUnitsThisMonth: number;
  uniqueCandidatesTodayList?: string[]; // for debugging, not for prod return
};

export type ProviderUsage = {
  providerCredentialId: string | null;
  providerType: string | null;
  attemptsToday: number;
  attemptsThisMonth: number;
  successToday: number;
  noResultToday: number;
  failedToday: number;
  creditsToday: number;
  costUnitsToday: number;
  creditsThisMonth: number;
  costUnitsThisMonth: number;
};

export async function getGlobalEnrichmentUsage(tx?: any): Promise<GlobalUsage> {
  const client = tx || prisma;
  const startOfDay = getUTCStartOfDay();
  const startOfMonth = getUTCStartOfMonth();

  const [attemptsToday, successfulToday, noResultToday, failedToday, creditsAggToday, creditsAggMonth, distinctCandidatesToday] = await Promise.all([
    client.enrichmentAttempt.count({ where: { createdAt: { gte: startOfDay } } }),
    client.enrichmentAttempt.count({ where: { createdAt: { gte: startOfDay }, status: 'SUCCESS' } }),
    client.enrichmentAttempt.count({ where: { createdAt: { gte: startOfDay }, status: 'NO_RESULT' } }),
    client.enrichmentAttempt.count({ where: { createdAt: { gte: startOfDay }, status: 'FAILED' } }),
    client.enrichmentAttempt.aggregate({ where: { createdAt: { gte: startOfDay } }, _sum: { creditsUsed: true, costUnits: true } }),
    client.enrichmentAttempt.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { creditsUsed: true, costUnits: true } }),
    client.enrichmentAttempt.findMany({
      where: { createdAt: { gte: startOfDay } },
      distinct: ['candidateId'],
      select: { candidateId: true },
    }),
  ]);

  return {
    attemptsToday,
    candidatesProcessedToday: distinctCandidatesToday.length,
    successfulToday,
    noResultToday,
    failedToday,
    creditsUsedToday: creditsAggToday._sum.creditsUsed || 0,
    costUnitsToday: creditsAggToday._sum.costUnits || 0,
    creditsUsedThisMonth: creditsAggMonth._sum.creditsUsed || 0,
    costUnitsThisMonth: creditsAggMonth._sum.costUnits || 0,
    uniqueCandidatesTodayList: distinctCandidatesToday.map((d: any) => d.candidateId),
  };
}

export async function getProviderUsage(providerCredentialId: string, tx?: any): Promise<ProviderUsage> {
  const client = tx || prisma;
  const startOfDay = getUTCStartOfDay();
  const startOfMonth = getUTCStartOfMonth();

  const credential = await client.providerCredential.findUnique({ where: { id: providerCredentialId }, select: { provider: true } });

  const [attemptsToday, attemptsThisMonth, successToday, noResultToday, failedToday, creditsToday, creditsMonth] = await Promise.all([
    client.enrichmentAttempt.count({ where: { providerCredentialId, createdAt: { gte: startOfDay } } }),
    client.enrichmentAttempt.count({ where: { providerCredentialId, createdAt: { gte: startOfMonth } } }),
    client.enrichmentAttempt.count({ where: { providerCredentialId, createdAt: { gte: startOfDay }, status: 'SUCCESS' } }),
    client.enrichmentAttempt.count({ where: { providerCredentialId, createdAt: { gte: startOfDay }, status: 'NO_RESULT' } }),
    client.enrichmentAttempt.count({ where: { providerCredentialId, createdAt: { gte: startOfDay }, status: 'FAILED' } }),
    client.enrichmentAttempt.aggregate({ where: { providerCredentialId, createdAt: { gte: startOfDay } }, _sum: { creditsUsed: true, costUnits: true } }),
    client.enrichmentAttempt.aggregate({ where: { providerCredentialId, createdAt: { gte: startOfMonth } }, _sum: { creditsUsed: true, costUnits: true } }),
  ]);

  return {
    providerCredentialId,
    providerType: credential?.provider || null,
    attemptsToday,
    attemptsThisMonth,
    successToday,
    noResultToday,
    failedToday,
    creditsToday: creditsToday._sum.creditsUsed || 0,
    costUnitsToday: creditsToday._sum.costUnits || 0,
    creditsThisMonth: creditsMonth._sum.creditsUsed || 0,
    costUnitsThisMonth: creditsMonth._sum.costUnits || 0,
  };
}

export async function getAllProvidersUsage(tx?: any): Promise<ProviderUsage[]> {
  const client = tx || prisma;
  const creds = await client.providerCredential.findMany({ where: { enabled: true }, select: { id: true, provider: true } });
  const usages: ProviderUsage[] = [];
  for (const c of creds) {
    usages.push(await getProviderUsage(c.id, client));
  }
  return usages;
}

export async function hasCandidateBeenProcessedToday(candidateId: string, tx?: any): Promise<boolean> {
  const client = tx || prisma;
  const startOfDay = getUTCStartOfDay();
  const count = await client.enrichmentAttempt.count({
    where: { candidateId, createdAt: { gte: startOfDay } },
  });
  return count > 0;
}

// ---------------------------------------------------------------- Global budget gate

export type GlobalBudgetCheckResult = {
  allowed: boolean;
  reason?: GlobalBudgetBlockReason;
  usage: GlobalUsage;
  candidateAlreadyCountedToday?: boolean;
};

export async function checkGlobalEnrichmentBudget(params: {
  candidateId: string;
  estimatedCredits?: number;
  tx?: any;
}): Promise<GlobalBudgetCheckResult> {
  const { candidateId, estimatedCredits = 0, tx } = params;
  const client = tx || prisma;

  const config = await client.enrichmentConfig.findFirst({ where: { key: 'default' } });
  if (!config) throw new Error('EnrichmentConfig not found');
  if (!config.enabled) {
    const usage = await getGlobalEnrichmentUsage(client);
    return { allowed: false, reason: 'ENRICHMENT_DISABLED', usage };
  }

  const usage = await getGlobalEnrichmentUsage(client);
  const alreadyCounted = await hasCandidateBeenProcessedToday(candidateId, client);

  // Daily unique candidate limit — only if candidate not already counted today
  if (!alreadyCounted && config.dailyCandidateLimit != null) {
    if (usage.candidatesProcessedToday >= config.dailyCandidateLimit) {
      return { allowed: false, reason: 'GLOBAL_DAILY_CANDIDATE_LIMIT_REACHED', usage, candidateAlreadyCountedToday: false };
    }
  }

  // Global daily credit limit
  if (config.providerDailyCreditLimit != null) {
    if (usage.creditsUsedToday + estimatedCredits > config.providerDailyCreditLimit) {
      return { allowed: false, reason: 'GLOBAL_DAILY_CREDIT_LIMIT_REACHED', usage, candidateAlreadyCountedToday: alreadyCounted };
    }
  }

  // Global monthly credit limit
  if (config.providerMonthlyCreditLimit != null) {
    if (usage.creditsUsedThisMonth + estimatedCredits > config.providerMonthlyCreditLimit) {
      return { allowed: false, reason: 'GLOBAL_MONTHLY_CREDIT_LIMIT_REACHED', usage, candidateAlreadyCountedToday: alreadyCounted };
    }
  }

  return { allowed: true, usage, candidateAlreadyCountedToday: alreadyCounted };
}

// ---------------------------------------------------------------- Provider budget gate

export type ProviderBudgetCheckResult = {
  allowed: boolean;
  reason?: ProviderBudgetBlockReason;
  usage?: ProviderUsage;
  credential?: any;
};

export async function checkProviderBudget(params: {
  providerCredentialId: string;
  estimatedCredits?: number;
  tx?: any;
}): Promise<ProviderBudgetCheckResult> {
  const { providerCredentialId, estimatedCredits = 0, tx } = params;
  const client = tx || prisma;

  const credential = await client.providerCredential.findUnique({ where: { id: providerCredentialId } });
  if (!credential) {
    return { allowed: false, reason: 'NO_PROVIDER_CONFIGURED' };
  }
  if (!credential.enabled) {
    return { allowed: false, reason: 'PROVIDER_DISABLED', credential };
  }

  const usage = await getProviderUsage(providerCredentialId, client);

  // Provider daily limit — represents CREDIT limit (documented)
  if (credential.dailyLimit != null) {
    if (usage.creditsToday + estimatedCredits > credential.dailyLimit) {
      return { allowed: false, reason: 'PROVIDER_DAILY_LIMIT_REACHED', usage, credential };
    }
  }

  // Provider monthly limit — CREDIT limit
  if (credential.monthlyLimit != null) {
    if (usage.creditsThisMonth + estimatedCredits > credential.monthlyLimit) {
      return { allowed: false, reason: 'PROVIDER_MONTHLY_LIMIT_REACHED', usage, credential };
    }
  }

  return { allowed: true, usage, credential };
}

// ---------------------------------------------------------------- Provider selection

export type ProviderSelectionResult =
  | { selected: true; credential: any; adapter: EnrichmentProvider; reason?: never }
  | { selected: false; reason: ProviderBudgetBlockReason; details?: string; credential?: any };

export async function selectEnrichmentProvider(params: {
  candidateId: string;
  estimatedCredits?: number;
  registry?: ProviderRegistryImpl;
  tx?: any;
}): Promise<ProviderSelectionResult> {
  const { candidateId, estimatedCredits = 1, registry = productionProviderRegistry, tx } = params;
  const client = tx || prisma;

  const credentials = await client.providerCredential.findMany({
    where: { enabled: true },
    orderBy: [{ priority: 'desc' }, { provider: 'asc' }, { label: 'asc' }, { id: 'asc' }], // deterministic priority DESC then stable tie-breaker
  });

  if (credentials.length === 0) {
    return { selected: false, reason: 'NO_PROVIDER_CONFIGURED', details: 'No enabled provider credentials' };
  }

  // Filter to those with registered adapter and under budget
  const eligible: { credential: any; adapter: EnrichmentProvider; usage: ProviderUsage }[] = [];

  for (const cred of credentials) {
    const adapter = registry.resolve(cred.provider);
    if (!adapter) continue; // no adapter registered, skip

    const budgetCheck = await checkProviderBudget({ providerCredentialId: cred.id, estimatedCredits, tx: client });
    if (!budgetCheck.allowed) continue; // over budget or disabled

    const usage = budgetCheck.usage!;
    eligible.push({ credential: cred, adapter, usage });
  }

  if (eligible.length === 0) {
    // Determine why — check if any credential had adapter missing vs budget
    const anyAdapterMissing = credentials.some((c: any) => !registry.isRegistered(c.provider));
    if (anyAdapterMissing) {
      // Check if all missing adapter
      const allMissing = credentials.every((c: any) => !registry.isRegistered(c.provider));
      if (allMissing) {
        return { selected: false, reason: 'NO_PROVIDER_ADAPTER', details: 'Credentials exist but no adapters registered' };
      }
    }
    // Check budget reasons
    // For simplicity, return first budget block reason encountered
    for (const cred of credentials) {
      if (!registry.isRegistered(cred.provider)) continue;
      const bc = await checkProviderBudget({ providerCredentialId: cred.id, estimatedCredits, tx: client });
      if (!bc.allowed) {
        return { selected: false, reason: bc.reason as ProviderBudgetBlockReason, credential: cred, details: `Provider ${cred.provider} blocked: ${bc.reason}` };
      }
    }
    return { selected: false, reason: 'NO_PROVIDER_CONFIGURED', details: 'No eligible providers after filtering' };
  }

  // Select highest priority, deterministic tie-breaker already ordered
  // Priority DESC, then provider asc, label asc, id asc ensures stable selection
  eligible.sort((a, b) => {
    if (b.credential.priority !== a.credential.priority) return b.credential.priority - a.credential.priority;
    if (a.credential.provider !== b.credential.provider) return a.credential.provider.localeCompare(b.credential.provider);
    const labelA = a.credential.label || '';
    const labelB = b.credential.label || '';
    if (labelA !== labelB) return labelA.localeCompare(labelB);
    return a.credential.id.localeCompare(b.credential.id);
  });

  const chosen = eligible[0];
  return { selected: true, credential: chosen.credential, adapter: chosen.adapter };
}

// ---------------------------------------------------------------- Atomic reservation — uses row locking to prevent concurrent overspend
// EnrichmentAttempt STARTED acts as reservation counting immediately
// Conservative accounting: even if worker crashes after reservation, reservation counts

export type ReservationResult =
  | { reserved: true; attempt: any; globalUsage: GlobalUsage; providerUsage: ProviderUsage }
  | { reserved: false; reason: BudgetBlockReason; globalUsage: GlobalUsage; providerUsage?: ProviderUsage };

export async function reserveEnrichmentBudgetAtomically(params: {
  jobId: string;
  candidateId: string;
  providerCredentialId: string;
  providerType: string;
  providerLabel?: string | null;
  ownerToken: string;
  estimatedCredits?: number;
}): Promise<ReservationResult> {
  const { jobId, candidateId, providerCredentialId, providerType, providerLabel, ownerToken, estimatedCredits = 1 } = params;

  return await prisma.$transaction(async (tx) => {
    // Serialize budget checks by locking EnrichmentConfig and ProviderCredential rows FOR UPDATE
    await tx.$queryRaw`SELECT * FROM "EnrichmentConfig" WHERE key='default' FOR UPDATE`;
    await tx.$queryRaw`SELECT * FROM "ProviderCredential" WHERE id=${providerCredentialId} FOR UPDATE`;

    // Verify job ownership still valid inside same transaction
    const job = await tx.enrichmentJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'PROCESSING' || job.lockedBy !== ownerToken) {
      throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}`);
    }

    // Check global budget with current tx (includes uncommitted? No, but we have lock)
    const globalCheck = await checkGlobalEnrichmentBudget({ candidateId, estimatedCredits, tx });
    if (!globalCheck.allowed) {
      return { reserved: false, reason: globalCheck.reason!, globalUsage: globalCheck.usage };
    }

    // Check provider budget
    const providerCheck = await checkProviderBudget({ providerCredentialId, estimatedCredits, tx });
    if (!providerCheck.allowed) {
      return { reserved: false, reason: providerCheck.reason!, globalUsage: globalCheck.usage, providerUsage: providerCheck.usage };
    }

    // Create STARTED attempt with reserved credits — this is the reservation
    const attempt = await tx.enrichmentAttempt.create({
      data: {
        jobId,
        candidateId,
        providerCredentialId,
        providerType,
        providerLabel: providerLabel || null,
        status: 'STARTED',
        startedAt: new Date(),
        creditsUsed: estimatedCredits,
        costUnits: estimatedCredits,
        metadata: {
          ownerToken,
          reservedAt: new Date().toISOString(),
          estimatedCredits,
          reservation: true,
        },
      },
    });

    // Increment job attemptCount
    const updated = await tx.enrichmentJob.updateMany({
      where: { id: jobId, lockedBy: ownerToken, status: 'PROCESSING' },
      data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
    });
    if (updated.count !== 1) throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: increment failed for job ${jobId}`);

    const globalUsage = await getGlobalEnrichmentUsage(tx);
    const providerUsage = await getProviderUsage(providerCredentialId, tx);

    return { reserved: true, attempt, globalUsage, providerUsage };
  });
}

// ---------------------------------------------------------------- Provider execution orchestrator (test adapters only for 4C.3B.1)

export type ExecutionResult = {
  success: boolean;
  result?: NormalizedEnrichmentResult;
  attempt?: any;
  reason?: BudgetBlockReason;
  error?: ProviderError;
};

export async function executeEnrichmentAttempt(params: {
  jobId: string;
  candidateId: string;
  ownerToken: string;
  registry?: ProviderRegistryImpl;
  estimatedCredits?: number;
}): Promise<ExecutionResult> {
  const { jobId, candidateId, ownerToken, registry = productionProviderRegistry, estimatedCredits } = params;

  // Verify ownership
  const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
  if (!job) return { success: false, reason: 'NO_PROVIDER_CONFIGURED' as any, error: { kind: 'UNKNOWN_PROVIDER_ERROR', message: 'Job not found' } };
  if (job.status !== 'PROCESSING' || job.lockedBy !== ownerToken) {
    throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}`);
  }

  // Check global budget
  const globalCheck = await checkGlobalEnrichmentBudget({ candidateId, estimatedCredits: estimatedCredits || 1 });
  if (!globalCheck.allowed) {
    return { success: false, reason: globalCheck.reason, error: { kind: 'UNKNOWN_PROVIDER_ERROR', message: `Global budget blocked: ${globalCheck.reason}` } };
  }

  // Select provider
  const selection = await selectEnrichmentProvider({ candidateId, estimatedCredits: estimatedCredits || 1, registry });
  if (!selection.selected) {
    return { success: false, reason: selection.reason, error: { kind: 'UNKNOWN_PROVIDER_ERROR', message: `No provider: ${selection.reason}` } };
  }

  const { credential, adapter } = selection;
  const estCredits = adapter.estimateCost ? adapter.estimateCost({ id: candidateId, companyName: 'test', city: null, businessCategory: 'test' }) : (estimatedCredits || adapter.capabilities.estimatedCostPerRequest || 1);

  // Reserve atomically
  const reservation = await reserveEnrichmentBudgetAtomically({
    jobId,
    candidateId,
    providerCredentialId: credential.id,
    providerType: adapter.providerType,
    providerLabel: adapter.providerLabel,
    ownerToken,
    estimatedCredits: estCredits,
  });

  if (!reservation.reserved) {
    return { success: false, reason: reservation.reason, error: { kind: 'NO_CREDITS', message: `Budget reservation failed: ${reservation.reason}` } };
  }

  const attempt = reservation.attempt;

  try {
    // Execute adapter (test-only, no network)
    const result = await adapter.enrich(
      { id: candidateId, companyName: 'test-candidate', city: null, businessCategory: 'test', country: null },
      { credentialId: credential.id, ownerToken, attemptId: attempt.id }
    );

    // Normalize and reconcile actual cost
    const normalized = adapter.normalizeResult ? adapter.normalizeResult(result) : result;

    // Update attempt with actual result and actual cost (conservative: if actual > estimated, keep higher)
    const actualCredits = normalized.creditsUsed ?? normalized.costUnits ?? estCredits;
    const finalCredits = Math.max(estCredits, actualCredits); // conservative

    let updatedAttempt;
    if (normalized.status === 'SUCCESS') {
      updatedAttempt = await prisma.enrichmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          durationMs: Date.now() - attempt.startedAt.getTime(),
          emailFound: normalized.email || null,
          domainFound: normalized.domain || null,
          websiteFound: normalized.website || null,
          creditsUsed: finalCredits,
          costUnits: finalCredits,
          providerResponseCode: '200',
          metadata: {
            ...(attempt.metadata as any),
            completedAt: new Date().toISOString(),
            actualResult: normalized,
            finalCredits,
          },
        },
      });
    } else if (normalized.status === 'NO_RESULT') {
      updatedAttempt = await prisma.enrichmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'NO_RESULT',
          finishedAt: new Date(),
          durationMs: Date.now() - attempt.startedAt.getTime(),
          creditsUsed: finalCredits,
          costUnits: finalCredits,
          metadata: {
            ...(attempt.metadata as any),
            completedAt: new Date().toISOString(),
            actualResult: normalized,
            finalCredits,
          },
        },
      });
    } else {
      updatedAttempt = await prisma.enrichmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          durationMs: Date.now() - attempt.startedAt.getTime(),
          failureReason: normalized.failureReason || 'provider_failed',
          creditsUsed: finalCredits,
          costUnits: finalCredits,
          metadata: {
            ...(attempt.metadata as any),
            completedAt: new Date().toISOString(),
            actualResult: normalized,
            finalCredits,
          },
        },
      });
    }

    return { success: true, result: normalized, attempt: updatedAttempt };
  } catch (e: any) {
    // Provider execution failed — still count reservation conservatively
    const failureKind: ProviderFailureKind = e.kind || 'UNKNOWN_PROVIDER_ERROR';
    await prisma.enrichmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        durationMs: Date.now() - attempt.startedAt.getTime(),
        failureReason: e.message || 'unknown_error',
        metadata: {
          ...(attempt.metadata as any),
          failedAt: new Date().toISOString(),
          error: e.message,
          failureKind,
        },
      },
    });
    return { success: false, error: { kind: failureKind, message: e.message }, attempt };
  }
}

// ---------------------------------------------------------------- Fallback policy foundation

export type FallbackPolicy = {
  allowFallback: boolean;
  maxProvidersPerCandidate: number;
  treatNoResultAsFallback: boolean;
  treatFailedAsFallback: boolean;
};

export const defaultFallbackPolicy: FallbackPolicy = {
  allowFallback: false, // disabled by default for 4C.3B.1
  maxProvidersPerCandidate: 1,
  treatNoResultAsFallback: false,
  treatFailedAsFallback: false,
};

// ---------------------------------------------------------------- Test adapters — deterministic, no network, configurable fake credits

export class SuccessTestProvider implements EnrichmentProvider {
  providerType = 'test-success';
  providerLabel = 'Test Success Provider';
  capabilities: ProviderCapabilities = {
    canFindEmail: true,
    canFindDomain: true,
    canFindWebsite: false,
    supportsConfidence: true,
    estimatedCostPerRequest: 1,
  };
  private fakeCredits: number;

  constructor(fakeCredits = 1) {
    this.fakeCredits = fakeCredits;
  }

  estimateCost() {
    return this.fakeCredits;
  }

  async enrich(candidate: any, context: any): Promise<NormalizedEnrichmentResult> {
    // Zero network calls, deterministic
    return {
      status: 'SUCCESS',
      email: `contact@${candidate.companyName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'test'}.test`,
      domain: `${candidate.companyName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'test'}.test`,
      website: null,
      confidence: 0.9,
      costUnits: this.fakeCredits,
      creditsUsed: this.fakeCredits,
      providerReference: `test-ref-${context.attemptId}`,
      metadata: { test: true, ownerToken: context.ownerToken },
    };
  }
}

export class NoResultTestProvider implements EnrichmentProvider {
  providerType = 'test-noresult';
  providerLabel = 'Test NoResult Provider';
  capabilities: ProviderCapabilities = {
    canFindEmail: false,
    canFindDomain: false,
    canFindWebsite: false,
    supportsConfidence: false,
    estimatedCostPerRequest: 1,
  };
  private fakeCredits: number;
  constructor(fakeCredits = 1) {
    this.fakeCredits = fakeCredits;
  }
  estimateCost() {
    return this.fakeCredits;
  }
  async enrich(candidate: any, context: any): Promise<NormalizedEnrichmentResult> {
    return {
      status: 'NO_RESULT',
      costUnits: this.fakeCredits,
      creditsUsed: this.fakeCredits,
      metadata: { test: true },
    };
  }
}

export class FailedTestProvider implements EnrichmentProvider {
  providerType = 'test-failed';
  providerLabel = 'Test Failed Provider';
  capabilities: ProviderCapabilities = {
    canFindEmail: false,
    canFindDomain: false,
    canFindWebsite: false,
    supportsConfidence: false,
    estimatedCostPerRequest: 1,
  };
  private fakeCredits: number;
  private failureKind: ProviderFailureKind;
  constructor(fakeCredits = 1, failureKind: ProviderFailureKind = 'PROVIDER_DOWN') {
    this.fakeCredits = fakeCredits;
    this.failureKind = failureKind;
  }
  estimateCost() {
    return this.fakeCredits;
  }
  async enrich(candidate: any, context: any): Promise<NormalizedEnrichmentResult> {
    return {
      status: 'FAILED',
      failureKind: this.failureKind,
      failureReason: `simulated_${this.failureKind}`,
      costUnits: this.fakeCredits,
      creditsUsed: this.fakeCredits,
      metadata: { test: true, failureKind: this.failureKind },
    };
  }
}

// ---------------------------------------------------------------- Budget status for UI

export type BudgetStatus =
  | 'ENRICHMENT_DISABLED'
  | 'WITHIN_BUDGET'
  | 'DAILY_CANDIDATE_LIMIT_REACHED'
  | 'DAILY_CREDIT_LIMIT_REACHED'
  | 'MONTHLY_CREDIT_LIMIT_REACHED'
  | 'NO_PROVIDER_AVAILABLE';

export async function getBudgetStatus(): Promise<{ status: BudgetStatus; usage: GlobalUsage; config: any }> {
  const config = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
  const usage = await getGlobalEnrichmentUsage();

  if (!config?.enabled) return { status: 'ENRICHMENT_DISABLED', usage, config };

  if (config.dailyCandidateLimit != null && usage.candidatesProcessedToday >= config.dailyCandidateLimit) {
    return { status: 'DAILY_CANDIDATE_LIMIT_REACHED', usage, config };
  }
  if (config.providerDailyCreditLimit != null && usage.creditsUsedToday >= config.providerDailyCreditLimit) {
    return { status: 'DAILY_CREDIT_LIMIT_REACHED', usage, config };
  }
  if (config.providerMonthlyCreditLimit != null && usage.creditsUsedThisMonth >= config.providerMonthlyCreditLimit) {
    return { status: 'MONTHLY_CREDIT_LIMIT_REACHED', usage, config };
  }

  const creds = await prisma.providerCredential.count({ where: { enabled: true } });
  if (creds === 0) return { status: 'NO_PROVIDER_AVAILABLE', usage, config };

  return { status: 'WITHIN_BUDGET', usage, config };
}

export async function getProvidersForUI() {
  const creds = await prisma.providerCredential.findMany({
    orderBy: [{ priority: 'desc' }, { provider: 'asc' }, { label: 'asc' }],
  });
  const result = [];
  for (const cred of creds) {
    const usage = await getProviderUsage(cred.id);
    const adapterAvailable = productionProviderRegistry.isRegistered(cred.provider);
    result.push({
      id: cred.id,
      provider: cred.provider,
      label: cred.label,
      enabled: cred.enabled,
      priority: cred.priority,
      health: cred.status, // reuse status field as health: configured/connected/error
      adapterAvailable,
      adapterStatus: adapterAvailable ? 'Available' : 'Not Integrated',
      usage,
      limits: {
        dailyLimit: cred.dailyLimit,
        monthlyLimit: cred.monthlyLimit,
      },
      // Never expose encryptedValue
      keyHint: cred.keyHint,
      maskedKey: cred.keyHint ? `••••••••••••••••${cred.keyHint}` : '••••••••••••••••',
    });
  }
  return result;
}
