/**
 * ClientForge CRM — Phase 4C.4C.5D.1 Cross-Source Website Evidence Architecture
 *
 * Candidate-First Google Places verification for existing OSM candidates.
 * ZERO live Google requests in Phase 4C.4C.5D.1.
 *
 * Core Business Invariant:
 * - ClientForge Lead requires: USEFUL EMAIL + CONFIRMED NO LIVE WEBSITE.
 * - Google Places does NOT provide business email.
 * - Therefore, Google alone cannot create a qualified Lead.
 * - Google website absence (websiteUri = null) does NOT prove TRUE_NO_SITE.
 * - Google website presence DISQUALIFIES candidate if confirmed LIVE via canonical hasLiveWebsite().
 *
 * Provider-Neutral Architecture:
 * - Google supplies business evidence (identity match + websiteUri).
 * - Core CRM evaluates candidate eligibility, canonical live website verification, and qualification decision.
 */

import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  isGenericEmailDomain,
  hasLiveWebsite,
  extractEmailDomain,
  WebsiteCheckResult,
} from './website-verification';
import {
  NormalizedBusinessRecord,
  normalizedFromGooglePlace,
  matchNormalizedRecords,
  MatchResult,
  MatchConfidence,
  SourceEvidence,
  normalizeBusinessNameForComparison,
  normalizeWebsiteHostForComparison,
} from './collection-normalization';
import {
  canonicalizePlaceId,
  buildPlaceDetailsRequest,
  SEARCH_ID_ONLY_MASK,
} from './google-places-adapter';
import {
  generateGoogleRequestFingerprint,
} from './google-collector-adapter';
import {
  checkGoogleCache,
  reserveGoogleRequestBudgetAtomically,
} from './google-request-guardrails';

// ---------------------------------------------------------------- Constants & Rules

export const ALLOWED_VERIFICATION_STATUSES = new Set([
  'NEEDS_ENRICHMENT',
  'DISCOVERED',
  'REJECTED', // Can be re-evaluated if rejected for missing website/email, but not for permanent blacklist
]);

export const PLACE_DETAILS_WEBSITE_MASK = ['id', 'name', 'websiteUri'] as const;

export const MAX_VERIFICATION_NETWORK_REQUESTS_CAP = 2; // 1 identity search + 1 place details

// ---------------------------------------------------------------- Type Definitions

export interface VerificationEligibilityResult {
  eligible: boolean;
  reason?: string;
  candidateId?: string;
  safeSummary?: {
    companyName?: string;
    city?: string | null;
    country?: string | null;
    category?: string | null;
    emailDomain?: string | null;
    hasEmail: boolean;
    hasWebsite: boolean;
    status: string;
  };
}

export interface GoogleIdentitySearchPlan {
  operation: 'TEXT_SEARCH';
  textQuery: string;
  fieldMask: readonly string[];
  fieldMaskString: string;
  pageSize: number;
  queryFingerprint: string;
  candidateId: string;
}

export type IdentityMatchOutcome =
  | 'MATCH_CONFIRMED'
  | 'MATCH_AMBIGUOUS'
  | 'NO_MATCH'
  | 'INSUFFICIENT_IDENTITY'
  | 'NOT_ELIGIBLE';

export interface IdentityResolutionResult {
  outcome: IdentityMatchOutcome;
  confidence: MatchConfidence | 'AMBIGUOUS';
  confirmedPlaceId?: string | null;
  matchedRecord?: NormalizedBusinessRecord | null;
  reasons: string[];
  explain: string;
  candidateId: string;
  allMatchesCount: number;
}

export interface GooglePlaceDetailsWebsitePlan {
  operation: 'PLACE_DETAILS';
  canonicalPlaceId: string;
  endpoint: string;
  endpointUrl: string;
  fieldMask: readonly string[];
  fieldMaskString: string;
  queryFingerprint: string;
  candidateId: string;
}

export type WebsiteEvidenceOutcome =
  | 'REJECT_EXISTING_WEBSITE'
  | 'NO_GOOGLE_WEBSITE_EVIDENCE'
  | 'GOOGLE_WEBSITE_NOT_LIVE'
  | 'WEBSITE_VERIFICATION_INCONCLUSIVE'
  | 'MATCH_AMBIGUOUS'
  | 'NO_MATCH'
  | 'INSUFFICIENT_IDENTITY'
  | 'NOT_ELIGIBLE';

export interface WebsiteEvidenceDecision {
  outcome: WebsiteEvidenceOutcome;
  candidateId: string;
  shouldReject: boolean;
  rejectionReason?: 'existing_website' | string;
  shouldQualify: boolean; // MUST ALWAYS BE FALSE for Google website evidence
  googlePlaceId?: string | null;
  googleWebsiteUri?: string | null;
  normalizedWebsite?: string | null;
  liveStatus?: 'LIVE' | 'NOT_LIVE' | 'INCONCLUSIVE' | 'NONE';
  verificationDetails?: WebsiteCheckResult | null;
  reasons: string[];
  explain: string;
}

// ---------------------------------------------------------------- 1. Eligibility Evaluation

export function evaluateGoogleWebsiteVerificationEligibility(
  candidate: any,
  options: { allowRecheckRejected?: boolean } = {}
): VerificationEligibilityResult {
  if (!candidate || typeof candidate !== 'object') {
    return { eligible: false, reason: 'CANDIDATE_MISSING' };
  }

  const candidateId = candidate.id || 'unknown';
  const companyName = (candidate.companyName || '').trim();
  const status = candidate.status || 'UNKNOWN';

  const safeSummary = {
    companyName: companyName ? companyName.slice(0, 50) : undefined,
    city: candidate.city || null,
    country: candidate.country || null,
    category: candidate.businessCategory || null,
    emailDomain: extractEmailDomain(candidate.email || ''),
    hasEmail: !!(candidate.email && candidate.email.trim().length > 0),
    hasWebsite: !!(candidate.website && candidate.website.trim().length > 0),
    status,
  };

  // Rule 1: Candidate status check
  // QUALIFIED leads must NOT be mutated via candidate verification without dedicated lifecycle
  if (status === 'QUALIFIED') {
    return {
      eligible: false,
      reason: 'CANDIDATE_ALREADY_QUALIFIED',
      candidateId,
      safeSummary,
    };
  }

  if (!ALLOWED_VERIFICATION_STATUSES.has(status)) {
    return {
      eligible: false,
      reason: `INVALID_CANDIDATE_STATUS_${status}`,
      candidateId,
      safeSummary,
    };
  }

  // If candidate is already REJECTED for duplicate or permanent reason, do not recheck unless allowRecheckRejected is set
  if (status === 'REJECTED' && !options.allowRecheckRejected) {
    const rejReason = candidate.rejectionReason || '';
    if (rejReason === 'duplicate' || rejReason === 'invalid_data') {
      return {
        eligible: false,
        reason: `CANDIDATE_PERMANENTLY_REJECTED_${rejReason}`,
        candidateId,
        safeSummary,
      };
    }
  }

  // Rule 2: Non-empty company name required for identity resolution
  if (!companyName) {
    return {
      eligible: false,
      reason: 'MISSING_COMPANY_NAME',
      candidateId,
      safeSummary,
    };
  }

  // Rule 3: Must have valid, useful, non-generic business email
  const rawEmail = (candidate.email || '').trim().toLowerCase();
  if (!rawEmail || !rawEmail.includes('@')) {
    return {
      eligible: false,
      reason: 'MISSING_OR_INVALID_EMAIL',
      candidateId,
      safeSummary,
    };
  }

  const emailDomain = extractEmailDomain(rawEmail);
  if (!emailDomain || isGenericEmailDomain(emailDomain)) {
    return {
      eligible: false,
      reason: 'GENERIC_EMAIL_DOMAIN_NOT_ELIGIBLE',
      candidateId,
      safeSummary,
    };
  }

  // Rule 4: Candidate must NOT have an already known website
  if (candidate.website && candidate.website.trim().length > 0) {
    return {
      eligible: false,
      reason: 'CANDIDATE_ALREADY_HAS_WEBSITE',
      candidateId,
      safeSummary,
    };
  }

  // Rule 5: Candidate metadata must NOT already contain confirmed live website evidence
  if (candidate.metadata && typeof candidate.metadata === 'object') {
    const meta = candidate.metadata;
    if (meta.googleWebsiteVerifiedLive === true) {
      return {
        eligible: false,
        reason: 'ALREADY_VERIFIED_LIVE_WEBSITE',
        candidateId,
        safeSummary,
      };
    }

    if (Array.isArray(meta.sourceEvidence)) {
      for (const ev of meta.sourceEvidence) {
        if (ev && ev.liveStatus === 'LIVE') {
          return {
            eligible: false,
            reason: 'SOURCE_EVIDENCE_ALREADY_HAS_LIVE_WEBSITE',
            candidateId,
            safeSummary,
          };
        }
      }
    }
  }

  // Rule 6: Candidate must have at least one geographic anchor for Google resolution
  const hasCity = !!(candidate.city && candidate.city.trim().length > 0);
  const hasPostal = !!(candidate.postcode && candidate.postcode.trim().length > 0);
  const hasAddress = !!(candidate.address && candidate.address.trim().length > 0);
  const hasCoords = candidate.latitude != null && candidate.longitude != null;

  if (!hasCity && !hasPostal && !hasAddress && !hasCoords) {
    return {
      eligible: false,
      reason: 'INSUFFICIENT_GEOGRAPHIC_IDENTITY',
      candidateId,
      safeSummary,
    };
  }

  return {
    eligible: true,
    candidateId,
    safeSummary,
  };
}

// ---------------------------------------------------------------- 2. Stage A Identity Search Planning

export function planGoogleIdentityResolutionSearch(params: {
  candidate: any;
  sourceId?: string;
  pageSize?: number;
}): GoogleIdentitySearchPlan {
  const candidate = params.candidate;
  if (!candidate || !candidate.companyName) {
    throw new Error('INVALID_CANDIDATE: companyName required for identity search plan');
  }

  const name = candidate.companyName.trim();
  const city = (candidate.city || '').trim();
  const country = (candidate.country || '').trim();
  const postcode = (candidate.postcode || '').trim();

  // Deterministic search query construction
  // Prefer: "<companyName> <city> <country>" or "<companyName> <postcode>"
  let textQuery = name;
  if (city && country) {
    textQuery = `${name} ${city} ${country}`;
  } else if (city) {
    textQuery = `${name} ${city}`;
  } else if (postcode) {
    textQuery = `${name} ${postcode}`;
  }

  textQuery = textQuery.replace(/\s+/g, ' ').trim();

  const fieldMask = SEARCH_ID_ONLY_MASK; // ['places.id', 'places.name', 'nextPageToken']
  const fieldMaskString = fieldMask.join(',');
  const pageSize = Math.min(params.pageSize || 3, 3);
  const sourceId = params.sourceId || 'default';

  const queryFingerprint = generateGoogleRequestFingerprint({
    operation: 'TEXT_SEARCH',
    textQuery,
    fieldMask: [...fieldMask],
    pageSize,
    sourceId,
  });

  return {
    operation: 'TEXT_SEARCH',
    textQuery,
    fieldMask,
    fieldMaskString,
    pageSize,
    queryFingerprint,
    candidateId: candidate.id || 'unknown',
  };
}

// ---------------------------------------------------------------- 3. Google Identity Resolution & Matching

export function resolveCandidateGoogleIdentity(params: {
  candidate: any;
  rawPlaces: any[];
  sourceId?: string;
  geoThresholdMeters?: number;
}): IdentityResolutionResult {
  const candidate = params.candidate;
  const rawPlaces = Array.isArray(params.rawPlaces) ? params.rawPlaces : [];
  const candidateId = candidate?.id || 'unknown';

  if (!candidate || !candidate.companyName) {
    return {
      outcome: 'INSUFFICIENT_IDENTITY',
      confidence: 'NONE',
      reasons: ['MISSING_CANDIDATE_DATA'],
      explain: 'Candidate lacks companyName for identity matching',
      candidateId,
      allMatchesCount: 0,
    };
  }

  if (rawPlaces.length === 0) {
    return {
      outcome: 'NO_MATCH',
      confidence: 'NONE',
      reasons: ['NO_GOOGLE_PLACES_RETURNED'],
      explain: 'Google Text Search returned 0 places for identity query',
      candidateId,
      allMatchesCount: 0,
    };
  }

  const geoThreshold = params.geoThresholdMeters || 75; // 75 meters strict threshold
  const normalizedCandidate = {
    id: candidate.id,
    companyName: candidate.companyName,
    email: candidate.email || null,
    phone: candidate.phone || null,
    website: candidate.website || null,
    address: candidate.address || null,
    city: candidate.city || null,
    country: candidate.country || null,
    postalCode: candidate.postcode || candidate.postalCode || null,
    postcode: candidate.postcode || candidate.postalCode || null,
    latitude: candidate.latitude != null ? Number(candidate.latitude) : null,
    longitude: candidate.longitude != null ? Number(candidate.longitude) : null,
  };

  const confirmedMatches: Array<{
    placeId: string;
    record: NormalizedBusinessRecord;
    match: MatchResult;
  }> = [];

  for (const raw of rawPlaces) {
    const rawPlaceId = raw.id || (raw.name ? raw.name.replace(/^places\//, '') : null);
    if (!rawPlaceId) continue;

    const displayNameText = typeof raw.displayName === 'object' ? raw.displayName?.text : raw.displayName;
    const businessName = displayNameText || (raw.name && !raw.name.startsWith('places/') ? raw.name : '') || `Place ${rawPlaceId}`;

    const norm = normalizedFromGooglePlace(
      {
        place_id: rawPlaceId,
        name: businessName,
        formatted_address: raw.formattedAddress || raw.formatted_address,
        formatted_phone_number: raw.formattedPhoneNumber || raw.formatted_phone_number || raw.phone,
        international_phone_number: raw.internationalPhoneNumber || raw.international_phone_number,
        geometry: raw.location ? { location: { lat: raw.location.latitude, lng: raw.location.longitude } } : raw.geometry,
        address_components: raw.address_components || raw.addressComponents,
      },
      candidate.businessCategory || 'unknown',
      params.sourceId || 'default'
    );

    if (!norm) continue;

    const match = matchNormalizedRecords(norm, normalizedCandidate, { geoThresholdMeters: geoThreshold });

    // Evaluate matching signals
    // Reject WEAK_NAME_ONLY and COORDINATES_ONLY
    if (match.matched) {
      if (match.confidence === 'EXACT' || match.confidence === 'STRONG') {
        confirmedMatches.push({
          placeId: rawPlaceId,
          record: norm,
          match,
        });
      } else if (match.confidence === 'PROBABLE') {
        // Name + Address, Name + Postal, Name + Geo <= 75m, or Name + City
        // If match reasons include NAME_ADDRESS, NAME_POSTAL, or NAME_GEO, accept as confirmed
        const hasStrongSubSignal = match.reasons.some(r =>
          r === 'NAME_ADDRESS' || r === 'NAME_POSTAL' || r === 'NAME_GEO' || r === 'PHONE_EXACT'
        );
        if (hasStrongSubSignal) {
          confirmedMatches.push({
            placeId: rawPlaceId,
            record: norm,
            match,
          });
        } else if (match.reasons.includes('NAME_CITY')) {
          // If only Name + City, check if normalized name is exact match
          const normCandName = normalizeBusinessNameForComparison(candidate.companyName);
          if (norm.normalizedName === normCandName && rawPlaces.length === 1) {
            confirmedMatches.push({
              placeId: rawPlaceId,
              record: norm,
              match,
            });
          }
        }
      }
    }
  }

  // Evaluate outcomes
  if (confirmedMatches.length === 1) {
    const winner = confirmedMatches[0];
    return {
      outcome: 'MATCH_CONFIRMED',
      confidence: winner.match.confidence,
      confirmedPlaceId: winner.placeId,
      matchedRecord: winner.record,
      reasons: winner.match.reasons,
      explain: `Confirmed match with Google place ${winner.placeId}: ${winner.match.explain}`,
      candidateId,
      allMatchesCount: 1,
    };
  }

  if (confirmedMatches.length > 1) {
    // Check if all confirmed matches refer to the SAME placeId
    const uniquePlaceIds = new Set(confirmedMatches.map(m => m.placeId));
    if (uniquePlaceIds.size === 1) {
      const winner = confirmedMatches[0];
      return {
        outcome: 'MATCH_CONFIRMED',
        confidence: winner.match.confidence,
        confirmedPlaceId: winner.placeId,
        matchedRecord: winner.record,
        reasons: winner.match.reasons,
        explain: `Confirmed unique place ${winner.placeId} across ${confirmedMatches.length} match signals`,
        candidateId,
        allMatchesCount: confirmedMatches.length,
      };
    }

    return {
      outcome: 'MATCH_AMBIGUOUS',
      confidence: 'AMBIGUOUS',
      reasons: ['MULTIPLE_CONFLICTING_MATCHES'],
      explain: `Found ${uniquePlaceIds.size} distinct Google places matching candidate with high confidence — cannot choose first blindly`,
      candidateId,
      allMatchesCount: confirmedMatches.length,
    };
  }

  return {
    outcome: 'NO_MATCH',
    confidence: 'NONE',
    reasons: ['NO_CONFIDENT_MATCH'],
    explain: 'No Google place met confident matching criteria (weak name-only / coords-only rejected)',
    candidateId,
    allMatchesCount: 0,
  };
}

// ---------------------------------------------------------------- 4. Stage B Place Details Planning

export function generateGoogleDetailsFingerprint(params: {
  operation: 'PLACE_DETAILS';
  placeId: string;
  fieldMask?: readonly string[] | string[];
  sourceId?: string;
}): string {
  const op = 'PLACE_DETAILS';
  const { placeId } = canonicalizePlaceId(params.placeId);
  const mask = params.fieldMask ? [...params.fieldMask].sort().join(',') : PLACE_DETAILS_WEBSITE_MASK.join(',');
  const src = params.sourceId || 'default';
  const raw = `op:${op}|placeId:${placeId}|mask:${mask}|src:${src}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function planGooglePlaceDetailsWebsiteRequest(params: {
  placeId: string;
  candidateId?: string;
  sourceId?: string;
}): GooglePlaceDetailsWebsitePlan {
  const { placeId: canonicalPlaceId } = canonicalizePlaceId(params.placeId);
  const req = buildPlaceDetailsRequest({
    placeId: canonicalPlaceId,
    useContactFields: false, // Essential only + we specify websiteUri explicitly
  });

  const fieldMask = PLACE_DETAILS_WEBSITE_MASK;
  const fieldMaskString = fieldMask.join(',');
  const sourceId = params.sourceId || 'default';

  const queryFingerprint = generateGoogleDetailsFingerprint({
    operation: 'PLACE_DETAILS',
    placeId: canonicalPlaceId,
    fieldMask,
    sourceId,
  });

  return {
    operation: 'PLACE_DETAILS',
    canonicalPlaceId,
    endpoint: `places/${canonicalPlaceId}`,
    endpointUrl: req.endpointUrl,
    fieldMask,
    fieldMaskString,
    queryFingerprint,
    candidateId: params.candidateId || 'unknown',
  };
}

// ---------------------------------------------------------------- 5. Website URI Normalization

export function normalizeGoogleWebsiteUri(
  websiteUri: string | null | undefined
): { valid: boolean; normalizedUrl?: string; normalizedHost?: string; error?: string } {
  if (!websiteUri || typeof websiteUri !== 'string') {
    return { valid: false, error: 'WEBSITE_URI_EMPTY' };
  }

  const trimmed = websiteUri.trim();
  if (trimmed.length < 4) {
    return { valid: false, error: 'WEBSITE_URI_TOO_SHORT' };
  }

  // Reject invalid characters or scripts
  if (trimmed.includes(' ') || trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return { valid: false, error: 'MALFORMED_WEBSITE_URI' };
  }

  try {
    let urlToParse = trimmed;
    if (!/^https?:\/\//i.test(urlToParse)) {
      urlToParse = `https://${urlToParse}`;
    }

    const parsed = new URL(urlToParse);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'INVALID_PROTOCOL' };
    }

    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname || !hostname.includes('.') || hostname.length < 4) {
      return { valid: false, error: 'INVALID_HOSTNAME' };
    }

    // Strip default ports and trailing slashes for canonical comparison
    const port = (parsed.port && parsed.port !== '80' && parsed.port !== '443') ? `:${parsed.port}` : '';
    const pathname = (parsed.pathname === '/' || !parsed.pathname) ? '' : parsed.pathname.replace(/\/+$/, '');
    const search = parsed.search || '';

    const normalizedUrl = `${parsed.protocol}//${hostname}${port}${pathname}${search}`;
    const normalizedHost = normalizeWebsiteHostForComparison(hostname) || hostname;

    return {
      valid: true,
      normalizedUrl,
      normalizedHost,
    };
  } catch {
    return { valid: false, error: 'URL_PARSE_FAILED' };
  }
}

// ---------------------------------------------------------------- 6. Pure Decision Model

export function decideWebsiteEvidenceOutcome(params: {
  candidate: any;
  googleMatch: IdentityResolutionResult;
  googleWebsiteUri?: string | null;
  websiteVerification?: WebsiteCheckResult | null;
}): WebsiteEvidenceDecision {
  const candidate = params.candidate;
  const candidateId = candidate?.id || 'unknown';
  const googleMatch = params.googleMatch;

  // Gate 1: Check match outcome
  if (googleMatch.outcome !== 'MATCH_CONFIRMED') {
    return {
      outcome: googleMatch.outcome,
      candidateId,
      shouldReject: false,
      shouldQualify: false,
      googlePlaceId: null,
      googleWebsiteUri: null,
      reasons: googleMatch.reasons,
      explain: googleMatch.explain,
    };
  }

  const confirmedPlaceId = googleMatch.confirmedPlaceId!;
  const rawWebsiteUri = params.googleWebsiteUri;

  // Case A: Google Place Details returned NO websiteUri
  if (!rawWebsiteUri || rawWebsiteUri.trim().length === 0) {
    return {
      outcome: 'NO_GOOGLE_WEBSITE_EVIDENCE',
      candidateId,
      shouldReject: false,
      shouldQualify: false, // CRITICAL: Absence of Google website does NOT prove TRUE_NO_SITE
      googlePlaceId: confirmedPlaceId,
      googleWebsiteUri: null,
      normalizedWebsite: null,
      liveStatus: 'NONE',
      reasons: ['GOOGLE_WEBSITE_URI_NULL'],
      explain: 'Google Place Details returned no websiteUri — does NOT prove TRUE_NO_SITE, candidate remains safe',
    };
  }

  // Case B: Google Place Details returned a websiteUri -> Normalize it
  const normWebsite = normalizeGoogleWebsiteUri(rawWebsiteUri);
  if (!normWebsite.valid) {
    return {
      outcome: 'WEBSITE_VERIFICATION_INCONCLUSIVE',
      candidateId,
      shouldReject: false,
      shouldQualify: false,
      googlePlaceId: confirmedPlaceId,
      googleWebsiteUri: rawWebsiteUri,
      normalizedWebsite: null,
      liveStatus: 'INCONCLUSIVE',
      reasons: ['MALFORMED_GOOGLE_WEBSITE_URI', normWebsite.error || 'PARSE_ERROR'],
      explain: `Google websiteUri "${rawWebsiteUri}" was malformed and cannot be trusted as valid website evidence`,
    };
  }

  const verification = params.websiteVerification;

  // If no verification result provided yet (e.g. before live check)
  if (!verification) {
    return {
      outcome: 'WEBSITE_VERIFICATION_INCONCLUSIVE',
      candidateId,
      shouldReject: false,
      shouldQualify: false,
      googlePlaceId: confirmedPlaceId,
      googleWebsiteUri: rawWebsiteUri,
      normalizedWebsite: normWebsite.normalizedUrl,
      liveStatus: 'INCONCLUSIVE',
      reasons: ['WEBSITE_VERIFICATION_NOT_RUN'],
      explain: 'Website verification result pending',
    };
  }

  // Case C: Live website confirmed -> REJECT as existing_website
  if (verification.live === true) {
    return {
      outcome: 'REJECT_EXISTING_WEBSITE',
      candidateId,
      shouldReject: true,
      rejectionReason: 'existing_website',
      shouldQualify: false, // NEVER qualify candidate with live website
      googlePlaceId: confirmedPlaceId,
      googleWebsiteUri: rawWebsiteUri,
      normalizedWebsite: normWebsite.normalizedUrl,
      liveStatus: 'LIVE',
      verificationDetails: verification,
      reasons: ['GOOGLE_WEBSITE_CONFIRMED_LIVE', verification.reason],
      explain: `Google Places supplied website "${normWebsite.normalizedUrl}" was verified LIVE (${verification.reason}) via canonical website verification`,
    };
  }

  // Case D: Live verification failed
  const reason = verification.reason || 'unknown';
  const isNetworkError =
    reason.includes('timeout') ||
    reason.includes('fetch_error') ||
    reason.includes('dns_error') ||
    reason.includes('tls_error') ||
    reason.includes('checks_disabled');

  if (isNetworkError) {
    return {
      outcome: 'WEBSITE_VERIFICATION_INCONCLUSIVE',
      candidateId,
      shouldReject: false,
      shouldQualify: false,
      googlePlaceId: confirmedPlaceId,
      googleWebsiteUri: rawWebsiteUri,
      normalizedWebsite: normWebsite.normalizedUrl,
      liveStatus: 'INCONCLUSIVE',
      verificationDetails: verification,
      reasons: ['WEBSITE_VERIFICATION_ERROR', reason],
      explain: `Website check encountered error (${reason}) — inconclusive, cannot qualify or reject`,
    };
  }

  // Case E: Definitively not live (e.g. status 404, empty body, non-HTML)
  return {
    outcome: 'GOOGLE_WEBSITE_NOT_LIVE',
    candidateId,
    shouldReject: false,
    shouldQualify: false, // CRITICAL: Dead website does NOT automatically qualify candidate
    googlePlaceId: confirmedPlaceId,
    googleWebsiteUri: rawWebsiteUri,
    normalizedWebsite: normWebsite.normalizedUrl,
    liveStatus: 'NOT_LIVE',
    verificationDetails: verification,
    reasons: ['GOOGLE_WEBSITE_NOT_LIVE', reason],
    explain: `Google websiteUri "${normWebsite.normalizedUrl}" was checked and confirmed NOT live (${reason}) — does NOT automatically qualify candidate`,
  };
}

// ---------------------------------------------------------------- 7. Source Evidence Representation

export function buildGoogleWebsiteSourceEvidence(params: {
  sourceId: string | null;
  placeId: string;
  candidate: any;
  decision: WebsiteEvidenceDecision;
  matchedRecord?: NormalizedBusinessRecord | null;
}): SourceEvidence {
  const { placeId } = canonicalizePlaceId(params.placeId);
  const decision = params.decision;
  const cand = params.candidate || {};

  return {
    sourceId: params.sourceId || null,
    sourceType: 'GOOGLE_PLACES',
    externalType: 'place',
    externalId: placeId,
    rawName: params.matchedRecord?.name || cand.companyName || 'Google Place',
    rawEmail: null, // Google does not provide email
    rawPhone: params.matchedRecord?.phone || null,
    rawWebsite: decision.googleWebsiteUri || null,
    address: params.matchedRecord?.address || cand.address || null,
    city: params.matchedRecord?.city || cand.city || null,
    country: params.matchedRecord?.country || cand.country || null,
    postalCode: params.matchedRecord?.postalCode || cand.postcode || null,
    latitude: params.matchedRecord?.latitude != null ? params.matchedRecord.latitude : (cand.latitude != null ? Number(cand.latitude) : null),
    longitude: params.matchedRecord?.longitude != null ? params.matchedRecord.longitude : (cand.longitude != null ? Number(cand.longitude) : null),
    collectedAt: new Date().toISOString(),
    matchReasons: decision.reasons as any,
    confidence: 'STRONG',
  };
}

// ---------------------------------------------------------------- 8. Persistence Orchestrator (Atomic & Idempotent)

export async function persistWebsiteEvidenceOutcome(
  prisma: PrismaClient,
  params: {
    candidateId: string;
    decision: WebsiteEvidenceDecision;
    sourceEvidence?: SourceEvidence | null;
  }
): Promise<{ success: boolean; candidateId: string; updated: boolean; status: string; explain: string }> {
  const { candidateId, decision, sourceEvidence } = params;

  return await prisma.$transaction(async (tx) => {
    const candidate = await tx.leadCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return {
        success: false,
        candidateId,
        updated: false,
        status: 'CANDIDATE_NOT_FOUND',
        explain: `Candidate ${candidateId} not found`,
      };
    }

    // Idempotency check: if candidate is already rejected as existing_website with same placeId
    const existingMeta = (typeof candidate.metadata === 'object' && candidate.metadata !== null) ? candidate.metadata as any : {};
    const existingEvidences: SourceEvidence[] = Array.isArray(existingMeta.sourceEvidence) ? existingMeta.sourceEvidence : [];

    let hasDuplicateEvidence = false;
    if (sourceEvidence) {
      hasDuplicateEvidence = existingEvidences.some(
        ev => ev.sourceType === 'GOOGLE_PLACES' && ev.externalId === sourceEvidence.externalId
      );
    }

    // Build updated sourceEvidence array
    const updatedEvidences = [...existingEvidences];
    if (sourceEvidence && !hasDuplicateEvidence) {
      updatedEvidences.push(sourceEvidence);
    }

    const updatedMeta = {
      ...existingMeta,
      sourceEvidence: updatedEvidences,
      lastGoogleVerificationAt: new Date().toISOString(),
      googleWebsiteVerificationOutcome: decision.outcome,
      googleWebsiteVerifiedLive: decision.liveStatus === 'LIVE',
    };

    if (decision.shouldReject) {
      // If already REJECTED with same reason and evidence, no-op
      if (candidate.status === 'REJECTED' && candidate.rejectionReason === 'existing_website' && hasDuplicateEvidence) {
        return {
          success: true,
          candidateId,
          updated: false,
          status: candidate.status,
          explain: 'Candidate already rejected as existing_website with identical Google evidence (Idempotent)',
        };
      }

      await tx.leadCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'REJECTED',
          rejectionReason: 'existing_website',
          website: candidate.website || decision.normalizedWebsite || decision.googleWebsiteUri || null,
          metadata: updatedMeta,
        },
      });

      return {
        success: true,
        candidateId,
        updated: true,
        status: 'REJECTED',
        explain: `Candidate updated to REJECTED (existing_website): ${decision.explain}`,
      };
    }

    // If not rejected, preserve candidate status but update metadata with evidence
    await tx.leadCandidate.update({
      where: { id: candidateId },
      data: {
        metadata: updatedMeta,
      },
    });

    return {
      success: true,
      candidateId,
      updated: true,
      status: candidate.status,
      explain: `Candidate metadata updated with Google verification outcome (${decision.outcome})`,
    };
  });
}

// ---------------------------------------------------------------- 9. Dry-Run Engine (Zero DB Mutation / Zero Network)

export async function executeCandidateVerificationDryRun(
  prisma: PrismaClient,
  candidateId: string,
  options: {
    sourceId?: string;
    mockSearchResults?: any[];
    mockDetailsResult?: any;
    mockLiveVerification?: WebsiteCheckResult;
  } = {}
): Promise<{
  candidateId: string;
  eligibility: VerificationEligibilityResult;
  searchPlan?: GoogleIdentitySearchPlan | null;
  cacheCheckStageA?: { hit: boolean };
  identityResolution?: IdentityResolutionResult | null;
  detailsPlan?: GooglePlaceDetailsWebsitePlan | null;
  cacheCheckStageB?: { hit: boolean };
  decision?: WebsiteEvidenceDecision | null;
  maxPotentialNetworkRequests: number;
  dryRun: true;
}> {
  if (!candidateId || typeof candidateId !== 'string') {
    throw new Error('CANDIDATE_ID_REQUIRED: candidateId must be provided for dry-run verification');
  }

  const candidate = await prisma.leadCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    throw new Error(`CANDIDATE_NOT_FOUND: Candidate with ID ${candidateId} does not exist`);
  }

  // Step 1: Eligibility check
  const eligibility = evaluateGoogleWebsiteVerificationEligibility(candidate);
  if (!eligibility.eligible) {
    return {
      candidateId,
      eligibility,
      maxPotentialNetworkRequests: 0,
      dryRun: true,
    };
  }

  const sourceId = options.sourceId || 'default';

  // Step 2: Stage A Search Plan
  const searchPlan = planGoogleIdentityResolutionSearch({ candidate, sourceId });
  const cacheCheckStageA = await checkGoogleCache(prisma, sourceId, searchPlan.queryFingerprint, 'TEXT_SEARCH');

  // Step 3: Identity Resolution (using mock if provided)
  let identityResolution: IdentityResolutionResult | null = null;
  let detailsPlan: GooglePlaceDetailsWebsitePlan | null = null;
  let cacheCheckStageB: { hit: boolean } | undefined = undefined;
  let decision: WebsiteEvidenceDecision | null = null;

  if (options.mockSearchResults) {
    identityResolution = resolveCandidateGoogleIdentity({
      candidate,
      rawPlaces: options.mockSearchResults,
      sourceId,
    });

    if (identityResolution.outcome === 'MATCH_CONFIRMED' && identityResolution.confirmedPlaceId) {
      detailsPlan = planGooglePlaceDetailsWebsiteRequest({
        placeId: identityResolution.confirmedPlaceId,
        candidateId,
        sourceId,
      });

      cacheCheckStageB = await checkGoogleCache(prisma, sourceId, detailsPlan.queryFingerprint, 'PLACE_DETAILS');

      decision = decideWebsiteEvidenceOutcome({
        candidate,
        googleMatch: identityResolution,
        googleWebsiteUri: options.mockDetailsResult?.websiteUri || null,
        websiteVerification: options.mockLiveVerification || null,
      });
    }
  }

  return {
    candidateId,
    eligibility,
    searchPlan,
    cacheCheckStageA: { hit: cacheCheckStageA.hit },
    identityResolution,
    detailsPlan,
    cacheCheckStageB,
    decision,
    maxPotentialNetworkRequests: MAX_VERIFICATION_NETWORK_REQUESTS_CAP,
    dryRun: true,
  };
}
