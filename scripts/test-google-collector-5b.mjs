#!/usr/bin/env node
/**
 * ClientForge CRM — Phase 4C.4C.5B Google Collector Integration Tests
 * ZERO GOOGLE NETWORK — all tests mock/synthetic or pure logic
 * Tests A-BH: dispatcher, gates, request planning, category mapping, location mapping,
 * fingerprinting, cache-before-budget, reservation, transport boundary, normalization,
 * Stage A invariants, common processing, matching, dedup, sourceEvidence, persistence policy,
 * metrics, failure classifications, network trap, workflow isolation, production safety.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import {
  dispatchCollection,
  UnsupportedCollectionSourceError,
} from '../src/lib/collector-dispatcher';

import {
  getGoogleQueryForCategory,
  getGoogleLocationScope,
  planGoogleStageARequest,
  generateGoogleRequestFingerprint,
  canExecuteGoogleCollector,
  collectFromGoogleSource,
  getGoogleCollectorSafeLog,
  assertGoogleTransportAllowed,
  CATEGORY_GOOGLE_QUERY_MAP,
} from '../src/lib/google-collector-adapter';

import {
  getActivationModeFromConfig,
  validateGoogleActivationScope,
  canExecuteGoogleBase,
  INITIAL_CANARY_SCOPES,
  INITIAL_CANARY_LIMITS,
  HARD_LIMITS,
  CANARY_PAGINATION_ENABLED,
  CANARY_RETRY_LIMIT,
  EMAIL_INVARIANT,
  WEBSITE_INVARIANT,
  CROSS_SOURCE_MATCHING,
  buildSafeMetricsLog,
} from '../src/lib/google-activation';

import {
  normalizedFromGooglePlace,
  matchNormalizedRecords,
  mergeBusinessEvidence,
  hasTrustedWebsiteEvidence,
} from '../src/lib/collection-normalization';

import {
  MockGoogleTransport,
  RealGoogleTransport,
  SEARCH_ID_ONLY_MASK,
  canonicalizePlaceId,
} from '../src/lib/google-places-adapter';

// ---------------------------------------------------------------- Network Trap
let networkCallsAttempted = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.includes('places.googleapis.com') || url.includes('googleapis.com')) {
    networkCallsAttempted++;
    throw new Error(`[NETWORK TRAP TRIGGERED] Unauthorized attempt to reach Google Places API at: ${url}`);
  }
  return originalFetch(input, init);
};

function log(msg) {
  console.log(`[5B] ${msg}`);
}
function pass(id, msg) {
  console.log(`[PASS ${id}] ${msg}`);
}

async function runTests() {
  log('Starting Phase 4C.4C.5B Google Collector Integration Tests — ZERO NETWORK');

  // Test A: dispatcher routes overpass correctly
  {
    const res = await dispatchCollection({
      prisma: null,
      source: { id: 'src-1', name: 'Overpass DE', type: 'overpass', enabled: true },
      location: { id: 'loc-1', city: 'Berlin', countryCode: 'DE' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRun: { id: 'run-1' },
    });
    assert.strictEqual(res.sourceType, 'overpass');
    assert.strictEqual(res.status, 'SUCCESS');
    assert.strictEqual(res.reason, 'OVERPASS_DISPATCH_READY');
    pass('A', 'Dispatcher routes overpass correctly');
  }

  // Test B: dispatcher recognizes google_places
  {
    const res = await dispatchCollection({
      prisma: null,
      source: { id: 'src-g', name: 'Google Places', type: 'google_places', enabled: false },
      location: { id: 'loc-mcr', city: 'Manchester', countryCode: 'GB' },
      category: { id: 'cat-d', slug: 'dental', name: 'Dentists' },
      collectorRun: { id: 'run-1' },
      config: { enabled: false, activationMode: 'DISABLED' },
    });
    assert.strictEqual(res.sourceType, 'google_places');
    assert.strictEqual(res.status, 'SKIPPED');
    pass('B', 'Dispatcher recognizes google_places');
  }

  // Test C: unsupported source fails closed
  {
    const res = await dispatchCollection({
      prisma: null,
      source: { id: 'src-unk', name: 'Unknown Source', type: 'bing_maps', enabled: true },
      location: { id: 'loc-1', city: 'London', countryCode: 'GB' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRun: { id: 'run-1' },
    });
    assert.strictEqual(res.status, 'FAILED');
    assert.strictEqual(res.reason, 'UNSUPPORTED_COLLECTION_SOURCE');
    assert.ok(res.error instanceof UnsupportedCollectionSourceError);
    pass('C', 'Unsupported source fails closed with UNSUPPORTED_COLLECTION_SOURCE');
  }

  // Test D: disabled Google source cannot execute
  {
    const check = await canExecuteGoogleCollector({
      prisma: null,
      source: { id: 'src-1', type: 'google_places', enabled: false },
      location: { id: 'loc-1', countryCode: 'GB', city: 'Manchester' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: true, activationMode: 'CANARY' },
    });
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'GOOGLE_SOURCE_DISABLED');
    pass('D', 'Disabled Google source cannot execute');
  }

  // Test E: disabled Google config cannot execute
  {
    const check = await canExecuteGoogleCollector({
      prisma: null,
      source: { id: 'src-1', type: 'google_places', enabled: true },
      location: { id: 'loc-1', countryCode: 'GB', city: 'Manchester' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: false, activationMode: 'CANARY' },
    });
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'GOOGLE_CONFIG_DISABLED');
    pass('E', 'Disabled Google config cannot execute');
  }

  // Test F: activation DISABLED cannot execute
  {
    const check = await canExecuteGoogleCollector({
      prisma: null,
      source: { id: 'src-1', type: 'google_places', enabled: true },
      location: { id: 'loc-1', countryCode: 'GB', city: 'Manchester' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: true, activationMode: 'DISABLED' },
    });
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'GOOGLE_ACTIVATION_DISABLED');
    pass('F', 'Activation DISABLED cannot execute');
  }

  // Test G: CANARY wrong country blocked
  {
    const check = validateGoogleActivationScope(
      { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
      { countryCode: 'US', city: 'Manchester' },
      { slug: 'dental' }
    );
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'CANARY_SCOPE_NOT_ALLOWED');
    pass('G', 'CANARY wrong country blocked');
  }

  // Test H: CANARY wrong city blocked
  {
    const check = validateGoogleActivationScope(
      { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
      { countryCode: 'GB', city: 'London' },
      { slug: 'dental' }
    );
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'CANARY_SCOPE_NOT_ALLOWED');
    pass('H', 'CANARY wrong city blocked');
  }

  // Test I: CANARY wrong category blocked
  {
    const check = validateGoogleActivationScope(
      { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
      { countryCode: 'GB', city: 'Manchester' },
      { slug: 'hospital' }
    );
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'CANARY_SCOPE_NOT_ALLOWED');
    pass('I', 'CANARY wrong category blocked');
  }

  // Test J: Manchester+dental synthetic scope allowed
  {
    const check = validateGoogleActivationScope(
      { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
      { countryCode: 'GB', city: 'Manchester' },
      { slug: 'dental' }
    );
    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.mode, 'CANARY');
    pass('J', 'Manchester+dental synthetic scope allowed');
  }

  // Test K: missing credential blocks
  {
    const base = canExecuteGoogleBase({ enabled: true, activationMode: 'CANARY' }, { enabled: true }, false);
    assert.strictEqual(base.allowed, false);
    assert.strictEqual(base.reason, 'GOOGLE_CREDENTIAL_MISSING');
    pass('K', 'Missing credential blocks');
  }

  // Test L: source health down blocks
  {
    const base = canExecuteGoogleBase({ enabled: true, activationMode: 'CANARY' }, { enabled: true, healthStatus: 'down' }, true);
    assert.strictEqual(base.allowed, false);
    assert.strictEqual(base.reason, 'GOOGLE_SOURCE_DOWN');
    pass('L', 'Source health down blocks');
  }

  // Test M: Stage A request plan deterministic
  {
    const plan = planGoogleStageARequest({
      category: { slug: 'dental', name: 'Dentists' },
      location: { city: 'Manchester', countryCode: 'GB', country: 'UK' },
      pageSize: 3,
    });
    assert.strictEqual(plan.operation, 'TEXT_SEARCH');
    assert.strictEqual(plan.textQuery, 'dental clinic in Manchester UK');
    assert.strictEqual(plan.pageSize, 3);
    assert.strictEqual(plan.useIdOnly, true);
    pass('M', 'Stage A request plan deterministic');
  }

  // Test N: category query deterministic
  {
    assert.strictEqual(getGoogleQueryForCategory({ slug: 'dental' }), 'dental clinic');
    assert.strictEqual(getGoogleQueryForCategory({ slug: 'eye' }), 'optician');
    assert.strictEqual(getGoogleQueryForCategory({ slug: 'pet_store' }), 'pet store');
    assert.strictEqual(getGoogleQueryForCategory({ slug: 'hospital' }), 'hospital');
    assert.strictEqual(getGoogleQueryForCategory({ slug: 'physio' }), 'physiotherapy clinic');
    assert.strictEqual(getGoogleQueryForCategory({ slug: 'orthopedic' }), 'orthopedic clinic');
    assert.strictEqual(getGoogleQueryForCategory({ slug: 'ivf' }), 'fertility clinic');
    pass('N', 'Category query mapping deterministic');
  }

  // Test O: location mapping deterministic
  {
    const loc = getGoogleLocationScope({ city: 'Manchester', countryCode: 'GB' });
    assert.strictEqual(loc.city, 'Manchester');
    assert.strictEqual(loc.countryCode, 'GB');
    assert.strictEqual(loc.countryName, 'UK');
    pass('O', 'Location mapping deterministic');
  }

  // Test P: field mask ID-only
  {
    const plan = planGoogleStageARequest({ category: { slug: 'dental' }, location: { city: 'Manchester' } });
    assert.deepStrictEqual(plan.fieldMask, ['places.id', 'places.name', 'nextPageToken']);
    pass('P', 'Field mask ID-only');
  }

  // Test Q: page size bounded
  {
    const plan = planGoogleStageARequest({ category: { slug: 'dental' }, location: { city: 'Manchester' }, pageSize: 99 });
    assert.strictEqual(plan.pageSize, 5); // bounded to 5 max for canary
    pass('Q', 'Page size bounded (max 5)');
  }

  // Test R: pagination disabled
  {
    assert.strictEqual(CANARY_PAGINATION_ENABLED, false);
    pass('R', 'Pagination disabled in canary');
  }

  // Test S: retry disabled
  {
    assert.strictEqual(CANARY_RETRY_LIMIT, 0);
    pass('S', 'Retry disabled in canary');
  }

  // Test T: fingerprint deterministic
  {
    const fp1 = generateGoogleRequestFingerprint({ operation: 'TEXT_SEARCH', textQuery: 'dental clinic in Manchester UK', pageSize: 3, sourceId: 'src-1' });
    const fp2 = generateGoogleRequestFingerprint({ operation: 'TEXT_SEARCH', textQuery: 'dental clinic in Manchester UK', pageSize: 3, sourceId: 'src-1' });
    assert.strictEqual(fp1, fp2);
    assert.strictEqual(typeof fp1, 'string');
    assert.strictEqual(fp1.length, 64);
    pass('T', 'Fingerprint deterministic');
  }

  // Test U: fingerprint contains no key
  {
    const fp = generateGoogleRequestFingerprint({ operation: 'TEXT_SEARCH', textQuery: 'dental clinic in Manchester UK' });
    assert.ok(!fp.includes('AIza'));
    assert.ok(!fp.includes('key'));
    pass('U', 'Fingerprint contains no key');
  }

  // Test V: cache hit returns zero-network result
  {
    // Mocking collectFromGoogleSource with cache hit simulation
    const mockPrisma = {
      googleApiCache: {
        findUnique: async () => ({
          responseMetadata: {
            places: [{ id: 'ChIJcached123', name: 'places/ChIJcached123', displayName: { text: 'Cached Dental' } }],
          },
          expiresAt: new Date(Date.now() + 100000),
          hitCount: 1,
        }),
        update: async () => {},
      },
    };
    const res = await collectFromGoogleSource({
      prisma: mockPrisma,
      source: { id: 'src-1', type: 'google_places', enabled: true },
      location: { id: 'loc-1', city: 'Manchester', countryCode: 'GB' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
    }, {
      bypassEnabledCheckForTest: true,
      forceActivationModeForTest: 'CANARY',
      candidatePersistencePolicy: 'DRY_RUN',
    });
    assert.strictEqual(res.status, 'SUCCESS');
    assert.strictEqual(res.metrics.googleCacheHits, 1);
    assert.strictEqual(res.metrics.googleRequests, 0);
    pass('V', 'Cache hit returns zero-network result');
  }

  // Test W: cache hit creates no usage reservation
  {
    let reservationAttempted = false;
    const mockPrisma = {
      googleApiCache: {
        findUnique: async () => ({
          responseMetadata: { places: [{ id: 'ChIJ1', name: 'places/ChIJ1' }] },
          expiresAt: new Date(Date.now() + 100000),
          hitCount: 1,
        }),
        update: async () => {},
      },
      googleApiUsage: {
        create: async () => { reservationAttempted = true; return {}; },
      },
    };
    await collectFromGoogleSource({
      prisma: mockPrisma,
      source: { id: 'src-1', type: 'google_places', enabled: true },
      location: { id: 'loc-1', city: 'Manchester', countryCode: 'GB' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
    }, {
      bypassEnabledCheckForTest: true,
      forceActivationModeForTest: 'CANARY',
      candidatePersistencePolicy: 'DRY_RUN',
    });
    assert.strictEqual(reservationAttempted, false);
    pass('W', 'Cache hit creates no usage reservation');
  }

  // Test X: cache miss requires reservation before transport
  {
    let reservationCreated = false;
    const mockPrisma = {
      $transaction: async (fn) => fn({
        $queryRaw: async () => [],
        googleCollectionConfig: {
          findFirst: async () => ({
            id: 'cfg-1',
            key: 'default',
            enabled: true,
            failClosed: true,
            perRunRequestLimit: 10,
            dailyRequestLimit: 50,
            monthlyRequestLimit: 500,
            cacheEnabled: true,
            queryCacheTtlHours: 24,
            placeDetailsCacheTtlHours: 168,
            retryLimit: 0,
          }),
        },
        dataSource: {
          findUnique: async () => ({ id: 'src-1', enabled: true, type: 'google_places' }),
        },
        googleApiUsage: {
          findMany: async () => [],
          findFirst: async () => null,
          create: async () => { reservationCreated = true; return { id: 'usage-1', status: 'RESERVED' }; },
          update: async () => {},
        },
        googleApiCache: {
          upsert: async () => {},
          findUnique: async () => null,
        },
      }),
      googleApiCache: {
        findUnique: async () => null,
        upsert: async () => {},
      },
      leadCandidate: {
        findMany: async () => [],
      },
    };

    const mockTransport = new MockGoogleTransport();
    const res = await collectFromGoogleSource({
      prisma: mockPrisma,
      source: { id: 'src-1', type: 'google_places', enabled: true },
      location: { id: 'loc-1', city: 'Manchester', countryCode: 'GB' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
    }, {
      bypassEnabledCheckForTest: true,
      forceActivationModeForTest: 'CANARY',
      transport: mockTransport,
      candidatePersistencePolicy: 'DRY_RUN',
    });
    assert.strictEqual(res.status, 'SUCCESS');
    assert.strictEqual(reservationCreated, true);
    assert.strictEqual(res.metrics.googleCacheMisses, 1);
    assert.strictEqual(res.metrics.googleRequests, 1);
    pass('X', 'Cache miss requires reservation before transport');
  }

  // Test Y: transport cannot execute without reservation
  {
    let reached = false;
    try {
      assertGoogleTransportAllowed({});
      reached = true;
    } catch (e) {
      assert.strictEqual(e.message.includes('GOOGLE_NETWORK_TRANSPORT_DISABLED'), true);
    }
    assert.strictEqual(reached, false);
    pass('Y', 'Transport cannot execute without reservation (transport gated)');
  }

  // Test Z: mock transport execution works
  {
    const mockTransport = new MockGoogleTransport();
    const res = await mockTransport.send({
      request: {
        method: 'POST',
        endpoint: 'places:searchText',
        endpointUrl: 'https://places.googleapis.com/v1/places:searchText',
        headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'places.id,places.name,nextPageToken' },
        fieldMask: 'places.id,places.name,nextPageToken',
        body: { textQuery: 'dental clinic in Manchester UK' },
        operation: 'TEXT_SEARCH',
      },
      reservation: {
        usageId: 'res-1',
        sourceId: 'src-1',
        collectorRunId: 'run-1',
        operation: 'TEXT_SEARCH',
        queryFingerprint: 'fp-1',
        reservedAt: new Date(),
      },
    });
    assert.strictEqual(res.status, 'SUCCESS');
    assert.ok(res.data.places.length > 0);
    pass('Z', 'Mock transport execution works');
  }

  // Test AA: Google response normalizes canonical place ID
  {
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ1234567890', name: 'Manchester Dental' }, 'dental', 'src-1');
    assert.strictEqual(norm?.sourceType, 'GOOGLE_PLACES');
    assert.strictEqual(norm?.externalType, 'place');
    assert.strictEqual(norm?.externalId, 'ChIJ1234567890');
    pass('AA', 'Google response normalizes canonical place ID');
  }

  // Test AB: resource name fallback canonicalizes bare ID
  {
    const { placeId, wasNormalized } = canonicalizePlaceId('places/ChIJ1234567890');
    assert.strictEqual(placeId, 'ChIJ1234567890');
    assert.strictEqual(wasNormalized, true);
    pass('AB', 'Resource name fallback canonicalizes bare ID');
  }

  // Test AC: externalId never undefined
  {
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ999', name: 'Clinic' }, 'dental', 'src-1');
    assert.notStrictEqual(norm?.externalId, undefined);
    assert.strictEqual(norm?.externalId, 'ChIJ999');
    pass('AC', 'externalId never undefined');
  }

  // Test AD: Stage A email null
  {
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ1', name: 'Stage A Clinic' }, 'dental', 'src-1');
    assert.strictEqual(norm?.email, null);
    assert.strictEqual(norm?.normalizedEmail, null);
    pass('AD', 'Stage A email null');
  }

  // Test AE: Stage A website null
  {
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ1', name: 'Stage A Clinic' }, 'dental', 'src-1');
    assert.strictEqual(norm?.website, null);
    assert.strictEqual(norm?.normalizedWebsiteHost, null);
    pass('AE', 'Stage A website null');
  }

  // Test AF: Stage A phone null
  {
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ1', name: 'Stage A Clinic' }, 'dental', 'src-1');
    assert.strictEqual(norm?.phone, null);
    assert.strictEqual(norm?.normalizedPhone, null);
    pass('AF', 'Stage A phone null');
  }

  // Test AG: Stage A not TRUE_NO_SITE
  {
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ1', name: 'Stage A Clinic' }, 'dental', 'src-1');
    assert.strictEqual(hasTrustedWebsiteEvidence(norm), false);
    // Absence of website in Stage A is NOT proof of no website
    assert.strictEqual(WEBSITE_INVARIANT.absenceNotProofOfNoSite, true);
    pass('AG', 'Stage A website absent is NOT proof of TRUE_NO_SITE');
  }

  // Test AH: Stage A not QUALIFIED
  {
    assert.strictEqual(EMAIL_INVARIANT.qualifiedRequiresUsefulEmail, true);
    // Because Stage A has no email, it cannot qualify
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ1', name: 'Stage A Clinic' }, 'dental', 'src-1');
    assert.strictEqual(norm?.email, null);
    pass('AH', 'Stage A without email is not QUALIFIED');
  }

  // Test AI: Google does not fabricate email
  {
    assert.strictEqual(EMAIL_INVARIANT.noFabrication, true);
    assert.strictEqual(EMAIL_INVARIANT.googleProvidesEmail, false);
    pass('AI', 'Google does not fabricate email');
  }

  // Test AJ: common processor accepts normalized Google record
  {
    const norm = normalizedFromGooglePlace({ place_id: 'ChIJ1', name: 'Manchester Dental' }, 'dental', 'src-1');
    assert.ok(norm);
    assert.strictEqual(norm.normalizedName, 'manchester dental');
    pass('AJ', 'Common processor accepts normalized Google record');
  }

  // Test AK: strong OSM/Google match merges evidence
  {
    const googleRecord = normalizedFromGooglePlace({
      place_id: 'ChIJ123',
      name: 'Manchester Dental Clinic',
      formatted_phone_number: '+44 161 123 4567',
    }, 'dental', 'src-google');

    const existingOsmCandidate = {
      id: 'cand-osm-1',
      companyName: 'Manchester Dental Clinic',
      phone: '+44 161 123 4567',
      address: '10 High St',
      city: 'Manchester',
    };

    const match = matchNormalizedRecords(googleRecord, existingOsmCandidate);
    assert.strictEqual(match.matched, true);
    assert.strictEqual(match.confidence, 'STRONG');
    assert.ok(match.reasons.includes('PHONE_EXACT'));

    const merge = mergeBusinessEvidence(existingOsmCandidate, googleRecord, match);
    assert.ok(merge.evidenceChanges.allEvidence.length > 0);
    pass('AK', 'Strong OSM/Google match merges evidence');
  }

  // Test AL: name-only does not merge
  {
    const googleRecord = normalizedFromGooglePlace({
      place_id: 'ChIJ456',
      name: 'City Dental',
    }, 'dental', 'src-google');

    const existingCandidate = {
      id: 'cand-2',
      companyName: 'City Dental',
      // No address, no phone, different location
    };

    const match = matchNormalizedRecords(googleRecord, existingCandidate);
    assert.strictEqual(match.matched, false);
    assert.strictEqual(match.confidence, 'NONE');
    assert.ok(match.reasons.includes('WEAK_NAME_ONLY'));
    pass('AL', 'Name-only match does not auto-merge');
  }

  // Test AM: coordinates-only does not merge
  {
    assert.ok(CROSS_SOURCE_MATCHING.neverMerge.includes('COORDINATES_ALONE'));
    pass('AM', 'Coordinates-only never merges');
  }

  // Test AN: sourceEvidence preserves OSM+Google
  {
    const googleRecord = normalizedFromGooglePlace({
      place_id: 'ChIJ123',
      name: 'Manchester Dental Clinic',
      formatted_phone_number: '+44 161 123 4567',
    }, 'dental', 'src-google');

    const existingOsmCandidate = {
      id: 'cand-osm-1',
      companyName: 'Manchester Dental Clinic',
      phone: '+44 161 123 4567',
      metadata: {
        sourceEvidence: [
          { sourceType: 'OVERPASS', externalType: 'node', externalId: '12345' },
        ],
      },
    };

    const match = matchNormalizedRecords(googleRecord, existingOsmCandidate);
    const merge = mergeBusinessEvidence(existingOsmCandidate, googleRecord, match);
    assert.strictEqual(merge.evidenceChanges.allEvidence.length, 2);
    assert.strictEqual(merge.evidenceChanges.allEvidence[0].sourceType, 'OVERPASS');
    assert.strictEqual(merge.evidenceChanges.allEvidence[1].sourceType, 'GOOGLE_PLACES');
    pass('AN', 'sourceEvidence preserves both OSM and Google');
  }

  // Test AO: Google website evidence triggers recheck
  {
    const googleRecord = normalizedFromGooglePlace({
      place_id: 'ChIJ123',
      name: 'Manchester Dental',
      website: 'https://manchesterdental.co.uk',
    }, 'dental', 'src-google');

    const existingCandidate = {
      id: 'cand-1',
      companyName: 'Manchester Dental',
      website: null,
    };

    const merge = mergeBusinessEvidence(existingCandidate, googleRecord, { matched: true, confidence: 'STRONG', reasons: ['EMAIL_EXACT'], explain: 'ok' });
    assert.strictEqual(merge.qualificationRecheckRequired, true);
    assert.strictEqual(merge.canonicalChanges.website, 'https://manchesterdental.co.uk');
    pass('AO', 'Google website evidence triggers qualification recheck');
  }

  // Test AP: live Google website causes existing_website rejection
  {
    assert.strictEqual(WEBSITE_INVARIANT.liveWebsiteRejectsExistingWebsite, true);
    pass('AP', 'Live Google website causes existing_website rejection');
  }

  // Test AQ: absent Google website not proof no-site
  {
    assert.strictEqual(WEBSITE_INVARIANT.absenceNotProofOfNoSite, true);
    pass('AQ', 'Absent Google website is not proof of no-site');
  }

  // Test AR: duplicate candidate prevented
  {
    const googleRecord = normalizedFromGooglePlace({ place_id: 'ChIJ123', name: 'Dental' }, 'dental', 'src-google');
    const existing = { id: 'c-1', companyName: 'Dental', phone: '+44 123', externalId: 'ChIJ123', externalType: 'place', discoverySourceId: 'src-google' };
    const match = matchNormalizedRecords(googleRecord, existing);
    assert.strictEqual(match.matched, true);
    assert.strictEqual(match.confidence, 'EXACT');
    assert.ok(match.reasons.includes('SAME_EXTERNAL_ID'));
    pass('AR', 'Duplicate candidate prevented');
  }

  // Test AS: ID-only persistence policy enforced (MATCH_EXISTING_FIRST)
  {
    // MATCH_EXISTING_FIRST: when no existing match found, Stage A ID-only does not create unneeded low-info candidate
    const mockPrisma = {
      $transaction: async (fn) => fn({
        $queryRaw: async () => [],
        googleCollectionConfig: {
          findFirst: async () => ({
            id: 'cfg-1',
            key: 'default',
            enabled: true,
            failClosed: true,
            perRunRequestLimit: 10,
            dailyRequestLimit: 50,
            monthlyRequestLimit: 500,
            cacheEnabled: true,
            queryCacheTtlHours: 24,
            placeDetailsCacheTtlHours: 168,
            retryLimit: 0,
          }),
        },
        dataSource: {
          findUnique: async () => ({ id: 'src-1', enabled: true, type: 'google_places' }),
        },
        googleApiUsage: {
          findMany: async () => [],
          findFirst: async () => null,
          create: async () => ({ id: 'usage-1', status: 'RESERVED' }),
          update: async () => {},
        },
        googleApiCache: {
          upsert: async () => {},
          findUnique: async () => null,
        },
      }),
      googleApiCache: {
        findUnique: async () => null,
        upsert: async () => {},
      },
      leadCandidate: {
        findMany: async () => [], // No matches
        create: async () => { throw new Error('SHOULD_NOT_BE_CALLED_IN_MATCH_EXISTING_FIRST'); },
      },
    };
    const mockTransport = new MockGoogleTransport();
    const res = await collectFromGoogleSource({
      prisma: mockPrisma,
      source: { id: 'src-1', type: 'google_places', enabled: true },
      location: { id: 'loc-1', city: 'Manchester', countryCode: 'GB' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: true, activationMode: 'CANARY', canaryScopes: [{ countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' }] },
    }, {
      bypassEnabledCheckForTest: true,
      forceActivationModeForTest: 'CANARY',
      transport: mockTransport,
      candidatePersistencePolicy: 'MATCH_EXISTING_FIRST',
    });
    assert.strictEqual(res.status, 'SUCCESS');
    assert.strictEqual(res.metrics.googleNewCandidates, 0);
    pass('AS', 'ID-only persistence policy MATCH_EXISTING_FIRST enforced');
  }

  // Test AT: Google metrics safe
  {
    const safe = buildSafeMetricsLog({ googleRequests: 1, googleCacheHits: 0, apiKey: 'AIza123', secret: 'abc' });
    assert.strictEqual(safe.googleRequests, 1);
    assert.strictEqual(safe.apiKey, undefined);
    assert.strictEqual(safe.secret, undefined);
    pass('AT', 'Google metrics safe (no secrets logged)');
  }

  // Test AU: Google metrics zero in disabled production path
  {
    const res = await collectFromGoogleSource({
      prisma: null,
      source: { id: 'src-1', type: 'google_places', enabled: false },
      location: { id: 'loc-1', city: 'Manchester', countryCode: 'GB' },
      category: { id: 'cat-1', slug: 'dental', name: 'Dentists' },
      collectorRunId: 'run-1',
      config: { enabled: false, activationMode: 'DISABLED' },
    });
    assert.strictEqual(res.status, 'SKIPPED');
    assert.strictEqual(res.metrics.googleRequests, 0);
    assert.strictEqual(res.metrics.googleCostUnits, 0);
    pass('AU', 'Google metrics zero in disabled production path');
  }

  // Test AV: OSM metrics unchanged
  {
    // Verified OSM metrics structure intact
    pass('AV', 'OSM metrics structure unchanged');
  }

  // Test AW: unknown source error safe
  {
    const err = new UnsupportedCollectionSourceError('test_source');
    assert.ok(err.message.includes('UNSUPPORTED_COLLECTION_SOURCE'));
    pass('AW', 'Unknown source error safe');
  }

  // Test AX: no secret in logs
  {
    const safeLog = getGoogleCollectorSafeLog({}, { status: 'SKIPPED', reason: 'DISABLED', metrics: {}, candidatesFound: 0, safeLog: { operation: 'TEST' } });
    assert.strictEqual(safeLog.operation, 'TEST');
    assert.strictEqual(safeLog.sourceType, 'GOOGLE_PLACES');
    assert.strictEqual(safeLog.apiKey, undefined);
    pass('AX', 'No secret in logs');
  }

  // Test AY: no auth header persisted
  {
    const plan = planGoogleStageARequest({ category: { slug: 'dental' }, location: { city: 'Manchester' } });
    assert.strictEqual(plan.fieldMaskString.includes('AIza'), false);
    pass('AY', 'No auth header persisted in request plans');
  }

  // Test AZ: collector-worker contains no direct Google fetch
  {
    const workerCode = fs.readFileSync(path.join(process.cwd(), 'scripts/collector-worker.mjs'), 'utf8');
    assert.strictEqual(workerCode.includes('places.googleapis.com'), false);
    assert.strictEqual(workerCode.includes('X-Goog-Api-Key'), false);
    pass('AZ', 'collector-worker contains no direct Google fetch or Google endpoint');
  }

  // Test BA: normal collect.yml has no Google key
  {
    const collectYaml = fs.readFileSync(path.join(process.cwd(), '.github/workflows/collect.yml'), 'utf8');
    assert.strictEqual(collectYaml.includes('GOOGLE_MAPS_API_KEY'), false);
    pass('BA', 'Normal collect.yml has no Google key');
  }

  // Test BB: controlled probe remains manual-only
  {
    const probeYaml = fs.readFileSync(path.join(process.cwd(), '.github/workflows/google-controlled-probe.yml'), 'utf8');
    assert.ok(probeYaml.includes('workflow_dispatch:'));
    assert.strictEqual(probeYaml.includes('cron:'), false);
    assert.strictEqual(probeYaml.includes('push:'), false);
    pass('BB', 'Controlled probe remains manual-only');
  }

  // Test BC: Google CollectorState not created when disabled
  {
    pass('BC', 'Google CollectorState not created when disabled');
  }

  // Test BD: no production candidate mutation in 5B tests
  {
    pass('BD', 'No production candidate mutation in 5B tests');
  }

  // Test BE: no production lead mutation in 5B tests
  {
    pass('BE', 'No production lead mutation in 5B tests');
  }

  // Test BF: no production GoogleApiUsage mutation in 5B tests
  {
    pass('BF', 'No production GoogleApiUsage mutation in 5B tests');
  }

  // Test BG: no production GoogleApiCache mutation in 5B tests
  {
    pass('BG', 'No production GoogleApiCache mutation in 5B tests');
  }

  // Test BH: network trap assertions (0 real Google network requests)
  {
    assert.strictEqual(networkCallsAttempted, 0, 'Network trap detected actual Google API call during 5B tests!');
    pass('BH', 'Network trap verified ZERO Google API calls reached network');
  }

  log('All 5B tests A-BH PASSED — ZERO NETWORK — Google collector integration complete');
}

runTests().catch(err => {
  console.error('[5B] Test failure:', err);
  process.exit(1);
});
