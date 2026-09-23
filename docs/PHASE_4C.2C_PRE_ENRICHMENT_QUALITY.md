# Phase 4C.2C — Pre-Enrichment Quality Fix + Candidate Queue Cleanup

**Date:** 2026-09-23  
**Pre-change SHA:** `cd52253b3a5d5f17ec05c935aa7173695a7c2920` (HEAD = origin/main)  
**Branch:** main  
**Status:** Implemented, validated, ready for commit

## 1. Problem Statement

Audit on 2026-09-23 revealed **27 / 78 NEEDS_ENRICHMENT** candidates had a known website:

- `LeadCandidate.website` NOT NULL/empty
- `rawTags.website` populated
- `stored-empty / raw-populated` = 0 (parser correctly stored website)

**Root cause:** Filter order bug in `scripts/collector-worker.mjs`

```
Old order:
1. in-run dedup (inRunSet)
2. missing email → NEEDS_ENRICHMENT
3. existing website → REJECTED existing_website   <-- too late
4. generic, invalid, email-domain live website
```

Businesses with website but no email were incorrectly classified as `NEEDS_ENRICHMENT` (intended for future enrichment) instead of `REJECTED existing_website`.

Expected clean queue: **Total 84, Needs 51, Rejected 33**.

Additional issue: website tag robustness — only `website` + `contact:website` supported, missing `url`, `contact:url`, `website:en`.

## 2. Objectives

1. Fix future collector classification ordering (duplicate → website → missing email → invalid/generic → email-domain live website → TRUE_NO_SITE → Lead)
2. Website tag robustness: extend `parseOsmElement` to `url`, `contact:url`, `website:en`
3. Safely reclassify existing 27 incorrect NEEDS_ENRICHMENT → REJECTED existing_website with audit metadata, preserving all identity fields
4. Clean up Candidate Queue UI: compress filters to 1-2 desktop rows, remove dev copy Phase 4C.2C audit banners, simplify drawer helper, keep Raw Source Data neutral, keep timeline table columns Business/Category/Location/Contact/Discovery/Status/Reason/Created/Action server pagination, dynamic counts

## 3. Changes

### 3.1 `scripts/collector-worker.mjs`

**Header:**
- Updated from Phase 4C.2A to Phase 4C.2C with comment

**Parser `parseOsmElement`:**
```js
// Before
const website = (tags.website || tags['contact:website'] || '').trim();

// After — Phase 4C.2C robustness
const website = (
  tags.website ||
  tags['contact:website'] ||
  tags.url ||
  tags['contact:url'] ||
  tags['website:en'] ||
  ''
).trim();
```

**Filter order fix (lines ~1354-1390):**
```js
// New correct order — Phase 4C.2C fix
1. if (inRunSet.has(key)) → REJECTED duplicate_in_run (websiteRejected not, duplicateRejected++)
2. if ((requireNoWebsite || rejectExistingWebsite) && parsedLead.website) → REJECTED existing_website (websiteRejected++)
3. if (requireEmail && !emailNorm) → NEEDS_ENRICHMENT (noEmailRejected++)
4. generic email → REJECTED generic_email
5. invalid email → REJECTED invalid_email
6. email-domain live website verification (Emma Clinic fix preserved) → REJECTED email_domain_has_live_website
7. VERIFICATION_PENDING → Lead with collectorRunId
```

Preserves:
- Emma Clinic verification (`hasLiveWebsite` check)
- TRUE_NO_SITE verification
- Fair rotation, CollectorState, CollectorRun metadata
- No schema changes

### 3.2 Reclassification Script (one-off, transactional)

File `scripts/reclassify_4c2c.mjs` (temporary, then removed before commit, but logic documented):

- Preview: 27 candidates NEEDS_ENRICHMENT with website NOT NULL
- Transaction: `prisma.$transaction` updating each candidate:
  - `status: REJECTED`
  - `rejectionReason: existing_website`
  - `metadata: { ...existing, reclassifiedBy: phase_4c2c_filter_order_fix, originalStatus: NEEDS_ENRICHMENT, reclassifiedAt: ISO, reclassificationReason: known_website_before_enrichment, previousRejectionReason, websitePreserved }`
- Preserved fields: id, externalId, externalType, companyName, address, city, country, postcode, lat, lng, phone, email, website, discoverySourceId, discoveryRunId, qualifiedLeadId, rawTags, createdAt, enrichmentAttempts

**Result:**
```
Before: Total 84 NEEDS 78 REJECTED 6 NEEDS+website 27
After:  Total 84 NEEDS 51 REJECTED 33 NEEDS+website 0
Lead 88, CollectorRun 7, CollectorState 7 unchanged
Core Dental 582775240 → REJECTED existing_website PASS
```

### 3.3 Candidate Queue UI — `src/app/(app)/settings/lead-collection/client.tsx`

**Compressed filters to 2 rows:**
- Row1: Search (flex 1) + Clear filters button
- Row2: Status / Category / Source / City / PageSize / Sort + Total/Page counters (ml auto)
- Removes previous single wrapped row with 8 controls mixed with search

**Removed dev copy:**
- Page head: removed "Phase 4C.2B — Candidate Queue UI. LeadCandidate = discovery storage, Lead = qualified CRM only..."
  → "Lead discovery, candidate queue, run history and collection settings."
- Summary cards: "No email — future enrichment" → "No email, no website" ; "Existing website / duplicate etc." → "Website exists / duplicate"
- Footer note: removed "Phase 4C.2B: Candidate Queue is READ-ONLY. Search supports company, email, phone, city, country, externalId (server-backed, debounced). Filters: status, category, city, source. Pagination server-side 25/50/100, total count preserved. Detail shows stored website vs rawTags.website independently for Phase 4C.2C quality audit."
  → "Candidate Queue is read-only. Server-side search, filters and pagination. Business / Category / Location / Contact / Discovery / Status / Reason / Created / Action columns preserved."
- Detail drawer: removed "Stored Website displayed exactly as stored. Compare with Raw Source Data below for quality audit (Phase 4C.2C)." helper
  → simple Website link, no audit banner
- Raw Source Data: removed orange warning `background: #FFF6E3 border: #F4BE52` with Important: Stored Website vs Raw website displayed independently...
  → neutral `background: #FAF9F7 border: #E5E3DF` with "Original tags as received from discovery source."
- Bottom drawer note: removed Phase 4C.2B traceability long text → "Read-only detail. No edit or enrichment actions. Traceable via discovery run and source."
- Runs tab header: removed "— Phase 4C.2A"
- Comment `// Candidate Queue State — Phase 4C.2B` → `// Candidate Queue State`

**Kept:**
- Table columns: Business/Category/Location/Contact/Discovery/Status/Reason/Created/Action
- Server pagination, dynamic counts (now correctly shows Total 84 Needs 51 Rejected 33)
- Raw Source Data neutral (no orange warning)
- Timeline, contact, location, discovery, enrichment, qualification sections

## 4. Validation

### 4.1 Classification Unit Tests (future behavior)

Script `/tmp/test_4c2c_classification.mjs` simulates new order:

- Test A email null website populated → REJECTED existing_website PASS
- Test B email null website null → NEEDS_ENRICHMENT PASS
- Test C email present website populated → REJECTED existing_website PASS
- Test D email present website null domain live → REJECTED email_domain_has_live_website PASS
- Test E valid email website null domain no live → VERIFICATION_PENDING PASS
- Test F rawTags.url → parsed website PASS
- Test G rawTags contact:url → parsed website PASS
- Test H website:en → parsed website PASS

### 4.2 Data Integrity

```
Lead 88 PASS (expected 88)
LeadCandidate 84 PASS (expected 84)
CollectorRun 7 PASS
CollectorState 7 PASS
NEEDS_ENRICHMENT with website 0 PASS
Core Dental id cmudlz6t600072gmnqi9u2ol5 status REJECTED existing_website website preserved metadata.reclassifiedBy present PASS
```

### 4.3 Build

- `npx prisma validate` → valid
- `npx prisma generate` → ok
- `node --check scripts/collector-worker.mjs` → ok
- `npm run build` → success (114kB lead-collection route, no type errors)

## 5. Safety Guarantees (per spec)

**STRICT DO NOT — all respected:**

- ❌ No schema/migration/LeadCandidate/Lead/CollectorRun modification — verified, only data updates via Prisma, no prisma file change except client generation
- ❌ No fair rotation/CollectorState change — preserved
- ❌ No GitHub schedule change — .github/workflows/collect.yml untouched
- ❌ No Hunter/Dropcontact/OpenAI/Google Places/Maps integration — none added
- ❌ No enrichment worker/actions/Leads during migration — none
- ❌ No candidate/Lead deletion — counts same, only status change
- ❌ No rawTags/discovery identity/CollectorRun records modification — preserved, metadata merged not overwritten
- ❌ No weakening TRUE_NO_SITE or email-domain verification — preserved, tested
- ❌ No auto trigger collector/GitHub — manual scripts only, no workflow_dispatch

## 6. Expected Dynamic Counts After Fix

- Total: 84
- Needs Enrichment: 51 (was 78)
- Rejected: 33 (was 6)
- Qualified: 0
- Discovered: 0
- Verification Pending: 0

UI now reflects these correctly via `/api/collector/candidates/stats`.

## 7. Files Changed

- `scripts/collector-worker.mjs` — filter order fix + url/contact:url support + header update
- `src/app/(app)/settings/lead-collection/client.tsx` — filter compression to 2 rows, dev copy removal, neutral Raw Source Data, simplified helpers
- `docs/PHASE_4C.2C_PRE_ENRICHMENT_QUALITY.md` — this document

Temporary scripts (not committed, used for validation then removed):
- `scripts/preview_reclass.mjs`
- `scripts/reclassify_4c2c.mjs`
- `scripts/verify_core.mjs`
- `scripts/verify_preserve2.mjs`

## 8. Commit

```
fix: Phase 4C.2C pre-enrichment candidate quality

- Fix filter order in collector-worker: website check before email (27 NEEDS_ENRICHMENT with website incorrectly retained)
- Extend website parser to support url, contact:url, website:en
- Reclassify 27 existing NEEDS_ENRICHMENT → REJECTED existing_website with audit metadata (transactional, preserves identity)
- Compress Candidate Queue filters to 2 rows (Search+Clear / Status/Category/Source/City/PageSize/Sort)
- Remove dev copy Phase 4C.2C audit banners, simplify drawer helper, keep Raw Source Data neutral
- Preserve Lead 88, LeadCandidate 84, CollectorRun 7, CollectorState 7, historical metadata, Emma Clinic verification, TRUE_NO_SITE
- Verified: Total 84 Needs 51 Rejected 33 NEEDS+website 0 Core Dental 582775240 REJECTED existing_website
- Build: prisma validate, generate, node --check, npm run build PASS
```

## 9. Next Steps

- Future enrichment worker will operate on clean NEEDS_ENRICHMENT queue (51 candidates, no website)
- Monitor next collector runs: websiteRejected count should increase, noEmailRejected should decrease, no NEEDS_ENRICHMENT with website should appear
- Consider adding unit test file `tests/collector-classification.test.ts` for CI (not required now)
