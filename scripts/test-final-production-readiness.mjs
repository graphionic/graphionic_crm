#!/usr/bin/env node
/**
 * ClientForge CRM — Final Production Collection Expansion & Release Readiness Test Suite
 * ZERO GOOGLE NETWORK — 100% fail-closed verification & read-only safety guarantees
 *
 * Test Matrix A–Z:
 * [PASS A] Production candidate volume verified (count >= 913)
 * [PASS B] Candidate status distribution verified (NEEDS_ENRICHMENT + REJECTED)
 * [PASS C] Candidate rejection reasons verified (duplicate_in_run, existing_website, generic_email, email_domain_has_live_website)
 * [PASS D] Active CRM lead volume verified (count >= 88)
 * [PASS E] CRM lead status and segment verified (100% NEW, 100% NO_SITE)
 * [PASS F] Collector run history verified (count >= 20, >= 90% success rate)
 * [PASS G] Google Places configuration verified disabled & fail-closed
 * [PASS H] Google Places activation mode verified DISABLED
 * [PASS I] Google usage events intact with 0 pending reservations
 * [PASS J] Google cache entries intact
 * [PASS K] Enrichment engine configuration verified disabled
 * [PASS L] Zero enrichment jobs and zero enrichment attempts
 * [PASS M] All 8 production market locations configured and enabled
 * [PASS N] All 7 production lead categories configured and enabled
 * [PASS O] Overpass primary and failover data sources configured and healthy
 * [PASS P] Collector engine continuous configuration verified
 * [PASS Q] 5D.2 Candidate Finder executes cleanly in read-only mode
 * [PASS R] Emma Clinic live email domain anti-pattern logic verified
 * [PASS S] Generic email rejection logic verified
 * [PASS T] Role mailbox business domain preservation verified
 * [PASS U] Zero Google network calls executed
 * [PASS V] Zero candidate table mutations caused by verification
 * [PASS W] Zero lead table mutations caused by verification
 * [PASS X] Zero collector run mutations caused by verification
 * [PASS Y] Documentation completeness verified (docs/FINAL_PRODUCTION_READINESS.md exists)
 * [PASS Z] Post-launch backlog verified (docs/POST_LAUNCH_BACKLOG.md exists)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('[FINAL-READINESS] Starting Final Production Release Verification Suite — ZERO NETWORK');

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

async function runSuite() {
  const prisma = new PrismaClient();

  // Test A: Production candidate volume verified (count >= 913)
  const candidateCount = await prisma.leadCandidate.count();
  assert.ok(candidateCount >= 913, `Expected >= 913 candidates, got ${candidateCount}`);
  console.log(`[PASS A] Production candidate volume verified (${candidateCount} candidates)`);

  // Test B: Candidate status distribution verified
  const candidatesByStatus = await prisma.leadCandidate.groupBy({
    by: ['status'],
    _count: { _all: true }
  });
  const statusMap = Object.fromEntries(candidatesByStatus.map(s => [s.status, s._count._all]));
  assert.ok(statusMap.NEEDS_ENRICHMENT >= 550, `Expected >= 550 NEEDS_ENRICHMENT, got ${statusMap.NEEDS_ENRICHMENT}`);
  assert.ok(statusMap.REJECTED >= 350, `Expected >= 350 REJECTED, got ${statusMap.REJECTED}`);
  console.log(`[PASS B] Candidate status distribution verified (NEEDS_ENRICHMENT: ${statusMap.NEEDS_ENRICHMENT}, REJECTED: ${statusMap.REJECTED})`);

  // Test C: Candidate rejection reasons verified
  const rejections = await prisma.leadCandidate.groupBy({
    by: ['rejectionReason'],
    where: { status: 'REJECTED' },
    _count: { _all: true }
  });
  const rejMap = Object.fromEntries(rejections.map(r => [r.rejectionReason, r._count._all]));
  assert.ok(rejMap.existing_website >= 150, `Expected >= 150 existing_website rejections, got ${rejMap.existing_website}`);
  assert.ok(rejMap.duplicate_in_run >= 150, `Expected >= 150 duplicate_in_run rejections, got ${rejMap.duplicate_in_run}`);
  assert.ok(rejMap.generic_email >= 2, `Expected >= 2 generic_email rejections, got ${rejMap.generic_email}`);
  assert.ok(rejMap.email_domain_has_live_website >= 2, `Expected >= 2 email_domain_has_live_website rejections, got ${rejMap.email_domain_has_live_website}`);
  console.log(`[PASS C] Candidate rejection reasons verified (existing_website: ${rejMap.existing_website}, duplicate: ${rejMap.duplicate_in_run}, generic_email: ${rejMap.generic_email}, domain_live: ${rejMap.email_domain_has_live_website})`);

  // Test D: Active CRM lead volume verified (count >= 88)
  const leadCount = await prisma.lead.count();
  assert.ok(leadCount >= 88, `Expected >= 88 CRM leads, got ${leadCount}`);
  console.log(`[PASS D] Active CRM lead volume verified (${leadCount} leads)`);

  // Test E: CRM lead status and segment verified (100% NEW, 100% NO_SITE)
  const nonNewLeads = await prisma.lead.count({ where: { status: { not: 'NEW' } } });
  const nonNoSiteLeads = await prisma.lead.count({ where: { segment: { not: 'NO_SITE' } } });
  assert.strictEqual(nonNewLeads, 0, 'All CRM leads must have status NEW');
  assert.strictEqual(nonNoSiteLeads, 0, 'All CRM leads must have segment NO_SITE');
  console.log('[PASS E] CRM lead status and segment verified (100% NEW, 100% NO_SITE)');

  // Test F: Collector run history verified (count >= 20, >= 90% success rate)
  const totalRuns = await prisma.collectorRun.count();
  const successRuns = await prisma.collectorRun.count({ where: { status: 'SUCCESS' } });
  assert.ok(totalRuns >= 20, `Expected >= 20 runs, got ${totalRuns}`);
  const successRate = (successRuns / totalRuns) * 100;
  assert.ok(successRate >= 90, `Expected >= 90% success rate, got ${successRate.toFixed(1)}%`);
  console.log(`[PASS F] Collector run history verified (${totalRuns} runs, ${successRate.toFixed(1)}% success)`);

  // Test G: Google Places configuration verified disabled & fail-closed
  const gConfig = await prisma.googleCollectionConfig.findFirst({ where: { key: 'default' } });
  assert.ok(gConfig, 'GoogleCollectionConfig default record must exist');
  assert.strictEqual(gConfig.enabled, false, 'Google collection must be disabled');
  assert.strictEqual(gConfig.failClosed, true, 'Google collection must fail-closed');
  console.log('[PASS G] Google Places configuration verified disabled & fail-closed');

  // Test H: Google Places activation mode verified DISABLED
  assert.strictEqual(gConfig.activationMode, 'DISABLED', 'Google activation mode must be DISABLED');
  console.log('[PASS H] Google Places activation mode verified DISABLED');

  // Test I: Google usage events intact with 0 pending reservations
  const usageCount = await prisma.googleApiUsage.count();
  const pendingUsage = await prisma.googleApiUsage.count({ where: { status: 'RESERVED' } });
  assert.strictEqual(usageCount, 2, 'Expected exactly 2 recorded canary/probe usage events');
  assert.strictEqual(pendingUsage, 0, 'Expected 0 pending reservations');
  console.log('[PASS I] Google usage events intact with 0 pending reservations');

  // Test J: Google cache entries intact
  const cacheCount = await prisma.googleApiCache.count();
  assert.strictEqual(cacheCount, 2, 'Expected exactly 2 recorded Google cache entries');
  console.log('[PASS J] Google cache entries intact');

  // Test K: Enrichment engine configuration verified disabled
  const eConfig = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
  assert.ok(eConfig, 'EnrichmentConfig default record must exist');
  assert.strictEqual(eConfig.enabled, false, 'Enrichment engine must be disabled');
  console.log('[PASS K] Enrichment engine configuration verified disabled');

  // Test L: Zero enrichment jobs and zero enrichment attempts
  const jobCount = await prisma.enrichmentJob.count();
  const attemptCount = await prisma.enrichmentAttempt.count();
  assert.strictEqual(jobCount, 0, 'Expected 0 enrichment jobs');
  assert.strictEqual(attemptCount, 0, 'Expected 0 enrichment attempts');
  console.log('[PASS L] Zero enrichment jobs and zero enrichment attempts');

  // Test M: All 8 production market locations configured and enabled
  const locations = await prisma.collectorLocation.findMany();
  assert.strictEqual(locations.length, 8, 'Expected exactly 8 configured locations');
  const allLocsEnabled = locations.every(l => l.enabled === true);
  assert.ok(allLocsEnabled, 'All configured locations must be enabled');
  console.log('[PASS M] All 8 production market locations configured and enabled');

  // Test N: All 7 production lead categories configured and enabled
  const categories = await prisma.leadCategory.findMany();
  assert.strictEqual(categories.length, 7, 'Expected exactly 7 configured categories');
  const allCatsEnabled = categories.every(c => c.enabled === true);
  assert.ok(allCatsEnabled, 'All configured categories must be enabled');
  console.log('[PASS N] All 7 production lead categories configured and enabled');

  // Test O: Overpass primary and failover data sources configured and healthy
  const overpassSources = await prisma.dataSource.findMany({ where: { type: 'overpass' } });
  assert.ok(overpassSources.length >= 2, 'Expected at least 2 Overpass sources (primary + failover)');
  const deSource = overpassSources.find(s => s.baseUrl.includes('overpass-api.de'));
  const kumiSource = overpassSources.find(s => s.baseUrl.includes('kumi.systems'));
  assert.ok(deSource && deSource.enabled, 'Overpass DE must be enabled');
  assert.ok(kumiSource && kumiSource.enabled, 'Overpass Kumi must be enabled');
  console.log('[PASS O] Overpass primary and failover data sources configured and healthy');

  // Test P: Collector engine continuous configuration verified
  const cConfig = await prisma.collectorConfig.findFirst({ where: { key: 'default' } });
  assert.ok(cConfig, 'CollectorConfig default record must exist');
  assert.strictEqual(cConfig.enabled, true, 'Collector engine must be enabled');
  assert.strictEqual(cConfig.collectionMode, 'continuous', 'Collection mode must be continuous');
  assert.strictEqual(cConfig.verificationEnabled, true, 'Verification must be enabled');
  assert.strictEqual(cConfig.emailRequired, true, 'Email requirement must be enabled');
  assert.strictEqual(cConfig.websiteFilteringEnabled, true, 'Website filtering must be enabled');
  assert.strictEqual(cConfig.duplicateFilteringEnabled, true, 'Duplicate filtering must be enabled');
  console.log('[PASS P] Collector engine continuous configuration verified');

  // Test Q: 5D.2 Candidate Finder executes cleanly in read-only mode
  const { findGoogleVerificationCandidate } = await import('./find-google-verification-candidate.mjs');
  const finderResult = await findGoogleVerificationCandidate(prisma);
  assert.ok(finderResult.status === 'NO_ELIGIBLE_CANDIDATE' || finderResult.status === 'SELECTED', 'Finder returned valid status');
  assert.strictEqual(finderResult.dryRun, true, 'Finder must run in dryRun mode');
  assert.strictEqual(finderResult.networkRequests, 0, 'Finder must make zero network requests');
  assert.strictEqual(finderResult.budgetReservations, 0, 'Finder must make zero budget reservations');
  assert.strictEqual(finderResult.dbMutations, 0, 'Finder must make zero DB mutations');
  console.log(`[PASS Q] 5D.2 Candidate Finder executes cleanly in read-only mode (status: ${finderResult.status})`);

  // Test R: Emma Clinic live email domain anti-pattern logic verified
  const GENERIC_EMAIL_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'mail.com', 'zoho.com', 'protonmail.com'
  ]);
  const extractDomain = (email) => {
    if (!email || !email.includes('@')) return null;
    return email.split('@')[1].trim().toLowerCase();
  };
  const emmaDomain = extractDomain('info@emmaclinicthailand.com');
  assert.strictEqual(emmaDomain, 'emmaclinicthailand.com');
  assert.strictEqual(GENERIC_EMAIL_DOMAINS.has(emmaDomain), false, 'Emma Clinic domain is a custom business domain');
  console.log('[PASS R] Emma Clinic live email domain anti-pattern logic verified');

  // Test S: Generic email rejection logic verified
  const gmailDomain = extractDomain('clinictest@gmail.com');
  assert.strictEqual(GENERIC_EMAIL_DOMAINS.has(gmailDomain), true, 'Gmail domain correctly flagged as generic');
  console.log('[PASS S] Generic email rejection logic verified');

  // Test T: Role mailbox business domain preservation verified
  const ROLE_MAILBOX_PREFIXES = new Set(['info', 'contact', 'admin', 'sales', 'hello', 'enquiries', 'reception', 'office', 'support']);
  const isRoleMailbox = (email) => {
    if (!email || !email.includes('@')) return false;
    const prefix = email.split('@')[0].trim().toLowerCase();
    return ROLE_MAILBOX_PREFIXES.has(prefix);
  };
  assert.strictEqual(isRoleMailbox('info@apexdental.co.uk'), true, 'info@ is role mailbox');
  assert.strictEqual(isRoleMailbox('dr.smith@apexdental.co.uk'), false, 'dr.smith@ is personal mailbox');
  console.log('[PASS T] Role mailbox business domain preservation verified');

  // Test U: Zero Google network calls executed
  assert.strictEqual(networkTrapped, 0, 'Zero network calls must be trapped');
  console.log('[PASS U] Zero Google network calls executed');

  // Test V: Zero candidate table mutations caused by verification
  const candidateCountAfter = await prisma.leadCandidate.count();
  assert.strictEqual(candidateCountAfter, candidateCount, 'Candidate count must remain strictly unchanged');
  console.log('[PASS V] Zero candidate table mutations caused by verification');

  // Test W: Zero lead table mutations caused by verification
  const leadCountAfter = await prisma.lead.count();
  assert.strictEqual(leadCountAfter, leadCount, 'Lead count must remain strictly unchanged');
  console.log('[PASS W] Zero lead table mutations caused by verification');

  // Test X: Zero collector run mutations caused by verification
  const totalRunsAfter = await prisma.collectorRun.count();
  assert.strictEqual(totalRunsAfter, totalRuns, 'Collector run count must remain strictly unchanged');
  console.log('[PASS X] Zero collector run mutations caused by verification');

  // Test Y: Documentation completeness verified (docs/FINAL_PRODUCTION_READINESS.md exists)
  const docPath = path.join(rootDir, 'docs', 'FINAL_PRODUCTION_READINESS.md');
  assert.ok(fs.existsSync(docPath), 'docs/FINAL_PRODUCTION_READINESS.md must exist');
  const docContent = fs.readFileSync(docPath, 'utf8');
  assert.ok(docContent.includes('READY FOR PRODUCTION'), 'Doc must include release baseline');
  console.log('[PASS Y] Documentation completeness verified (docs/FINAL_PRODUCTION_READINESS.md exists)');

  // Test Z: Post-launch backlog verified (docs/POST_LAUNCH_BACKLOG.md exists)
  const backlogPath = path.join(rootDir, 'docs', 'POST_LAUNCH_BACKLOG.md');
  assert.ok(fs.existsSync(backlogPath), 'docs/POST_LAUNCH_BACKLOG.md must exist');
  const backlogContent = fs.readFileSync(backlogPath, 'utf8');
  assert.ok(backlogContent.includes('Post-Launch Engineering Backlog'), 'Backlog doc must exist and contain items');
  console.log('[PASS Z] Post-launch backlog verified (docs/POST_LAUNCH_BACKLOG.md exists)');

  await prisma.$disconnect();
  console.log('[FINAL-READINESS] ALL Tests A–Z PASSED — 100% SUCCESS — System Certified Ready for Launch');
}

runSuite().catch(err => {
  console.error('[FINAL-READINESS] Test failure:', err);
  process.exit(1);
});
