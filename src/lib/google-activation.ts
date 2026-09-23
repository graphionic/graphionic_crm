/**
 * Phase 4C.4C.5A — Limited Google Production Activation Architecture
 * ZERO GOOGLE NETWORK — design only, no enable, no request
 *
 * Defines:
 * - activation modes DISABLED | CANARY | PRODUCTION
 * - canary scope allowlist Manchester+dental ONLY
 * - canary limits per-run 3 daily 5 monthly 500 hard cap remains
 * - scope guard requiring both enabled flags + credential + budget + scope + health + run + reservation
 * - staged request architecture
 * - pagination/retry disabled for canary
 * - email invariant, website invariant, cross-source dedup, metrics, stop conditions
 */

export const GOOGLE_ACTIVATION_MODES = ['DISABLED', 'CANARY', 'PRODUCTION'] as const;
export type GoogleActivationMode = typeof GOOGLE_ACTIVATION_MODES[number];

export const DEFAULT_ACTIVATION_MODE: GoogleActivationMode = 'DISABLED';

export interface CanaryScope {
  countryCode: string; // e.g., GB
  city: string; // e.g., Manchester
  categorySlug: string; // e.g., dental
}

export const INITIAL_CANARY_SCOPES: CanaryScope[] = [
  { countryCode: 'GB', city: 'Manchester', categorySlug: 'dental' },
];

export interface CanaryLimits {
  perRun: number; // 3
  daily: number; // 5
  monthly: number; // 500 (hard cap remains, canary may have tighter)
}

export const INITIAL_CANARY_LIMITS: CanaryLimits = {
  perRun: 3,
  daily: 5,
  monthly: 500,
};

export const HARD_LIMITS = {
  perRun: 10,
  daily: 50,
  monthly: 500,
};

export function isValidActivationMode(mode: any): mode is GoogleActivationMode {
  return GOOGLE_ACTIVATION_MODES.includes(mode);
}

export function normalizeScope(s: any): CanaryScope | null {
  if (!s || typeof s !== 'object') return null;
  const countryCode = typeof s.countryCode === 'string' ? s.countryCode.trim().toUpperCase() : null;
  const city = typeof s.city === 'string' ? s.city.trim() : null;
  const categorySlug = typeof s.categorySlug === 'string' ? s.categorySlug.trim().toLowerCase() : null;
  if (!countryCode || !city || !categorySlug) return null;
  if (countryCode.length < 2 || countryCode.length > 3) return null;
  if (city.length < 2) return null;
  if (categorySlug.length < 2) return null;
  return { countryCode, city, categorySlug };
}

export function isScopeAllowed(
  scope: CanaryScope,
  allowlist: CanaryScope[]
): boolean {
  if (!allowlist || allowlist.length === 0) return false; // FAIL CLOSED if missing/invalid
  const normalized = normalizeScope(scope);
  if (!normalized) return false;
  return allowlist.some(a => {
    const na = normalizeScope(a);
    if (!na) return false;
    return (
      na.countryCode === normalized.countryCode &&
      na.city.toLowerCase() === normalized.city.toLowerCase() &&
      na.categorySlug === normalized.categorySlug
    );
  });
}

export function getCanaryAllowlistFromConfig(config: any): CanaryScope[] {
  // Prefer typed fields if present, fallback to metadata
  if (!config) return [];
  // New fields: canaryScopes Json
  if (Array.isArray(config.canaryScopes)) {
    const list = config.canaryScopes.map(normalizeScope).filter(Boolean) as CanaryScope[];
    if (list.length > 0) return list;
  }
  // Legacy: metadata.canaryScopes or metadata.allowedScopes
  if (config.metadata) {
    const meta = config.metadata;
    if (Array.isArray(meta.canaryScopes)) {
      const list = meta.canaryScopes.map(normalizeScope).filter(Boolean) as CanaryScope[];
      if (list.length > 0) return list;
    }
    if (Array.isArray(meta.allowedScopes)) {
      const list = meta.allowedScopes.map(normalizeScope).filter(Boolean) as CanaryScope[];
      if (list.length > 0) return list;
    }
  }
  // Default to INITIAL_CANARY_SCOPES if config is in CANARY mode but no explicit scope? FAIL CLOSED: return empty to force explicit config
  // For safety, if activationMode is CANARY and no scope configured, return empty (blocked)
  return [];
}

export function getActivationModeFromConfig(config: any): GoogleActivationMode {
  if (!config) return 'DISABLED';
  const mode = config.activationMode || config.metadata?.activationMode;
  if (isValidActivationMode(mode)) return mode;
  // Legacy: if enabled false, DISABLED
  if (config.enabled === false) return 'DISABLED';
  return 'DISABLED'; // fail closed default
}

export function getEffectiveLimits(
  config: any,
  mode: GoogleActivationMode
): CanaryLimits {
  if (mode === 'CANARY') {
    const perRun = config?.canaryPerRunRequestLimit ?? config?.metadata?.canaryPerRunLimit ?? INITIAL_CANARY_LIMITS.perRun;
    const daily = config?.canaryDailyRequestLimit ?? config?.metadata?.canaryDailyLimit ?? INITIAL_CANARY_LIMITS.daily;
    const monthly = config?.canaryMonthlyRequestLimit ?? config?.metadata?.canaryMonthlyLimit ?? INITIAL_CANARY_LIMITS.monthly;
    return {
      perRun: Math.min(perRun, HARD_LIMITS.perRun, INITIAL_CANARY_LIMITS.perRun),
      daily: Math.min(daily, HARD_LIMITS.daily, INITIAL_CANARY_LIMITS.daily),
      monthly: Math.min(monthly, HARD_LIMITS.monthly),
    };
  }
  // For DISABLED or PRODUCTION, return hard limits (PRODUCTION still hard-budgeted)
  return { ...HARD_LIMITS };
}

export interface ScopeValidationResult {
  allowed: boolean;
  reason?: string;
  mode: GoogleActivationMode;
  scope?: CanaryScope;
}

export function validateGoogleActivationScope(
  config: any,
  location: { countryCode?: string; city?: string } | null,
  category: { slug?: string } | null
): ScopeValidationResult {
  const mode = getActivationModeFromConfig(config);
  if (mode === 'DISABLED') {
    return { allowed: false, reason: 'GOOGLE_ACTIVATION_DISABLED', mode };
  }
  if (!location || !category) {
    return { allowed: false, reason: 'INVALID_ACTIVATION_SCOPE_MISSING_LOCATION_CATEGORY', mode };
  }
  const scope: CanaryScope = {
    countryCode: (location.countryCode || '').toUpperCase(),
    city: location.city || '',
    categorySlug: (category.slug || '').toLowerCase(),
  };
  const normalized = normalizeScope(scope);
  if (!normalized) {
    return { allowed: false, reason: 'INVALID_ACTIVATION_SCOPE', mode, scope };
  }
  if (mode === 'CANARY') {
    const allowlist = getCanaryAllowlistFromConfig(config);
    if (allowlist.length === 0) {
      return { allowed: false, reason: 'CANARY_SCOPE_NOT_CONFIGURED_FAIL_CLOSED', mode, scope: normalized };
    }
    const allowed = isScopeAllowed(normalized, allowlist);
    if (!allowed) {
      return { allowed: false, reason: 'CANARY_SCOPE_NOT_ALLOWED', mode, scope: normalized };
    }
    return { allowed: true, mode, scope: normalized };
  }
  if (mode === 'PRODUCTION') {
    // Future: broader rotation but still hard budgets, for now require explicit allowlist as well or fail closed until approved
    // For safety, if PRODUCTION mode but no allowlist, still fail closed until broader rotation approved
    const allowlist = getCanaryAllowlistFromConfig(config);
    if (allowlist.length === 0) {
      // In future production, allow all? But for now fail closed to prevent accidental broad activation
      return { allowed: false, reason: 'PRODUCTION_SCOPE_NOT_CONFIGURED_FAIL_CLOSED', mode, scope: normalized };
    }
    const allowed = isScopeAllowed(normalized, allowlist);
    if (!allowed) {
      return { allowed: false, reason: 'PRODUCTION_SCOPE_NOT_ALLOWED', mode, scope: normalized };
    }
    return { allowed: true, mode, scope: normalized };
  }
  return { allowed: false, reason: 'UNKNOWN_MODE_FAIL_CLOSED', mode, scope: normalized };
}

export function canExecuteGoogleBase(
  config: any,
  dataSource: any,
  credentialConfigured: boolean
): { allowed: boolean; reason?: string } {
  if (!config) return { allowed: false, reason: 'GOOGLE_CONFIG_MISSING' };
  if (config.enabled !== true) return { allowed: false, reason: 'GOOGLE_CONFIG_DISABLED' };
  if (!dataSource) return { allowed: false, reason: 'GOOGLE_SOURCE_MISSING' };
  if (dataSource.enabled !== true) return { allowed: false, reason: 'GOOGLE_SOURCE_DISABLED' };
  const mode = getActivationModeFromConfig(config);
  if (mode === 'DISABLED') return { allowed: false, reason: 'GOOGLE_ACTIVATION_DISABLED' };
  if (!credentialConfigured) return { allowed: false, reason: 'GOOGLE_CREDENTIAL_MISSING' };
  // health check: if source hard-down, block
  if (dataSource.healthStatus === 'down') return { allowed: false, reason: 'GOOGLE_SOURCE_DOWN' };
  return { allowed: true };
}

export const STAGED_REQUEST = {
  STAGE_A_ID_DISCOVERY: {
    operation: 'TEXT_SEARCH',
    fieldMask: ['places.id', 'places.name', 'nextPageToken'],
    purpose: 'cheap discovery / Google place identity, no contact fields, no automatic pagination during initial canary',
  },
  STAGE_B_DISCOVERY_DETAILS: {
    operation: 'PLACE_DETAILS',
    fieldMask: ['id', 'name', 'displayName', 'formattedAddress', 'location', 'types', 'primaryType', 'businessStatus'],
    purpose: 'minimum non-contact details for name/address/coordinates/types/businessStatus',
  },
  STAGE_C_CONTACT: {
    operation: 'PLACE_DETAILS',
    fieldMask: ['websiteUri', 'internationalPhoneNumber', 'nationalPhoneNumber'],
    purpose: 'higher-cost boundary, website/phone evidence, requires separate reservation',
  },
} as const;

export const CANARY_PAGINATION_ENABLED = false;
export const CANARY_RETRY_LIMIT = 0;

export const EMAIL_INVARIANT = {
  googleProvidesEmail: false,
  qualifiedRequiresUsefulEmail: true,
  qualifiedRequiresNoLiveWebsite: true,
  noFabrication: true,
  noScraping: true,
};

export const WEBSITE_INVARIANT = {
  googleWebsiteTriggersRecheck: true,
  liveWebsiteRejectsExistingWebsite: true,
  absenceNotProofOfNoSite: true,
  neverOverrideNewerEvidenceWithStale: true,
};

export const CROSS_SOURCE_MATCHING = {
  strong: ['EMAIL_EXACT', 'PHONE_EXACT'],
  probable: ['NAME_ADDRESS', 'NAME_POSTAL', 'NAME_GEO', 'NAME_CITY'],
  neverMerge: ['COORDINATES_ALONE', 'NAME_ALONE'],
  placeIdCanonical: { externalType: 'place', sourceType: 'GOOGLE_PLACES', externalId: 'bare place ID' },
};

export const CANARY_METRICS = [
  'googleRequests',
  'googleCacheHits',
  'googleCacheMisses',
  'googleResults',
  'googleUniquePlaces',
  'googleMatchedExistingCandidates',
  'googleNewCandidates',
  'googleWebsiteEvidenceFound',
  'googleLiveWebsiteRejected',
  'googleNoWebsiteEvidence',
  'googlePhoneEvidenceFound',
  'googleCandidatesWithEmail',
  'googleQualifiedLeads',
  'googleDuplicatesPrevented',
  'googleRequestUnits',
  'googleCostUnits',
  'googleErrors',
] as const;

export const STOP_CONDITIONS = [
  'DAILY_LIMIT_REACHED',
  'MONTHLY_LIMIT_REACHED',
  'PER_RUN_LIMIT_REACHED',
  'GOOGLE_CREDENTIAL_MISSING',
  'AUTH_ERROR',
  'QUOTA_EXCEEDED',
  'INVALID_ACTIVATION_SCOPE',
  'GOOGLE_SOURCE_DISABLED',
  'GOOGLE_CONFIG_DISABLED',
  'GOOGLE_ACTIVATION_DISABLED',
  'CANARY_SCOPE_NOT_ALLOWED',
  'CANARY_SCOPE_NOT_CONFIGURED_FAIL_CLOSED',
] as const;

export function buildSafeMetricsLog(metrics: Record<string, any>): Record<string, any> {
  // Never log API key, ensure only safe metrics
  const safe: Record<string, any> = {};
  for (const k of CANARY_METRICS) {
    if (metrics[k] !== undefined) safe[k] = metrics[k];
  }
  // Include derived metrics if present
  if (metrics.resultsPerRequest !== undefined) safe.resultsPerRequest = metrics.resultsPerRequest;
  if (metrics.matchedBusinessesPerRequest !== undefined) safe.matchedBusinessesPerRequest = metrics.matchedBusinessesPerRequest;
  if (metrics.websiteEvidencePerRequest !== undefined) safe.websiteEvidencePerRequest = metrics.websiteEvidencePerRequest;
  if (metrics.qualifiedLeadsPerRequest !== undefined) safe.qualifiedLeadsPerRequest = metrics.qualifiedLeadsPerRequest;
  if (metrics.costUnitsPerQualifiedLead !== undefined) safe.costUnitsPerQualifiedLead = metrics.costUnitsPerQualifiedLead;
  return safe;
}
