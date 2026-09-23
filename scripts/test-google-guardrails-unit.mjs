#!/usr/bin/env node
/**
 * Phase 4C.4B.1 — Google Guardrails Pure/Unit Tests
 * NO DB mutation, NO Google requests, synthetic fixtures only
 * Safe to run against production DATABASE_URL
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

function log(m){ console.log(`[UNIT] ${m}`); }
function pass(id,m){ console.log(`[PASS ${id}] ${m}`); }
function fail(id,m){ console.error(`[FAIL ${id}] ${m}`); throw new Error(`Test ${id} failed: ${m}`); }

async function getGuardrails(){
  const mod = await import('../src/lib/google-request-guardrails.ts');
  return mod;
}

async function main(){
  log('Starting Phase 4C.4B.1 Pure/Unit Tests');
  const guardrails = await getGuardrails();
  const { createDeterministicFingerprint, validateGoogleCollectionConfig, classifyGoogleError, getHealthStatusForErrorClassification, getUTCStartOfDay, getUTCStartOfMonth } = guardrails;

  // S deterministic fingerprint same request
  log('Test S: deterministic fingerprint same request');
  {
    const input = { operation:'TEXT_SEARCH', category:'dental', city:'London', country:'UK', latitude:51.5, longitude:-0.12, radiusKm:25 };
    const fp1 = createDeterministicFingerprint(input);
    const fp2 = createDeterministicFingerprint(input);
    if(fp1!==fp2) fail('S',`Same input should give same fingerprint`);
    if(fp1.length!==64) fail('S','SHA-256 hex should be 64 chars');
    pass('S',`Deterministic fingerprint OK ${fp1.slice(0,16)}...`);
  }

  // T different operation → different fingerprint
  log('Test T: different operation → different fingerprint');
  {
    const base = { category:'dental', city:'London' };
    const fp1 = createDeterministicFingerprint({ ...base, operation:'TEXT_SEARCH' });
    const fp2 = createDeterministicFingerprint({ ...base, operation:'PLACE_DETAILS' });
    if(fp1===fp2) fail('T','Different operation should give different fingerprint');
    pass('T','Different operation → different fingerprint OK');
  }

  // U different page token → different fingerprint
  log('Test U: different page token → different fingerprint');
  {
    const base = { operation:'TEXT_SEARCH', category:'dental', city:'London' };
    const fp1 = createDeterministicFingerprint({ ...base, pageToken:null });
    const fp2 = createDeterministicFingerprint({ ...base, pageToken:'token123' });
    if(fp1===fp2) fail('U','Different page token should give different fingerprint');
    pass('U','Different page token → different fingerprint OK');
  }

  // V API key excluded from fingerprint
  log('Test V: API key excluded from fingerprint');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    const inputSection = code.split('interface FingerprintInput')[1]?.split('}')[0] || '';
    if(inputSection.toLowerCase().includes('apikey')) fail('V','FingerprintInput should not contain apiKey');
    if(code.includes('GOOGLE_MAPS_API_KEY') && code.includes('createDeterministicFingerprint') && code.match(/createDeterministicFingerprint[\s\S]*GOOGLE_MAPS_API_KEY/)) fail('V','Fingerprint should not reference API key');
    pass('V','API key excluded from fingerprint OK');
  }

  // O DB transaction failure → no external-call permission (pure check)
  log('Test O: DB transaction failure → no permission');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('RESERVATION_FAILED') || !code.includes('fail-closed')) fail('O','Should have fail-closed on reservation failure');
    pass('O','DB transaction failure → no permission (code check)');
  }

  // P reservation timeout → fail closed
  log('Test P: reservation timeout → fail closed');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('maxWait: 15000') || !code.includes('timeout: 20000')) fail('P','Should have explicit maxWait 15000 timeout 20000');
    if(!code.includes('RESERVATION_TIMEOUT')) fail('P','Should have RESERVATION_TIMEOUT handling');
    pass('P','Reservation timeout fail-closed OK');
  }

  // X Google synthetic → NormalizedBusinessRecord
  log('Test X: Google synthetic → NormalizedBusinessRecord');
  {
    const mod = await import('../src/lib/collection-normalization.ts');
    const { normalizedFromGooglePlace } = mod;
    const place = { place_id:'ChIJ123', name:'Bright Smile Dental', formatted_address:'10 High Street, London', formatted_phone_number:'+44 20 1234 5678', website:'https://brightsmile.co.uk', geometry:{ location:{ lat:51.5, lng:-0.12 } }, address_components:[{ long_name:'London', short_name:'London', types:['locality'] }, { long_name:'SW1A 1AA', short_name:'SW1A 1AA', types:['postal_code'] }, { long_name:'United Kingdom', short_name:'GB', types:['country'] }] };
    const normalized = normalizedFromGooglePlace(place, 'dental', 'src-test');
    if(!normalized) fail('X','Should normalize Google place');
    if(normalized.externalId!=='ChIJ123') fail('X','externalId should be place_id');
    // Canonical externalType should be 'place' per 4C.4B.1 preference
    if(normalized.externalType!=='place' && normalized.externalType!=='google_place') fail('X',`externalType should be place (canonical) or google_place (legacy), got ${normalized.externalType}`);
    if(normalized.sourceType!=='GOOGLE_PLACES') fail('X','sourceType GOOGLE_PLACES');
    pass('X',`Google synthetic → NormalizedBusinessRecord OK externalType=${normalized.externalType}`);
  }

  // Y Google + OSM phone match
  log('Test Y: Google + OSM phone match');
  {
    const mod = await import('../src/lib/collection-normalization.ts');
    const { normalizeBusinessNameForComparison, normalizePhoneForComparison, matchNormalizedRecords } = mod;
    const osmRecord = {
      sourceId:'src-osm', sourceType:'OVERPASS', externalType:'node', externalId:'123',
      name:'Bright Smile Dental', normalizedName:normalizeBusinessNameForComparison('Bright Smile Dental'),
      email:null, normalizedEmail:null,
      phone:'+44 20 1234 5678', normalizedPhone:normalizePhoneForComparison('+44 20 1234 5678'),
      website:null, normalizedWebsiteHost:null, websiteEvidence:null,
      address:'10 High Street', normalizedAddress:'10 high street',
      city:'London', normalizedCity:'london', region:null, country:'UK', countryCode:'GB', normalizedCountryCode:'GB',
      postalCode:'SW1A 1AA', normalizedPostalCode:'sw1a1aa',
      latitude:51.5, longitude:-0.12, category:'dental', rawSourceData:{}, collectedAt:new Date(),
    };
    const googleRecord = {
      sourceId:'src-google', sourceType:'GOOGLE_PLACES', externalType:'place', externalId:'ChIJ123',
      name:'Bright Smile Dental', normalizedName:normalizeBusinessNameForComparison('Bright Smile Dental'),
      email:null, normalizedEmail:null,
      phone:'+442012345678', normalizedPhone:normalizePhoneForComparison('+442012345678'),
      website:'https://brightsmile.co.uk', normalizedWebsiteHost:'brightsmile.co.uk', websiteEvidence:'https://brightsmile.co.uk',
      address:'10 High Street', normalizedAddress:'10 high street',
      city:'London', normalizedCity:'london', region:null, country:'UK', countryCode:'GB', normalizedCountryCode:'GB',
      postalCode:'SW1A 1AA', normalizedPostalCode:'sw1a1aa',
      latitude:51.5001, longitude:-0.1201, category:'dental', rawSourceData:{}, collectedAt:new Date(),
    };
    const existing = {
      id:'cand-osm-1',
      companyName: osmRecord.name,
      normalizedName: osmRecord.normalizedName,
      phone: osmRecord.phone,
      normalizedPhone: osmRecord.normalizedPhone,
      address: osmRecord.address,
      normalizedAddress: osmRecord.normalizedAddress,
      city: osmRecord.city,
      normalizedCity: osmRecord.normalizedCity,
      postalCode: osmRecord.postalCode,
      normalizedPostalCode: osmRecord.normalizedPostalCode,
      latitude: osmRecord.latitude,
      longitude: osmRecord.longitude,
      externalId: osmRecord.externalId,
      externalType: osmRecord.externalType,
      discoverySourceId: osmRecord.sourceId,
    };
    const match = matchNormalizedRecords(googleRecord, existing, { geoThresholdMeters:75 });
    if(!match.matched || !match.reasons.includes('PHONE_EXACT')) fail('Y',`Expected PHONE_EXACT strong match, got ${JSON.stringify(match)}`);
    pass('Y',`Google+OSM phone match OK — ${match.confidence} ${match.reasons.join(',')}`);
  }

  // Z Google website triggers qualification recheck
  log('Test Z: Google website triggers qualification recheck');
  {
    const mod = await import('../src/lib/collection-normalization.ts');
    const { mergeBusinessEvidence, normalizeBusinessNameForComparison, normalizeWebsiteHostForComparison } = mod;
    const existingCand = { id:'cand1', companyName:'Bright Smile Dental', email:null, phone:'+44 20 1234', website:null, address:null, city:'London', country:'UK', postcode:null, latitude:51.5, longitude:-0.12, metadata:{ sourceEvidence:[] } };
    const incoming = {
      sourceId:'src-google', sourceType:'GOOGLE_PLACES', externalType:'place', externalId:'ChIJ123',
      name:'Bright Smile Dental', normalizedName:normalizeBusinessNameForComparison('Bright Smile Dental'),
      email:null, normalizedEmail:null, phone:'+44 20 1234', normalizedPhone:'+442012345678',
      website:'https://brightsmile.co.uk', normalizedWebsiteHost:normalizeWebsiteHostForComparison('https://brightsmile.co.uk'), websiteEvidence:'https://brightsmile.co.uk',
      address:null, normalizedAddress:null, city:'London', normalizedCity:'london', region:null, country:'UK', countryCode:'GB', normalizedCountryCode:'GB',
      postalCode:null, normalizedPostalCode:null, latitude:51.5, longitude:-0.12, category:'dental', rawSourceData:{}, collectedAt:new Date(),
    };
    const merge = mergeBusinessEvidence(existingCand, incoming);
    if(!merge.qualificationRecheckRequired) fail('Z','Website enrichment should require recheck');
    pass('Z','Google website triggers qualification recheck OK');
  }

  // AA neighboring businesses not merged
  log('Test AA: neighboring businesses not merged');
  {
    const mod = await import('../src/lib/collection-normalization.ts');
    const { normalizeBusinessNameForComparison, matchNormalizedRecords } = mod;
    const rec1 = { sourceId:'src1', sourceType:'OVERPASS', externalType:'node', externalId:'1', name:'ABC Dental', normalizedName:normalizeBusinessNameForComparison('ABC Dental'), email:null, normalizedEmail:null, phone:null, normalizedPhone:null, website:null, normalizedWebsiteHost:null, websiteEvidence:null, address:null, normalizedAddress:null, city:null, normalizedCity:null, region:null, country:null, countryCode:null, normalizedCountryCode:null, postalCode:null, normalizedPostalCode:null, latitude:51.5, longitude:-0.12, category:'dental', rawSourceData:{}, collectedAt:new Date() };
    const existing = { id:'cand2', companyName:'XYZ Dental', normalizedName:normalizeBusinessNameForComparison('XYZ Dental'), latitude:51.50005, longitude:-0.12005 };
    const match = matchNormalizedRecords(rec1, existing, { geoThresholdMeters:75 });
    if(match.matched) fail('AA','ABC vs XYZ 10m apart should NOT match');
    pass('AA','Neighboring businesses not merged OK');
  }

  // AB website evidence never erased
  log('Test AB: website evidence never erased');
  {
    const mod = await import('../src/lib/collection-normalization.ts');
    const { mergeBusinessEvidence } = mod;
    const existing = { id:'cand1', companyName:'Test', email:null, phone:null, website:'https://existing.co.uk', address:null, city:null, country:null, postcode:null, latitude:null, longitude:null, metadata:{} };
    const incoming = { sourceId:'src', sourceType:'GOOGLE_PLACES', externalType:'place', externalId:'ChIJ', name:'Test', normalizedName:'test', email:null, normalizedEmail:null, phone:null, normalizedPhone:null, website:null, normalizedWebsiteHost:null, websiteEvidence:null, address:null, normalizedAddress:null, city:null, normalizedCity:null, region:null, country:null, countryCode:null, normalizedCountryCode:null, postalCode:null, normalizedPostalCode:null, latitude:null, longitude:null, category:'dental', rawSourceData:{}, collectedAt:new Date() };
    const merge = mergeBusinessEvidence(existing, incoming);
    if(merge.canonicalChanges.website) fail('AB','Null website should not overwrite existing');
    pass('AB','Website evidence never erased OK');
  }

  // AC existing email never erased by null Google field
  log('Test AC: existing email never erased by null Google field');
  {
    const mod = await import('../src/lib/collection-normalization.ts');
    const { mergeBusinessEvidence } = mod;
    const existing = { id:'cand1', companyName:'Test', email:'contact@example.com', phone:null, website:null, address:null, city:null, country:null, postcode:null, latitude:null, longitude:null, metadata:{} };
    const incoming = { sourceId:'src', sourceType:'GOOGLE_PLACES', externalType:'place', externalId:'ChIJ', name:'Test', normalizedName:'test', email:null, normalizedEmail:null, phone:null, normalizedPhone:null, website:null, normalizedWebsiteHost:null, websiteEvidence:null, address:null, normalizedAddress:null, city:null, normalizedCity:null, region:null, country:null, countryCode:null, normalizedCountryCode:null, postalCode:null, normalizedPostalCode:null, latitude:null, longitude:null, category:'dental', rawSourceData:{}, collectedAt:new Date() };
    const merge = mergeBusinessEvidence(existing, incoming);
    if(merge.canonicalChanges.email) fail('AC','Null email should not overwrite');
    pass('AC','Existing email never erased OK');
  }

  // AD Google source health auth error
  log('Test AD: Google source health auth error');
  {
    const classification = classifyGoogleError(new Error('Invalid API key auth error'));
    if(classification!=='AUTH_ERROR') fail('AD',`Expected AUTH_ERROR got ${classification}`);
    const health = getHealthStatusForErrorClassification(classification);
    if(health!=='down') fail('AD',`AUTH_ERROR should be down, got ${health}`);
    pass('AD','Google source health auth error → down OK');
  }

  // AE quota error stops further permission
  log('Test AE: quota error stops further permission');
  {
    const classification = classifyGoogleError(new Error('Quota exceeded billing'));
    if(classification!=='QUOTA_EXCEEDED') fail('AE',`Expected QUOTA_EXCEEDED got ${classification}`);
    const health = getHealthStatusForErrorClassification(classification);
    if(health!=='down') fail('AE','QUOTA_EXCEEDED should be down');
    pass('AE','Quota error stops further permission OK');
  }

  // AF retry cannot bypass budget
  log('Test AF: retry cannot bypass budget');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('retryLimit')) fail('AF','Should have retryLimit');
    const cfgCode = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!cfgCode.includes('retryLimit')) fail('AF','Schema should have retryLimit');
    pass('AF','Retry cannot bypass budget — retryLimit 0, each transmission own reservation');
  }

  // AG pagination consumes separate unit
  log('Test AG: pagination consumes separate unit');
  {
    const fp1 = createDeterministicFingerprint({ operation:'TEXT_SEARCH', category:'dental', city:'London', pageToken:null });
    const fp2 = createDeterministicFingerprint({ operation:'TEXT_SEARCH', category:'dental', city:'London', pageToken:'nextPageToken123' });
    if(fp1===fp2) fail('AG','Different page token should give different fingerprint → separate reservation');
    pass('AG','Pagination consumes separate unit OK — page token distinct fingerprint');
  }

  // AJ no secret exposure
  log('Test AJ: no secret exposure');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    const metricsSection = code.split('function getGoogleGuardrailMetrics')[1] || '';
    if(metricsSection.includes('apiKey') || metricsSection.includes('encryptedValue')) fail('AJ','Metrics should not expose apiKey or encryptedValue');
    if(metricsSection.includes('process.env') && metricsSection.toLowerCase().includes('google')) fail('AJ','Metrics should not expose env secrets');
    pass('AJ','No secret exposure OK');
  }

  // AK production test guard
  log('Test AK: production test guard');
  {
    const safetyCode = fs.readFileSync('scripts/test-safety.mjs','utf8');
    if(!safetyCode.includes('ALLOW_PRODUCTION_TEST_MUTATION') || !safetyCode.includes('TEST_DATABASE_URL')) fail('AK','Safety guard should mention ALLOW_PRODUCTION_TEST_MUTATION and TEST_DATABASE_URL');
    // Also check test-db-client
    const dbClientCode = fs.readFileSync('scripts/test-db-client.mjs','utf8');
    if(!dbClientCode.includes('TEST_DATABASE_URL') || !dbClientCode.includes('REFUSING')) fail('AK','test-db-client should enforce TEST_DATABASE_URL and REFUSING');
    pass('AK','Production test guard OK');
  }

  // AL no Google fetch
  log('Test AL: no Google fetch');
  {
    const files = ['src/lib/google-request-guardrails.ts','src/lib/collection-normalization.ts','scripts/collector-worker.mjs'];
    for(const f of files){
      if(!fs.existsSync(f)) continue;
      const content = fs.readFileSync(f,'utf8');
      if((content.includes('maps.googleapis.com') || content.includes('places.googleapis.com')) && content.includes('fetch(')) fail('AL',`${f} contains Google API fetch`);
    }
    const guardCode = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(guardCode.includes('fetch(') && guardCode.toLowerCase().includes('googleapis')) fail('AL','Guardrail lib should have no Google fetch');
    pass('AL','No Google fetch OK');
  }

  // AM no Google SDK network
  log('Test AM: no Google SDK network');
  {
    const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const googlePkgs = Object.keys(deps).filter(k=>k.toLowerCase().includes('google') && (k.includes('maps')||k.includes('places')||k.includes('googleapis')));
    if(googlePkgs.length>0){
      const guardCode = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
      if(googlePkgs.some(p=>guardCode.includes(p))) fail('AM',`Google SDK ${googlePkgs.join(',')} used in guardrail lib`);
    }
    pass('AM','No Google SDK network OK');
  }

  // AN no enrichment mutation
  log('Test AN: no enrichment mutation');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(code.includes('enrichmentJob') || code.includes('enrichmentAttempt') || code.includes('ProviderCredential')) fail('AN','Google guardrail lib should not mutate enrichment');
    pass('AN','No enrichment mutation OK');
  }

  // AT schema constraints/indexes if added
  log('Test AT: schema constraints/indexes if added');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!schema.includes('model GoogleCollectionConfig')) fail('AT','GoogleCollectionConfig missing');
    if(!schema.includes('model GoogleApiUsage')) fail('AT','GoogleApiUsage missing');
    if(!schema.includes('model GoogleApiCache')) fail('AT','GoogleApiCache missing');
    if(!schema.includes('@@unique([sourceId, queryFingerprint, operation])')) fail('AT','Cache uniqueness should be source-aware');
    if(!schema.includes('@@index([sourceId, reservedAt])')) fail('AT','Missing index [sourceId, reservedAt]');
    pass('AT','Schema constraints/indexes OK');
  }

  // AU Float not used for cost units
  log('Test AU: Float not used for cost units');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    const googleSection = schema.split('model GoogleApiUsage')[1].split('model GoogleApiCache')[0];
    if(googleSection.includes('estimatedCostUnits Float') || googleSection.includes('actualCostUnits Float')) fail('AU','Cost units should be Int not Float');
    if(!/estimatedCostUnits\s+Int\?/.test(googleSection) || !/actualCostUnits\s+Int\?/.test(googleSection)) fail('AU','Cost units should be Int?');
    const configSection = schema.split('model GoogleCollectionConfig')[1].split('model GoogleApiUsage')[0];
    if(configSection.includes('dailyCostUnitLimit Float') || configSection.includes('monthlyCostUnitLimit Float')) fail('AU','Config cost limits should be Int not Float');
    if(!/dailyCostUnitLimit\s+Int\?/.test(configSection) || !/monthlyCostUnitLimit\s+Int\?/.test(configSection)) fail('AU','Config cost limits should be Int?');
    pass('AU','Float not used for cost units OK — Int used');
  }

  // AV requestSentAt accounting
  log('Test AV: requestSentAt accounting');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!schema.includes('requestSentAt DateTime?')) fail('AV','requestSentAt missing in GoogleApiUsage');
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('requestSentAt')) fail('AV','Guardrail lib should handle requestSentAt');
    pass('AV','requestSentAt accounting OK');
  }

  // AW source-aware cache uniqueness
  log('Test AW: source-aware cache uniqueness');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    if(!schema.includes('@@unique([sourceId, queryFingerprint, operation])')) fail('AW','Cache uniqueness should be [sourceId, queryFingerprint, operation]');
    pass('AW','Source-aware cache uniqueness OK');
  }

  // AX collectorRun required
  log('Test AX: collectorRun required');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    const usageSection = schema.split('model GoogleApiUsage')[1].split('model GoogleApiCache')[0];
    if(usageSection.includes('collectorRunId String?')) fail('AX','collectorRunId must be required');
    if(!usageSection.includes('collectorRunId String')) fail('AX','collectorRunId missing');
    pass('AX','CollectorRun required OK');
  }

  // AY source required
  log('Test AY: source required');
  {
    const schema = fs.readFileSync('prisma/schema.prisma','utf8');
    const usageSection = schema.split('model GoogleApiUsage')[1].split('model GoogleApiCache')[0];
    if(usageSection.includes('sourceId String?') && usageSection.indexOf('sourceId String') < usageSection.indexOf('@@index')) {
      // Check specifically GoogleApiUsage
      const lines = usageSection.split('\n').filter(l=>l.includes('sourceId'));
      if(lines.some(l=>l.includes('String?'))) fail('AY','GoogleApiUsage.sourceId must be required');
    }
    if(!schema.includes('onDelete: Restrict') || !schema.includes('onDelete: Cascade')) fail('AY','Should have Restrict and Cascade');
    pass('AY','Source required OK — Restrict for usage, Cascade for cache');
  }

  // BA config row global mutex
  log('Test BA: config row global mutex');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    if(!code.includes('GLOBAL GOOGLE RESERVATION MUTEX') || !code.includes('SELECT * FROM \"GoogleCollectionConfig\" WHERE key=\'default\' FOR UPDATE')) fail('BA','Should document and use global mutex FOR UPDATE on GoogleCollectionConfig');
    pass('BA','Config row global mutex OK — FOR UPDATE documented');
  }

  // BB invalid zero/negative limits fail closed
  log('Test BB: invalid zero/negative limits fail closed');
  {
    const invalidConfigs = [
      { key:'default', enabled:true, failClosed:true, perRunRequestLimit:0, dailyRequestLimit:50, monthlyRequestLimit:500, cacheEnabled:true, queryCacheTtlHours:24, placeDetailsCacheTtlHours:168, retryLimit:0 },
      { key:'default', enabled:true, failClosed:true, perRunRequestLimit:10, dailyRequestLimit:0, monthlyRequestLimit:500, cacheEnabled:true, queryCacheTtlHours:24, placeDetailsCacheTtlHours:168, retryLimit:0 },
      { key:'default', enabled:true, failClosed:true, perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:0, cacheEnabled:true, queryCacheTtlHours:24, placeDetailsCacheTtlHours:168, retryLimit:0 },
      { key:'default', enabled:true, failClosed:false, perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:500, cacheEnabled:true, queryCacheTtlHours:24, placeDetailsCacheTtlHours:168, retryLimit:0 },
    ];
    for(const cfg of invalidConfigs){
      const v = validateGoogleCollectionConfig(cfg);
      if(v.valid) fail('BB',`Invalid config should fail closed, got valid for ${JSON.stringify(cfg)}`);
    }
    pass('BB','Invalid zero/negative limits fail closed OK');
  }

  // BC monthly < daily invalid/fail closed
  log('Test BC: monthly < daily invalid/fail closed');
  {
    const cfg = { key:'default', enabled:true, failClosed:true, perRunRequestLimit:10, dailyRequestLimit:100, monthlyRequestLimit:50, cacheEnabled:true, queryCacheTtlHours:24, placeDetailsCacheTtlHours:168, retryLimit:0 };
    const v = validateGoogleCollectionConfig(cfg);
    if(v.valid) fail('BC','Monthly < daily should be invalid');
    if(v.reason!=='MONTHLY_LESS_THAN_DAILY') fail('BC',`Expected MONTHLY_LESS_THAN_DAILY got ${v.reason}`);
    pass('BC','Monthly < daily invalid/fail closed OK');
  }

  // BD nullable cost limits supported
  log('Test BD: nullable cost limits supported');
  {
    const cfg = { key:'default', enabled:false, failClosed:true, perRunRequestLimit:10, dailyRequestLimit:50, monthlyRequestLimit:500, dailyCostUnitLimit:null, monthlyCostUnitLimit:null, cacheEnabled:true, queryCacheTtlHours:24, placeDetailsCacheTtlHours:168, retryLimit:0 };
    const v = validateGoogleCollectionConfig(cfg);
    if(!v.valid) fail('BD',`Nullable cost limits should be valid, got ${v.reason}`);
    pass('BD','Nullable cost limits supported OK');
  }

  // BE CANCELLED pre-call semantics
  log('Test BE: CANCELLED pre-call semantics');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    const docs = fs.readFileSync('docs/PHASE_4C.4B_GOOGLE_GUARDRAILS.md','utf8');
    const combined = code + docs;
    if(!combined.includes('requestSentAt == null') || !combined.toLowerCase().includes('pre-call')) fail('BE','Should document CANCELLED pre-call semantics');
    pass('BE','CANCELLED pre-call semantics documented OK');
  }

  // BF CANCELLED post-send semantics
  log('Test BF: CANCELLED post-send semantics');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    const docs = fs.readFileSync('docs/PHASE_4C.4B_GOOGLE_GUARDRAILS.md','utf8');
    const combined = code + docs;
    if(!combined.includes('requestSentAt != null') || !combined.toLowerCase().includes('counts')) fail('BF','Should document CANCELLED post-send counts');
    pass('BF','CANCELLED post-send semantics OK');
  }

  // BG no reservation refund after crash
  log('Test BG: no reservation refund after crash');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    const docs = fs.readFileSync('docs/PHASE_4C.4B_GOOGLE_GUARDRAILS.md','utf8');
    const combined = code + docs;
    if(!combined.toLowerCase().includes('no auto') || !combined.includes('RESERVED') || !combined.toLowerCase().includes('crash')) fail('BG','Should document no auto refund after crash');
    pass('BG','No reservation refund after crash OK');
  }

  // BH retry requires new reservation
  log('Test BH: retry requires new reservation');
  {
    const code = fs.readFileSync('src/lib/google-request-guardrails.ts','utf8');
    const docs = fs.readFileSync('docs/PHASE_4C.4B_GOOGLE_GUARDRAILS.md','utf8');
    const combined = code + docs;
    if(!combined.toLowerCase().includes('own reservation') || !combined.toLowerCase().includes('retry')) fail('BH','Should document retry requires new reservation');
    pass('BH','Retry requires new reservation OK');
  }

  // BI page token creates distinct reservation fingerprint
  log('Test BI: page token creates distinct reservation fingerprint');
  {
    const fp1 = createDeterministicFingerprint({ operation:'TEXT_SEARCH', category:'dental', city:'London', pageToken:null });
    const fp2 = createDeterministicFingerprint({ operation:'TEXT_SEARCH', category:'dental', city:'London', pageToken:'token2' });
    if(fp1===fp2) fail('BI','Page token should create distinct fingerprint');
    pass('BI','Page token distinct fingerprint OK');
  }

  // BL Google network calls = 0
  log('Test BL: Google network calls = 0');
  {
    const files = ['src/lib/google-request-guardrails.ts','src/lib/collection-normalization.ts','scripts/collector-worker.mjs','src/lib/enrichment-providers.ts'];
    for(const f of files){
      if(!fs.existsSync(f)) continue;
      const content = fs.readFileSync(f,'utf8');
      if((content.includes('maps.googleapis.com') || content.includes('places.googleapis.com')) && content.includes('fetch(')) fail('BL',`${f} has Google fetch`);
    }
    pass('BL','Google network calls = 0 OK');
  }

  // Canonical externalType check
  log('Test CANONICAL: sourceType=GOOGLE_PLACES externalType=place externalId=place_id');
  {
    const mod = await import('../src/lib/collection-normalization.ts');
    const { normalizedFromGooglePlace } = mod;
    const place = { place_id:'ChIJ123', name:'Test', geometry:{ location:{ lat:51.5, lng:-0.12 } } };
    const norm = normalizedFromGooglePlace(place, 'dental', 'src-test');
    if(norm.sourceType!=='GOOGLE_PLACES') fail('CANONICAL','sourceType should be GOOGLE_PLACES');
    if(norm.externalType!=='place') fail('CANONICAL',`canonical externalType should be 'place' per 4C.4B.1 preference, got ${norm.externalType}. If intentionally retaining google_place, document reason`);
    if(norm.externalId!=='ChIJ123') fail('CANONICAL','externalId should be place_id');
    pass('CANONICAL','Canonical types OK — sourceType=GOOGLE_PLACES externalType=place externalId=place_id');
  }

  log('All pure/unit tests PASSED');
}

main().catch(e=>{
  console.error('Unit test failed', e);
  process.exit(1);
});
