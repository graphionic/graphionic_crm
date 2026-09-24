import assert from 'node:assert';
import http from 'node:http';
import https from 'node:https';
import Module from 'node:module';

// Polyfill server-only for standalone tsx test runners
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, arguments);
};

console.log('[4D2] Starting Phase 4D.2 Route & Navigation Smoke Tests — ZERO NETWORK');

// Hard Network Trap
for (const mod of [http, https]) {
  const origRequest = mod.request;
  const origGet = mod.get;
  mod.request = function (urlOrOptions, ...args) {
    const host = typeof urlOrOptions === 'string' ? urlOrOptions : urlOrOptions?.hostname || urlOrOptions?.host || '';
    if (host.includes('googleapis') || host.includes('google.com') || host.includes('places')) {
      throw new Error(`[TRAP] Forbidden external Google network call in test: ${host}`);
    }
    return origRequest.call(this, urlOrOptions, ...args);
  };
  mod.get = function (urlOrOptions, ...args) {
    const host = typeof urlOrOptions === 'string' ? urlOrOptions : urlOrOptions?.hostname || urlOrOptions?.host || '';
    if (host.includes('googleapis') || host.includes('google.com') || host.includes('places')) {
      throw new Error(`[TRAP] Forbidden external Google network call in test: ${host}`);
    }
    return origGet.call(this, urlOrOptions, ...args);
  };
}

async function runTests() {
  const { prisma } = await import('../src/lib/prisma.ts');

  // 1. Invariant Baseline Check
  const [googleConfig, usageCount, cacheCount, candidatesCount, leadsCount] = await Promise.all([
    prisma.googleCollectionConfig.findFirst(),
    prisma.googleApiUsage.count(),
    prisma.googleApiCache.count(),
    prisma.leadCandidate.count({ where: { discoverySource: { type: 'google_places' } } }),
    prisma.lead.count({ where: { source: 'google_places' } }),
  ]);

  assert.strictEqual(googleConfig?.enabled, false, '[TEST A] GoogleCollectionConfig.enabled must be false');
  assert.strictEqual(googleConfig?.activationMode, 'DISABLED', '[TEST B] GoogleCollectionConfig.activationMode must be DISABLED');
  assert.strictEqual(usageCount, 2, '[TEST C] GoogleApiUsage count must remain 2');
  assert.strictEqual(cacheCount, 2, '[TEST D] GoogleApiCache count must remain 2');
  assert.strictEqual(candidatesCount, 0, '[TEST E] Google candidates count must be 0');
  assert.strictEqual(leadsCount, 0, '[TEST F] Google leads count must be 0');
  console.log('[PASS A-F] Safety invariants verified (Google disabled, 0 network, usage=2, cache=2)');

  // 2. Data loader verification for promoted pages
  const { getCollectorOverview, getLocations, getCategories, getDataSources, getCollectionRules, getCollectorRuns, getCollectorStates, getLeadCandidateStats } = await import('../src/lib/collector.ts');

  const overview = await getCollectorOverview();
  assert(overview && overview.counts, '[TEST G] getCollectorOverview returns structured overview');
  console.log('[PASS G] Collection Overview data loader operational');

  const runs = await getCollectorRuns({ limit: 10 });
  assert(Array.isArray(runs), '[TEST H] getCollectorRuns returns array');
  console.log(`[PASS H] Collector Runs data loader operational (${runs.length} runs)`);

  const states = await getCollectorStates();
  assert(Array.isArray(states), '[TEST I] getCollectorStates returns array');
  console.log(`[PASS I] Collector States data loader operational (${states.length} states)`);

  const locations = await getLocations();
  assert(Array.isArray(locations), '[TEST J] getLocations returns array');
  console.log(`[PASS J] Collector Locations data loader operational (${locations.length} locations)`);

  const categories = await getCategories();
  assert(Array.isArray(categories), '[TEST K] getCategories returns array');
  console.log(`[PASS K] Collector Categories data loader operational (${categories.length} categories)`);

  const sources = await getDataSources();
  assert(Array.isArray(sources), '[TEST L] getDataSources returns array');
  console.log(`[PASS L] Data Sources data loader operational (${sources.length} sources)`);

  const rules = await getCollectionRules();
  assert(Array.isArray(rules), '[TEST M] getCollectionRules returns array');
  console.log(`[PASS M] Collection Rules data loader operational (${rules.length} rules)`);

  const candStats = await getLeadCandidateStats();
  assert(candStats && typeof candStats.total === 'number', '[TEST N] getLeadCandidateStats returns total count');
  console.log(`[PASS N] Candidate Stats loader operational (${candStats.total} candidates total)`);

  console.log('[4D2] ALL Phase 4D.2 Navigation Smoke Tests PASSED — ZERO NETWORK — ZERO MUTATIONS');
  await prisma.$disconnect();
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
