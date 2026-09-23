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

## Test Matrix

A-AT + AU-BL covered in scripts/test-google-4c4b.mjs:
- A source disabled → denied, B missing config fail-closed, C missing credential, D per-run boundary, E daily, F monthly, G concurrent daily final slot one winner, H concurrent monthly, I concurrent run, J counts immediately, K RESERVED survives crash, L failed counts, M no-result counts, N duplicate active blocked, O DB failure no permission, P timeout fail-closed, Q cache hit no reservation, R cache miss requires reservation, S deterministic fingerprint same, T different operation different, U page token different, V API key excluded, W place_id same-source identity, X synthetic→Normalized, Y phone match, Z website triggers recheck, AA neighboring not merged, AB website never erased, AC email never erased, AD auth error health, AE quota stops, AF retry cannot bypass, AG pagination separate unit, AH metrics accurate, AI cache metrics, AJ no secret exposure, AK production guard, AL no Google fetch, AM no SDK, AN no enrichment mutation, AO EnrichmentConfig false, AP no historical mutation, AQ A-Z regression, AR AA-AZ regression, AS build, AT schema constraints, AU Float not used, AV requestSentAt, AW source-aware cache, AX collectorRun required, AY source required, AZ global daily across multiple sources, BA global mutex, BB invalid limits fail-closed, BC monthly<daily invalid, BD nullable cost, BE CANCELLED pre-call, BF post-send, BG no refund after crash, BH retry new reservation, BI page token distinct, BJ config remains disabled after tests, BK no creds, BL network calls 0.

## Production Safety

- Lead 88, Candidate 256, Run 9, State 9, NEEDS 154, REJECTED 102, QUALIFIED 0 unchanged by migration.
- EnrichmentConfig.enabled false, ProviderCredential 0, EnrichmentJob 0, EnrichmentAttempt 0.
- GoogleCollectionConfig 1 default disabled failClosed true, GoogleApiUsage 0, GoogleApiCache 0, Google requests 0, no credentials.

## No Google

- GOOGLE DISABLED NO KEY NO REQUEST in this phase.
- No real Google key, no request key, no googleapis.com/places.googleapis.com call, no SDK unless needed for types, no real adapter, no enrichment job, no schedule modification, no manual collector trigger, no spend.

## Commit

`feat: Phase 4C.4B Google API request guardrails` — DO NOT PUSH until review.
