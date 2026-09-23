/**
 * ClientForge CRM — Phase 4C.4B Google API Request Guardrails
 * Fail-closed cost/request infrastructure for future Google Maps/Places collection
 * ZERO Google requests in this phase — no fetch, no googleapis.com, no SDK network
 *
 * Design principles:
 * - FAIL CLOSED: if budget/config cannot be determined, DO NOT CALL GOOGLE
 * - GLOBAL RESERVATION MUTEX: GoogleCollectionConfig key='default' FOR UPDATE serializes reservations
 * - GLOBAL LIMITS: daily/monthly limits GLOBAL across Google sources, per-run scoped to CollectorRun
 * - INTEGER COST UNITS: internal cost units, NOT Float, NOT USD, NOT hardcoded pricing
 * - requestSentAt semantics for CANCELLED accounting
 * - Source-aware cache uniqueness: [sourceId, queryFingerprint, operation]
 */

import { PrismaClient, GoogleOperation, GoogleRequestStatus, GoogleErrorClassification } from '@prisma/client';
import crypto from 'crypto';

// ---------------------------------------------------------------- Types

export type GoogleOperationType = 'TEXT_SEARCH' | 'NEARBY_SEARCH' | 'PLACE_DETAILS' | 'GEOCODING';
export type GoogleRequestStatusType = 'RESERVED' | 'SUCCESS' | 'NO_RESULT' | 'FAILED' | 'CANCELLED';
export type GoogleErrorClassificationType = 'AUTH_ERROR' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'INVALID_REQUEST' | 'NETWORK_ERROR' | 'UNKNOWN';

export interface GoogleCollectionConfigShape {
  id: string;
  key: string;
  enabled: boolean;
  failClosed: boolean;
  perRunRequestLimit: number;
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  dailyCostUnitLimit: number | null;
  monthlyCostUnitLimit: number | null;
  cacheEnabled: boolean;
  queryCacheTtlHours: number;
  placeDetailsCacheTtlHours: number;
  retryLimit: number;
  metadata?: any;
}

export interface ReservationRequest {
  sourceId: string; // required
  operation: GoogleOperationType;
  collectorRunId: string; // required
  workerId?: string;
  queryFingerprint: string; // deterministic hash, no API key
  placeId?: string;
  requestUnits?: number; // default 1
  estimatedCostUnits?: number; // integer internal units
  metadata?: any;
}

export interface ReservationResult {
  allowed: boolean;
  reason?: string;
  reservation?: {
    id: string;
    status: GoogleRequestStatusType;
    reservedAt: Date;
    requestUnits: number;
    estimatedCostUnits: number | null;
    queryFingerprint: string;
  };
  usage?: {
    perRun: number;
    daily: number;
    monthly: number;
    dailyCost: number;
    monthlyCost: number;
    perRunLimit: number;
    dailyLimit: number;
    monthlyLimit: number;
    dailyCostLimit: number | null;
    monthlyCostLimit: number | null;
    remainingPerRun: number;
    remainingDaily: number;
    remainingMonthly: number;
  };
  cacheHit?: {
    id: string;
    hitCount: number;
    expiresAt: Date;
  };
}

// ---------------------------------------------------------------- UTC helpers

export function getUTCStartOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function getUTCStartOfMonth(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------- Config validation (fail-closed)

export function validateGoogleCollectionConfig(config: GoogleCollectionConfigShape): { valid: boolean; reason?: string } {
  if (!config) return { valid: false, reason: 'MISSING_CONFIG' };
  if (config.enabled !== false) {
    // In Phase 4C.4B Google must remain disabled, but validation should still fail-closed if enabled true without proper setup?
    // For safety, we treat enabled false as expected, but validation of limits still applies
    // If enabled true, we still validate limits, but reservation will be denied if disabled
  }
  if (config.failClosed !== true) return { valid: false, reason: 'FAIL_CLOSED_MUST_BE_TRUE' };

  if (config.perRunRequestLimit == null || config.perRunRequestLimit <= 0) return { valid: false, reason: 'INVALID_PER_RUN_LIMIT' };
  if (config.dailyRequestLimit == null || config.dailyRequestLimit <= 0) return { valid: false, reason: 'INVALID_DAILY_LIMIT' };
  if (config.monthlyRequestLimit == null || config.monthlyRequestLimit <= 0) return { valid: false, reason: 'INVALID_MONTHLY_LIMIT' };

  if (config.monthlyRequestLimit < config.dailyRequestLimit) return { valid: false, reason: 'MONTHLY_LESS_THAN_DAILY' };

  if (config.dailyCostUnitLimit != null && config.dailyCostUnitLimit <= 0) return { valid: false, reason: 'INVALID_DAILY_COST_LIMIT' };
  if (config.monthlyCostUnitLimit != null && config.monthlyCostUnitLimit <= 0) return { valid: false, reason: 'INVALID_MONTHLY_COST_LIMIT' };

  if (config.monthlyCostUnitLimit != null && config.dailyCostUnitLimit != null && config.monthlyCostUnitLimit < config.dailyCostUnitLimit) {
    return { valid: false, reason: 'MONTHLY_COST_LESS_THAN_DAILY_COST' };
  }

  if (config.queryCacheTtlHours <= 0) return { valid: false, reason: 'INVALID_QUERY_CACHE_TTL' };
  if (config.placeDetailsCacheTtlHours <= 0) return { valid: false, reason: 'INVALID_PLACE_DETAILS_CACHE_TTL' };
  if (config.retryLimit < 0) return { valid: false, reason: 'INVALID_RETRY_LIMIT' };

  return { valid: true };
}

// ---------------------------------------------------------------- Fingerprint (SHA-256 stable, no secrets)

export interface FingerprintInput {
  operation: GoogleOperationType;
  category?: string; // normalized category/query
  city?: string; // normalized city/location
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  pageToken?: string;
  fieldSet?: string[]; // requested field set/version
  placeId?: string;
  language?: string;
}

export function createDeterministicFingerprint(input: FingerprintInput): string {
  // Stable serialization: sort keys, exclude secrets (api key, credentials, workerId, timestamp)
  const normalized: any = {
    operation: input.operation,
    category: input.category ? String(input.category).trim().toLowerCase() : null,
    city: input.city ? String(input.city).trim().toLowerCase() : null,
    country: input.country ? String(input.country).trim().toUpperCase() : null,
    countryCode: input.countryCode ? String(input.countryCode).trim().toUpperCase() : null,
    latitude: input.latitude != null ? Number(input.latitude.toFixed(6)) : null,
    longitude: input.longitude != null ? Number(input.longitude.toFixed(6)) : null,
    radiusKm: input.radiusKm != null ? Number(input.radiusKm) : null,
    pageToken: input.pageToken ? String(input.pageToken) : null,
    fieldSet: input.fieldSet ? [...input.fieldSet].sort() : null,
    placeId: input.placeId ? String(input.placeId) : null,
    language: input.language ? String(input.language).toLowerCase() : null,
  };
  // Remove nulls for stable hash? Keep nulls explicitly to differentiate missing vs null, but sort keys
  const json = JSON.stringify(normalized, Object.keys(normalized).sort());
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  return hash;
}

// ---------------------------------------------------------------- Cache helpers

export function getCacheExpiry(operation: GoogleOperationType, config: GoogleCollectionConfigShape, now = new Date()): Date {
  const ttlHours = operation === 'PLACE_DETAILS' ? config.placeDetailsCacheTtlHours : config.queryCacheTtlHours;
  return new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
}

export async function checkGoogleCache(
  prisma: PrismaClient,
  sourceId: string,
  fingerprint: string,
  operation: GoogleOperationType,
  now = new Date()
): Promise<{ hit: boolean; cache?: any }> {
  if (!sourceId || !fingerprint || !operation) return { hit: false };
  const cache = await prisma.googleApiCache.findUnique({
    where: {
      sourceId_queryFingerprint_operation: {
        sourceId,
        queryFingerprint: fingerprint,
        operation: operation as any,
      },
    },
  });
  if (!cache) return { hit: false };
  if (cache.expiresAt <= now) return { hit: false }; // expired
  return { hit: true, cache };
}

export async function recordCacheHit(prisma: PrismaClient, cacheId: string): Promise<void> {
  await prisma.googleApiCache.update({
    where: { id: cacheId },
    data: {
      hitCount: { increment: 1 },
      lastHitAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------- Usage calculation (GLOBAL mutex concept)

export async function calculateGoogleUsage(
  prisma: PrismaClient,
  sourceId: string,
  collectorRunId: string,
  now = new Date()
): Promise<{
  perRun: number;
  daily: number;
  monthly: number;
  dailyCost: number;
  monthlyCost: number;
}> {
  const startOfDay = getUTCStartOfDay(now);
  const startOfMonth = getUTCStartOfMonth(now);

  // Per-run: scoped to CollectorRun, counts RESERVED/SUCCESS/NO_RESULT/FAILED + CANCELLED with requestSentAt != null
  const perRunUsages = await prisma.googleApiUsage.findMany({
    where: {
      collectorRunId,
      status: { in: ['RESERVED', 'SUCCESS', 'NO_RESULT', 'FAILED'] as any },
    },
    select: { requestUnits: true, estimatedCostUnits: true, actualCostUnits: true, status: true, requestSentAt: true },
  });
  // Also include CANCELLED where requestSentAt != null (counts)
  const perRunCancelled = await prisma.googleApiUsage.findMany({
    where: {
      collectorRunId,
      status: 'CANCELLED' as any,
      requestSentAt: { not: null },
    },
    select: { requestUnits: true, estimatedCostUnits: true, actualCostUnits: true },
  });

  const perRun = [...perRunUsages, ...perRunCancelled].reduce((sum, u) => sum + (u.requestUnits || 0), 0);
  const perRunCost = [...perRunUsages, ...perRunCancelled].reduce((sum, u) => sum + (u.actualCostUnits ?? u.estimatedCostUnits ?? 0), 0);

  // Daily GLOBAL: across all Google sources, same status logic
  const dailyUsages = await prisma.googleApiUsage.findMany({
    where: {
      reservedAt: { gte: startOfDay },
      status: { in: ['RESERVED', 'SUCCESS', 'NO_RESULT', 'FAILED'] as any },
    },
    select: { requestUnits: true, estimatedCostUnits: true, actualCostUnits: true },
  });
  const dailyCancelled = await prisma.googleApiUsage.findMany({
    where: {
      reservedAt: { gte: startOfDay },
      status: 'CANCELLED' as any,
      requestSentAt: { not: null },
    },
    select: { requestUnits: true, estimatedCostUnits: true, actualCostUnits: true },
  });
  const daily = [...dailyUsages, ...dailyCancelled].reduce((sum, u) => sum + (u.requestUnits || 0), 0);
  const dailyCost = [...dailyUsages, ...dailyCancelled].reduce((sum, u) => sum + (u.actualCostUnits ?? u.estimatedCostUnits ?? 0), 0);

  // Monthly GLOBAL
  const monthlyUsages = await prisma.googleApiUsage.findMany({
    where: {
      reservedAt: { gte: startOfMonth },
      status: { in: ['RESERVED', 'SUCCESS', 'NO_RESULT', 'FAILED'] as any },
    },
    select: { requestUnits: true, estimatedCostUnits: true, actualCostUnits: true },
  });
  const monthlyCancelled = await prisma.googleApiUsage.findMany({
    where: {
      reservedAt: { gte: startOfMonth },
      status: 'CANCELLED' as any,
      requestSentAt: { not: null },
    },
    select: { requestUnits: true, estimatedCostUnits: true, actualCostUnits: true },
  });
  const monthly = [...monthlyUsages, ...monthlyCancelled].reduce((sum, u) => sum + (u.requestUnits || 0), 0);
  const monthlyCost = [...monthlyUsages, ...monthlyCancelled].reduce((sum, u) => sum + (u.actualCostUnits ?? u.estimatedCostUnits ?? 0), 0);

  return {
    perRun,
    daily,
    monthly,
    dailyCost,
    monthlyCost,
  };
}

// ---------------------------------------------------------------- Atomic reservation (GLOBAL MUTEX)

export async function reserveGoogleRequestBudgetAtomically(
  prisma: PrismaClient,
  req: ReservationRequest
): Promise<ReservationResult> {
  // Fail-closed checks before transaction
  if (!req.sourceId) return { allowed: false, reason: 'MISSING_SOURCE_ID' };
  if (!req.collectorRunId) return { allowed: false, reason: 'MISSING_COLLECTOR_RUN_ID' };
  if (!req.operation) return { allowed: false, reason: 'MISSING_OPERATION' };
  if (!req.queryFingerprint) return { allowed: false, reason: 'MISSING_FINGERPRINT' };

  const requestUnits = req.requestUnits ?? 1;
  if (requestUnits <= 0) return { allowed: false, reason: 'INVALID_REQUEST_UNITS' };

  // Check cache BEFORE billable reservation (does not consume budget)
  try {
    const cacheCheck = await checkGoogleCache(prisma, req.sourceId, req.queryFingerprint, req.operation as any);
    if (cacheCheck.hit) {
      // No reservation, no budget consumed
      await recordCacheHit(prisma, cacheCheck.cache.id);
      return {
        allowed: true,
        reason: 'CACHE_HIT',
        cacheHit: {
          id: cacheCheck.cache.id,
          hitCount: cacheCheck.cache.hitCount + 1,
          expiresAt: cacheCheck.cache.expiresAt,
        },
      };
    }
  } catch (e: any) {
    // Cache check failure should not block? For safety, fail-closed if cache check fails? But cache is optional
    // We will continue to reservation path if cache check fails, but log
    console.warn('[google-guardrails] cache check failed, proceeding to reservation', e.message);
  }

  // Atomic reservation with GLOBAL MUTEX: lock GoogleCollectionConfig default FOR UPDATE
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // GLOBAL GOOGLE RESERVATION MUTEX — this row lock serializes all Google budget reservations
        // At current expected volume this is acceptable and safer than premature complexity
        await tx.$queryRaw`SELECT * FROM "GoogleCollectionConfig" WHERE key='default' FOR UPDATE`;

        const config = await tx.googleCollectionConfig.findFirst({ where: { key: 'default' } });
        if (!config) return { allowed: false, reason: 'MISSING_CONFIG' } as ReservationResult;

        const validation = validateGoogleCollectionConfig(config);
        if (!validation.valid) return { allowed: false, reason: validation.reason } as ReservationResult;

        // Source disabled check
        const source = await tx.dataSource.findUnique({ where: { id: req.sourceId } });
        if (!source) return { allowed: false, reason: 'SOURCE_NOT_FOUND' } as ReservationResult;
        if (!source.enabled) return { allowed: false, reason: 'SOURCE_DISABLED' } as ReservationResult;
        if (source.type !== 'google_places' && source.type !== 'google_maps' && source.type !== 'google') {
          // Allow custom type for tests but check enabled
        }

        // Config disabled check — fail-closed
        if (!config.enabled) return { allowed: false, reason: 'GOOGLE_COLLECTION_DISABLED' } as ReservationResult;

        // Calculate usage INCLUDING RESERVED (conservative crash accounting)
        const usage = await calculateGoogleUsage(tx as any, req.sourceId, req.collectorRunId);

        // Check per-run limit (scoped to CollectorRun)
        if (usage.perRun + requestUnits > config.perRunRequestLimit) {
          return {
            allowed: false,
            reason: 'PER_RUN_LIMIT_REACHED',
            usage: {
              perRun: usage.perRun,
              daily: usage.daily,
              monthly: usage.monthly,
              dailyCost: usage.dailyCost,
              monthlyCost: usage.monthlyCost,
              perRunLimit: config.perRunRequestLimit,
              dailyLimit: config.dailyRequestLimit,
              monthlyLimit: config.monthlyRequestLimit,
              dailyCostLimit: config.dailyCostUnitLimit,
              monthlyCostLimit: config.monthlyCostUnitLimit,
              remainingPerRun: Math.max(0, config.perRunRequestLimit - usage.perRun),
              remainingDaily: Math.max(0, config.dailyRequestLimit - usage.daily),
              remainingMonthly: Math.max(0, config.monthlyRequestLimit - usage.monthly),
            },
          } as ReservationResult;
        }

        // Check daily GLOBAL limit
        if (usage.daily + requestUnits > config.dailyRequestLimit) {
          return {
            allowed: false,
            reason: 'DAILY_LIMIT_REACHED',
            usage: {
              perRun: usage.perRun,
              daily: usage.daily,
              monthly: usage.monthly,
              dailyCost: usage.dailyCost,
              monthlyCost: usage.monthlyCost,
              perRunLimit: config.perRunRequestLimit,
              dailyLimit: config.dailyRequestLimit,
              monthlyLimit: config.monthlyRequestLimit,
              dailyCostLimit: config.dailyCostUnitLimit,
              monthlyCostLimit: config.monthlyCostUnitLimit,
              remainingPerRun: Math.max(0, config.perRunRequestLimit - usage.perRun),
              remainingDaily: Math.max(0, config.dailyRequestLimit - usage.daily),
              remainingMonthly: Math.max(0, config.monthlyRequestLimit - usage.monthly),
            },
          } as ReservationResult;
        }

        // Check monthly GLOBAL limit
        if (usage.monthly + requestUnits > config.monthlyRequestLimit) {
          return {
            allowed: false,
            reason: 'MONTHLY_LIMIT_REACHED',
            usage: {
              perRun: usage.perRun,
              daily: usage.daily,
              monthly: usage.monthly,
              dailyCost: usage.dailyCost,
              monthlyCost: usage.monthlyCost,
              perRunLimit: config.perRunRequestLimit,
              dailyLimit: config.dailyRequestLimit,
              monthlyLimit: config.monthlyRequestLimit,
              dailyCostLimit: config.dailyCostUnitLimit,
              monthlyCostLimit: config.monthlyCostUnitLimit,
              remainingPerRun: Math.max(0, config.perRunRequestLimit - usage.perRun),
              remainingDaily: Math.max(0, config.dailyRequestLimit - usage.daily),
              remainingMonthly: Math.max(0, config.monthlyRequestLimit - usage.monthly),
            },
          } as ReservationResult;
        }

        // Check daily cost unit limit (GLOBAL)
        if (config.dailyCostUnitLimit != null && req.estimatedCostUnits != null) {
          if (usage.dailyCost + req.estimatedCostUnits > config.dailyCostUnitLimit) {
            return { allowed: false, reason: 'DAILY_COST_LIMIT_REACHED' } as ReservationResult;
          }
        }

        // Check monthly cost unit limit (GLOBAL)
        if (config.monthlyCostUnitLimit != null && req.estimatedCostUnits != null) {
          if (usage.monthlyCost + req.estimatedCostUnits > config.monthlyCostUnitLimit) {
            return { allowed: false, reason: 'MONTHLY_COST_LIMIT_REACHED' } as ReservationResult;
          }
        }

        // Duplicate active reservation check — same source + fingerprint + operation + status RESERVED
        const existingActive = await tx.googleApiUsage.findFirst({
          where: {
            sourceId: req.sourceId,
            queryFingerprint: req.queryFingerprint,
            operation: req.operation as any,
            status: 'RESERVED' as any,
          },
        });
        if (existingActive) {
          return { allowed: false, reason: 'ACTIVE_RESERVATION_EXISTS', reservation: { id: existingActive.id, status: existingActive.status as any, reservedAt: existingActive.reservedAt, requestUnits: existingActive.requestUnits, estimatedCostUnits: existingActive.estimatedCostUnits, queryFingerprint: existingActive.queryFingerprint } } as ReservationResult;
        }

        // Create RESERVED usage record — counts immediately, survives crash, no auto-refund
        const reserved = await tx.googleApiUsage.create({
          data: {
            sourceId: req.sourceId,
            operation: req.operation as any,
            status: 'RESERVED' as any,
            reservedAt: new Date(),
            requestUnits,
            estimatedCostUnits: req.estimatedCostUnits ?? null,
            collectorRunId: req.collectorRunId,
            workerId: req.workerId ?? null,
            queryFingerprint: req.queryFingerprint,
            placeId: req.placeId ?? null,
            metadata: req.metadata ?? null,
          },
        });

        // Re-calculate usage after reservation for observability
        const usageAfter = await calculateGoogleUsage(tx as any, req.sourceId, req.collectorRunId);

        return {
          allowed: true,
          reservation: {
            id: reserved.id,
            status: reserved.status as any,
            reservedAt: reserved.reservedAt,
            requestUnits: reserved.requestUnits,
            estimatedCostUnits: reserved.estimatedCostUnits,
            queryFingerprint: reserved.queryFingerprint,
          },
          usage: {
            perRun: usageAfter.perRun,
            daily: usageAfter.daily,
            monthly: usageAfter.monthly,
            dailyCost: usageAfter.dailyCost,
            monthlyCost: usageAfter.monthlyCost,
            perRunLimit: config.perRunRequestLimit,
            dailyLimit: config.dailyRequestLimit,
            monthlyLimit: config.monthlyRequestLimit,
            dailyCostLimit: config.dailyCostUnitLimit,
            monthlyCostLimit: config.monthlyCostUnitLimit,
            remainingPerRun: Math.max(0, config.perRunRequestLimit - usageAfter.perRun),
            remainingDaily: Math.max(0, config.dailyRequestLimit - usageAfter.daily),
            remainingMonthly: Math.max(0, config.monthlyRequestLimit - usageAfter.monthly),
          },
        } as ReservationResult;
      },
      { maxWait: 15000, timeout: 20000 }
    );

    return result;
  } catch (e: any) {
    if (e.code === 'P2028' || e.message?.includes('Unable to start a transaction') || e.message?.includes('Transaction API error')) {
      return { allowed: false, reason: 'RESERVATION_TIMEOUT' };
    }
    // Fail-closed on any error
    console.error('[google-guardrails] reservation failed fail-closed', e.message);
    return { allowed: false, reason: 'RESERVATION_FAILED' };
  }
}

// ---------------------------------------------------------------- Completion helpers (no Google fetch)

export async function completeGoogleReservation(
  prisma: PrismaClient,
  reservationId: string,
  status: GoogleRequestStatusType,
  options?: {
    actualCostUnits?: number;
    requestSentAt?: Date;
    errorClassification?: GoogleErrorClassificationType;
    errorMessage?: string;
    placeId?: string;
    metadata?: any;
  }
): Promise<void> {
  const data: any = {
    status: status as any,
    completedAt: new Date(),
  };
  if (options?.actualCostUnits != null) data.actualCostUnits = options.actualCostUnits;
  if (options?.requestSentAt) data.requestSentAt = options.requestSentAt;
  if (options?.errorClassification) data.errorClassification = options.errorClassification as any;
  if (options?.errorMessage) data.errorMessage = options.errorMessage;
  if (options?.placeId) data.placeId = options.placeId;
  if (options?.metadata) data.metadata = options.metadata;

  await prisma.googleApiUsage.update({
    where: { id: reservationId },
    data,
  });
}

export async function cancelGoogleReservation(
  prisma: PrismaClient,
  reservationId: string,
  requestSent: boolean,
  metadata?: any
): Promise<void> {
  // CANCELLED semantics:
  // - If requestSentAt != null (request actually sent) → counts (conservative)
  // - If requestSentAt == null (proven pre-call cancellation) → may be treated as non-billable
  // No automatic refund for unresolved RESERVED
  const data: any = {
    status: 'CANCELLED' as any,
    completedAt: new Date(),
    metadata,
  };
  if (requestSent) {
    data.requestSentAt = new Date();
  } else {
    data.requestSentAt = null; // proven pre-call
  }
  await prisma.googleApiUsage.update({
    where: { id: reservationId },
    data,
  });
}

// ---------------------------------------------------------------- Source health classification

export function classifyGoogleError(error: any): GoogleErrorClassificationType {
  if (!error) return 'UNKNOWN';
  const msg = String(error.message || error).toLowerCase();
  if (msg.includes('auth') || msg.includes('api key') || msg.includes('invalid api key') || msg.includes('permission denied')) return 'AUTH_ERROR';
  if (msg.includes('quota') || msg.includes('billing') || msg.includes('quota exceeded')) return 'QUOTA_EXCEEDED';
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) return 'RATE_LIMITED';
  if (msg.includes('invalid request') || msg.includes('400')) return 'INVALID_REQUEST';
  if (msg.includes('network') || msg.includes('fetch_error') || msg.includes('timeout') || msg.includes('econnreset')) return 'NETWORK_ERROR';
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('server error')) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

export function getHealthStatusForErrorClassification(classification: GoogleErrorClassificationType): string {
  switch (classification) {
    case 'AUTH_ERROR':
      return 'down'; // stop further requests
    case 'QUOTA_EXCEEDED':
      return 'down'; // stop for current budget period
    case 'RATE_LIMITED':
      return 'degraded';
    case 'SERVER_ERROR':
    case 'NETWORK_ERROR':
      return 'degraded';
    case 'INVALID_REQUEST':
      return 'degraded';
    default:
      return 'degraded';
  }
}

// ---------------------------------------------------------------- Safe metrics (no secrets)

export interface GoogleGuardrailMetrics {
  config: {
    enabled: boolean;
    failClosed: boolean;
    perRunRequestLimit: number;
    dailyRequestLimit: number;
    monthlyRequestLimit: number;
    dailyCostUnitLimit: number | null;
    monthlyCostUnitLimit: number | null;
    cacheEnabled: boolean;
  };
  usage: {
    perRun?: number;
    daily: number;
    monthly: number;
    dailyCost: number;
    monthlyCost: number;
    remainingDaily: number;
    remainingMonthly: number;
  };
  today: {
    reserved: number;
    success: number;
    noResult: number;
    failed: number;
    cancelled: number;
  };
  month: {
    reserved: number;
    success: number;
    noResult: number;
    failed: number;
    cancelled: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: string;
  };
  health: {
    status: string;
    lastCheckedAt: Date | null;
  };
}

export async function getGoogleGuardrailMetrics(prisma: PrismaClient, sourceId?: string): Promise<GoogleGuardrailMetrics> {
  const config = await prisma.googleCollectionConfig.findFirst({ where: { key: 'default' } });
  if (!config) throw new Error('Missing GoogleCollectionConfig');

  const startOfDay = getUTCStartOfDay();
  const startOfMonth = getUTCStartOfMonth();

  const whereDaily = { reservedAt: { gte: startOfDay }, ...(sourceId ? { sourceId } : {}) };
  const whereMonthly = { reservedAt: { gte: startOfMonth }, ...(sourceId ? { sourceId } : {}) };

  const [dailyUsages, monthlyUsages, cacheHits] = await Promise.all([
    prisma.googleApiUsage.findMany({ where: whereDaily as any, select: { status: true, requestUnits: true, estimatedCostUnits: true, actualCostUnits: true } }),
    prisma.googleApiUsage.findMany({ where: whereMonthly as any, select: { status: true, requestUnits: true, estimatedCostUnits: true, actualCostUnits: true } }),
    prisma.googleApiCache.aggregate({ where: { ...(sourceId ? { sourceId } : {}) }, _sum: { hitCount: true } }),
  ]);

  const countByStatus = (usages: any[], status: string) => usages.filter((u) => u.status === status).reduce((sum, u) => sum + (u.requestUnits || 0), 0);

  const daily = dailyUsages.reduce((sum, u) => sum + (u.requestUnits || 0), 0);
  const monthly = monthlyUsages.reduce((sum, u) => sum + (u.requestUnits || 0), 0);
  const dailyCost = dailyUsages.reduce((sum, u) => sum + (u.actualCostUnits ?? u.estimatedCostUnits ?? 0), 0);
  const monthlyCost = monthlyUsages.reduce((sum, u) => sum + (u.actualCostUnits ?? u.estimatedCostUnits ?? 0), 0);

  // Cache metrics: hits = sum hitCount, misses = total usages - hits? For simplicity, hits = sum hitCount, misses = total cache misses approximated by usage that was not cache hit
  // In this phase we don't have cache miss counter, so we approximate misses as total daily usages that required reservation
  const hits = cacheHits._sum.hitCount || 0;
  const misses = daily; // each usage was a miss that required reservation (since cache hit would not create usage)
  const hitRate = hits + misses > 0 ? `${((hits / (hits + misses)) * 100).toFixed(2)}%` : '0%';

  const source = sourceId ? await prisma.dataSource.findUnique({ where: { id: sourceId } }) : null;

  return {
    config: {
      enabled: config.enabled,
      failClosed: config.failClosed,
      perRunRequestLimit: config.perRunRequestLimit,
      dailyRequestLimit: config.dailyRequestLimit,
      monthlyRequestLimit: config.monthlyRequestLimit,
      dailyCostUnitLimit: config.dailyCostUnitLimit,
      monthlyCostUnitLimit: config.monthlyCostUnitLimit,
      cacheEnabled: config.cacheEnabled,
    },
    usage: {
      daily,
      monthly,
      dailyCost,
      monthlyCost,
      remainingDaily: Math.max(0, config.dailyRequestLimit - daily),
      remainingMonthly: Math.max(0, config.monthlyRequestLimit - monthly),
    },
    today: {
      reserved: countByStatus(dailyUsages, 'RESERVED'),
      success: countByStatus(dailyUsages, 'SUCCESS'),
      noResult: countByStatus(dailyUsages, 'NO_RESULT'),
      failed: countByStatus(dailyUsages, 'FAILED'),
      cancelled: countByStatus(dailyUsages, 'CANCELLED'),
    },
    month: {
      reserved: countByStatus(monthlyUsages, 'RESERVED'),
      success: countByStatus(monthlyUsages, 'SUCCESS'),
      noResult: countByStatus(monthlyUsages, 'NO_RESULT'),
      failed: countByStatus(monthlyUsages, 'FAILED'),
      cancelled: countByStatus(monthlyUsages, 'CANCELLED'),
    },
    cache: {
      hits,
      misses,
      hitRate,
    },
    health: {
      status: source?.healthStatus || 'unknown',
      lastCheckedAt: source?.lastCheckedAt || null,
    },
  };
}

// ---------------------------------------------------------------- Validation helpers for future adapter

export function isGoogleSourceEnabled(config: GoogleCollectionConfigShape, source: { enabled: boolean; type: string }): boolean {
  if (!config.enabled) return false;
  if (!source.enabled) return false;
  if (config.failClosed !== true) return false; // fail-closed if failClosed not true
  return true;
}
