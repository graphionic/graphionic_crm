# Phase 4C.4C.1 Google Places Adapter Contract — ZERO NETWORK

**GOOGLE DISABLED NO KEY NO REQUEST — CONTRACT ONLY**

## Official API Selected

**Places API (New)** — current recommended API per Google documentation (2024-2026).

Legacy Places API is deprecated, cannot be enabled on new projects. All new work must use Places API (New).

References:
- https://developers.google.com/maps/documentation/places/web-service/overview-legacy (legacy vs new mapping)
- https://developers.google.com/maps/documentation/places/web-service/op-overview (Places API New overview)
- https://developers.google.com/maps/documentation/places/web-service/text-search (Text Search New)
- https://developers.google.com/maps/documentation/places/web-service/nearby-search (Nearby Search New)
- https://developers.google.com/maps/documentation/places/web-service/place-details (Place Details New)
- https://developers.google.com/maps/documentation/places/web-service/choose-fields (field masks)
- https://developers.google.com/maps/documentation/places/web-service/data-fields (Place Data Fields New)
- https://developers.google.com/maps/documentation/places/web-service/usage-and-billing (billing, field mask determines SKU)
- https://developers.google.com/maps/documentation/places/web-service/place-id (place ID format)

## Official Endpoints (CORRECTED 4C.4C.1.1)

- **Text Search (New)**: `POST https://places.googleapis.com/v1/places:searchText`
  - Body: JSON with `textQuery` required, `pageSize`, `pageToken`, `locationBias`, `locationRestriction`, `includedType`, `languageCode`, `regionCode`, etc.
  - Response: `{ places: [ Place, ... ], nextPageToken? }` — nextPageToken at top level, NOT inside places array
  - Field mask example for pagination: `places.id,nextPageToken` (places.id + top-level nextPageToken)
  - Max 60 results across all pages (subject to change)

- **Nearby Search (New)**: `POST https://places.googleapis.com/v1/places:searchNearby`
  - Body: JSON with `locationRestriction` required (circle { center { lat, lng }, radius }), `includedTypes`, `excludedTypes`, `maxResultCount` (1-20 default 20), `rankPreference` DISTANCE/POPULARITY
  - Does NOT support text input — text queries must use Text Search New
  - Response: `{ places: [ Place, ... ] }`

- **Place Details (New)**: `GET https://places.googleapis.com/v1/places/{PLACE_ID}` — CORRECTED, bare place ID, single /places/
  - BEFORE (WRONG): `https://places.googleapis.com/v1/places/places/{placeId}` — double places/ — FIXED in 4C.4C.1.1
  - AFTER (CORRECT): `https://places.googleapis.com/v1/places/ChIJ123` for placeId ChIJ123
  - Path param placeId, e.g., `ChIJj61dQgK6j4AR4GeTYWZsKWw`
  - Resource name form: `places/PLACE_ID` (e.g., `places/ChIJ123`) — used in `name` field of response, NOT in URL double
  - Response: single Place object
  - Less expensive than search when you already have place ID

### Resource Name Input Safety (4C.4C.1.1)

- Canonical internal externalId remains bare `ChIJ123`, NOT `places/ChIJ123`
- Builder contract: `canonicalizePlaceId()` normalizes `places/ChIJ123` → `ChIJ123` with `wasNormalized=true`
- Alternative contract A (reject resource-name input) considered, but B (normalize) chosen for safety — prevents accidental `/places/places/` double
- Path injection rejected: contains `..`, `//`, `\`, `/`, `?`, `#`, `&`, `%2F`, spaces → throws INVALID_REQUEST
- URL encoding: path component safely encoded via `encodeURIComponent(canonicalId)`

## Authentication Contract (4C.4C.3 Canonical)

- Header: `X-Goog-Api-Key: API_KEY` (primary for our use)
- Alternative: `?key=API_KEY` query param or OAuth token `Authorization: Bearer`
- For Places API New: API key and OAuth both supported
- **Canonical production env var**: `GOOGLE_MAPS_API_KEY` — standardized in 4C.4C.3
- Legacy fallback (compatibility): `GOOGLE_PLACES_API_KEY`, `GOOGLE_API_KEY`
- **Precedence**: `GOOGLE_MAPS_API_KEY` > `GOOGLE_PLACES_API_KEY` > `GOOGLE_API_KEY` (first found wins) — documented in `google-credential-reader.ts`, canonical preferred for new deployments
- Credential reader `getGoogleCredentialStatus()` returns only `{ configured: boolean, source: "env"|"none", envVarName: string|null }`, never actual key
- Internal accessor `getGoogleApiKeyForTransport()` returns trimmed key only to future Real transport, never via API/UI/logs/metrics/errors
- Safe logging `getSafeCredentialLog()` → `{ configured, envVar, canonical: "GOOGLE_MAPS_API_KEY" }`
- API key must NEVER be stored in: GoogleCollectionConfig.metadata, DataSource.config, GoogleApiUsage.metadata, GoogleApiCache, CollectorRun.metadata, LeadCandidate, logs, errors, fingerprints, Git, docs
- Validation without Google request: missing/empty/whitespace → `GOOGLE_CREDENTIAL_MISSING`, do NOT attempt to validate key by calling Google (validity belongs to controlled request #1)

### Secret Ownership & Leak Audit (4C.4C.3)

- Search project for `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_API_KEY`, `AIza`, `X-Goog-Api-Key`, `apiKey`, `encryptedValue` — classify occurrences
- No real key in Git history, source, tests, docs, Prisma seed, database, logs — only env var names, synthetic `test_mock_key` fixtures, endpoint URLs `places.googleapis.com`
- `.env`, `.env.local`, `.env.production.local` ignored via `.gitignore`
- `.env.example` contains `GOOGLE_MAPS_API_KEY=` placeholder only, never sample key
- Database secret audit: `DataSource.config`, `GoogleCollectionConfig`, `GoogleApiUsage`, `GoogleApiCache` inspected, no secret/API key, config contains only non-secret `apiVersion`, `fieldStrategy`, `pageCap`, `source`

### GitHub Secret Contract (4C.4C.3)

- Workflow `.github/workflows/collect.yml` currently injects only `DATABASE_URL`
- **Design future injection** (deferred until 4C.4C.4 controlled request phase):
  ```yaml
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
  ```
- Preference: DEFER actual workflow secret wiring until controlled request phase — Google remains disabled in 4C.4C.3, so no need to wire yet
- Required GitHub repository secret name (documented, no value): `GOOGLE_MAPS_API_KEY`

### Vercel Secret Contract (4C.4C.3 Least Privilege)

- Does Vercel need Google credential? **No** — Google network execution occurs ONLY in GitHub Actions collector (Phase 4B worker)
- Vercel UI/API is READ-ONLY observability (DataSources list, credential configured true/false), never needs to call Google
- Principle of least privilege: Vercel SHOULD NOT receive `GOOGLE_MAPS_API_KEY`
- Decision: Do NOT add Google key to Vercel unless server-side CRM functionality genuinely requires Google network access — expected current architecture GitHub Actions collector needs key eventually, Vercel UI/API does NOT

## Field-Mask Strategy — Cost Sensitive (CORRECTED 4C.4C.1.1)

**Field masking is REQUIRED** — no default fields, omitting returns error. Wildcard `*` allowed in dev but discouraged in prod.

Billing: **Billed at highest SKU applicable to requested fields**. One stray Enterprise field upgrades entire request from Pro to Enterprise.

**Search vs Details prefix — critical regression prevention:**

- **Text Search / Nearby Search** response contains `places[...]` array at top level, so field masks use paths like `places.id`, `places.displayName`, `places.formattedAddress` + top-level `nextPageToken` for pagination
- **Place Details** returns single Place object, so masks use bare names `id`, `displayName`, `formattedAddress` NOT `places.id`

Tests explicitly prevent cross-use: search masks must use `places.*` or `nextPageToken`, details masks must NOT use `places.*`.

Official SKUs:

- **Text Search Essentials (IDs Only)**: `places.id`, `places.name` (resource name `places/PLACE_ID`), `places.attributions`, `nextPageToken` — cheapest, IDs only
- **Text Search Pro**: `places.displayName`, `places.formattedAddress`, `places.location`, `places.types`, `places.primaryType`, `places.businessStatus`, `places.photos`, etc. — $32/1000 after 5k free
- **Text Search Enterprise**: `places.websiteUri`, `places.internationalPhoneNumber`, `places.nationalPhoneNumber`, `places.rating`, `places.priceLevel`, etc. — $35/1000
- **Text Search Enterprise + Atmosphere**: `places.reviews`, `places.editorialSummary`, etc. — $40/1000

**Staged masks (4C.4C.1.1):**

- **SEARCH_ID_ONLY_MASK**: `places.id`, `places.name`, `nextPageToken` — only place ID + resource name + pagination token, excludes displayName, websiteUri, phone, reviews, rating. Cheapest discovery.
- **SEARCH_DISCOVERY_MASK** (Pro): id, name, displayName, formattedAddress, location, types, primaryType, businessStatus
- **SEARCH_CONTACT_MASK** (Enterprise): discovery + websiteUri, internationalPhoneNumber, nationalPhoneNumber — isolated cost boundary, not in ID-only or discovery masks
- **PLACE_DETAILS_ESSENTIAL_MASK**: id, name, displayName, formattedAddress, location, types, primaryType, businessStatus, addressComponents — bare names, no places.* prefix
- **PLACE_DETAILS_CONTACT_MASK**: websiteUri, internationalPhoneNumber, nationalPhoneNumber — isolated Enterprise
- **PLACE_DETAILS_FULL_MASK**: essential + contact

**nextPageToken handling:**

- If Text Search ID-only response needs pagination, field mask must include `nextPageToken` at top level (example from official docs: `places.id,nextPageToken`)
- Verified against official Google docs https://developers.google.com/maps/documentation/places/web-service/text-search — example `X-Goog-FieldMask: places.id,nextPageToken`
- Do not assume token appears if mask excludes it — must be explicitly requested

**Contact field cost boundary:**

- websiteUri / phone fields isolated from cheaper masks
- SEARCH_ID_ONLY_MASK excludes displayName, websiteUri, phone
- Tests explicitly verify exclusion

**Staged Collection Contract (future optimization, NOT activated yet):**

- STAGE A: Text Search / Nearby Search → minimal discovery fields (SEARCH_ID_ONLY_MASK or SEARCH_DISCOVERY_MASK)
- STAGE B: dedup/cache/place-id evaluation (check existing LeadCandidate unique [discoverySourceId externalType externalId], cache)
- STAGE C: Place Details essentials when needed (PLACE_DETAILS_ESSENTIAL_MASK)
- STAGE D: contact fields website/phone ONLY when justified (PLACE_DETAILS_CONTACT_MASK or SEARCH_CONTACT_MASK)

Do NOT activate this strategy in collector yet. Do NOT hardcode dollar pricing.

## Billing Architecture Findings

- Per-SKU free thresholds replaced $200 monthly credit (Mar 1 2025): Essentials 10k free, Pro 5k free, Enterprise 1k free
- Field mask is single biggest lever on bill — audit masks like code
- Put masks in named constants, not scattered strings
- Discovery (name, address, location) → Pro $32/1000
- Adding website/phone/rating → Enterprise $35/1000
- Adding reviews → Enterprise+Atmosphere $40/1000

## Email Availability Finding

**Google Places API does NOT provide business email addresses.**

Verified via:
- Official docs do not list email field in Place Data Fields
- Stack Overflow https://stackoverflow.com/questions/10599666/email-address-via-google-places-api — Issue Tracker says not possible, no plans, would enable spam scraping
- bizcollect.dev FAQ: "Generally no. Places API returns phone and website, but not email. Obtaining emails requires crawling business website."

**Implication for ClientForge:**

- Google candidate without email → NEEDS_ENRICHMENT / existing lifecycle, NOT QUALIFIED
- Must NOT fabricate email from website/domain
- Must NOT scrape Google pages
- Must NOT weaken emailRequired qualification
- Google still improves: business discovery, website evidence, phone/address evidence, cross-source identity

## Adapter Architecture

```
GooglePlacesAdapter
        |
        v
GoogleTransport interface
        |
        +-- MockGoogleTransport   [4C.4C.1] — deterministic fixtures, no HTTP
        |
        +-- RealGoogleTransport   [future 4C.4C.4] — throws GOOGLE_NETWORK_TRANSPORT_DISABLED in 4C.4C.1
```

Adapter methods:
- `textSearch({ textQuery, reservation, pageSize, pageToken, ... })`
- `nearbySearch({ locationRestriction, reservation, ... })`
- `placeDetails({ placeId, reservation })`

All require reservation context.

## Transport Architecture

- **MockGoogleTransport**: deterministic fixtures for successful text search, empty, nearby success, place details success, website present/absent, phone present, pagination token, AUTH_ERROR, QUOTA_EXCEEDED, RATE_LIMITED, SERVER_ERROR, INVALID_REQUEST. No external HTTP.
- **RealGoogleTransport**: MUST throw `GOOGLE_NETWORK_TRANSPORT_DISABLED` before any network execution in 4C.4C.1

## Reservation Requirement

Future network execution must NEVER be `adapter → Google`. Must be:

```
request intent
↓
fingerprint (SHA-256 stable, no secrets)
↓
cache check (source-aware, does NOT consume budget)
↓
reserveGoogleRequestBudgetAtomically() — global mutex FOR UPDATE, counts INCLUDING RESERVED, crash-safe
↓
reservation committed (RESERVED row)
↓
mark requestSentAt at correct boundary
↓
transport (requires reservation token)
↓
normalize result via normalizedFromGooglePlace()
↓
complete usage status (SUCCESS/NO_RESULT/FAILED/CANCELLED with requestSentAt semantics)
```

Adapter API designed so bypassing guardrails is difficult — no public method allows `GoogleTransport.send()` without reservation context/token.

## Reservation Token

Opaque context returned from guardrails:

```ts
GoogleRequestReservation {
  usageId: string (GoogleApiUsage.id)
  sourceId: string
  collectorRunId: string
  operation: TEXT_SEARCH | NEARBY_SEARCH | PLACE_DETAILS | GEOCODING
  queryFingerprint: string
}
```

Validation before future network:
- reservation exists
- status=RESERVED (checked via DB)
- source matches
- run matches
- operation matches
- fingerprint matches

Do NOT create production reservations in this phase — mock/unit tests only.

## Credential Architecture (4C.4C.3 Final)

- Canonical: `GOOGLE_MAPS_API_KEY`, legacy fallback `GOOGLE_PLACES_API_KEY`, `GOOGLE_API_KEY`, precedence GOOGLE_MAPS_API_KEY > GOOGLE_PLACES_API_KEY > GOOGLE_API_KEY
- Reader `getGoogleCredentialStatus()` → `{ configured, source, envVarName }` never key
- `getGoogleApiKeyForTransport()` internal only to Real transport, never via API/UI/logs
- Safe logging `getSafeCredentialLog()` → `{ configured, envVar, canonical }`
- Validation: missing/empty/whitespace → GOOGLE_CREDENTIAL_MISSING

## Credential Fail-Closed Contract (4C.4C.3 Dual Enable)

Future execution requires ALL:
- GoogleCollectionConfig.enabled=true
- Google DataSource.enabled=true
- valid reservation
- credential configured (GOOGLE_MAPS_API_KEY)
- source healthy
- budget available

Any false → NO NETWORK.

```
config enabled AND source enabled AND credential configured AND reservation allowed → eligible
Any false → NO NETWORK
```

Missing credential → GOOGLE_CREDENTIAL_MISSING → no network, AUTH_ERROR
Invalid credential → AUTH_ERROR → source down

Current after 4C.4C.3: GoogleCollectionConfig.enabled=false, Google DataSource.enabled=false, credential configured=false (unless synthetic test), so network impossible — ZERO NETWORK

## Request Builders — Pure

Implement PURE builders outputting method, endpoint, headers excluding credential, field mask, body/query.

- `buildTextSearchRequest({ textQuery, pageSize, pageToken, locationBias, locationRestriction, includedType, ... })` → POST places:searchText, X-Goog-FieldMask, body
- `buildNearbySearchRequest({ locationRestriction, includedTypes, maxResultCount, ... })` → POST places:searchNearby
- `buildPlaceDetailsRequest({ placeId, languageCode, regionCode })` → GET places/{placeId}

MUST NOT execute HTTP, no API key in snapshots, synthetic input only.

## Pagination Contract

- Official Places API New pagination: Text Search returns `nextPageToken`, Nearby Search does NOT support pagetoken (max 20 per request, but Text Search up to 60 across pages)
- Each page: new request intent, new fingerprint (pageToken in fingerprint), new budget reservation, new GoogleApiUsage row
- No unlimited pagination loop — future collector must have explicit page cap (pageCap=3 in builders)
- Do not implement automatic production pagination yet

## Normalization

Mock Google responses normalize through existing `normalizedFromGooglePlace()`:

- sourceType=GOOGLE_PLACES
- externalType=place (canonical per 4C.4B.1)
- externalId=place_id

Preserve name, address, coordinates, phone, website, types, raw/source evidence.

Do not create candidates in production.

## Cross-Source Evidence

Synthetic tests OSM + Google matching through 4C.4A common matching:

- Strong evidence: phone exact, email exact (if synthetic), name+address, name+postal, name+geo
- Google website evidence must NEVER be discarded — `hasTrustedWebsiteEvidence()` invariant

## TRUE_NO_SITE Critical Regression

- OSM website=null + Google websiteUri=https://example.com → qualificationRecheckRequired=true → existing website verification decides if live → if live REJECT existing_website
- Google absence of website MUST NOT by itself prove TRUE_NO_SITE
- TRUE_NO_SITE remains based on existing qualification contract

## Email Qualification

If Google does NOT supply email (it doesn't):

- Google candidate without email → NEEDS_ENRICHMENT / existing lifecycle, NOT QUALIFIED
- Do not fabricate email from website/domain
- Do not scrape Google pages or websites in this phase

## Business Status

If Google returns businessStatus:

- OPERATIONAL → candidate eligible for further qualification
- CLOSED_TEMPORARILY / CLOSED_PERMANENTLY → should not automatically become qualified lead — map conservatively, design classification only, do not alter existing production qualification without explicit review

## Mock Transport Fixtures

Deterministic fixtures for:
- successful text search (2 places, one with website/phone, one without)
- empty text search
- successful nearby search
- successful place details (with website/phone)
- website absent
- closed business
- phone present
- pagination token nextPageToken123 → page 2
- AUTH_ERROR, QUOTA_EXCEEDED, RATE_LIMITED, SERVER_ERROR, INVALID_REQUEST

No external HTTP.

## Error Mapping

Map synthetic Google errors into existing `GoogleErrorClassification`:

- AUTH_ERROR (401 invalid API key) → source down
- QUOTA_EXCEEDED (429 quota) → source down
- RATE_LIMITED (429 rate) → degraded
- SERVER_ERROR (5xx) → degraded
- INVALID_REQUEST (400) → degraded
- NETWORK_ERROR → degraded
- UNKNOWN → degraded

Test source health transitions — no real DataSource production mutation.

## Logging Safety

Never log: API key, authorization header, credential object, full secret-bearing request headers

Safe logging: operation, usageId, runId, sourceId, fingerprint prefix (16 chars), status, latency, classification, endpoint, fieldMask

Implemented `getSafeRequestLog()` and `getSafeResponseLog()`

## Isolated Postgres Blocker — VERIFIED 4C.4C.2

REAL GOOGLE NETWORK ACTIVATION BLOCKED UNTIL G/H/I/BA CONCURRENCY TESTS PASS AGAINST ISOLATED POSTGRES — NOW VERIFIED 2026-09-23 against local PostgreSQL 17 isolated database `clientforge_test` (localhost:5432), separate from production Neon `ep-soft-bread-b5symaj4-pooler.c-7.us-east-2.aws.neon.tech` / `neondb`.

**ISOLATED POSTGRES CONCURRENCY VERIFIED**

- Test date: 2026-09-23
- Test DB type: local PostgreSQL 17, database `clientforge_test`, host localhost, owner test_user — disposable/test-only, same PostgreSQL semantics, supports transactions and SELECT ... FOR UPDATE
- Production identity guard: `scripts/test-db-client.mjs` compares normalized hostname, port, database name, Neon branch, refuses same identity, never prints secrets
- Tests executed: G daily race (1 ALLOWED / 1 DAILY_LIMIT_REACHED), H monthly race (1 ALLOWED / 1 MONTHLY_LIMIT_REACHED with 9 pre-existing yesterday usages), I per-run race (1 ALLOWED / 1 PER_RUN_LIMIT_REACHED), BA global mutex across different Google sources (only one wins, proves GLOBAL not per-source), crash RESERVED accounting, duplicate reservation race (ACTIVE_RESERVATION_EXISTS), cache race (miss reserves, hit zero budget), rollback (no token, no row, fail closed)
- Independent connections: 2 PrismaClients per concurrent test, Promise.all, genuine competing transactions
- No production mutation: Google enabled false, usage 0, cache 0, DataSource 0, requests 0, enrichment false, credentials/jobs/attempts 0, Lead 88 Candidate 256 unchanged
- No Google requests, no credential
- Test command: `TEST_DATABASE_URL=<isolated> npx tsx scripts/test-google-concurrency-4c4c2.mjs`
- CI future: GitHub Actions ephemeral postgres service → prisma db push → DB integration tests → destroy

Do not use production Neon for these tests — 4C.4C.1 documented blocker, 4C.4C.2 solved with isolated local PostgreSQL, but production activation still requires review.

## Google DataSource (4C.4C.3 Created Disabled — VERIFIED)

- Created via idempotent script `scripts/create-google-source.mjs`
- Canonical row:
  - name = Google Places
  - type = google_places
  - enabled = false — MUST remain disabled
  - priority = 90
  - healthStatus = unknown
  - baseUrl = https://places.googleapis.com
  - timeoutMs = 25000
  - retryCount = 0
  - concurrency = 1
  - config = { apiVersion: v1, fieldStrategy: staged, pageCap: 3, source: places_api_new } — NON-SECRET only
- Idempotent: search type=google_places, if none create ONE disabled, if one reuse/update safe non-secret config, if multiple STOP ambiguity
- After creation: count=1 enabled=false, no CollectorState created, OSM collector ignores disabled source (filters enabled=true)
- Database secret audit: DataSource.config inspected, no secret, no API key, only non-secret keys
- Historical note: Do NOT insert in production in 4C.4C.1 — documented not to insert Google DataSource in production during contract phase; 4C.4C.3 now creates ONE disabled source per dual-enable contract

## Collector Integration (4C.4C.3)

- Do NOT activate Google inside `collector-worker.mjs`
- Collector queries DataSource where enabled=true and health not down — Google source enabled=false so ignored, OSM behavior unchanged
- No Google CollectorState created merely because disabled source exists
- If integration seam added, must remain unreachable while Google source disabled and config disabled

## Production Safety (4C.4C.3)

- GoogleCollectionConfig enabled=false failClosed=true perRun 10 daily 50 monthly 500 cacheEnabled true queryTTL 24 placeDetailsTTL 168 retryLimit 0
- Google DataSource count=1 enabled=false (created disabled in 4C.4C.3, was 0 in 4C.4C.1)
- GoogleApiUsage=0 GoogleApiCache=0 Google requests=0 Google CollectorState=0
- Enrichment enabled=false credentials=0 jobs=0 attempts=0
- Lead 88 Candidate 256 Run 9 State 9 NEEDS 154 REJECTED 102 QUALIFIED 0 unchanged except legitimate scheduled OSM
- Dual-enable contract: config enabled AND source enabled AND credential configured AND reservation allowed → network eligible, any false → NO NETWORK — currently both false, so impossible

## No Google Network (4C.4C.3 ZERO NETWORK)

- GOOGLE DISABLED NO KEY NO REQUEST — credential architecture only, not request execution
- Mock transport only, Real transport throws GOOGLE_NETWORK_TRANSPORT_DISABLED — remains disabled, unreachable
- No real Google key, no secret in .env (only placeholder in .env.example), no GitHub/Vercel secret wired yet (deferred to 4C.4C.4), no places.googleapis.com/maps.googleapis.com call
- Credential configured false in production (GOOGLE_MAPS_API_KEY NOT CONFIGURED), synthetic test key only in tests
- GitHub secret strategy: required secret name GOOGLE_MAPS_API_KEY documented, no value, injection deferred
- Vercel least privilege: Vercel SHOULD NOT receive GOOGLE_MAPS_API_KEY, only GitHub Actions collector will need it eventually
