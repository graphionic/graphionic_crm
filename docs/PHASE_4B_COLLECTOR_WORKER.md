# Phase 4B — Dynamic Database-Backed Collector Worker

## Overview
Phase 4B implements the production GitHub collector as Node.js + Prisma, reading dynamic configuration from Neon PostgreSQL. No hardcoded cities, categories, or endpoints in production worker.

**Flow:**
```
Admin UI /settings/lead-collection
  ↓
Neon PostgreSQL (CollectorConfig, CollectorLocation, LeadCategory, DataSource, CollectionRule, CollectorState, CollectorRun, Lead)
  ↓
GitHub Actions every 3h (Node 20, DATABASE_URL secret)
  ↓
scripts/collector-worker.mjs
  ↓
Prisma - read active config, select assignment, compute BBOX, build Overpass QL, fetch, parse, verify, dedup, insert
  ↓
CollectorState update, CollectorRun finalization, heartbeat legacy, debug CSV optional
```

## Architecture Decision — Node Worker Only
- Production worker: `scripts/collector-worker.mjs` (Node.js + Prisma)
- Legacy Python collectors kept untouched: `leads/collector_github_action.py`, Arena watchdog collectors, CSV tooling
- No Python-to-Node bridge
- No OpenAI, no Google Maps/Places, no CREDENTIAL_ENCRYPTION_KEY in GitHub Actions (Phase 4B uses public Overpass only)
- CSV remains optional debug output, not source of truth

## Source of Truth
- Neon is single production source of truth
- Worker does NOT depend on CSV
- CSV may be created only when `COLLECTOR_DEBUG_CSV=true` as `collector-debug.csv` and uploaded as GitHub artifact
- Legacy files not deleted: `collector_github_action.py`, `import-github.mjs`, watchdog collectors, CSV tooling
- `collect.yml` uses `collector-worker.mjs` as production worker

## Dynamic Configuration
Worker reads at runtime:
- `CollectorConfig` (singleton key=default): enabled, collectionMode, defaultBatchSize, defaultQueryLimit, concurrentRequests, requestTimeoutMs, retryCount, cooldownMs, collectionFrequencyMinutes, verificationEnabled, emailRequired, websiteFilteringEnabled, duplicateFilteringEnabled
- `CollectorLocation` where enabled=true: country, countryCode, state, city, latitude, longitude, radiusKm, priority, priorityLabel, lastCollectedAt, nextCollectAt
- `LeadCategory` where enabled=true: name, slug, osmTags JSON, priority, lastRunAt
- `DataSource` where enabled=true and healthStatus != down: name, type, baseUrl, timeoutMs, retryCount, concurrency, priority, healthStatus
- `CollectionRule` where enabled=true: key, name, category, config

No production hardcoded cities/countries/categories/OSM mappings/Overpass endpoints. Fallback constants only for safety (SAFE_INTERNAL_CAP=3, STALE_RUN_THRESHOLD=20m).

Changing enabled location/category/source in ClientForge UI affects future worker runs WITHOUT code deployment.

## Collector Enabled Behavior
- Read CollectorConfig first
- If not exist or enabled=false: exit successfully, log "Collector disabled — nothing to do.", exit code 0, do NOT create FAILED run

## CollectorState Initialization — Lazy
- CollectorState is persistent scheduler memory
- Do NOT create entire Cartesian product (1000+ locations × 50+ categories × sources) on every execution
- Lazy initialization:
  1. Read enabled locations, categories, eligible sources (enabled, health != down)
  2. Determine candidate combinations
  3. Find existing states
  4. Lazily create only state required for selected combination when not exists
- Scalable to 1000+ locations, 50+ categories, multiple sources

## Next Job Selection — One Assignment Per Execution
- Assignment: Location + Category + DataSource
- Eligibility:
  - location.enabled=true
  - category.enabled=true
  - source.enabled=true
  - source.healthStatus != down (unless no other recovery)
  - CollectorState.nextEligibleRunAt null or <= now
- Select ONE per worker execution for Phase 4B

## Fair Rotation Algorithm (Documented)
```
1. Get enabled locations orderBy priority desc, lastCollectedAt asc
2. Get enabled categories orderBy priority desc, lastRunAt asc
3. Get enabled sources where enabled and health != down orderBy priority desc
4. Query existing CollectorState where locationId in enabled, categoryId in enabled, sourceId in enabled, (nextEligible null or <= now), location.enabled, category.enabled, source.enabled, source.health != down
   OrderBy:
     a) nextEligibleRunAt ASC NULLS FIRST (earliest eligible first)
     b) lastRunAt ASC NULLS FIRST (least recently run first) — ensures fairness, prevents starvation
     c) consecutiveFailures ASC (prefer healthy)
     d) priority sum DESC (location.priority + category.priority + source.priority) — higher priority wins tie, but does not starve LOW because lastRunAt is primary
5. If eligible state found, select first
6. If none eligible, lazy init: iterate enabled locations (first 20) × categories (first 10) × sources (first 3), find first combo not in existing states set, create state for it
7. If all combos have states but none eligible (future nextEligible), return null — no work, log next eligible time
```

Priority influences scheduling but does NOT permanently starve NORMAL/LOW. Least recently processed eligible eventually executes.

## Location → BBOX
- Use existing latitude, longitude, radiusKm
- Compute dynamically, no bbox DB column
- Validation: latitude -90..90, longitude -180..180, radius >0 and <=500
- Handle longitude near extreme latitudes safely: cos(lat) near 0 → safeCos 0.0001
- Formula:
  - latDelta = radiusKm / 111.0
  - lngDelta = radiusKm / (111.0 * cos(lat * pi/180))
  - south = lat - latDelta, north = lat + latDelta, west = lng - lngDelta, east = lng + lngDelta
  - Clamp to -90..90, -180..180
- Record computed bbox in CollectorRun.metadata.bbox

## Category → Overpass Query
- Use LeadCategory.osmTags JSON
- Do NOT use old hardcoded CATEGORIES dictionary
- Validate osmTags before building queries
- Generate safe Overpass QL from supported structures, reject malformed/unsupported safely
- Validation:
  - Must be array of strings
  - Reject unsafe chars: ; { } [ ] ( ) < > \n \r
  - Regex: ^"?([a-zA-Z0-9_:]+)"?\s*=\s*"?([a-zA-Z0-9_\- ]+)"?$  — key 2..50, value 2..100, total length <=200
  - Reconstruct safe tag: `"key"="value"`
  - Warnings for invalid tags recorded in run metadata
- Query generation:
  ```
  [out:json][timeout:25];
  (
    node["key"="value"](bbox);
    way["key"="value"](bbox);
    relation["key"="value"](bbox);
    ...
  );
  out center 100;
  ```
- Do NOT directly interpolate arbitrary executable query text from admin UI

## Data Source
- Use DataSource baseUrl, timeoutMs, retryCount, concurrency, priority, healthStatus
- No hardcoded endpoint lists in production worker
- Conservative health behavior:
  - healthy, degraded, down, unknown
  - Temporary 429/502/503/504: record failure in run metadata, retry according config, may mark degraded after repeated failures
  - Only mark down after repeated failure threshold
  - Threshold: 3 consecutive failures → degraded, 5 → down (documented)
  - On success, mark healthy

## Overpass Safety
- Respectful of public Overpass infra
- Do NOT reproduce old 15 workers × 50 uncontrolled queries
- Conservative for Phase 4B: effective concurrency = min(CollectorConfig.concurrentRequests, DataSource.concurrency, SAFE_INTERNAL_CAP=3)
- Implements:
  - request timeout (source.timeoutMs or config.requestTimeoutMs, min with 60s)
  - retryCount (source.retryCount or config.retryCount, max 5)
  - Retry-After support (parse header, use as delay)
  - exponential backoff: 2^attempt * 1000ms + jitter 0-1000ms
  - 429 handling, 502, 503, 504 handling
  - Stable User-Agent: ClientForge-Collector/1.0, no random rotation
  - No bypass of rate limits

## Collection Run Lifecycle
- After selecting assignment:
  - Create CollectorRun status=RUNNING, startedAt=now, locationId, categoryId, sourceId, metadata (githubRunId, bbox, category, osmTags, endpoint, warnings)
- Counters: queriesAttempted, candidatesFound, noEmailRejected, genericEmailRejected, websiteRejected, duplicateRejected, invalidRejected, leadsAccepted, leadsInserted
- Run that finds ZERO qualified leads is still SUCCESS
  - SUCCESS = worker completed intended work without fatal error
  - PARTIAL = some planned queries failed but useful processing completed
  - FAILED = assignment could not be meaningfully completed due to fatal error
- Do NOT base SUCCESS purely on leadsInserted >0

## Lead Parsing
- Parse OSM node, way, relation where supported
- Extract safely: companyName (tags.name), email (tags.email or contact:email), phone, address (addr:housenumber+street+city+postcode), city (addr:city or location.city), country (location.countryCode), website (website or contact:website), OSM id/type metadata
- Normalize strings, trim, slice to max lengths
- Reject candidates without sufficient identity: name <3 or >100, email >80, missing @ or dot, contains example.com/test.com/noreply/.png/.jpg
- Do not fabricate missing fields

## Collection Rules — Actually Consumed
Supported:
- require_email: reject if no email
- require_no_website / reject_existing_website: reject if website field present
- reject_generic: reject if email domain in generic set (gmail, yahoo, etc)
- verify_email_domain_website: check if email domain has live website (Emma Clinic fix)
- deduplicate_leads: DB check email then company+city
- https_check, http_fallback, follow_redirects: used in website verification options

If configured rule unsupported: record in run metadata.warnings, not silently enforced. Rules interpreted server-side.

## Website Verification — Reusable
Created `src/lib/website-verification.ts` shared implementation:
- Website field present: reject when require_no_website/reject_existing_website enabled
- For email-domain verification:
  - Extract domain safely (lowercase, trim, validate format, no spaces/slashes)
  - Reject generic providers when rule enabled
  - HTTPS check when enabled, HTTP fallback when enabled, redirect following according rule, bounded redirect count (max 3), timeout 8s, stable User-Agent ClientForge-Collector/1.0, body-size safety limit 200KB, HTML detection (body >500 and contains <html or <!doctype or <body)
  - Do NOT download unlimited bodies
  - Do NOT consider every HTTP response proof of valid company website
  - Record verification reason internally
- Emma Clinic type false NO_SITE continues being rejected: if email domain has live site, reject

Functions: `extractEmailDomain`, `isGenericEmailDomain`, `hasLiveWebsite`, `verifyLeadWebsite`

## Deduplication
- Normalize email to lowercase before comparisons/insertion
- Phase 4B DB checks:
  1. email (findFirst where email = normalized)
  2. companyName + city (findFirst where companyName exact and city)
- Keep in-run Set for candidates already processed (company.lower + email.lower + city.lower)
- Do NOT add unique email DB constraint during this phase
- Existing production data not modified/cleaned automatically
- Remaining concurrency limitation documented: concurrent GitHub runs could race between dedup check and insert (no transaction locking), possible duplicate if two workers insert same email at same time — mitigated by concurrency group and short transaction, but not fully prevented without unique constraint. Future phase may add partial unique index.

## Database Writes
- Use Prisma, direct DATABASE_URL (no public HTTP API for worker writes)
- Do NOT create unnecessary POST /api/collector/runs etc for scheduled worker (GitHub worker has DATABASE_URL)
- Use transactions where appropriate, but NOT one giant transaction around network requests
- Network calls outside long DB transactions
- Short transactions for:
  - lead persistence (prisma.lead.create)
  - state update (prisma.collectorState.update)
  - run finalization (prisma.collectorRun.update)
- Handle partial failures safely: if lead insert fails, count as invalidRejected, continue

## Collector State Update
After successful run:
- lastRunAt = now
- lastSuccessfulRunAt = now
- consecutiveFailures = 0
- cycle +=1
- Increment totalCandidates, totalAccepted, totalRejected
- Set nextEligibleRunAt = now + collectionFrequencyMinutes (from config)
- Priority affects job selection only, NOT frequency
- Update location.lastCollectedAt, category.lastRunAt, source healthStatus healthy

On failure:
- lastRunAt = now
- consecutiveFailures +=1
- Set nextEligibleRunAt using bounded exponential backoff: min(2h, cooldownMs * 2^failures)
- No overflow, cap 2h to prevent multi-day lockout

## Collector Run Finalization
Always attempt to finalize existing RUNNING run:
- finishedAt, durationMs, queriesAttempted, candidatesFound, noEmailRejected, genericEmailRejected, websiteRejected, duplicateRejected, invalidRejected, leadsAccepted, leadsInserted, status, errorMessage if applicable, metadata
- Metadata contains: GitHub run ID, attempt, computed bbox, bboxCenter, category slug, OSM tags, endpoint, retry info, warnings, query failures, effectiveConcurrency, timeoutMs, retryCount, durationMs
- No secrets stored

## Stale Run Recovery
At worker startup:
- Find CollectorRun where status RUNNING and startedAt older than threshold (20 minutes)
- Mark FAILED with errorMessage = stale/incomplete previous worker execution, finishedAt = now, durationMs computed, metadata.recoveredAt, recoveryReason stale_run
- Conservative, handles GitHub timeout/crash scenarios
- Threshold documented: 20 minutes

## Legacy Heartbeat
Continue updating Setting.collector_heartbeat for backward compat with /live:
- Timestamp, message, collectors 1, source collector-worker, githubRunId, lastRun details
- But CollectorRun + CollectorState become authoritative monitoring source for new GitHub collector
- Do NOT remove existing /live behavior in Phase 4B

## GitHub Actions Workflow
Created `.github/workflows/collect.yml`:
- Node 20, DATABASE_URL secret, no CREDENTIAL_ENCRYPTION_KEY, no OPENAI_API_KEY, no Google credentials (Phase 4B uses public Overpass only)
- Triggers: schedule cron 0 */3 * * * (every 3 hours), workflow_dispatch manual only, NO push trigger
- Concurrency: group clientforge-collector, cancel-in-progress false (queues, not cancels)
- Timeout: 10 minutes bounded
- Steps: checkout, setup-node 20, npm ci + prisma generate, node scripts/collector-worker.mjs, upload debug CSV artifact if enabled, summary
- Schedule distinction documented: GitHub cron = when worker wakes up, collectionFrequencyMinutes = whether assignment is eligible

## Schedule
- GitHub cron every 3 hours = 8 runs/day, 10 min timeout = ~80 min/day = ~2400 min/month — conservative, fits within GitHub free tier actual runtime (billing depends on actual runtime/account/repo conditions, not timeout)
- Do NOT claim free forever, do NOT calculate allowance using timeout_minutes
- CollectorConfig.collectionFrequencyMinutes (default 15) controls DB eligibility interval, different from GitHub cron
- Can increase GitHub frequency after measuring actual runtime and GitHub usage

## Push Trigger
- No automatic production collection on push to main
- Production collection triggers from schedule and workflow_dispatch only
- Prevents development pushes from unexpectedly collecting leads

## Debug CSV
- Optional: if COLLECTOR_DEBUG_CSV=true, worker creates collector-debug.csv with accepted leads
- Workflow uploads as artifact (retention 7 days)
- Default production false
- Do NOT commit generated lead CSV files

## Observability
- Structured safe logs:
  - [collector] assignment Houston / dental / Overpass
  - [collector] candidates=84
  - [collector] accepted=6
  - [collector] websiteRejected=18
  - [collector] duplicateRejected=4
  - [collector] run=SUCCESS duration=42s
- Do NOT print DATABASE_URL, API keys, credentials, full response bodies
- Logs include bbox, tags, endpoint, retry info, warnings but safe

## Existing UI — Minimal Changes
- Do NOT redesign Phase 4A Control Center
- Only minimal changes to accurately display CollectorRun, CollectorState, next eligible, new GitHub worker activity
- Reuse approved ClientForge design system #F7F6F3 #252E43 #49339A etc, Poppins
- Enhanced Overview: shows recent runs with candidates→accepted→inserted, websiteRejected, dup, duration, GH run ID, bbox, tags; shows next eligible states; Phase 4B architecture diagram
- Enhanced Runs: shows GitHub run ID, bbox, endpoint, retries, warnings, duration, error
- Enhanced States: shows fair rotation explanation, eligible now badge, priority sum, cycle/failures, cursor bbox, next eligible

## No Database Destruction
- Existing Neon contains production data (87+ leads)
- Do NOT reset DB, drop tables, delete Leads, clean duplicates automatically, reseed Lead data, replace production DB
- Only additive/safe changes, avoid schema changes unless necessary, prefer existing Phase 4A schema (no schema change in Phase 4B)

## Testing
Before touching real collection, DRY RUN mode:
- COLLECTOR_DRY_RUN=true
- Reads real config, selects assignment, builds bbox, builds Overpass query, validates rules, creates no Lead, performs no destructive mutation, prefers no external Overpass call

Test checklist:
1. Prisma validate
2. Prisma generate
3. npm build
4. existing 87+ leads remain intact
5. dynamic location selection (enabled locations from DB, not hardcoded)
6. dynamic category selection (enabled categories, osmTags from DB)
7. dynamic DataSource selection (enabled, health != down)
8. bbox generation (lat/lng/radius validation, near poles safe)
9. osmTags validation (safe regex, reject injection)
10. CollectorState initialization (lazy, not Cartesian)
11. CollectorRun lifecycle (RUNNING → SUCCESS/PARTIAL/FAILED, metadata)
12. zero-result SUCCESS (0 leads still SUCCESS)
13. failure → FAILED with errorMessage, backoff
14. stale RUNNING recovery (20m threshold)
15. generic email rejection (gmail etc)
16. Emma Clinic website detection (emmaclinicthailand.com has live site → reject)
17. duplicate detection (email, company+city, in-run Set)
18. collector disabled → clean exit 0, no FAILED run
19. concurrency assumptions (concurrency group, effectiveConcurrency min)
20. existing /live regression (heartbeat still updated)

## Manual Production Test
After local/dry tests pass:
- Do NOT immediately leave scheduled collection running without verification
- Create and push workflow
- Report workflow_dispatch ready
- User manually runs ONE GitHub Actions workflow
- After run inspect: CollectorRun, CollectorState, new Lead records, website rejection counts, GitHub runtime, errors, Overpass behavior
- Only after manual verification will scheduled collection be considered production-approved

## Documentation
This file documents architecture, config consumption, job selection, fair rotation, bbox calculation, Overpass query generation, rule interpretation, website verification, deduplication, state lifecycle, run lifecycle, failure handling, stale recovery, GitHub workflow, cron vs frequency, dry run, manual test, legacy compat

## Risks / Technical Debt
- No unique email constraint → concurrent runs could duplicate (mitigated by concurrency group, but not fully prevented)
- Overpass public infra rate limits — conservative cap 3 but still dependent on public service
- BBOX calculation simple equirectangular, not geodesic precise, but sufficient for 1-500km radius
- OSM tags validation regex may reject some valid tags with special chars (e.g., shop=doityourself) — future may need allowlist expansion
- No bbox column — computed each time, could cache
- No Google Maps/Places integration yet — future phase
- No AI agent yet — future phase
