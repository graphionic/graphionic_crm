# Phase 4C.3B.1 — Provider Abstraction, Usage Accounting & Hard Budget Guardrails
## Phase 4C.3B.1.1 — Budget Reservation Hardening (Blocker Fix)

**Date:** 2026-09-23
**Status:** Implemented + Hardened, Tests A-AB and AC-AP passing, Build passing, No schema migration
**Safety:** No real provider HTTP, no credits spent, enabled=false prod, no prod jobs/attempts, collector-worker untouched
**Commits:** bcd00ac feat: Phase 4C.3B.1 + fix: harden enrichment budget reservations (pending)

## 1. Goal
Build provider-neutral enrichment layer that can support Hunter, Dropcontact, Apollo, Snov etc. later without rewriting orchestration, with hard budget guarantees that two simultaneous workers cannot exceed daily/monthly limits, and with no legacy bypass.

## 2. Canonical Reservation Invariant (MUST HOLD)
```
A provider-backed enrichment execution MUST NOT create an EnrichmentAttempt STARTED directly.
The ONLY production path for provider execution is:
  executeEnrichmentAttempt
          ↓
  reserveEnrichmentBudgetAtomically (locks EnrichmentConfig FOR UPDATE, ProviderCredential FOR UPDATE, checks ownership, checks duplicate STARTED, checks budgets, creates STARTED reservation)
          ↓
  transaction COMMIT
          ↓
  adapter.enrich (test-only, zero network)
No production code may create STARTED provider attempts outside reserveEnrichmentBudgetAtomically.
```

## 3. Gap Analysis — EnrichmentAttempt sufficient?
YES, sufficient. STARTED with creditsUsed=maximum as reservation counting immediately, conservative crash-counts, plus SELECT FOR UPDATE on EnrichmentConfig and ProviderCredential serializes concurrent checks. No new ledger model needed.

## 4. Provider Abstraction

### Interface — Maximum Cost Contract
```ts
interface EnrichmentProvider {
  providerType: string;
  providerLabel: string;
  capabilities: { canFindEmail, canFindDomain, canFindWebsite, supportsConfidence, estimatedCostPerRequest (deprecated), maximumCostPerRequest? }
  getMaximumCreditCost?(candidate): number; // PREFERRED — MAXIMUM possible charge BEFORE execution
  estimateCost?(candidate): number; // deprecated alias interpreted as maximum
  enrich(candidate, context): Promise<NormalizedEnrichmentResult>
}
```
**Contract:** Adapter must declare MAXIMUM possible credit charge for one execution BEFORE provider call. Reservation amount = maximum. Provider execution may report actual <= reserved, but MUST NEVER legitimately report actual > reserved. If it does, it's contract violation `PROVIDER_COST_EXCEEDED_RESERVATION`, kept at reserved amount conservatively, no budget increase after call.

### Normalized Result
`status SUCCESS|NO_RESULT|FAILED`, email/domain/website, confidence, costUnits, creditsUsed, providerReference, metadata safe, failureKind

### Registry
- `productionProviderRegistry` — empty prod, fail-closed, 0 adapters
- `testProviderRegistry` — isolated test only
- Unknown → `NO_PROVIDER_ADAPTER`, never generic HTTP

### Failure Classification
`AUTH_ERROR`, `RATE_LIMITED`, `TIMEOUT`, `PROVIDER_DOWN`, `INVALID_REQUEST`, `NO_CREDITS`, `UNKNOWN_PROVIDER_ERROR`, `NO_RESULT`, `SUCCESS`, plus `ACTIVE_RESERVATION_EXISTS`, `BUDGET_RESERVATION_TIMEOUT`, `PROVIDER_COST_EXCEEDED_RESERVATION`

## 5. Usage Accounting (UTC)
Derived from EnrichmentAttempt immutable records, **including STARTED reservations**.

- `attemptsToday` count `createdAt >= UTC startOfDay`
- `candidatesProcessedToday` distinct `candidateId` where `createdAt >= startOfDay`
- `successfulToday`, `noResultToday`, `failedToday`
- `creditsUsedToday`, `costUnitsToday` sum `createdAt >= startOfDay`
- `creditsUsedThisMonth` sum `createdAt >= startOfMonth`
- Unique candidate semantics: retries same candidate NOT consume another candidate slot, attempts/credits still increase
- Timestamp authoritative: `createdAt` (reservation creation time), `startedAt` same tx

## 6. Budget Gates
Global: enabled, dailyCandidateLimit unique, dailyCredit, monthlyCredit
Provider: enabled, dailyLimit, monthlyLimit (credit limits)
Both use `tx` client under lock for authoritative check.

## 7. Provider Selection
Deterministic priority DESC provider ASC label ASC id ASC, filters enabled + adapter registered + under budget (advisory, reservation re-checks authoritatively). Explicit block reasons.

## 8. Atomic Reservation — Hardened

**Lock order preserved:** 1. EnrichmentConfig 2. ProviderCredential 3. ownership validation 4. budget queries 5. duplicate STARTED check 6. reservation 7. job attempt increment 8. commit

```ts
// Inside $transaction { maxWait:15000, timeout:20000 }
await tx.$queryRaw`SELECT * FROM "EnrichmentConfig" WHERE key='default' FOR UPDATE`;
await tx.$queryRaw`SELECT * FROM "ProviderCredential" WHERE id=${credId} FOR UPDATE`;
const job = await tx.enrichmentJob.findUnique({ where:{ id:jobId } });
if (job.status !== 'PROCESSING' || job.lockedBy !== ownerToken) throw JOB_OWNERSHIP_LOST;

// Duplicate guard — at most ONE active STARTED per job
const existingStarted = await tx.enrichmentAttempt.findFirst({ where:{ jobId, status:'STARTED' } });
if (existingStarted) return { reserved:false, reason:'ACTIVE_RESERVATION_EXISTS', existingAttemptId };

const globalCheck = await checkGlobalEnrichmentBudget({ candidateId, estimatedCredits, tx });
if (!allowed) return { reserved:false, reason };
const providerCheck = await checkProviderBudget({ providerCredentialId, estimatedCredits, tx });
if (!allowed) return { reserved:false, reason };

const attempt = await tx.enrichmentAttempt.create({
  status:'STARTED', creditsUsed:estimatedCredits (maximum), costUnits:estimatedCredits,
  metadata:{ ownerToken, reservedAt, estimatedCredits, maximumCredits:estimatedCredits, reservation:true }
});
await tx.enrichmentJob.updateMany({ where:{ id:jobId, lockedBy:ownerToken, status:'PROCESSING' }, data:{ attemptCount:{increment:1} } });
```

- Duplicate reservation: same job concurrent → exactly ONE STARTED, other `ACTIVE_RESERVATION_EXISTS`, attemptCount +1 only, credits once
- Reclaimed job: Worker A reserves STARTED, crashes, lock expires, Worker B reclaims same job → B blocked due to unresolved STARTED, no second STARTED, no second credit reservation, no provider execution
- Unresolved STARTED remains counted in daily/monthly usage (conservative, no overspend)
- Timeout: explicit `maxWait 15000 timeout 20000`, on P2028 fail closed `BUDGET_RESERVATION_TIMEOUT`, no provider execution

## 9. Orchestrator Execution Order — Fail-Closed

```
verify owner
↓
advisory budget/provider selection
↓
maximum credit cost (getMaximumCreditCost)
↓
atomic reservation COMMIT
↓
provider execution (ONLY if reservation succeeded)

Provider execution MUST NOT happen if:
ENRICHMENT_DISABLED, NO_PROVIDER, BUDGET LIMIT, ACTIVE_RESERVATION_EXISTS, JOB_OWNERSHIP_LOST, BUDGET_RESERVATION_TIMEOUT
```

Cost enforcement:
- Reserved = maximum
- If actual > reserved → `PROVIDER_COST_EXCEEDED_RESERVATION` violation, keep reserved amount, no budget increase after call, record `reservedCredits`, `reportedActualCredits` safe metadata
- If actual < reserved → KEEP reserved 2 conservatively (no refund), hard budget correctness > utilization
- Zero-cost provider supported: maximum 0, still respects candidate limit, ownership, creates attempt lifecycle

## 10. Legacy Bypass Removal

**BLOCKER 1 fixed:** `src/lib/enrichment.ts:startEnrichmentAttempt` previously could create STARTED without budget. Now throws `LEGACY_BYPASS_REMOVED` and instructs to use `reserveEnrichmentBudgetAtomically`. Internal `_legacyStartEnrichmentAttemptInternal` kept private for backward compat but not exported as production path. Repository search now shows **only one** production canonical STARTED creation path: `enrichment-providers.ts:reserveEnrichmentBudgetAtomically`.

Classification table:

| File | Pattern | Classification |
|------|---------|----------------|
| `src/lib/enrichment-providers.ts` | `enrichmentAttempt.create` + `STARTED` | PRODUCTION CANONICAL — reserveEnrichmentBudgetAtomically |
| `src/lib/enrichment.ts` | `EnrichmentAttemptStatus.STARTED` in `_legacyStartEnrichmentAttemptInternal` | LEGACY REMOVED — disabled, throws, not exported for provider execution |
| `scripts/enrichment-worker.mjs` | none | No STARTED creation — fail-closed before claim |
| Test files `test-enrichment-4c3a*.mjs`, `test-enrichment-4c3b1*.mjs`, `test-enrichment-4c3b1-1.mjs` | direct `prisma.enrichmentAttempt.create` | TEST ONLY — isolated TEST_ prefix |

## 11. Fallback Safety
`defaultFallbackPolicy = { allowFallback:false, maxProvidersPerCandidate:1, ... }` — one candidate cannot burn credits across multiple providers.

## 12. Observability
`getBudgetStatus` → `ENRICHMENT_DISABLED`, `WITHIN_BUDGET`, `DAILY_CANDIDATE_LIMIT_REACHED`, `DAILY_CREDIT_LIMIT_REACHED`, `MONTHLY_CREDIT_LIMIT_REACHED`, `NO_PROVIDER_AVAILABLE`
`getProvidersForUI` → maskedKey, never encryptedValue
Stats API extended safe authenticated
Enrichment Tab read-only

## 13. Test Adapters (TEST-ONLY)
- `SuccessTestProvider test-success` — SUCCESS, fakeCredits configurable, implements `getMaximumCreditCost`
- `NoResultTestProvider test-noresult`
- `FailedTestProvider test-failed`
- `ZeroCostTestProvider test-zero` — 0 credits, still counts candidate
- `CostViolationTestProvider test-violation` — reserved 1 actual 2 to test contract violation
- Zero network, deterministic, never in production registry

## 14. Test Matrix

### A-AB (4C.3B.1)
All passed: disabled, under limit, limit reached, unique semantics, daily/monthly credits, provider disabled, adapter missing, priority, tie-break, provider limits, no provider, unknown fail-closed, SUCCESS/NO_RESULT/FAILED normalized, secret leakage, 401, same candidate retry, simultaneous global candidate boundary (9+2 concurrent only 1 reserved), simultaneous global credit boundary, simultaneous provider credit boundary, crash after reservation conservative, stale worker blocked, production registry isolation, no external calls.

### AC-AP (4C.3B.1.1 Hardening)
- **AC** legacy bypass removed — canonical STARTED creation count 1, duplicate guard present
- **AD** same job duplicate reservation race — `Promise.all` same job same owner → exactly 1 STARTED, other `ACTIVE_RESERVATION_EXISTS`
- **AE** attemptCount duplicate protection — +1 only
- **AF** duplicate credits protection — credits once
- **AG** reclaimed job with unresolved STARTED — new owner blocked, no second STARTED
- **AH** unresolved STARTED remains counted — candidates 1 credits 1
- **AI** max-cost contract — `getMaximumCreditCost` present
- **AJ** actual <= reserved normal completion — keeps conservative
- **AK** actual > reserved contract violation — keeps original, flagged `PROVIDER_COST_EXCEEDED_RESERVATION`, `COST_VIOLATION`
- **AL** actual lower than reserved — keeps 2 conservative
- **AM** zero-cost adapter — 0 credits, 1 candidate, respects candidate limit
- **AN** reservation timeout — explicit `maxWait 15000 timeout 20000`, `BUDGET_RESERVATION_TIMEOUT` fail-closed, no provider execution
- **AO** no provider call on duplicate block — only 1 attempt
- **AP** production STARTED creation path count — canonical only (enrichment-providers.ts)

Plus regression 4C.3A A-L and 4C.3A.1 A-U still passing.

## 15. Hard Limit Guarantee
Two simultaneous workers cannot exceed global daily candidate, global daily credit, global monthly credit, provider daily, provider monthly because row locks serialize. Proven by V,W,X and AD,AG. Duplicate guard adds at most ONE active STARTED per job ownership period.

## 16. Future Reconciliation Requirement
STARTED attempts that remain unresolved after crash (e.g., `startedAt < now-30m AND status=STARTED`) should be surfaced for manual/automated reconciliation in future phase. Not implemented now.

## 17. Files Changed from baad5e5
- `src/lib/enrichment-providers.ts` — NEW + hardened: max cost contract, duplicate guard ACTIVE_RESERVATION_EXISTS, timeout BUDGET_RESERVATION_TIMEOUT, cost violation handling, zero-cost support, lock order preserved, explicit transaction policy
- `src/lib/enrichment.ts` — legacy bypass removed: `startEnrichmentAttempt` now throws LEGACY_BYPASS_REMOVED, internal `_legacyStartEnrichmentAttemptInternal` private
- `src/app/api/enrichment/stats/route.ts` — budgetStatus, budgetUsage, providers safe
- `src/app/(app)/settings/lead-collection/client.tsx` — Budget Guardrails UI read-only
- `scripts/test-enrichment-4c3b1.mjs` — A-AB
- `scripts/test-enrichment-4c3b1-1.mjs` — AC-AP new
- `docs/PHASE_4C.3B.1_PROVIDER_BUDGET_GUARDRAILS.md` — this file
- No changes to collector-worker.mjs, collect.yml, fair rotation, TRUE_NO_SITE, enabled=false

## 18. STRICT DO NOT Compliance
- [x] No real provider integration, no fetch/axios/http for provider, no credits spent, no credentials, no prod enable, no prod jobs/attempts, no prod candidates/Leads mutated, no collector/workflow triggered, no enrichment schedule, no collector-worker/fair rotation/TRUE_NO_SITE modified, no push without approval

## 19. Commit Control
- bcd00ac feat: Phase 4C.3B.1
- NEW fix: harden enrichment budget reservations — DO NOT PUSH until approval
