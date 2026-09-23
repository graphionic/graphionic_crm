# Phase 4C.2B — Candidate Queue UI

## Purpose
Phase 4C.2A introduced persistent `LeadCandidate` storage with lifecycle:
`DISCOVERED → NEEDS_ENRICHMENT / REJECTED / VERIFICATION_PENDING → QUALIFIED → Lead`.

Production after controlled run:
- Lead 88, LeadCandidate 84, CollectorRun 7, CollectorState 7
- Melbourne / dental / Overpass DE: 84 persisted, 78 NEEDS_ENRICHMENT, 6 REJECTED, 0 QUALIFIED

Phase 4C.2A sealed persistence and traceability but had no UI visibility.

Phase 4C.2B purpose: make LeadCandidate records visible, searchable, filterable, inspectable, traceable — READ ONLY.

**No enrichment, no lifecycle modification, no collector behavior change.**

## Candidate Table

### Location
Settings → Lead Collection → Candidates tab (9th tab, count indicator)

Order: Overview, Runs, States, Candidates, Locations, Categories, Sources, Rules, General — Candidates after States per spec, preserves existing tabs.

### Summary Metrics (compact)
Top of Candidates tab:
- Total Candidates (dynamic from DB)
- Needs Enrichment (NEEDS_ENRICHMENT)
- Rejected (REJECTED)
- Qualified (QUALIFIED)
- Discovered (DISCOVERED)
- Verification Pending (VERIFICATION_PENDING)
- Recent 24h new count

All counts from `prisma.leadCandidate.count()` and `groupBy status` — not hardcoded.

### Table Columns
| Column | Content |
|--------|---------|
| Business | companyName + externalType + externalId subtle monospace secondary |
| Category | businessCategory |
| Location | city + country (actual business city, not search area) |
| Contact | email if present else —, phone subtle secondary |
| Discovery | source name + Run cmudlyz… (first 8 chars) + discovery search city |
| Status | semantic badge: NEEDS_ENRICHMENT amber, REJECTED red, QUALIFIED green, DISCOVERED indigo, VERIFICATION_PENDING aqua |
| Reason | human-readable rejectionReason: existing_website → Existing Website, duplicate_in_run → Duplicate in Run, etc., else — |
| Created | createdAt date + time |
| Action | View button (no Edit/Delete/Enrich/Qualify) |

Dense professional admin CRM style: white cards border #E5E3DF radius 12, badges soft tinted, Poppins typography, no gradients, no excessive shadows.

## Filters

- Status: All, NEEDS_ENRICHMENT, REJECTED, QUALIFIED, DISCOVERED, VERIFICATION_PENDING
- Category: dynamic from LeadCategory (slug values)
- Source: dynamic from DataSource (name)
- City: text input filter (candidate city = actual business city, not CollectorLocation city — e.g., Manchester run can produce Warrington business, remembered as distinct concept)
- Search: server-backed, debounced 400ms
- Page size: 25/50/100
- Sort: createdAt (newest first default), companyName, status, city

Filters wrap cleanly, persist when paging.

## Search

Server-backed via `/api/collector/candidates` with `search` param.

Supported fields (case-insensitive contains OR):
- companyName
- email
- phone
- city
- country
- externalId

Uses Prisma `contains mode: insensitive`, not client-side loading. Debounced to avoid excessive queries. Works combined with filters.

## Sorting

Default: `createdAt desc` (newest discovered first).

Supports:
- createdAt
- companyName
- status
- city
- businessCategory

Simple single-column sorting, not multi-column. Sort param passed to server.

## Pagination

Server-side pagination via `getLeadCandidatesPaginated`.

- Default 25 per page
- Options 25, 50, 100
- Returns: candidates, total, page, pageSize, totalPages
- Query: `skip = (page-1)*pageSize`, `take = pageSize`
- Total count via `prisma.leadCandidate.count({ where })`
- Filters/search persist when moving pages (params in URLSearchParams)
- Displays: Showing X–Y of Z — Page P / totalPages

Designed for 100 / 10k / 100k candidates — does not fetch entire table.

## Candidate Detail

Clicking View opens side drawer (preferred over modal for CRM admin, matches existing patterns, accessible close control).

Drawer: fixed right, width min(480px, 92vw), overlay rgba, close button, scrollable content.

### Sections

**BUSINESS**
- Company Name
- Category
- Status badge
- Rejection Reason (human-readable + raw code)

**CONTACT**
- Email (or — needs enrichment)
- Phone
- Website (stored) — displayed exactly as stored, not inferred, with link if present
- Note: Stored Website vs Raw Source Data comparison intentional for Phase 4C.2C audit

**LOCATION**
- Address
- City (note: candidate city = actual business city, not search area)
- Country
- Postcode
- Latitude / Longitude

**DISCOVERY**
- Discovery Source (name + type)
- External Type + External ID
- Discovery Run ID (monospace, full) + run details: location city / category slug / source name
- Created At, Updated At

**ENRICHMENT (Future)**
- Enrichment Attempts (currently 0)
- Last Enrichment At (currently —)
- Enrichment Provider (currently —)
- Note: displayed for future architecture, no action button

**QUALIFICATION**
- Qualified Lead ID (or —)
- If populated: linked Lead card with companyName, email, city, collectorRunId
- Navigation to Lead if route exists (future)

**RAW SOURCE DATA**
- Collapsible section: button Expand/Collapse JSON
- Collapsed: first 12 key/value pairs summarized
- Expanded: formatted JSON in dark code block (maxHeight 300, scrollable)
- Important notice: Stored Website vs Raw website displayed independently — e.g., Core Dental stored website https://www.coredental.com.au/ vs rawTags.website same, but intentional visibility for audit. Do NOT silently normalize.
- rawTags not modified, displayed safely

### Pipeline Timeline

Compact lifecycle visualization, no animation, shows actual state only.

For NEEDS_ENRICHMENT:
```
✓ Discovered
✓ Persisted
● Needs Enrichment (current)
○ Verification
○ Qualified
○ CRM Lead
```

For REJECTED:
```
✓ Discovered
✓ Persisted
✕ Rejected — Reason: Existing Website
```

For QUALIFIED:
```
✓ Discovered
✓ Persisted
✓ Verification
● Qualified
✓ CRM Lead (if qualifiedLeadId)
```

Uses checkmarks, current dot, pending circle — color: done green #4FAE91, active indigo #49339A or amber #B7791F for needs enrichment, rejected red #EC6262, pending muted #9299A8.

## Data Quality Visibility — Phase 4C.2C Preparation

During Melbourne verification noticed:
- Core Dental NEEDS_ENRICHMENT email null but rawTags.website present
- DO NOT FIX in 4C.2B — make visible

Detail shows:
- Stored Website: — or actual value exactly as stored
- Raw Source Data: website key if present

This intentional separation allows Phase 4C.2C to audit parsing/filtering: whether website should cause REJECTED existing_website even when email null, etc.

## Read Data Layer

Extended `src/lib/collector.ts`:

```ts
getLeadCandidateStats()
  -> total, breakdown by status, rejectionBreakdown, byCategory, recent24h

getLeadCandidatesPaginated({ page, pageSize, search, status, category, city, sourceId, sortBy, sortOrder })
  -> { candidates, total, page, pageSize, totalPages }
  - where: status, businessCategory, city contains insensitive, discoverySourceId, OR search across companyName/email/phone/city/country/externalId
  - orderBy dynamic allowed list
  - select only required fields for table (no rawTags)
  - include discoverySource (id,name,type) and discoveryRun (id,startedAt,location city/countryCode, category slug) for traceability
  - server pagination via skip/take
  - count via prisma.leadCandidate.count

getLeadCandidateById(id)
  -> includes discoverySource, discoveryRun with location/category/source, qualifiedLead
  -> includes rawTags for detail view

getLeadCandidates (legacy wrapper)
  -> calls paginated version for backward compat
```

Avoids N+1: single count + single findMany, includes only needed relations.

No ProviderCredential.encryptedValue exposed.

API routes:
- GET /api/collector/candidates?params — paginated
- GET /api/collector/candidates/stats — stats
- GET /api/collector/candidates/[id] — detail

All requireActiveUser, dynamic force-dynamic.

## Performance Strategy

- Server pagination: only 25 rows per request, not entire table
- Indexed filtering: status_idx, city_idx, businessCategory_idx, discoverySourceId_idx, externalId_idx already exist from Phase 4C.2A migration
- Select only required fields for table rows (no rawTags, no metadata)
- Fetch rawTags only for detail view (getLeadCandidateById)
- Counts via count/groupBy, not loading all candidates
- No Elasticsearch, Prisma/Postgres sufficient for 100k candidates
- Debounced search 400ms to reduce load
- Filters persist via URLSearchParams, no client-side re-filtering of large arrays

Tested with 84 production candidates, pagination 25 → 4 pages, search Melbourne → 84 results (server count), NEEDS_ENRICHMENT filter → 78, REJECTED → 6.

## Empty / Loading / Error States

- Loading: "Loading candidates..." centered
- Empty: "No candidates discovered yet. Run collector to discover businesses." when no filters
- No search results: "No candidates match these filters." when filtered
- Error: "Error: message" red
- Detail loading: "Loading candidate..."
- Detail not found: "Failed to load candidate."

No silly illustrations or emojis, dense professional.

## Mobile / Responsive

Desktop primary (CRM admin), but:
- Table container overflowX auto, minWidth 1100, does not destroy page layout
- Filters flex wrap, gap 10, inputs minWidth 140-200, wrap cleanly on smaller screens
- Summary grid auto-fit minmax 150px, wraps
- Drawer width min(480px, 92vw) remains usable on mobile
- No horizontal page overflow outside intended table container (table scrolls inside card)
- Tabs flex wrap, width fit-content maxWidth 100%

## Accessibility

- Buttons have text labels (View, Close, Prev, Next, Clear, Expand)
- Drawer close control accessible with aria-label
- Table headers semantic thead th
- Status not communicated by color alone: text label + badge + human-readable reason
- Keyboard focus visible (default browser outline, buttons cursor pointer)
- Raw-data disclosure accessible via button Expand/Collapse
- Search input placeholder descriptive
- Pagination buttons disabled state with not-allowed cursor and muted color

## Future

- Phase 4C.2C: audit source quality (stored website vs rawTags.website, website filtering logic when email null, etc.)
- Future enrichment integration: will use enrichmentAttempts, lastEnrichmentAt, enrichmentProvider fields already displayed
- Future qualification: qualifiedLeadId navigation to Lead

## Verification (READ-ONLY)

Tested with production 84 candidates:
1. Total count 84 displayed correctly
2. NEEDS_ENRICHMENT filter 78
3. REJECTED filter 6
4. Search Smile In The City → 1 PASS
5. Search Core Dental → 2 PASS (1 NEEDS_ENRICHMENT with website, 1 REJECTED duplicate_in_run)
6. Search Glenferrie Dental → 1 PASS
7. Core Dental detail: stored website https://www.coredental.com.au/ vs rawTags.website same — displayed independently PASS
8. Pure Orthodontics: status REJECTED reason existing_website email info@pureorthodontics.com.au website https://www.pureorthodontics.com.au/ PASS
9. Pagination 25 rows page1, 25 page2, totalPages 4 PASS
10. No DB writes: Lead 88, LeadCandidate 84, CollectorRun 7 PASS

Build: prisma validate ok, generate v6.19.3 ok, npm run build 12.2kB lead-collection 91 pages PASS
No schema change, no migration, no collector logic changed, no external APIs, no workflow trigger.

## Files Changed
- src/lib/collector.ts (added getLeadCandidateStats, getLeadCandidatesPaginated, getLeadCandidateById, kept backward compat)
- src/app/api/collector/candidates/route.ts (new)
- src/app/api/collector/candidates/stats/route.ts (new)
- src/app/api/collector/candidates/[id]/route.ts (new)
- src/app/(app)/settings/lead-collection/client.tsx (added Candidates tab, summary, search, filters, table, pagination, detail drawer, pipeline timeline, rawTags collapsible)
- docs/PHASE_4C.2B_CANDIDATE_QUEUE.md (new)
