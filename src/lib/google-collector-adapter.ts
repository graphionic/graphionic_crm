/**
 * Phase 4C.4C.5B — Google Collector Adapter & Dispatcher Integration
 * Prepares collector integration boundary, unreachable while disabled.
 * Uses existing: credential reader, builders, field masks, fingerprinting, cache, budget, usage, error classification, normalization
 * ZERO GOOGLE NETWORK — Google execution remains gated and production-disabled.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { getGoogleCredentialStatus } from './google-credential-reader';
import {
  getActivationModeFromConfig,
  validateGoogleActivationScope,
  canExecuteGoogleBase,
  CANARY_PAGINATION_ENABLED,
  CANARY_RETRY_LIMIT,
  STAGED_REQUEST,
  buildSafeMetricsLog,
  GoogleActivationMode,
  CanaryScope,
} from './google-activation';
import {
  NormalizedBusinessRecord,
  normalizedFromGooglePlace,
  matchNormalizedRecords,
  mergeBusinessEvidence,
  SourceEvidence,
} from './collection-normalization';
import {
  buildTextSearchRequest,
  SEARCH_ID_ONLY_MASK,
  GoogleTransport,
  MockGoogleTransport,
  RealGoogleTransport,
  GooglePlacesRequest,
} from './google-places-adapter';
import {
  reserveGoogleRequestBudgetAtomically,
  completeGoogleReservation,
  checkGoogleCache,
  recordCacheHit,
} from './google-request-guardrails';

export interface GoogleCollectorContext {
  prisma: PrismaClient;
  location: { id: string; countryCode: string; city: string; latitude?: number; longitude?: number };
  category: { id: string; slug: string; name: string };
  source: any;
  collectorRunId: string;
  config: any;
}

export interface GoogleCollectorOptions {
  transport?: GoogleTransport;
  bypassEnabledCheckForTest?: boolean;
  dryRun?: boolean;
  pageSize?: number;
  forceActivationModeForTest?: GoogleActivationMode;
  forceCanaryScopesForTest?: CanaryScope[];
  candidatePersistencePolicy?: 'MATCH_EXISTING_FIRST' | 'ALWAYS_PERSIST' | 'DRY_RUN';
}

export interface GoogleCollectorResult {
  status: 'SKIPPED' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  reason?: string;
  metrics: Record<string, any>;
  candidatesFound: number;
  normalizedRecords?: NormalizedBusinessRecord[];
  safeLog: Record<string, any>;
  error?: any;
}

// ---------------------------------------------------------------- Deterministic Category Query Mapping

export const CATEGORY_GOOGLE_QUERY_MAP: Record<string, string> = {
  dental: 'dental clinic',
  dentist: 'dental clinic',
  dental_clinic: 'dental clinic',
  eye: 'optician',
  optician: 'optician',
  opticians: 'optician',
  pet_store: 'pet store',
  pets: 'pet store',
  hospital: 'hospital',
  physio: 'physiotherapy clinic',
  physiotherapy: 'physiotherapy clinic',
  orthopedic: 'orthopedic clinic',
  orthopedics: 'orthopedic clinic',
  ivf: 'fertility clinic',
  fertility: 'fertility clinic',
};

export function getGoogleQueryForCategory(category: { slug?: string; name?: string }): string {
  if (!category) return 'business';
  const slug = (category.slug || '').trim().toLowerCase();
  if (CATEGORY_GOOGLE_QUERY_MAP[slug]) {
    return CATEGORY_GOOGLE_QUERY_MAP[slug];
  }
  const name = (category.name || '').trim().toLowerCase();
  if (name && CATEGORY_GOOGLE_QUERY_MAP[name]) {
    return CATEGORY_GOOGLE_QUERY_MAP[name];
  }
  // Safe default: use category name or slug + clinic/service
  return name || slug || 'business';
}

// ---------------------------------------------------------------- Deterministic Location Mapping

export interface GoogleLocationScope {
  city: string;
  countryCode: string;
  countryName: string;
  latitude?: number;
  longitude?: number;
}

export function getGoogleLocationScope(location: {
  city?: string;
  countryCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}): GoogleLocationScope {
  const city = (location?.city || '').trim();
  const countryCode = (location?.countryCode || 'GB').trim().toUpperCase();
  let countryName = (location?.country || '').trim();
  if (!countryName) {
    if (countryCode === 'GB' || countryCode === 'UK') countryName = 'UK';
    else if (countryCode === 'US') countryName = 'USA';
    else if (countryCode === 'DE') countryName = 'Germany';
    else if (countryCode === 'FR') countryName = 'France';
    else countryName = countryCode;
  }
  return {
    city,
    countryCode,
    countryName,
    latitude: location?.latitude,
    longitude: location?.longitude,
  };
}

// ---------------------------------------------------------------- Request Plan (Stage A ID Discovery)

export interface GooglePlannedRequest {
  operation: 'TEXT_SEARCH';
  textQuery: string;
  fieldMask: readonly string[];
  fieldMaskString: string;
  pageSize: number;
  useIdOnly: boolean;
  paginationEnabled: boolean;
  retryLimit: number;
}

export function planGoogleStageARequest(params: {
  category: { slug?: string; name?: string };
  location: { city?: string; countryCode?: string; country?: string };
  pageSize?: number;
}): GooglePlannedRequest {
  const categoryTerm = getGoogleQueryForCategory(params.category);
  const locScope = getGoogleLocationScope(params.location);
  const textQuery = `${categoryTerm} in ${locScope.city} ${locScope.countryName}`.trim();
  const pageSize = Math.min(Math.max(1, params.pageSize || 3), 5); // bounded canary size

  return {
    operation: 'TEXT_SEARCH',
    textQuery,
    fieldMask: SEARCH_ID_ONLY_MASK,
    fieldMaskString: SEARCH_ID_ONLY_MASK.join(','),
    pageSize,
    useIdOnly: true,
    paginationEnabled: CANARY_PAGINATION_ENABLED,
    retryLimit: CANARY_RETRY_LIMIT,
  };
}

// ---------------------------------------------------------------- Deterministic Fingerprinting

export function generateGoogleRequestFingerprint(params: {
  operation: string;
  textQuery: string;
  fieldMask?: readonly string[] | string[];
  pageSize?: number;
  sourceId?: string;
}): string {
  const op = (params.operation || 'TEXT_SEARCH').toUpperCase();
  const query = (params.textQuery || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const mask = params.fieldMask ? [...params.fieldMask].sort().join(',') : SEARCH_ID_ONLY_MASK.join(',');
  const size = params.pageSize || 3;
  const src = params.sourceId || 'default';

  const raw = `op:${op}|query:${query}|mask:${mask}|size:${size}|src:${src}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

// ---------------------------------------------------------------- Execution Gate Checks

export async function canExecuteGoogleCollector(
  ctx: GoogleCollectorContext,
  options?: GoogleCollectorOptions
): Promise<{ allowed: boolean; reason?: string; mode?: GoogleActivationMode; scope?: CanaryScope }> {
  const effectiveConfig = ctx.config || {};
  const effectiveMode = options?.forceActivationModeForTest || getActivationModeFromConfig(effectiveConfig);

  // If testing with synthetic bypass
  if (options?.bypassEnabledCheckForTest) {
    const scopeCheck = validateGoogleActivationScope(
      { ...effectiveConfig, activationMode: effectiveMode, canaryScopes: options?.forceCanaryScopesForTest || effectiveConfig.canaryScopes },
      { countryCode: ctx.location.countryCode, city: ctx.location.city },
      { slug: ctx.category.slug }
    );
    if (!scopeCheck.allowed) {
      return { allowed: false, reason: scopeCheck.reason, mode: scopeCheck.mode, scope: scopeCheck.scope };
    }
    return { allowed: true, mode: scopeCheck.mode, scope: scopeCheck.scope };
  }

  // Normal strict production gate checks
  const credStatus = getGoogleCredentialStatus();
  const base = canExecuteGoogleBase(effectiveConfig, ctx.source, credStatus.configured);
  if (!base.allowed) {
    return { allowed: false, reason: base.reason, mode: effectiveMode };
  }

  const scopeCheck = validateGoogleActivationScope(
    effectiveConfig,
    { countryCode: ctx.location.countryCode, city: ctx.location.city },
    { slug: ctx.category.slug }
  );
  if (!scopeCheck.allowed) {
    return { allowed: false, reason: scopeCheck.reason, mode: scopeCheck.mode, scope: scopeCheck.scope };
  }

  return { allowed: true, mode: scopeCheck.mode, scope: scopeCheck.scope };
}

// ---------------------------------------------------------------- Core Execution Pipeline (ZERO NETWORK in 5B)

export async function collectFromGoogleSource(
  ctx: GoogleCollectorContext,
  options?: GoogleCollectorOptions
): Promise<GoogleCollectorResult> {
  const metrics: Record<string, any> = {
    googleRequests: 0,
    googleCacheHits: 0,
    googleCacheMisses: 0,
    googleResults: 0,
    googleUniquePlaces: 0,
    googleMatchedExistingCandidates: 0,
    googleNewCandidates: 0,
    googleWebsiteEvidenceFound: 0,
    googleLiveWebsiteRejected: 0,
    googleNoWebsiteEvidence: 0,
    googlePhoneEvidenceFound: 0,
    googleCandidatesWithEmail: 0,
    googleQualifiedLeads: 0,
    googleDuplicatesPrevented: 0,
    googleRequestUnits: 0,
    googleCostUnits: 0,
    googleErrors: 0,
  };

  // Gate Check
  const check = await canExecuteGoogleCollector(ctx, options);
  if (!check.allowed) {
    return {
      status: 'SKIPPED',
      reason: check.reason,
      metrics: buildSafeMetricsLog(metrics),
      candidatesFound: 0,
      safeLog: {
        operation: 'GOOGLE_SKIPPED',
        reason: check.reason,
        mode: check.mode,
        scope: check.scope,
      },
    };
  }

  // Step 1: Request Plan (Stage A ID Discovery)
  const plan = planGoogleStageARequest({
    category: ctx.category,
    location: ctx.location,
    pageSize: options?.pageSize || 3,
  });

  // Step 2: Fingerprint calculation
  const queryFingerprint = generateGoogleRequestFingerprint({
    operation: plan.operation,
    textQuery: plan.textQuery,
    fieldMask: plan.fieldMask,
    pageSize: plan.pageSize,
    sourceId: ctx.source?.id,
  });

  let rawPlaces: any[] = [];
  let cacheHit = false;
  let reservationId: string | null = null;

  // Step 3: Cache Check (Cache before budget)
  if (ctx.prisma && ctx.config?.cacheEnabled !== false) {
    try {
      const cached = await checkGoogleCache(
        ctx.prisma,
        ctx.source.id,
        queryFingerprint,
        plan.operation
      );
      if (cached.hit && cached.cache) {
        cacheHit = true;
        metrics.googleCacheHits = 1;
        const meta = cached.cache.responseMetadata || {};
        rawPlaces = Array.isArray(meta.places) ? meta.places : [];
      }
    } catch (e: any) {
      // Cache failure should not crash, fail closed to miss
    }
  }

  // Step 4: Budget Reservation (if cache miss)
  if (!cacheHit) {
    metrics.googleCacheMisses = 1;

    if (ctx.prisma && !options?.dryRun) {
      const reservation = await reserveGoogleRequestBudgetAtomically(ctx.prisma, {
        sourceId: ctx.source.id,
        operation: plan.operation,
        collectorRunId: ctx.collectorRunId,
        queryFingerprint,
        requestUnits: 1,
        estimatedCostUnits: 1,
        metadata: {
          query: plan.textQuery,
          fieldMask: plan.fieldMaskString,
          pageSize: plan.pageSize,
        },
      });

      if (!reservation.allowed) {
        metrics.googleErrors = 1;
        return {
          status: 'SKIPPED',
          reason: reservation.reason || 'BUDGET_EXHAUSTED',
          metrics: buildSafeMetricsLog(metrics),
          candidatesFound: 0,
          safeLog: {
            operation: plan.operation,
            reason: reservation.reason,
            queryFingerprint,
          },
        };
      }
      reservationId = reservation.reservation?.id || null;
      metrics.googleRequestUnits = 1;
      metrics.googleCostUnits = 1;
    }

    // Step 5: Transport Boundary (Injectable Mock vs Real)
    const transport = options?.transport;
    if (!transport) {
      // In Phase 4C.4C.5B, real transport is disabled
      assertGoogleTransportAllowed(ctx);
      throw new Error('GOOGLE_NETWORK_TRANSPORT_DISABLED');
    }

    const requestObj = buildTextSearchRequest({
      textQuery: plan.textQuery,
      pageSize: plan.pageSize,
      useIdOnly: true,
    });

    const res = await transport.send({
      request: requestObj,
      reservation: {
        usageId: reservationId || 'test-reservation-id',
        sourceId: ctx.source.id,
        collectorRunId: ctx.collectorRunId,
        operation: plan.operation,
        queryFingerprint,
        reservedAt: new Date(),
      },
    });

    metrics.googleRequests = 1;

    if (res.status === 'SUCCESS' && res.data) {
      rawPlaces = Array.isArray(res.data.places) ? res.data.places : [];

      // Complete reservation as SUCCESS
      if (ctx.prisma && reservationId) {
        try {
          await completeGoogleReservation(ctx.prisma, reservationId, 'SUCCESS', {
            requestSentAt: new Date(),
            actualCostUnits: 1,
            metadata: {
              resultCount: rawPlaces.length,
            },
          });
        } catch {}
      }

      // Write Cache
      if (ctx.prisma && ctx.config?.cacheEnabled !== false) {
        try {
          const ttlHours = ctx.config?.queryCacheTtlHours || 24;
          const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
          await ctx.prisma.googleApiCache.upsert({
            where: {
              sourceId_queryFingerprint_operation: {
                sourceId: ctx.source.id,
                queryFingerprint,
                operation: plan.operation,
              },
            },
            create: {
              sourceId: ctx.source.id,
              queryFingerprint,
              operation: plan.operation,
              responseMetadata: { places: rawPlaces },
              expiresAt,
            },
            update: {
              responseMetadata: { places: rawPlaces },
              expiresAt,
              hitCount: 0,
            },
          });
        } catch {}
      }
    } else {
      metrics.googleErrors = 1;
      if (ctx.prisma && reservationId) {
        try {
          await completeGoogleReservation(ctx.prisma, reservationId, 'FAILED', {
            requestSentAt: new Date(),
            errorClassification: res.error?.classification || 'UNKNOWN',
            errorMessage: res.error?.message || 'Transport error',
          });
        } catch {}
      }
      return {
        status: 'FAILED',
        reason: res.error?.message || 'GOOGLE_TRANSPORT_FAILED',
        metrics: buildSafeMetricsLog(metrics),
        candidatesFound: 0,
        safeLog: {
          operation: plan.operation,
          status: 'FAILED',
          error: res.error?.classification,
        },
      };
    }
  }

  // Step 6: Normalization
  metrics.googleResults = rawPlaces.length;
  const uniquePlaceIds = new Set<string>();
  const normalizedRecords: NormalizedBusinessRecord[] = [];

  for (const raw of rawPlaces) {
    const placeId = raw.id || (raw.name ? raw.name.replace(/^places\//, '') : null);
    if (!placeId) continue;
    uniquePlaceIds.add(placeId);

    const norm = normalizedFromGooglePlace(
      {
        place_id: placeId,
        name: raw.displayName?.text || raw.name || `Place ${placeId}`,
        formatted_address: raw.formattedAddress,
        formatted_phone_number: raw.nationalPhoneNumber || raw.internationalPhoneNumber,
        international_phone_number: raw.internationalPhoneNumber,
        website: raw.websiteUri,
        geometry: raw.location ? { location: { lat: raw.location.latitude, lng: raw.location.longitude } } : undefined,
      },
      ctx.category.slug,
      ctx.source.id
    );

    if (norm) {
      normalizedRecords.push(norm);
      if (norm.website) metrics.googleWebsiteEvidenceFound++;
      else metrics.googleNoWebsiteEvidence++;
      if (norm.phone) metrics.googlePhoneEvidenceFound++;
      if (norm.email) metrics.googleCandidatesWithEmail++;
    }
  }
  metrics.googleUniquePlaces = uniquePlaceIds.size;

  // Step 7: Common Business Processing & Matching
  const candidatePolicy = options?.candidatePersistencePolicy || 'MATCH_EXISTING_FIRST';

  if (ctx.prisma && normalizedRecords.length > 0 && candidatePolicy !== 'DRY_RUN') {
    for (const record of normalizedRecords) {
      try {
        // Query existing candidates for matching
        const existingCandidates = await ctx.prisma.leadCandidate.findMany({
          where: {
            businessCategory: ctx.category.slug,
            city: { equals: ctx.location.city, mode: 'insensitive' },
          },
          take: 50,
        });

        let matchedCandidate: any = null;
        let bestMatch: any = null;

        for (const existing of existingCandidates) {
          const match = matchNormalizedRecords(record, existing as any);
          if (match.matched && (match.confidence === 'EXACT' || match.confidence === 'STRONG' || match.confidence === 'PROBABLE')) {
            matchedCandidate = existing;
            bestMatch = match;
            break;
          }
        }

        if (matchedCandidate) {
          metrics.googleMatchedExistingCandidates++;
          metrics.googleDuplicatesPrevented++;

          // Merge source evidence into existing candidate
          const merge = mergeBusinessEvidence(matchedCandidate as any, record, bestMatch);
          const updatedMeta = {
            ...(typeof matchedCandidate.metadata === 'object' ? matchedCandidate.metadata : {}),
            sourceEvidence: merge.evidenceChanges.allEvidence,
            qualificationRecheckRequired: merge.qualificationRecheckRequired,
          };

          await ctx.prisma.leadCandidate.update({
            where: { id: matchedCandidate.id },
            data: {
              metadata: updatedMeta,
              website: matchedCandidate.website || merge.canonicalChanges.website || null,
              phone: matchedCandidate.phone || merge.canonicalChanges.phone || null,
            },
          });
        } else if (candidatePolicy === 'ALWAYS_PERSIST') {
          // If policy allows creating new candidates
          metrics.googleNewCandidates++;
          await ctx.prisma.leadCandidate.create({
            data: {
              companyName: record.name,
              businessCategory: ctx.category.slug,
              website: record.website,
              email: record.email,
              phone: record.phone,
              address: record.address,
              city: record.city || ctx.location.city,
              country: record.countryCode || ctx.location.countryCode,
              postcode: record.postalCode,
              latitude: record.latitude,
              longitude: record.longitude,
              discoverySourceId: ctx.source.id,
              discoveryRunId: ctx.collectorRunId,
              externalType: 'place',
              externalId: record.externalId,
              status: record.email ? 'VERIFICATION_PENDING' : 'NEEDS_ENRICHMENT',
              metadata: {
                sourceEvidence: [
                  {
                    sourceType: 'GOOGLE_PLACES',
                    sourceId: ctx.source.id,
                    externalType: 'place',
                    externalId: record.externalId,
                    fieldsContributed: ['name', 'externalId'],
                    rawWebsite: record.website,
                    rawPhone: record.phone,
                    rawEmail: record.email,
                    collectedAt: new Date().toISOString(),
                  },
                ],
              },
            },
          });
        } else {
          // MATCH_EXISTING_FIRST: Stage A ID-only discovery does not flood DB with low-information candidates
          // Record is counted as unique place discovered but not persisted as candidate
        }
      } catch (e: any) {
        // Individual candidate processing error does not halt the run
      }
    }
  }

  return {
    status: 'SUCCESS',
    metrics: buildSafeMetricsLog(metrics),
    candidatesFound: normalizedRecords.length,
    normalizedRecords,
    safeLog: {
      operation: plan.operation,
      query: plan.textQuery,
      placesCount: rawPlaces.length,
      cacheHit,
      uniquePlaces: uniquePlaceIds.size,
      matched: metrics.googleMatchedExistingCandidates,
      newCandidates: metrics.googleNewCandidates,
    },
  };
}

export function getGoogleCollectorSafeLog(ctx: Partial<GoogleCollectorContext>, result: GoogleCollectorResult): Record<string, any> {
  return {
    sourceType: 'GOOGLE_PLACES',
    operation: result.safeLog?.operation || 'GOOGLE_COLLECTOR',
    status: result.status,
    reason: result.reason,
    mode: result.safeLog?.mode,
    scope: result.safeLog?.scope,
    metrics: buildSafeMetricsLog(result.metrics),
    candidatesFound: result.candidatesFound,
    paginationEnabled: CANARY_PAGINATION_ENABLED,
    retryLimit: CANARY_RETRY_LIMIT,
    stagedRequest: STAGED_REQUEST.STAGE_A_ID_DISCOVERY,
  };
}

// Transport gating — future production transport boundary that can ONLY execute after checks
export function assertGoogleTransportAllowed(ctx: GoogleCollectorContext): void {
  // This is the production transport boundary that will be used in future
  // In 4C.4C.5B, we always fail closed
  throw new Error('GOOGLE_NETWORK_TRANSPORT_DISABLED — activation architecture prepared but transport not yet approved');
}

export const GOOGLE_COLLECTOR_PIPELINE = [
  'CollectorRun',
  'source/config validation',
  'activation mode',
  'scope validation',
  'build request intent',
  'fingerprint',
  'cache check',
  'budget reservation',
  'credential check',
  'requestSentAt boundary',
  'transport',
  'usage completion',
  'cache',
  'normalization',
  'evidence merge',
  'qualification recheck',
] as const;
