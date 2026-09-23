#!/usr/bin/env node
/**
 * Phase 4C.4C.1.1 — Google Adapter Contract Correction Tests A-R
 * ZERO GOOGLE NETWORK REQUESTS
 */

import fs from 'node:fs';

function log(m){ console.log(`[TEST] ${m}`); }
function pass(id,m){ console.log(`[PASS ${id}] ${m}`); }
function fail(id,m){ console.error(`[FAIL ${id}] ${m}`); throw new Error(`Test ${id} failed: ${m}`); }

async function main(){
  log('Starting Phase 4C.4C.1.1 Contract Correction Tests A-R');

  const adapterMod = await import('../src/lib/google-places-adapter.ts');
  const {
    SEARCH_ID_ONLY_MASK,
    SEARCH_DISCOVERY_MASK,
    PLACE_DETAILS_ESSENTIAL_MASK,
    PLACE_DETAILS_CONTACT_MASK,
    PLACE_DETAILS_FULL_MASK,
    TEXT_SEARCH_ESSENTIAL_MASK,
    NEARBY_SEARCH_MASK,
    buildTextSearchRequest,
    buildNearbySearchRequest,
    buildPlaceDetailsRequest,
    canonicalizePlaceId,
    validateNoWildcardFieldMask,
    isSearchMask,
    isDetailsMask,
  } = adapterMod;

  // A Place Details bare ID URL correct
  log('Test A: Place Details bare ID URL correct');
  {
    const req = buildPlaceDetailsRequest({ placeId: 'ChIJ123' });
    if(req.endpointUrl !== 'https://places.googleapis.com/v1/places/ChIJ123') fail('A',`Expected https://places.googleapis.com/v1/places/ChIJ123 got ${req.endpointUrl}`);
    if(req.endpoint !== 'places/ChIJ123') fail('A',`Expected endpoint places/ChIJ123 got ${req.endpoint}`);
    pass('A',`Bare ID URL correct — ${req.endpointUrl}`);
  }

  // B Place Details URL contains exactly one /places/
  log('Test B: Place Details URL contains exactly one /places/');
  {
    const req = buildPlaceDetailsRequest({ placeId: 'ChIJ123' });
    const url = req.endpointUrl;
    const matches = url.match(/\/places\//g) || [];
    if(matches.length !== 1) fail('B',`Expected exactly one /places/ in URL, got ${matches.length} in ${url}`);
    if(url.includes('/places/places/')) fail('B',`URL must NOT contain /places/places/ double — got ${url}`);
    pass('B',`URL contains exactly one /places/ — ${url}`);
  }

  // C resource-name input handled according to documented contract
  log('Test C: resource-name input handled');
  {
    // Contract: normalize places/ChIJ123 → ChIJ123, canonical externalId remains bare
    const req = buildPlaceDetailsRequest({ placeId: 'places/ChIJ123' });
    if(req.endpointUrl !== 'https://places.googleapis.com/v1/places/ChIJ123') fail('C',`Resource-name input should normalize to bare ID, expected https://places.googleapis.com/v1/places/ChIJ123 got ${req.endpointUrl}`);
    if(req.endpoint !== 'places/ChIJ123') fail('C',`Endpoint should be places/ChIJ123 after normalization, got ${req.endpoint}`);
    const { placeId, wasNormalized } = canonicalizePlaceId('places/ChIJ123');
    if(placeId !== 'ChIJ123') fail('C',`canonicalizePlaceId should return bare ChIJ123, got ${placeId}`);
    if(!wasNormalized) fail('C','wasNormalized should be true for resource-name input');
    // Document exact choice: normalize safely, canonical remains ChIJ123 not places/ChIJ123
    const docs = fs.readFileSync('docs/PHASE_4C.4C_GOOGLE_PLACES_ADAPTER.md','utf8');
    if(!docs.includes('normalize') || !docs.includes('places/ChIJ123') || !docs.includes('ChIJ123')) fail('C','Docs should document resource-name normalization');
    pass('C',`Resource-name input handled — places/ChIJ123 → ChIJ123, canonical remains bare`);
  }

  // D path injection rejected/encoded safely
  log('Test D: path injection rejected/encoded safely');
  {
    const malicious = [
      'ChIJ123/../etc/passwd',
      'ChIJ123/../../',
      'ChIJ123//evil',
      'ChIJ123\\evil',
      'ChIJ123?query=evil',
      'ChIJ123#fragment',
      'ChIJ123 with space',
      'ChIJ123&evil',
    ];
    for(const mid of malicious){
      try{
        buildPlaceDetailsRequest({ placeId: mid });
        fail('D',`Malicious placeId should be rejected: ${mid}`);
      }catch(e){
        if(!e.message.includes('INVALID_REQUEST')) fail('D',`Expected INVALID_REQUEST for ${mid}, got ${e.message}`);
      }
    }
    // Valid ID with safe encoding
    const req = buildPlaceDetailsRequest({ placeId: 'ChIJ123' });
    if(!req.endpointUrl.includes('ChIJ123')) fail('D','Valid ID should be in URL');
    pass('D','Path injection rejected/encoded safely OK');
  }

  // E Text Search mask uses places.* paths
  log('Test E: Text Search mask uses places.* paths');
  {
    const req = buildTextSearchRequest({ textQuery: 'dental London' });
    if(!req.fieldMask.split(',').every(f => f.startsWith('places.') || f === 'nextPageToken')) fail('E',`Text Search mask should use places.* paths, got ${req.fieldMask}`);
    if(!isSearchMask(req.fieldMask.split(','))) fail('E','isSearchMask should be true for Text Search');
    pass('E',`Text Search mask uses places.* paths OK — ${req.fieldMask.slice(0,60)}...`);
  }

  // F Nearby Search mask uses places.* paths
  log('Test F: Nearby Search mask uses places.* paths');
  {
    const req = buildNearbySearchRequest({
      locationRestriction: { circle: { center: { latitude: 51.5, longitude: -0.12 }, radius: 1000 } },
    });
    if(!req.fieldMask.split(',').every(f => f.startsWith('places.') || f === 'nextPageToken')) fail('F',`Nearby Search mask should use places.* paths, got ${req.fieldMask}`);
    if(!isSearchMask(req.fieldMask.split(','))) fail('F','isSearchMask should be true for Nearby');
    pass('F','Nearby Search mask uses places.* paths OK');
  }

  // G Place Details mask does NOT use places.* prefix
  log('Test G: Place Details mask does NOT use places.* prefix');
  {
    const req = buildPlaceDetailsRequest({ placeId: 'ChIJ123' });
    if(req.fieldMask.includes('places.')) fail('G',`Place Details mask must NOT use places.* prefix, got ${req.fieldMask}`);
    if(!isDetailsMask(req.fieldMask.split(','))) fail('G','isDetailsMask should be true for Place Details');
    // Explicit regression: ensure no accidental cross-use
    if(isSearchMask(req.fieldMask.split(','))) fail('G','Place Details mask should NOT be considered search mask');
    pass('G','Place Details mask does NOT use places.* prefix OK');
  }

  // H Search ID-only mask excludes displayName
  log('Test H: Search ID-only mask excludes displayName');
  {
    if(SEARCH_ID_ONLY_MASK.join(',').includes('displayName')) fail('H','SEARCH_ID_ONLY_MASK should exclude displayName');
    pass('H','Search ID-only mask excludes displayName OK');
  }

  // I Search ID-only mask excludes websiteUri
  log('Test I: Search ID-only mask excludes websiteUri');
  {
    if(SEARCH_ID_ONLY_MASK.join(',').includes('websiteUri')) fail('I','SEARCH_ID_ONLY_MASK should exclude websiteUri');
    pass('I','Search ID-only mask excludes websiteUri OK');
  }

  // J Search ID-only mask excludes phone
  log('Test J: Search ID-only mask excludes phone');
  {
    const maskStr = SEARCH_ID_ONLY_MASK.join(',').toLowerCase();
    if(maskStr.includes('phone')) fail('J','SEARCH_ID_ONLY_MASK should exclude phone fields');
    pass('J','Search ID-only mask excludes phone OK');
  }

  // K Search ID-only supports place ID
  log('Test K: Search ID-only supports place ID');
  {
    const maskStr = SEARCH_ID_ONLY_MASK.join(',');
    if(!maskStr.includes('places.id') || !maskStr.includes('places.name')) fail('K','SEARCH_ID_ONLY_MASK should contain places.id and places.name');
    pass('K','Search ID-only supports place ID OK — contains places.id and places.name');
  }

  // L Text Search pagination mask includes nextPageToken where required
  log('Test L: Text Search pagination mask includes nextPageToken');
  {
    if(!SEARCH_ID_ONLY_MASK.includes('nextPageToken')) fail('L','SEARCH_ID_ONLY_MASK should include nextPageToken for pagination (official example places.id,nextPageToken)');
    const req = buildTextSearchRequest({ textQuery: 'test', useIdOnly: true });
    if(!req.fieldMask.includes('nextPageToken')) fail('L','ID-only request field mask should include nextPageToken');
    // Verify against official docs example
    const docs = fs.readFileSync('docs/PHASE_4C.4C_GOOGLE_PLACES_ADAPTER.md','utf8');
    if(!docs.includes('places.id,nextPageToken') || !docs.includes('nextPageToken')) fail('L','Docs should document nextPageToken handling with places.id,nextPageToken example');
    pass('L','Text Search pagination mask includes nextPageToken OK');
  }

  // M contact mask isolates websiteUri
  log('Test M: contact mask isolates websiteUri');
  {
    const discoveryStr = SEARCH_DISCOVERY_MASK.join(',');
    const contactStr = PLACE_DETAILS_CONTACT_MASK.join(',') + ',' + adapterMod.CONTACT_FIELD_MASK.join(',');
    if(discoveryStr.includes('websiteUri')) fail('M','Discovery mask should NOT contain websiteUri — cost boundary');
    if(!contactStr.includes('websiteUri')) fail('M','Contact mask should contain websiteUri');
    pass('M','Contact mask isolates websiteUri OK — not in discovery, present in contact');
  }

  // N contact mask isolates phone fields
  log('Test N: contact mask isolates phone fields');
  {
    const discoveryStr = SEARCH_DISCOVERY_MASK.join(',').toLowerCase();
    if(discoveryStr.includes('phone')) fail('N','Discovery mask should NOT contain phone — cost boundary');
    const contactStr = PLACE_DETAILS_CONTACT_MASK.join(',').toLowerCase();
    if(!contactStr.includes('phone')) fail('N','Contact mask should contain phone fields');
    pass('N','Contact mask isolates phone fields OK');
  }

  // O wildcard absent
  log('Test O: wildcard absent');
  {
    const allMasks = [SEARCH_ID_ONLY_MASK, SEARCH_DISCOVERY_MASK, PLACE_DETAILS_ESSENTIAL_MASK, PLACE_DETAILS_CONTACT_MASK, PLACE_DETAILS_FULL_MASK];
    for(const mask of allMasks){
      if(!validateNoWildcardFieldMask(mask)) fail('O',`Mask contains wildcard: ${mask}`);
    }
    const code = fs.readFileSync('src/lib/google-places-adapter.ts','utf8');
    // Ensure no field mask constant contains "*"
    if(code.match(/FIELD_MASK.*=.*\[.*\*.*\]/)) fail('O','Field mask constant should not contain wildcard *');
    pass('O','Wildcard absent OK');
  }

  // P API key absent
  log('Test P: API key absent');
  {
    const req = buildPlaceDetailsRequest({ placeId: 'ChIJ123' });
    const snapshot = JSON.stringify(req);
    if(snapshot.includes('AIza') || snapshot.toLowerCase().includes('api_key') && req.headers['X-Goog-Api-Key']) fail('P','Builder snapshot should not contain API key');
    if(req.headers['X-Goog-Api-Key']) fail('P','Headers should not contain actual API key');
    pass('P','API key absent OK');
  }

  // Q no Google network
  log('Test Q: no Google network');
  {
    const code = fs.readFileSync('src/lib/google-places-adapter.ts','utf8');
    const realTransportSection = code.split('class RealGoogleTransport')[1] || '';
    if(realTransportSection.includes('fetch(') || realTransportSection.includes('axios') || realTransportSection.includes('https://places.googleapis.com/v1/places') && realTransportSection.includes('fetch')) {
      fail('Q','Real transport should not have fetch, should throw disabled');
    }
    if(!realTransportSection.includes('GOOGLE_NETWORK_TRANSPORT_DISABLED')) fail('Q','Real transport should throw GOOGLE_NETWORK_TRANSPORT_DISABLED');
    pass('Q','No Google network OK — Real transport throws disabled');
  }

  // R canonical externalId remains bare place_id
  log('Test R: canonical externalId remains bare place_id');
  {
    const { placeId } = canonicalizePlaceId('places/ChIJ123');
    if(placeId !== 'ChIJ123') fail('R','Canonical externalId should remain bare place_id ChIJ123');
    const { placeId: bare } = canonicalizePlaceId('ChIJ123');
    if(bare !== 'ChIJ123') fail('R','Bare ID should remain ChIJ123');
    // Also check normalizedFromGooglePlace
    const normMod = await import('../src/lib/collection-normalization.ts');
    const norm = normMod.normalizedFromGooglePlace({ place_id:'ChIJ123', name:'Test', geometry:{ location:{ lat:51.5, lng:-0.12 } } }, 'dental', 'src');
    if(norm.externalId !== 'ChIJ123') fail('R',`normalized externalId should be bare ChIJ123, got ${norm.externalId}`);
    pass('R','Canonical externalId remains bare place_id OK');
  }

  log('All tests A-R PASSED — contract correction verified');
}

main().catch(e=>{
  console.error('Test failed', e);
  process.exit(1);
});
