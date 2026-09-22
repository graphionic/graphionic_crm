# Phase 4A — Collector Configuration & Persistence Foundation

## Overview
This phase builds ONLY the configuration/control foundation for continuous lead acquisition. No AI agent, no collector rewrite, no GitHub Actions change, no outreach automation.

Flow (future):
```
ClientForge Configuration
  ↓
Neon PostgreSQL (Single Source of Truth)
  ↓
Scheduled Worker (GitHub Actions / Vercel Cron / Oracle VM)
  ↓
Read active configuration
  ↓
Collect leads
  ↓
Verify leads (TRUE NO_SITE)
  ↓
Store in Neon
  ↓
AI verification later (Phase 4B+)
```

## Prisma Models Added (8 new)

### 1. CollectorConfig — General Settings (singleton key=default)
- `enabled` Boolean — collector on/off
- `collectionMode` String — continuous | scheduled | manual
- `defaultBatchSize` Int 25, `defaultQueryLimit` 50, `concurrentRequests` 15, `requestTimeoutMs` 25000, `retryCount` 3, `cooldownMs` 7000, `collectionFrequencyMinutes` 15
- `verificationEnabled`, `emailRequired`, `websiteFilteringEnabled`, `duplicateFilteringEnabled` Boolean
- `metadata` Json? extensible
- Created via upsert, singleton

### 2. CollectorLocation — Dynamic Locations (records, not hardcoded flags)
- `country`, `countryCode` (US, GB, AE, AU, IN), `state`, `city`, `latitude`, `longitude`, `radiusKm` default 25
- `enabled`, `priority` 0-100, `priorityLabel` LOW|MEDIUM|HIGH
- `lastCollectedAt`, `nextCollectAt`
- No fields like `ukEnabled`, `usaEnabled` — locations are records
- Admin can add ANY location without code change
- Examples seeded: Houston TX US, Manchester England GB, Dubai AE, Melbourne AU, Surat Gujarat IN, London GB, New York US, Bangkok TH
- Indexes: enabled, priority, countryCode, city

### 3. LeadCategory — Dynamic Categories
- `name` (Dental), `slug` unique (dental), `description`
- `enabled`, `priority`, `priorityLabel`
- `osmTags` Json — e.g. `["healthcare"="dentist"]`
- `queryConfig` Json, `runLimit` Int?, `lastRunAt`
- Admin can add Restaurants, Hotels, Law Firms etc without Python change
- Seeded: dental, eye, pet_store, hospital, physio, orthopedic, ivf

### 4. DataSource — Extensible Map API Configuration
- `name` (Overpass DE), `type` (overpass | google_places | google_maps | custom), `enabled`, `priority`
- `baseUrl` endpoint URL validated, `timeoutMs`, `retryCount`, `concurrency`
- `config` Json extensible, `healthStatus` healthy|degraded|down|unknown, `lastCheckedAt`
- Not hardcoded to 3 endpoints — future Google Maps, custom providers without redesign
- Seeded: overpass-api.de, kumi.systems, maps.mail.ru

### 5. ProviderCredential — Secure Credential Abstraction (CRITICAL SECURITY)
- `provider` (openai | google_maps | enrichment), `label` optional for multiple keys per provider
- `encryptedValue` String — AES-256-GCM encrypted, never plaintext
- `keyHint` String — last 4 chars e.g. 9K2A for masked display ••••9K2A
- `enabled`, `status` configured|connected|error|missing, `lastUsedAt`, `lastTestedAt`
- Unique [provider, label], indexes provider, enabled
- **Security:**
  - Encryption/decryption server-side only in `src/lib/collector-crypto.ts`
  - Key from `CREDENTIAL_ENCRYPTION_KEY` env var (32 bytes base64), NOT stored in Neon, fallback to `SETTINGS_ENCRYPTION_KEY` for dev
  - Never return `encryptedValue` to browser — API returns only `maskedKey` and `keyHint`
  - Never log secrets, never include in API responses, never commit
  - UI shows ••••9K2A, Status Connected, [Test Connection] [Replace Key] — full value never returned after save
  - Foundation only — no OpenAI calls, no token consumption in Phase 4A

### 6. CollectionRule — Configurable Rules (extensible, not rigid)
- `key` unique (require_email, reject_generic etc) regex a-z0-9_, `name`, `description`, `enabled`, `category` lead_requirements|verification|deduplication|filtering, `config` Json
- Seeded: require_email, require_no_website, reject_generic, verify_email_domain_website (Emma Clinic fix), reject_existing_website, deduplicate_leads, https_check, http_fallback, follow_redirects
- UI: toggles ON/OFF, not rewriting verification implementation in Phase 4A

### 7. CollectorState — Stateless Worker Progress (Neon remembers)
- `locationId` -> CollectorLocation, `categoryId` -> LeadCategory, `sourceId` -> DataSource, SetNull on delete
- `lastRunAt`, `lastSuccessfulRunAt`, `nextEligibleRunAt`, `cursor` Json progress metadata, `cycle`, `consecutiveFailures`, `totalCandidates`, `totalAccepted`, `totalRejected`
- Unique [locationId, categoryId, sourceId], index nextEligibleRunAt
- Purpose: GitHub/scheduled workers stateless, Neon remembers collection progress

### 8. CollectorRun — Run History (replaces ps aux / /tmp logs / CSV counts)
- `startedAt`, `finishedAt`, `status` QUEUED|RUNNING|SUCCESS|PARTIAL|FAILED
- `locationId`, `categoryId`, `sourceId` relations
- `queriesAttempted`, `candidatesFound`, `noEmailRejected`, `genericEmailRejected`, `websiteRejected`, `duplicateRejected`, `invalidRejected`, `leadsAccepted`, `leadsInserted`, `durationMs`, `errorMessage`, `metadata` Json
- Indexes status, startedAt, locationId, categoryId
- Important for monitoring REAL activity

## API Routes (14 new)

All protected by `requireActiveUser()`, server-side validation with Zod, Prisma not in client components.

- `GET /api/collector/overview` — counts active/total locations, categories, sources, rules, states, creds, leadCount, recentRuns, config
- `GET/PUT /api/collector/config` — get/update CollectorConfig
- `GET/POST /api/collector/locations` — list with search?enabled?countryCode, create with validation (country min2, countryCode uppercase, city min2, lat -90..90, lng -180..180, radius 1..500, priority 0..100)
- `PUT/DELETE /api/collector/locations/[id]` — update partial, toggle action, delete
- `GET/POST /api/collector/categories` — list search enabled, create slug regex a-z0-9-
- `PUT/DELETE /api/collector/categories/[id]` — toggle, delete
- `GET/POST /api/collector/sources` — list, create baseUrl url validation
- `PUT/DELETE /api/collector/sources/[id]` — toggle, delete
- `GET/POST /api/collector/credentials` — GET returns masked only, POST encrypts apiKey min8, creates hint, upsert provider_label unique, returns masked
- `PUT/DELETE /api/collector/credentials/[id]` — toggle, test (updates lastTestedAt, status connected — foundation, no actual OpenAI call), delete
- `GET/POST /api/collector/rules` — list, create key regex a-z0-9_
- `PUT/DELETE /api/collector/rules/[id]` — toggle, delete
- `GET /api/collector/runs` — list with status?limit, includes relations
- `GET /api/collector/states` — list includes relations, 100 limit

## Admin UI

**Route:** `/settings/lead-collection` — Collector Control Center, REAL SaaS admin feel, not documentation.

**Layout:** Existing AppLayout sidebar + top, uses approved Design System: Canvas #F7F6F3, Sidebar #252E43 Raised #303A52, Primary #49339A Hover #38247F Soft #F0ECFA, Card #FFFFFF Border #E5E3DF Heading #151927 Body #60697A Muted #9299A8 Success #4FAE91 Warning #F29B38 Danger #EC6262, Poppins, radius 8-12, subtle shadows, compact tables.

**Overview Tab:**
- Status Enabled/Disabled badge
- 4 cards: Locations Active/Total, Categories Active/Total, Sources Healthy/Total, Verification Enabled
- Recent Runs (5) with status badges SUCCESS green, FAILED red, PARTIAL amber
- Architecture diagram: Config -> Neon -> Worker -> Read config -> Collect -> Verify -> Store -> AI later, note foundation only

**Tabs Navigation:** Overview | General | Locations | Categories | Sources & APIs | Rules | Run History | State — pill style, active #49339A white, count badges

**General Tab:** Shows CollectorConfig fields: enabled, collectionMode continuous|scheduled|manual, defaultBatchSize 25, queryLimit 50, concurrentRequests 15, timeout 25000ms, retry 3, cooldown 7000ms, frequency 15 min, verificationEnabled etc, extensible via metadata JSON note

**Locations Tab:**
- Header: Locations + supporting copy Choose where ClientForge should search
- Actions: [Add Location] button #49339A
- Search input + count
- Form: country *, countryCode *, state, city *, latitude, longitude, radiusKm, priorityLabel LOW/MEDIUM/HIGH
- Table: Location (city, state, country), Country (code badge), Radius, Priority (HIGH #FFF6E3 #F29B38, MEDIUM #F0ECFA #49339A, LOW #FAF9F7 #9299A8), Last Collected, Status Enabled/Disabled badge, Actions Disable/Enable + Delete
- Data-heavy CRM, tables not cards, example Houston Texas US 25km High 2h ago Enabled

**Categories Tab:**
- Header: Lead Categories + Configure types of businesses to discover
- Actions: [Add Category]
- Search + count
- Form: name *, slug *, description, priorityLabel, OSM Tags JSON
- Table: Category (name, slug), Source Query (osmTags truncated 60 chars), Priority, Last Run, Status, Actions
- Example Dental dentist High 1h ago Enabled, Eye Clinic optician/ophthalmology Medium 3h ago Enabled
- Note future: Restaurants, Hotels, Law Firms etc without Python change

**Sources & APIs Tab:**
- Header: Sources & APIs + Extensible source configuration, not hardcoded to 3 endpoints, future Google Maps, Google Places
- Actions: [Add Source] + [Provider Key]
- Source Form: name *, type overpass|google_places|google_maps|custom, baseUrl *, timeoutMs, concurrency
- Credential Form (Warm Cream #FFF6E3 border #F4BE52): Secure Provider Credential — Encrypted at rest, never returned to client, provider select openai|google_maps|google_places|enrichment|resend|custom, label optional, API Key password input, Save Encrypted Key button #151927, security note AES-256-GCM CREDENTIAL_ENCRYPTION_KEY env var NOT stored in Neon UI shows ••••9K2A hint
- Two columns: Configured Endpoints count + list with healthStatus healthy|degraded|down|unknown badge enabled/disabled toggle delete, Provider Credentials Secure count + list maskedKey ••••9K2A status lastTested Test Connection Delete, security footer DO NOT store secrets as plain Setting values etc

**Rules Tab:**
- Header: Collection Rules + Extensible for future, not overly rigid, configuration controls only, do NOT rewrite verification implementation during Phase 4A
- Actions: [Add Rule]
- Form: key * a-z0-9_, name *, category lead_requirements|verification|deduplication|filtering, description
- If no rules: show example from spec: Require email ON, Require no website ON, Reject generic email domains ON, Verify email domain website ON, Deduplicate before insert ON, Website Verification HTTPS check ON HTTP fallback ON Follow redirects ON
- If rules exist: list with category, key, name, description, ON/OFF badge, Disable/Enable + Delete

**Run History Tab:**
- Header: Collector Run History — Every execution produces a run record, instead of ps aux / /tmp logs / CSV counts
- Table: Started, Status QUEUED|RUNNING|SUCCESS|PARTIAL|FAILED badges, Location/Category/Source, Queries/Candidates, Rejected (noEmail/generic/website/dup/invalid), Accepted/Inserted green, Duration/Error
- Possible statuses documented

**State Tab:**
- Header: Collector State — Neon must remember progress because GitHub/scheduled workers will be stateless
- Table: Location/Category/Source, Last Run/Last Success/Next Eligible, Cycle/Failures, Candidates/Accepted/Rejected, Cursor JSON truncated 80 chars
- Supports location, category, source, lastRunAt, lastSuccessfulRunAt, nextEligibleRunAt, cursor/progress metadata, cycle, consecutiveFailures, totalCandidates, totalAccepted, totalRejected, createdAt, updatedAt, relations, unique [locationId, categoryId, sourceId]

## Credential Security Implementation

- File: `src/lib/collector-crypto.ts`
- Algo: AES-256-GCM, IV 12 bytes random, tag auth
- Key: `CREDENTIAL_ENCRYPTION_KEY` env var base64 32 bytes, fallback to `SETTINGS_ENCRYPTION_KEY` for dev, throws if not set, strips quotes/whitespace, handles &amp;
- Functions: `encryptCredential(plain)` -> `v1.iv.data.tag` base64, `decryptCredential(payload)` -> plain, `maskCredential(value, keep=4)` -> `••••••••••••••••9K2A`, `getKeyHint(value, keep=4)` -> last 4
- Usage: `createOrUpdateCredential` encrypts, stores hint, upsert provider_label unique, never returns encryptedValue to client — API returns masked only
- Test: `testCredential` updates lastTestedAt, status connected — foundation, no actual OpenAI call, no token consumption
- Validation: apiKey min8 max500, provider min2 max50, label max100
- Env doc: `.env.example` includes CREDENTIAL_ENCRYPTION_KEY generation `openssl rand -base64 32`, note do NOT commit production key, set in Vercel env vars

## Validation Implementation

All server-side with Zod:
- collectorConfigSchema: enabled bool, collectionMode enum continuous|scheduled|manual, batch 1..200, queryLimit 1..500, concurrent 1..50, timeout 1000..120000, retry 0..10, cooldown 0..60000, frequency 1..1440
- locationSchema: country 2..100, countryCode 2..10 uppercase, state 100 nullable, city 2..100, latitude -90..90 nullable, longitude -180..180 nullable, radiusKm 1..500 default 25, priority 0..100 default 50, priorityLabel LOW|MEDIUM|HIGH
- categorySchema: name 2..100, slug 2..100 regex a-z0-9-, description 500 nullable, priority 0..100, priorityLabel enum, osmTags any nullable, queryConfig any nullable, runLimit 1..1000 nullable
- dataSourceSchema: name 2..100, type 2..50, enabled bool, priority 0..100, baseUrl url, timeout 1000..120000, retry 0..10, concurrency 1..50, healthStatus enum healthy|degraded|down|unknown
- credentialSchema: provider 2..50, label 100 nullable, apiKey 8..500, enabled bool
- ruleSchema: key 2..100 regex a-z0-9_, name 2..100, description 500 nullable, enabled bool, category 2..50 default lead_requirements

Errors return 400 with message, 401 if unauthorized, 500 for server errors.

## Database Safety

- Inspected current schema: AdminUser, Lead, Activity, Setting, Suppression, Template — preserved
- Additive migration only: 8 new models, no existing tables dropped, no Lead data overwritten
- Used `prisma db push --skip-generate` — sync without reset, 4.55s
- Generated Prisma Client v6.19.3
- No reseed of Lead data, existing 85 leads intact
- Seeded via `scripts/seed-collector.mjs`: Config 1, Locations 8, Categories 7, Sources 3, Rules 9, Credentials 0, States 0, Runs 0

## Build & Tests

- `prisma validate` — valid 🚀
- `prisma generate` — ✔ Generated Prisma Client v6.19.3
- `npm run build` — should pass (need to test)
- Existing routes: /dashboard, /live, /leads, /import, /settings etc continue working
- /live continues working — reads heartbeat, file rows, collectors, lastLeads, byCountry, byCategory
- Production build no TypeScript errors expected

## Required Env Var

- `CREDENTIAL_ENCRYPTION_KEY` — 32 bytes base64, generate `openssl rand -base64 32`, set in `.env` and Vercel env vars, NOT in Neon, fallback to SETTINGS_ENCRYPTION_KEY for dev

## Future Worker Consumption (Documented, Not Implemented)

- Scheduled worker (GitHub Actions `collect.yml` or Vercel Cron or Oracle VM) will:
  1. Read `CollectorConfig` where enabled=true
  2. Read `CollectorLocation` where enabled=true orderBy priority desc
  3. Read `LeadCategory` where enabled=true orderBy priority desc
  4. Read `DataSource` where enabled=true orderBy priority desc
  5. Read `CollectionRule` where enabled=true
  6. Read `CollectorState` for nextEligibleRunAt to decide what to collect next
  7. Create `CollectorRun` with status RUNNING, queriesAttempted, candidatesFound etc
  8. Collect via DataSource baseUrl, apply rules (require email, reject generic, verify domain website https+http fallback, deduplicate)
  9. Store leads in Neon Lead model
  10. Update CollectorState lastRunAt, lastSuccessfulRunAt, nextEligibleRunAt, totalCandidates/Accepted/Rejected, cursor, cycle
  11. Update CollectorRun finishedAt, status SUCCESS|PARTIAL|FAILED, leadsAccepted/Inserted, durationMs, errorMessage
  12. For credentials, worker will call `getProviderCredentialRaw(provider)` server-side only, decrypt with CREDENTIAL_ENCRYPTION_KEY, use for OpenAI/Map APIs, update lastUsedAt, never log secret

- ProviderCredential foundation only — no AI execution yet, no OpenAI calls, no token consumption

## Files Created/Modified (to be listed in final report)
