# ClientForge CRM — Production Readiness & System Architecture Specification

---

## 1. System Architecture
ClientForge CRM is a full-stack Next.js 15 (App Router) + Prisma + PostgreSQL (Neon Serverless) customer relationship management and automated lead discovery platform tailored for finding, qualifying, and managing B2B leads that lack a live website (`TRUE_NO_SITE` paradigm).

### Core Architecture Layers:
1. **Frontend / UI Layer**: Next.js 15 React Server & Client components adhering to the ClientForge Design System (Poppins font, `#49339A` Royal Indigo interactive palette, warm neutral canvas `#F7F6F3`, dark slate sidebar `#252E43`).
2. **API & Route Handler Layer**: Authenticated Next.js App Router endpoints (`/api/**`) enforcing active session authentication via `requireActiveUser()`.
3. **Domain & Services Layer**:
   - `LeadCandidate` discovery and deduplication pipeline.
   - Fair rotation round-robin scheduling (`CollectorState`, `CollectorLocation`, `LeadCategory`, `DataSource`).
   - Multi-source qualification engine (OpenStreetMap Overpass + Google Places adapter + domain website verification).
   - Rate-limited and cost-guarded Google Places integration (`GoogleCollectionConfig`, `GoogleApiUsage`, `GoogleApiCache`).
4. **Data Persistence Layer**: PostgreSQL managed by Prisma Client with incremental migrations and strict relational integrity.

---

## 2. Deployment Architecture
- **Web Application**: Next.js App Router hosted on Vercel.
- **Database**: PostgreSQL hosted on Neon (Serverless connection pooled via `DATABASE_URL` with SSL mode `require`).
- **Background Worker Engine**: GitHub Actions scheduled cron runners (`.github/workflows/collect.yml` every 3 hours) and manual controlled workflows (`.github/workflows/google-collector-canary.yml`, `.github/workflows/google-controlled-probe.yml`).
- **Runtime Environment**: Node.js 20 LTS runtime.

---

## 3. Environment Variable Matrix

| Variable Name | Classification | Purpose | Exposure |
|---|---|---|---|
| `DATABASE_URL` | `REQUIRED_PRODUCTION` | Neon PostgreSQL pooled connection string | Server-only / GitHub Secret |
| `DIRECT_URL` | `OPTIONAL` | Direct connection string for migration runners | Server-only |
| `SESSION_SECRET` | `REQUIRED_PRODUCTION` | 32+ character HMAC key for JWT session encryption | Server-only |
| `GOOGLE_MAPS_API_KEY` | `OPTIONAL` / `DISABLED_FEATURE` | Google Places API key for paid provider requests | Server-only / GitHub Secret |
| `NEXT_PUBLIC_APP_URL` | `OPTIONAL` | Base canonical application URL | Browser/Server |
| `WATCH_SECRET` | `OPTIONAL` | Inbound email webhook authentication token | Server-only |
| `WA_VERIFY_TOKEN` | `OPTIONAL` | WhatsApp Cloud API webhook challenge verification token | Server-only |

*Note: No secret values are ever committed to repository or transmitted in browser-facing JSON payloads.*

---

## 4. Authentication Boundaries
- **Session Management**: Encrypted JWT cookies (`cf_session`, 7-day TTL, HttpOnly, SameSite Lax, Secure in Production).
- **Session Verification**: `requireActiveUser()` verifies the JWT signature and re-checks the database `AdminUser` record (`isActive: true`).
- **Endpoint Inventory**:
  - `PUBLIC_INTENTIONAL`: `/api/auth/login`, `/api/auth/logout`, `/api/webhooks/email` (token-guarded), `/api/webhooks/whatsapp` (token-guarded).
  - `AUTHENTICATED_READ`: `/api/collector/candidates`, `/api/collector/candidates/stats`, `/api/collector/candidates/[id]`, `/api/collector/categories`, `/api/collector/locations`, `/api/collector/rules`, `/api/collector/runs`, `/api/collector/sources`, `/api/collector/states`, `/api/collector/overview`, `/api/collector/credentials`, `/api/enrichment/config`, `/api/enrichment/jobs`, `/api/enrichment/stats`, `/api/live`.
  - `AUTHENTICATED_MUTATION`: `/api/collector/categories/[id]`, `/api/collector/locations/[id]`, `/api/collector/rules/[id]`, `/api/collector/sources/[id]`, `/api/collector/credentials`, `/api/collector/credentials/[id]`, `/api/collector/config`, `/api/restart`.

---

## 5. Collector Architecture
1. **Fair Rotation Engine**: Evaluates active `CollectorLocation` × `LeadCategory` tuples against `CollectorState` cooldowns to pick the next fair discovery target.
2. **Provider Adapter**:
   - Primary: OpenStreetMap Overpass query adapter.
   - Secondary (Controlled): Google Places New Places API adapter (Stage A Text Search ID-only, Stage B Place Details).
3. **Candidate Normalization**: Normalizes raw OSM nodes/ways and Google places into canonical `LeadCandidate` entities with postal address, phone, email, and coordinates.

---

## 6. Candidate Lifecycle
1. `DISCOVERED`: Entity extracted from provider query.
2. `NEEDS_ENRICHMENT`: Valid discovered business lacking an email address, stored safely in candidate discovery queue awaiting contact enrichment.
3. `VERIFICATION_PENDING`: Discovered with contact data, queued for independent cross-source website verification.
4. `QUALIFIED`: Successfully verified as having a valid business email and confirmed no live website. Eligible for CRM Lead creation.
5. `REJECTED`: Disqualified with humanized persisted reason (`existing_website`, `email_domain_has_live_website`, `generic_email`, `duplicate_in_run`, `invalid_email`).

---

## 7. Qualification Invariants
- **TRUE_NO_SITE Rule**: A lead qualifies if and only if it possesses a valid business-domain email AND has confirmed no live website.
- **Null Website Semantics**: `candidate.website == null` means strictly *"No website supplied by discovery source"*, NEVER *"Confirmed no website"*.
- **Role-Based Email Policy**: Role prefixes (`info@`, `contact@`, `sales@`, `hello@`, `admin@`) on valid company domains are 100% VALID.
- **Generic Webmail Policy**: Free consumer email providers (`gmail.com`, `yahoo.com`, `hotmail.com`, `outlook.com`, `icloud.com`) are excluded from B2B outreach qualification.
- **Email-Domain Verification**: Live websites responding on email domains trigger exclusion (`email_domain_has_live_website`) to prevent outreach to companies with active websites.

---

## 8. Website Verification Semantics
- Independent states: `LIVE`, `NOT LIVE`, `INCONCLUSIVE`, `NOT CHECKED`.
- Dead / non-responding websites do NOT automatically qualify a business without passing all pipeline criteria.
- Missing verification evidence is always labeled `Not checked` (never conflated with absence of a site).

---

## 9. Google Safety & Guardrails Architecture
- **Master Lock**: `GoogleCollectionConfig.enabled: false`.
- **Activation Mode**: `DISABLED` (Fail Closed).
- **Data Source in Rotation**: `DataSource(google_places).enabled: false`.
- **Rate Limits & Ceilings**:
  - Canary Limit: 3 requests/run, 5 requests/day.
  - Production Limit: 10 requests/run, 50 requests/day, 500 requests/month hard cap.
  - Retry Limit: 0 (Strict no-retry policy prevents budget exhaustion).
- **Query Cache**: SHA-256 query fingerprinting with 24h search TTL and 7-day details TTL.
- **Pre-Request Reservation**: Atomic `RESERVED` row creation before any network request; timeout or failure triggers immediate release.

---

## 10. Enrichment Disabled State
- `EnrichmentConfig.enabled: false`.
- Zero active enrichment jobs or attempts.
- Provider networks are strictly untouched during candidate browsing.

---

## 11. Fair Rotation
- Round-robin selection based on `CollectorState.lastRunAt` ascending.
- Excludes disabled locations, disabled categories, and disabled sources.
- Prevents regional or category starvation across automated GitHub cron executions.

---

## 12. Failure Behavior
- Network timeouts or API 429/504 errors on discovery providers record a `FAILED` or `PARTIAL` `CollectorRun` record with exact error message and duration.
- Individual candidate normalization errors do not abort the run; valid candidates are preserved.
- Database connection errors fail closed without corrupting existing records.

---

## 13. GitHub Actions Workflows
1. `collect.yml` (`Collector Worker`):
   - Trigger: Cron schedule `0 */3 * * *` (every 3 hours) + manual dispatch.
   - Concurrency: `clientforge-collector` (cancel-in-progress: false).
   - Execution: Executes `scripts/collector-worker.mjs` against OpenStreetMap.
2. `google-collector-canary.yml` (`Google Collector Canary`):
   - Trigger: Manual dispatch only (`workflow_dispatch`).
   - Scope: Bounded to `Manchester, GB · Dental`.
   - Post-run cleanup: Enforces automatic deactivation on `always()`.
3. `google-controlled-probe.yml` (`Google Controlled Probe`):
   - Trigger: Manual dispatch only (`workflow_dispatch`).
   - Limit: 1 request cap.

---

## 14. Database Integrity
- Total Candidates: `649` (`408` Needs Enrichment, `241` Rejected, `0` Verification Pending, `0` Qualified).
- Total CRM Leads: `88`.
- Total Collector Runs: `16`.
- Total Data Sources: `4` (OSM Overpass active, Google Places disabled).
- Total Active Locations: `8`.
- Total Active Categories: `7`.
- Google API Usages: `2` historical records (0 dangling reservations).
- Google API Cache: `2` records.

---

## 15. Migration & Reconciliation Strategy (BASELINE_BOOTSTRAPPED)
- **Architecture Classification**: `BASELINE_BOOTSTRAPPED`.
- **Historical Migration Chain**: The current `prisma/migrations` directory contains 4 sequential migrations layered on top of the initial project tables. It does not independently reconstruct the pre-migration base schema from zero using `migrate deploy` alone.
- **Current Production Forward Safety**: The production Neon database currently tracks all 4 applied migrations (`20250923000000` through `20250923000003`) with zero rollbacks. Future schema additions can safely be deployed using `npx prisma migrate deploy`.
- **Strict Production Invariant**: **NEVER** run `prisma migrate reset`, `DROP DATABASE`, or `DROP SCHEMA` against the production database.

---

## 16. Fresh-Install Bootstrap Strategy
For deploying ClientForge onto a brand-new, empty database:
1. Configure `DATABASE_URL` in `.env`.
2. Run `npx prisma db push` to bootstrap the full schema directly from `prisma/schema.prisma`.
3. Run `node scripts/seed.mjs` to populate baseline locations, categories, sources, rules, and admin credentials.
4. Run `npm run build` and launch with `npm run start`.
4. Run `npm run build` and launch with `npm run start`.

---

## 17. Production Deployment Procedure
1. Ensure all test suites pass (`npm run build`, `scripts/test-4e-production-readiness.mjs`, all regression suites).
2. Configure environment secrets in Vercel (`DATABASE_URL`, `SESSION_SECRET`).
3. Deploy to Vercel production branch (`main`).
4. Verify `/dashboard`, `/leads`, `/candidates`, `/collection`, and `/settings/google`.

---

## 18. Rollback Considerations
- Schema changes are backward-compatible and additive.
- Reverting application code via Git or Vercel instant rollback will not break database relational structures.

---

## 19. Operational Route Inventory
- Lead Operations:
  - `/candidates`: Candidate discovery queue and Forensic Inspection Drawer.
  - `/collection`: Collection Operations overview and rotation health.
  - `/collection/runs`: Historical execution audit log.
  - `/collection/states`: Target location × category rotation states.
  - `/collection/sources`: Data source health and provider credentials.
- Settings:
  - `/settings/google`: Google Places Guardrails & Observability.
  - `/settings/locations`: Geographical collector targets.
  - `/settings/categories`: Business niche categories.
  - `/settings/rules`: Discovery and qualification rules.
  - `/settings/lead-collection`: Legacy collector configuration.

---

## 20. Known Intentionally Disabled Features
- **Google Places Collection**: Master Disabled (`GoogleCollectionConfig.enabled: false`, `activationMode: DISABLED`).
- **Contact Enrichment Engine**: Disabled (`EnrichmentConfig.enabled: false`).
- **Standalone `/verification` Route**: Data-driven deferral (`VERIFICATION_ROUTE_DEFERRED_NO_MEANINGFUL_RECORDS` due to 0 pending verification rows).

---

## 21. Non-Blocking Backlog
- Documented in `docs/POST_LAUNCH_BACKLOG.md`.

---

## 22. Production Readiness Checklist
- [x] All 25 API routes protected by authentication or token guards.
- [x] Zero secret values committed or projected to browser.
- [x] Strict TRUE_NO_SITE qualification logic intact.
- [x] Google integration fail-closed and disabled.
- [x] GitHub Actions automated workers configured with timeouts and concurrency.
- [x] Next.js 15 production build passes with 91/91 routes compiled.
- [x] 224 unit, smoke, and invariant test assertions passing 100% green.
