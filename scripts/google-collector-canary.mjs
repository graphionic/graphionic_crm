/**
 * Phase 4C.4C.5C.1 — Google Places Collector Canary Runner
 *
 * Dedicated manual entry point for Google Places Canary Collection.
 * Reuses canonical collector-dispatcher, adapter, normalization, and guardrail components.
 *
 * Requirements:
 * 1. Runtime execution gate: requires GOOGLE_COLLECTOR_CANARY=true.
 * 2. Hard Network Cap: MAX_NETWORK_REQUESTS = 3.
 * 3. Strict Scope: GB / Manchester / dental only.
 * 4. Stage A ID-only: places.id,places.name,nextPageToken.
 * 5. Dry-run support: GOOGLE_CANARY_DRY_RUN=true or --dry-run.
 * 6. Cache-before-budget: cache hit returns zero network and zero new reservation.
 * 7. MATCH_EXISTING_FIRST: Stage A ID discovery merges with existing candidate or records discovery.
 * 8. CollectorRun isolation: clearly marked manual canary run.
 * 9. CollectorState isolation: zero mutation of OSM rotation state.
 * 10. Zero secrets logged.
 */

import { PrismaClient } from '@prisma/client';
import { getGoogleCredentialStatus } from '../src/lib/google-credential-reader';
import {
  planGoogleStageARequest,
  generateGoogleRequestFingerprint,
  canExecuteGoogleCollector,
  collectFromGoogleSource,
} from '../src/lib/google-collector-adapter';
import {
  checkGoogleCache,
  reserveGoogleRequestBudgetAtomically,
  completeGoogleReservation,
} from '../src/lib/google-request-guardrails';
import {
  buildTextSearchRequest,
  SEARCH_ID_ONLY_MASK,
} from '../src/lib/google-places-adapter';
import {
  normalizedFromGooglePlace,
  matchNormalizedRecords,
  mergeBusinessEvidence,
} from '../src/lib/collection-normalization';

export const APPROVED_CANARY_LOCATION = {
  city: 'Manchester',
  countryCode: 'GB',
  country: 'UK',
};

export const APPROVED_CANARY_CATEGORY = {
  slug: 'dental',
  name: 'Dentist',
};

export const MAX_NETWORK_REQUESTS_CAP = 3;

export function requireCanaryExecutionToken() {
  if (process.env.GOOGLE_COLLECTOR_CANARY !== 'true') {
    throw new Error('GOOGLE_CANARY_TOKEN_REQUIRED: Live canary execution requires GOOGLE_COLLECTOR_CANARY=true');
  }
}

export function validateCanaryScope(location, category) {
  const locCity = (location?.city || '').trim().toLowerCase();
  const locCountry = (location?.countryCode || '').trim().toUpperCase();
  const catSlug = (category?.slug || '').trim().toLowerCase();

  if (locCity !== 'manchester' || locCountry !== 'GB' || catSlug !== 'dental') {
    throw new Error(`CANARY_SCOPE_NOT_ALLOWED: Target scope ${locCountry}/${locCity}/${catSlug} is not the approved GB/Manchester/dental`);
  }
}

export class CanaryNetworkGuard {
  constructor(maxRequests = MAX_NETWORK_REQUESTS_CAP) {
    this.maxRequests = maxRequests;
    this.networkRequests = 0;
  }

  assertCanSend() {
    if (this.networkRequests >= this.maxRequests) {
      throw new Error(`GOOGLE_CANARY_NETWORK_CAP_REACHED: Reached hard network cap of ${this.maxRequests} requests`);
    }
  }

  recordSend() {
    this.assertCanSend();
    this.networkRequests++;
    return this.networkRequests;
  }

  getCount() {
    return this.networkRequests;
  }
}

export async function runCanaryCollector(prisma, options = {}) {
  const isDryRun = options.dryRun || process.env.GOOGLE_CANARY_DRY_RUN === 'true';

  console.log('====================================================');
  console.log(`[canary-runner] Starting Google Collector Canary (DryRun=${isDryRun})`);
  console.log('====================================================');

  // Gate 1: Runtime Canary Token Check (dry run can inspect without token if explicitly passed)
  if (!isDryRun) {
    requireCanaryExecutionToken();
  }

  // Gate 2: Scope Validation
  const location = options.location || APPROVED_CANARY_LOCATION;
  const category = options.category || APPROVED_CANARY_CATEGORY;
  validateCanaryScope(location, category);
  console.log(`[canary-runner] Scope verified: ${location.countryCode} / ${location.city} / ${category.slug}`);

  // Gate 3: Credential Status (Safe check)
  const credStatus = getGoogleCredentialStatus();
  console.log(`[canary-runner] Credential status: configured=${credStatus.configured} (envVar=${credStatus.envVarName || 'none'})`);

  // Gate 4: Database Config & Source Inspection
  const config = await prisma.googleCollectionConfig.findFirst({ where: { key: 'default' } });
  const source = await prisma.dataSource.findFirst({ where: { type: 'google_places' } });

  if (!config) throw new Error('CONFIG_NOT_FOUND: GoogleCollectionConfig default row missing');
  if (!source) throw new Error('SOURCE_NOT_FOUND: DataSource google_places missing');

  console.log(`[canary-runner] DB state: config.enabled=${config.enabled}, mode=${config.activationMode}, source.enabled=${source.enabled}`);

  // Step 1: Stage A Request Planning
  const plan = planGoogleStageARequest({
    category,
    location,
    pageSize: Math.min(options.pageSize || 3, MAX_NETWORK_REQUESTS_CAP),
  });

  console.log(`[canary-runner] Stage A Plan: op=${plan.operation}, query="${plan.textQuery}", mask="${plan.fieldMaskString}", pageSize=${plan.pageSize}`);

  // Step 2: Fingerprinting
  const queryFingerprint = generateGoogleRequestFingerprint({
    operation: plan.operation,
    textQuery: plan.textQuery,
    fieldMask: plan.fieldMask,
    pageSize: plan.pageSize,
    sourceId: source.id,
  });
  console.log(`[canary-runner] Deterministic queryFingerprint: ${queryFingerprint.slice(0, 16)}...`);

  // Step 3: Cache Inspection (Cache-before-budget)
  const cacheCheck = await checkGoogleCache(prisma, source.id, queryFingerprint, plan.operation);
  console.log(`[canary-runner] Cache check: hit=${cacheCheck.hit}`);

  if (isDryRun) {
    console.log('[canary-runner] DRY-RUN COMPLETE: Zero network requests, zero DB mutations, zero budget reservations.');
    return {
      status: 'DRY_RUN_SUCCESS',
      scope: { location, category },
      plan,
      queryFingerprint,
      cacheHit: cacheCheck.hit,
      networkRequests: 0,
      mutations: 0,
    };
  }

  // If live mode but config/source not activated, fail closed
  const gateCheck = await canExecuteGoogleCollector({
    prisma,
    location: { id: 'canary-loc', ...location },
    category: { id: 'canary-cat', ...category },
    source,
    collectorRunId: 'canary-precheck',
    config,
  });

  if (!gateCheck.allowed) {
    throw new Error(`CANARY_EXECUTION_BLOCKED: ${gateCheck.reason}`);
  }

  // Network Guard initialization
  const networkGuard = new CanaryNetworkGuard(MAX_NETWORK_REQUESTS_CAP);

  // CollectorRun creation
  const collectorRun = await prisma.collectorRun.create({
    data: {
      sourceId: source.id,
      status: 'IN_PROGRESS',
      candidatesFound: 0,
      leadsCreated: 0,
      metadata: {
        canary: true,
        manual: true,
        mode: config.activationMode,
        scope: { countryCode: location.countryCode, city: location.city, categorySlug: category.slug },
        pageSize: plan.pageSize,
        pagination: false,
        retryLimit: 0,
        query: plan.textQuery,
        fieldMask: plan.fieldMaskString,
      },
    },
  });

  let rawPlaces = [];
  let reservationId = null;
  let cacheHit = false;

  if (cacheCheck.hit && cacheCheck.cache) {
    cacheHit = true;
    const meta = cacheCheck.cache.responseMetadata || {};
    rawPlaces = Array.isArray(meta.places) ? meta.places : [];
    console.log(`[canary-runner] Served from cache: ${rawPlaces.length} places (Zero network, Zero reservation)`);
  } else {
    // Atomic budget reservation
    const reservation = await reserveGoogleRequestBudgetAtomically(prisma, {
      sourceId: source.id,
      operation: plan.operation,
      collectorRunId: collectorRun.id,
      queryFingerprint,
      requestUnits: 1,
      estimatedCostUnits: 1,
      metadata: {
        canary: true,
        query: plan.textQuery,
        fieldMask: plan.fieldMaskString,
        pageSize: plan.pageSize,
      },
    });

    if (!reservation.allowed) {
      await prisma.collectorRun.update({
        where: { id: collectorRun.id },
        data: { status: 'FAILED', errorMessage: reservation.reason || 'BUDGET_EXHAUSTED' },
      });
      throw new Error(`BUDGET_RESERVATION_FAILED: ${reservation.reason}`);
    }

    reservationId = reservation.reservation.id;

    // Execute live network transport with Guard
    networkGuard.recordSend();
    console.log(`[canary-runner] Network request 1/${MAX_NETWORK_REQUESTS_CAP} sending to places.googleapis.com...`);

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const reqBody = { textQuery: plan.textQuery, pageSize: plan.pageSize };

    const startTime = Date.now();
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': plan.fieldMaskString,
      },
      body: JSON.stringify(reqBody),
    });

    const latencyMs = Date.now() - startTime;
    const httpStatus = response.status;
    const responseData = await response.json();

    if (httpStatus === 200) {
      rawPlaces = Array.isArray(responseData.places) ? responseData.places : [];

      await completeGoogleReservation(prisma, reservationId, 'SUCCESS', {
        requestSentAt: new Date(),
        actualCostUnits: 1,
        metadata: {
          httpStatus,
          resultCount: rawPlaces.length,
          latencyMs,
          canary: true,
        },
      });

      // Upsert cache
      const ttlHours = config.queryCacheTtlHours || 24;
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
      await prisma.googleApiCache.upsert({
        where: {
          sourceId_queryFingerprint_operation: {
            sourceId: source.id,
            queryFingerprint,
            operation: plan.operation,
          },
        },
        create: {
          sourceId: source.id,
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
    } else {
      await completeGoogleReservation(prisma, reservationId, 'FAILED', {
        requestSentAt: new Date(),
        errorClassification: httpStatus === 401 ? 'AUTH_ERROR' : httpStatus === 429 ? 'RATE_LIMITED' : 'SERVER_ERROR',
        errorMessage: `HTTP ${httpStatus}`,
      });
      await prisma.collectorRun.update({
        where: { id: collectorRun.id },
        data: { status: 'FAILED', errorMessage: `Google API error HTTP ${httpStatus}` },
      });
      throw new Error(`GOOGLE_API_HTTP_${httpStatus}`);
    }
  }

  // Normalization & Candidate Matching (MATCH_EXISTING_FIRST)
  const normalizedRecords = [];
  let matchedCount = 0;
  let newCandidateCount = 0;

  for (const raw of rawPlaces) {
    const placeId = raw.id || (raw.name ? raw.name.replace(/^places\//, '') : null);
    if (!placeId) continue;
    const norm = normalizedFromGooglePlace(
      {
        place_id: placeId,
        name: raw.displayName?.text || raw.name || `Place ${placeId}`,
        formatted_address: raw.formattedAddress,
      },
      category.slug,
      source.id
    );
    if (norm) normalizedRecords.push(norm);
  }

  if (normalizedRecords.length > 0) {
    const existingCandidates = await prisma.leadCandidate.findMany({
      where: {
        businessCategory: category.slug,
        city: { equals: location.city, mode: 'insensitive' },
      },
      take: 50,
    });

    for (const record of normalizedRecords) {
      let matchedCandidate = null;
      let bestMatch = null;

      for (const existing of existingCandidates) {
        const match = matchNormalizedRecords(record, existing);
        if (match.matched && (match.confidence === 'EXACT' || match.confidence === 'STRONG' || match.confidence === 'PROBABLE')) {
          matchedCandidate = existing;
          bestMatch = match;
          break;
        }
      }

      if (matchedCandidate) {
        matchedCount++;
        const merge = mergeBusinessEvidence(matchedCandidate, record, bestMatch);
        const updatedMeta = {
          ...(typeof matchedCandidate.metadata === 'object' ? matchedCandidate.metadata : {}),
          sourceEvidence: merge.evidenceChanges?.allEvidence || [],
          qualificationRecheckRequired: merge.qualificationRecheckRequired || false,
        };

        await prisma.leadCandidate.update({
          where: { id: matchedCandidate.id },
          data: {
            metadata: updatedMeta,
            website: matchedCandidate.website || merge.canonicalChanges?.website || null,
            phone: matchedCandidate.phone || merge.canonicalChanges?.phone || null,
          },
        });
      }
      // MATCH_EXISTING_FIRST: Stage A ID discovery does not create bare candidates without minimum identity
    }
  }

  // Update CollectorRun
  await prisma.collectorRun.update({
    where: { id: collectorRun.id },
    data: {
      status: 'SUCCESS',
      candidatesFound: normalizedRecords.length,
      leadsCreated: 0, // Stage A ID discovery never creates leads
      metadata: {
        canary: true,
        cacheHit,
        networkRequests: networkGuard.getCount(),
        rawPlacesCount: rawPlaces.length,
        normalizedCount: normalizedRecords.length,
        matchedExistingCount: matchedCount,
        newCandidatesCount: newCandidateCount,
      },
    },
  });

  console.log(`[canary-runner] CANARY COMPLETED: status=SUCCESS places=${rawPlaces.length} normalized=${normalizedRecords.length} matched=${matchedCount} networkRequests=${networkGuard.getCount()}`);

  return {
    status: 'SUCCESS',
    collectorRunId: collectorRun.id,
    cacheHit,
    networkRequests: networkGuard.getCount(),
    placesCount: rawPlaces.length,
    normalizedCount: normalizedRecords.length,
    matchedCount,
  };
}

async function main() {
  const prisma = new PrismaClient();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.GOOGLE_CANARY_DRY_RUN === 'true';

  try {
    const result = await runCanaryCollector(prisma, { dryRun });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[canary-runner] ERROR:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith('google-collector-canary.mjs')) {
  main();
}
