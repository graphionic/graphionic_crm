# Phase 4C.3B.1 — Provider Abstraction, Usage Accounting & Hard Budget Guardrails

**Date:** 2026-09-23
**Status:** Implemented, Tests A-AB passing, Build passing, No schema migration required
**Safety:** No real provider HTTP, no credits spent, enabled=false prod, no prod jobs/attempts, collector-worker untouched

## 1. Goal
Build provider-neutral enrichment layer that can support Hunter, Dropcontact, Apollo, Snov etc. later without rewriting orchestration, with hard budget guarantees that two simultaneous workers cannot exceed daily/monthly limits.

## 2. Gap Analysis — EnrichmentAttempt sufficient for atomic reservation?
**Answer: YES, sufficient.**

- `EnrichmentAttempt` already has:
  - `candidateId`, `jobId`, `providerCredentialId`, `providerType`, `providerLabel`
  - `status` (STARTED, SUCCESS, NO_RESULT, FAILED), `startedAt`, `finishedAt`, `durationMs`
  - `costUnits`, `creditsUsed` (Float), `emailFound`, `domainFound`, `websiteFound`, `failureReason`, `metadata` JSON
  - `createdAt`, `updatedAt`
  - Indexes: candidateId, jobId, providerCredentialId, status, createdAt
- Reservation strategy: Create STARTED attempt with `creditsUsed = estimatedCredits`, `costUnits = estimatedCredits`, `metadata.reservation=true`, `metadata.ownerToken`, `metadata.estimatedCredits`. This record counts immediately in usage aggregates (attemptsToday, creditsToday, candidatesProcessedToday distinct). Conservative: if worker crashes after reservation, reservation still counts against budget.
- Serialization: `SELECT * FROM "EnrichmentConfig" WHERE key='default' FOR UPDATE` + `SELECT * FROM "ProviderCredential" WHERE id=$credId FOR UPDATE` inside `$transaction`. This serializes concurrent budget checks. Global daily candidate limit uses distinct candidateId today — same candidate retries don't consume new slot but attempts/credits still increase.
- No new ledger model needed. No migration. Timezone UTC via `getUTCStartOfDay()` using `setUTCHours(0,0,0,0)` and `getUTCStartOfMonth()` using `setUTCDate(1)+setUTCHours(0,0,0,0)`.

If not sufficient, we would have returned SCHEMA DECISION REQUIRED. We did not.

## 3. Provider Abstraction

### Interface
```ts
interface EnrichmentProvider {
  providerType: string; // e.g., 'hunter', 'test-success'
  providerLabel: string;
  capabilities: { canFindEmail, canFindDomain, canFindWebsite, supportsConfidence, estimatedCostPerRequest }
  estimateCost?(candidate): number
  enrich(candidate, context: { credentialId?, ownerToken, attemptId }): Promise<NormalizedEnrichmentResult>
  normalizeResult?(raw): NormalizedEnrichmentResult
  healthCheck?(): Promise<{ healthy, kind? }>
}
```

### Normalized Result
```ts
type NormalizedEnrichmentResult = {
  status: 'SUCCESS'|'NO_RESULT'|'FAILED',
  email?, domain?, website?,
  confidence? 0-1,
  costUnits?, creditsUsed?,
  providerReference?,
  metadata? safe only,
  failureKind?, failureReason?
}
```

### Registry
- `ProviderRegistryImpl` with `register`, `resolve`, `availableProviders`, `isRegistered`, `clear`
- `productionProviderRegistry` — empty in 4C.3B.1, no real adapters, no test adapters. Fail-closed.
- `testProviderRegistry` — isolated for tests only.
- Unknown provider → `NO_PROVIDER_ADAPTER`, never generic HTTP.

### Failure Classification
`AUTH_ERROR`, `RATE_LIMITED`, `TIMEOUT`, `PROVIDER_DOWN`, `INVALID_REQUEST`, `NO_CREDITS`, `UNKNOWN_PROVIDER_ERROR`, `NO_RESULT`, `SUCCESS`
Safe diagnostic metadata only, never auth headers/keys.

## 4. Usage Accounting (UTC)

Derived from `EnrichmentAttempt` immutable records.

- `getGlobalEnrichmentUsage(tx?)`:
  - `attemptsToday` count where `createdAt >= UTC start of day`
  - `candidatesProcessedToday` distinct `candidateId` where `createdAt >= startOfDay`
  - `successfulToday`, `noResultToday`, `failedToday`
  - `creditsUsedToday`, `costUnitsToday` sum where `createdAt >= startOfDay`
  - `creditsUsedThisMonth`, `costUnitsThisMonth` sum where `createdAt >= startOfMonth`
- `getProviderUsage(credentialId)`:
  - attempts today/month, success/noResult/failed today, credits today/month per credential
- `hasCandidateBeenProcessedToday(candidateId)` — for unique candidate semantics
- Unique candidate daily count: retries same candidate NOT consume another candidate slot, attempts/credits still increase.

## 5. Budget Gates

### Global Gate `checkGlobalEnrichmentBudget({ candidateId, estimatedCredits, tx })`
- Verify `EnrichmentConfig.enabled` → else `ENRICHMENT_DISABLED`
- If not already counted today and `dailyCandidateLimit` reached → `GLOBAL_DAILY_CANDIDATE_LIMIT_REACHED`
- If `providerDailyCreditLimit` and `creditsUsedToday + estimated > limit` → `GLOBAL_DAILY_CREDIT_LIMIT_REACHED`
- If `providerMonthlyCreditLimit` and `creditsUsedThisMonth + estimated > limit` → `GLOBAL_MONTHLY_CREDIT_LIMIT_REACHED`
- Returns `{ allowed, reason, usage, candidateAlreadyCountedToday }`

### Provider Gate `checkProviderBudget({ providerCredentialId, estimatedCredits, tx })`
- Verify credential exists → else `NO_PROVIDER_CONFIGURED`
- Verify `enabled` → else `PROVIDER_DISABLED`
- `dailyLimit` (credit limit) → if `creditsToday + estimated > dailyLimit` → `PROVIDER_DAILY_LIMIT_REACHED`
- `monthlyLimit` → if `creditsThisMonth + estimated > monthlyLimit` → `PROVIDER_MONTHLY_LIMIT_REACHED`
- Clear semantics: credit limits, not attempt counts.

## 6. Provider Selection `selectEnrichmentProvider`

Deterministic: `priority DESC`, `provider ASC`, `label ASC`, `id ASC`
- Fetches enabled credentials ordered same way
- Filters to those with adapter registered in registry and under budget
- If none eligible:
  - All adapters missing → `NO_PROVIDER_ADAPTER`
  - Otherwise first budget block reason encountered → `PROVIDER_DAILY_LIMIT_REACHED` etc.
  - Else `NO_PROVIDER_CONFIGURED`
- Returns `{ selected: true, credential, adapter }` or `{ selected: false, reason, details }`

## 7. Atomic Reservation `reserveEnrichmentBudgetAtomically`

Transaction with row locking:
```sql
SELECT * FROM "EnrichmentConfig" WHERE key='default' FOR UPDATE;
SELECT * FROM "ProviderCredential" WHERE id=$credId FOR UPDATE;
-- verify job PROCESSING + lockedBy ownerToken
-- checkGlobalEnrichmentBudget inside tx
-- checkProviderBudget inside tx
-- CREATE EnrichmentAttempt STARTED creditsUsed=estimated costUnits=estimated metadata reservation
-- UPDATE EnrichmentJob attemptCount increment where lockedBy=ownerToken
```

- Conservative lifecycle: crash after reservation counts against budget
- Hard limit guarantee: Two simultaneous workers cannot exceed global daily candidate, global daily credit, global monthly credit, provider daily, provider monthly because row locks serialize budget checks.

## 8. Orchestrator `executeEnrichmentAttempt`

Flow: ownership → enabled → global budget → select provider → provider budget → reserve → adapter enrich (test-only) → normalize → update attempt SUCCESS/NO_RESULT/FAILED with `finalCredits = max(estimated, actual)` conservative.

Production worker must still fail-closed no real adapter.

## 9. Fallback Policy Foundation

`defaultFallbackPolicy = { allowFallback: false, maxProvidersPerCandidate: 1, treatNoResultAsFallback: false, treatFailedAsFallback: false }`
- Differentiates FAILED vs NO_RESULT for future use
- Disabled by default for 4C.3B.1

## 10. Provider Health Foundation

Reuse `ProviderCredential.status` field as health: `configured`, `connected`, `error`, `disabled` → mapped to `UNKNOWN/HEALTHY/DEGRADED/DOWN` in UI.

## 11. Observability

- `getBudgetStatus()` → `ENRICHMENT_DISABLED`, `WITHIN_BUDGET`, `DAILY_CANDIDATE_LIMIT_REACHED`, `DAILY_CREDIT_LIMIT_REACHED`, `MONTHLY_CREDIT_LIMIT_REACHED`, `NO_PROVIDER_AVAILABLE`
- `getProvidersForUI()` → id, provider, label, enabled, priority, health, adapterAvailable, adapterStatus `Available`/`Not Integrated`, usage (attemptsToday, creditsToday etc), limits (dailyLimit, monthlyLimit), keyHint, maskedKey `••••...hint`, never `encryptedValue`
- API `GET /api/enrichment/stats` extended to return `budgetStatus`, `budgetUsage` (candidatesProcessedToday, attemptsToday, creditsToday etc), `providers` array, still `requireActiveUser()` 401, no secrets
- Enrichment Tab in Settings → Lead Collection:
  - Budget Status cards
  - Global Usage UTC accounting: Candidates Today X/100, Attempts Today, Credits Today X/—, Credits Month
  - Provider table: Provider, Label, Enabled, Priority, Health, Adapter Status Available/Not Integrated, Attempts Today/Month, Credits Today/Month, Daily Limit, Monthly Limit
  - No mutating buttons (enable/seed/start/change/execute)

## 12. Test Adapters (TEST-ONLY)

- `SuccessTestProvider` `test-success` — returns SUCCESS with fake email/domain, configurable `fakeCredits`
- `NoResultTestProvider` `test-noresult` — returns NO_RESULT
- `FailedTestProvider` `test-failed` — returns FAILED with configurable `failureKind` (default PROVIDER_DOWN)
- Zero network, deterministic, never registered in production registry

## 13. Test Matrix A-AB Results

All passed in `scripts/test-enrichment-4c3b1.mjs` (300s run):

- **A** enrichment disabled → blocked ENRICHMENT_DISABLED
- **B** under daily candidate limit → allowed
- **C** daily candidate limit reached → blocked GLOBAL_DAILY_CANDIDATE_LIMIT_REACHED
- **D** unique candidate semantics — 3 attempts same candidate = 1 unique, 3 attempts
- **E** global daily credits under limit → allowed
- **F** global daily credits overflow — exact limit and decimal 9.5+1 >10 blocked
- **G** monthly global credits — blocked MONTHLY
- **H** provider disabled → PROVIDER_DISABLED
- **I** adapter missing → NO_PROVIDER_ADAPTER fail-closed
- **J** provider priority — higher priority selected
- **K** stable tie-break — provider ASC, deterministic same ID on repeated calls
- **L** provider daily limit → PROVIDER_DAILY_LIMIT_REACHED
- **M** provider monthly limit → PROVIDER_MONTHLY_LIMIT_REACHED
- **N** no available provider → NO_PROVIDER_CONFIGURED
- **O** unknown provider fail-closed — no generic HTTP
- **P** SUCCESS normalized — email/domain/confidence/credits
- **Q** NO_RESULT normalized
- **R** FAILED normalized — failureKind
- **S** secret leakage — UI maskedKey, no encryptedValue, stats route no secrets
- **T** unauthenticated API — requireActiveUser present
- **U** same candidate retry unique count — unique 1, attempts 3
- **V** simultaneous global candidate boundary — 9 existing + 2 concurrent, only 1 reserved, other GLOBAL_DAILY_CANDIDATE_LIMIT_REACHED (row lock serializes)
- **W** simultaneous global credit boundary — 9 credits + 2 concurrent 1 each, only 1 reserved
- **X** simultaneous provider credit boundary — 9 provider credits + 2 concurrent, only 1 reserved
- **Y** crash after reservation — STARTED attempt counts as candidate, conservative accounting blocks second candidate when limit 1
- **Z** stale worker cannot reserve after ownership loss — JOB_OWNERSHIP_LOST
- **AA** production registry isolation — production registry 0 adapters, test registry isolated, no test adapters in prod
- **AB** no external network calls — no fetch/axios/http in provider layer, no real provider classes (HunterProvider etc), worker no real fetch

Plus regression:
- 4C.3A A-L passed
- 4C.3A.1 A-U passed
- prisma validate, prisma generate, node --check enrichment-worker.mjs, npm run build passed

## 14. Hard Limit Guarantee

**Question:** Can two simultaneous workers exceed global daily candidate, global daily credit, global monthly credit, provider daily, provider monthly?

**Answer: NO**

Proof: `reserveEnrichmentBudgetAtomically` does:
1. `SELECT ... FOR UPDATE` on `EnrichmentConfig` (global) and `ProviderCredential` (provider) — serializes concurrent transactions. Second transaction waits for first to commit (maxWait 15s, timeout 20s).
2. Inside same transaction, re-checks budget using fresh usage (including reservation just committed by first tx if it committed).
3. Only if still under limit, creates STARTED attempt counting immediately.

Thus at boundary 9/10, two concurrent reserves: first commits, second sees usage 10 and fails. Same for credits. Tested in V, W, X with `Promise.all` and `FOR UPDATE`.

## 15. Files Changed

- `src/lib/enrichment-providers.ts` — NEW: provider interface, registry, selection, usage accounting UTC, global/provider budget gates, atomic reservation, orchestrator, fallback disabled, failure classification, test adapters, budget status, UI providers
- `src/app/api/enrichment/stats/route.ts` — extended to return budgetStatus, budgetUsage, providers safe
- `src/app/(app)/settings/lead-collection/client.tsx` — Enrichment Tab upgraded to 4C.3B.1 Budget Guardrails, read-only
- `scripts/test-enrichment-4c3b1.mjs` — NEW: A-AB test matrix
- `docs/PHASE_4C.3B.1_PROVIDER_BUDGET_GUARDRAILS.md` — this file
- No changes to `collector-worker.mjs`, `collect.yml`, fair rotation, TRUE_NO_SITE, `EnrichmentConfig.enabled=false` prod

## 16. Commit Control

No schema change, so commit allowed but DO NOT PUSH until approval.

```
feat: Phase 4C.3B.1 provider budget guardrails — provider abstraction, UTC usage accounting, hard budget gates, atomic reservation, test adapters, observability
```

## 17. STRICT DO NOT Compliance

- [x] No Hunter/Dropcontact/Apollo/Snov/OpenAI/Google Places real provider integration
- [x] No fetch/axios/http for provider
- [x] No credits spent
- [x] No real API credentials added
- [x] No enrichment prod enabled
- [x] No prod jobs/attempts seeded
- [x] No prod candidates/Leads mutated
- [x] No collector/workflow_dispatch triggered
- [x] No enrichment schedule added
- [x] No collector-worker.mjs / fair rotation / TRUE_NO_SITE modified
- [x] No push without approval
