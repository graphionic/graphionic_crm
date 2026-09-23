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

## Official Endpoints

- **Text Search (New)**: `POST https://places.googleapis.com/v1/places:searchText`
  - Body: JSON with `textQuery` required, `pageSize`, `pageToken`, `locationBias`, `locationRestriction`, `includedType`, `languageCode`, `regionCode`, etc.
  - Response: `{ places: [ Place, ... ], nextPageToken? }`
  - Max 60 results across all pages (subject to change)

- **Nearby Search (New)**: `POST https://places.googleapis.com/v1/places:searchNearby`
  - Body: JSON with `locationRestriction` required (circle { center { lat, lng }, radius }), `includedTypes`, `excludedTypes`, `maxResultCount` (1-20 default 20), `rankPreference` DISTANCE/POPULARITY
  - Does NOT support text input — text queries must use Text Search New
  - Response: `{ places: [ Place, ... ] }`

- **Place Details (New)**: `GET https://places.googleapis.com/v1/places/{placeId}` or `places/PLACE_ID`
  - Path param placeId, e.g., `ChIJj61dQgK6j4AR4GeTYWZsKWw`
  - Resource name form: `places/PLACE_ID`
  - Response: single Place object
  - Less expensive than search when you already have place ID

## Authentication Contract

- Header: `X-Goog-Api-Key: API_KEY` (primary for our use)
- Alternative: `?key=API_KEY` query param or OAuth token `Authorization: Bearer`
- For Places API New: API key and OAuth both supported
- Our credential reader checks env vars: `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_API_KEY` (first found wins)
- Credential reader exposes only `configured: true/false`, never actual key
- API key must NEVER be stored in: GoogleCollectionConfig.metadata, DataSource.config, GoogleApiUsage.metadata, GoogleApiCache, CollectorRun.metadata, LeadCandidate, logs, errors, fingerprints, Git, docs

## Field-Mask Strategy — Cost Sensitive

**Field masking is REQUIRED** — no default fields, omitting returns error. Wildcard `*` allowed in dev but discouraged in prod (large payload, higher billing).

Billing: **Billed at highest SKU applicable to requested fields**. One stray Enterprise field upgrades entire request from Pro to Enterprise.

Official SKUs (from https://developers.google.com/maps/documentation/places/web-service/usage-and-billing and data-fields):

- **Text Search Essentials (IDs Only)**: `places.id`, `places.name` (resource name `places/PLACE_ID`), `places.attributions`, `nextPageToken`, etc. — unlimited free but not usable alone (IDs only)
- **Text Search Pro**: `places.displayName`, `places.formattedAddress`, `places.location`, `places.types`, `places.primaryType`, `places.businessStatus`, `places.photos`, etc. — $32/1000 after 5k free
- **Text Search Enterprise**: `places.websiteUri`, `places.internationalPhoneNumber`, `places.nationalPhoneNumber`, `places.rating`, `places.priceLevel`, etc. — $35/1000
- **Text Search Enterprise + Atmosphere**: `places.reviews`, `places.editorialSummary`, etc. — $40/1000

Similarly Nearby Search Pro $32/1000, Place Details Essentials $5/1000, Place Details Pro $17/1000, Enterprise $20/1000.

**Our strategy:**

- **DISCOVERY_FIELD_MASK** (Pro SKU — usable baseline): id, name, displayName, formattedAddress, location, types, primaryType, businessStatus
- **CONTACT_FIELD_MASK** (Enterprise SKU — needed for qualification): websiteUri, internationalPhoneNumber, nationalPhoneNumber
- **DETAIL_FIELD_MASK**: id, name, displayName, formattedAddress, location, types, primaryType, businessStatus, websiteUri, internationalPhoneNumber, nationalPhoneNumber, addressComponents
- **TEXT_SEARCH_ESSENTIAL_MASK**: discovery only (Pro)
- **TEXT_SEARCH_CONTACT_MASK**: discovery + contact (Enterprise) — used only when website/phone needed
- **NEARBY_SEARCH_MASK**: discovery only
- **PLACE_DETAILS_MASK**: detail (includes contact)

Centrally controlled constants in `google-places-adapter.ts`, validation `validateNoWildcardFieldMask()` fails if `*` appears. Tests fail if wildcard present.

We DO NOT request unnecessary fields: reviews, photos, rating, opening hours, editorial, etc., unless technically required.

We DO NOT hardcode dollar prices into application logic — only SKU tiers.

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

## Credential Architecture

- Preferred production source: env var / secret manager, e.g., GOOGLE_MAPS_API_KEY
- Candidate env vars: GOOGLE_MAPS_API_KEY, GOOGLE_PLACES_API_KEY, GOOGLE_API_KEY
- Reader `getGoogleCredentialStatus()` returns only `configured: true/false`, source, envVarName — never actual key
- `getGoogleApiKeyForTransport()` internal, only for Real transport, never exposed via status or logs
- Safe logging `getSafeCredentialLog()` → { configured, envVar }

## Credential Fail-Closed Contract

Future execution permission requires:
- Google config enabled
- Google DataSource enabled
- valid reservation
- credential configured
- source healthy
- budget available

Missing credential → `GOOGLE_CREDENTIAL_MISSING` → no network, AUTH_ERROR classification

Invalid credential → future Google AUTH_ERROR → source down → stop additional requests

No credential exists during this phase — `configured=false`

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

## Isolated Postgres Blocker

REAL GOOGLE NETWORK ACTIVATION BLOCKED UNTIL G/H/I/BA CONCURRENCY TESTS PASS AGAINST ISOLATED POSTGRES

Do not use production Neon for these tests — 4C.4C.1 does NOT need to solve PostgreSQL provisioning, just document blocker.

## Google DataSource (Future, Not Created Yet)

Future row should look like:

- name = Google Places
- type = google_places
- enabled = false
- priority = 90 (between Overpass DE 100 and Kumi 90? Actually 90)
- healthStatus = unknown
- baseUrl = https://places.googleapis.com
- config = { test: false, fieldMask: DISCOVERY_FIELD_MASK }

Do NOT insert in production in 4C.4C.1.

## Collector Integration

Do NOT activate Google inside `collector-worker.mjs`.

If integration seam/interface added, must remain unreachable while Google source does not exist and Google config disabled.

Prefer adapter tests independent from production collector.

## Production Safety

- GoogleCollectionConfig enabled=false failClosed=true perRun 10 daily 50 monthly 500 cacheEnabled true queryTTL 24 placeDetailsTTL 168 retryLimit 0
- GoogleApiUsage=0 GoogleApiCache=0 Google requests=0
- Google DataSource count=0
- Enrichment enabled=false credentials=0 jobs=0 attempts=0
- Lead 88 Candidate 256 Run 9 State 9 NEEDS 154 REJECTED 102 QUALIFIED 0 unchanged

## No Google Network

- GOOGLE DISABLED NO KEY NO REQUEST — contract only
- Mock transport only, Real transport throws GOOGLE_NETWORK_TRANSPORT_DISABLED
- No real Google key, no secret in .env, no GitHub/Vercel secret, no places.googleapis.com/maps.googleapis.com call
