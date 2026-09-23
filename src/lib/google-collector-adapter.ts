/**
 * Phase 4C.4C.5A — Google Collector Adapter (ZERO NETWORK in this phase)
 * Prepares collector integration boundary, unreachable while disabled.
 * Uses existing: credential reader, builders, field masks, fingerprinting, cache, budget, usage, error classification, normalization
 * NO bypass.
 */

import { PrismaClient } from '@prisma/client';
import { getGoogleCredentialStatus } from './google-credential-reader';
import { getActivationModeFromConfig, validateGoogleActivationScope, canExecuteGoogleBase, CANARY_PAGINATION_ENABLED, CANARY_RETRY_LIMIT, STAGED_REQUEST, buildSafeMetricsLog } from './google-activation';

export interface GoogleCollectorContext {
  prisma: PrismaClient;
  location: { id: string; countryCode: string; city: string; latitude?: number; longitude?: number };
  category: { id: string; slug: string; name: string };
  source: any;
  collectorRunId: string;
  config: any;
}

export interface GoogleCollectorResult {
  status: 'SKIPPED' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  reason?: string;
  metrics: Record<string, any>;
  candidatesFound?: number;
  safeLog: Record<string, any>;
}

export async function canExecuteGoogleCollector(
  ctx: GoogleCollectorContext
): Promise<{ allowed: boolean; reason?: string; mode?: string; scope?: any }> {
  const credStatus = getGoogleCredentialStatus();
  const base = canExecuteGoogleBase(ctx.config, ctx.source, credStatus.configured);
  if (!base.allowed) {
    return { allowed: false, reason: base.reason, mode: getActivationModeFromConfig(ctx.config) };
  }
  const scopeCheck = validateGoogleActivationScope(
    ctx.config,
    { countryCode: ctx.location.countryCode, city: ctx.location.city },
    { slug: ctx.category.slug }
  );
  if (!scopeCheck.allowed) {
    return { allowed: false, reason: scopeCheck.reason, mode: scopeCheck.mode, scope: scopeCheck.scope };
  }
  return { allowed: true, mode: scopeCheck.mode, scope: scopeCheck.scope };
}

export async function collectFromGoogleSource(
  ctx: GoogleCollectorContext
): Promise<GoogleCollectorResult> {
  // This function is prepared for future activation, but MUST remain unreachable while disabled.
  // In 4C.4C.5A, config.enabled=false and source.enabled=false, so canExecute will be false.
  const check = await canExecuteGoogleCollector(ctx);
  if (!check.allowed) {
    return {
      status: 'SKIPPED',
      reason: check.reason,
      metrics: buildSafeMetricsLog({ googleRequests: 0 }),
      candidatesFound: 0,
      safeLog: { operation: 'GOOGLE_SKIPPED', reason: check.reason, mode: check.mode, scope: check.scope },
    };
  }

  // If we reach here, it means activation is enabled — but in 4C.4C.5A this must NOT happen.
  // For safety, we still throw GOOGLE_NETWORK_TRANSPORT_DISABLED until 4C.4C.5C explicitly approves transport activation.
  // The real pipeline (future) would be:
  // CollectorRun → source/config validation → activation mode → scope validation → build request intent → fingerprint → cache check → budget reservation → credential check → requestSentAt boundary → transport → usage completion → cache → normalization → evidence merge → qualification recheck
  // Every real network transmission requires its own reservation.

  throw new Error('GOOGLE_COLLECTOR_NOT_YET_ACTIVATED — transport disabled in 4C.4C.5A, awaiting explicit approval in 4C.4C.5C');
}

export function getGoogleCollectorSafeLog(ctx: Partial<GoogleCollectorContext>, result: GoogleCollectorResult): Record<string, any> {
  return {
    sourceType: 'GOOGLE_PLACES',
    operation: result.safeLog?.operation || 'GOOGLE_COLLECTOR',
    status: result.status,
    reason: result.reason,
    mode: result.safeLog?.mode,
    scope: result.safeLog?.scope,
    metrics: buildSafeMetricsLog(result.metrics),
    candidatesFound: result.candidatesFound,
    paginationEnabled: CANARY_PAGINATION_ENABLED,
    retryLimit: CANARY_RETRY_LIMIT,
    stagedRequest: STAGED_REQUEST.STAGE_A_ID_DISCOVERY,
  };
}

// Transport gating — future production transport boundary that can ONLY execute after checks
export function assertGoogleTransportAllowed(ctx: GoogleCollectorContext): void {
  // This is the production transport boundary that will be used in future
  // It requires: source enabled, config enabled, mode valid, scope allowed, credential available, reservation committed
  // In 4C.4C.5A, we always fail closed
  throw new Error('GOOGLE_NETWORK_TRANSPORT_DISABLED — activation architecture prepared but transport not yet approved');
}

export const GOOGLE_COLLECTOR_PIPELINE = [
  'CollectorRun',
  'source/config validation',
  'activation mode',
  'scope validation',
  'build request intent',
  'fingerprint',
  'cache check',
  'budget reservation',
  'credential check',
  'requestSentAt boundary',
  'transport',
  'usage completion',
  'cache',
  'normalization',
  'evidence merge',
  'qualification recheck',
] as const;
