/**
 * ClientForge CRM — Phase 4C.4C.3 Google Credential Integration
 * ZERO real Google requests, credential handling WITHOUT storing credential
 *
 * Canonical production env var: GOOGLE_MAPS_API_KEY
 * Legacy fallback (compatibility): GOOGLE_PLACES_API_KEY, GOOGLE_API_KEY
 * Precedence: GOOGLE_MAPS_API_KEY > GOOGLE_PLACES_API_KEY > GOOGLE_API_KEY (first found wins)
 * - If legacy fallback used, canonical GOOGLE_MAPS_API_KEY is still preferred for new deployments
 * - Never log actual key, never store in DB, never expose via API/UI/logs/metrics/errors
 *
 * Rules:
 * - API key must NEVER be stored in GoogleCollectionConfig.metadata, DataSource.config, GoogleApiUsage.metadata, GoogleApiCache, CollectorRun.metadata, LeadCandidate, logs, errors, fingerprints, Git, docs examples
 * - Credential reader exposes only configured: true/false, never actual key
 * - Production source: environment variable / secret manager (canonical GOOGLE_MAPS_API_KEY)
 */

export interface GoogleCredentialStatus {
  configured: boolean;
  source: 'env' | 'none';
  envVarName: 'GOOGLE_MAPS_API_KEY' | 'GOOGLE_PLACES_API_KEY' | 'GOOGLE_API_KEY' | null;
}

const CANONICAL_ENV_VAR = 'GOOGLE_MAPS_API_KEY' as const;
const CANDIDATE_ENV_VARS = [
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_PLACES_API_KEY',
  'GOOGLE_API_KEY',
] as const;

function getRawEnvValue(name: string): string | undefined {
  const val = process.env[name];
  if (val === undefined) return undefined;
  return val;
}

function isMeaningfulValue(val: string | undefined): boolean {
  if (val === undefined) return false;
  if (val === null) return false;
  // Trim whitespace — empty or whitespace-only → treated as missing
  const trimmed = val.trim();
  if (trimmed.length === 0) return false;
  return true;
}

export function getGoogleCredentialStatus(): GoogleCredentialStatus {
  for (const envName of CANDIDATE_ENV_VARS) {
    const raw = getRawEnvValue(envName);
    if (isMeaningfulValue(raw)) {
      // Do NOT log actual value, only that it's configured
      return {
        configured: true,
        source: 'env',
        envVarName: envName as any,
      };
    }
  }
  return {
    configured: false,
    source: 'none',
    envVarName: null,
  };
}

export function requireGoogleCredential(): { configured: boolean; error?: string; envVarName?: string | null } {
  const status = getGoogleCredentialStatus();
  if (!status.configured) {
    return {
      configured: false,
      error: 'GOOGLE_CREDENTIAL_MISSING',
      envVarName: null,
    };
  }
  return { configured: true, envVarName: status.envVarName };
}

// Internal helper to get key for future Real transport only — never expose via status
// This function should ONLY be called inside RealGoogleTransport which is disabled in 4C.4C.3
// It returns trimmed value, never logs, never exposes via API
export function getGoogleApiKeyForTransport(): string | null {
  for (const envName of CANDIDATE_ENV_VARS) {
    const raw = getRawEnvValue(envName);
    if (isMeaningfulValue(raw)) {
      return raw!.trim();
    }
  }
  return null;
}

// Safe logging — never log key, only configured boolean and env var name
export function getSafeCredentialLog(): { configured: boolean; envVar: string | null; canonical: string } {
  const status = getGoogleCredentialStatus();
  return {
    configured: status.configured,
    envVar: status.envVarName,
    canonical: CANONICAL_ENV_VAR,
  };
}

export function getCanonicalEnvVarName(): string {
  return CANONICAL_ENV_VAR;
}

export function getCandidateEnvVars(): readonly string[] {
  return CANDIDATE_ENV_VARS;
}
