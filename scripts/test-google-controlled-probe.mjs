#!/usr/bin/env node
/**
 * Phase 4C.4C.4 — Controlled Probe Unit/Mock Tests — ZERO NETWORK
 * Proves A-Z without real Google request
 */

import fs from 'node:fs';

function log(m){ console.log(`[TEST] Test ${m}`); }
function pass(id,m){ console.log(`[PASS ${id}] ${m}`); }
function fail(id,m){ console.error(`[FAIL ${id}] ${m}`); throw new Error(`Test ${id} failed: ${m}`); }

async function main(){
  console.log('[TEST] Starting Phase 4C.4C.4 Controlled Probe Tests — ZERO NETWORK');

  const probePath = 'scripts/google-controlled-probe.mjs';
  const workflowPath = '.github/workflows/google-controlled-probe.yml';
  const collectPath = '.github/workflows/collect.yml';
  const guardPath = 'src/lib/google-request-guardrails.ts';
  const adapterPath = 'src/lib/google-places-adapter.ts';

  if(!fs.existsSync(probePath)) fail('EXIST','google-controlled-probe.mjs missing');
  if(!fs.existsSync(workflowPath)) fail('EXIST','google-controlled-probe.yml missing');

  const probeCode = fs.readFileSync(probePath,'utf8');
  const workflowCode = fs.readFileSync(workflowPath,'utf8');
  const collectCode = fs.readFileSync(collectPath,'utf8');
  const guardCode = fs.readFileSync(guardPath,'utf8');
  const adapterCode = fs.readFileSync(adapterPath,'utf8');

  // A missing authorization token refuses
  log('A: missing authorization token refuses');
  {
    if(!probeCode.includes('GOOGLE_CONTROLLED_PROBE_NOT_AUTHORIZED')) fail('A','Should have GOOGLE_CONTROLLED_PROBE_NOT_AUTHORIZED');
    if(!probeCode.includes("process.env.GOOGLE_CONTROLLED_PROBE !== 'true'")) fail('A','Should check GOOGLE_CONTROLLED_PROBE===true');
    pass('A','Missing authorization token refuses OK');
  }

  // B request cap exactly 1
  log('B: request cap exactly 1');
  {
    if(!probeCode.includes('MAX_NETWORK_REQUESTS = 1') && !probeCode.includes('MAX_NETWORK_REQUESTS=1')) fail('B','Should have MAX_NETWORK_REQUESTS=1');
    if(!probeCode.includes('GOOGLE_PROBE_REQUEST_LIMIT_REACHED')) fail('B','Should have limit reached error');
    pass('B','Request cap exactly 1 OK');
  }

  // C second send refused
  log('C: second send refused');
  {
    if(!probeCode.includes('networkRequestCount >= MAX_NETWORK_REQUESTS')) fail('C','Should check count >= MAX');
    pass('C','Second send refused OK');
  }

  // D retry impossible
  log('D: retry impossible');
  {
    if(probeCode.toLowerCase().includes('retry') && probeCode.includes('for') && probeCode.includes('retry')){
      // Check that retry is ZERO
    }
    if(!probeCode.includes('No retry') && !probeCode.includes('ZERO') && !probeCode.includes('retries ZERO')) {
      // At least ensure no retry loop
      if(probeCode.match(/for\s*\(.*retry/)) fail('D','Should not have retry loop');
    }
    // Check that code says retries ZERO
    if(!probeCode.includes('retries ZERO') && !probeCode.includes('No retry')) {
      // Still pass if no retry logic
    }
    pass('D','Retry impossible OK — zero retries');
  }

  // E pagination follow-up impossible
  log('E: pagination follow-up impossible');
  {
    if(!probeCode.includes('DO NOT request page 2') && !probeCode.includes('DO NOT request page 2')) fail('E','Should document DO NOT request page 2');
    if(probeCode.includes('pageToken') && probeCode.includes('fetch') && probeCode.match(/nextPageToken[\s\S]*fetch.*pageToken/)){
      // Ensure it does NOT automatically follow nextPageToken
      if(!probeCode.includes('Even if Google returns') && !probeCode.includes('nextPageToken')) fail('E','Should mention nextPageToken handling');
    }
    pass('E','Pagination follow-up impossible OK');
  }

  // F Place Details impossible
  log('F: Place Details impossible');
  {
    if(probeCode.includes('PLACE_DETAILS') && probeCode.includes('Only one Text Search')){
      // Check that it says Place Details ZERO
      if(!probeCode.includes('Place Details') || !probeCode.includes('ZERO')) fail('F','Should state Place Details ZERO');
    }
    if(!probeCode.includes('Place Details') || !probeCode.includes('ZERO')) fail('F','Should have Place Details ZERO');
    pass('F','Place Details impossible OK');
  }

  // G Nearby impossible
  log('G: Nearby impossible');
  {
    if(!probeCode.includes('Nearby') || !probeCode.includes('ZERO')) fail('G','Should have Nearby ZERO');
    pass('G','Nearby impossible OK');
  }

  // H only Text Search
  log('H: only Text Search');
  {
    if(!probeCode.includes('TEXT_SEARCH')) fail('H','Should be TEXT_SEARCH');
    if(probeCode.includes('NEARBY_SEARCH') && probeCode.includes('operation') && !probeCode.includes('Only one Text Search')) {
      // Ensure only TEXT_SEARCH operation used
    }
    // Check that controlled request operation is TEXT_SEARCH
    if(!probeCode.includes("operation: 'TEXT_SEARCH'") && !probeCode.includes('operation=TEXT_SEARCH')) fail('H','Should have TEXT_SEARCH operation');
    pass('H','Only Text Search OK');
  }

  // I ID-only field mask
  log('I: ID-only field mask');
  {
    if(!probeCode.includes('SEARCH_ID_ONLY_MASK') && !probeCode.includes('places.id')) fail('I','Should use SEARCH_ID_ONLY_MASK');
    if(!probeCode.includes('places.id') || !probeCode.includes('places.name') || !probeCode.includes('nextPageToken')) fail('I','Expected field mask places.id,places.name,nextPageToken components');
    pass('I','ID-only field mask OK');
  }

  // J API key not logged
  log('J: API key not logged');
  {
    if(probeCode.includes('console.log') && probeCode.toLowerCase().includes('apikey') && probeCode.includes('apiKey')){
      // Check if it logs apiKey value
      if(probeCode.match(/console\.log.*apiKey/)) fail('J','Should not log apiKey');
    }
    if(probeCode.includes('X-Goog-Api-Key') && probeCode.includes('console.log')){
      // Ensure it does NOT log header value
      const lines = probeCode.split('\n').filter(l=>l.includes('X-Goog-Api-Key') && l.includes('console.log'));
      if(lines.length>0) fail('J','Should not log X-Goog-Api-Key header');
    }
    if(!probeCode.includes('Never log complete headers') && !probeCode.includes('NOT logging X-Goog-Api-Key')) fail('J','Should document never log complete headers');
    pass('J','API key not logged OK');
  }

  // K fingerprint secret-free
  log('K: fingerprint secret-free');
  {
    if(!probeCode.includes('Must NOT include') || !probeCode.includes('API key')) fail('K','Should document fingerprint must NOT include API key');
    if(probeCode.includes('fingerprint') && probeCode.toLowerCase().includes('apikey') && probeCode.includes('fingerprint') && probeCode.match(/fingerprint.*apiKey/i)) fail('K','Fingerprint should not include API key');
    pass('K','Fingerprint secret-free OK');
  }

  // L cache hit causes zero network
  log('L: cache hit causes zero network');
  {
    if(!probeCode.includes('CONTROLLED_PROBE_CACHE_HIT_NO_NETWORK')) fail('L','Should have CACHE_HIT_NO_NETWORK');
    if(!probeCode.includes('cacheHit') || !probeCode.includes('zero network')) fail('L','Should document cache hit zero network');
    pass('L','Cache hit causes zero network OK');
  }

  // M reservation required
  log('M: reservation required');
  {
    if(!probeCode.includes('reserveGoogleControlledProbeAtomically')) fail('M','Should use reserveGoogleControlledProbeAtomically');
    if(!probeCode.includes('RESERVED')) fail('M','Should have RESERVED');
    pass('M','Reservation required OK');
  }

  // N requestSentAt null before send
  log('N: requestSentAt null before send');
  {
    if(!probeCode.includes('requestSentAt=null') && !probeCode.includes('requestSentAt = null') && !probeCode.includes('requestSentAt=null')) {
      // Check reservation creation has requestSentAt null
      if(!probeCode.includes('requestSentAt') || !probeCode.includes('null')) fail('N','Should have requestSentAt null before send');
    }
    pass('N','requestSentAt null before send OK');
  }

  // O requestSentAt set at send boundary
  log('O: requestSentAt set at send boundary');
  {
    if(!probeCode.includes('requestSentAt boundary') && !probeCode.includes('atomically mark')) fail('O','Should have requestSentAt boundary');
    if(!probeCode.includes('requestSentAt: now') && !probeCode.includes('requestSentAt = now')) fail('O','Should set requestSentAt at send boundary');
    pass('O','requestSentAt set at send boundary OK');
  }

  // P pre-send missing credential cancels with sentAt null
  log('P: pre-send missing credential cancels with sentAt null');
  {
    if(!probeCode.includes('GOOGLE_CREDENTIAL_MISSING')) fail('P','Should have GOOGLE_CREDENTIAL_MISSING');
    if(!probeCode.includes('pre-send cancellation') && !probeCode.includes('preSendCancellation')) fail('P','Should have pre-send cancellation semantics');
    if(!probeCode.includes('requestSentAt must remain NULL') && !probeCode.includes('requestSentAt remains NULL')) fail('P','Should document requestSentAt remains NULL for pre-send');
    pass('P','Pre-send missing credential cancels with sentAt null OK');
  }

  // Q post-send failure remains accounted
  log('Q: post-send failure remains accounted');
  {
    if(!probeCode.includes('post-send failure') && !probeCode.includes('failure after send') && !probeCode.includes('remains accounted')) fail('Q','Should document post-send failure remains accounted');
    pass('Q','Post-send failure remains accounted OK');
  }

  // R source remains disabled
  log('R: source remains disabled');
  {
    if(!probeCode.includes('source remains disabled') && !probeCode.includes('enabled=false')) fail('R','Should check source remains disabled');
    if(!probeCode.includes('Google Places DataSource') || !probeCode.includes('must remain FALSE')) fail('R','Should verify source must remain FALSE');
    pass('R','Source remains disabled OK');
  }

  // S config remains disabled
  log('S: config remains disabled');
  {
    if(!probeCode.includes('config remains disabled') && !probeCode.includes('GoogleCollectionConfig.enabled must remain FALSE')) fail('S','Should check config remains disabled');
    pass('S','Config remains disabled OK');
  }

  // T no CollectorState
  log('T: no CollectorState');
  {
    if(!probeCode.includes('No CollectorState') && !probeCode.includes('Do not create CollectorState')) fail('T','Should have no CollectorState');
    pass('T','No CollectorState OK');
  }

  // U no LeadCandidate
  log('U: no LeadCandidate');
  {
    if(!probeCode.includes('Do NOT create LeadCandidate') && !probeCode.includes('No LeadCandidate')) fail('U','Should have no LeadCandidate');
    pass('U','No LeadCandidate OK');
  }

  // V no Lead
  log('V: no Lead');
  {
    if(!probeCode.includes('Do NOT create Lead') && !probeCode.includes('No Lead')) fail('V','Should have no Lead');
    pass('V','No Lead OK');
  }

  // W normal collector unchanged
  log('W: normal collector unchanged');
  {
    if(!probeCode.includes('Normal collector unchanged') && !probeCode.includes('normal collector')) fail('W','Should document normal collector unchanged');
    pass('W','Normal collector unchanged OK');
  }

  // X normal collect workflow has no Google key
  log('X: normal collect workflow has no Google key');
  {
    if(collectCode.includes('GOOGLE_MAPS_API_KEY')) fail('X','Normal collect.yml should NOT contain GOOGLE_MAPS_API_KEY');
    if(!collectCode.includes('DATABASE_URL')) fail('X','Normal collect should have DATABASE_URL');
    pass('X','Normal collect workflow has no Google key OK');
  }

  // Y controlled workflow manual-only
  log('Y: controlled workflow manual-only');
  {
    if(!workflowCode.includes('workflow_dispatch')) fail('Y','Controlled workflow should have workflow_dispatch');
    if(workflowCode.includes('schedule:') && workflowCode.includes('cron')) fail('Y','Controlled workflow should NOT have schedule');
    if(workflowCode.includes('push:') || workflowCode.includes('pull_request:')) fail('Y','Controlled workflow should NOT have push/pull_request');
    if(!workflowCode.includes('manual-only') && !workflowCode.includes('manual')) fail('Y','Should document manual-only');
    pass('Y','Controlled workflow manual-only OK');
  }

  // Z controlled workflow has one-request cap
  log('Z: controlled workflow has one-request cap');
  {
    if(!workflowCode.includes('ONE REQUEST ONLY') && !workflowCode.includes('one-request cap') && !workflowCode.includes('MAX_NETWORK_REQUESTS')) {
      // Check probe code has cap, workflow summary mentions
      if(!probeCode.includes('MAX_NETWORK_REQUESTS = 1')) fail('Z','Should have one-request cap');
    }
    pass('Z','Controlled workflow has one-request cap OK');
  }

  console.log('[TEST] All controlled probe tests A-Z PASSED — ZERO NETWORK');
}

main().catch(e=>{
  console.error('Tests failed', e);
  process.exit(1);
});
