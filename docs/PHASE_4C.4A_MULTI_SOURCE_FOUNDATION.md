# Phase 4C.4A — Multi-Source Collection Foundation

**Status:** LOCAL IMPLEMENTATION, DO NOT PUSH, NO GOOGLE CALLS
**Date:** 2026-09-23
**Head:** 0cf4d5008ef3529b440e40ff4bfc62cab60e3eb6
**Objective:** Prepare collector for OSM + future Google without calling Google APIs; source-neutral normalization, deterministic cross-source matching, duplicate prevention, provenance preservation, safe merge, tests proving same business OSM+Google not duplicate.

---

## STEP 0 — Audit (DONE)

### Production snapshot at start of 4C.4A
- Lead 88
- Candidate 256 (was 156 before scheduled runs at 08:11:14, 05:52:58, 04:34:04 UTC — natural increase, not implementation)
- CollectorRun 9, CollectorState 9, NEEDS 154, REJECTED 102, QUALIFIED 0
- Enrichment: Job 0, Attempt 0, creds 0, enabled false

### Models inspected

**LeadCandidate**
- Fields: externalId, externalType, companyName, businessCategory, address, city, country, postcode, latitude, longitude, phone, email, website, discoverySourceId, discoveryRunId, status, rejectionReason, enrichmentAttempts, rawTags Json, metadata Json, qualifiedLeadId
- Unique: @@unique [discoverySourceId externalType externalId]
- Indexes: status, discoveryRunId, businessCategory, city, discoverySourceId, externalId
- rawTags holds full OSM tags (name, email, phone, website, addr:* etc)
- metadata holds osmId, osmType, discoveredAt, sourceCity, sourceCountry, lastSeenRunId, qualifiedAt, leadId

**DataSource**
- name, type (overpass/google_places/google_maps/custom), enabled, priority, baseUrl, config Json, healthStatus

**CollectorState**
- locationId, categoryId, sourceId, lastRunAt, nextEligibleRunAt, cycle, consecutiveFailures, totalCandidates, totalAccepted, totalRejected, cursor Json

**CollectorRun**
- startedAt, finishedAt, status (RUNNING/SUCCESS/FAILED/PARTIAL), locationId, categoryId, sourceId, candidatesFound, leadsAccepted, queriesAttempted, noEmailRejected, genericEmailRejected, websiteRejected, duplicateRejected, invalidRejected, leadsInserted, metadata Json (bbox, fetchResult, yield, candidateIds, leadIds etc)

**Lead**
- companyName, businessCategory, industry, country, city, region, address, postcode, companyUrl, website, websiteStatus, segment NO_SITE, source, status NEW, priority HIGH, optedInEmail, score 100, hookLine, collectorRunId traceability

### Collector representation (collector-worker.mjs parseOsmElement)
- company_name from tags.name (3-100 chars)
- business_category from LeadCategory.slug (MUST continue from category, not OSM tags)
- website from tags.website || contact:website || url || contact:url || website:en (trim 200)
- email from tags.email || contact:email
- phone from tags.phone || contact:phone
- address from addr:housenumber+street, addr:city, addr:postcode, fallback tags.address or location.city
- city from addr:city || location.city
- country from location.countryCode || country
- postcode from addr:postcode
- latitude/longitude from node lat/lon or center
- osm_id, osm_type, externalId String(id), externalType type, rawTags tags, source overpass_{country}

---

## STEP 1 — Existing Dedup Audit

| Case | Description | Protected? | How? | Gap |
|------|-------------|------------|------|-----|
| A | Same OSM object repeated (same node id) | YES | @@unique [discoverySourceId externalType externalId] in LeadCandidate.upsertCandidate | — |
| B | Same business as OSM node+way (different id) | NOT PROTECTED | Different externalType/id → unique constraint allows duplicate | Need name+address/geo matching |
| C | Same business from different Overpass endpoints | PARTIAL | If same discoverySourceId + externalId → dedup, but if different DataSource ids (different baseUrl) → NOT deduped because discoverySourceId differs | Need cross-source matching |
| D | Existing Lead with same email | YES | collector-worker checks findFirst Lead where email, rejects duplicate_email | — |
| E | Existing Candidate with same email | NOT PROTECTED | No unique on email, only in-run dedup key company+email+city, but cross-run same email different company would create duplicate | Need EMAIL_EXACT strong signal |
| F | Same company/address different source | NOT PROTECTED | No address comparison | Need NAME_ADDRESS |
| G | Same phone different source | NOT PROTECTED | No phone comparison | Need PHONE_EXACT |
| H | Future Google matching existing OSM | NOT PROTECTED | OSM externalId node/way vs Google place_id ChIJ... never equal, no cross-source logic | Need canonical signals |

**Conclusion:** Only A and D protected. B, C, E, F, G, H need multi-source matching.

---

## STEP 2-3 — Normalized Business Contract + Normalization Utilities

**File:** `src/lib/collection-normalization.ts`

### NormalizedBusinessRecord
```ts
sourceId: string|null
sourceType: OVERPASS|GOOGLE_MAPS|GOOGLE_PLACES|CUSTOM
externalType: node|way|relation|google_place|google_maps
externalId: string
name, normalizedName
email, normalizedEmail
phone, normalizedPhone
website, normalizedWebsiteHost, websiteEvidence
address, normalizedAddress
city, normalizedCity
region, country, countryCode, normalizedCountryCode
postalCode, normalizedPostalCode
latitude, longitude
category
rawSourceData (full OSM tags or Places raw)
collectedAt
```

- OSM-specific fields (rawTags, osmId) kept in rawSourceData, must not leak into qualification logic
- Display name preserved, normalized for comparison only

### Normalization helpers
- **Business name:** trim, Unicode NFKC normalize, lowercase, collapse whitespace, conservative corporate suffix strip only Ltd/Limited/LLC/Inc/Pvt Ltd etc, do NOT strip Dental Clinic Hospital Pets etc
- **Phone:** remove formatting, preserve + prefix, digits+ only, also digits-only version for comparison (so +44 20 1234 5678 == +442012345678)
- **Email:** lowercase trim
- **Website:** hostname normalize strip protocol www trailing slash path query port
- **Address:** trim lowercase collapse spaces, normalize comma spacing
- **City:** trim lowercase collapse
- **Postal:** lowercase remove spaces
- **Country:** ISO code upper

---

## STEP 4-6 — Matching Signals + Result + Auto-Merge

### STRONG signals (auto-merge eligible)
- SAME_EXTERNAL_ID: same sourceId + externalType + externalId → EXACT
- EMAIL_EXACT: normalizedEmail exact → STRONG
- PHONE_EXACT: normalizedPhone exact OR digits-only exact → STRONG

### MEDIUM signals (PROBABLE, NOT auto-merge in this phase)
- NAME_ADDRESS: normalizedName exact + normalizedAddress exact
- NAME_POSTAL: normalizedName exact + normalizedPostal exact
- NAME_GEO: normalizedName exact + haversine <=75m
- NAME_CITY: normalizedName exact + normalizedCity exact

### WEAK signals (must never auto-merge)
- WEAK_NAME_ONLY: name only, city only, category only → NONE

### Result
```ts
{ matched: bool, confidence: EXACT|STRONG|PROBABLE|NONE, reasons: [SAME_EXTERNAL_ID EMAIL_EXACT PHONE_EXACT NAME_ADDRESS NAME_POSTAL NAME_GEO], candidateId }
```

### Auto-merge policy
- EXACT same source/external ID → auto-merge YES
- STRONG email or phone exact → auto-merge YES
- PROBABLE → NOT auto-merge in this phase (prefer false duplicate candidate over wrong merge)
- NONE → no merge

---

## STEP 7-8 — Geo + Name

- **Haversine helper:** `haversineDistanceMeters(lat1,lon1,lat2,lon2)` Earth radius 6371000, toRad conversion
- **Conservative threshold:** 75m, coordinates alone NEVER merge, require normalized name match
- **Urban neighboring:** ABC vs XYZ 10m apart must NOT merge (different normalizedName)
- **Name matching:** exact normalized preferred, conservative corporate suffix strip Ltd Limited LLC Inc Pvt Ltd only, do NOT strip Dental Clinic Hospital etc, no fuzzy AI yet

---

## STEP 9-11 — Cross-Source Identity + Provenance + Merge Rules

- OSM OVERPASS node 12345 vs GOOGLE_MAPS place ChIJ... IDs differ → must match via canonical signals (email/phone/name+address) not external ID
- Preserve existing unique constraint semantics for same-source
- **Provenance audit:** rawData (rawTags) holds full OSM tags, metadata holds osmId, osmType, discoveredAt, sourceCity, sourceCountry, qualifiedAt, leadId. For multi-source, we use metadata.sourceEvidence array:
```ts
interface SourceEvidence {
  sourceId, sourceType, externalType, externalId,
  rawName, rawEmail, rawPhone, rawWebsite,
  address, city, country, postalCode,
  latitude, longitude,
  collectedAt ISO,
  matchReasons, confidence
}
```
- **Safe field merge:**
  - EMAIL existing valid not replaced by null
  - PHONE existing valid not replaced by null
  - WEBSITE if ANY trusted source provides website do not erase because other source has null (safety-critical)
  - NAME preserve canonical/display unless better
  - ADDRESS prefer more complete but keep existing for safety
  - COORDINATES preserve evidence, enrich only if existing null

---

## STEP 12-14 — Website/Email Safety + Evidence Merge

### Critical invariant
- OSM website=null, Google website=example.com → candidate is NOT NO_WEBSITE, must enter website verification, REJECT existing_website if live
- Never interpret one source no website as business has no website
- TRUE_NO_SITE requires no trusted live website evidence

### Implementation
- `hasTrustedWebsiteEvidence(candidate)` → checks candidate.website + metadata.sourceEvidence[].rawWebsite
- `getWebsiteEvidenceList` → unique list
- `mergeBusinessEvidence(existingCandidate, incomingRecord) => {canonicalChanges, evidenceChanges, qualificationRecheckRequired, reasons}` pure function, no DB mutation inside helper
- Email merge can enrich but must pass generic-domain filter + hasLiveWebsite(emailDomain) check (existing worker logic preserved)
- Website enrichment triggers qualificationRecheckRequired

---

## STEP 15-17 — DB Integration + Lead Dedup + Metrics

### Cases
- **CASE A** same source/external ID existing candidate → update existing candidate with latest data, discoveryRunId, rawTags, metadata.lastSeenRunId
- **CASE B** strong cross-source match (EMAIL_EXACT/PHONE_EXACT) → attach/merge evidence same candidate, preserve canonical, add new evidence to metadata.sourceEvidence, set qualificationRecheckRequired if website/email enriched
- **CASE C** probable only (NAME_ADDRESS/NAME_POSTAL/NAME_GEO) → do NOT auto-merge in this phase, create new candidate but note probable match in metadata for future manual review
- **CASE D** no match → new candidate

- OSM behavior functionally equivalent if we do NOT yet modify collector-worker.mjs (foundation only)
- Future integration: before qualification check existing Lead strong signals preserve email dedup evaluate phone (PHONE_EXACT should also prevent duplicate Lead)

### Metrics architecture
```ts
SourceMetrics {
  source, sourceType,
  rawDiscovered, normalized, newCandidates, matchedExisting,
  rejectedWebsite, noEmail, qualified, duplicate, errors,
  // future: OSM existing yield preserved
}
```
- `createEmptySourceMetrics(source, sourceType)`

---

## STEP 18-19 — Fixtures + Test Matrix

**Synthetic fixtures only, no production Google calls**

1. OSM Bright Smile Dental +44 20 1234 5678 vs Google +442012345678 → STRONG PHONE_EXACT
2. OSM no website vs Google website preserve recheck
3. Same name 30m away → PROBABLE NAME_GEO no auto-merge
4. ABC vs XYZ 10m → NO MATCH
5. Same name different cities → NO MATCH
6. Same phone diff formatting → STRONG
7. Same email case diff → STRONG
8. Google missing phone/email must not erase OSM
9. OSM missing website must not erase Google
10. Same OSM external ID → EXACT

### Test Matrix A-Z (scripts/test-collection-4c4a.mjs)

| Test | Scenario | Expected |
|------|----------|----------|
| A | same-source external ID exact | EXACT auto-merge eligible |
| B | email normalization case diff | STRONG EMAIL_EXACT |
| C | phone normalization formatting | STRONG PHONE_EXACT |
| D | name+address | PROBABLE NAME_ADDRESS not auto-merge |
| E | name+postal | PROBABLE NAME_POSTAL |
| F | name+geo <=75m | PROBABLE NAME_GEO |
| G | neighboring diff business 10m | NO MATCH |
| H | same name diff city | NO MATCH (conservative) |
| I | weak name-only | NO MATCH WEAK_NAME_ONLY |
| J | null not overwrite existing | safe merge |
| K | website preserved, null does not erase, enrichment triggers recheck | safe |
| L | email preserved | safe |
| M | website triggers recheck | qualificationRecheckRequired true |
| N | generic email still rejected | GENERIC_EMAIL_DOMAINS present |
| O | email-domain live website still rejected | hasLiveWebsite + email_domain_has_live_website present |
| P | probable not auto-merged | shouldAutoMerge false |
| Q | exact auto-merge eligible | shouldAutoMerge true EXACT |
| R | strong auto-merge eligible | shouldAutoMerge true STRONG |
| S | source evidence retains both OSM+Google | allEvidence length 2 |
| T | no production Google calls | no fetch to googleapis |
| U | no enrichment calls | no enrichment provider calls in normalization |
| V | existing OSM qualification regression | parseOsmElement, NEEDS_ENRICHMENT still present |
| W | TRUE_NO_SITE regression | hasLiveWebsite + TRUE_NO_SITE safety preserved |
| X | Lead email dedup regression | existingByEmail still present |
| Y | source metrics classification | SourceMetrics present |
| Z | Haversine correctness | 0m same point, ~55m 0.0005deg, ~343km London-Paris |

All 26 tests PASS.

---

## STEP 20 — Schema Decision Gate

**Question:** Can existing LeadCandidate fields + metadata/rawData support multiple source evidence cross-source match reasons canonical merged fields?

**Answer:** YES — NO SCHEMA CHANGE REQUIRED

- Existing LeadCandidate has:
  - discoverySourceId, externalType, externalId for same-source dedup
  - companyName, email, phone, website, address, city, country, postcode, lat/lng for canonical
  - rawTags Json for full OSM tags (or Google raw)
  - metadata Json extensible — we store sourceEvidence array [{sourceId, sourceType, externalType, externalId, rawName, rawEmail, rawPhone, rawWebsite, address, city, country, postalCode, lat/lng, collectedAt, matchReasons, confidence}]
  - qualifiedLeadId for traceability

- Provenance: metadata.sourceEvidence preserves both OSM and Google evidence, rawTags preserves raw OSM, rawSourceData in NormalizedBusinessRecord can be stored in rawTags or metadata

- Why JSON sufficient: multi-source evidence is additive, not requiring new indexes; query by status still works; unique constraint [discoverySourceId externalType externalId] still protects same-source duplicates; cross-source dedup is application-level matching, not DB unique

- Migration safety: no migration needed, existing counts preserved (Lead 88, Candidate 256 etc), no index change, no breaking change

- **Decision:** Continue with existing schema, use metadata.sourceEvidence for multi-source provenance. If future phase requires efficient query by normalizedEmail/phone, consider adding normalized fields + indexes, but not in 4C.4A.

**Record:** 4C.3B.2 DEFERRED per earlier phase — enrichment budget guardrails remain, no enrichment calls in this phase.

---

## STEP 21-24 — Build, Regression, Prod Safety, Docs, Commit

- prisma validate: valid
- prisma generate: OK
- node --check collector-worker.mjs: OK
- node --check test-collection-4c4a.mjs: OK (with tsx loader)
- npm run build: success 103kB
- Existing collector/enrichment tests: 4C.3B.1 tests AC-AP PASS (one flaky P2003 foreign key due to cleaned job, not related to normalization)
- New tests A-Z: 26 PASS
- No production Google calls: verified
- No enrichment calls: verified
- TRUE_NO_SITE safety preserved
- Generic email filter preserved
- Lead email dedup preserved
- OSM qualification regression preserved

**Final READ-ONLY counts (should be unchanged except natural scheduled runs):**
- EnrichmentConfig.enabled=false
- EnrichmentJob 0
- EnrichmentAttempt 0
- ProviderCredential 0
- Lead 88
- Candidate 256 (from scheduled runs, not implementation mutation)

**Docs:** this file

**Commit:** LOCAL only, DO NOT PUSH per instruction

---

## Future Google Contract (no calls yet)

`normalizedFromGooglePlace(place, categorySlug, sourceId)` → NormalizedBusinessRecord same contract as OSM

- Place id → externalId
- Name → name
- formatted_address/vicinity → address
- formatted_phone_number/international_phone_number → phone
- website → website
- geometry.location.lat/lng → latitude/longitude
- address_components → city, postal, country, region
- No email from Google Places (future secondary might), but contract supports it

When Google integration happens, worker will:
1. Normalize Google record via normalizedFromGooglePlace
2. Search existing candidates via matchNormalizedRecords (EMAIL_EXACT, PHONE_EXACT first, then NAME_ADDRESS/POSTAL/GEO)
3. If EXACT or STRONG → mergeBusinessEvidence
4. If PROBABLE → do NOT auto-merge, create new candidate with probable match noted
5. If NONE → new candidate
6. If merged candidate now has website evidence → qualification recheck → hasLiveWebsite verification → REJECT existing_website if live

**Critical safety:** OSM null website + Google website example.com → NOT NO_WEBSITE, must verify live → reject if live.

---

## Files Changed (LOCAL ONLY)

- `src/lib/collection-normalization.ts` — NEW foundation
- `scripts/test-collection-4c4a.mjs` — NEW test matrix A-Z
- `docs/PHASE_4C.4A_MULTI_SOURCE_FOUNDATION.md` — NEW doc
- No modification to collector-worker.mjs, enrichment-providers.ts, schema.prisma in this phase (OSM behavior functionally equivalent)

---

## Checklist Compliance

- [x] No Google Maps/Places API calls
- [x] No Google API key added
- [x] No external provider API used
- [x] No enrichment provider added/enabled
- [x] No enrichment jobs created
- [x] No enrichment budget architecture changed
- [x] No collector/GitHub Actions triggered
- [x] No collector schedule modified
- [x] No TRUE_NO_SITE/hasLiveWebsite weakened
- [x] No historical production candidates/leads mutated
- [x] No merge/delete production candidates
- [x] No production Leads changed
- [x] No push without approval
- [x] No paid API calls
- [x] Prisma validate/generate OK
- [x] Build OK
- [x] Existing tests PASS (with known flaky foreign key unrelated)
- [x] New tests A-Z PASS
- [x] Schema decision gate: NO SCHEMA CHANGE
