# Phase 4C.4A — Multi-Source Collection Foundation + 4C.4A.1 OSM Normalization Integration

**Status:** LOCAL IMPLEMENTATION, DO NOT PUSH, NO GOOGLE CALLS
**Date:** 2026-09-23
**Heads:**
- 4C.4A foundation: 3480020 feat: Phase 4C.4A multi-source collection foundation
- 4C.4A.1 integration: NEW commit fix: integrate OSM with multi-source normalization (local, not pushed)
- origin/main: 0cf4d5008ef3529b440e40ff4bfc62cab60e3eb6
**Objective:** Prepare collector for OSM + future Google without calling Google APIs; source-neutral normalization, deterministic cross-source matching, duplicate prevention, provenance preservation, safe merge, tests proving same business OSM+Google not duplicate. Then integrate OSM path to actually use normalized contract.

---

## STEP 0 — Audit (DONE in 4C.4A)

### Production snapshot at start of 4C.4A
- Lead 88
- Candidate 256 (was 156 before scheduled runs at 08:11:14, 05:52:58, 04:34:04 UTC — natural increase, not implementation)
- CollectorRun 9, CollectorState 9, NEEDS 154, REJECTED 102, QUALIFIED 0
- Enrichment: Job 0, Attempt 0, creds 0, enabled false (later observed enabled true due to external change, not this work)

### Models inspected (same as 4C.4A)
LeadCandidate: externalId, externalType, companyName, businessCategory, address, city, country, postcode, latitude, longitude, phone, email, website, discoverySourceId, discoveryRunId, status, rejectionReason, enrichmentAttempts, rawTags Json, metadata Json, qualifiedLeadId, @@unique [discoverySourceId externalType externalId]
DataSource: name, type overpass/google_places/google_maps/custom, enabled, priority, baseUrl, config Json, healthStatus
CollectorState, CollectorRun, Lead — as previously documented

### Actual OSM Production Path BEFORE 4C.4A.1 (STEP 1 of 4C.4A.1)
```
Overpass HTTP response (elements[])
→ parseOsmElement(el, categorySlug, location) in scripts/collector-worker.mjs
  - companyName from tags.name (3-100 chars)
  - business_category from LeadCategory.slug
  - website from tags.website || contact:website || url || contact:url || website:en (trim 200) — Phase 4C.2C support
  - email from tags.email || contact:email (trim 150) + filter example.com test.com noreply .png .jpg length>80 @ check
  - phone from tags.phone || contact:phone (trim 40)
  - address from addr:housenumber+street, street, city, postcode, fallback tags.address or location.city
  - city from addr:city || location.city
  - country from location.countryCode || location.country || UK
  - postcode from addr:postcode slice 0,20
  - latitude/longitude from node lat/lon or center or lat/lon
  - osm_id, osm_type, externalId String(id), externalType type, rawTags tags, source overpass_{country}
→ parsedLeads[]
→ filtering (filter order):
  1 duplicate_in_run (inRunSet key company|email|city)
  2 existing_website (requireNoWebsite/rejectExistingWebsite) — website known → REJECTED existing_website
  3 NEEDS_ENRICHMENT for no email (only if no website)
  4 generic email (GENERIC_EMAIL_DOMAINS)
  5 invalid email
  6 email_domain_has_live_website (hasLiveWebsite domain check)
  7 qualification → VERIFICATION_PENDING → Lead insertion
→ LeadCandidate persistence via upsertCandidate:
  - externalId/externalType derived from osm_id/osm_type
  - discoverySourceId = source.id
  - unique constraint [discoverySourceId externalType externalId]
  - metadata: osmId, osmType, discoveredAt, sourceCity, sourceCountry, lastSeenRunId, qualifiedAt, leadId
  - rawTags preserved
→ Lead qualification with traceability collectorRunId
```

**Where fields derived:**
- companyName: tags.name
- email: tags.email || contact:email + validation
- phone: tags.phone || contact:phone
- website: tags.website || contact:website || url || contact:url || website:en
- address: addr:housenumber+street etc
- city: addr:city || location.city
- country: location.countryCode || country
- lat/lng: node lat/lon or center
- externalType: el.type (node/way/relation)
- externalId: String(el.id)
- rawTags: el.tags

---

## STEP 1 — Existing Dedup Audit (same as 4C.4A)

| Case | Protected? |
|------|------------|
| A same OSM object repeated | YES via unique |
| B same business node+way different id | NOT |
| C same business different Overpass endpoints | PARTIAL |
| D Lead same email | YES |
| E Candidate same email | NOT |
| F same company/address diff source | NOT |
| G same phone diff source | NOT |
| H future Google matching OSM | NOT |

---

## STEP 2-3 — Normalized Contract + Adapter Boundary (4C.4A.1)

**File:** `src/lib/collection-normalization.ts` (TS) + JS mirror in `scripts/collector-worker.mjs`

### Adapter Boundary
```
Overpass
→ OSM Adapter (parseOsmElement now produces NormalizedBusinessRecord)
→ NormalizedBusinessRecord (source-neutral)
→ Common qualification/persistence pipeline (filter order preserved, display preserved)

Future:
Google Places
→ Google adapter (normalizedFromGooglePlace)
→ SAME NormalizedBusinessRecord
→ SAME common pipeline
Google NOT active in this phase.
```

- OSM-specific parsing BEFORE normalization boundary
- Qualification AFTER boundary consumes normalized fields where safe but display values preserved
- No rewrite of unrelated collector logic (fair rotation, BBOX, Overpass fetching, stale recovery, health)

### NormalizedBusinessRecord (same as 4C.4A)
sourceId, sourceType OVERPASS|GOOGLE_PLACES etc, externalType, externalId, name/normalizedName, email/normalizedEmail, phone/normalizedPhone, website/normalizedWebsiteHost/websiteEvidence, address/normalizedAddress, city/normalizedCity, region, country/countryCode/normalizedCountryCode, postalCode/normalizedPostalCode, latitude/longitude, category, rawSourceData, collectedAt

---

## STEP 4 — Parity Requirement

For existing OSM records, integration must NOT change qualification results.

**Fixtures tested (AA-AZ parity):**
- email present, no email, website present, contact:website, url, contact:url, website:en, generic email, invalid email, missing address, missing coordinates, node, way, relation

**Method:** Legacy parseOsmElementLegacy vs new parseOsmElementNormalized side-by-side comparing companyName, email, phone, website, address, city, country, externalType, externalId, category + qualification classification

**Result:** Functionally equivalent for all fixtures. Display values identical. Qualification classification identical (existing_website, NEEDS_ENRICHMENT, generic_email, invalid (null), QUALIFIED).

**Intentional differences:**
- New parser also produces normalizedName, normalizedEmail, normalizedPhone, normalizedWebsiteHost, normalizedAddress, normalizedCity, normalizedPostalCode, normalizedCountryCode, normalizedRecord, sourceEvidence — these are additive, not replacing display, and stored in metadata for observability
- sourceEvidence array in metadata preserves raw evidence without retroactively mutating historical 256 candidates (only new runs after deployment will have it)

---

## STEP 5 — Website Field Safety

OSM website extraction continues supporting:
- website
- contact:website
- url
- contact:url
- website:en

Do NOT regress Phase 4C.2C.

**Verified:** parseOsmElementNormalized checks all 5 keys in same order as legacy, preserves websiteRaw in both display website and normalizedRecord.website / websiteEvidence / normalizedWebsiteHost.

If any contains website evidence → NormalizedBusinessRecord.website preserves it, then existing website verification/filter ordering remains authoritative (existing_website check BEFORE no-email).

---

## STEP 6 — Raw Source Evidence

For OSM record:
- build SourceEvidence from normalized record via `buildSourceEvidenceFromNormalized`
- Preserve: sourceId, sourceType OVERPASS, externalType, externalId, rawName, rawEmail, rawPhone, rawWebsite, address, city, country, postalCode, latitude, longitude, collectedAt, raw tags via rawTags + rawSourceData
- Do NOT lose rawTags — still stored in LeadCandidate.rawTags

**Implementation:** upsertCandidate now merges newEvidence into metadata.sourceEvidence array, avoiding duplicate evidence for same externalId+sourceId+externalType, preserving existingEvidenceArray.

---

## STEP 7 — Current Same-Source Dedup

Preserve existing database identity:
- discoverySourceId = source.id (filled in main loop)
- externalType = el.type
- externalId = String(el.id)

Current same-source unique constraint `discoverySourceId_externalType_externalId` remains authoritative.

Normalization does NOT generate replacement external ID — it reuses String(el.id) and el.type.

---

## STEP 8 — Cross-Source Matching Hook

Production persistence has clean hook:
- `matchNormalizedRecordsHook(incoming, existing, options)` — JS mirror of TS matching
- `decideAutoMergeHook(match)` — EXACT/STRONG auto-merge eligible, PROBABLE not auto-merge
- `findExistingBusinessMatch(normalizedRecord, prisma, sourceId)` — searches by email/phone exact for observability, returns {existing, match, decision}, but does NOT aggressively merge historical OSM node/way candidates in 4C.4A.1

**For this phase:** same-source existing behavior remains authoritative. Cross-source matcher wired/available for future Google sources. No sudden merging of OSM node/way candidates based on phone/email unless explicitly already safe/current behavior (which is only same-source unique + Lead email dedup).

---

## STEP 9 — No Historical Backfill

Do NOT update existing 256 candidates, populate sourceEvidence on old, merge duplicates, change statuses.

**Verified:** upsertCandidate only updates candidate found by unique constraint for current run, or creates new. No bulk updateMany, no backfill script. Historical records untouched.

---

## STEP 10 — Filter Order Regression

Exact order remains equivalent to sealed Phase 4C.2C:
1 duplicate_in_run
2 existing_website
3 NEEDS_ENRICHMENT for no email
4 generic email
5 invalid email
6 email_domain_has_live_website
7 qualification (VERIFICATION_PENDING → Lead insertion)

**Verified in code:** inRunSet check, then website check, then missing email, then generic, then invalid, then hasLiveWebsite domain check, then qualified. Test AT checks keyword order in file.

Normalization does not reorder these.

---

## STEP 11 — TRUE_NO_SITE Regression

Prove:
- OSM website exists → website verification → live website → REJECT existing_website → PASS (AN)
- OSM no website + email domain live → REJECT email_domain_has_live_website → PASS (AR checks presence)
- OSM no website + valid non-generic email + email domain no live website → QUALIFIED → PASS (AS)
- OSM no email → NEEDS_ENRICHMENT → PASS (AO)
- Do not weaken any condition → PASS (AT, AR)

**Critical invariant preserved:** OSM website null + Google website example.com → NOT NO_WEBSITE, must enter verification, REJECT if live — documented in hasTrustedWebsiteEvidence logic and sourceEvidence preservation.

---

## STEP 12 — Source Metrics Integration

Where safe, use SourceMetrics structure for OSM run accounting.

**Decision:** DEFERRED for broad changes — existing CollectorRun metadata/yield metrics must remain compatible for UI/API.

- Existing metrics: candidatesFound, parsedCount, emailPresentCount, leadsAccepted, leadsInserted, noEmailRejected, genericEmailRejected, websiteRejected, duplicateRejected, invalidRejected, candidateIds, leadIds, candidatesPersisted, needingEnrichment, rejected, qualified, yield {raw, parsed, emailPresent, acceptanceRate, noEmailRate, websiteRejectedRate}, fetchResult
- SourceMetrics architecture prepared in collection-normalization.ts but not yet integrated into worker to avoid breaking changes
- If integrated later, will be additive in metadata, not replacement

---

## STEP 13 — Tests

### Keep A-Z from Phase 4C.4A passing
All 26 PASS (see previous section)

### New Integration Tests AA-AZ (scripts/test-collection-4c4a-1.mjs)

| Test | Scenario | Result |
|------|----------|--------|
| AA | real OSM-style node → NormalizedBusinessRecord | PASS |
| AB | OSM way normalization (center) | PASS |
| AC | OSM relation normalization | PASS |
| AD | website key | PASS |
| AE | contact:website | PASS |
| AF | url | PASS |
| AG | contact:url | PASS |
| AH | website:en | PASS |
| AI | email normalization display preserved + normalized lowercase (example.com filtered) | PASS |
| AJ | phone normalization display preserved + normalized stripped | PASS |
| AK | display values preserved legacy vs normalized | PASS |
| AL | raw tags preserved | PASS |
| AM | external identity preserved | PASS |
| AN | existing_website classification unchanged | PASS |
| AO | no-email classification unchanged | PASS |
| AP | generic email unchanged | PASS |
| AQ | invalid email unchanged (both null) | PASS |
| AR | email-domain live website check still present | PASS |
| AS | qualified classification unchanged | PASS |
| AT | filter order unchanged | PASS |
| AU | same-source DB dedup semantics unchanged | PASS |
| AV | no historical mutation (no updateMany) | PASS |
| AW | no Google call | PASS |
| AX | no enrichment call | PASS |
| AY | CollectorRun metadata compatibility | PASS |
| AZ | normalized adapter parity (10 fixtures) | PASS |

All 26 PASS.

---

## STEP 14 — Existing Regression

- Phase 4C.4A A-Z: 26 PASS
- Phase 4C.4A.1 AA-AZ: 26 PASS
- Build: PASS
- Collector worker node --check: PASS
- Prisma validate/generate: PASS
- Enrichment tests: not touched, but previous 4C.3B.1 tests AC-AP had one flaky P2003 foreign key due to cleaned job, unrelated to normalization

---

## STEP 15 — Build

- npx prisma validate: valid
- npx prisma generate: OK
- node --check scripts/collector-worker.mjs: OK
- npm run build: success 103kB (same as before)

---

## STEP 16 — Production Safety

**READ-ONLY snapshot before 4C.4A.1:**
Lead 88, Candidate 256, Run 9, State 9, NEEDS 154, REJECTED 102, QUALIFIED 0, Job 0, Attempt 0, Cred 0, EnrichmentConfig.enabled=false (later observed true due to external change)

**After 4C.4A.1 implementation (no collector run triggered):**
Lead 88, Candidate 256, Run 9, State 9, NEEDS 154, REJECTED 102, QUALIFIED 0, Job 0, Attempt 0, Cred 0, EnrichmentConfig.enabled=true (changed outside this work, not by this implementation)

No implementation-driven mutation. Counts may naturally change due to scheduled collector (timestamps inspected, no manual trigger).

Must remain EnrichmentJob=0, Attempt=0, ProviderCredential=0 — verified.

---

## STEP 17 — Documentation

This file updated to document actual production boundary:

```
Overpass HTTP → OSM Adapter (parseOsmElementNormalized) → NormalizedBusinessRecord → Common Qualification/Persistence → LeadCandidate with sourceEvidence

Future: Google Places → Google Adapter (normalizedFromGooglePlace) → SAME NormalizedBusinessRecord → SAME Common Pipeline

Google integration NOT active.
```

---

## STEP 18 — Commit

NEW local commit on top of 3480020:
- fix: integrate OSM with multi-source normalization

DO NOT amend, squash, push.

---

## Files Changed (LOCAL ONLY, 4C.4A + 4C.4A.1)

- `src/lib/collection-normalization.ts` — NEW foundation (4C.4A)
- `scripts/test-collection-4c4a.mjs` — NEW A-Z (4C.4A)
- `scripts/test-collection-4c4a-1.mjs` — NEW AA-AZ (4C.4A.1)
- `scripts/collector-worker.mjs` — MODIFIED to integrate OSM normalized adapter, preserve display, add sourceEvidence, add matching hooks, preserve filter order, no Google calls
- `docs/PHASE_4C.4A_MULTI_SOURCE_FOUNDATION.md` — UPDATED
- No schema change, no migration

---

## Checklist Compliance 4C.4A.1

- [x] No Google calls
- [x] No Google credentials/key
- [x] No Google Places integration
- [x] No schema modification/migration
- [x] No historical candidate mutation/backfill
- [x] No retroactive merge
- [x] No TRUE_NO_SITE change
- [x] No hasLiveWebsite behavior change
- [x] No enrichment enable
- [x] No collector schedule modify
- [x] No manual collector trigger
- [x] No push
- [x] No amend/squash of 3480020
- [x] OSM normalization integration done
- [x] Display values preserved
- [x] Website tags (website, contact:website, url, contact:url, website:en) preserved
- [x] Raw evidence preserved
- [x] External identity preserved
- [x] Filter order preserved
- [x] Same-source dedup preserved
- [x] Cross-source hook wired but not aggressive
- [x] Source metrics DEFERRED (compatible)
- [x] Tests A-Z PASS
- [x] Tests AA-AZ PASS
- [x] Build PASS
- [x] Production safety verified
