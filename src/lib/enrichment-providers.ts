/**
 * ClientForge CRM — Phase 4C.3B.1.1 Budget Reservation Hardening
 * Phase 4C.3B.1 Provider Abstraction, Usage Accounting & Hard Budget Guardrails — hardened
 * No real provider HTTP calls — provider execution is test-only adapters
 *
 * CANONICAL RESERVATION INVARIANT (MUST HOLD):
 * A provider-backed enrichment execution MUST NOT create an EnrichmentAttempt STARTED directly.
 * The ONLY production path for provider execution is:
 *   executeEnrichmentAttempt
 *           ↓
 *   reserveEnrichmentBudgetAtomically (locks EnrichmentConfig FOR UPDATE, ProviderCredential FOR UPDATE, checks ownership, checks duplicate STARTED, checks budgets, creates STARTED reservation)
 *           ↓
 *   transaction COMMIT
 *           ↓
 *   adapter.enrich (test-only, zero network)
 * No production code may create STARTED provider attempts outside reserveEnrichmentBudgetAtomically.
 *
 * Key concepts:
 * - Provider interface normalized with MAXIMUM credit cost contract (getMaximumCreditCost)
 * - Registry with fail-closed for unknown provider
 * - Selection with priority and budget awareness (advisory, reservation re-checks authoritatively)
 * - Usage accounting from EnrichmentAttempt (UTC boundaries) including STARTED reservations
 * - Global and provider budget gates with atomic reservation via row locking (config first, provider second)
 * - Duplicate reservation guard: at most ONE active STARTED per job, unresolved STARTED blocks retry after reclaim
 * - Failure classification, timeout fail-closed, cost contract enforcement
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
  | 'SUCCESS'
  | 'ACTIVE_RESERVATION_EXISTS'
  | 'BUDGET_RESERVATION_TIMEOUT'
  | 'PROVIDER_COST_EXCEEDED_RESERVATION';

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
  estimatedCostPerRequest: number; // deprecated alias, use getMaximumCreditCost for hard budget
  maximumCostPerRequest?: number; // explicit maximum, if not set fallback to estimatedCostPerRequest
};

// ---------------------------------------------------------------- Provider interface

export interface EnrichmentProvider {
  providerType: string; // e.g., 'hunter', 'dropcontact', 'mock-success'
  providerLabel: string; // human label
  capabilities: ProviderCapabilities;
  // MAXIMUM possible credit cost — hard budget contract: reserved amount must be >= maximum charge
  // Preferred: getMaximumCreditCost
  getMaximumCreditCost?(candidate: { id: string; companyName: string; city?: string | null; businessCategory?: string }): number;
  // Deprecated alias: estimateCost is interpreted as maximum cost for backward compat
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
    if (providerType === 'public_web_research' && !this.adapters.has('public_web_research')) {
      try {
        const { PublicWebResearchAdapter } = require('./public-web-research-adapter');
        this.register(new PublicWebResearchAdapter());
      } catch {}
    }
    return this.adapters.get(providerType)?.adapter || null;
  }

  availableProviders(): EnrichmentProvider[] {
    if (!this.adapters.has('public_web_research')) {
      try {
        const { PublicWebResearchAdapter } = require('./public-web-research-adapter');
        this.register(new PublicWebResearchAdapter());
      } catch {}
    }
    return Array.from(this.adapters.values()).map(e => e.adapter);
  }

  isRegistered(providerType: string): boolean {
    if (providerType === 'public_web_research' && !this.adapters.has('public_web_research')) {
      try {
        const { PublicWebResearchAdapter } = require('./public-web-research-adapter');
        this.register(new PublicWebResearchAdapter());
      } catch {}
    }
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
  | 'UNKNOWN_PROVIDER'
  | 'ACTIVE_RESERVATION_EXISTS'
  | 'BUDGET_RESERVATION_TIMEOUT'
  | 'PROVIDER_COST_EXCEEDED_RESERVATION';

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

  const aggToday = await client.enrichmentAttempt.aggregate({
    where: { createdAt: { gte: startOfDay } },
    _count: { _all: true },
    _sum: { creditsUsed: true, costUnits: true },
  });

  const aggMonth = await client.enrichmentAttempt.aggregate({
    where: { createdAt: { gte: startOfMonth } },
    _sum: { creditsUsed: true, costUnits: true },
  });

  return {
    attemptsToday: aggToday._count?._all || 0,
    candidatesProcessedToday: aggToday._count?._all || 0,
    successfulToday: 0,
    noResultToday: 0,
    failedToday: 0,
    creditsUsedToday: aggToday._sum?.creditsUsed || 0,
    costUnitsToday: aggToday._sum?.costUnits || 0,
    creditsUsedThisMonth: aggMonth._sum?.creditsUsed || 0,
    costUnitsThisMonth: aggMonth._sum?.costUnits || 0,
  };
}

export async function getProviderUsage(providerCredentialId: string, tx?: any): Promise<ProviderUsage> {
  const client = tx || prisma;
  const startOfDay = getUTCStartOfDay();
  const startOfMonth = getUTCStartOfMonth();

  const credential = await client.providerCredential.findUnique({ where: { id: providerCredentialId }, select: { provider: true } });

  const aggToday = await client.enrichmentAttempt.aggregate({
    where: { providerCredentialId, createdAt: { gte: startOfDay } },
    _count: { _all: true },
    _sum: { creditsUsed: true, costUnits: true },
  });

  const aggMonth = await client.enrichmentAttempt.aggregate({
    where: { providerCredentialId, createdAt: { gte: startOfMonth } },
    _count: { _all: true },
    _sum: { creditsUsed: true, costUnits: true },
  });

  return {
    providerCredentialId,
    providerType: credential?.provider || null,
    attemptsToday: aggToday._count?._all || 0,
    attemptsThisMonth: aggMonth._count?._all || 0,
    successToday: 0,
    noResultToday: 0,
    failedToday: 0,
    creditsToday: aggToday._sum?.creditsUsed || 0,
    costUnitsToday: aggToday._sum?.costUnits || 0,
    creditsThisMonth: aggMonth._sum?.creditsUsed || 0,
    costUnitsThisMonth: aggMonth._sum?.costUnits || 0,
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
  allowPocMode?: boolean;
}): Promise<GlobalBudgetCheckResult> {
  const { candidateId, estimatedCredits = 0, tx, allowPocMode = false } = params;
  const client = tx || prisma;

  const config = await client.enrichmentConfig.findFirst({ where: { key: 'default' } });
  if (!config) throw new Error('EnrichmentConfig not found');
  if (!config.enabled && !allowPocMode) {
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
// Lock order: 1. EnrichmentConfig 2. ProviderCredential 3. ownership validation 4. budget queries 5. duplicate STARTED check 6. reservation 7. job increment 8. commit

export type ReservationResult =
  | { reserved: true; attempt: any; globalUsage: GlobalUsage; providerUsage: ProviderUsage }
  | { reserved: false; reason: BudgetBlockReason; globalUsage: GlobalUsage; providerUsage?: ProviderUsage; existingAttemptId?: string };

export class BudgetReservationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BUDGET_RESERVATION_TIMEOUT';
  }
}

export async function reserveEnrichmentBudgetAtomically(params: {
  jobId: string;
  candidateId: string;
  providerCredentialId: string;
  providerType: string;
  providerLabel?: string | null;
  ownerToken: string;
  estimatedCredits?: number; // interpreted as MAXIMUM possible cost
  allowPocMode?: boolean;
}): Promise<ReservationResult> {
  const { jobId, candidateId, providerCredentialId, providerType, providerLabel, ownerToken, estimatedCredits = 1, allowPocMode = false } = params;

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. EnrichmentConfig global lock
      await tx.$queryRaw`SELECT * FROM "EnrichmentConfig" WHERE key='default' FOR UPDATE`;
      // 2. ProviderCredential lock
      await tx.$queryRaw`SELECT * FROM "ProviderCredential" WHERE id=${providerCredentialId} FOR UPDATE`;

      // 3. Ownership validation inside same tx
      const job = await tx.enrichmentJob.findUnique({ where: { id: jobId } });
      if (!job) throw new Error(`Job ${jobId} not found`);
      if (job.status !== 'PROCESSING' || job.lockedBy !== ownerToken) {
        throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}`);
      }

      // 4. Duplicate STARTED guard — at most ONE active STARTED per job ownership period
      // Since every canonical reservation locks EnrichmentConfig first, concurrent reservations are globally serialized
      // Second invocation will observe STARTED created by first
      const existingStarted = await tx.enrichmentAttempt.findFirst({
        where: { jobId, status: 'STARTED' },
        orderBy: { createdAt: 'desc' },
      });
      if (existingStarted) {
        const globalUsage = await getGlobalEnrichmentUsage(tx);
        const providerUsage = await getProviderUsage(providerCredentialId, tx);
        return {
          reserved: false,
          reason: 'ACTIVE_RESERVATION_EXISTS',
          globalUsage,
          providerUsage,
          existingAttemptId: existingStarted.id,
        };
      }

      // 5. Budget queries under lock (authoritative)
      const globalCheck = await checkGlobalEnrichmentBudget({ candidateId, estimatedCredits, tx, allowPocMode });
      if (!globalCheck.allowed) {
        return { reserved: false, reason: globalCheck.reason!, globalUsage: globalCheck.usage };
      }

      const providerCheck = await checkProviderBudget({ providerCredentialId, estimatedCredits, tx });
      if (!providerCheck.allowed) {
        return { reserved: false, reason: providerCheck.reason!, globalUsage: globalCheck.usage, providerUsage: providerCheck.usage };
      }

      // 6. Create STARTED attempt with reserved credits — reservation, maximum cost
      const attempt = await tx.enrichmentAttempt.create({
        data: {
          jobId,
          candidateId,
          providerCredentialId,
          providerType,
          providerLabel: providerLabel || null,
          status: 'STARTED',
          startedAt: new Date(),
          creditsUsed: estimatedCredits, // maximum
          costUnits: estimatedCredits,
          metadata: {
            ownerToken,
            reservedAt: new Date().toISOString(),
            estimatedCredits,
            maximumCredits: estimatedCredits,
            reservation: true,
          },
        },
      });

      // 7. Increment job attemptCount with ownership guard
      const updated = await tx.enrichmentJob.updateMany({
        where: { id: jobId, lockedBy: ownerToken, status: 'PROCESSING' },
        data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
      });
      if (updated.count !== 1) throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: increment failed for job ${jobId}`);

      const globalUsage = await getGlobalEnrichmentUsage(tx);
      const providerUsage = await getProviderUsage(providerCredentialId, tx);

      return { reserved: true, attempt, globalUsage, providerUsage };
    }, { maxWait: 15000, timeout: 20000 });
  } catch (e: any) {
    if (e.code === 'P2028' || e.message?.includes('Unable to start a transaction') || e.name === 'BudgetReservationTimeoutError') {
      // Fail closed on timeout
      const globalUsage = await getGlobalEnrichmentUsage();
      throw new BudgetReservationTimeoutError(`BUDGET_RESERVATION_TIMEOUT: ${e.message}`);
    }
    throw e;
  }
}

// ---------------------------------------------------------------- Provider execution orchestrator (test adapters only for 4C.3B.1)
// Execution order: verify owner → advisory budget/provider selection → maximum credit cost → atomic reservation COMMIT → provider execution
// Provider execution MUST NOT happen if: ENRICHMENT_DISABLED, NO_PROVIDER, BUDGET LIMIT, ACTIVE_RESERVATION_EXISTS, JOB_OWNERSHIP_LOST, BUDGET_RESERVATION_TIMEOUT

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
  estimatedCredits?: number; // interpreted as maximum
  allowPocMode?: boolean;
}): Promise<ExecutionResult> {
  const { jobId, candidateId, ownerToken, registry = productionProviderRegistry, estimatedCredits, allowPocMode = false } = params;

  // Verify ownership
  const job = await prisma.enrichmentJob.findUnique({
    where: { id: jobId },
    include: { candidate: true },
  });
  if (!job) return { success: false, reason: 'NO_PROVIDER_CONFIGURED' as any, error: { kind: 'UNKNOWN_PROVIDER_ERROR', message: 'Job not found' } };
  if (job.status !== 'PROCESSING' || job.lockedBy !== ownerToken) {
    throw new JobOwnershipLostError(`JOB_OWNERSHIP_LOST: job ${jobId} not owned by ${ownerToken}`);
  }

  // Check global budget (advisory, authoritative check inside reservation)
  const globalCheck = await checkGlobalEnrichmentBudget({ candidateId, estimatedCredits: estimatedCredits || 1, allowPocMode });
  if (!globalCheck.allowed) {
    return { success: false, reason: globalCheck.reason, error: { kind: 'UNKNOWN_PROVIDER_ERROR', message: `Global budget blocked: ${globalCheck.reason}` } };
  }

  // Select provider (advisory)
  const selection = await selectEnrichmentProvider({ candidateId, estimatedCredits: estimatedCredits || 1, registry });
  if (!selection.selected) {
    return { success: false, reason: selection.reason, error: { kind: 'UNKNOWN_PROVIDER_ERROR', message: `No provider: ${selection.reason}` } };
  }

  const { credential, adapter } = selection;
  // Maximum cost contract: adapter must declare MAXIMUM possible charge BEFORE execution
  // Preferred getMaximumCreditCost, fallback estimateCost, fallback capabilities
  const maxCostFromAdapter = adapter.getMaximumCreditCost
    ? adapter.getMaximumCreditCost({ id: candidateId, companyName: job.candidate?.companyName || 'test', city: job.candidate?.city || null, businessCategory: job.candidate?.businessCategory || 'test' })
    : adapter.estimateCost
      ? adapter.estimateCost({ id: candidateId, companyName: job.candidate?.companyName || 'test', city: job.candidate?.city || null, businessCategory: job.candidate?.businessCategory || 'test' })
      : (adapter.capabilities.maximumCostPerRequest ?? adapter.capabilities.estimatedCostPerRequest ?? 1);
  const reservedCredits = estimatedCredits ?? maxCostFromAdapter;

  // Reserve atomically — COMMIT before provider call
  let reservation: ReservationResult;
  try {
    reservation = await reserveEnrichmentBudgetAtomically({
      jobId,
      candidateId,
      providerCredentialId: credential.id,
      providerType: adapter.providerType,
      providerLabel: adapter.providerLabel,
      ownerToken,
      estimatedCredits: reservedCredits,
      allowPocMode,
    });
  } catch (e: any) {
    if (e.name === 'BUDGET_RESERVATION_TIMEOUT' || e.code === 'P2028') {
      return { success: false, reason: 'BUDGET_RESERVATION_TIMEOUT', error: { kind: 'BUDGET_RESERVATION_TIMEOUT', message: e.message, retryable: true } };
    }
    throw e;
  }

  if (!reservation.reserved) {
    // Map ACTIVE_RESERVATION_EXISTS to appropriate error kind
    const kind: ProviderFailureKind = reservation.reason === 'ACTIVE_RESERVATION_EXISTS' ? 'ACTIVE_RESERVATION_EXISTS' : reservation.reason === 'BUDGET_RESERVATION_TIMEOUT' ? 'BUDGET_RESERVATION_TIMEOUT' : 'NO_CREDITS';
    return { success: false, reason: reservation.reason, error: { kind, message: `Budget reservation failed: ${reservation.reason}`, safeMetadata: { existingAttemptId: (reservation as any).existingAttemptId } } };
  }

  const attempt = reservation.attempt;

  try {
    // Execute adapter — ONLY after reservation COMMIT
    const candidateData = job.candidate || await prisma.leadCandidate.findUnique({ where: { id: candidateId } });
    const result = await adapter.enrich(
      candidateData as any,
      { credentialId: credential.id, ownerToken, attemptId: attempt.id }
    );

    const normalized = adapter.normalizeResult ? adapter.normalizeResult(result) : result;

    // Cost contract enforcement:
    // - reservedCredits is MAXIMUM
    // - actual must be <= reserved, else PROVIDER_COST_EXCEEDED_RESERVATION contract violation, keep reserved amount conservatively
    // - if actual < reserved, KEEP reserved conservatively (no refund)
    const actualCredits = normalized.creditsUsed ?? normalized.costUnits ?? reservedCredits;
    let finalCredits = reservedCredits; // keep conservative
    let costViolation = false;
    let violationMeta: any = null;
    if (actualCredits > reservedCredits) {
      costViolation = true;
      violationMeta = { reservedCredits, reportedActualCredits: actualCredits, violation: 'PROVIDER_COST_EXCEEDED_RESERVATION' };
      // Do NOT increase beyond reservation
      finalCredits = reservedCredits;
    }

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
          providerResponseCode: costViolation ? 'COST_VIOLATION' : '200',
          failureReason: costViolation ? 'PROVIDER_COST_EXCEEDED_RESERVATION' : null,
          metadata: {
            ...(attempt.metadata as any),
            completedAt: new Date().toISOString(),
            actualResult: normalized,
            finalCredits,
            reservedCredits,
            reportedActualCredits: actualCredits,
            ...(costViolation ? { costViolation: violationMeta } : {}),
          },
        },
      });
      if (costViolation) {
        return { success: true, result: normalized, attempt: updatedAttempt, reason: 'PROVIDER_COST_EXCEEDED_RESERVATION', error: { kind: 'PROVIDER_COST_EXCEEDED_RESERVATION', message: `Provider reported ${actualCredits} > reserved ${reservedCredits}`, safeMetadata: violationMeta } };
      }
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
            reservedCredits,
            reportedActualCredits: actualCredits,
            ...(costViolation ? { costViolation: violationMeta } : {}),
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
            reservedCredits,
            reportedActualCredits: actualCredits,
            ...(costViolation ? { costViolation: violationMeta } : {}),
          },
        },
      });
    }

    return { success: true, result: normalized, attempt: updatedAttempt };
  } catch (e: any) {
    const failureKind: ProviderFailureKind = e.kind || 'UNKNOWN_PROVIDER_ERROR';
    await prisma.enrichmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        durationMs: Date.now() - attempt.startedAt.getTime(),
        failureReason: e.message || 'unknown_error',
        // Keep reserved credits conservatively
        creditsUsed: reservedCredits,
        costUnits: reservedCredits,
        metadata: {
          ...(attempt.metadata as any),
          failedAt: new Date().toISOString(),
          error: e.message,
          failureKind,
          reservedCredits,
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

// ---------------------------------------------------------------- Test adapters — deterministic, no network, configurable fake credits, maximum cost contract

export class SuccessTestProvider implements EnrichmentProvider {
  providerType = 'test-success';
  providerLabel = 'Test Success Provider';
  capabilities: ProviderCapabilities = {
    canFindEmail: true,
    canFindDomain: true,
    canFindWebsite: false,
    supportsConfidence: true,
    estimatedCostPerRequest: 1,
    maximumCostPerRequest: 1,
  };
  private fakeCredits: number;

  constructor(fakeCredits = 1) {
    this.fakeCredits = fakeCredits;
    this.capabilities.estimatedCostPerRequest = fakeCredits;
    this.capabilities.maximumCostPerRequest = fakeCredits;
  }

  getMaximumCreditCost() {
    return this.fakeCredits;
  }

  estimateCost() {
    return this.fakeCredits;
  }

  async enrich(candidate: any, context: any): Promise<NormalizedEnrichmentResult> {
    // Zero network calls, deterministic, reports actual <= reserved (equal)
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
    maximumCostPerRequest: 1,
  };
  private fakeCredits: number;
  constructor(fakeCredits = 1) {
    this.fakeCredits = fakeCredits;
    this.capabilities.estimatedCostPerRequest = fakeCredits;
    this.capabilities.maximumCostPerRequest = fakeCredits;
  }
  getMaximumCreditCost() {
    return this.fakeCredits;
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
    maximumCostPerRequest: 1,
  };
  private fakeCredits: number;
  private failureKind: ProviderFailureKind;
  constructor(fakeCredits = 1, failureKind: ProviderFailureKind = 'PROVIDER_DOWN') {
    this.fakeCredits = fakeCredits;
    this.failureKind = failureKind;
    this.capabilities.estimatedCostPerRequest = fakeCredits;
    this.capabilities.maximumCostPerRequest = fakeCredits;
  }
  getMaximumCreditCost() {
    return this.fakeCredits;
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

// Zero-cost test adapter for AM
export class ZeroCostTestProvider implements EnrichmentProvider {
  providerType = 'test-zero';
  providerLabel = 'Test Zero Cost Provider';
  capabilities: ProviderCapabilities = {
    canFindEmail: true,
    canFindDomain: true,
    canFindWebsite: false,
    supportsConfidence: true,
    estimatedCostPerRequest: 0,
    maximumCostPerRequest: 0,
  };
  getMaximumCreditCost() {
    return 0;
  }
  estimateCost() {
    return 0;
  }
  async enrich(candidate: any, context: any): Promise<NormalizedEnrichmentResult> {
    return {
      status: 'SUCCESS',
      email: `zero@${candidate.companyName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'test'}.test`,
      domain: `${candidate.companyName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'test'}.test`,
      confidence: 1,
      costUnits: 0,
      creditsUsed: 0,
      providerReference: `zero-ref-${context.attemptId}`,
      metadata: { test: true, zeroCost: true },
    };
  }
}

// Violating cost provider for AK — reports actual > reserved
export class CostViolationTestProvider implements EnrichmentProvider {
  providerType = 'test-violation';
  providerLabel = 'Test Cost Violation Provider';
  capabilities: ProviderCapabilities = {
    canFindEmail: true,
    canFindDomain: false,
    canFindWebsite: false,
    supportsConfidence: true,
    estimatedCostPerRequest: 1,
    maximumCostPerRequest: 1,
  };
  private reserved: number;
  private actual: number;
  constructor(reserved = 1, actual = 2) {
    this.reserved = reserved;
    this.actual = actual;
    this.capabilities.estimatedCostPerRequest = reserved;
    this.capabilities.maximumCostPerRequest = reserved;
  }
  getMaximumCreditCost() {
    return this.reserved;
  }
  estimateCost() {
    return this.reserved;
  }
  async enrich(candidate: any, context: any): Promise<NormalizedEnrichmentResult> {
    // Intentionally violates contract: reports actual > reserved
    return {
      status: 'SUCCESS',
      email: `violation@test.test`,
      domain: `test.test`,
      confidence: 0.9,
      costUnits: this.actual,
      creditsUsed: this.actual,
      providerReference: `violation-ref-${context.attemptId}`,
      metadata: { test: true, violation: true },
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
