# ClientForge CRM — Production Automated Candidate Enrichment

**Status:** Production Ready & Automated  
**Enrichment Provider:** `public_web_research` (Zero-Cost Public Directory & DNS Verification)  
**Schedule:** Hourly (`cron: '30 * * * *'`, 24 runs/day)  
**Batch Size:** 10 candidates per run (configurable in `EnrichmentConfig`)  
**Theoretical Daily Attempt Capacity:** 240 attempts/day  
**Retry Cooldown:** 1440 minutes (24 hours)  
**Max Attempts per Candidate:** 3  
**Google Places Enrichment:** STRICTLY DISABLED  
**Paid Enrichment APIs:** STRICTLY DISABLED  

---

## 1. Architectural Pipeline Overview

ClientForge decouples **Discovery** and **Enrichment** into independent, asynchronous pipelines:

$$\begin{aligned}
\text{OSM Collector Worker (Hourly at :00)} &\longrightarrow \text{Candidate Pool } (\text{status: } \texttt{NEEDS\_ENRICHMENT}) \\
\text{Enrichment Worker (Hourly at :30)} &\longrightarrow \text{Public Web Research} \longrightarrow \text{Verification} \longrightarrow \begin{cases} \text{Live Site} \longrightarrow \texttt{REJECTED} \\ \text{NO\_SITE + Role Email} \longrightarrow \texttt{QUALIFIED} \longrightarrow \text{CRM Lead} \\ \text{Unresolved} \longrightarrow \text{Cooldown (24h)} \end{cases}
\end{aligned}$$

---

## 2. Core Operational Parameters

| Parameter | Production Value | Storage / Control | Rationale |
|---|---|---|---|
| **Discovery Layer** | OpenStreetMap (OSM) Overpass | `CollectorLocation` (30 targets) × `CollectorCategory` (7) | Broad, zero-cost international collection across UK, US, AU, CA, UAE, NZ, TH. |
| **Enrichment Provider** | `public_web_research` | `ProviderRegistry` & `ProviderCredential` | Zero API fees, zero Google Places queries, strict public evidence provenance. |
| **Worker Schedule** | `30 * * * *` (Hourly) | `.github/workflows/enrich.yml` | Staggers execution 30 minutes after collection runs. |
| **Batch Size** | 10 candidates / run | `EnrichmentConfig.batchSize` | Safe, bounded execution preventing rate limits or connection pool starvation. |
| **Theoretical Daily Capacity** | 240 attempts / day | Calculated (24 runs × 10 candidates) | Gradual consumption of the candidate pool. |
| **Retry Cooldown** | 1,440 minutes (24 hours) | `EnrichmentConfig.retryCooldownMinutes` | Ensures unresolved candidates are not repeatedly polled every hour. |
| **Max Attempts** | 3 attempts | `EnrichmentConfig.maxAttemptsPerCandidate` | Candidates exhausted after 3 attempts with status `EXHAUSTED`. |
| **Concurrency Protection** | `clientforge-enrichment` | GitHub Actions concurrency group | Ensures at most one enrichment worker executes at any time. |

---

## 3. Fair Candidate Selection & Queuing

To prevent starvation and avoid repeatedly polling the same candidates, the worker implements fair selection:

1. **Priority 1 (Fresh Candidates):** Candidates with `enrichmentAttempts = 0` (never attempted), ordered by `createdAt ASC`.
2. **Priority 2 (Cooled-down Retries):** If the fresh queue has fewer than `batchSize` items, candidates with `0 < enrichmentAttempts < 3` and `lastEnrichmentAt <= now - 24 hours` are selected, ordered by `enrichmentAttempts ASC, lastEnrichmentAt ASC`.
3. **Exclusions:** Candidates with `status = 'QUALIFIED'` or `status = 'REJECTED'` are never re-queued.

---

## 4. Verification & Qualification Invariants

ClientForge enforces strict qualification standards before promoting any candidate into CRM `/leads`:

### Qualification Invariant Rule
$$\text{Useful Business Role Email } (\texttt{info@}, \texttt{contact@}, \dots) \;+\; \text{Confirmed Absence of Live Website} \;=\; \textbf{QUALIFIED}$$

- `website == null` in OSM is **never** treated as proof of NO_SITE.
- If a candidate's domain hosts a live website $\longrightarrow$ marked `REJECTED` (`existing_website`).
- If an email domain hosts a live website (the **Emma Clinic anti-pattern**) $\longrightarrow$ marked `REJECTED` (`existing_website`).
- Generic webmails (`@gmail.com`, `@yahoo.com`, `@hotmail.com`) are rejected.
- Only confirmed business domain emails with verified active DNS MX records and 0 live website responses qualify.

---

## 5. Automatic Lead Creation & CRM Deduplication

When a candidate qualifies:
1. CRM Lead is automatically inserted with status `NEW` and `website: null` (segment: `NO_SITE`).
2. Deduplication check verifies that no existing Lead exists with the same email or `(companyName, city)` combination.
3. If duplicate is detected, candidate is linked via `qualifiedLeadId` without creating duplicate `/leads` rows.
4. No manual human promotion button is required.

---

## 6. Safety Gates & External API Disablement

1. **Safety Gate (`EnrichmentConfig.enabled`):** When set to `false`, the worker exits immediately with return code 0 and zero mutations.
2. **Google Places API:** `GoogleCollectionConfig.enabled` remains strictly `false` (`activationMode: 'DISABLED'`, `failClosed: true`).
3. **Paid Enrichment APIs:** Zero external paid API credentials are configured.
