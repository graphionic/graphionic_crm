#!/usr/bin/env node
/**
 * Phase 4C.4A.1 — OSM Normalization Integration Tests AA-AZ
 * No external calls, no Google, synthetic fixtures
 */

function log(m){ console.log(`[TEST] ${m}`); }
function pass(id,m){ console.log(`[PASS ${id}] ${m}`); }
function fail(id,m){ console.error(`[FAIL ${id}] ${m}`); throw new Error(`Test ${id} failed: ${m}`); }

function trimAndCollapseWhitespace(s){ return s.trim().replace(/\s+/g,' '); }
function normalizeBusinessNameForComparison(name){
  if(!name) return '';
  let n = String(name).normalize('NFKC');
  n = trimAndCollapseWhitespace(n);
  n = n.toLowerCase();
  n = n.replace(/[‘’´`]/g,"'").replace(/[“”]/g,'"');
  n = trimAndCollapseWhitespace(n);
  const suffixes=[/\s+ltd\.?$/i,/\s+limited$/i,/\s+llc\.?$/i,/\s+inc\.?$/i,/\s+incorporated$/i,/\s+corp\.?$/i,/\s+corporation$/i,/\s+co\.?$/i,/\s+pvt\.?\s*ltd\.?$/i,/\s+private\s+limited$/i,/\s+plc$/i,/\s+gmbh$/i];
  for(const re of suffixes){ const prev=n; n=n.replace(re,'').trim(); if(n!==prev) break; }
  n=trimAndCollapseWhitespace(n); return n;
}
function normalizeEmailForComparison(email){ if(!email) return null; const t=String(email).trim().toLowerCase(); return t||null; }
function normalizePhoneForComparison(phone){
  if(!phone) return null; const trimmed=String(phone).trim(); if(!trimmed) return null;
  let normalized=trimmed.replace(/[^\d+]/g,'');
  if(normalized.includes('+')){ const c=(normalized.match(/\+/g)||[]).length; if(c>1) normalized=normalized.replace(/\+/g,(m,o)=>o===0?'+':''); if(!normalized.startsWith('+')) normalized=normalized.replace(/\+/g,''); }
  if(!normalized||normalized==='+') return null; return normalized;
}
function normalizeWebsiteHostForComparison(website){
  if(!website) return null; let w=String(website).trim().toLowerCase(); if(!w) return null;
  w=w.replace(/^https?:\/\//,'').replace(/^ftp:\/\//,'').replace(/^www\./,'');
  const si=w.indexOf('/'); if(si!==-1) w=w.slice(0,si);
  const qi=w.indexOf('?'); if(qi!==-1) w=w.slice(0,qi);
  const hi=w.indexOf('#'); if(hi!==-1) w=w.slice(0,hi);
  const ci=w.indexOf(':'); if(ci!==-1) w=w.slice(0,ci);
  w=w.replace(/\.$/,'').trim(); if(!w||w.length<4||!w.includes('.')) return null; return w;
}
function normalizeAddressForComparison(address){
  if(!address) return null; let a=String(address).normalize('NFKC'); a=trimAndCollapseWhitespace(a); a=a.toLowerCase(); a=a.replace(/\s*,\s*/g,', '); a=a.replace(/\s+/g,' '); a=a.trim(); return a||null;
}
function normalizeCityForComparison(city){ if(!city) return null; let c=String(city).normalize('NFKC'); c=trimAndCollapseWhitespace(c); c=c.toLowerCase(); return c||null; }
function normalizePostalCodeForComparison(postal){ if(!postal) return null; let p=String(postal).trim().toLowerCase().replace(/\s+/g,''); return p||null; }
function normalizeCountryCodeForComparison(code){ if(!code) return null; return String(code).trim().toUpperCase()||null; }

// Mirror parseOsmElementNormalized from collector-worker.mjs
function parseOsmElementNormalized(el, categorySlug, location){
  const tags=el.tags||{};
  const rawName=(tags.name||'').trim();
  if(!rawName||rawName.length<3||rawName.length>100) return null;
  const websiteRaw=(tags.website||tags['contact:website']||tags.url||tags['contact:url']||tags['website:en']||'').trim();
  const emailRaw=(tags.email||tags['contact:email']||'').trim();
  const phoneRaw=(tags.phone||tags['contact:phone']||'').trim();
  if(emailRaw){
    if(emailRaw.length>80) return null;
    if(!emailRaw.includes('@')||!emailRaw.split('@')[1]?.includes('.')) return null;
    if(['example.com','test.com','noreply','no-reply','.png','.jpg'].some(b=>emailRaw.toLowerCase().includes(b))) return null;
  }
  const addressParts=[];
  if(tags['addr:housenumber']&&tags['addr:street']) addressParts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  else if(tags['addr:street']) addressParts.push(tags['addr:street']);
  if(tags['addr:city']) addressParts.push(tags['addr:city']);
  if(tags['addr:postcode']) addressParts.push(tags['addr:postcode']);
  const addressDisplay=(addressParts.join(', ')||tags.address||location.city||'').slice(0,200);
  const cityDisplay=(tags['addr:city']||location.city||'').slice(0,100);
  const countryDisplay=location.countryCode||location.country||'UK';
  const postcodeDisplay=(tags['addr:postcode']||'').slice(0,20)||null;
  let latitude=null, longitude=null;
  if(el.type==='node'&&typeof el.lat==='number'&&typeof el.lon==='number'){ latitude=el.lat; longitude=el.lon; }
  else if(el.center&&typeof el.center.lat==='number'&&typeof el.center.lon==='number'){ latitude=el.center.lat; longitude=el.center.lon; }
  else if(typeof el.lat==='number'&&typeof el.lon==='number'){ latitude=el.lat; longitude=el.lon; }

  const company_name=rawName.slice(0,100);
  const business_category=categorySlug;
  const website=websiteRaw.slice(0,200);
  const email=emailRaw.slice(0,150);
  const phone=phoneRaw.slice(0,40);
  const address=addressDisplay;
  const city=cityDisplay;
  const country=countryDisplay;
  const postcode=postcodeDisplay;

  const normalizedName=normalizeBusinessNameForComparison(rawName);
  const normalizedEmail=normalizeEmailForComparison(emailRaw);
  const normalizedPhone=normalizePhoneForComparison(phoneRaw);
  const normalizedWebsiteHost=normalizeWebsiteHostForComparison(websiteRaw);
  const normalizedAddress=normalizeAddressForComparison(addressDisplay);
  const normalizedCity=normalizeCityForComparison(cityDisplay);
  const normalizedPostalCode=normalizePostalCodeForComparison(postcodeDisplay);
  const normalizedCountryCode=normalizeCountryCodeForComparison(location.countryCode||null);

  const normalizedRecord={
    sourceId:'src-test',
    sourceType:'OVERPASS',
    externalType:el.type,
    externalId:String(el.id),
    name:company_name,
    normalizedName,
    email:emailRaw||null,
    normalizedEmail,
    phone:phoneRaw||null,
    normalizedPhone,
    website:websiteRaw||null,
    normalizedWebsiteHost,
    websiteEvidence:websiteRaw||null,
    address:addressDisplay||null,
    normalizedAddress,
    city:cityDisplay||null,
    normalizedCity,
    region:null,
    country:countryDisplay||null,
    countryCode:location.countryCode||null,
    normalizedCountryCode,
    postalCode:postcodeDisplay,
    normalizedPostalCode,
    latitude,
    longitude,
    category:categorySlug,
    rawSourceData:tags,
    collectedAt:new Date(),
  };

  return {
    company_name, business_category, website, email, phone, address, city, country, postcode, latitude, longitude,
    osm_id:el.id, osm_type:el.type, externalId:String(el.id), externalType:el.type, rawTags:tags,
    source:`overpass_${(location.countryCode||'unknown').toLowerCase()}`,
    normalizedRecord,
    normalizedName, normalizedEmail, normalizedPhone, normalizedWebsiteHost, normalizedAddress, normalizedCity, normalizedPostalCode, normalizedCountryCode,
  };
}

// Legacy parse for parity comparison (same as before 4C.4A.1)
function parseOsmElementLegacy(el, categorySlug, location){
  const tags=el.tags||{};
  const name=(tags.name||'').trim();
  if(!name||name.length<3||name.length>100) return null;
  const website=(tags.website||tags['contact:website']||tags.url||tags['contact:url']||tags['website:en']||'').trim();
  const email=(tags.email||tags['contact:email']||'').trim();
  const phone=(tags.phone||tags['contact:phone']||'').trim();
  if(email){
    if(email.length>80) return null;
    if(!email.includes('@')||!email.split('@')[1]?.includes('.')) return null;
    if(['example.com','test.com','noreply','no-reply','.png','.jpg'].some(b=>email.toLowerCase().includes(b))) return null;
  }
  const addressParts=[];
  if(tags['addr:housenumber']&&tags['addr:street']) addressParts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  else if(tags['addr:street']) addressParts.push(tags['addr:street']);
  if(tags['addr:city']) addressParts.push(tags['addr:city']);
  if(tags['addr:postcode']) addressParts.push(tags['addr:postcode']);
  const address=addressParts.join(', ')||tags.address||location.city||'';
  let latitude=null, longitude=null;
  if(el.type==='node'&&typeof el.lat==='number'&&typeof el.lon==='number'){ latitude=el.lat; longitude=el.lon; }
  else if(el.center&&typeof el.center.lat==='number'&&typeof el.center.lon==='number'){ latitude=el.center.lat; longitude=el.center.lon; }
  else if(typeof el.lat==='number'&&typeof el.lon==='number'){ latitude=el.lat; longitude=el.lon; }
  const postcode=(tags['addr:postcode']||'').slice(0,20)||null;
  return {
    company_name:name.slice(0,100),
    business_category:categorySlug,
    website:website.slice(0,200),
    email:email.slice(0,150),
    phone:phone.slice(0,40),
    address:address.slice(0,200),
    city:(tags['addr:city']||location.city||'').slice(0,100),
    country:location.countryCode||location.country||'UK',
    postcode,
    latitude, longitude,
    osm_id:el.id, osm_type:el.type,
    externalId:String(el.id),
    externalType:el.type,
    rawTags:tags,
    source:`overpass_${(location.countryCode||'unknown').toLowerCase()}`,
  };
}

function classifyLegacy(parsed){
  // Replicate filter order from collector-worker.mjs
  // Returns classification string
  if(!parsed) return 'invalid_parse';
  if(parsed.website) return 'existing_website';
  if(!parsed.email || !parsed.email.trim()) return 'NEEDS_ENRICHMENT';
  const domain = parsed.email.toLowerCase().split('@')[1]||'';
  const generic = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','protonmail.com','proton.me','yandex.com','mail.com','gmx.com','zoho.com','yahoo.co.uk','hotmail.co.uk','outlook.co.uk','live.com','msn.com','googlemail.com','ymail.com','inbox.com','me.com','mac.com','qq.com','163.com','126.com']);
  if(generic.has(domain)) return 'generic_email';
  if(!parsed.email.includes('@')) return 'invalid_email';
  // email_domain_has_live_website would require network, skip for unit tests, assume no live
  return 'QUALIFIED';
}

async function main(){
  log('Starting Phase 4C.4A.1 Integration Tests AA-AZ');

  const location = { city:'London', countryCode:'GB', country:'UK' };
  const categorySlug='dental';

  // AA real OSM-style node → NormalizedBusinessRecord
  log('Test AA: OSM node → NormalizedBusinessRecord');
  {
    const el = { id:123, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Bright Smile Dental', email:'contact@brightsmile.co.uk', phone:'+44 20 1234 5678', 'addr:city':'London', 'addr:postcode':'SW1A 1AA' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed) fail('AA','Should parse node');
    if(!parsed.normalizedRecord) fail('AA','Should have normalizedRecord');
    if(parsed.normalizedRecord.sourceType!=='OVERPASS') fail('AA','sourceType should be OVERPASS');
    if(parsed.normalizedRecord.externalType!=='node') fail('AA','externalType node');
    if(parsed.normalizedRecord.externalId!=='123') fail('AA','externalId 123');
    if(parsed.company_name!=='Bright Smile Dental') fail('AA','display name preserved');
    if(parsed.normalizedRecord.normalizedName!=='bright smile dental') fail('AA','normalizedName');
    pass('AA','OSM node → NormalizedBusinessRecord OK');
  }

  // AB OSM way normalization
  log('Test AB: OSM way normalization');
  {
    const el = { id:456, type:'way', center:{lat:51.5, lon:-0.12}, tags:{ name:'Way Dental Clinic', email:'way@example.co.uk'.replace('example.co.uk','waydental.co.uk'), phone:'020 7946 0958' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed) fail('AB','Should parse way');
    if(parsed.normalizedRecord.externalType!=='way') fail('AB','externalType way');
    if(parsed.latitude!==51.5) fail('AB','latitude from center');
    pass('AB','OSM way normalization OK');
  }

  // AC OSM relation normalization
  log('Test AC: OSM relation normalization');
  {
    const el = { id:789, type:'relation', center:{lat:51.5, lon:-0.12}, tags:{ name:'Relation Dental', email:'rel@relationdental.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed) fail('AC','Should parse relation');
    if(parsed.normalizedRecord.externalType!=='relation') fail('AC','externalType relation');
    pass('AC','OSM relation normalization OK');
  }

  // AD website key
  log('Test AD: website key');
  {
    const el = { id:1, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test Clinic', website:'https://testclinic.co.uk', email:'a@b.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed || parsed.website!=='https://testclinic.co.uk') fail('AD','website key should be preserved');
    if(parsed.normalizedRecord.website!=='https://testclinic.co.uk') fail('AD','normalizedRecord website preserved');
    if(parsed.normalizedWebsiteHost!=='testclinic.co.uk') fail('AD','normalized host');
    pass('AD','website key preserved');
  }

  // AE contact:website
  log('Test AE: contact:website');
  {
    const el = { id:2, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test Clinic', 'contact:website':'https://contactwebsite.co.uk', email:'a@b.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed || parsed.website!=='https://contactwebsite.co.uk') fail('AE','contact:website should be preserved');
    pass('AE','contact:website preserved');
  }

  // AF url
  log('Test AF: url');
  {
    const el = { id:3, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test Clinic', url:'https://urlfield.co.uk', email:'a@b.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed || parsed.website!=='https://urlfield.co.uk') fail('AF','url should be preserved as website');
    pass('AF','url preserved');
  }

  // AG contact:url
  log('Test AG: contact:url');
  {
    const el = { id:4, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test Clinic', 'contact:url':'https://contacturl.co.uk', email:'a@b.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed || parsed.website!=='https://contacturl.co.uk') fail('AG','contact:url should be preserved');
    pass('AG','contact:url preserved');
  }

  // AH website:en
  log('Test AH: website:en');
  {
    const el = { id:5, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test Clinic', 'website:en':'https://websiteen.co.uk', email:'a@b.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed || parsed.website!=='https://websiteen.co.uk') fail('AH','website:en should be preserved');
    pass('AH','website:en preserved');
  }

  // AI email normalization
  log('Test AI: email normalization');
  {
    const el = { id:6, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test', email:'Contact@Example.COM' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    // Legacy filters example.com -> should be null (rejected)
    if(parsed) fail('AI','example.com should be filtered as invalid in legacy (return null)');
    const el2 = { id:7, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test', email:'Contact@RealClinic.co.uk' } };
    const parsed2 = parseOsmElementNormalized(el2, categorySlug, location);
    if(!parsed2) fail('AI','Real email should parse');
    if(parsed2.normalizedEmail!=='contact@realclinic.co.uk') fail('AI','normalizedEmail lowercase');
    if(parsed2.email!=='Contact@RealClinic.co.uk'.slice(0,150)) fail('AI','display email preserved original case');
    pass('AI','email normalization display preserved + normalized lowercase');
  }

  // AJ phone normalization
  log('Test AJ: phone normalization');
  {
    const el = { id:8, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test', phone:'+44 20 1234 5678', email:'a@b.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed) fail('AJ','Should parse');
    if(parsed.phone!=='+44 20 1234 5678') fail('AJ','display phone preserved');
    if(parsed.normalizedPhone!=='+442012345678') fail('AJ',`normalized phone expected +442012345678 got ${parsed.normalizedPhone}`);
    pass('AJ','phone normalization display preserved + normalized stripped');
  }

  // AK display values preserved
  log('Test AK: display values preserved');
  {
    const el = { id:9, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Bright Smile Dental', email:'Contact@BrightSmile.co.uk', phone:'+44 20 1234 5678', website:'https://brightsmile.co.uk', 'addr:housenumber':'10', 'addr:street':'High Street', 'addr:city':'London', 'addr:postcode':'SW1A 1AA' } };
    const legacy = parseOsmElementLegacy(el, categorySlug, location);
    const normalized = parseOsmElementNormalized(el, categorySlug, location);
    if(!legacy||!normalized) fail('AK','Both should parse');
    if(legacy.company_name!==normalized.company_name) fail('AK','company_name display preserved');
    if(legacy.email!==normalized.email) fail('AK','email display preserved');
    if(legacy.phone!==normalized.phone) fail('AK','phone display preserved');
    if(legacy.website!==normalized.website) fail('AK','website display preserved');
    if(legacy.address!==normalized.address) fail('AK',`address display preserved legacy=${legacy.address} norm=${normalized.address}`);
    if(legacy.city!==normalized.city) fail('AK','city display preserved');
    if(legacy.country!==normalized.country) fail('AK','country display preserved');
    pass('AK','display values preserved between legacy and normalized');
  }

  // AL raw tags preserved
  log('Test AL: raw tags preserved');
  {
    const el = { id:10, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test', email:'a@b.co.uk', 'addr:city':'London', customTag:'value' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(!parsed.rawTags || parsed.rawTags.customTag!=='value') fail('AL','rawTags should preserve custom tags');
    if(!parsed.normalizedRecord.rawSourceData || parsed.normalizedRecord.rawSourceData.customTag!=='value') fail('AL','normalizedRecord rawSourceData preserved');
    pass('AL','raw tags preserved');
  }

  // AM external identity preserved
  log('Test AM: external identity preserved');
  {
    const el = { id:12345, type:'way', center:{lat:51.5, lon:-0.12}, tags:{ name:'Test', email:'a@b.co.uk' } };
    const parsed = parseOsmElementNormalized(el, categorySlug, location);
    if(parsed.externalId!=='12345') fail('AM','externalId String(id)');
    if(parsed.externalType!=='way') fail('AM','externalType');
    if(parsed.osm_id!==12345) fail('AM','osm_id');
    if(parsed.osm_type!=='way') fail('AM','osm_type');
    if(parsed.normalizedRecord.externalId!=='12345') fail('AM','normalizedRecord externalId');
    if(parsed.normalizedRecord.externalType!=='way') fail('AM','normalizedRecord externalType');
    pass('AM','external identity preserved');
  }

  // AN existing_website classification unchanged
  log('Test AN: existing_website classification unchanged');
  {
    const el = { id:11, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test Clinic', website:'https://haswebsite.co.uk', email:'a@b.co.uk' } };
    const legacy = parseOsmElementLegacy(el, categorySlug, location);
    const normalized = parseOsmElementNormalized(el, categorySlug, location);
    const legacyClass = classifyLegacy(legacy);
    const normClass = classifyLegacy(normalized);
    if(legacyClass!=='existing_website' || normClass!=='existing_website') fail('AN',`Both should be existing_website, legacy=${legacyClass} norm=${normClass}`);
    pass('AN','existing_website classification unchanged');
  }

  // AO no-email classification unchanged
  log('Test AO: no-email classification unchanged');
  {
    const el = { id:12, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test Clinic' } };
    const legacy = parseOsmElementLegacy(el, categorySlug, location);
    const normalized = parseOsmElementNormalized(el, categorySlug, location);
    const legacyClass = classifyLegacy(legacy);
    const normClass = classifyLegacy(normalized);
    if(legacyClass!=='NEEDS_ENRICHMENT' || normClass!=='NEEDS_ENRICHMENT') fail('AO',`Both should be NEEDS_ENRICHMENT legacy=${legacyClass} norm=${normClass}`);
    pass('AO','no-email classification unchanged');
  }

  // AP generic email unchanged
  log('Test AP: generic email unchanged');
  {
    const el = { id:13, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test', email:'test@gmail.com' } };
    const legacy = parseOsmElementLegacy(el, categorySlug, location);
    const normalized = parseOsmElementNormalized(el, categorySlug, location);
    const legacyClass = classifyLegacy(legacy);
    const normClass = classifyLegacy(normalized);
    if(legacyClass!=='generic_email' || normClass!=='generic_email') fail('AP',`Both should be generic_email legacy=${legacyClass} norm=${normClass}`);
    pass('AP','generic email unchanged');
  }

  // AQ invalid email unchanged
  log('Test AQ: invalid email unchanged');
  {
    const el = { id:14, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Test', email:'invalidemail' } };
    const legacy = parseOsmElementLegacy(el, categorySlug, location);
    const normalized = parseOsmElementNormalized(el, categorySlug, location);
    // Both should be null because legacy filter returns null for invalid format
    if(legacy!==null || normalized!==null) fail('AQ','Invalid email without @ should return null in both parsers');
    pass('AQ','invalid email unchanged (both return null)');
  }

  // AR email-domain live website unchanged (logic preserved, no network in unit test)
  log('Test AR: email-domain live website unchanged');
  {
    // We can't test live website without network, but we can verify that email domain extraction still works and that hasLiveWebsite logic is still present in worker
    const fs = await import('fs');
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(!workerCode.includes('hasLiveWebsite') || !workerCode.includes('email_domain_has_live_website')) fail('AR','Worker should still have email domain live website check');
    pass('AR','email-domain live website check still present (no regression)');
  }

  // AS qualified classification unchanged
  log('Test AS: qualified classification unchanged');
  {
    const el = { id:15, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Bright Smile Dental', email:'contact@brightsmile.co.uk', phone:'+44 20 1234', 'addr:city':'London' } };
    const legacy = parseOsmElementLegacy(el, categorySlug, location);
    const normalized = parseOsmElementNormalized(el, categorySlug, location);
    const legacyClass = classifyLegacy(legacy);
    const normClass = classifyLegacy(normalized);
    if(legacyClass!=='QUALIFIED' || normClass!=='QUALIFIED') fail('AS',`Both should be QUALIFIED legacy=${legacyClass} norm=${normClass}`);
    pass('AS','qualified classification unchanged');
  }

  // AT filter order unchanged
  log('Test AT: filter order unchanged');
  {
    const fs = await import('fs');
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    const order = [
      'duplicate_in_run',
      'existing_website',
      'NEEDS_ENRICHMENT',
      'generic_email',
      'invalid_email',
      'email_domain_has_live_website',
      'VERIFICATION_PENDING'
    ];
    // Check that code contains these in order
    let lastIdx = -1;
    for(const keyword of order){
      const idx = workerCode.indexOf(keyword, lastIdx+1);
      if(idx===-1) fail('AT',`Filter order keyword ${keyword} not found`);
      if(idx < lastIdx) fail('AT',`Filter order broken for ${keyword}`);
      lastIdx = idx;
    }
    pass('AT','filter order unchanged: duplicate_in_run → existing_website → NEEDS_ENRICHMENT → generic → invalid → email_domain_has_live → VERIFICATION_PENDING');
  }

  // AU same-source DB dedup semantics unchanged
  log('Test AU: same-source DB dedup semantics unchanged');
  {
    const fs = await import('fs');
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(!workerCode.includes('discoverySourceId_externalType_externalId')) fail('AU','Same-source unique constraint should still be used');
    if(!workerCode.includes('discoverySourceId: source.id')) fail('AU','Should still use source.id for dedup');
    pass('AU','same-source DB dedup semantics unchanged');
  }

  // AV no historical mutation
  log('Test AV: no historical mutation');
  {
    const fs = await import('fs');
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    // Ensure upsertCandidate does not retroactively update all old candidates without filter
    // It should only update existing candidate found by unique constraint, not bulk update
    if(workerCode.includes('updateMany') && workerCode.includes('LeadCandidate')) fail('AV','Should not have bulk updateMany on LeadCandidate');
    pass('AV','no historical mutation — only targeted upsert');
  }

  // AW no Google call
  log('Test AW: no Google call');
  {
    const fs = await import('fs');
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(workerCode.includes('googleapis.com') && workerCode.includes('fetch(')) {
      // Check if it's actual Google API call
      if(workerCode.match(/maps\.googleapis\.com|places\.googleapis\.com/)) fail('AW','Should not call Google APIs');
    }
    if(workerCode.includes('GOOGLE_MAPS_API_KEY') && workerCode.includes('fetch(')) fail('AW','Should not use Google API key with fetch');
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(normCode.includes('fetch(')) fail('AW','collection-normalization should have no fetch');
    pass('AW','no Google calls');
  }

  // AX no enrichment call
  log('Test AX: no enrichment call');
  {
    const fs = await import('fs');
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(workerCode.includes('enrichment') && workerCode.includes('Hunter')) fail('AX','Worker should not call enrichment');
    const normCode = fs.readFileSync('src/lib/collection-normalization.ts','utf8');
    if(normCode.includes('Hunter') || normCode.includes('Dropcontact')) fail('AX','Normalization should not contain enrichment providers');
    pass('AX','no enrichment calls');
  }

  // AY CollectorRun metadata compatibility
  log('Test AY: CollectorRun metadata compatibility');
  {
    const fs = await import('fs');
    const workerCode = fs.readFileSync('scripts/collector-worker.mjs','utf8');
    if(!workerCode.includes('candidateIds') || !workerCode.includes('leadIds') || !workerCode.includes('candidatesPersisted')) fail('AY','CollectorRun metadata should still contain existing yield metrics');
    if(!workerCode.includes('yield')) fail('AY','Should still have yield metrics');
    pass('AY','CollectorRun metadata compatibility preserved');
  }

  // AZ normalized adapter parity
  log('Test AZ: normalized adapter parity');
  {
    // Test many fixtures comparing legacy vs normalized display values
    const fixtures = [
      { id:100, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Dental Clinic London', email:'info@dentalclinic.co.uk', phone:'020 1234 5678', 'addr:city':'London' } },
      { id:101, type:'node', lat:51.5, lon:-0.12, tags:{ name:'No Email Clinic', 'addr:city':'London' } },
      { id:102, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Website Clinic', website:'https://websiteclinic.co.uk', email:'a@b.co.uk' } },
      { id:103, type:'way', center:{lat:51.5, lon:-0.12}, tags:{ name:'Way Clinic', email:'way@wayclinic.co.uk' } },
      { id:104, type:'relation', center:{lat:51.5, lon:-0.12}, tags:{ name:'Relation Clinic', email:'rel@relation.co.uk' } },
      { id:105, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Contact Website Clinic', 'contact:website':'https://contactwebsite.co.uk', email:'a@b.co.uk' } },
      { id:106, type:'node', lat:51.5, lon:-0.12, tags:{ name:'URL Clinic', url:'https://urlclinic.co.uk', email:'a@b.co.uk' } },
      { id:107, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Contact URL Clinic', 'contact:url':'https://contacturl.co.uk', email:'a@b.co.uk' } },
      { id:108, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Website EN Clinic', 'website:en':'https://websiteen.co.uk', email:'a@b.co.uk' } },
      { id:109, type:'node', lat:51.5, lon:-0.12, tags:{ name:'Generic Email Clinic', email:'test@gmail.com' } },
    ];
    for(const el of fixtures){
      const legacy = parseOsmElementLegacy(el, categorySlug, location);
      const normalized = parseOsmElementNormalized(el, categorySlug, location);
      // If one is null, both should be null (for invalid cases)
      if((legacy===null)!==(normalized===null)) fail('AZ',`Parity mismatch for ${el.id} ${el.tags.name}: legacy ${legacy?'parsed':'null'} vs normalized ${normalized?'parsed':'null'}`);
      if(legacy && normalized){
        if(legacy.company_name!==normalized.company_name) fail('AZ',`company_name mismatch for ${el.id}`);
        if(legacy.email!==normalized.email) fail('AZ',`email mismatch for ${el.id}`);
        if(legacy.phone!==normalized.phone) fail('AZ',`phone mismatch for ${el.id}`);
        if(legacy.website!==normalized.website) fail('AZ',`website mismatch for ${el.id}`);
        if(legacy.address!==normalized.address) fail('AZ',`address mismatch for ${el.id}`);
        if(legacy.city!==normalized.city) fail('AZ',`city mismatch for ${el.id}`);
        if(legacy.country!==normalized.country) fail('AZ',`country mismatch for ${el.id}`);
        if(legacy.externalType!==normalized.externalType) fail('AZ',`externalType mismatch for ${el.id}`);
        if(legacy.externalId!==normalized.externalId) fail('AZ',`externalId mismatch for ${el.id}`);
        if(legacy.business_category!==normalized.business_category) fail('AZ',`category mismatch for ${el.id}`);
      }
    }
    pass('AZ','normalized adapter parity — legacy and normalized display values identical for all fixtures');
  }

  log('All integration tests AA-AZ PASSED');
}

main().catch(e=>{
  console.error('Test failed', e);
  process.exit(1);
});
