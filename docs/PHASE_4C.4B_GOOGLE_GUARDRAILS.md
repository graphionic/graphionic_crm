# Phase 4C.4B Google API Request Guardrails — COMPLETE

**GOOGLE DISABLED NO KEY NO REQUEST**

This phase builds fail-closed cost/request infrastructure BEFORE any real Google Maps/Places API key or network call.

## Overview

- **GoogleCollectionConfig** `key='default'` — single row controlling all Google collection, `enabled=false`, `failClosed=true`, conservative limits perRun 10 / daily 50 / monthly 500, cost limits NULL (optional Int units), cacheEnabled true, query TTL 24h, placeDetails TTL 168h, retryLimit 0.
- **GoogleApiUsage** — atomic reservation ledger with required `sourceId` (Restrict) and `collectorRunId` (Restrict), status RESERVED SUCCESS NO_RESULT FAILED CANCELLED, `requestSentAt` semantics, integer cost units (NOT Float), `requestUnits Int default 1`, `estimatedCostUnits Int?`, `actualCostUnits Int?`, fingerprint SHA-256, indexes for concurrency safety.
- **GoogleApiCache** — source-aware cache `@@unique([sourceId, queryFingerprint, operation])`, operation-aware expiry, hitCount/lastHitAt, CASCADE delete.

## Safety Guarantees

- **Fail-closed**: Missing config, invalid limits (<=0), monthly<daily, failClosed!=true, source disabled, Google disabled → DENY.
- **Global reservation mutex**: `SELECT * FROM GoogleCollectionConfig WHERE key='default' FOR UPDATE` serializes all reservations. Documented explicitly in code: `GLOBAL GOOGLE RESERVATION MUTEX`.
- **Global limits**: daily/monthly cost/request limits GLOBAL across Google sources, per-run scoped to CollectorRun. Source-level queryable separately for metrics.
- **Crash accounting**: RESERVED survives crash, no auto-refund, counts conservatively.
- **CANCELLED semantics**: CANCELLED + requestSentAt != null counts (conservative), CANCELLED + requestSentAt == null may be treated as proven pre-call cancellation (non-billable).
- **Integer cost units**: Internal Int units, NOT Float, NOT USD, NOT hardcoded pricing.
- **No Google network**: Zero fetch to maps.googleapis.com / places.googleapis.com, no googleapis SDK, no API key in repo.
- **Fingerprint**: SHA-256 stable serialization of operation/category/city/country/coords/radius/pageToken/field-set excluding API key/creds/workerId/timestamp.
- **Cache**: Hit does NOT consume budget, miss requires reservation. Synthetic fixtures only in this phase.
- **Place ID dedup**: Existing `@@unique([discoverySourceId, externalType, externalId])` protects same place_id same source. Cross-source phone match via normalization.

## Reservation Canonical Path

1. Check cache BEFORE reservation — if hit, increment hitCount, return CACHE_HIT, no budget consumed.
2. Begin transaction with `maxWait 15000 timeout 20000`.
3. Lock global config row `FOR UPDATE`.
4. Validate config (failClosed true, limits >0, monthly>=daily, cost limits >0 when non-null).
5. Check source exists and enabled, config enabled.
6. Calculate usage INCLUDING RESERVED (conservative) — perRun scoped to CollectorRun, daily GLOBAL (UTC startOfDay), monthly GLOBAL (UTC startOfMonth), including CANCELLED where requestSentAt != null.
7. Enforce per-run/daily/monthly request limits and cost limits.
8. Duplicate active guard: same source+fingerprint+operation+RESERVED → ACTIVE_RESERVATION_EXISTS.
9. Create RESERVED usage row — counts immediately, survives crash.
10. Completion helpers: completeGoogleReservation (SUCCESS/NO_RESULT/FAILED) with actualCostUnits, requestSentAt, errorClassification; cancelGoogleReservation with requestSent bool controlling requestSentAt semantics.

## Field Mask / Request Shaping Architecture (Future)

- Fingerprint includes fieldSet (sorted) for distinct cache keys per field mask.
- Operation-aware cache TTL allows Place Details longer TTL than search.
- Request shaping will be enforced in future adapter: required fieldSet, no wildcard *, budget-aware field selection.

## Source Health Classifications

- AUTH_ERROR → down (stop further requests)
- QUOTA_EXCEEDED → down (stop for current budget period)
- RATE_LIMITED → degraded
- SERVER_ERROR/NETWORK_ERROR/INVALID_REQUEST → degraded
- UNKNOWN → degraded

Integrates with DataSource healthStatus.

## Retry / Pagination

- retryLimit 0 default, each future network transmission requires its OWN reservation — retry cannot bypass budget.
- Pagination: each page own reservation, page token participates in fingerprint → distinct reservation fingerprint.

## Observability

Safe metrics via getGoogleGuardrailMetrics (no secrets):
- enabled, limits, today reserved/success/no-result/failed, month, cache hits/misses, remaining, health status.
Admin UI READ-ONLY if narrow (Google DISABLED, caps, usage, cache, health) no enable button no API key field.

## Schema Safety

Migration `phase_4c4b_google_request_guardrails` additive only:
- CREATE TYPE GoogleOperation, GoogleRequestStatus, GoogleErrorClassification
- CREATE TABLE GoogleCollectionConfig, GoogleApiUsage, GoogleApiCache
- CREATE INDEX / UNIQUE INDEX
- ADD FOREIGN KEY Restrict for usage, Cascade for cache
No DROP.

## Test Isolation (4C.4B.1 Gate)

**Production DB must never be used for guardrail integration tests**

- **Pure/Unit tests** (`scripts/test-google-guardrails-unit.mjs`): fingerprints, config validation, accounting semantics, health classification, retry policy, pagination, secret exclusion, normalization, website safety, canonical externalType. Safe to run against production DATABASE_URL, no mutation, no ALLOW_PRODUCTION_TEST_MUTATION required.
- **DB Integration tests** (`scripts/test-google-guardrails-db.mjs`): atomic reservation, FOR UPDATE global mutex, concurrency (G/H/I/BA), usage rows, cache rows, per-run/daily/monthly boundaries, global daily across multiple sources. Require isolated TEST_DATABASE_URL.
- **Safety contract**: Every DB-mutating test calls `getTestPrismaClient()` which explicitly initializes PrismaClient against TEST_DATABASE_URL via Prisma 6 `datasourceUrl` override (fallback `datasources.db.url`). If TEST_DATABASE_URL absent + production DATABASE_URL (neon.tech) → REFUSE with `DB INTEGRATION TESTS NOT RUN — TEST_DATABASE_URL REQUIRED` / `REFUSING`. No silent fallback to production.
- **ALLOW_PRODUCTION_TEST_MUTATION**: Emergency-only, must NOT be part of normal verification. Previous 4C.4B report used it for convenience; 4C.4B.1 removes that dependence. Normal verification passes without it.
- **Concurrency claims**: G/H/I/BA genuinely exercise PostgreSQL transactional behavior (`SELECT ... FOR UPDATE` on GoogleCollectionConfig) only when TEST_DATABASE_URL points to real PostgreSQL. If absent, tests report NOT RUN — TEST_DATABASE_URL REQUIRED rather than touching production.
- **Mechanism**: `scripts/test-db-client.mjs` implements `getTestPrismaClient()`:
  ```js
  new PrismaClient({ datasourceUrl: sanitizedTestUrl })
  ```
  Does NOT overwrite production .env, does NOT modify DATABASE_URL.

## Canonical Google External Type (4C.4B.1 Standardization)

- **sourceType**: `GOOGLE_PLACES` (canonical)
- **externalType**: `place` (canonical) — sourceType already identifies Google, so externalType is generic `place`
- **externalId**: Google `place_id` (e.g., `ChIJ123...`)
- **Legacy**: `google_place` retained in ExternalType union for backward compat, but new code uses `place`
- **Dedup**: Protected by existing `@@unique([discoverySourceId, externalType, externalId])` — same place_id same source blocked
- **Rationale**: Earlier 4C.4A architecture described `externalType=place`, implementation used `google_place`. Since no production Google candidates exist (0), safest time to standardize to `place` per gate preference. Updated `normalizedFromGooglePlace()` to return `place`.

## Test Matrix (Corrected Terminology)

Pure/Unit (`test-google-guardrails-unit.mjs`) + DB Integration (`test-google-guardrails-db.mjs`) covering A-BL:

- A source disabled → denied (DB)
- B missing config fail-closed (DB)
- C missing source → SOURCE_NOT_FOUND (DB) — **corrected**: 4C.4B has no credential model, credential integration belongs to 4C.4C. Tests source missing, not credential.
- D per-run boundary (DB)
- E daily boundary (DB)
- F monthly boundary GLOBAL across days (DB)
- G concurrent final daily slot one winner genuine PostgreSQL FOR UPDATE (DB concurrency)
- H concurrent final monthly slot one winner genuine PostgreSQL FOR UPDATE (DB concurrency)
- I concurrent final run slot one winner genuine PostgreSQL FOR UPDATE (DB concurrency)
- J counts immediately (DB)
- K RESERVED survives crash (DB)
- L failed counts (DB)
- M no-result counts (DB)
- N duplicate active blocked (DB)
- O DB failure no permission (pure code check)
- P timeout fail-closed maxWait 15000 timeout 20000 (pure)
- Q cache hit → no reservation (DB)
- R cache miss → reservation required (DB)
- S deterministic fingerprint same (pure)
- T different operation different (pure)
- U page token different (pure)
- V API key excluded (pure)
- W place_id same-source identity sourceType=GOOGLE_PLACES externalType=place externalId=place_id (DB)
- X synthetic→Normalized sourceType=GOOGLE_PLACES externalType=place externalId=place_id (pure)
- Y phone match (pure)
- Z website triggers recheck (pure)
- AA neighboring not merged (pure)
- AB website never erased (pure)
- AC email never erased (pure)
- AD auth error health down (pure)
- AE quota stops down (pure)
- AF retry cannot bypass (pure)
- AG pagination separate unit (pure)
- AH usage metrics accurate (DB read-only)
- AI cache metrics accurate (DB)
- AJ no secret exposure (pure)
- AK production guard REFUSING/TEST_DATABASE_URL REQUIRED (pure)
- AL no Google fetch (pure)
- AM no SDK network (pure)
- AN no enrichment mutation (pure)
- AO EnrichmentConfig false (DB read-only)
- AP no historical mutation (DB read-only)
- AQ A-Z regression (pure)
- AR AA-AZ regression (pure)
- AS build (pure)
- AT schema constraints/indexes (pure)
- AU Float not used Int? (pure)
- AV requestSentAt accounting (pure)
- AW source-aware cache uniqueness (pure)
- AX collectorRun required Restrict (pure)
- AY source required Restrict usage Cascade cache (pure)
- AZ global daily across multiple Google sources GLOBAL not per-source (DB)
- BA global mutex FOR UPDATE documented (pure) — genuine PostgreSQL when TEST_DATABASE_URL available
- BB invalid zero/negative limits fail-closed (pure)
- BC monthly<daily invalid (pure)
- BD nullable cost limits supported (pure)
- BE CANCELLED pre-call semantics (pure)
- BF post-send semantics (pure)
- BG no refund after crash (pure)
- BH retry new reservation (pure)
- BI page token distinct fingerprint (pure)
- BJ config remains disabled after tests (DB read-only)
- BK no Google credentials (DB read-only)
- BL Google network calls 0 (pure)
- CANONICAL sourceType=GOOGLE_PLACES externalType=place externalId=place_id

## Production Safety

- Lead 88, Candidate 256, Run 9, State 9, NEEDS 154, REJECTED 102, QUALIFIED 0 unchanged by migration.
- EnrichmentConfig.enabled false, ProviderCredential 0, EnrichmentJob 0, EnrichmentAttempt 0.
- GoogleCollectionConfig 1 default disabled failClosed true, GoogleApiUsage 0, GoogleApiCache 0, Google requests 0, no credentials.

## No Google

- GOOGLE DISABLED NO KEY NO REQUEST in this phase.
- No real Google key, no request key, no googleapis.com/places.googleapis.com call, no SDK unless needed for types, no real adapter, no enrichment job, no schedule modification, no manual collector trigger, no spend.

## Commit

`feat: Phase 4C.4B Google API request guardrails` — DO NOT PUSH until review.
