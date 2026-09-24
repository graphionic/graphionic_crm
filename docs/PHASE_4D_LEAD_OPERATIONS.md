# PHASE 4D — LEAD OPERATIONS UI/UX ARCHITECTURE & AUDIT SPECIFICATION

## 1. Executive Summary & Baseline

- **Phase Baseline**: Sealed at `bffce96022344e132a7610b9c3fe62ad4de6631f` (on `main` and `origin/main`).
- **Phase Objective**: Define the comprehensive Information Architecture, Screen Maps, Data Models, Action Contracts, and Component Inventories for transitioning ClientForge from collector engineering into a high-density, professional Admin CRM experience without visual redesign churn.
- **Safety Invariants**:
  - `GoogleCollectionConfig.enabled`: `false`, `activationMode`: `DISABLED`
  - `DataSource (google_places).enabled`: `false`
  - `GoogleApiUsage`: `count = 2` (0 pending/reserved)
  - `GoogleApiCache`: `count = 2`
  - `LeadCandidate (google_places)`: `0`, `Lead (google_places)`: `0`
  - `EnrichmentConfig.enabled`: `false`
  - Scheduled OSM collection active and untouched.

---

## 2. Existing Application Route Audit

| Route | File Path | Purpose | Current Functionality | Backend Dependency | Production Readiness | Status / Category |
|---|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Root redirect | Redirects to `/dashboard` or `/login` | Next.js Server | Production Ready | Core |
| `/login` | `src/app/login/page.tsx` | Admin authentication | Email/password login with JWT session creation | `AdminUser`, `POST /api/auth/login` | Production Ready | Core Auth |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Executive CRM overview | High-level metrics: lead counts, status breakdown, segment, country, activity, follow-ups | `Lead`, `Activity`, `prisma` | Production Ready | Core App |
| `/leads` | `src/app/(app)/leads/page.tsx` | Qualified leads list | Server-rendered table with filters (search, status, segment, country, sort), pagination | `Lead`, `Activity` | Production Ready | Core App |
| `/leads/new` | `src/app/(app)/leads/new/page.tsx` | Manual lead entry | Single lead creation form | `Lead`, `createLead` action | Production Ready | Core App |
| `/leads/[id]` | `src/app/(app)/leads/[id]/page.tsx` | Lead detail & outreach | Lead profile, website status, email composer, WhatsApp sender, quick status transitions, timeline | `Lead`, `Activity`, `Setting`, `Suppression` | Production Ready | Core App |
| `/leads/[id]/edit` | `src/app/(app)/leads/[id]/edit/page.tsx` | Edit/Delete lead | Form to edit all lead attributes + delete button | `Lead`, `updateLead`, `deleteLead` | Production Ready | Core App |
| `/follow-ups` | `src/app/(app)/follow-ups/page.tsx` | Follow-up queue | Groups leads due today, overdue, upcoming, unscheduled | `Lead` | Production Ready | Core App |
| `/outbox` | `src/app/(app)/outbox/page.tsx` | Outreach log | Activity feed for outgoing emails and WhatsApp messages | `Activity`, `Lead` | Production Ready | Core App |
| `/import` | `src/app/(app)/import/page.tsx` | CSV lead import | Bulk CSV paste/upload with column mapping and deduplication | `Lead`, `prisma` | Production Ready | Core App |
| `/live` | `src/app/live/page.tsx` | Live collector monitor | Client polling `/api/live` for local process status and recent leads | `Lead`, `/api/live`, `/api/restart` | Legacy / Debug | Legacy / Debug |
| `/settings` | `src/app/(app)/settings/page.tsx` | Settings hub | Overview cards linking to sub-settings pages | `Setting`, `prisma` counts | Production Ready | Admin Config |
| `/settings/lead-collection` | `src/app/(app)/settings/lead-collection/page.tsx` | Monolithic collector dashboard | Tabbed client interface (overview, general, locations, categories, sources, rules, runs, states, candidates, enrichment) | `Collector*`, `DataSource`, `LeadCandidate`, `Enrichment*` | High Functionality / Monolithic | Lead Ops / Config |
| `/settings/email` | `src/app/(app)/settings/email/page.tsx` | Email & DNS setup | SMTP / Resend credentials, SPF/DKIM/DMARC status guide | `Setting` | Production Ready | Admin Config |
| `/settings/whatsapp` | `src/app/(app)/settings/whatsapp/page.tsx` | WhatsApp API config | Meta Cloud API credentials, phone number ID, templates | `Setting`, Meta Graph API | Production Ready | Admin Config |
| `/settings/compliance` | `src/app/(app)/settings/compliance/page.tsx` | Compliance & suppression | Suppression list management (email/phone), opt-in stats, webhook secrets | `Suppression`, `Setting`, `Lead` | Production Ready | Admin Config |
| `/settings/templates` | `src/app/(app)/settings/templates/page.tsx` | Message templates | CRUD for outreach email/WhatsApp templates | `Template` | Production Ready | Admin Config |
| `/brand-guidelines` | `src/app/(app)/brand-guidelines/page.tsx` | Internal brand guide | Brand positioning and guidelines reference | Static React | Production Ready | Internal Reference |
| `/design-system/*` | `src/app/design-system/**` | Locked design system | Complete component library & token reference (50+ routes) | Static UI Specs & Controls | Production Ready | Internal Reference |

---

## 3. Current Sidebar & Navigation Audit

### Current Structure (`src/app/(app)/layout.tsx`)
1. **Workspace**:
   - `Dashboard` (`/dashboard`, icon: `▦`)
   - `Live Collection` (`/live`, icon: `●`)
   - `Leads` (`/leads`, icon: `◉`, dynamic badge: total leads)
   - `Follow-ups` (`/follow-ups`, icon: `◷`, dynamic badge: due follow-ups, tone: amber)
   - `Outbox` (`/outbox`, icon: `✉`)
2. **Add leads**:
   - `Import CSV` (`/import`, icon: `⇪`)
   - `New lead` (`/leads/new`, icon: `＋`)
3. **Brand**:
   - `Design System` (`/design-system`, icon: `🎨`)
   - `Tokens` (`/design-system/foundations/colors`, icon: `◍`)
4. **Setup**:
   - `Settings` (`/settings`, icon: `⚙`)
   - `Collector Config` (`/settings/lead-collection`, icon: `◎`)
   - `Email & DNS` (`/settings/email`, icon: `✉`)
   - `WhatsApp API` (`/settings/whatsapp`, icon: `◍`)
   - `Compliance` (`/settings/compliance`, icon: `⚖`)
5. **Footer**:
   - Active user display (`user.name` / `user.email`)
   - `Sign out` button (invokes `/api/auth/logout`)

### Deficiencies Identified
- **Hidden Operations**: Candidates queue, Collector runs, Rotation states, and Source health are buried inside a sub-tab of `/settings/lead-collection` instead of being first-class operational views.
- **Ambiguous Distinction**: Qualified `Leads` (actionable pipeline) vs raw `Candidates` (discovery stage) are separated across disparate areas of the app.
- **Legacy Artifacts**: `/live` links to an unauthenticated local process watchdog screen (`/api/live` / `/api/restart`) rather than the transactional `CollectorRun` database records.

---

## 4. Leads Module Audit

- **List View (`/leads`)**:
  - Columns: Company (with category & city), Contact (name, email, phone), Country badge, Site (segment badge & URL), Score, Status badge, Sent counts (✉ email, ◍ WhatsApp), Follow-up date badge, Action link.
  - Search: Full text query `q` matching `companyName`, `contactName`, `email`, `city`, `businessCategory`, `phone` (case-insensitive).
  - Filters: Status (`LEAD_STATUSES`), Website segment (`SEGMENTS`), Country (`COUNTRIES`), Sort (`score`, `recent`, `name`, `followup`).
  - Pagination: Server-side (40 leads per page).
  - Row Actions: Single "Open" button linking to `/leads/[id]`.
  - Bulk Actions: None present.
- **Detail View (`/leads/[id]`)**:
  - Header: Status badges, Segment, Country, Score, External site link, LinkedIn link.
  - Personalisation Hook: Displays AI-generated or parsed hook line, detected issues list, copy button.
  - Email Composer: Pre-drafted email, custom text edit, saved template selector, direct send via SMTP/Resend.
  - WhatsApp Sender: 24h conversation window tracker, free-form vs approved template switcher, Meta template sender.
  - Quick Actions: Status transition pills (`REPLIED`, `CALL_BOOKED`, `PROPOSAL_SENT`, `WON`, `LOST`, `NURTURE`), inbound reply logging, follow-up scheduling, note creation.
  - Timeline / Activity Feed: Displays chronological outreach and inbound history.
- **Traceability Support in Schema**:
  - `collectorRunId` (relation to `CollectorRun`)
  - `qualifiedFromCandidate` (relation to `LeadCandidate`)

---

## 5. Candidates Module Audit

- **Current Implementation**: Implemented as a tab within `/settings/lead-collection` (`src/app/(app)/settings/lead-collection/client.tsx`).
- **List / Table Features**:
  - Columns: Business (name, OSM/Google external type & ID), Category, Location (city, country), Contact (email, phone), Discovery (source name, Run ID, Run location), Status badge, Reason (human-readable rejection reason), Created timestamp, "View" action button.
  - Filters: Text search (`candidateSearch`), Status select, Category select, Source select, City text filter, Page size (25/50/100), Sort field (`createdAt`, `companyName`, `status`, `city`).
  - Summary KPI cards: Total Candidates, Needs Enrichment, Rejected, Qualified, Discovered, Verification Pending.
- **Detail Experience (Flyout Drawer)**:
  - Sections: Business Identity, Pipeline Lifecycle Timeline (Discovered → Quality Filter → Enrichment → CRM Lead), Contact info, Location details, Discovery Source traceability (Source name, Type, Run ID, Started timestamp), Raw OSM/Google Tags (formatted code block), Metadata.
- **Invisible 4C Data / Gaps in Current View**:
  - Cross-source Google website evidence decisions (`MATCH_DECISION`, `RESOLVED_IDENTITY`, `WEBSITE_EVIDENCE`).
  - Domain-level verification audit (`email_domain_has_live_website` check outcomes).
  - Specific Google request IDs or cache hits associated with candidate verification.
  - Qualification evidence links connecting candidate directly to created `Lead` record.

---

## 6. Collector Module Audit

- **Current Screen**: `/settings/lead-collection` contains 10 sub-tabs:
  1. `overview`: Global counts (locations, categories, source health, yield metrics, fair rotation next assignment, last run summary).
  2. `general`: `CollectorConfig` view (mode, batch sizes, timeouts, concurrency).
  3. `locations`: `CollectorLocation` table + create form + enable/disable/delete actions.
  4. `categories`: `LeadCategory` table + create form + enable/disable/delete actions.
  5. `sources`: `DataSource` table + health status + `ProviderCredential` list.
  6. `rules`: `CollectionRule` list + enable/disable actions.
  7. `runs`: `CollectorRun` historical table (Started/Finished, status, location/category, raw/parsed/persisted, rejected breakdown, accepted/inserted, duration, GitHub Actions run link).
  8. `states`: `CollectorState` table (Location/Category/Source combo, last run, next eligible countdown, cycle/failures, totals).
  9. `candidates`: `LeadCandidate` queue and detail drawer.
  10. `enrichment`: `EnrichmentConfig` budget status, limits, provider count, global usage breakdown.
- **Prisma Model Mapping**:
  - `CollectorConfig` → `getCollectorConfig()`, `PUT /api/collector/config`
  - `CollectorLocation` → `getLocations()`, `POST /api/collector/locations`, `[id]` route
  - `LeadCategory` → `getCategories()`, `POST /api/collector/categories`, `[id]` route
  - `DataSource` → `getDataSources()`, `POST /api/collector/sources`, `[id]` route
  - `CollectorRule` → `getCollectionRules()`, `POST /api/collector/rules`, `[id]` route
  - `CollectorRun` → `getCollectorRuns()`, `GET /api/collector/runs`
  - `CollectorState` → `getCollectorStates()`, `GET /api/collector/states`

---

## 7. Google Observability Audit

- **Current Status**: Backend guardrails, activation modes, canary scopes, rate limits, usage tracking, and caching models are 100% implemented in `src/lib/google-activation.ts`, `src/lib/google-website-verification.ts`, `prisma/schema.prisma`, but **NOT YET EXPOSED** in dedicated UI views.
- **Required Observability Elements**:
  - Configuration status: Mode (`DISABLED` / `CANARY` / `PRODUCTION`), Enabled flag (`false`), Fail-closed indicator.
  - Canary allowlist scopes (e.g. Manchester + dental).
  - Rate limits & quotas: Per-run limit (3 canary / 10 prod), Daily limit (5 canary / 50 prod), Monthly limit (500 hard cap).
  - Usage metrics (from `GoogleApiUsage`): Total requests, Status breakdown (`RESERVED`, `SUCCESS`, `NO_RESULT`, `FAILED`, `CANCELLED`), Operation breakdown (`TEXT_SEARCH`, `PLACE_DETAILS`, `NEARBY_SEARCH`, `GEOCODING`), Error classifications (`AUTH_ERROR`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, etc.).
  - Cache metrics (from `GoogleApiCache`): Total cached entries, hit counts, TTL configuration, expiration distribution.
  - Zero-Secret Policy: API key (`GOOGLE_MAPS_API_KEY`) is NEVER rendered or editable in the UI; status is purely boolean `Configured (••••XXXX)` or `Missing`.

---

## 8. Enrichment UI Audit

- **Current Status**: Implemented under `/settings/lead-collection` -> `enrichment` tab.
- **Displayed Metrics**:
  - Status: Default `● Disabled` (Fail-closed, no external HTTP calls).
  - Budget Status: `ENRICHMENT_DISABLED` / `WITHIN_BUDGET` / `DAILY_CANDIDATE_LIMIT_REACHED`, etc.
  - Limits: Daily candidate limit (100), Batch size (25), Max attempts (3), Cooldown (60m), Lock (10m).
  - Providers: Number of configured credentials vs available adapters.
  - Usage UTC Accounting: Daily candidates processed, daily credits, monthly credits.
- **Operational Rule**: Real providers remain deferred/disabled in Phase 4D.1.

---

## 9. Backend Data Model Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                              AdminUser                                 │
│  id, email, name, passwordHash, isActive, lastLoginAt                  │
└────────────────────────────────────────────────────────────────────────┘
                                    │ (operates)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              Lead                                      │
│  id, companyName, businessCategory, country, city, website, score,     │
│  segment, hookLine, contactName, email, phone, status, priority,       │
│  optedInEmail, optedInWhatsapp, doNotContact, activities               │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ (1:1 qualification)
┌────────────────────────────────────┴───────────────────────────────────┐
│                          LeadCandidate                                 │
│  id, externalId, externalType, companyName, businessCategory, city,   │
│  country, email, phone, website, status, rejectionReason, rawTags,     │
│  metadata, discoverySourceId, discoveryRunId, qualifiedLeadId          │
└──────────────┬─────────────────────────────────────────────┬───────────┘
               │ (belongs to)                                │ (tracked in)
               ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────┐
│          DataSource          │              │       CollectorRun       │
│  id, name, type, enabled,    │              │  id, startedAt, status,  │
│  baseUrl, healthStatus,      │◀─────────────│  candidatesFound,        │
│  timeoutMs, retryCount       │ (executes)   │  leadsAccepted,          │
└──────────────┬───────────────┘              │  durationMs, metadata    │
               │                              └──────────────┬───────────┘
               ├──────────────────────┐                      │
               ▼                      ▼                      ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│        GoogleApiCache        ││        GoogleApiUsage        │
│  id, sourceId, operation,    ││  id, sourceId, operation,    │
│  queryFingerprint, hitCount, ││  status, requestUnits,       │
│  expiresAt, responseMetadata ││  collectorRunId, placeId     │
└──────────────────────────────┘└──────────────────────────────┘
```

### Operational Model Matrix

| Model | Purpose | Primary UI Consumer | Key Fields | Read-Only vs Mutable in UI | Sensitive Fields |
|---|---|---|---|---|---|
| `Lead` | Actionable sales prospects | Leads View, Lead Detail, Dashboard | `companyName`, `email`, `phone`, `status`, `score`, `segment`, `nextFollowUpAt` | Mutable (status, follow-up, notes, outreach) | None |
| `LeadCandidate` | Discovered raw businesses in qualification pipeline | Candidates View, Candidate Detail | `companyName`, `externalId`, `status`, `rejectionReason`, `discoveryRunId`, `rawTags` | Read-Only (except manual re-check / qualification) | None |
| `CollectorConfig` | Global collection engine parameters | Collection Settings | `enabled`, `collectionMode`, `defaultBatchSize`, `concurrentRequests`, `frequency` | Mutable | None |
| `CollectorLocation` | Geographical search targets | Locations View / Config | `city`, `state`, `country`, `countryCode`, `radiusKm`, `enabled`, `priorityLabel` | Mutable (Create, Edit, Toggle, Delete) | None |
| `LeadCategory` | Business type discovery configurations | Categories View / Config | `name`, `slug`, `osmTags`, `enabled`, `priorityLabel`, `runLimit` | Mutable (Create, Edit, Toggle, Delete) | None |
| `DataSource` | Provider endpoints & protocols | Sources View / Config | `name`, `type`, `baseUrl`, `enabled`, `healthStatus`, `lastCheckedAt` | Mutable (Toggle, Edit parameters) | None |
| `CollectionRule` | Extensible filtering rules | Rules View / Config | `key`, `name`, `description`, `enabled`, `category`, `config` | Mutable (Toggle, Edit) | None |
| `CollectorState` | Fair rotation cursor & eligibility tracking | Rotation / States View | `locationId`, `categoryId`, `sourceId`, `lastRunAt`, `nextEligibleRunAt`, `cycle` | Read-Only (system managed) | None |
| `CollectorRun` | Execution log for each collection job | Runs View, Run Detail | `startedAt`, `finishedAt`, `status`, `candidatesFound`, `leadsAccepted`, `metadata` | Read-Only (system logged) | None |
| `GoogleCollectionConfig` | Google activation guardrails & limits | Google Guardrails Config | `enabled`, `activationMode`, `canaryScopes`, `perRunRequestLimit`, `dailyRequestLimit` | Mutable (strict guardrails) | None |
| `GoogleApiUsage` | Individual Google API request audit trail | Google Observability | `operation`, `status`, `requestUnits`, `collectorRunId`, `queryFingerprint`, `placeId` | Read-Only (system logged) | None |
| `GoogleApiCache` | Cached Google API responses | Google Observability / Cache | `queryFingerprint`, `operation`, `expiresAt`, `hitCount`, `lastHitAt` | Read-Only (system managed) | None |
| `EnrichmentConfig` | Global enrichment limits & guardrails | Enrichment Config | `enabled`, `dailyCandidateLimit`, `batchSize`, `maxAttemptsPerCandidate` | Mutable (remains disabled) | None |
| `EnrichmentJob` | Queued candidate enrichment tasks | Enrichment Monitoring | `candidateId`, `status`, `priority`, `attemptCount`, `nextAttemptAt` | Read-Only | None |
| `EnrichmentAttempt` | Historical provider enrichment calls | Enrichment Monitoring | `jobId`, `providerType`, `status`, `startedAt`, `costUnits`, `failureReason` | Read-Only | None |
| `ProviderCredential` | Third-party API credentials storage | Settings -> Sources / Credentials | `provider`, `label`, `encryptedValue`, `keyHint`, `enabled`, `status` | Mutable (Add, Toggle, Delete) | `encryptedValue` (AES-256-GCM) |

---

## 10. API Audit Matrix

| Route | Methods | Auth | Data Returned | Mutation Behavior | UI Consumer | Production Readiness |
|---|---|---|---|---|---|---|
| `/api/auth/login` | POST | Public (Rate-limited) | `{ ok: true, user }` | Sets HTTP-only JWT session cookie | Login Screen | Production Ready |
| `/api/auth/logout` | POST | Session | `{ ok: true }` | Clears session cookie | Shell Navigation | Production Ready |
| `/api/collector/overview` | GET | Active User | Counts, health breakdown, yield metrics, next assignment, recent runs | None (Read-only) | Lead Ops / Collection Overview | Production Ready |
| `/api/collector/candidates` | GET | Active User | Paginated candidates list + metadata (`total`, `page`, `pageSize`, `totalPages`) | None (Read-only) | Candidates Table | Production Ready |
| `/api/collector/candidates/[id]` | GET | Active User | Candidate record with relations (`discoverySource`, `discoveryRun`, `qualifiedLead`) | None (Read-only) | Candidate Detail Drawer | Production Ready |
| `/api/collector/candidates/stats` | GET | Active User | `{ total, recent24h, counts: { NEEDS_ENRICHMENT, REJECTED, QUALIFIED, ... } }` | None (Read-only) | Candidate Filter Bar / KPIs | Production Ready |
| `/api/collector/runs` | GET | Active User | List of `CollectorRun` records with relations (`location`, `category`, `source`) | None (Read-only) | Collector Runs Table | Production Ready |
| `/api/collector/states` | GET | Active User | List of `CollectorState` records with relations (`location`, `category`, `source`) | None (Read-only) | Fair Rotation / States Table | Production Ready |
| `/api/collector/sources` | GET, POST | Active User | List of `DataSource` records / Created `DataSource` | POST creates new endpoint | Sources Table | Production Ready |
| `/api/collector/sources/[id]` | GET, PUT, DELETE | Active User | Source record / Updated / Deleted | PUT updates, DELETE removes | Sources Config | Production Ready |
| `/api/collector/locations` | GET, POST | Active User | List of `CollectorLocation` / Created location | POST creates location | Locations Config | Production Ready |
| `/api/collector/locations/[id]` | GET, PUT, DELETE | Active User | Location record / Updated / Deleted | PUT updates, DELETE removes | Locations Config | Production Ready |
| `/api/collector/categories` | GET, POST | Active User | List of `LeadCategory` / Created category | POST creates category | Categories Config | Production Ready |
| `/api/collector/categories/[id]` | GET, PUT, DELETE | Active User | Category record / Updated / Deleted | PUT updates, DELETE removes | Categories Config | Production Ready |
| `/api/collector/rules` | GET, POST | Active User | List of `CollectionRule` / Created rule | POST creates rule | Rules Config | Production Ready |
| `/api/collector/rules/[id]` | GET, PUT, DELETE | Active User | Rule record / Updated / Deleted | PUT updates, DELETE removes | Rules Config | Production Ready |
| `/api/collector/config` | GET, PUT | Active User | `CollectorConfig` record | PUT updates parameters | Collection Settings | Production Ready |
| `/api/collector/credentials` | GET, POST | Active User | Masked credentials list / Created credential | POST encrypts & stores | Credentials Settings | Production Ready |
| `/api/collector/credentials/[id]` | DELETE | Active User | `{ ok: true }` | Deletes credential | Credentials Settings | Production Ready |
| `/api/enrichment/config` | GET | Active User | Sanitized `EnrichmentConfig` | None (Read-only) | Enrichment Settings | Production Ready |
| `/api/enrichment/stats` | GET | Active User | Enrichment counts, budget status, UTC accounting | None (Read-only) | Enrichment Settings | Production Ready |
| `/api/enrichment/jobs` | GET | Active User | Paginated `EnrichmentJob` list | None (Read-only) | Enrichment Monitoring | Production Ready |

---

## 11. Canonical Information Architecture for Lead Operations

To provide operational clarity, low cognitive load, and zero clutter, the admin navigation is organized into functional pillars:

```
├── LEAD OPERATIONS
│   ├── Overview          (/dashboard)            — Operational pulse & pipeline health (<10s scan)
│   ├── Leads             (/leads)                — Qualified, actionable sales opportunities
│   ├── Candidates        (/candidates)           — Discovery queue & forensic qualification records
│   ├── Collection                                — Collector engine operations & observability
│   │   ├── Overview      (/collection)           — Yield, health, rotation, active runs
│   │   ├── Runs          (/collection/runs)      — Execution history & GitHub Actions traceability
│   │   ├── Rotation      (/collection/states)    — Location-category combo states & next eligibility
│   │   └── Sources       (/collection/sources)   — Endpoint health, adapter status, credentials
│   └── Verification      (/verification)         — Filtered view on candidate verification decisions
│
├── ENGAGEMENT
│   ├── Follow-ups        (/follow-ups)           — Scheduled outreach & due tasks
│   ├── Outbox            (/outbox)               — Sent emails & WhatsApp log
│   └── Import            (/import)               — Bulk CSV ingestion
│
└── SETTINGS & CONFIGURATION
    ├── Locations         (/settings/locations)   — Geographic target management
    ├── Categories        (/settings/categories)  — Business type taxonomy & OSM tags
    ├── Collection Rules  (/settings/rules)       — Qualification & filtering rules
    ├── Google Guardrails (/settings/google)      — Activation mode, canary scopes, hard budget caps
    ├── Email & DNS       (/settings/email)       — Outbound mail & domain authentication
    ├── WhatsApp API      (/settings/whatsapp)    — Meta Cloud API integration
    └── Compliance        (/settings/compliance)  — Suppression lists & opt-in records
```

---

## 12. Screen Responsibility Contracts

### 12.1 Overview Screen (`/dashboard`)
- **Objective**: Answer operational health in <10 seconds.
- **Key Metrics**:
  - Qualified Leads count (Total, New this week, Active follow-ups).
  - Candidates Pipeline breakdown (`NEEDS_ENRICHMENT`, `REJECTED`, `QUALIFIED`).
  - Active Collector Status (Is collector executing? Last run status & timestamp).
  - Today's Yield (Parsed candidates → Qualified leads).
  - Active Discovery Source (OpenStreetMap active / Google disabled / Enrichment disabled).
  - System Alerts (Any failed runs, degraded sources, or suppression violations).

### 12.2 Leads Screen (`/leads`)
- **Objective**: Dense, actionable management of qualified prospects.
- **Table Information Hierarchy**:
  1. Company Name & Category (with location subtitle).
  2. Primary Contact (Name, Email, Phone).
  3. Country badge.
  4. Website Segment (`NO_SITE`, `BROKEN`, `OUTDATED`).
  5. Opportunity Score (`0-100`).
  6. Pipeline Status (`NEW`, `QUALIFIED`, `CONTACTED`, `REPLIED`, etc.).
  7. Outreach Sent count (✉, ◍).
  8. Follow-up Due date badge.
  9. Action: Single "Open" button.

### 12.3 Candidates Screen (`/candidates`)
- **Objective**: Discovery queue inspection & qualification forensics.
- **Table Information Hierarchy**:
  1. Business Name & External ID (e.g. `node/12345678`).
  2. Category & City/Country.
  3. Extracted Contact (Email, Phone).
  4. Discovery Provenance (Source name, Run ID).
  5. Candidate Status badge (`NEEDS_ENRICHMENT`, `REJECTED`, `QUALIFIED`, `DISCOVERED`).
  6. Rejection Reason (`Existing Website`, `Email Domain Has Live Website`, `Generic Email`).
  7. Discovery Timestamp.
  8. Action: Single "Inspect" button opening Detail Drawer.

### 12.4 Candidate Detail Architecture (Drawer)
- **Section 1: Business Identity**: Name, Category, External Provider ID, Coordinates, Address.
- **Section 2: Contact Information**: Extracted email, phone, role mailbox detection.
- **Section 3: Qualification & Evidence**:
  - Qualification Status & Rejection Reason.
  - Website Evidence (Extracted tag vs Google Places Place Details match vs Email Domain HTTP check).
  - Identity Resolution Match strength (`EMAIL_PHONE_COORDINATES_ADDRESS`, etc.).
- **Section 4: Provenance & Traceability**:
  - Discovery Source & Collector Run ID.
  - Link to created CRM `Lead` if qualified.
- **Section 5: Raw Data (Collapsed)**: Expandable JSON preview for raw OSM tags or Google Places payload.

### 12.5 Verification Screen Architecture
- **Decision**: Implemented as a **Dedicated View** with pre-configured filters over candidates with website verification evidence (e.g. `status = REJECTED` with `reason in [existing_website, email_domain_has_live_website]` or `status = VERIFICATION_PENDING`).
- **Rationale**: Avoids creating a duplicate backend pipeline while giving operators instant visibility into cross-source website verification outcomes without cluttering the main candidate queue.

### 12.6 Collection Overview (`/collection`)
- **Metrics Calculated from Stored Data**:
  - Active Collector Status (`CollectorConfig.enabled`, `collectionMode`).
  - Source Health Summary (Counts of healthy, degraded, down sources).
  - Yield Metrics across recent runs (Total Parsed, Total Accepted, Total Persisted).
  - Exclusion Breakdown (No-email rate, Existing-website rejection rate, Duplicate rate).
  - Next Fair Rotation Assignment (Location, Category, Source, countdown).

### 12.7 Runs Screen (`/collection/runs`)
- **Fields Displayed**:
  - Started / Finished timestamps & Duration (seconds).
  - Execution Status badge (`SUCCESS`, `PARTIAL`, `FAILED`, `RUNNING`).
  - Target: Location (City, Country) / Category (Slug) / Source (Name).
  - Discovery Yield: Raw Found → Parsed → Candidates Persisted (`needEnrich` count).
  - Rejection Metrics: `noEmail` / `websiteRejected` / `duplicateRejected`.
  - Accepted & Inserted Leads count.
  - Traceability: GitHub Actions Run ID link (`GH#12345`).

### 12.8 Rotation / States Screen (`/collection/states`)
- **Human-Centric Display**:
  - Location / Category / Source combination.
  - Last Run Timestamp & Execution Status.
  - Next Eligibility Countdown (e.g. "Now", "14m 20s", "2h 15m").
  - Fair Rotation Cycle count & Consecutive Failures.
  - Cumulative Yield (Total Candidates discovered / Total Leads accepted).

### 12.9 Sources Screen (`/collection/sources`)
- **Display Specifications**:
  - Source Name & Provider Type (`overpass`, `google_places`, `custom`).
  - Operational Role (`Free Discovery`, `Paid Evidence / Selective Discovery`, `Contact Enrichment`).
  - Enabled State toggle & Priority indicator.
  - Health Status badge (`healthy`, `degraded`, `down`, `unknown`).
  - Last Checked timestamp & Base URL.
  - Associated Provider Credentials (Masked key hints: `••••9K2A`).

### 12.10 Google Guardrails UI (`/settings/google`)
- **Configuration & Observability Controls**:
  - Activation Mode Indicator & Selector (`DISABLED` [default], `CANARY`, `PRODUCTION`) with confirmation lock.
  - Master Enabled switch (`false`).
  - Canary Allowlist Scopes view (e.g. `[ { "countryCode": "GB", "city": "Manchester", "categorySlug": "dental" } ]`).
  - Budget & Request Limits: Per-run limit (Canary: 3, Prod: 10), Daily limit (Canary: 5, Prod: 50), Monthly limit (500 hard cap).
  - Caching Policy: Cache Enabled (`true`), Query Cache TTL (24h), Place Details TTL (168h).
  - Usage & Cache Observability: Total requests logged, status breakdown, error classification table, cache hit rates.
  - **Zero-Secret Guarantee**: API Key value is NEVER displayed or edited here; status is indicated purely as `Configured` or `Missing`.

### 12.11 Locations UI (`/settings/locations`)
- **Management Capabilities**:
  - Filterable list of `CollectorLocation` records.
  - Columns: City, State, Country, Country Code badge, Search Radius (km), Priority Label (`LOW`, `MEDIUM`, `HIGH`), Last Collected timestamp, Enabled toggle, Actions (Edit, Delete).
  - Modal/Inline Create & Edit form with latitude/longitude and radius validation.

### 12.12 Categories UI (`/settings/categories`)
- **Management Capabilities**:
  - List of `LeadCategory` records.
  - Columns: Category Name, Slug, Priority Label, Last Run timestamp, OSM Query Tags preview, Enabled toggle, Actions (Edit, Delete).
  - Create & Edit form supporting name, slug, priority, and JSON OSM tag configuration.

### 12.13 Collection Rules UI (`/settings/rules`)
- **Management Capabilities**:
  - List of `CollectionRule` records grouped by category (`lead_requirements`, `filtering`, `validation`).
  - Displays: Rule Name, System Key, Description, Category, Enabled toggle.

---

## 13. Action Safety & Interaction Model

### 13.1 Action Classification

```
┌────────────────────────────────────────────────────────────────────────┐
│ SAFE ACTIONS (Direct execution, instant feedback)                       │
│ • View Lead / Candidate / Run / Source details                         │
│ • Apply search, filters, sorting, and pagination                       │
│ • Copy email / phone / personalisation hook / text                     │
│ • Schedule next follow-up date                                         │
│ • Add lead note                                                        │
│ • Edit lead CRM fields (contact name, role, notes)                     │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ SENSITIVE ACTIONS (Low-friction confirmation or reversible)            │
│ • Change Lead pipeline status (e.g. QUALIFIED → CONTACTED)             │
│ • Toggle Location / Category enabled state                             │
│ • Toggle Collection Rule enabled state                                 │
│ • Create new Location / Category / Rule                                │
│ • Log inbound customer reply                                           │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ DANGEROUS ACTIONS (Mandatory modal confirmation + explicit typed lock)  │
│ • Activating Google collection or changing mode (CANARY / PRODUCTION)  │
│ • Modifying Google request quotas or monthly hard caps                 │
│ • Enabling Enrichment engine                                           │
│ • Deleting a Location, Category, or Data Source                        │
│ • Deleting or adding Provider API credentials                          │
│ • Deleting a Lead record                                               │
│ • Bulk candidate qualification or rejection overrides                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Button & Action UX Policy
- **Primary vs Secondary Restraint**: Exactly **ONE** primary CTA per view context (e.g. `+ New Lead` on Leads list, `Save Changes` on forms).
- **Zero Table Clutter**: Table rows must **NEVER** contain 4–8 raw action buttons. Each row has at most:
  - 1 Primary row action (e.g. `Open` for Leads, `Inspect` for Candidates).
  - Optional compact overflow menu (`⋯`) for secondary actions (e.g. `Copy ID`, `Archive`, `Delete`).
- **Icon Integrity**: All icons must have accessible labels or tooltips; no mysterious bare icon buttons.

---

## 14. Data-Table & Filtering Standards

### 14.1 Canonical Data-Table Specification
- **Visual Foundation**: White panel card (`#FFFFFF`), subtle border (`#E5E3DF`), 10px rounded corners, zero heavy shadows.
- **Typography**: Header text 11px uppercase bold (`#9299A8`), body text 13px regular (`#151927`), secondary metadata 11px muted (`#60697A`).
- **Row Styling**: Subtle row hover highlight (`#FAF9F7`), crisp 1px divider lines (`#F0EEEA`), compact vertical padding (10–12px).
- **Responsive Handling**: Horizontal overflow wrapper (`overflow-x: auto`) on desktop/tablet to prevent column crunch; never stack rows into tall vertical cards on admin tables.
- **Server Pagination**: Sticky bottom pagination bar with page range (`Showing 1–25 of 649`), page selector, and `Prev`/`Next` controls.

### 14.2 Filter Bar Architecture
- **Compact Two-Tier Layout**:
  - **Tier 1 (Instant Scan)**: Search input with debounced server query + "Clear filters" button.
  - **Tier 2 (Facet Selectors)**: Status dropdown, Category dropdown, Country/City selector, Sort Order dropdown, Page Size selector.
- **Applied Filter Badges**: Active filters displayed as compact dismissible chips.

---

## 15. Semantic Status & Visual Language

| Status Category | Semantic Meaning | Background | Text Color | Border | Example Usages |
|---|---|---|---|---|---|
| **Success** | Qualified / Healthy / Complete | `#EEF8F4` | `#276749` | `#D5F0E5` | `QUALIFIED`, `healthy`, `SUCCESS`, `WITHIN_BUDGET` |
| **Warning** | Pending / Enrichment / Degraded | `#FFF6E3` | `#B7791F` | `#F4BE52` | `NEEDS_ENRICHMENT`, `degraded`, `PARTIAL`, `HIGH` priority |
| **Danger** | Rejected / Down / Failed | `#FDECEC` | `#C53030` | `#FBD5D5` | `REJECTED`, `down`, `FAILED`, `DO NOT CONTACT` |
| **Info / Discovery** | Discovered / Running / In Progress | `#F0ECFA` | `#553C9A` | `#E0D6F5` | `DISCOVERED`, `RUNNING`, `QUEUED`, `overpass` |
| **Verification** | Pending Verification / Check | `#EAF7FA` | `#2B6CB0` | `#C5E9F1` | `VERIFICATION_PENDING`, `CHECK` |
| **Neutral** | Disabled / Unset / Dormant | `#FAF9F7` | `#60697A` | `#E5E3DF` | `DISABLED`, `unknown`, `MEDIUM` priority |

---

## 16. State Handling Standards

### 16.1 Empty States
- Custom, contextual empty illustrations with informative messaging:
  - *No leads found*: "No qualified leads match the selected filters. Try clearing filters or importing leads."
  - *No candidates found*: "Candidate discovery queue is empty. Collection worker will populate candidates on next run."
  - *Google disabled*: "Google Places collection is currently disabled in guardrails config."
  - *Enrichment disabled*: "Enrichment providers are inactive. Candidates remain safely in pre-enrichment queue."

### 16.2 Loading & Error States
- **Loading**: High-density skeleton row placeholders matching exact table column geometry; zero jarring full-page spinners.
- **Error**: Inline card-level alert banners (`#FDECEC`) with explicit error message and an "Inline Retry" trigger.

---

## 17. Security, Authorization & Performance

### 17.1 Authentication & Session
- Managed via `src/lib/session.ts` using signed JWT (`jose` HS256) stored in HTTP-only, secure, same-site `cf_session` cookie.
- All App Router pages and API routes enforce `await requireActiveUser()`.
- Single-admin internal operational model; multi-role RBAC documented for future scale.

### 17.2 Performance & Scalability Guardrails
- **Strict Server Pagination**: All candidate queries bounded to `pageSize` (25/50/100); never load unbounded tables into browser memory.
- **Indexed Database Filtering**: Prisma queries leverage compound indexes on `[status]`, `[discoveryRunId]`, `[city]`, `[businessCategory]`, `[nextFollowUpAt]`.
- **Debounced Search**: Text search inputs debounced by 300ms to eliminate server query thrashing.

---

## 18. UI Design Component Inventory

| Component Category | Component Name | Workspace Path | Status | Notes / Plan |
|---|---|---|---|---|
| **Buttons** | `Button` | `src/components/ui/Button.tsx` | **READY** | Full variant support (`primary`, `secondary`, `outline`, `ghost`, `danger`) |
| **Buttons** | `ButtonGroup` | `src/components/ui/ButtonGroup.tsx` | **READY** | Segmented and standard group controls |
| **Buttons** | `IconButton` | `src/components/ui/IconButton.tsx` | **READY** | Icon buttons with tooltips |
| **Form Controls** | `Input` | `src/components/ui/Input.tsx` | **READY** | Size variants (`sm`, `md`, `lg`), states, icons |
| **Form Controls** | `Select` | `src/components/ui/Select.tsx` | **READY** | Custom select with status dots and groups |
| **Form Controls** | `Textarea` | `src/components/ui/Textarea.tsx` | **READY** | Auto-grow support |
| **Form Controls** | `Checkbox` | `src/components/ui/Checkbox.tsx` | **READY** | Custom checkbox with indeterminate state |
| **Form Controls** | `Radio` | `src/components/ui/Radio.tsx` | **READY** | Custom radio buttons |
| **Form Controls** | `Switch` | `src/components/ui/Switch.tsx` | **READY** | Toggle switch component |
| **Navigation** | `Dropdown` | `src/components/ui/Dropdown.tsx` | **READY** | Action and overflow menus |
| **Navigation** | `Sidebar` | `src/app/(app)/layout.tsx` | **NEEDS EXTENSION** | Reorganize into Phase 4D canonical groupings |
| **Data Display** | `DataTable` | `src/components/ui/DataTable.tsx` | **NEEDS EXTENSION** | Standardize reusable table wrapper across Leads/Candidates/Runs |
| **Data Display** | `Badge` | `src/components/ui/Badge.tsx` | **READY** | Semantic status badge system |
| **Data Display** | `KpiCard` | `src/components/ui/KpiCard.tsx` | **READY** | Summary metric cards |
| **Feedback** | `Drawer` | `src/components/ui/Drawer.tsx` | **NEEDS EXTENSION** | Candidate forensic inspection flyout |
| **Feedback** | `Modal` | `src/components/ui/Modal.tsx` | **NEEDS EXTENSION** | Dangerous action confirmation dialog |
| **Feedback** | `Skeleton` | `src/components/ui/Skeleton.tsx` | **READY** | Table and card loading skeletons |

---

## 19. Prioritized Gap Analysis

### P0 — Critical Operational Requirements (Phase 4D Baseline)
1. **Promote Candidates Queue to First-Class View**: Create dedicated `/candidates` page with full server-side filtering, sorting, pagination, and detail drawer.
2. **Promote Collection Operations to First-Class Views**: Create `/collection` hub with dedicated sub-views for `/collection/runs`, `/collection/states`, and `/collection/sources`.
3. **Standardize Action Restraint & Confirmation Modals**: Replace dangerous instant buttons (Google activation, credential deletion) with structured confirmation modals.
4. **Expose Forensic Verification Evidence**: Render cross-source Google website decisions and email domain checks inside the Candidate Detail drawer.

### P1 — Important Observability & Usability Enhancements
1. **Google Guardrails Dedicated Screen (`/settings/google`)**: Visual activation mode switch, canary scope viewer, rate limit counters, and cache hit metrics.
2. **Unified Navigation & Layout Shell**: Update sidebar navigation to reflect canonical Lead Operations architecture.
3. **Dedicated Verification Filtered View (`/verification`)**: Specialized view for inspecting website-rejected candidates and cross-source matches.

### P2 — Future Scale & Automation
1. **Batch Candidate Actions**: Multi-select candidate re-verification trigger.
2. **Advanced Traceability Graph**: Interactive visualization linking OSM Entity → CollectorRun → Verification Decision → Lead Record.

---

## 20. Finite Phase 4D Implementation Roadmap

- **Phase 4D.1**: Information Architecture, Screen Maps, Data Models & Action Contracts Audit (Complete).
- **Phase 4D.2**: Lead Operations Shell & Navigation Reorganization (Complete).
- **Phase 4D.3**: Candidates View & Forensic Detail Experience (`/candidates`, evidence drawer).
- **Phase 4D.4**: Collection Operations Hub (`/collection`, `/collection/runs`, `/collection/states`, `/collection/sources`).
- **Phase 4D.5**: Google Guardrails & Observability UI (`/settings/google`, usage counters, cache stats).
- **Phase 4D.6**: Lead Pipeline Integration & Verification View (`/verification`, table standardizations).
- **Phase 4D.7**: End-to-End Operational Verification & Review.

---

## 21. Phase 4D.2 Execution & Route Promotion Record

### 21.1 Route Promotion & Extraction Map
All operational screens have been promoted into canonical first-class routes by extracting reusable presentation and data components into `src/components/collector/`:

| Promoted Route | Server Page File | Extracted Reusable Client Component | Source Tab / Functionality Reused |
|---|---|---|---|
| `/candidates` | `src/app/(app)/candidates/page.tsx` | `src/components/collector/CandidateQueueClient.tsx` | Candidate queue, server search/filters, pagination, detail drawer |
| `/collection` | `src/app/(app)/collection/page.tsx` | `src/components/collector/CollectorOverviewClient.tsx` | Overview KPI cards, fair rotation next assignment, last run |
| `/collection/runs` | `src/app/(app)/collection/runs/page.tsx` | `src/components/collector/CollectorRunsClient.tsx` | Collector run execution log, rejection breakdown, GitHub links |
| `/collection/states` | `src/app/(app)/collection/states/page.tsx` | `src/components/collector/CollectorStatesClient.tsx` | Fair rotation states, live countdowns, yield tracking |
| `/collection/sources` | `src/app/(app)/collection/sources/page.tsx` | `src/components/collector/CollectorSourcesClient.tsx` | Data sources, health status, AES-256 masked credentials |
| `/settings/locations` | `src/app/(app)/settings/locations/page.tsx` | `src/components/collector/CollectorLocationsClient.tsx` | Geographic target CRUD, radius, priority weights |
| `/settings/categories` | `src/app/(app)/settings/categories/page.tsx` | `src/components/collector/CollectorCategoriesClient.tsx` | Business taxonomy CRUD, OSM tag JSON configurations |
| `/settings/rules` | `src/app/(app)/settings/rules/page.tsx` | `src/components/collector/CollectionRulesClient.tsx` | Modular collection rules, category groupings |
| `/settings/google` | `src/app/(app)/settings/google/page.tsx` | `src/components/collector/GoogleGuardrailsPlaceholderClient.tsx` | Safe read-only status, mode `DISABLED`, zero secrets |

### 21.2 Final Sidebar Hierarchy
The application navigation layout (`src/app/(app)/layout.tsx`) implements the canonical five-group structure with active route precision in `shell-client.tsx`:

1. **WORKSPACE**:
   - `Overview` (`/dashboard`, icon: `▦`)
   - `Leads` (`/leads`, icon: `◉`, dynamic badge: `leadCount`)
   - `Candidates` (`/candidates`, icon: `◎`, dynamic badge: `candidateCount`)
2. **COLLECTION**:
   - `Overview` (`/collection`, icon: `⊞`)
   - `Runs` (`/collection/runs`, icon: `▷`)
   - `Rotation` (`/collection/states`, icon: `↻`)
   - `Sources` (`/collection/sources`, icon: `⚲`)
3. **ENGAGEMENT**:
   - `Follow-ups` (`/follow-ups`, icon: `◷`, dynamic badge: `dueCount`, tone: `amber`)
   - `Outbox` (`/outbox`, icon: `✉`)
   - `Import` (`/import`, icon: `⇪`)
4. **CONFIGURATION**:
   - `Locations` (`/settings/locations`, icon: `⌖`)
   - `Categories` (`/settings/categories`, icon: `◇`)
   - `Collection Rules` (`/settings/rules`, icon: `✓`)
   - `Google Guardrails` (`/settings/google`, icon: `◈`)
5. **SYSTEM**:
   - `Email & DNS` (`/settings/email`, icon: `✉`)
   - `WhatsApp API` (`/settings/whatsapp`, icon: `◍`)
   - `Compliance` (`/settings/compliance`, icon: `⚖`)
   - `Settings` (`/settings`, icon: `⚙`)

### 21.3 Legacy Route Handling
- `/live`: Removed from production sidebar navigation; direct URL remains operational for legacy/debug purposes.
- `/settings/lead-collection`: Preserved as a functional monolithic administrative hub, consuming the extracted components and keeping the `enrichment` tab operational.

### 21.4 Google Guardrails Placeholder Safety
- Route `/settings/google` exposes database configuration and usage counters strictly read-only.
- `activationMode` remains `DISABLED`, master `enabled` remains `false`.
- Zero API key exposure. Zero mutations. Zero Google network requests.

### 21.5 Smoke Test & Production Invariant Verification
- Verified by `scripts/test-4d2-navigation-smoke.mjs` (Hard network trap, all tests passed).
- Next.js production build (`npm run build`) compiled 91/91 pages cleanly.

---

## 22. Phase 4D.3 Execution Record — Candidates Operations Experience

### 22.1 Architecture & Implementation Summary
Phase 4D.3 delivers an administrative forensic candidate investigation interface in `src/components/collector/CandidateQueueClient.tsx` and `src/components/collector/collector-utils.ts`:

1. **High-Density Operational Table**:
   - Column layout: Business (company name, category, external type/ID), Contact (email, generic webmail badges, phone), Location (city, country code, street), Source (humanized source name, entity type), Status (tinted status badge), Decision/Reason (human-readable rejection reason, missing email status), Discovered (date, run ID), Action (`Inspect`).
   - Server-side debounced search (350ms) across company name, email, phone, city, and external ID.
   - Facet filters: Status, Category, Source, City, Sort Order, and Page Size (25/50/100).
   - Dismissible Active Filter Chips with a single "Clear filters" action.
   - Responsive KPI metric strip showing Total Candidates, Needs Enrichment, Rejected, Verification Pending, and Qualified.

2. **Forensic Slide-Over Drawer**:
   - Width: `min(580px, 94vw)`, keyboard `Escape` dismissal, backdrop click dismissal, `aria-modal="true"`.
   - **Section 1: Decision Summary Callout**: Most prominent top callout with semantic tone (`good`, `warn`, `bad`, `neutral`), status title, plain-English summary, and exact email/website/pipeline outcome facts.
   - **Section 2: Business Identity**: Company name, business category, address, city, country, postcode, exact coordinates, external provider ID.
   - **Section 3: Contact Intelligence**: Email with business vs generic domain classification pill, phone number, and discovery website tag.
   - **Section 4: Website & Verification Evidence**: OpenStreetMap tag evaluation, email domain live website detection (Emma Clinic protection), and Google Places cross-source verification status.
   - **Section 5: Source Evidence**: Parsed records from `metadata.sourceEvidence` with raw collected names, emails, websites, phones, and match timestamps.
   - **Section 6: Discovery Traceability**: Discovery source name/type, Collector Run ID, execution timestamps, target city/category, and GitHub Actions run links (`GH#...`).
   - **Section 7: CRM Lead Relationship**: Links to `/leads/[id]` if candidate was qualified into a CRM lead, or explicit explanation if no lead was created.
   - **Section 8: Technical Data (Collapsed)**: Safe JSON formatting for `rawTags` and `metadata` with clipboard copy buttons.

3. **Truth-Based Distinctions**:
   - Strict separation between **FACT** (e.g. "Website tag present in OSM tags"), **INFERENCE** (e.g. "Email domain uses generic webmail"), and **NOT CHECKED** (e.g. "Google Places cross-source check disabled").
   - Pure read-only operation: Zero Google API requests, zero candidate mutations, zero database schema changes.

### 22.2 Invariant & Test Verification
- Verified by `scripts/test-4d3-candidates-smoke.mjs` (24/24 unit & DB integrity checks passed).
- Verified by `scripts/test-4d2-navigation-smoke.mjs` (hard network trap passed).
- Next.js production build (`npm run build`) passed with all 91 pages compiled.

---

## 23. Phase 4D.4 Execution Record — Collection Operations Experience

### 23.1 Architecture & Implementation Summary
Phase 4D.4 establishes a coherent, unified Collection Operations workspace across four dedicated operational routes:

1. **Shared Sub-Navigation Component (`src/components/collector/CollectionOperationsHeader.tsx`)**:
   - Provides a restrained, consistent sub-navigation bar across `/collection` (Overview), `/collection/runs` (Runs), `/collection/states` (Rotation), and `/collection/sources` (Sources).
   - Reusable across standalone promoted routes and omitted automatically when embedded in legacy hubs (`showHeader={false}`).

2. **Collection Overview (`/collection` & `CollectorOverviewClient.tsx`)**:
   - **Job**: Answers "What is happening overall?" in under 10 seconds.
   - **Top Operational Strip**: Active Locations (8/8), Active Categories (7/7), Active Sources (1/4), Total Runs (10), Total Candidates (649).
   - **Collection Health Signals**: Factual operational state for OpenStreetMap (Active, last run relative time), Google Places (Disabled, Fail-closed guardrails), Last Run status/yield, and Next Rotation assignment.
   - **Last Run & Next Target Cards**: Two-column layout presenting last execution breakdown and next fair-rotation target with live countdown eligibility.
   - **Candidate Pipeline Yield Flow**: Discovered (649) → Needs Enrichment (408) → Disqualified (241) → Verification Pending (0) → Qualified Leads (0).
   - **Discovery Source Snapshot**: Compact cards for OpenStreetMap (ACTIVE) and Google Places (DISABLED).

3. **Collector Run History (`/collection/runs` & `CollectorRunsClient.tsx`)**:
   - **Job**: "What happened during each execution?"
   - **Summary Strip**: Bounded dataset summary of Total Logged Runs, Successful, Failed, Running, and Average Duration.
   - **Filter Toolbar**: Search by location, category, source, run ID, or GitHub run ID; filter by execution status.
   - **Dense Runs Table**: Run ID, GitHub Actions traceability link (`GH#...`), target city and category, humanized source, soft-tinted status badge, start timestamp, execution duration, and candidate yield.
   - **Run Inspection Slide-Over Drawer**: Run Summary callout, Failure details (if failed, safe from secret leaks), execution yield breakdown (raw found, parsed, needs enrichment, rejected), execution timestamps, and collapsible technical metadata JSON.

4. **Fair Rotation States (`/collection/states` & `CollectorStatesClient.tsx`)**:
   - **Job**: "What location/category combinations are next and how is rotation behaving?"
   - **Explanatory Line**: "Collection rotates across enabled location and category combinations to avoid repeatedly targeting the same market."
   - **Summary Strip**: Tracked Combinations (13), Eligible Now, Cooling Down, Next Assignment.
   - **Rotation Queue Table**: Target Location, Category, Source, Last Run (relative time or "Never run"), Next Eligible (clean countdown: "Ready now", "42m", "2h 14m"), State badge, Yield rate (with safe `—` handling for zero denominators).
   - **Next Target Highlight**: Distinct visual accent and `NEXT` pill on the earliest eligible combination.

5. **Data Sources (`/collection/sources` & `CollectorSourcesClient.tsx`)**:
   - **Job**: "Which discovery providers exist and are they healthy/safe?"
   - **Source Cards**: OpenStreetMap / Overpass (ACTIVE, public API, healthy), Google Places (DISABLED, fail closed, zero secret exposure, link to Google Guardrails).
   - **Secure Credential Inventory**: AES-256-GCM encrypted provider keys with masked key representation (`••••••••••••••••xxxx`), zero plain-secret or IV leakage to the client.
   - **Safety Invariant**: Zero Google activation controls exposed in this view (activation strictly governed by Phase 4D.5 Guardrails).

### 23.2 Shared Formatters & Utilities (`collector-utils.ts`)
- `formatDuration`: Converts seconds or milliseconds into readable human units (`42s`, `3m 18s`, `1h 1m`).
- `formatRelativeTime`: Converts timestamps into relative intervals (`10m ago`, `3h ago`, `2d ago`, `Never`).
- `formatYieldRate`: Calculates percentage yield with zero-denominator safety (`25.0%` or `—`).
- `runStatusBadgeStyle`: Maps execution status to ClientForge semantic palettes (`SUCCESS` green `#EEF8F4`, `FAILED` red `#FDECEC`, `RUNNING` amber `#FFF6E3`).
- `rotationStateBadge`: Evaluates next eligibility against current time (`READY`, `COOLING`, `NEVER_RUN`).
- `sourceHealthBadgeStyle`: Formats health signals (`healthy`, `degraded`, `down`).

### 23.3 Invariant & Test Verification
- Verified by `scripts/test-4d4-collection-operations-smoke.mjs` (34/34 tests passed).
- Verified by `scripts/test-4d3-candidates-smoke.mjs` (24/24 tests passed).
- Verified by `scripts/test-4d2-navigation-smoke.mjs` (14/14 tests passed).
- Prisma validation and Next.js production build (`npm run build`) passed with 91/91 routes compiled cleanly.
- Database Invariants:
  - `GoogleCollectionConfig.enabled`: `false`, `activationMode`: `DISABLED`
  - `DataSource (google_places).enabled`: `false`
  - `GoogleApiUsage.count`: `2` (0 pending)
  - `GoogleApiCache.count`: `2`
  - Total Candidates: `649` (`408` Needs Enrichment, `241` Rejected)
  - Zero Google API requests, zero candidate mutations.

---

## 24. Phase 4D.4A Execution Record — Provider Credential Display Hardening

### 24.1 Architecture & Security Hardening
Phase 4D.4A hardens the credential presentation across the Collection Operations workspace:

1. **Browser Projection Minimization**:
   - `getProviderCredentials()` in `src/lib/collector.ts` and `POST /api/collector/credentials` return a minimized safe browser projection (`configured: true`, `provider`, `label`, `enabled`, `status`, `lastUsedAt`, `lastTestedAt`).
   - Removed `keyHint`, `maskedKey`, and `••••` credential-fragment strings from browser-facing payloads.
   - `encryptedValue` and `iv` remain server-only.

2. **Clean Operational UI**:
   - Section header simplified from "AES-256-GCM Secure Provider Credentials Inventory" to "Provider Credentials".
   - Table column "Key Hint" replaced with "Credential Status" displaying `"Configured"` or `"Not configured"`.
   - Google Places card displays `Credential Status: Configured` with zero secret exposure.

3. **Verification & Smoke Tests**:
   - `scripts/test-4d4-collection-operations-smoke.mjs` updated to verify 40/40 assertions including explicit tests asserting absence of `keyHint`, `maskedKey`, `encryptedValue`, and `iv` in browser projection.

---

## 25. Phase 4D.5 Execution Record — Google Places Guardrails Operations

### 25.1 Architecture & Implementation Summary
Phase 4D.5 delivers the safe observability and guardrail management interface for Google Places at `/settings/google` via `src/components/collector/GoogleGuardrailsClient.tsx`:

1. **Authoritative Operational Status**:
   - **Master State**: Master Disabled (`GoogleCollectionConfig.enabled: false`).
   - **Activation Mode**: Read-only `DISABLED` (Fail Closed).
   - **Data Source**: Disabled in fair rotation (`DataSource(google_places).enabled: false`).
   - **Credential Status**: `Configured` (Server-only `GOOGLE_MAPS_API_KEY`, zero secret exposure to client).
   - **Reservations & Usage**: `0` pending/dangling reservations, `2` historical requests recorded.
   - **Query Cache**: `2` cached query entries (TTL: 24h search, 168h details).

2. **Safety Controls & Rate Limit Observability**:
   - Canary limits: 3 requests/run, 5 requests/day.
   - Production limits: 10 requests/run, 50 requests/day, 500 requests/month hard cap.
   - Strict retry limit: 0 retries (prevents budget bypass).
   - Query Cache TTL: 24 hours for Text Search, 7 days (168 hours) for Place Details.

3. **Canary Allowlist Scope**:
   - Configured allowlist: `Manchester, GB · Dental`.
   - Explains that all out-of-scope targets are rejected at the reservation stage before any network request can occur.

4. **Controlled Activity & Usage Audit Log**:
   - Displays genuine historical Google API usage records (Controlled Probe in New York, Canary Execution in Manchester).
   - Shows latency, HTTP status, operation type, result counts, and timestamps.

5. **Query Cache Inventory**:
   - Displays query fingerprints, operations, result counts, expiration timestamps, and hit counters.

6. **Activation Operational Requirements**:
   - Clear 5-point safety checklist detailing the exact prerequisites required before live Google collection can run.

### 25.2 Safety Invariant Verification
- Verified by `scripts/test-4d5-google-guardrails-smoke.mjs` with hard network trap (30/30 checks passed).
- Verified by `scripts/test-4d4-collection-operations-smoke.mjs` (40/40 checks passed).
- Verified by `scripts/test-4d3-candidates-smoke.mjs` (24/24 checks passed).
- Verified by `scripts/test-4d2-navigation-smoke.mjs` (14/14 checks passed).
- Database Safety Invariants:
  - `GoogleCollectionConfig.enabled`: `false`, `activationMode`: `DISABLED`
  - `DataSource (google_places).enabled`: `false`
  - `GoogleApiUsage.count`: `2` (0 pending/reserved)
  - `GoogleApiCache.count`: `2`
  - Total Candidates: `649` (`408` Needs Enrichment, `241` Rejected)
  - Zero Google API requests, zero candidate mutations.





