# Phase 4C.4C.5A — Limited Google Production Activation Architecture — ZERO NETWORK

**GOOGLE PRODUCTION COLLECTION REMAINS DISABLED — ARCHITECTURE ONLY**

## Baseline Sealed (47c6218)

- Google controlled request #2: TEXT_SEARCH HTTP 200 networkRequests=1 resultCount=1 hasNextPageToken=true pagination 0 retries 0 GoogleApiUsage=1 SUCCESS GoogleApiCache=1 requestSentAt populated dangling RESERVED=0
- GoogleCollectionConfig.enabled=false activationMode=DISABLED
- Google Places DataSource.enabled=false
- collect.yml NO GOOGLE_MAPS_API_KEY
- Google CollectorState=0
- Google candidates=0 leads=0
- Enrichment disabled

## Objective

Prepare ClientForge for LIMITED Google production activation. ZERO GOOGLE NETWORK in this phase. Do NOT enable Google, do NOT make request, do NOT add credential to collect.yml, do NOT change 3-hour schedule, do NOT create production Google candidates/leads. Design activation architecture only.

## Activation Modes

- **DISABLED**: zero Google collection — current state, fail closed default
- **CANARY**: only explicit allowlisted combinations and canary limits
- **PRODUCTION**: future broader rotation but still hard budgets

Current must remain DISABLED. Mode stored in `GoogleCollectionConfig.activationMode` String @default("DISABLED") with validation `isValidActivationMode`.

## Canary Configuration

**Initial canary target:**
- Location: Manchester, GB (countryCode GB, city Manchester)
- Category: dental (slug dental)
- Google source: Google Places

**Initial limits intentionally tiny:**
- per-run Google request limit = 3 (canaryPerRunRequestLimit)
- daily Google request limit = 5 (canaryDailyRequestLimit)
- monthly hard cap remains 500 (canaryMonthlyRequestLimit optional, defaults to 500)

Hard limits: perRun 10 daily 50 monthly 500. Effective limits in CANARY mode = min(canary, hard, initial tiny) = 3/5/500.

**Schema:**
- `GoogleCollectionConfig.canaryScopes Json?` — [{countryCode, city, categorySlug}] explicit allowlist, Manchester+dental ONLY initial
- `canaryPerRunRequestLimit Int? @default(3)`
- `canaryDailyRequestLimit Int? @default(5)`
- `canaryMonthlyRequestLimit Int?` optional

Do NOT apply/enable canary yet. Only prepare.

## Canary Scope Guard

Normal Google execution must require BOTH:
- GoogleCollectionConfig.enabled=true AND Google DataSource.enabled=true
PLUS:
- credential configured
- budget available
- location/category allowed by canary scope
- source healthy/not hard-down
- valid CollectorRun
- reservation success

During 4C.4C.5A both enabled flags remain FALSE — FAIL CLOSED.

## Location/Category Allowlist

Explicit Google activation scope, not priority alone. Architecture: `GoogleCollectionConfig.canaryScopes` typed validated representation `CanaryScope {countryCode, city, categorySlug}`. Initial future allowlist Manchester+dental ONLY. No other location/category may execute Google during canary. If scope missing/invalid FAIL CLOSED — `validateGoogleActivationScope` returns reason `CANARY_SCOPE_NOT_CONFIGURED_FAIL_CLOSED` or `CANARY_SCOPE_NOT_ALLOWED`.

Implementation: `src/lib/google-activation.ts`:
- `normalizeScope` trims, uppercases countryCode, lowercases slug, validates lengths
- `isScopeAllowed` case-insensitive city, exact country/category
- `getCanaryAllowlistFromConfig` prefers typed `canaryScopes` Json, fallback metadata, returns [] fail closed if missing
- `getActivationModeFromConfig` reads activationMode field or metadata, defaults DISABLED
- `validateGoogleActivationScope` checks mode DISABLED → block, missing location/category → INVALID, CANARY without allowlist → fail closed, wrong location/category → NOT_ALLOWED, correct → allowed

## Staged Request Architecture

**STAGE A — ID DISCOVERY:**
- TEXT_SEARCH, field mask places.id,places.name,nextPageToken — cheap discovery, Google place identity, no contact fields, no automatic pagination during initial canary

**STAGE B — DISCOVERY DETAILS (only when required):**
- Minimum non-contact details: name, address, coordinates, types, business status
- PLACE_DETAILS mask id,name,displayName,formattedAddress,location,types,primaryType,businessStatus — do NOT request website/phone yet unless contact verification stage

**STAGE C — CONTACT / WEBSITE EVIDENCE:**
- PLACE_DETAILS only for selected place IDs where evidence worth cost
- Contact mask websiteUri, internationalPhoneNumber, nationalPhoneNumber — higher-cost boundary, must require separate reservation

**STAGE D — QUALIFICATION:**
- Google evidence enters existing normalization / source-evidence system
- Google website evidence must trigger qualificationRecheckRequired=true, live website REJECT existing_website, absence does NOT prove TRUE_NO_SITE

Defined in `STAGED_REQUEST` constant.

## Email Invariant

Google Places does NOT provide business email required by lead qualification. Never fabricate email, never derive from name/domain, never scrape as part of this phase. Candidate without useful email NOT QUALIFIED, if appropriate NEEDS_ENRICHMENT. Final CRM Lead invariant remains: USEFUL EMAIL + CONFIRMED NO LIVE WEBSITE = QUALIFIED LEAD. Preserved in `EMAIL_INVARIANT`.

## Source Role

For initial activation Google primarily provides: place identity, cross-source matching, address evidence, coordinates, business status, website evidence when explicitly requested, phone evidence when explicitly requested. Google should NOT automatically replace OSM. OSM remains primary free discovery source during canary.

## Collector Integration Boundary

Current collector dispatches by DataSource.type: overpass vs google_places BUT Google execution path remains unreachable while disabled. Do not place Google network code throughout collector-worker. Use dedicated adapter/orchestrator `src/lib/google-collector-adapter.ts`:

- `canExecuteGoogleCollector` checks base (config enabled, source enabled, mode, credential, health) + scope validation
- `collectFromGoogleSource` prepared but throws GOOGLE_COLLECTOR_NOT_YET_ACTIVATED until 4C.4C.5C explicitly approves transport
- `getGoogleCollectorSafeLog` safe metrics, no secret
- `assertGoogleTransportAllowed` production transport boundary that can ONLY execute after checks — in 4C.4C.5A always throws GOOGLE_NETWORK_TRANSPORT_DISABLED
- Pipeline: CollectorRun → source/config validation → activation mode → scope validation → build request intent → fingerprint → cache check → budget reservation → credential check → requestSentAt boundary → transport → usage completion → cache → normalization → evidence merge → qualification recheck — every real transmission requires own reservation

## Real Transport Architecture

Controlled probe has narrow real-network path. For normal future collection, production transport boundary can ONLY execute after source enabled, config enabled, mode valid, scope allowed, credential available, reservation committed. Do NOT simply expose unrestricted fetch(). Do NOT activate transport during 4C.4C.5A. Tests use mock transport.

## Request Pipeline

Future Google collector path documented in `GOOGLE_COLLECTOR_PIPELINE` constant.

## Pagination

Initial CANARY pagination disabled: `CANARY_PAGINATION_ENABLED=false`. Even if nextPageToken exists, do not request page 2. Future production pagination can be separately approved.

## Retries

Initial CANARY retryLimit=0 `CANARY_RETRY_LIMIT=0`. No automatic retry. Future retry policy requires separate review.

## Cross-Source Matching

Use existing matching rules:
- Strong: EMAIL_EXACT, PHONE_EXACT
- Probable/contextual: NAME_ADDRESS, NAME_POSTAL, NAME_GEO, NAME_CITY
- Never merge: COORDINATES_ALONE, NAME_ALONE
- Google place_id remains externalType=place externalId=bare place ID sourceType=GOOGLE_PLACES — canonical

Preserved in `CROSS_SOURCE_MATCHING`.

## Website Evidence Safety

Critical invariant:
- OSM says no website / website unknown + Google returns websiteUri → merge source evidence → qualificationRecheckRequired=true → run existing live website verification
- If website live → REJECT existing_website
- Never allow stale OSM no-website evidence to override newer Google website evidence
- Preserved in `WEBSITE_INVARIANT` and `collection-normalization.ts` hasTrustedWebsiteEvidence / qualificationRecheckRequired

## Google Absence Is Not Proof

Google websiteUri absent must NOT automatically become TRUE_NO_SITE. It is only absence of evidence from that source. Final no-site qualification still requires existing independent website verification logic.

## Candidate Dedup

Do not create duplicate candidates merely because same business exists in OSM and Google. Before persistence cross-source matching/evidence merge. Preserve metadata.sourceEvidence[] Google place identity. If confidently same business merge evidence. If uncertain do not auto-merge. Schema `LeadCandidate @@unique([discoverySourceId, externalType, externalId])` enforces dedup.

## Canary Metrics

Prepared metrics for future canary:
- googleRequests, googleCacheHits, googleCacheMisses, googleResults, googleUniquePlaces, googleMatchedExistingCandidates, googleNewCandidates, googleWebsiteEvidenceFound, googleLiveWebsiteRejected, googleNoWebsiteEvidence, googlePhoneEvidenceFound, googleCandidatesWithEmail, googleQualifiedLeads, googleDuplicatesPrevented, googleRequestUnits, googleCostUnits, googleErrors
- Metrics attached safely to CollectorRun metadata/yield summary, no API key
- Builder `buildSafeMetricsLog` filters only allowed metrics
- Defined in `CANARY_METRICS`

## Cost/Yield Metrics

Eventually answer: Is Google worth using? Prepare derived metrics:
- resultsPerRequest, matchedBusinessesPerRequest, websiteEvidencePerRequest, qualifiedLeadsPerRequest, costUnitsPerQualifiedLead
- Do NOT hardcode USD pricing, use internal cost units/accounting — included in safe metrics log

## Stop Conditions

Future CANARY must fail closed / stop Google for run on:
- daily limit reached, monthly limit reached, per-run limit reached, credential missing, AUTH_ERROR, QUOTA_EXCEEDED, invalid activation scope, source disabled, config disabled, mode DISABLED
- RATE_LIMITED/SERVER_ERROR: record classification, with retryLimit=0 do not retry
- Defined in `STOP_CONDITIONS`

## Source Health

Success → healthy, AUTH_ERROR → down, QUOTA_EXCEEDED → degraded/down per documented policy, RATE_LIMITED → degraded, SERVER_ERROR → degraded, INVALID_REQUEST → degraded but distinguish config defect, NETWORK_ERROR → degraded. Do not mutate health during mock/unit tests against production.

## Workflow Architecture

DO NOT modify collect.yml to receive GOOGLE_MAPS_API_KEY yet. Instead document future activation change. When 4C.4C.5C explicitly approved, collect.yml will receive GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }} but NOT in this phase. Verified collect.yml still has NO GOOGLE_MAPS_API_KEY, controlled probe remains manual-only workflow_dispatch.

## Controlled Probe

Keep existing google-controlled-probe.yml manual-only, do not schedule, do not run, do not remove.

## Test Matrix

Zero-network tests `scripts/test-google-activation-4c5a.mjs` covering:
A DISABLED blocks, B CANARY requires allowlist, C wrong location blocked, D wrong category blocked, E correct Manchester+dental allowed, F source disabled blocks, G config disabled blocks, H missing credential blocks, I budget exhausted blocks, J cache hit zero network, K every cache miss requires reservation, L pagination disabled, M retries disabled, N TEXT_SEARCH ID stage, O contact stage separately reserved, P Google website triggers recheck, Q live website rejects existing_website, R website absent not TRUE_NO_SITE, S email absent not qualified, T Google does not fabricate email, U OSM+Google strong match merges evidence, V uncertain match does not merge, W place ID canonical, X sourceEvidence preserved, Y no duplicate candidate, Z metrics correct, AA health classifications, AB safe logging, AC secret exclusion, AD workflow isolation, AE normal OSM unchanged, AF cost unit accounting, AG cache accounting, AH CollectorRun metrics, AI stop conditions — ZERO NETWORK

## Stale Test Fix

Credential tests T/U were written before first legitimate Google request expecting 0 usage/cache. Now production has 1 usage, 1 cache from sealed probe #2. DO NOT delete production evidence. Replace stale assertions with durable invariants: production usage may be >=1, existing rows must contain no API key, source remains disabled, config remains disabled, normal collect workflow contains no Google credential, controlled probe evidence may legitimately exist — fixed in `scripts/test-google-credential-4c4c3.mjs`.

## Production Safety After Implementation

READ ONLY verify: Google config enabled=false activationMode DISABLED, Google source enabled=false, GoogleApiUsage remains 1 sealed evidence, GoogleApiCache remains 1, no new requestSentAt, no new CollectorState, no Google candidates/leads, normal collect.yml still lacks GOOGLE_MAPS_API_KEY — verified.

## Zero-Network Status

All tests zero network, no Google request, no credential added, no enable.

## Future Workflow Credential Injection

Documented future change for 4C.4C.5C approval:
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
```
But NOT in this phase.

---

# Phase 4C.4C.5B — Google Collector Integration (ZERO NETWORK / PRODUCTION-DISABLED)

## Overview

Phase 4C.4C.5B refactors the collector execution architecture behind a unified, source-neutral dispatch boundary (`collectFromSource` / `dispatchCollection`) and prepares the Google collector integration (`src/lib/google-collector-adapter.ts`) for future CANARY operation.

**GOOGLE REMAINS COMPLETELY DISABLED IN PRODUCTION.**
- `GoogleCollectionConfig.enabled` = `false`
- `GoogleCollectionConfig.activationMode` = `DISABLED`
- `Google Places DataSource.enabled` = `false`
- `collect.yml` contains NO `GOOGLE_MAPS_API_KEY`
- ZERO Google network requests throughout this phase.

## Source-Neutral Dispatch Architecture

Collection execution is now abstracted behind `dispatchCollection` in `src/lib/collector-dispatcher.ts`:
- Accepts unified `CollectionDispatchContext` (`prisma`, `source`, `location`, `category`, `collectorRun`, `config`, `options`)
- Dispatches by canonical `DataSource.type`:
  - `'overpass'`: delegates to existing Overpass pipeline (100% preserved)
  - `'google_places'`: delegates to `collectFromGoogleSource`
  - Unknown/unsupported types: fails closed with `UnsupportedCollectionSourceError` / `UNSUPPORTED_COLLECTION_SOURCE` status.

In `scripts/collector-worker.mjs`, only enabled sources (`enabled: true`) are loaded into active rotation. Since Google Places has `enabled: false`, it is never selected in production.

## 100% OSM Preservation

The existing Overpass collection pipeline remains completely intact:
- Query generation, bounding box calculation, and tag validation are untouched.
- Endpoint rotation and retry/backoff logic remain identical.
- Normalization, candidate persistence, Lead insertion, `CollectorState` updates, and `CollectorRun` metrics are 100% preserved.
- OSM remains the ONLY active production source.

## Google Activation Gates

Before any Google collector execution can proceed, all gates must pass:
1. `source.type === 'google_places'`
2. `source.enabled === true`
3. `config.enabled === true`
4. `config.failClosed === true`
5. `activationMode !== 'DISABLED'`
6. `activationMode` is valid (`CANARY` or `PRODUCTION`)
7. `validateGoogleActivationScope` allows `{ countryCode, city, categorySlug }`
8. `getGoogleCredentialStatus().configured === true`
9. `source.healthStatus !== 'down'`
10. Valid budget reservation obtained (if cache miss)

If any gate fails, the adapter immediately returns `{ status: 'SKIPPED', reason: ... }` with 0 network calls and 0 database mutations.

## Request Planning & Mapping

- **Stage A ID Discovery Request Plan**:
  - Operation: `TEXT_SEARCH`
  - Query pattern: `${categoryTerm} in ${city} ${countryName}` (e.g., `"dental clinic in Manchester UK"`)
  - Field mask: `['places.id', 'places.name', 'nextPageToken']` (Essentials ID-only mask)
  - Page size: bounded to 3 (max 5 for canary)
  - Pagination: disabled (`CANARY_PAGINATION_ENABLED = false`)
  - Retries: disabled (`CANARY_RETRY_LIMIT = 0`)
  - Request planning is pure and executes 0 network calls.
- **Deterministic Category Mapping**:
  - `dental` / `dentist` → `"dental clinic"`
  - `eye` / `optician` → `"optician"`
  - `pet_store` / `pets` → `"pet store"`
  - `hospital` → `"hospital"`
  - `physio` / `physiotherapy` → `"physiotherapy clinic"`
  - `orthopedic` / `orthopedics` → `"orthopedic clinic"`
  - `ivf` / `fertility` → `"fertility clinic"`
  - Fallback: `${category.name || category.slug}`
- **Deterministic Location Mapping**:
  - Derives `city`, `countryCode` (e.g. `'GB'`), `countryName` (e.g. `'UK'`), `latitude`, `longitude` from `CollectorLocation`.
- **Deterministic Fingerprinting**:
  - Computes secret-free SHA-256 over `op:${operation}|query:${normalizedQuery}|mask:${sortedMask}|size:${pageSize}|src:${sourceId}`.

## Cache-Before-Budget Execution Order

1. Request intent is planned and query fingerprint calculated.
2. `checkGoogleCache` checks for unexpired response cache (`GoogleApiCache`).
3. **If Cache HIT**:
   - Returns cached places immediately into normalization.
   - ZERO Google API network requests.
   - ZERO `GoogleApiUsage` reservations consumed.
   - `googleCacheHits` incremented.
4. **If Cache MISS**:
   - Atomic reservation obtained via `reserveGoogleRequestBudgetAtomically` under global `GoogleCollectionConfig` row lock (`FOR UPDATE`).
   - If budget exceeded → returns `SKIPPED` / `BUDGET_EXHAUSTED`.
   - Transport executed (mock in tests, gated in production).
   - Usage status completed (`SUCCESS` or `FAILED`), and response written to `GoogleApiCache`.

## Common Business Processing & Matching

- **Normalization**: Google responses map to canonical `NormalizedBusinessRecord` with `sourceType: 'GOOGLE_PLACES'`, `externalType: 'place'`, `externalId: place_id`.
- **Cross-Source Matching**:
  - Searches existing candidates in the same category and city.
  - Strong matching (`EMAIL_EXACT`, `PHONE_EXACT`) or contextual (`NAME_ADDRESS`, `NAME_POSTAL`, `NAME_GEO`, `NAME_CITY`).
  - Never merges on `NAME_ALONE` or `COORDINATES_ALONE`.
- **Evidence Merging**:
  - Merges into existing candidate's `metadata.sourceEvidence[]` preserving both OSM and Google identities.
  - Does NOT create duplicate candidates.
  - If Google provides a new website URL, sets `qualificationRecheckRequired: true` to trigger live website verification.
- **Candidate Persistence Policy (`MATCH_EXISTING_FIRST`)**:
  - Stage A ID-only discovery prioritizes matching/enriching existing OSM candidates over flooding the database with low-information candidates.
  - New candidates are created only when explicit criteria or policies allow.

## Filter Ordering & Qualification Invariants

Existing qualification safety is strictly preserved:
1. `duplicate_in_run`
2. `existing_website` (live website rejected)
3. `no-email` → `NEEDS_ENRICHMENT` (Google Stage A has no email, so it cannot qualify)
4. `generic email`
5. `invalid email`
6. `email-domain-has-live-website`
7. `QUALIFIED` (strictly requires useful business email + confirmed no live website)

Google Stage A records without email NEVER become `QUALIFIED` Leads.

## Failure Classifications & Health

- `UNSUPPORTED_COLLECTION_SOURCE`: unknown DataSource type
- `GOOGLE_SOURCE_DISABLED`: source `enabled == false`
- `GOOGLE_CONFIG_DISABLED`: config `enabled == false`
- `GOOGLE_ACTIVATION_DISABLED`: mode `DISABLED`
- `CANARY_SCOPE_NOT_ALLOWED`: location/category not in allowlist
- `CANARY_SCOPE_NOT_CONFIGURED_FAIL_CLOSED`: allowlist empty in canary mode
- `GOOGLE_CREDENTIAL_MISSING`: environment variable missing or empty
- `GOOGLE_SOURCE_DOWN`: source health is `'down'`
- `GOOGLE_NETWORK_TRANSPORT_DISABLED`: transport boundary invoked while disabled

## Network Trap & Test Verification

- `scripts/test-google-collector-5b.mjs` installs a hard network trap intercepting `fetch` to `places.googleapis.com` or `googleapis.com`. Any attempted network call throws immediately and fails the test.
- All 34 tests A–BH pass with ZERO external network requests.

---

# Phase 4C.4C.5C.1 — Live Canary Activation Preparation

## Architecture & Manual-Only Execution Model

Phase 4C.4C.5C.1 prepares the infrastructure for the first live Google Places canary collection under strict manual authorization and fail-closed safety. No Google network requests are executed during this preparation phase.

### Key Architectural Invariants

1. **Dedicated Manual-Only Canary Workflow**:
   - Workflow file: `.github/workflows/google-collector-canary.yml`
   - Triggers: `workflow_dispatch` ONLY.
   - Prohibited triggers: `schedule`, `push`, `pull_request`, `workflow_run`, `repository_dispatch`.
   - Normal collector (`.github/workflows/collect.yml`) remains OSM-only and does NOT receive `GOOGLE_MAPS_API_KEY` or canary tokens.

2. **Runtime Canary Execution Token**:
   - Requires `GOOGLE_COLLECTOR_CANARY=true` in the environment.
   - If missing, the runner fails closed immediately with `GOOGLE_CANARY_TOKEN_REQUIRED`.

3. **Approved Canary Scope & Hard Caps**:
   - Location: Country `GB`, City `Manchester`.
   - Category: `dental` (mapping to query `dental clinic in Manchester UK`).
   - PageSize: bounded $\le 3$.
   - Hard Network Cap: `MAX_NETWORK_REQUESTS = 3` independently enforced via `CanaryNetworkGuard`.
   - Pagination: `false` (even if `nextPageToken` is returned).
   - Retries: `0`.

4. **Canary Configuration Lifecycle Manager (`scripts/configure-google-canary.mjs`)**:
   - `--prepare`: Persists `canaryScopes = [{"countryCode": "GB", "city": "Manchester", "categorySlug": "dental"}]` into `GoogleCollectionConfig`. Keeps `enabled = false`, `activationMode = "DISABLED"`, `source.enabled = false`.
   - `--activate`: (Future 5C.2 only) Requires `GOOGLE_CANARY_ACTIVATE_CONFIRM=true`, validates baseline & scope, and atomically enables config and source in `CANARY` mode.
   - `--deactivate`: Idempotent fail-safe cleanup, resets config and source to `DISABLED` / `false`.
   - `--status`: Read-only inspection without credential leakage.

5. **Fail-Safe Deactivation**:
   - The canary workflow executes `scripts/configure-google-canary.mjs --deactivate` under `if: always()`, guaranteeing cleanup even if collection fails.

6. **Cache Fingerprint Interaction**:
   - Historical probe fingerprint: `4228774d7d1387ba138d898066dc96d2e8c3448ab162f2080c07fd095bf5d853` (generated via sorted JSON with `pageSize: 1`).
   - Future collector fingerprint: `324a08318b27d361b961e0915c0f006fb7cd22b23b0f2c323cd1bcfd59d6c524` (generated via normalized string format with `pageSize: 3`).
   - The fingerprints are **DIFFERENT** due to differing serialization formats and page sizes. The historical cache row remains intact.

7. **CollectorRun & CollectorState Isolation**:
   - `CollectorRun` is created with `canary: true`, `manual: true`, `mode: CANARY`, and comprehensive execution metadata.
   - Explicit manual canary collection does NOT mutate or advance normal OSM `CollectorState` rotation.

8. **Zero-Network Matrix Verification (`scripts/test-google-canary-5c1.mjs`)**:
   - Comprehensive test suite A–BA covering workflow triggers, tokens, scope validation, limits, dry-run, cache inspection, budget guards, network counter, deactivation idempotency, and hard network traps.


