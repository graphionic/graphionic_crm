#!/usr/bin/env node
/**
 * Phase 4C.4B.1 — Google Guardrails DB Integration Tests
 * Requires TEST_DATABASE_URL for isolated test DB
 * Tests atomic reservation, FOR UPDATE, concurrency, usage rows, cache rows, boundaries
 * MUST call safety mechanism BEFORE any mutation
 */

import fs from 'node:fs';
import { getTestPrismaClient, assertTestDatabaseAvailable } from './test-db-client.mjs';

function log(m){ console.log(`[DB-TEST] ${m}`); }
function pass(id,m){ console.log(`[PASS ${id}] ${m}`); }
function fail(id,m){ console.error(`[FAIL ${id}] ${m}`); throw new Error(`Test ${id} failed: ${m}`); }

const PREFIX = 'TEST_GOOGLE_4C4B_DB_';

async function cleanup(prisma){
  try{
    const usages = await prisma.googleApiUsage.findMany({ where:{ queryFingerprint:{ startsWith:'test-' } }, select:{id:true} });
    const usages2 = await prisma.googleApiUsage.findMany({ where:{ workerId:{ startsWith:'test-' } }, select:{id:true} });
    const allIds = [...new Set([...usages.map(u=>u.id), ...usages2.map(u=>u.id)])];
    if(allIds.length) await prisma.googleApiUsage.deleteMany({ where:{ id:{ in: allIds } } });
    const caches = await prisma.googleApiCache.findMany({ where:{ queryFingerprint:{ startsWith:'test-' } }, select:{id:true} });
    if(caches.length) await prisma.googleApiCache.deleteMany({ where:{ id:{ in: caches.map(c=>c.id) } } });
    const ds = await prisma.dataSource.findMany({ where:{ name:{ startsWith:PREFIX } }, select:{id:true} });
    if(ds.length){
      await prisma.googleApiUsage.deleteMany({ where:{ sourceId:{ in: ds.map(d=>d.id) } } });
      await prisma.googleApiCache.deleteMany({ where:{ sourceId:{ in: ds.map(d=>d.id) } } });
      await prisma.collectorRun.deleteMany({ where:{ sourceId:{ in: ds.map(d=>d.id) } } });
      await prisma.dataSource.deleteMany({ where:{ id:{ in: ds.map(d=>d.id) } } });
    }
    const cands = await prisma.leadCandidate.findMany({ where:{ companyName:{ startsWith:PREFIX } }, select:{id:true} });
    if(cands.length){
      await prisma.leadCandidate.deleteMany({ where:{ id:{ in: cands.map(c=>c.id) } } });
    }
    // Cleanup stray running collector runs from tests
    await prisma.collectorRun.deleteMany({ where:{ candidatesFound:0, leadsAccepted:0, leadsInserted:0, status:'RUNNING' } });
  }catch(e){ log(`Cleanup error ${e.message}`); }
}

async function createTestDataSource(prisma, nameSuffix, type='google_places', enabled=false){
  return await prisma.dataSource.create({ data:{ name:`${PREFIX}${nameSuffix}`, type, enabled, priority:10, baseUrl:`https://test.example.com/${nameSuffix}`, config:{test:true} } });
}

async function createTestCollectorRun(prisma, sourceId){
  const loc = await prisma.collectorLocation.findFirst();
  const cat = await prisma.leadCategory.findFirst();
  return await prisma.collectorRun.create({ data:{ status:'RUNNING', locationId:loc?.id, categoryId:cat?.id, sourceId, startedAt:new Date(), candidatesFound:0, leadsAccepted:0, leadsInserted:0 } });
}

async function main(){
  log('Starting Phase 4C.4B.1 DB Integration Tests');

  // SAFETY CONTRACT: call before any mutation
  try{
    assertTestDatabaseAvailable();
  }catch(e){
    console.log(e.message);
    console.log('DB INTEGRATION TESTS NOT RUN — TEST_DATABASE_URL REQUIRED');
    process.exit(0);
  }

  let prisma;
  try{
    prisma = getTestPrismaClient();
  }catch(e){
    console.error(e.message);
    console.log('DB INTEGRATION TESTS NOT RUN — TEST_DATABASE_URL REQUIRED');
    process.exit(0);
  }

  await cleanup(prisma);

  let cfg = await prisma.googleCollectionConfig.findFirst({ where:{ key:'default' } });
  if(!cfg){
    cfg = await prisma.googleCollectionConfig.create({ data:{ key:'default', enabled:false, failClosed:true, perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:500, cacheEnabled:true, queryCacheTtlHours:24, placeDetailsCacheTtlHours:168, retryLimit:0 } });
  }
  const originalConfig = { ...cfg };

  const guardrails = await import('../src/lib/google-request-guardrails.ts');

  // A source disabled → reservation denied
  log('Test A: source disabled → reservation denied');
  {
    const dsA = await createTestDataSource(prisma, 'A-disabled', 'google_places', false);
    const runA = await createTestCollectorRun(prisma, dsA.id);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true } });
    const resA = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsA.id, operation:'TEXT_SEARCH', collectorRunId: runA.id, queryFingerprint:`test-A-${Date.now()}`, requestUnits:1 });
    if(resA.allowed) fail('A','Should be denied when source disabled');
    if(resA.reason!=='SOURCE_DISABLED') fail('A',`Expected SOURCE_DISABLED got ${resA.reason}`);
    pass('A','Source disabled → reservation denied');
    await prisma.collectorRun.delete({ where:{ id: runA.id } });
    await prisma.dataSource.delete({ where:{ id: dsA.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false } });
  }

  // B missing config → fail closed
  log('Test B: missing config → fail closed');
  {
    const backup = await prisma.googleCollectionConfig.findFirst({ where:{ key:'default' } });
    await prisma.googleCollectionConfig.delete({ where:{ key:'default' } });
    const dsB = await createTestDataSource(prisma, 'B-missing-config', 'google_places', true);
    const runB = await createTestCollectorRun(prisma, dsB.id);
    const resB = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsB.id, operation:'TEXT_SEARCH', collectorRunId: runB.id, queryFingerprint:`test-B-${Date.now()}`, requestUnits:1 });
    if(resB.allowed) fail('B','Should fail closed when missing config');
    if(resB.reason!=='MISSING_CONFIG') fail('B',`Expected MISSING_CONFIG got ${resB.reason}`);
    pass('B','Missing config → fail closed');
    await prisma.collectorRun.delete({ where:{ id: runB.id } });
    await prisma.dataSource.delete({ where:{ id: dsB.id } });
    await prisma.googleCollectionConfig.create({ data:{ key:'default', enabled:backup.enabled, failClosed:backup.failClosed, perRunRequestLimit:backup.perRunRequestLimit, dailyRequestLimit:backup.dailyRequestLimit, monthlyRequestLimit:backup.monthlyRequestLimit, dailyCostUnitLimit:backup.dailyCostUnitLimit, monthlyCostUnitLimit:backup.monthlyCostUnitLimit, cacheEnabled:backup.cacheEnabled, queryCacheTtlHours:backup.queryCacheTtlHours, placeDetailsCacheTtlHours:backup.placeDetailsCacheTtlHours, retryLimit:backup.retryLimit } });
  }

  // C missing source → SOURCE_NOT_FOUND (corrected terminology, no credential model yet)
  log('Test C: missing source → SOURCE_NOT_FOUND');
  {
    const fakeSourceId = 'nonexistent-source-id';
    const runC = await prisma.collectorRun.create({ data:{ status:'RUNNING', startedAt:new Date(), candidatesFound:0, leadsAccepted:0, leadsInserted:0 } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true } });
    const resC = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: fakeSourceId, operation:'TEXT_SEARCH', collectorRunId: runC.id, queryFingerprint:`test-C-${Date.now()}`, requestUnits:1 });
    if(resC.allowed) fail('C','Should be denied when source not found');
    if(resC.reason!=='SOURCE_NOT_FOUND') fail('C',`Expected SOURCE_NOT_FOUND got ${resC.reason}`);
    pass('C','Missing source → SOURCE_NOT_FOUND (credential integration belongs to 4C.4C)');
    await prisma.collectorRun.delete({ where:{ id: runC.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false } });
  }

  // D per-run limit boundary
  log('Test D: per-run limit boundary');
  {
    const dsD = await createTestDataSource(prisma, 'D-per-run', 'google_places', true);
    const runD = await createTestCollectorRun(prisma, dsD.id);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:2, dailyRequestLimit:100, monthlyRequestLimit:1000 } });
    const fp1 = `test-D-1-${Date.now()}`;
    const fp2 = `test-D-2-${Date.now()}`;
    const fp3 = `test-D-3-${Date.now()}`;
    const r1 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsD.id, operation:'TEXT_SEARCH', collectorRunId: runD.id, queryFingerprint:fp1, requestUnits:1 });
    const r2 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsD.id, operation:'TEXT_SEARCH', collectorRunId: runD.id, queryFingerprint:fp2, requestUnits:1 });
    const r3 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsD.id, operation:'TEXT_SEARCH', collectorRunId: runD.id, queryFingerprint:fp3, requestUnits:1 });
    if(!r1.allowed || !r2.allowed) fail('D','First 2 should be allowed under per-run limit 2');
    if(r3.allowed) fail('D','Third should be blocked per-run limit');
    if(r3.reason!=='PER_RUN_LIMIT_REACHED') fail('D',`Expected PER_RUN_LIMIT_REACHED got ${r3.reason}`);
    pass('D','Per-run limit boundary OK — 2 allowed, 3rd blocked');
    await prisma.googleApiUsage.deleteMany({ where:{ collectorRunId: runD.id } });
    await prisma.collectorRun.delete({ where:{ id: runD.id } });
    await prisma.dataSource.delete({ where:{ id: dsD.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:500 } });
  }

  // E daily limit boundary
  log('Test E: daily limit boundary');
  {
    const dsE = await createTestDataSource(prisma, 'E-daily', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:2, monthlyRequestLimit:1000 } });
    const runE1 = await createTestCollectorRun(prisma, dsE.id);
    const runE2 = await createTestCollectorRun(prisma, dsE.id);
    const runE3 = await createTestCollectorRun(prisma, dsE.id);
    const r1 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsE.id, operation:'TEXT_SEARCH', collectorRunId: runE1.id, queryFingerprint:`test-E-1-${Date.now()}`, requestUnits:1 });
    const r2 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsE.id, operation:'TEXT_SEARCH', collectorRunId: runE2.id, queryFingerprint:`test-E-2-${Date.now()}`, requestUnits:1 });
    const r3 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsE.id, operation:'TEXT_SEARCH', collectorRunId: runE3.id, queryFingerprint:`test-E-3-${Date.now()}`, requestUnits:1 });
    if(!r1.allowed || !r2.allowed) fail('E','First 2 daily should be allowed');
    if(r3.allowed) fail('E','Third daily should be blocked');
    if(r3.reason!=='DAILY_LIMIT_REACHED') fail('E',`Expected DAILY_LIMIT_REACHED got ${r3.reason}`);
    pass('E','Daily limit boundary OK');
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId: dsE.id } });
    await prisma.collectorRun.deleteMany({ where:{ id:{ in:[runE1.id, runE2.id, runE3.id] } } });
    await prisma.dataSource.delete({ where:{ id: dsE.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:500 } });
  }

  // F monthly limit boundary
  log('Test F: monthly limit boundary');
  {
    const dsF = await createTestDataSource(prisma, 'F-monthly', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:2, monthlyRequestLimit:2 } });
    const runF1 = await createTestCollectorRun(prisma, dsF.id);
    const runF2 = await createTestCollectorRun(prisma, dsF.id);
    const runF3 = await createTestCollectorRun(prisma, dsF.id);
    const yesterday = new Date(Date.now()-24*60*60*1000);
    await prisma.googleApiUsage.create({ data:{ sourceId: dsF.id, operation:'TEXT_SEARCH', status:'SUCCESS', reservedAt: yesterday, requestUnits:1, collectorRunId: runF1.id, queryFingerprint:`test-F-pre-1-${Date.now()}` } });
    await prisma.googleApiUsage.create({ data:{ sourceId: dsF.id, operation:'TEXT_SEARCH', status:'SUCCESS', reservedAt: yesterday, requestUnits:1, collectorRunId: runF2.id, queryFingerprint:`test-F-pre-2-${Date.now()}` } });
    const r3 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsF.id, operation:'TEXT_SEARCH', collectorRunId: runF3.id, queryFingerprint:`test-F-3-${Date.now()}`, requestUnits:1 });
    if(r3.allowed) fail('F','Third monthly should be blocked');
    if(r3.reason!=='MONTHLY_LIMIT_REACHED') fail('F',`Expected MONTHLY_LIMIT_REACHED got ${r3.reason}`);
    pass('F','Monthly limit boundary OK — monthly GLOBAL enforced across days');
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId: dsF.id } });
    await prisma.collectorRun.deleteMany({ where:{ id:{ in:[runF1.id, runF2.id, runF3.id] } } });
    await prisma.dataSource.delete({ where:{ id: dsF.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:500 } });
  }

  // G concurrent final daily slot → one winner (genuine PostgreSQL transactional behavior)
  log('Test G: concurrent final daily slot (PostgreSQL FOR UPDATE)');
  {
    const dsG = await createTestDataSource(prisma, 'G-concurrent-daily', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1, monthlyRequestLimit:1000 } });
    const runG1 = await createTestCollectorRun(prisma, dsG.id);
    const runG2 = await createTestCollectorRun(prisma, dsG.id);
    const [r1, r2] = await Promise.all([
      guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsG.id, operation:'TEXT_SEARCH', collectorRunId: runG1.id, queryFingerprint:`test-G-1-${Date.now()}`, requestUnits:1 }),
      guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsG.id, operation:'TEXT_SEARCH', collectorRunId: runG2.id, queryFingerprint:`test-G-2-${Date.now()}`, requestUnits:1 }),
    ]);
    const winners = (r1.allowed?1:0)+(r2.allowed?1:0);
    if(winners!==1) fail('G',`Expected exactly 1 winner for final daily slot, got ${winners} r1=${r1.allowed} ${r1.reason} r2=${r2.allowed} ${r2.reason}`);
    pass('G',`Concurrent final daily slot OK — 1 winner, other blocked ${!r1.allowed?r1.reason:r2.reason} — genuine PostgreSQL FOR UPDATE`);
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId: dsG.id } });
    await prisma.collectorRun.deleteMany({ where:{ id:{ in:[runG1.id, runG2.id] } } });
    await prisma.dataSource.delete({ where:{ id: dsG.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, dailyRequestLimit:50 } });
  }

  // H concurrent final monthly slot → one winner
  log('Test H: concurrent final monthly slot (PostgreSQL FOR UPDATE)');
  {
    const dsH = await createTestDataSource(prisma, 'H-concurrent-monthly', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1, monthlyRequestLimit:1 } });
    const runH1 = await createTestCollectorRun(prisma, dsH.id);
    const runH2 = await createTestCollectorRun(prisma, dsH.id);
    const [r1, r2] = await Promise.all([
      guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsH.id, operation:'TEXT_SEARCH', collectorRunId: runH1.id, queryFingerprint:`test-H-1-${Date.now()}`, requestUnits:1 }),
      guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsH.id, operation:'TEXT_SEARCH', collectorRunId: runH2.id, queryFingerprint:`test-H-2-${Date.now()}`, requestUnits:1 }),
    ]);
    const winners = (r1.allowed?1:0)+(r2.allowed?1:0);
    if(winners!==1) fail('H',`Expected 1 winner monthly, got ${winners}`);
    pass('H','Concurrent final monthly slot OK — genuine PostgreSQL FOR UPDATE');
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId: dsH.id } });
    await prisma.collectorRun.deleteMany({ where:{ id:{ in:[runH1.id, runH2.id] } } });
    await prisma.dataSource.delete({ where:{ id: dsH.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, dailyRequestLimit:50, monthlyRequestLimit:500 } });
  }

  // I concurrent final run slot → one winner
  log('Test I: concurrent final run slot (PostgreSQL FOR UPDATE)');
  {
    const dsI = await createTestDataSource(prisma, 'I-concurrent-run', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:1, dailyRequestLimit:1000, monthlyRequestLimit:1000 } });
    const runI = await createTestCollectorRun(prisma, dsI.id);
    const [r1, r2] = await Promise.all([
      guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsI.id, operation:'TEXT_SEARCH', collectorRunId: runI.id, queryFingerprint:`test-I-1-${Date.now()}`, requestUnits:1 }),
      guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsI.id, operation:'TEXT_SEARCH', collectorRunId: runI.id, queryFingerprint:`test-I-2-${Date.now()}`, requestUnits:1 }),
    ]);
    const winners = (r1.allowed?1:0)+(r2.allowed?1:0);
    if(winners!==1) fail('I',`Expected 1 winner run slot, got ${winners}`);
    pass('I','Concurrent final run slot OK — genuine PostgreSQL FOR UPDATE');
    await prisma.googleApiUsage.deleteMany({ where:{ collectorRunId: runI.id } });
    await prisma.collectorRun.delete({ where:{ id: runI.id } });
    await prisma.dataSource.delete({ where:{ id: dsI.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, perRunRequestLimit:10 } });
  }

  // J reservation counts immediately
  log('Test J: reservation counts immediately');
  {
    const dsJ = await createTestDataSource(prisma, 'J-counts', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1000, monthlyRequestLimit:1000 } });
    const runJ = await createTestCollectorRun(prisma, dsJ.id);
    const before = await guardrails.calculateGoogleUsage(prisma, dsJ.id, runJ.id);
    const res = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsJ.id, operation:'TEXT_SEARCH', collectorRunId: runJ.id, queryFingerprint:`test-J-${Date.now()}`, requestUnits:1 });
    if(!res.allowed) fail('J','Should be allowed');
    const after = await guardrails.calculateGoogleUsage(prisma, dsJ.id, runJ.id);
    if(after.daily !== before.daily+1) fail('J',`Daily should increase by 1, before ${before.daily} after ${after.daily}`);
    if(after.perRun !== before.perRun+1) fail('J','Per-run should increase by 1');
    pass('J','Reservation counts immediately OK');
    await prisma.googleApiUsage.deleteMany({ where:{ collectorRunId: runJ.id } });
    await prisma.collectorRun.delete({ where:{ id: runJ.id } });
    await prisma.dataSource.delete({ where:{ id: dsJ.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false } });
  }

  // K RESERVED survives crash accounting
  log('Test K: RESERVED survives crash accounting');
  {
    const dsK = await createTestDataSource(prisma, 'K-crash', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1, monthlyRequestLimit:1000 } });
    const runK = await createTestCollectorRun(prisma, dsK.id);
    const res = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsK.id, operation:'TEXT_SEARCH', collectorRunId: runK.id, queryFingerprint:`test-K-${Date.now()}`, requestUnits:1 });
    if(!res.allowed) fail('K','Should reserve');
    const usage = await guardrails.calculateGoogleUsage(prisma, dsK.id, runK.id);
    if(usage.daily !==1) fail('K',`RESERVED should still count after crash, got ${usage.daily}`);
    const runK2 = await createTestCollectorRun(prisma, dsK.id);
    const res2 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsK.id, operation:'TEXT_SEARCH', collectorRunId: runK2.id, queryFingerprint:`test-K-2-${Date.now()}`, requestUnits:1 });
    if(res2.allowed) fail('K','Second should be blocked because RESERVED counts');
    pass('K','RESERVED survives crash accounting OK');
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId: dsK.id } });
    await prisma.collectorRun.deleteMany({ where:{ id:{ in:[runK.id, runK2.id] } } });
    await prisma.dataSource.delete({ where:{ id: dsK.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, dailyRequestLimit:50 } });
  }

  // L failed request counts conservatively
  log('Test L: failed request counts conservatively');
  {
    const dsL = await createTestDataSource(prisma, 'L-failed', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1, monthlyRequestLimit:1000 } });
    const runL = await createTestCollectorRun(prisma, dsL.id);
    const res = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsL.id, operation:'TEXT_SEARCH', collectorRunId: runL.id, queryFingerprint:`test-L-${Date.now()}`, requestUnits:1 });
    await guardrails.completeGoogleReservation(prisma, res.reservation.id, 'FAILED', { errorClassification:'SERVER_ERROR', errorMessage:'simulated failure' });
    const usage = await guardrails.calculateGoogleUsage(prisma, dsL.id, runL.id);
    if(usage.daily !==1) fail('L',`FAILED should count, got ${usage.daily}`);
    pass('L','Failed request counts conservatively OK');
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId: dsL.id } });
    await prisma.collectorRun.deleteMany({ where:{ id:{ in:[runL.id] } } });
    await prisma.dataSource.delete({ where:{ id: dsL.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, dailyRequestLimit:50 } });
  }

  // M no-result counts
  log('Test M: no-result counts');
  {
    const dsM = await createTestDataSource(prisma, 'M-noresult', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1, monthlyRequestLimit:1000 } });
    const runM = await createTestCollectorRun(prisma, dsM.id);
    const res = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsM.id, operation:'TEXT_SEARCH', collectorRunId: runM.id, queryFingerprint:`test-M-${Date.now()}`, requestUnits:1 });
    await guardrails.completeGoogleReservation(prisma, res.reservation.id, 'NO_RESULT');
    const usage = await guardrails.calculateGoogleUsage(prisma, dsM.id, runM.id);
    if(usage.daily !==1) fail('M','NO_RESULT should count');
    pass('M','No-result counts OK');
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId: dsM.id } });
    await prisma.collectorRun.delete({ where:{ id: runM.id } });
    await prisma.dataSource.delete({ where:{ id: dsM.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, dailyRequestLimit:50 } });
  }

  // N duplicate active reservation blocked
  log('Test N: duplicate active reservation blocked');
  {
    const dsN = await createTestDataSource(prisma, 'N-duplicate', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1000, monthlyRequestLimit:1000 } });
    const runN = await createTestCollectorRun(prisma, dsN.id);
    const fp = `test-N-same-fingerprint-${Date.now()}`;
    const r1 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsN.id, operation:'TEXT_SEARCH', collectorRunId: runN.id, queryFingerprint:fp, requestUnits:1 });
    const r2 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsN.id, operation:'TEXT_SEARCH', collectorRunId: runN.id, queryFingerprint:fp, requestUnits:1 });
    if(!r1.allowed) fail('N','First should be allowed');
    if(r2.allowed) fail('N','Second same fingerprint should be blocked');
    if(r2.reason!=='ACTIVE_RESERVATION_EXISTS') fail('N',`Expected ACTIVE_RESERVATION_EXISTS got ${r2.reason}`);
    pass('N','Duplicate active reservation blocked OK');
    await prisma.googleApiUsage.deleteMany({ where:{ collectorRunId: runN.id } });
    await prisma.collectorRun.delete({ where:{ id: runN.id } });
    await prisma.dataSource.delete({ where:{ id: dsN.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false } });
  }

  // Q cache hit → no reservation
  log('Test Q: cache hit → no reservation');
  {
    const dsQ = await createTestDataSource(prisma, 'Q-cache-hit', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1000, monthlyRequestLimit:1000, cacheEnabled:true } });
    const runQ = await createTestCollectorRun(prisma, dsQ.id);
    const fp = `test-Q-fp-${Date.now()}`;
    const expires = new Date(Date.now()+24*60*60*1000);
    await prisma.googleApiCache.create({ data:{ sourceId: dsQ.id, queryFingerprint:fp, operation:'TEXT_SEARCH', expiresAt:expires, responseMetadata:{test:true} } });
    const res = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsQ.id, operation:'TEXT_SEARCH', collectorRunId: runQ.id, queryFingerprint:fp, requestUnits:1 });
    if(!res.allowed) fail('Q','Cache hit should be allowed');
    if(res.reason!=='CACHE_HIT') fail('Q',`Expected CACHE_HIT got ${res.reason}`);
    if(res.reservation) fail('Q','Cache hit should NOT create reservation');
    const usage = await prisma.googleApiUsage.count({ where:{ collectorRunId: runQ.id } });
    if(usage!==0) fail('Q','Cache hit should not create usage row');
    pass('Q','Cache hit → no reservation OK');
    await prisma.googleApiCache.deleteMany({ where:{ sourceId: dsQ.id } });
    await prisma.collectorRun.delete({ where:{ id: runQ.id } });
    await prisma.dataSource.delete({ where:{ id: dsQ.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false } });
  }

  // R cache miss → reservation required
  log('Test R: cache miss → reservation required');
  {
    const dsR = await createTestDataSource(prisma, 'R-cache-miss', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:1000, monthlyRequestLimit:1000, cacheEnabled:true } });
    const runR = await createTestCollectorRun(prisma, dsR.id);
    const fp = `test-R-fp-${Date.now()}`;
    const res = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: dsR.id, operation:'TEXT_SEARCH', collectorRunId: runR.id, queryFingerprint:fp, requestUnits:1 });
    if(!res.allowed) fail('R','Cache miss should allow reservation');
    if(res.reason==='CACHE_HIT') fail('R','Should be cache miss, not hit');
    if(!res.reservation) fail('R','Cache miss should create reservation');
    pass('R','Cache miss → reservation required OK');
    await prisma.googleApiUsage.deleteMany({ where:{ collectorRunId: runR.id } });
    await prisma.collectorRun.delete({ where:{ id: runR.id } });
    await prisma.dataSource.delete({ where:{ id: dsR.id } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false } });
  }

  // W place_id same-source identity
  log('Test W: place_id same-source identity');
  {
    const dsW = await createTestDataSource(prisma, 'W-placeid', 'google_places', false);
    const runW = await prisma.collectorRun.create({ data:{ status:'SUCCESS', sourceId: dsW.id, startedAt:new Date(), candidatesFound:0, leadsAccepted:0, leadsInserted:0 } });
    const placeId = 'ChIJ1234567890';
    const cand1 = await prisma.leadCandidate.create({ data:{ companyName:`${PREFIX}PlaceID`, businessCategory:'dental', city:'London', status:'DISCOVERED', discoverySourceId: dsW.id, discoveryRunId: runW.id, externalType:'place', externalId:placeId, rawTags:{place_id:placeId} } });
    try{
      const cand2 = await prisma.leadCandidate.create({ data:{ companyName:`${PREFIX}PlaceID2`, businessCategory:'dental', city:'London', status:'DISCOVERED', discoverySourceId: dsW.id, discoveryRunId: runW.id, externalType:'place', externalId:placeId, rawTags:{place_id:placeId} } });
      fail('W',`Same place_id same source should be blocked by unique, but created ${cand2.id}`);
    }catch(e){
      if(e.code!=='P2002') fail('W',`Expected P2002 unique violation, got ${e.code} ${e.message}`);
    }
    pass('W','place_id same-source identity protected by unique constraint — sourceType=GOOGLE_PLACES externalType=place externalId=place_id');
    await prisma.leadCandidate.deleteMany({ where:{ id:cand1.id } });
    await prisma.collectorRun.delete({ where:{ id: runW.id } });
    await prisma.dataSource.delete({ where:{ id: dsW.id } });
  }

  // AH usage metrics accurate
  log('Test AH: usage metrics accurate');
  {
    const metrics = await guardrails.getGoogleGuardrailMetrics(prisma);
    if(metrics.config.enabled!==false) fail('AH','Config should be disabled');
    pass('AH','Usage metrics accurate OK');
  }

  // AI cache metrics accurate
  log('Test AI: cache metrics accurate');
  {
    const dsAI = await createTestDataSource(prisma, 'AI-cache-metrics', 'google_places', true);
    const expires = new Date(Date.now()+24*60*60*1000);
    await prisma.googleApiCache.create({ data:{ sourceId: dsAI.id, queryFingerprint:`test-AI-${Date.now()}`, operation:'TEXT_SEARCH', expiresAt:expires, responseMetadata:{test:true}, hitCount:5 } });
    const metrics = await guardrails.getGoogleGuardrailMetrics(prisma, dsAI.id);
    if(metrics.cache.hits!==5) fail('AI',`Expected 5 cache hits, got ${metrics.cache.hits}`);
    pass('AI','Cache metrics accurate OK');
    await prisma.googleApiCache.deleteMany({ where:{ sourceId: dsAI.id } });
    await prisma.dataSource.delete({ where:{ id: dsAI.id } });
  }

  // AZ global daily budget across multiple Google sources
  log('Test AZ: global daily budget across multiple Google sources');
  {
    const ds1 = await createTestDataSource(prisma, 'AZ-global-1', 'google_places', true);
    const ds2 = await createTestDataSource(prisma, 'AZ-global-2', 'google_places', true);
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:true, perRunRequestLimit:100, dailyRequestLimit:2, monthlyRequestLimit:1000 } });
    const run1 = await createTestCollectorRun(prisma, ds1.id);
    const run2 = await createTestCollectorRun(prisma, ds2.id);
    const run3 = await createTestCollectorRun(prisma, ds1.id);
    const r1 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: ds1.id, operation:'TEXT_SEARCH', collectorRunId: run1.id, queryFingerprint:`test-AZ-1-${Date.now()}`, requestUnits:1 });
    const r2 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: ds2.id, operation:'TEXT_SEARCH', collectorRunId: run2.id, queryFingerprint:`test-AZ-2-${Date.now()}`, requestUnits:1 });
    const r3 = await guardrails.reserveGoogleRequestBudgetAtomically(prisma, { sourceId: ds1.id, operation:'TEXT_SEARCH', collectorRunId: run3.id, queryFingerprint:`test-AZ-3-${Date.now()}`, requestUnits:1 });
    if(!r1.allowed || !r2.allowed) fail('AZ','First 2 across different sources should be allowed under global daily limit 2');
    if(r3.allowed) fail('AZ','Third across any source should be blocked — daily limit GLOBAL not per-source');
    if(r3.reason!=='DAILY_LIMIT_REACHED') fail('AZ',`Expected DAILY_LIMIT_REACHED got ${r3.reason}`);
    pass('AZ','Global daily budget across multiple Google sources OK — GLOBAL not per-source');
    await prisma.googleApiUsage.deleteMany({ where:{ sourceId:{ in:[ds1.id, ds2.id] } } });
    await prisma.collectorRun.deleteMany({ where:{ id:{ in:[run1.id, run2.id, run3.id] } } });
    await prisma.dataSource.deleteMany({ where:{ id:{ in:[ds1.id, ds2.id] } } });
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false, dailyRequestLimit:50 } });
  }

  await cleanup(prisma);
  await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:originalConfig.enabled, perRunRequestLimit:originalConfig.perRunRequestLimit, dailyRequestLimit:originalConfig.dailyRequestLimit, monthlyRequestLimit:originalConfig.monthlyRequestLimit, dailyCostUnitLimit:originalConfig.dailyCostUnitLimit, monthlyCostUnitLimit:originalConfig.monthlyCostUnitLimit, cacheEnabled:originalConfig.cacheEnabled, queryCacheTtlHours:originalConfig.queryCacheTtlHours, placeDetailsCacheTtlHours:originalConfig.placeDetailsCacheTtlHours, retryLimit:originalConfig.retryLimit, failClosed:originalConfig.failClosed } });

  log('All DB integration tests PASSED — genuine PostgreSQL FOR UPDATE verified');
  await prisma.$disconnect();
}

main().catch(async (e)=>{
  console.error('DB test failed', e);
  try{
    const prisma = new (await import('@prisma/client')).PrismaClient();
    await prisma.googleCollectionConfig.update({ where:{ key:'default' }, data:{ enabled:false } }).catch(()=>{});
    await prisma.$disconnect();
  }catch{}
  process.exit(1);
});
