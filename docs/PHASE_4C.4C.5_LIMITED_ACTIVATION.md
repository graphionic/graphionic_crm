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
