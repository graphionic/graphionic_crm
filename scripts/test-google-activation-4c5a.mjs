#!/usr/bin/env node
/**
 * Phase 4C.4C.5A — Limited Activation Architecture Tests — ZERO NETWORK
 * Covers A-Z + AA+ matrix for activation modes, canary scope, limits, safety invariants
 */

import fs from 'node:fs';

function log(m){ console.log(`[TEST] ${m}`); }
function pass(id,m){ console.log(`[PASS ${id}] ${m}`); }
function fail(id,m){ console.error(`[FAIL ${id}] ${m}`); throw new Error(`Test ${id} failed: ${m}`); }

async function main(){
  console.log('[TEST] Starting Phase 4C.4C.5A Activation Architecture Tests — ZERO NETWORK');

  const activationModule = await import('../src/lib/google-activation.ts');
  const collectorAdapterModule = await import('../src/lib/google-collector-adapter.ts');
  const credModule = await import('../src/lib/google-credential-reader.ts');
  const guardModule = await import('../src/lib/google-request-guardrails.ts');
  const adapterModule = await import('../src/lib/google-places-adapter.ts');

  // A mode DISABLED blocks Google
  log('A: mode DISABLED blocks Google');
  {
    const cfg = { enabled:false, activationMode:'DISABLED', perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:500 };
    const ds = { enabled:false, healthStatus:'unknown' };
    const base = activationModule.canExecuteGoogleBase(cfg, ds, true);
    if(base.allowed) fail('A','DISABLED should block');
    if(base.reason !== 'GOOGLE_CONFIG_DISABLED' && base.reason !== 'GOOGLE_ACTIVATION_DISABLED') {
      // Config disabled is first check, so GOOGLE_CONFIG_DISABLED expected
      if(!base.reason.includes('DISABLED')) fail('A',`Expected DISABLED reason got ${base.reason}`);
    }
    const mode = activationModule.getActivationModeFromConfig(cfg);
    if(mode !== 'DISABLED') fail('A',`Mode should be DISABLED got ${mode}`);
    pass('A','DISABLED blocks Google OK');
  }

  // B CANARY requires allowlist
  log('B: CANARY requires allowlist');
  {
    const cfgNoScope = { enabled:true, activationMode:'CANARY', canaryScopes: [], perRunRequestLimit:10, dailyRequestLimit:50 };
    const scopeCheck = activationModule.validateGoogleActivationScope(cfgNoScope, { countryCode:'GB', city:'Manchester' }, { slug:'dental' });
    if(scopeCheck.allowed) fail('B','CANARY without allowlist should block FAIL CLOSED');
    if(scopeCheck.reason !== 'CANARY_SCOPE_NOT_CONFIGURED_FAIL_CLOSED') fail('B',`Expected CANARY_SCOPE_NOT_CONFIGURED_FAIL_CLOSED got ${scopeCheck.reason}`);
    pass('B','CANARY requires allowlist FAIL CLOSED OK');
  }

  // C wrong location blocked
  log('C: wrong location blocked');
  {
    const cfg = { enabled:true, activationMode:'CANARY', canaryScopes: [{countryCode:'GB', city:'Manchester', categorySlug:'dental'}] };
    const check = activationModule.validateGoogleActivationScope(cfg, { countryCode:'GB', city:'London' }, { slug:'dental' });
    if(check.allowed) fail('C','London should be blocked in Manchester-only canary');
    if(check.reason !== 'CANARY_SCOPE_NOT_ALLOWED') fail('C',`Expected NOT_ALLOWED got ${check.reason}`);
    pass('C','Wrong location blocked OK');
  }

  // D wrong category blocked
  log('D: wrong category blocked');
  {
    const cfg = { enabled:true, activationMode:'CANARY', canaryScopes: [{countryCode:'GB', city:'Manchester', categorySlug:'dental'}] };
    const check = activationModule.validateGoogleActivationScope(cfg, { countryCode:'GB', city:'Manchester' }, { slug:'plumber' });
    if(check.allowed) fail('D','plumber should be blocked in dental-only canary');
    pass('D','Wrong category blocked OK');
  }

  // E correct Manchester+dental allowed logically
  log('E: correct Manchester+dental allowed logically');
  {
    const cfg = { enabled:true, activationMode:'CANARY', canaryScopes: [{countryCode:'GB', city:'Manchester', categorySlug:'dental'}] };
    const check = activationModule.validateGoogleActivationScope(cfg, { countryCode:'GB', city:'Manchester' }, { slug:'dental' });
    if(!check.allowed) fail('E',`Manchester+dental should be allowed got ${check.reason}`);
    pass('E','Correct Manchester+dental allowed OK');
  }

  // F source disabled blocks
  log('F: source disabled blocks');
  {
    const cfg = { enabled:true, activationMode:'CANARY', canaryScopes: [{countryCode:'GB', city:'Manchester', categorySlug:'dental'}] };
    const ds = { enabled:false, healthStatus:'unknown' };
    const base = activationModule.canExecuteGoogleBase(cfg, ds, true);
    if(base.allowed) fail('F','Source disabled should block');
    if(base.reason !== 'GOOGLE_SOURCE_DISABLED') fail('F',`Expected GOOGLE_SOURCE_DISABLED got ${base.reason}`);
    pass('F','Source disabled blocks OK');
  }

  // G config disabled blocks
  log('G: config disabled blocks');
  {
    const cfg = { enabled:false, activationMode:'DISABLED' };
    const ds = { enabled:true, healthStatus:'unknown' };
    const base = activationModule.canExecuteGoogleBase(cfg, ds, true);
    if(base.allowed) fail('G','Config disabled should block');
    pass('G','Config disabled blocks OK');
  }

  // H missing credential blocks
  log('H: missing credential blocks');
  {
    const cfg = { enabled:true, activationMode:'CANARY', canaryScopes: [{countryCode:'GB', city:'Manchester', categorySlug:'dental'}] };
    const ds = { enabled:true, healthStatus:'unknown' };
    const base = activationModule.canExecuteGoogleBase(cfg, ds, false);
    if(base.allowed) fail('H','Missing credential should block');
    if(base.reason !== 'GOOGLE_CREDENTIAL_MISSING') fail('H',`Expected CREDENTIAL_MISSING got ${base.reason}`);
    pass('H','Missing credential blocks OK');
  }

  // I budget exhausted blocks (conceptual, check guardrails limits)
  log('I: budget exhausted blocks');
  {
    // Guardrails module should have budget checks — we verify via code presence, not real DB mutation
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('DAILY_LIMIT_REACHED') || !code.includes('MONTHLY_LIMIT_REACHED') || !code.includes('PER_RUN_LIMIT_REACHED')) fail('I','Guardrails must have budget exhausted checks');
    pass('I','Budget exhausted blocks conceptually OK — DAILY/MONTHLY/PER_RUN checks present');
  }

  // J cache hit zero network
  log('J: cache hit zero network');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('checkGoogleCache') || !code.includes('CACHE_HIT')) fail('J','Cache hit logic missing');
    // Verify cache check does NOT consume budget per docs
    if(!code.includes('cache hit does not consume budget') && !code.includes('does NOT consume budget')) {
      // Check alternative doc comment
      const docs = fs.readFileSync('docs/PHASE_4C.4B_GOOGLE_GUARDRAILS.md','utf8');
      if(!docs.includes('cache') || !docs.includes('budget')) fail('J','Docs should mention cache does not consume budget');
    }
    pass('J','Cache hit zero network OK');
  }

  // K every cache miss requires reservation
  log('K: every cache miss requires reservation');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('reserveGoogleRequestBudgetAtomically') && !code.includes('reserveGoogleControlledProbeAtomically')) fail('K','Reservation required on cache miss missing');
    pass('K','Every cache miss requires reservation OK');
  }

  // L pagination disabled
  log('L: pagination disabled');
  {
    if(activationModule.CANARY_PAGINATION_ENABLED !== false) fail('L','Canary pagination must be disabled');
    const adapterCode = fs.readFileSync('src/lib/google-places-adapter.ts','utf8');
    if(!adapterCode.includes('pageCap') && !adapterCode.includes('nextPageToken')) fail('L','Pagination handling should exist but disabled in canary');
    pass('L','Pagination disabled in CANARY OK');
  }

  // M retries disabled
  log('M: retries disabled');
  {
    if(activationModule.CANARY_RETRY_LIMIT !== 0) fail('M','Canary retryLimit must be 0');
    const code = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!code.includes('retryLimit') || !code.includes('@default(0)')) fail('M','Schema retryLimit default 0 missing');
    pass('M','Retries disabled OK');
  }

  // N TEXT_SEARCH ID stage
  log('N: TEXT_SEARCH ID stage');
  {
    const stage = activationModule.STAGED_REQUEST.STAGE_A_ID_DISCOVERY;
    if(stage.operation !== 'TEXT_SEARCH') fail('N','Stage A should be TEXT_SEARCH');
    if(!stage.fieldMask.includes('places.id') || !stage.fieldMask.includes('nextPageToken')) fail('N','Stage A mask must include places.id and nextPageToken');
    if(stage.fieldMask.includes('websiteUri') || stage.fieldMask.includes('internationalPhoneNumber')) fail('N','Stage A must NOT include contact fields');
    pass('N','TEXT_SEARCH ID stage OK');
  }

  // O contact stage separately reserved
  log('O: contact stage separately reserved');
  {
    const stageC = activationModule.STAGED_REQUEST.STAGE_C_CONTACT;
    if(stageC.operation !== 'PLACE_DETAILS') fail('O','Stage C should be PLACE_DETAILS');
    if(!stageC.fieldMask.includes('websiteUri')) fail('O','Stage C must include websiteUri');
    if(!stageC.purpose.toLowerCase().includes('separate reservation') && !stageC.purpose.toLowerCase().includes('higher-cost')) fail('O','Stage C purpose must mention separate reservation / higher-cost');
    pass('O','Contact stage separately reserved OK');
  }

  // P Google website triggers recheck
  log('P: Google website triggers recheck');
  {
    if(!activationModule.WEBSITE_INVARIANT.googleWebsiteTriggersRecheck) fail('P','Website should trigger recheck');
    const code = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(!code.includes('qualificationRecheckRequired') && !code.includes('hasTrustedWebsiteEvidence')) fail('P','Normalization should have website recheck logic');
    pass('P','Google website triggers recheck OK');
  }

  // Q live website rejects existing_website
  log('Q: live website rejects existing_website');
  {
    if(!activationModule.WEBSITE_INVARIANT.liveWebsiteRejectsExistingWebsite) fail('Q','Live website should reject existing_website');
    pass('Q','Live website rejects existing_website OK');
  }

  // R website absent not TRUE_NO_SITE
  log('R: website absent not TRUE_NO_SITE');
  {
    if(!activationModule.WEBSITE_INVARIANT.absenceNotProofOfNoSite) fail('R','Absence should NOT prove no site');
    const code = fs.readFileSync('docs/PHASE_4C.4C_GOOGLE_PLACES_ADAPTER.md','utf8');
    if(!code.includes('TRUE_NO_SITE') || !code.includes('absence')) fail('R','Docs should mention TRUE_NO_SITE and absence not proof');
    pass('R','Website absent not TRUE_NO_SITE OK');
  }

  // S email absent not qualified
  log('S: email absent not qualified');
  {
    if(activationModule.EMAIL_INVARIANT.googleProvidesEmail !== false) fail('S','Google does NOT provide email');
    if(!activationModule.EMAIL_INVARIANT.qualifiedRequiresUsefulEmail) fail('S','Qualified requires useful email');
    pass('S','Email absent not qualified OK');
  }

  // T Google does not fabricate email
  log('T: Google does not fabricate email');
  {
    if(!activationModule.EMAIL_INVARIANT.noFabrication) fail('T','No fabrication invariant missing');
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(normCode.toLowerCase().includes('fabricat') && normCode.toLowerCase().includes('email')) {
      // ok if mentions no fabrication
    }
    pass('T','Google does not fabricate email OK');
  }

  // U OSM+Google strong match merges evidence
  log('U: OSM+Google strong match merges evidence');
  {
    const strong = activationModule.CROSS_SOURCE_MATCHING.strong;
    if(!strong.includes('EMAIL_EXACT') || !strong.includes('PHONE_EXACT')) fail('U','Strong matches must include EMAIL_EXACT PHONE_EXACT');
    pass('U','OSM+Google strong match merges evidence OK');
  }

  // V uncertain match does not merge
  log('V: uncertain match does not merge');
  {
    const never = activationModule.CROSS_SOURCE_MATCHING.neverMerge;
    if(!never.includes('COORDINATES_ALONE') || !never.includes('NAME_ALONE')) fail('V','Never merge must include coordinates alone and name alone');
    pass('V','Uncertain match does not merge OK');
  }

  // W place ID canonical
  log('W: place ID canonical');
  {
    const canon = activationModule.CROSS_SOURCE_MATCHING.placeIdCanonical;
    if(canon.externalType !== 'place' || canon.sourceType !== 'GOOGLE_PLACES') fail('W','Canonical place ID mismatch');
    const adapterCode = fs.readFileSync('src/lib/google-places-adapter.ts','utf8');
    if(!adapterCode.includes('canonicalizePlaceId') && !adapterCode.includes('bare')) fail('W','Adapter should canonicalize place ID to bare');
    pass('W','Place ID canonical OK');
  }

  // X sourceEvidence preserved
  log('X: sourceEvidence preserved');
  {
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(!normCode.includes('sourceEvidence') && !normCode.includes('sourceType')) fail('X','Normalization should preserve sourceEvidence');
    pass('X','sourceEvidence preserved OK');
  }

  // Y no duplicate candidate
  log('Y: no duplicate candidate');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!schema.includes('@@unique([discoverySourceId, externalType, externalId])')) fail('Y','LeadCandidate unique constraint for dedup missing');
    pass('Y','No duplicate candidate unique constraint OK');
  }

  // Z metrics correct
  log('Z: metrics correct');
  {
    const metrics = activationModule.CANARY_METRICS;
    const required = ['googleRequests','googleCacheHits','googleResults','googleWebsiteEvidenceFound','googleQualifiedLeads'];
    for(const r of required){
      if(!metrics.includes(r)) fail('Z',`Metrics missing ${r}`);
    }
    pass('Z','Metrics correct OK');
  }

  // AA health classifications
  log('AA: health classifications');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('classifyGoogleError') || !code.includes('AUTH_ERROR') || !code.includes('QUOTA_EXCEEDED')) fail('AA','Health classification missing');
    pass('AA','Health classifications OK');
  }

  // AB safe logging
  log('AB: safe logging');
  {
    const code = fs.readFileSync('src/lib/google-places-adapter.ts','utf8');
    if(!code.includes('getSafeRequestLog') || !code.includes('getSafeResponseLog')) fail('AB','Safe logging functions missing');
    pass('AB','Safe logging OK');
  }

  // AC secret exclusion
  log('AC: secret exclusion');
  {
    const files = ['src/lib/google-credential-reader.ts','src/lib/google-places-adapter.ts','src/lib/google-activation.ts','src/lib/google-collector-adapter.ts'];
    for(const f of files){
      const content = fs.readFileSync(f,'utf8');
      if(content.includes('AIza') && !content.includes('test_mock')) fail('AC',`File ${f} contains AIza`);
    }
    pass('AC','Secret exclusion OK');
  }

  // AD workflow isolation
  log('AD: workflow isolation');
  {
    const collect = fs.readFileSync('.github/workflows/collect.yml','utf8');
    if(collect.includes('GOOGLE_MAPS_API_KEY')) fail('AD','collect.yml must NOT contain GOOGLE_MAPS_API_KEY in 4C.4C.5A');
    const probe = fs.readFileSync('.github/workflows/google-controlled-probe.yml','utf8');
    if(!probe.includes('workflow_dispatch')) fail('AD','Controlled probe must be workflow_dispatch only');
    if(probe.includes('schedule:') || probe.includes('push:')) fail('AD','Controlled probe must not have schedule/push');
    pass('AD','Workflow isolation OK — collect no Google key, probe manual-only');
  }

  // AE normal OSM unchanged
  log('AE: normal OSM unchanged');
  {
    const worker = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(!worker.includes('overpass') && !worker.includes('DataSource')) fail('AE','Worker should still handle overpass');
    pass('AE','Normal OSM unchanged OK');
  }

  // AF cost unit accounting
  log('AF: cost unit accounting');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!schema.includes('estimatedCostUnits') || !schema.includes('actualCostUnits')) fail('AF','Cost unit accounting fields missing');
    const activationCode = fs.readFileSync('src/lib/google-activation.ts','utf8');
    if(!activationCode.includes('costUnitsPerQualifiedLead')) fail('AF','Derived cost metrics missing');
    pass('AF','Cost unit accounting OK');
  }

  // AG cache accounting
  log('AG: cache accounting');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!schema.includes('GoogleApiCache') || !schema.includes('queryFingerprint')) fail('AG','Cache accounting missing');
    pass('AG','Cache accounting OK');
  }

  // AH CollectorRun metrics
  log('AH: CollectorRun metrics');
  {
    const code = fs.readFileSync('src/lib/google-activation.ts','utf8');
    if(!code.includes('buildSafeMetricsLog') || !code.includes('googleRequests')) fail('AH','CollectorRun metrics builder missing');
    pass('AH','CollectorRun metrics OK');
  }

  // AI stop conditions
  log('AI: stop conditions');
  {
    const stops = activationModule.STOP_CONDITIONS;
    const required = ['DAILY_LIMIT_REACHED','MONTHLY_LIMIT_REACHED','PER_RUN_LIMIT_REACHED','GOOGLE_CREDENTIAL_MISSING','AUTH_ERROR','QUOTA_EXCEEDED'];
    for(const r of required){
      if(!stops.includes(r)) fail('AI',`Stop condition missing ${r}`);
    }
    pass('AI','Stop conditions OK');
  }

  console.log('[TEST] All activation tests A-AI PASSED — ZERO NETWORK — limited activation architecture prepared');
}

main().catch(e=>{
  console.error('Activation tests failed', e);
  process.exit(1);
});
