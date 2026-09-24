# ClientForge CRM — Post-Launch Engineering Backlog

This document captures prioritized, non-blocking technical and architectural improvements identified during Phase 4E production hardening. These items are strictly non-blocking for launch.

---

## 1. Background Jobs & Worker Architecture (Phase 5)
- **Live Contact Enrichment Pipeline (Phase 5A)**:
  - Background worker processing of candidates in `NEEDS_ENRICHMENT` status using multi-provider credit management.
  - Rate limiting, automated exponential backoff, and daily quota budgeting.
- **Dedicated Live Verification Queue (Phase 5B)**:
  - Activation of dedicated `/verification` operational queue once live enrichment begins generating `VERIFICATION_PENDING` candidate records.
  - Multi-threaded asynchronous domain live checks with DNS/HTTP HEAD verification.

## 2. Advanced Performance & Scalability
- **Database Connection Pooling Tuning**:
  - Fine-tune Neon serverless connection pooling limits and idle timeouts under high collector concurrency.
- **Client-Side SWR / TanStack Query Migration**:
  - Replace component-level fetch effects in candidate queue with SWR or React Query for background revalidation and cache deduplication.

## 3. UI / UX Polish & Enhancements
- **Multi-Select Bulk Actions on Candidates**:
  - Ability to bulk-reject or export filtered candidate subsets directly from `/candidates`.
- **Custom Location Polygon Geofencing**:
  - Support for custom bounding box coordinates or GeoJSON polygons in `CollectorLocation`.

## 4. Observability & Monitoring
- **Structured Error Logging & Telemetry**:
  - Integration with OpenTelemetry or Sentry for production runtime error reporting and collector performance metrics.
- **Webhook Alerting**:
  - Automated Slack / Discord webhook alerts when collector runs encounter Overpass 504 gateway timeouts or rotation cooldown anomalies.
