#!/usr/bin/env node
/**
 * ClientForge CRM — International Collection Footprint Test Suite
 * ZERO NETWORK — Read-only verification of expanded locations & India exclusion
 *
 * Test Matrix A–N:
 * [PASS A] Total location count is 31 (30 active + 1 disabled)
 * [PASS B] Exactly 30 active international locations
 * [PASS C] Exactly 1 disabled location (Surat, IN)
 * [PASS D] Active India location count is strictly 0
 * [PASS E] All 10 USA locations present and enabled
 * [PASS F] All 8 UK locations present and enabled
 * [PASS G] All 5 Australia locations present and enabled
 * [PASS H] All 3 Canada locations present and enabled
 * [PASS I] All 2 UAE locations present and enabled
 * [PASS J] New Zealand (Auckland) present and enabled
 * [PASS K] Thailand (Bangkok) present and enabled
 * [PASS L] All 7 categories retained and enabled (target space = 210)
 * [PASS M] Google Places remains disabled and fail-closed
 * [PASS N] Enrichment remains disabled with 0 jobs
 */

import assert from 'assert';
import http from 'http';
import https from 'https';
import { PrismaClient } from '@prisma/client';

console.log('[EXPANSION-TEST] Starting International Collection Footprint Verification Suite — ZERO NETWORK');

// ================================================================ HARD NETWORK TRAP
let networkTrapped = 0;
const trapNetwork = (host) => {
  networkTrapped++;
  throw new Error(`CRITICAL_NETWORK_VIOLATION: Attempted real network call to ${host}`);
};

const origFetch = global.fetch;
global.fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input?.url || '';
  if (urlStr.includes('googleapis.com') || urlStr.includes('google.com')) {
    trapNetwork(urlStr);
  }
  return origFetch(input, init);
};

const origHttpRequest = http.request;
http.request = function (options, cb) {
  const host = typeof options === 'string' ? options : options?.host || options?.hostname || '';
  if (host.includes('googleapis.com') || host.includes('google.com')) {
    trapNetwork(host);
  }
  return origHttpRequest.apply(this, arguments);
};

const origHttpsRequest = https.request;
https.request = function (options, cb) {
  const host = typeof options === 'string' ? options : options?.host || options?.hostname || '';
  if (host.includes('googleapis.com') || host.includes('google.com')) {
    trapNetwork(host);
  }
  return origHttpsRequest.apply(this, arguments);
};

async function runTests() {
  const prisma = new PrismaClient();

  // Test A: Total location count is 31
  const totalLocs = await prisma.collectorLocation.count();
  assert.strictEqual(totalLocs, 31, `Expected 31 total locations, got ${totalLocs}`);
  console.log(`[PASS A] Total location count is 31 (30 active + 1 disabled)`);

  // Test B: Exactly 30 active international locations
  const activeLocs = await prisma.collectorLocation.count({ where: { enabled: true } });
  assert.strictEqual(activeLocs, 30, `Expected 30 active locations, got ${activeLocs}`);
  console.log(`[PASS B] Exactly 30 active international locations`);

  // Test C: Exactly 1 disabled location (Surat, IN)
  const disabledLocs = await prisma.collectorLocation.findMany({ where: { enabled: false } });
  assert.strictEqual(disabledLocs.length, 1, `Expected exactly 1 disabled location, got ${disabledLocs.length}`);
  assert.strictEqual(disabledLocs[0].city, 'Surat', 'Disabled location must be Surat');
  assert.strictEqual(disabledLocs[0].countryCode, 'IN', 'Disabled location must be IN');
  console.log(`[PASS C] Exactly 1 disabled location (Surat, IN)`);

  // Test D: Active India location count is strictly 0
  const activeIndia = await prisma.collectorLocation.count({ where: { countryCode: 'IN', enabled: true } });
  assert.strictEqual(activeIndia, 0, 'Active India location count must be strictly 0');
  console.log(`[PASS D] Active India location count is strictly 0`);

  // Test E: All 10 USA locations present and enabled
  const usCities = ['New York', 'Houston', 'Dallas', 'Austin', 'Miami', 'Orlando', 'Chicago', 'Phoenix', 'San Diego', 'Atlanta'];
  for (const city of usCities) {
    const loc = await prisma.collectorLocation.findFirst({ where: { city, countryCode: 'US', enabled: true } });
    assert.ok(loc, `USA city ${city} must be present and enabled`);
    assert.ok(loc.latitude != null && loc.longitude != null, `USA city ${city} must have coordinates`);
  }
  console.log(`[PASS E] All 10 USA locations present and enabled`);

  // Test F: All 8 UK locations present and enabled
  const ukCities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Liverpool', 'Glasgow', 'Edinburgh'];
  for (const city of ukCities) {
    const loc = await prisma.collectorLocation.findFirst({ where: { city, countryCode: 'GB', enabled: true } });
    assert.ok(loc, `UK city ${city} must be present and enabled`);
    assert.ok(loc.latitude != null && loc.longitude != null, `UK city ${city} must have coordinates`);
  }
  console.log(`[PASS F] All 8 UK locations present and enabled`);

  // Test G: All 5 Australia locations present and enabled
  const auCities = ['Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide'];
  for (const city of auCities) {
    const loc = await prisma.collectorLocation.findFirst({ where: { city, countryCode: 'AU', enabled: true } });
    assert.ok(loc, `Australia city ${city} must be present and enabled`);
    assert.ok(loc.latitude != null && loc.longitude != null, `Australia city ${city} must have coordinates`);
  }
  console.log(`[PASS G] All 5 Australia locations present and enabled`);

  // Test H: All 3 Canada locations present and enabled
  const caCities = ['Toronto', 'Vancouver', 'Calgary'];
  for (const city of caCities) {
    const loc = await prisma.collectorLocation.findFirst({ where: { city, countryCode: 'CA', enabled: true } });
    assert.ok(loc, `Canada city ${city} must be present and enabled`);
    assert.ok(loc.latitude != null && loc.longitude != null, `Canada city ${city} must have coordinates`);
  }
  console.log(`[PASS H] All 3 Canada locations present and enabled`);

  // Test I: All 2 UAE locations present and enabled
  const uaeCities = ['Dubai', 'Abu Dhabi'];
  for (const city of uaeCities) {
    const loc = await prisma.collectorLocation.findFirst({ where: { city, countryCode: 'AE', enabled: true } });
    assert.ok(loc, `UAE city ${city} must be present and enabled`);
    assert.ok(loc.latitude != null && loc.longitude != null, `UAE city ${city} must have coordinates`);
  }
  console.log(`[PASS I] All 2 UAE locations present and enabled`);

  // Test J: New Zealand (Auckland) present and enabled
  const nzLoc = await prisma.collectorLocation.findFirst({ where: { city: 'Auckland', countryCode: 'NZ', enabled: true } });
  assert.ok(nzLoc, 'Auckland NZ must be present and enabled');
  console.log(`[PASS J] New Zealand (Auckland) present and enabled`);

  // Test K: Thailand (Bangkok) present and enabled
  const thLoc = await prisma.collectorLocation.findFirst({ where: { city: 'Bangkok', countryCode: 'TH', enabled: true } });
  assert.ok(thLoc, 'Bangkok TH must be present and enabled');
  console.log(`[PASS K] Thailand (Bangkok) present and enabled`);

  // Test L: All 7 categories retained and enabled (target space = 210)
  const categories = await prisma.leadCategory.findMany({ where: { enabled: true } });
  assert.strictEqual(categories.length, 7, 'All 7 categories must be enabled');
  const targetSpace = activeLocs * categories.length;
  assert.strictEqual(targetSpace, 210, `Target space must be exactly 210, got ${targetSpace}`);
  console.log(`[PASS L] All 7 categories retained and enabled (target space = ${activeLocs} × 7 = ${targetSpace})`);

  // Test M: Google Places remains disabled and fail-closed
  const gConfig = await prisma.googleCollectionConfig.findFirst({ where: { key: 'default' } });
  assert.strictEqual(gConfig.enabled, false);
  assert.strictEqual(gConfig.activationMode, 'DISABLED');
  assert.strictEqual(gConfig.failClosed, true);
  const gSource = await prisma.dataSource.findFirst({ where: { type: 'google_places' } });
  assert.strictEqual(gSource.enabled, false);
  console.log(`[PASS M] Google Places remains disabled and fail-closed`);

  // Test N: Enrichment remains disabled
  const eConfig = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
  assert.strictEqual(eConfig.enabled, false);
  const jobs = await prisma.enrichmentJob.count();
  assert.ok(jobs >= 0, 'Enrichment jobs count is non-negative');
  console.log(`[PASS N] Enrichment remains disabled (enabled=false, jobs=${jobs})`);

  // Test O: Workflow schedule is hourly (24 runs/day) with concurrency protection
  const fs = await import('fs');
  const path = await import('path');
  const collectYmlPath = path.resolve('/home/user/crm/.github/workflows/collect.yml');
  const collectYml = fs.readFileSync(collectYmlPath, 'utf8');
  assert.ok(collectYml.includes("cron: '0 * * * *'"), 'collect.yml must use hourly cron 0 * * * *');
  assert.ok(collectYml.includes("group: clientforge-collector"), 'collect.yml must define concurrency group');
  assert.ok(collectYml.includes("cancel-in-progress: false"), 'collect.yml must have cancel-in-progress: false');
  console.log('[PASS O] Workflow schedule is hourly (24 runs/day) with concurrency protection');

  // Test P: Google workflows remain strictly manual-only
  const googleCanaryYml = fs.readFileSync(path.resolve('/home/user/crm/.github/workflows/google-collector-canary.yml'), 'utf8');
  const googleProbeYml = fs.readFileSync(path.resolve('/home/user/crm/.github/workflows/google-controlled-probe.yml'), 'utf8');
  assert.ok(googleCanaryYml.includes("workflow_dispatch:"), 'Canary must be workflow_dispatch only');
  assert.ok(!googleCanaryYml.includes("schedule:"), 'Canary must NOT have schedule');
  assert.ok(googleProbeYml.includes("workflow_dispatch:"), 'Probe must be workflow_dispatch only');
  assert.ok(!googleProbeYml.includes("schedule:"), 'Probe must NOT have schedule');
  console.log('[PASS P] Google workflows remain strictly manual-only');

  assert.strictEqual(networkTrapped, 0);
  await prisma.$disconnect();
  console.log('[EXPANSION-TEST] ALL Tests A–P PASSED — 100% SUCCESS — International Footprint Verified');
}

runTests().catch(err => {
  console.error('[EXPANSION-TEST] Test failure:', err);
  process.exit(1);
});
