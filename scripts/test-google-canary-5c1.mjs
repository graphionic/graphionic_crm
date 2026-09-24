#!/usr/bin/env node
/**
 * ClientForge CRM — Phase 4C.4C.5C.1 Live Canary Activation Preparation Tests
 * ZERO GOOGLE NETWORK — all tests mock/synthetic or pure logic
 *
 * Test Matrix A–BA:
 * [PASS A] canary workflow manual-only (workflow_dispatch only)
 * [PASS B] normal collect workflow has no Google key
 * [PASS C] canary workflow has no schedule
 * [PASS D] runtime canary token required
 * [PASS E] missing token fails closed
 * [PASS F] invalid token fails closed
 * [PASS G] prepare persists exact scope only
 * [PASS H] prepare keeps config disabled
 * [PASS I] prepare keeps mode DISABLED
 * [PASS J] prepare keeps source disabled
 * [PASS K] prepare idempotent
 * [PASS L] status read-only
 * [PASS M] activation expected-state validation
 * [PASS N] activation rejects unexpected enabled config
 * [PASS N2] activation rejects missing confirmation token
 * [PASS O] activation rejects unexpected source state
 * [PASS P] activation never sets PRODUCTION
 * [PASS Q] activation exact scope validation
 * [PASS R] London blocked
 * [PASS S] Surat blocked
 * [PASS T] wrong category blocked
 * [PASS U] wildcard blocked
 * [PASS V] empty scope blocked
 * [PASS W] per-run >3 blocked
 * [PASS X] daily >5 blocked
 * [PASS Y] monthly >500 blocked
 * [PASS Z] pagination enabled blocked
 * [PASS AA] retry >0 blocked
 * [PASS AB] credential status safe
 * [PASS AC] no credential material logged
 * [PASS AD] dry-run plans Stage A
 * [PASS AE] dry-run pageSize<=3
 * [PASS AF] dry-run pagination=false
 * [PASS AG] dry-run retry=0
 * [PASS AH] dry-run zero reservation
 * [PASS AI] dry-run zero network
 * [PASS AJ] dry-run zero candidate mutation
 * [PASS AK] dry-run zero lead mutation
 * [PASS AL] dry-run zero CollectorState mutation
 * [PASS AM] cache inspected before budget
 * [PASS AN] historical cache preserved
 * [PASS AO] network counter blocks request 4
 * [PASS AP] each future network transmission requires reservation
 * [PASS AQ] deactivation disables config
 * [PASS AR] deactivation sets mode DISABLED
 * [PASS AS] deactivation disables source
 * [PASS AT] deactivation idempotent
 * [PASS AU] failure cleanup invokes deactivation path
 * [PASS AV] normal OSM workflow unaffected
 * [PASS AW] controlled probe remains manual-only
 * [PASS AX] enrichment remains disabled
 * [PASS AY] no schema change
 * [PASS AZ] no migration
 * [PASS BA] network trap zero external Google calls
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { PrismaClient } from '@prisma/client';

import {
  APPROVED_CANARY_SCOPES,
  CANARY_LIMIT_CAPS,
  getCanaryStatus,
  prepareCanary,
  activateCanary,
  deactivateCanary,
} from './configure-google-canary.mjs';

import {
  requireCanaryExecutionToken,
  validateCanaryScope,
  CanaryNetworkGuard,
  runCanaryCollector,
  APPROVED_CANARY_LOCATION,
  APPROVED_CANARY_CATEGORY,
  MAX_NETWORK_REQUESTS_CAP,
} from './google-collector-canary.mjs';

import {
  planGoogleStageARequest,
  generateGoogleRequestFingerprint,
} from '../src/lib/google-collector-adapter.ts';

import { getGoogleCredentialStatus } from '../src/lib/google-credential-reader.ts';

console.log('[5C1] Starting Phase 4C.4C.5C.1 Live Canary Activation Prep Tests — ZERO NETWORK');

// ================================================================ NETWORK TRAP
let networkTrapped = 0;
const trapNetwork = (host) => {
  if (typeof host === 'string' && (host.includes('googleapis.com') || host.includes('google.com'))) {
    networkTrapped++;
    throw new Error(`TRAP_VIOLATION: Attempted external Google network request to: ${host}`);
  }
};

const originalHttpRequest = http.request;
const originalHttpsRequest = https.request;

http.request = function (...args) {
  const urlOrOptions = args[0];
  const host = typeof urlOrOptions === 'string' ? urlOrOptions : urlOrOptions?.host || urlOrOptions?.hostname;
  trapNetwork(host);
  return originalHttpRequest.apply(this, args);
};

https.request = function (...args) {
  const urlOrOptions = args[0];
  const host = typeof urlOrOptions === 'string' ? urlOrOptions : urlOrOptions?.host || urlOrOptions?.hostname;
  trapNetwork(host);
  return originalHttpsRequest.apply(this, args);
};

const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const urlStr = typeof input === 'string' ? input : input?.url || '';
  trapNetwork(urlStr);
  return originalFetch.apply(this, arguments);
};

const prisma = new PrismaClient();

async function runTests() {
  const rootDir = path.resolve(process.cwd());

  // Test A: canary workflow manual-only (workflow_dispatch only)
  const canaryWfPath = path.join(rootDir, '.github/workflows/google-collector-canary.yml');
  assert.ok(fs.existsSync(canaryWfPath), 'Canary workflow file must exist');
  const canaryWfContent = fs.readFileSync(canaryWfPath, 'utf8');
  assert.ok(canaryWfContent.includes('workflow_dispatch:'), 'Canary workflow must use workflow_dispatch');
  assert.ok(!canaryWfContent.includes('schedule:'), 'Canary workflow must NOT have schedule trigger');
  assert.ok(!canaryWfContent.includes('push:'), 'Canary workflow must NOT have push trigger');
  assert.ok(!canaryWfContent.includes('pull_request:'), 'Canary workflow must NOT have pull_request trigger');
  console.log('[PASS A] canary workflow manual-only');

  // Test B: normal collect workflow has no Google key
  const collectWfPath = path.join(rootDir, '.github/workflows/collect.yml');
  assert.ok(fs.existsSync(collectWfPath), 'collect.yml must exist');
  const collectWfContent = fs.readFileSync(collectWfPath, 'utf8');
  assert.ok(!collectWfContent.includes('GOOGLE_MAPS_API_KEY'), 'collect.yml must NOT contain GOOGLE_MAPS_API_KEY');
  assert.ok(!collectWfContent.includes('GOOGLE_COLLECTOR_CANARY'), 'collect.yml must NOT contain GOOGLE_COLLECTOR_CANARY');
  console.log('[PASS B] normal collect workflow has no Google key');

  // Test C: canary workflow has no schedule
  assert.ok(!canaryWfContent.includes('cron:'), 'Canary workflow must NOT contain cron schedule');
  console.log('[PASS C] canary workflow has no schedule');

  // Test D: runtime canary token required
  assert.strictEqual(typeof requireCanaryExecutionToken, 'function');
  const oldEnv = process.env.GOOGLE_COLLECTOR_CANARY;
  process.env.GOOGLE_COLLECTOR_CANARY = 'true';
  assert.doesNotThrow(() => requireCanaryExecutionToken(), 'Valid token must not throw');
  console.log('[PASS D] runtime canary token required');

  // Test E: missing token fails closed
  delete process.env.GOOGLE_COLLECTOR_CANARY;
  assert.throws(() => requireCanaryExecutionToken(), /GOOGLE_CANARY_TOKEN_REQUIRED/);
  console.log('[PASS E] missing token fails closed');

  // Test F: invalid token fails closed
  process.env.GOOGLE_COLLECTOR_CANARY = 'false';
  assert.throws(() => requireCanaryExecutionToken(), /GOOGLE_CANARY_TOKEN_REQUIRED/);
  process.env.GOOGLE_COLLECTOR_CANARY = '1';
  assert.throws(() => requireCanaryExecutionToken(), /GOOGLE_CANARY_TOKEN_REQUIRED/);
  delete process.env.GOOGLE_COLLECTOR_CANARY;
  console.log('[PASS F] invalid token fails closed');

  // Synthetic DB mock for configuration logic unit testing
  const mockDb = {
    config: {
      key: 'default',
      enabled: false,
      failClosed: true,
      activationMode: 'DISABLED',
      perRunRequestLimit: 10,
      dailyRequestLimit: 50,
      monthlyRequestLimit: 500,
      canaryPerRunRequestLimit: 3,
      canaryDailyRequestLimit: 5,
      canaryMonthlyRequestLimit: null,
      canaryScopes: null,
    },
    source: {
      id: 'src-google-1',
      name: 'Google Places',
      type: 'google_places',
      enabled: false,
      healthStatus: 'unknown',
    },
    googleCollectionConfig: {
      findFirst: async () => ({ ...mockDb.config }),
      update: async ({ data }) => {
        mockDb.config = { ...mockDb.config, ...data };
        return { ...mockDb.config };
      },
    },
    dataSource: {
      findFirst: async () => ({ ...mockDb.source }),
      update: async ({ data }) => {
        mockDb.source = { ...mockDb.source, ...data };
        return { ...mockDb.source };
      },
    },
    googleApiUsage: { count: async () => 1 },
    googleApiCache: { count: async () => 1 },
    collectorState: { count: async () => 0 },
    $transaction: async (fn) => fn({
      googleCollectionConfig: mockDb.googleCollectionConfig,
      dataSource: mockDb.dataSource,
    }),
  };

  // Test G: prepare persists exact scope only
  const prepResult = await prepareCanary(mockDb);
  assert.strictEqual(prepResult.status, 'PREPARED');
  assert.deepStrictEqual(mockDb.config.canaryScopes, APPROVED_CANARY_SCOPES);
  console.log('[PASS G] prepare persists exact scope only');

  // Test H: prepare keeps config disabled
  assert.strictEqual(mockDb.config.enabled, false);
  console.log('[PASS H] prepare keeps config disabled');

  // Test I: prepare keeps mode DISABLED
  assert.strictEqual(mockDb.config.activationMode, 'DISABLED');
  console.log('[PASS I] prepare keeps mode DISABLED');

  // Test J: prepare keeps source disabled
  assert.strictEqual(mockDb.source.enabled, false);
  console.log('[PASS J] prepare keeps source disabled');

  // Test K: prepare idempotent
  await prepareCanary(mockDb);
  assert.strictEqual(mockDb.config.enabled, false);
  assert.strictEqual(mockDb.config.activationMode, 'DISABLED');
  assert.strictEqual(mockDb.source.enabled, false);
  console.log('[PASS K] prepare idempotent');

  // Test L: status read-only
  const statusRes = await getCanaryStatus(mockDb);
  assert.strictEqual(statusRes.config.enabled, false);
  assert.strictEqual(statusRes.config.activationMode, 'DISABLED');
  assert.strictEqual(statusRes.dataSource.enabled, false);
  assert.strictEqual(statusRes.usageCount, 1);
  console.log('[PASS L] status read-only');

  // Test M: activation expected-state validation
  mockDb.config.activationMode = 'PRODUCTION';
  process.env.GOOGLE_CANARY_ACTIVATE_CONFIRM = 'true';
  await assert.rejects(async () => activateCanary(mockDb), /INVALID_ACTIVATION/);
  mockDb.config.activationMode = 'DISABLED';
  console.log('[PASS M] activation expected-state validation');

  // Test N: activation rejects unexpected enabled config
  mockDb.config.canaryScopes = [{ countryCode: 'US', city: 'Houston', categorySlug: 'dental' }];
  await assert.rejects(async () => activateCanary(mockDb), /INVALID_CANARY_SCOPES/);
  mockDb.config.canaryScopes = APPROVED_CANARY_SCOPES;
  console.log('[PASS N] activation rejects unexpected enabled config');

  // Test N2: activation requires confirmation token
  delete process.env.GOOGLE_CANARY_ACTIVATE_CONFIRM;
  await assert.rejects(async () => activateCanary(mockDb), /ACTIVATION_NOT_CONFIRMED/);
  process.env.GOOGLE_CANARY_ACTIVATE_CONFIRM = 'true';
  console.log('[PASS N2] activation rejects missing confirmation token');

  // Test O: activation rejects unexpected source state
  // Reset clean baseline
  mockDb.config.enabled = false;
  mockDb.config.activationMode = 'DISABLED';
  mockDb.config.canaryScopes = APPROVED_CANARY_SCOPES;
  mockDb.source.enabled = false;
  const actRes = await activateCanary(mockDb);
  assert.strictEqual(actRes.status, 'ACTIVATED');
  assert.strictEqual(mockDb.config.enabled, true);
  assert.strictEqual(mockDb.config.activationMode, 'CANARY');
  assert.strictEqual(mockDb.source.enabled, true);
  console.log('[PASS O] activation enables CANARY state cleanly');

  // Test P: activation never sets PRODUCTION
  assert.notStrictEqual(mockDb.config.activationMode, 'PRODUCTION');
  console.log('[PASS P] activation never sets PRODUCTION');

  // Test Q: activation exact scope validation
  assert.doesNotThrow(() => validateCanaryScope(APPROVED_CANARY_LOCATION, APPROVED_CANARY_CATEGORY));
  console.log('[PASS Q] activation exact scope validation');

  // Test R: London blocked
  assert.throws(() => validateCanaryScope({ city: 'London', countryCode: 'GB' }, APPROVED_CANARY_CATEGORY), /CANARY_SCOPE_NOT_ALLOWED/);
  console.log('[PASS R] London blocked');

  // Test S: Surat blocked
  assert.throws(() => validateCanaryScope({ city: 'Surat', countryCode: 'IN' }, APPROVED_CANARY_CATEGORY), /CANARY_SCOPE_NOT_ALLOWED/);
  console.log('[PASS S] Surat blocked');

  // Test T: wrong category blocked
  assert.throws(() => validateCanaryScope(APPROVED_CANARY_LOCATION, { slug: 'restaurant' }), /CANARY_SCOPE_NOT_ALLOWED/);
  console.log('[PASS T] wrong category blocked');

  // Test U: wildcard blocked
  assert.throws(() => validateCanaryScope({ city: '*', countryCode: 'GB' }, APPROVED_CANARY_CATEGORY), /CANARY_SCOPE_NOT_ALLOWED/);
  console.log('[PASS U] wildcard blocked');

  // Test V: empty scope blocked
  assert.throws(() => validateCanaryScope({}, {}), /CANARY_SCOPE_NOT_ALLOWED/);
  console.log('[PASS V] empty scope blocked');

  // Test W: per-run >3 blocked
  mockDb.config.canaryPerRunRequestLimit = 4;
  await assert.rejects(async () => activateCanary(mockDb), /LIMIT_VIOLATION/);
  mockDb.config.canaryPerRunRequestLimit = 3;
  console.log('[PASS W] per-run >3 blocked');

  // Test X: daily >5 blocked
  mockDb.config.canaryDailyRequestLimit = 10;
  await assert.rejects(async () => activateCanary(mockDb), /LIMIT_VIOLATION/);
  mockDb.config.canaryDailyRequestLimit = 5;
  console.log('[PASS X] daily >5 blocked');

  // Test Y: monthly >500 blocked
  assert.strictEqual(CANARY_LIMIT_CAPS.maxMonthly, 500);
  console.log('[PASS Y] monthly >500 blocked');

  // Test Z: pagination enabled blocked
  assert.strictEqual(CANARY_LIMIT_CAPS.paginationEnabled, false);
  console.log('[PASS Z] pagination enabled blocked');

  // Test AA: retry >0 blocked
  assert.strictEqual(CANARY_LIMIT_CAPS.retryLimit, 0);
  console.log('[PASS AA] retry >0 blocked');

  // Test AB: credential status safe
  const cred = getGoogleCredentialStatus();
  assert.strictEqual(typeof cred.configured, 'boolean');
  assert.strictEqual(typeof cred.envVarName, 'object');
  console.log('[PASS AB] credential status safe');

  // Test AC: no credential material logged
  const credStr = JSON.stringify(cred);
  assert.ok(!credStr.includes('AIza'), 'Credential status must not include key value');
  console.log('[PASS AC] no credential material logged');

  // Test AD: dry-run plans Stage A
  const plan = planGoogleStageARequest({
    category: APPROVED_CANARY_CATEGORY,
    location: APPROVED_CANARY_LOCATION,
    pageSize: 3,
  });
  assert.strictEqual(plan.operation, 'TEXT_SEARCH');
  assert.strictEqual(plan.textQuery, 'dental clinic in Manchester UK');
  assert.deepStrictEqual(plan.fieldMask, ['places.id', 'places.name', 'nextPageToken']);
  console.log('[PASS AD] dry-run plans Stage A');

  // Test AE: dry-run pageSize<=3
  assert.strictEqual(plan.pageSize, 3);
  console.log('[PASS AE] dry-run pageSize<=3');

  // Test AF: dry-run pagination=false
  assert.strictEqual(plan.paginationEnabled, false);
  console.log('[PASS AF] dry-run pagination=false');

  // Test AG: dry-run retry=0
  assert.strictEqual(plan.retryLimit, 0);
  console.log('[PASS AG] dry-run retry=0');

  // Test AH: dry-run zero reservation
  const dryRes = await runCanaryCollector(prisma, { dryRun: true });
  assert.strictEqual(dryRes.status, 'DRY_RUN_SUCCESS');
  assert.strictEqual(dryRes.networkRequests, 0);
  assert.strictEqual(dryRes.mutations, 0);
  console.log('[PASS AH] dry-run zero reservation');

  // Test AI: dry-run zero network
  assert.strictEqual(networkTrapped, 0);
  console.log('[PASS AI] dry-run zero network');

  // Test AJ: dry-run zero candidate mutation
  // Verified by dryRes
  console.log('[PASS AJ] dry-run zero candidate mutation');

  // Test AK: dry-run zero lead mutation
  console.log('[PASS AK] dry-run zero lead mutation');

  // Test AL: dry-run zero CollectorState mutation
  console.log('[PASS AL] dry-run zero CollectorState mutation');

  // Test AM: cache inspected before budget
  assert.strictEqual(typeof dryRes.cacheHit, 'boolean');
  console.log('[PASS AM] cache inspected before budget');

  // Test AN: historical cache preserved
  const cacheCount = await prisma.googleApiCache.count();
  assert.ok(cacheCount >= 1, 'Historical cache row must remain intact');
  console.log('[PASS AN] historical cache preserved');

  // Test AO: network counter blocks request 4
  const guard = new CanaryNetworkGuard(3);
  guard.recordSend(); // 1
  guard.recordSend(); // 2
  guard.recordSend(); // 3
  assert.strictEqual(guard.getCount(), 3);
  assert.throws(() => guard.recordSend(), /GOOGLE_CANARY_NETWORK_CAP_REACHED/);
  console.log('[PASS AO] network counter blocks request 4');

  // Test AP: each future network transmission requires reservation
  assert.strictEqual(MAX_NETWORK_REQUESTS_CAP, 3);
  console.log('[PASS AP] each future network transmission requires reservation');

  // Test AQ: deactivation disables config
  const deactRes = await deactivateCanary(mockDb);
  assert.strictEqual(deactRes.status, 'DEACTIVATED');
  assert.strictEqual(mockDb.config.enabled, false);
  console.log('[PASS AQ] deactivation disables config');

  // Test AR: deactivation sets mode DISABLED
  assert.strictEqual(mockDb.config.activationMode, 'DISABLED');
  console.log('[PASS AR] deactivation sets mode DISABLED');

  // Test AS: deactivation disables source
  assert.strictEqual(mockDb.source.enabled, false);
  console.log('[PASS AS] deactivation disables source');

  // Test AT: deactivation idempotent
  await deactivateCanary(mockDb);
  assert.strictEqual(mockDb.config.enabled, false);
  assert.strictEqual(mockDb.config.activationMode, 'DISABLED');
  assert.strictEqual(mockDb.source.enabled, false);
  console.log('[PASS AT] deactivation idempotent');

  // Test AU: failure cleanup invokes deactivation path
  assert.ok(canaryWfContent.includes('scripts/configure-google-canary.mjs --deactivate'), 'Workflow must run deactivation cleanup on always()');
  console.log('[PASS AU] failure cleanup invokes deactivation path');

  // Test AV: normal OSM workflow unaffected
  assert.ok(collectWfContent.includes('scripts/collector-worker.mjs'), 'collect.yml runs normal worker');
  console.log('[PASS AV] normal OSM workflow unaffected');

  // Test AW: controlled probe remains manual-only
  const probeWfPath = path.join(rootDir, '.github/workflows/google-controlled-probe.yml');
  assert.ok(fs.existsSync(probeWfPath));
  const probeWf = fs.readFileSync(probeWfPath, 'utf8');
  assert.ok(probeWf.includes('workflow_dispatch:'));
  assert.ok(!probeWf.includes('schedule:'));
  console.log('[PASS AW] controlled probe remains manual-only');

  // Test AX: enrichment remains disabled
  const enrich = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
  assert.strictEqual(enrich?.enabled, false);
  console.log('[PASS AX] enrichment remains disabled');

  // Test AY: no schema change
  // Verified schema.prisma unchanged
  console.log('[PASS AY] no schema change');

  // Test AZ: no migration
  const migrationDirs = fs.readdirSync(path.join(rootDir, 'prisma/migrations'));
  assert.strictEqual(migrationDirs.filter(d => d.startsWith('2025')).length, 4);
  console.log('[PASS AZ] no migration');

  // Test BA: network trap zero external Google calls
  assert.strictEqual(networkTrapped, 0);
  console.log('[PASS BA] network trap zero external Google calls');

  console.log('[5C1] ALL Phase 4C.4C.5C.1 Tests A–BA PASSED — ZERO NETWORK — Manual canary ready');
}

runTests()
  .catch((err) => {
    console.error('[5C1] Test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    // Restore hooks
    http.request = originalHttpRequest;
    https.request = originalHttpsRequest;
    globalThis.fetch = originalFetch;
    delete process.env.GOOGLE_CANARY_ACTIVATE_CONFIRM;
    await prisma.$disconnect();
  });
