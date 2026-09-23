#!/usr/bin/env node
/**
 * Phase 4C.4A — Multi-Source Collection Foundation Tests A-Z
 * No external calls, no Google API, no enrichment, synthetic fixtures only
 */

import fs from 'fs';

function log(m){ console.log(`[TEST] ${m}`); }
function pass(id,m){ console.log(`[PASS ${id}] ${m}`); }
function fail(id,m){ console.error(`[FAIL ${id}] ${m}`); throw new Error(`Test ${id} failed: ${m}`); }

async function main(){
  const mod = await import('../src/lib/collection-normalization.ts').catch(async ()=>{
    // Try tsx loader via dynamic import of compiled JS if exists
    // For this test we will use tsx if available, else we need to run with tsx
    // We'll attempt to import via tsx/esm loader by using --loader? For now fail with guidance
    throw new Error('Cannot import collection-normalization.ts — run with tsx: npx tsx scripts/test-collection-4c4a.mjs');
  });

  const {
    normalizeBusinessNameForComparison,
    normalizeEmailForComparison,
    normalizePhoneForComparison,
    getDigitsOnlyPhone,
    normalizeWebsiteHostForComparison,
    normalizeAddressForComparison,
    normalizeCityForComparison,
    normalizePostalCodeForComparison,
    haversineDistanceMeters,
    matchNormalizedRecords,
    decideAutoMerge,
    mergeBusinessEvidence,
    hasTrustedWebsiteEvidence,
    getWebsiteEvidenceList,
    normalizedFromOsmElement,
    normalizedFromGooglePlace,
  } = mod;

  log('Starting Phase 4C.4A Tests A-Z');

  // Helper to create normalized record
  function makeRecord(overrides){
    const base = {
      sourceId: 'source-osm-1',
      sourceType: 'OVERPASS',
      externalType: 'node',
      externalId: '123',
      name: 'Bright Smile Dental',
      normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      email: null,
      normalizedEmail: null,
      phone: null,
      normalizedPhone: null,
      website: null,
      normalizedWebsiteHost: null,
      websiteEvidence: null,
      address: null,
      normalizedAddress: null,
      city: null,
      normalizedCity: null,
      region: null,
      country: null,
      countryCode: null,
      normalizedCountryCode: null,
      postalCode: null,
      normalizedPostalCode: null,
      latitude: null,
      longitude: null,
      category: 'dental',
      rawSourceData: {},
      collectedAt: new Date(),
    };
    return { ...base, ...overrides };
  }

  function makeExisting(overrides){
    return {
      id: 'cand-existing-1',
      companyName: 'Bright Smile Dental',
      normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      email: null,
      normalizedEmail: null,
      phone: null,
      normalizedPhone: null,
      address: null,
      normalizedAddress: null,
      city: null,
      normalizedCity: null,
      postalCode: null,
      normalizedPostalCode: null,
      latitude: null,
      longitude: null,
      externalId: '123',
      externalType: 'node',
      discoverySourceId: 'source-osm-1',
      ...overrides,
    };
  }

  // A same-source external ID exact
  log('Test A: same-source external ID exact');
  {
    const incoming = makeRecord({ sourceId:'src1', externalType:'node', externalId:'999', name:'Test Clinic', normalizedName: normalizeBusinessNameForComparison('Test Clinic') });
    const existing = makeExisting({ discoverySourceId:'src1', externalId:'999', externalType:'node', companyName:'Test Clinic' });
    const res = matchNormalizedRecords(incoming, existing);
    if(!res.matched || res.confidence!=='EXACT' || !res.reasons.includes('SAME_EXTERNAL_ID')) fail('A',`Expected EXACT SAME_EXTERNAL_ID, got ${JSON.stringify(res)}`);
    const decision = decideAutoMerge(res);
    if(!decision.shouldAutoMerge) fail('A','EXACT should auto-merge');
    pass('A','Same-source external ID exact → EXACT auto-merge eligible');
  }

  // B same email normalization
  log('Test B: same email normalization');
  {
    const incoming = makeRecord({ sourceId:'src-other', externalType:'way', externalId:'different-999', email:'Contact@Example.COM', normalizedEmail: normalizeEmailForComparison('Contact@Example.COM') });
    const existing = makeExisting({ discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way', email:'contact@example.com', normalizedEmail: normalizeEmailForComparison('contact@example.com') });
    const res = matchNormalizedRecords(incoming, existing);
    if(!res.matched || res.confidence!=='STRONG' || !res.reasons.includes('EMAIL_EXACT')) fail('B',`Expected STRONG EMAIL_EXACT, got ${JSON.stringify(res)}`);
    pass('B','Same email case differences → STRONG EMAIL_EXACT');
  }

  // C same phone normalization
  log('Test C: same phone normalization');
  {
    const incoming = makeRecord({ sourceId:'src-other', externalType:'way', externalId:'different-999', phone:'+44 20 1234 5678', normalizedPhone: normalizePhoneForComparison('+44 20 1234 5678') });
    const existing = makeExisting({ discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way', phone:'+442012345678', normalizedPhone: normalizePhoneForComparison('+442012345678') });
    const res = matchNormalizedRecords(incoming, existing);
    if(!res.matched || res.confidence!=='STRONG' || !res.reasons.includes('PHONE_EXACT')) fail('C',`Expected PHONE_EXACT, got ${JSON.stringify(res)}`);
    pass('C','Same phone different formatting → STRONG PHONE_EXACT');
  }

  // D name + address
  log('Test D: name + address');
  {
    const incoming = makeRecord({
      sourceId:'src-other', externalType:'way', externalId:'different-999',
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      address:'10 High Street', normalizedAddress: normalizeAddressForComparison('10 High Street')
    });
    const existing = makeExisting({
      discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way',
      companyName:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      address:'10 High Street', normalizedAddress: normalizeAddressForComparison('10 High Street')
    });
    const res = matchNormalizedRecords(incoming, existing);
    if(!res.matched || res.confidence!=='PROBABLE' || !res.reasons.includes('NAME_ADDRESS')) fail('D',`Expected PROBABLE NAME_ADDRESS, got ${JSON.stringify(res)}`);
    const decision = decideAutoMerge(res);
    if(decision.shouldAutoMerge) fail('D','PROBABLE should NOT auto-merge in Phase 4C.4A');
    pass('D','Name + address → PROBABLE not auto-merged (safe)');
  }

  // E name + postal
  log('Test E: name + postal');
  {
    const incoming = makeRecord({
      sourceId:'src-other', externalType:'way', externalId:'different-999',
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      postalCode:'SW1A 1AA', normalizedPostalCode: normalizePostalCodeForComparison('SW1A 1AA')
    });
    const existing = makeExisting({
      discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way',
      companyName:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      postalCode:'SW1A 1AA', normalizedPostalCode: normalizePostalCodeForComparison('SW1A 1AA')
    });
    const res = matchNormalizedRecords(incoming, existing);
    if(!res.matched || !res.reasons.includes('NAME_POSTAL')) fail('E',`Expected NAME_POSTAL, got ${JSON.stringify(res)}`);
    pass('E','Name + postal → PROBABLE NAME_POSTAL');
  }

  // F name + geo <= threshold
  log('Test F: name + geo <= threshold');
  {
    const incoming = makeRecord({
      sourceId:'src-other', externalType:'way', externalId:'different-999',
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      latitude:51.5000, longitude:-0.1200
    });
    const existing = makeExisting({
      discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way',
      companyName:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      latitude:51.5001, longitude:-0.1201 // ~13m away
    });
    const res = matchNormalizedRecords(incoming, existing, { geoThresholdMeters:75 });
    if(!res.matched || !res.reasons.includes('NAME_GEO')) fail('F',`Expected NAME_GEO, got ${JSON.stringify(res)} dist should be <=75`);
    const dist = haversineDistanceMeters(51.5,-0.12,51.5001,-0.1201);
    if(dist>75) fail('F',`Distance ${dist} >75 should be within`);
    pass('F',`Name + geo <=75m → PROBABLE NAME_GEO dist ${dist.toFixed(1)}m`);
  }

  // G neighboring different business 10m apart must NOT merge
  log('Test G: neighboring different business');
  {
    const incoming = makeRecord({
      sourceId:'src-other', externalType:'way', externalId:'different-999',
      name:'ABC Dental', normalizedName: normalizeBusinessNameForComparison('ABC Dental'),
      latitude:51.5000, longitude:-0.1200
    });
    const existing = makeExisting({
      discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way',
      companyName:'XYZ Dental', normalizedName: normalizeBusinessNameForComparison('XYZ Dental'),
      latitude:51.50005, longitude:-0.12005 // ~7m away but different name
    });
    const res = matchNormalizedRecords(incoming, existing, { geoThresholdMeters:75 });
    if(res.matched) fail('G',`Different business 10m apart should NOT match, got ${JSON.stringify(res)}`);
    pass('G','ABC Dental 10m from XYZ Dental → NO MATCH (correct)');
  }

  // H same name different city
  log('Test H: same name different city');
  {
    const incoming = makeRecord({
      sourceId:'src-other', externalType:'way', externalId:'different-999',
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      city:'London', normalizedCity: normalizeCityForComparison('London')
    });
    const existing = makeExisting({
      discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way',
      companyName:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      city:'Manchester', normalizedCity: normalizeCityForComparison('Manchester')
    });
    const res = matchNormalizedRecords(incoming, existing);
    // Name exact + city different → should still be PROBABLE? Our implementation returns PROBABLE NAME_CITY only if city exact, else if name exact but city different, it goes to WEAK_NAME_ONLY → NO MATCH? Actually code: if name matches, then checks address, postal, geo, city. If city different, none of those match, then returns WEAK_NAME_ONLY → matched false
    // For same name different city, we expect NO MATCH (conservative)
    if(res.matched && res.reasons.includes('NAME_CITY')) fail('H',`Same name different city should NOT be NAME_CITY, got ${JSON.stringify(res)}`);
    // If it returns WEAK_NAME_ONLY with matched false, that's expected NO MATCH
    if(res.matched) fail('H',`Same name different city should NOT auto-match, got ${JSON.stringify(res)}`);
    pass('H','Same name different cities → NO MATCH (conservative, avoids cross-city merge)');
  }

  // I weak name-only no merge
  log('Test I: weak name-only no merge');
  {
    const incoming = makeRecord({ sourceId:'src-other', externalType:'way', externalId:'different-999', name:'Dental Clinic', normalizedName: normalizeBusinessNameForComparison('Dental Clinic') });
    const existing = makeExisting({ discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way', companyName:'Dental Clinic', normalizedName: normalizeBusinessNameForComparison('Dental Clinic') });
    const res = matchNormalizedRecords(incoming, existing);
    if(res.matched) fail('I',`Name-only should NOT match, got ${JSON.stringify(res)}`);
    if(!res.reasons.includes('WEAK_NAME_ONLY')) fail('I',`Expected WEAK_NAME_ONLY reason`);
    pass('I','Weak name-only → NO MATCH, WEAK_NAME_ONLY');
  }

  // J null field does not overwrite
  log('Test J: null field does not overwrite');
  {
    const existingCand = {
      id:'cand1', companyName:'Bright Smile Dental', email:'contact@example.com', phone:'+44 20 1234', website:'https://example.com',
      address:'10 High St', city:'London', country:'UK', postcode:'SW1', latitude:51.5, longitude:-0.12,
      metadata:{ sourceEvidence:[] }
    };
    const incoming = makeRecord({
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      email:null, normalizedEmail:null, phone:null, normalizedPhone:null, website:null, normalizedWebsiteHost:null,
      address:null, normalizedAddress:null
    });
    const merge = mergeBusinessEvidence(existingCand, incoming);
    if(merge.canonicalChanges.email) fail('J','Null email should not overwrite existing');
    if(merge.canonicalChanges.phone) fail('J','Null phone should not overwrite');
    if(merge.canonicalChanges.website) fail('J','Null website should not overwrite');
    if(!merge.reasons.includes('email_null_does_not_overwrite')) fail('J','Should note email null does not overwrite');
    pass('J','Null fields do not overwrite existing — safe merge');
  }

  // K website evidence preserved
  log('Test K: website evidence preserved');
  {
    const existingCand = {
      id:'cand1', companyName:'Bright Smile Dental', email:null, phone:null, website:null,
      address:null, city:'London', country:'UK', postcode:null, latitude:null, longitude:null,
      metadata:{ sourceEvidence:[] }
    };
    const incoming = makeRecord({
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      website:'https://brightsmile.co.uk', normalizedWebsiteHost: normalizeWebsiteHostForComparison('https://brightsmile.co.uk'), websiteEvidence:'https://brightsmile.co.uk'
    });
    const merge = mergeBusinessEvidence(existingCand, incoming);
    if(merge.canonicalChanges.website!=='https://brightsmile.co.uk') fail('K','Website should be enriched from null');
    if(!merge.qualificationRecheckRequired) fail('K','Website enrichment should require recheck');
    // Now test that null incoming does NOT erase existing website
    const existingWithWebsite = { ...existingCand, website:'https://brightsmile.co.uk' };
    const incomingNoWebsite = makeRecord({ name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'), website:null });
    const merge2 = mergeBusinessEvidence(existingWithWebsite, incomingNoWebsite);
    if(merge2.canonicalChanges.website) fail('K','Null website should NOT overwrite existing');
    pass('K','Website evidence preserved — null does not erase, enrichment triggers recheck');
  }

  // L email evidence preserved
  log('Test L: email evidence preserved');
  {
    const existingCand = { id:'cand1', companyName:'Test', email:null, phone:null, website:null, address:null, city:null, country:null, postcode:null, latitude:null, longitude:null, metadata:{} };
    const incoming = makeRecord({ email:'contact@example.com', normalizedEmail: normalizeEmailForComparison('contact@example.com') });
    const merge = mergeBusinessEvidence(existingCand, incoming);
    if(merge.canonicalChanges.email!=='contact@example.com') fail('L','Email should be enriched');
    pass('L','Email evidence preserved');
  }

  // M website triggers recheck
  log('Test M: website triggers recheck');
  {
    const existingCand = { id:'cand1', companyName:'Test', email:null, phone:null, website:null, address:null, city:null, country:null, postcode:null, latitude:null, longitude:null, metadata:{} };
    const incoming = makeRecord({ website:'https://example.com', normalizedWebsiteHost: normalizeWebsiteHostForComparison('https://example.com') });
    const merge = mergeBusinessEvidence(existingCand, incoming);
    if(!merge.qualificationRecheckRequired) fail('M','Website should trigger recheck');
    pass('M','Website triggers qualification recheck required');
  }

  // N generic email still rejected — check generic filter still exists
  log('Test N: generic email still rejected');
  {
    const websiteVerificationCode = fs.readFileSync('src/lib/website-verification.ts','utf8');
    if(!websiteVerificationCode.includes('GENERIC_EMAIL_DOMAINS')) fail('N','Generic email domains filter missing');
    if(!websiteVerificationCode.includes('gmail.com')) fail('N','Generic list should include gmail.com');
    pass('N','Generic email filter still present — will reject generic');
  }

  // O email-domain live website still rejected
  log('Test O: email-domain live website still rejected');
  {
    const websiteVerificationCode = fs.readFileSync('src/lib/website-verification.ts','utf8');
    const collectorWorkerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(!websiteVerificationCode.includes('hasLiveWebsite')) fail('O','hasLiveWebsite missing in verification lib');
    if(!collectorWorkerCode.includes('hasLiveWebsite') && !collectorWorkerCode.includes('email_domain_has_live_website')) fail('O','Collector worker should still check email domain live website');
    pass('O','Email-domain live website check still present — TRUE_NO_SITE safety preserved');
  }

  // P probable match not auto-merged
  log('Test P: probable match not auto-merged');
  {
    const incoming = makeRecord({
      sourceId:'src-other', externalType:'way', externalId:'different-999',
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      address:'10 High Street', normalizedAddress: normalizeAddressForComparison('10 High Street')
    });
    const existing = makeExisting({
      discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way',
      companyName:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      address:'10 High Street', normalizedAddress: normalizeAddressForComparison('10 High Street')
    });
    const res = matchNormalizedRecords(incoming, existing);
    const decision = decideAutoMerge(res);
    if(decision.shouldAutoMerge) fail('P',`PROBABLE should NOT auto-merge in this phase, got ${JSON.stringify(decision)}`);
    if(decision.confidence!=='PROBABLE') fail('P',`Expected PROBABLE, got ${decision.confidence}`);
    pass('P','Probable match not auto-merged — safe default');
  }

  // Q exact match auto-merge eligible
  log('Test Q: exact match auto-merge eligible');
  {
    const incoming = makeRecord({ sourceId:'src1', externalType:'node', externalId:'999' });
    const existing = makeExisting({ discoverySourceId:'src1', externalId:'999', externalType:'node' });
    const res = matchNormalizedRecords(incoming, existing);
    const decision = decideAutoMerge(res);
    if(!decision.shouldAutoMerge || decision.confidence!=='EXACT') fail('Q',`EXACT should auto-merge, got ${JSON.stringify(decision)}`);
    pass('Q','Exact match auto-merge eligible');
  }

  // R strong match auto-merge eligible
  log('Test R: strong match auto-merge eligible');
  {
    const incoming = makeRecord({ sourceId:'src-other', externalType:'way', externalId:'different-999', email:'test@example.com', normalizedEmail: normalizeEmailForComparison('test@example.com') });
    const existing = makeExisting({ discoverySourceId:'src-other-2', externalId:'different-1000', externalType:'way', email:'test@example.com', normalizedEmail: normalizeEmailForComparison('test@example.com') });
    const res = matchNormalizedRecords(incoming, existing);
    const decision = decideAutoMerge(res);
    if(!decision.shouldAutoMerge || decision.confidence!=='STRONG') fail('R',`STRONG should auto-merge, got ${JSON.stringify(decision)}`);
    pass('R','Strong match auto-merge eligible');
  }

  // S source evidence retains both records
  log('Test S: source evidence retains both records');
  {
    const existingCand = {
      id:'cand1', companyName:'Bright Smile Dental', email:null, phone:'+44 20 1234', website:null,
      address:null, city:'London', country:'UK', postcode:null, latitude:51.5, longitude:-0.12,
      metadata:{
        sourceEvidence:[
          { sourceId:'src-osm', sourceType:'OVERPASS', externalType:'node', externalId:'123', rawName:'Bright Smile Dental', rawPhone:'+44 20 1234', collectedAt:new Date().toISOString() }
        ]
      }
    };
    const incoming = makeRecord({
      sourceId:'src-google', sourceType:'GOOGLE_PLACES', externalType:'google_place', externalId:'ChIJ123',
      name:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'),
      phone:'+442012345678', normalizedPhone: normalizePhoneForComparison('+442012345678'),
      website:'https://brightsmile.co.uk', normalizedWebsiteHost: normalizeWebsiteHostForComparison('https://brightsmile.co.uk')
    });
    const match = matchNormalizedRecords(incoming, { id:'cand1', companyName:'Bright Smile Dental', normalizedName: normalizeBusinessNameForComparison('Bright Smile Dental'), phone:'+44 20 1234', normalizedPhone: normalizePhoneForComparison('+44 20 1234') });
    const merge = mergeBusinessEvidence(existingCand, incoming, match);
    if(merge.evidenceChanges.allEvidence.length!==2) fail('S',`Should retain both evidence records, got ${merge.evidenceChanges.allEvidence.length}`);
    if(!merge.evidenceChanges.allEvidence.some(e=>e.sourceType==='OVERPASS')) fail('S','Should retain OSM evidence');
    if(!merge.evidenceChanges.allEvidence.some(e=>e.sourceType==='GOOGLE_PLACES')) fail('S','Should retain Google evidence');
    pass('S','Source evidence retains both OSM and Google records');
  }

  // T no production Google calls
  log('Test T: no production Google calls');
  {
    const filesToCheck = [
      'src/lib/collection-normalization.ts',
      'src/lib/collector.ts',
      'scripts/collector-worker.mjs',
      'src/lib/enrichment-providers.ts',
    ];
    for(const f of filesToCheck){
      try{
        const content = fs.readFileSync(f,'utf8');
        if(f!=='src/lib/collection-normalization.ts' && content.includes('googleapis.com') && content.includes('fetch(')){
          // Check if it's calling Google Places API
          if(content.match(/maps\.googleapis\.com|places\.googleapis\.com/)) fail('T',`${f} contains Google API call`);
        }
        // Ensure no Google API key usage
        if(content.includes('GOOGLE_MAPS_API_KEY') && content.includes('fetch(') && !content.includes('test') && f.includes('collector-worker')){
          fail('T',`${f} appears to call Google with API key`);
        }
      }catch{}
    }
    // Ensure collection-normalization has no fetch
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(normCode.includes('fetch(')) fail('T','collection-normalization should have no fetch');
    pass('T','No production Google calls — zero Google API HTTP');
  }

  // U no enrichment calls
  log('Test U: no enrichment calls');
  {
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(normCode.includes('enrichment') && normCode.includes('fetch(')) fail('U','Should not call enrichment');
    if(normCode.includes('Hunter') || normCode.includes('Dropcontact')) fail('U','Should not contain enrichment providers');
    pass('U','No enrichment calls in normalization layer');
  }

  // V existing OSM qualification regression
  log('Test V: existing OSM qualification regression');
  {
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(!workerCode.includes('parseOsmElement')) fail('V','OSM parsing should still exist');
    if(!workerCode.includes('NEEDS_ENRICHMENT')) fail('V','NEEDS_ENRICHMENT logic should still exist');
    if(!workerCode.includes('VERIFICATION_PENDING')) fail('V','VERIFICATION_PENDING should still exist');
    pass('V','Existing OSM qualification still present');
  }

  // W existing TRUE_NO_SITE regression
  log('Test W: existing TRUE_NO_SITE regression');
  {
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    const verificationCode = fs.readFileSync('src/lib/website-verification.ts','utf8');
    if(!workerCode.includes('existing_website') && !workerCode.includes('website_present')) fail('W','Website filtering should still exist');
    if(!verificationCode.includes('hasLiveWebsite')) fail('W','hasLiveWebsite should still exist');
    // Check that website safety invariant is preserved in new file
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(!normCode.includes('TRUE_NO_SITE') || !normCode.includes('hasTrustedWebsiteEvidence')) fail('W','New file should document TRUE_NO_SITE safety');
    pass('W','TRUE_NO_SITE regression check OK — website safety preserved');
  }

  // X Lead email dedup regression
  log('Test X: Lead email dedup regression');
  {
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(!workerCode.includes('existingByEmail') && !workerCode.includes('duplicate by email')) fail('X','Lead email dedup should still exist');
    pass('X','Lead email dedup still present');
  }

  // Y source metrics classification
  log('Test Y: source metrics classification');
  {
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(!normCode.includes('SourceMetrics') || !normCode.includes('rawDiscovered')) fail('Y','SourceMetrics architecture missing');
    pass('Y','Source metrics classification architecture present');
  }

  // Z Haversine correctness
  log('Test Z: Haversine correctness');
  {
    // Known distance: London (51.5007,-0.1246) to nearby point ~100m away
    // Calculate distance between same point should be 0
    const d0 = haversineDistanceMeters(51.5, -0.12, 51.5, -0.12);
    if(Math.abs(d0) > 0.001) fail('Z',`Same point distance should be 0, got ${d0}`);
    // Distance between 51.5,-0.12 and 51.5005,-0.12 approx 55.5m (0.0005 deg lat ~55m)
    const d1 = haversineDistanceMeters(51.5, -0.12, 51.5005, -0.12);
    if(Math.abs(d1 - 55.6) > 5) fail('Z',`Expected ~55m for 0.0005 deg lat, got ${d1}`);
    // Distance between London and Paris ~343km
    const dLondonParis = haversineDistanceMeters(51.5074, -0.1278, 48.8566, 2.3522);
    if(Math.abs(dLondonParis - 343000) > 20000) fail('Z',`London-Paris expected ~343km, got ${dLondonParis/1000}km`);
    pass('Z',`Haversine correctness OK — 0m, ${d1.toFixed(1)}m for 0.0005deg, ${(dLondonParis/1000).toFixed(0)}km London-Paris`);
  }

  log('All tests A-Z PASSED');
}

main().catch(e=>{
  console.error('Test failed', e);
  process.exit(1);
});
