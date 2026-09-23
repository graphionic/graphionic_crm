/**
 * ClientForge CRM — Phase 4C.4C.1 Google Credential Architecture
 * ZERO real Google requests, credential handling WITHOUT storing credential
 *
 * Rules:
 * - API key must NEVER be stored in GoogleCollectionConfig.metadata, DataSource.config, GoogleApiUsage.metadata, GoogleApiCache, CollectorRun.metadata, LeadCandidate, logs, errors, fingerprints, Git, docs examples
 * - Credential reader exposes only configured: true/false, never actual key
 * - Production source: environment variable / secret manager (GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY)
 */

export interface GoogleCredentialStatus {
  configured: boolean;
  source: 'env' | 'none';
  envVarName: string | null;
}

const CANDIDATE_ENV_VARS = [
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_PLACES_API_KEY',
  'GOOGLE_API_KEY',
] as const;

export function getGoogleCredentialStatus(): GoogleCredentialStatus {
  for (const envName of CANDIDATE_ENV_VARS) {
    const val = process.env[envName];
    if (val && val.trim().length > 0) {
      // Do NOT log actual value, only that it's configured
      return {
        configured: true,
        source: 'env',
        envVarName: envName,
      };
    }
  }
  return {
    configured: false,
    source: 'none',
    envVarName: null,
  };
}

export function requireGoogleCredential(): { configured: boolean; error?: string } {
  const status = getGoogleCredentialStatus();
  if (!status.configured) {
    return {
      configured: false,
      error: 'GOOGLE_CREDENTIAL_MISSING',
    };
  }
  return { configured: true };
}

// Internal helper to get key for future Real transport only — never expose via status
// This function should ONLY be called inside RealGoogleTransport which is disabled in 4C.4C.1
export function getGoogleApiKeyForTransport(): string | null {
  for (const envName of CANDIDATE_ENV_VARS) {
    const val = process.env[envName];
    if (val && val.trim().length > 0) {
      return val.trim();
    }
  }
  return null;
}

// Safe logging — never log key
export function getSafeCredentialLog(): { configured: boolean; envVar: string | null } {
  const status = getGoogleCredentialStatus();
  return {
    configured: status.configured,
    envVar: status.envVarName,
  };
}
