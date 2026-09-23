/**
 * ClientForge CRM — Phase 4C.4A Multi-Source Collection Foundation
 * Source-neutral normalization + cross-source dedup architecture
 * NO Google API calls, NO enrichment calls, NO external provider
 *
 * Canonical invariant:
 * OSM says website=null, Google says website=example.com → candidate is NOT NO_WEBSITE,
 * must enter website verification, if live → REJECTED existing_website
 * TRUE_NO_SITE requires no trusted live website evidence
 */

export type SourceType = 'OVERPASS' | 'GOOGLE_MAPS' | 'GOOGLE_PLACES' | 'CUSTOM';
export type ExternalType = 'node' | 'way' | 'relation' | 'place' | 'google_place' | 'google_maps'; // canonical for Google is 'place' (place_id), 'google_place' retained for backward compat

export interface NormalizedBusinessRecord {
  sourceId: string | null; // DataSource.id
  sourceType: SourceType;
  externalType: ExternalType;
  externalId: string; // OSM id or Google place_id

  name: string; // display name original trimmed
  normalizedName: string; // for matching: lowercase, collapsed whitespace, unicode normalized, suffix stripped conservatively

  email: string | null;
  normalizedEmail: string | null;

  phone: string | null;
  normalizedPhone: string | null; // E.164-like digits only, + prefix preserved if present

  website: string | null; // original
  normalizedWebsiteHost: string | null; // hostname normalized for comparison
  websiteEvidence: string | null; // preserved original if any source has website

  address: string | null;
  normalizedAddress: string | null;

  city: string | null;
  normalizedCity: string | null;

  region: string | null;
  country: string | null;
  countryCode: string | null;
  normalizedCountryCode: string | null;

  postalCode: string | null;
  normalizedPostalCode: string | null;

  latitude: number | null;
  longitude: number | null;

  category: string | null; // LeadCategory.slug

  rawSourceData: any; // full OSM tags or Places raw

  collectedAt: Date;
}

// ---------------------------------------------------------------- Normalization helpers

function trimAndCollapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

export function normalizeBusinessNameForComparison(name: string): string {
  if (!name) return '';
  // Unicode normalization NFKC, trim, collapse whitespace, lowercase
  let n = name.normalize('NFKC');
  n = trimAndCollapseWhitespace(n);
  n = n.toLowerCase();
  // Normalize punctuation carefully: remove surrounding quotes, collapse multiple punctuation, but preserve meaningful
  // Remove leading/trailing punctuation like . , etc? Keep internal
  // Conservative: replace curly quotes, normalize ampersand, remove extra spaces around punctuation
  n = n.replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"');
  // Collapse whitespace again
  n = trimAndCollapseWhitespace(n);
  // Conservative corporate suffix stripping — only strip if well-tested and at end
  // Do NOT strip Dental, Clinic, Hospital, Pets, Opticians etc.
  const suffixes = [
    /\s+ltd\.?$/i,
    /\s+limited$/i,
    /\s+llc\.?$/i,
    /\s+inc\.?$/i,
    /\s+incorporated$/i,
    /\s+corp\.?$/i,
    /\s+corporation$/i,
    /\s+co\.?$/i,
    /\s+pvt\.?\s*ltd\.?$/i,
    /\s+private\s+limited$/i,
    /\s+plc$/i,
    /\s+gmbh$/i,
  ];
  for (const re of suffixes) {
    const prev = n;
    n = n.replace(re, '').trim();
    if (n !== prev) {
      // Only strip one suffix, then break to avoid over-stripping
      break;
    }
  }
  n = trimAndCollapseWhitespace(n);
  return n;
}

export function normalizeEmailForComparison(email: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  // Basic validation remains elsewhere, here just normalization
  return trimmed;
}

export function normalizePhoneForComparison(phone: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  // Remove formatting, preserve + prefix if present
  // Keep digits and leading +
  let normalized = trimmed.replace(/[^\d+]/g, '');
  // Remove duplicate + etc, ensure only leading +
  if (normalized.includes('+')) {
    const plusCount = (normalized.match(/\+/g) || []).length;
    if (plusCount > 1) {
      // Keep only first + if at start, remove others
      normalized = normalized.replace(/\+/g, (match, offset) => (offset === 0 ? '+' : ''));
    }
    // If + not at start, remove? Keep but normalize: if + in middle, remove
    if (!normalized.startsWith('+')) {
      normalized = normalized.replace(/\+/g, '');
    }
  }
  // Remove leading zeros? Preserve country-aware value where possible, do NOT invent country code
  // So we keep as digits, with + if originally present
  // For comparison, we also create digits-only version without + for suffix matching? We'll handle in matching
  if (!normalized) return null;
  // If normalized is just +, invalid
  if (normalized === '+') return null;
  return normalized;
}

export function getDigitsOnlyPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits || null;
}

export function normalizeWebsiteHostForComparison(website: string | null): string | null {
  if (!website) return null;
  let w = website.trim().toLowerCase();
  if (!w) return null;
  // Strip protocol
  w = w.replace(/^https?:\/\//, '');
  w = w.replace(/^ftp:\/\//, '');
  // Strip www when comparing
  w = w.replace(/^www\./, '');
  // Remove path, query, fragment — keep host only for comparison
  const slashIdx = w.indexOf('/');
  if (slashIdx !== -1) w = w.slice(0, slashIdx);
  const qIdx = w.indexOf('?');
  if (qIdx !== -1) w = w.slice(0, qIdx);
  const hashIdx = w.indexOf('#');
  if (hashIdx !== -1) w = w.slice(0, hashIdx);
  // Remove port
  const colonIdx = w.indexOf(':');
  if (colonIdx !== -1) w = w.slice(0, colonIdx);
  // Remove trailing dot
  w = w.replace(/\.$/, '');
  w = w.trim();
  if (!w || w.length < 4 || !w.includes('.')) return null;
  return w;
}

export function normalizeAddressForComparison(address: string | null): string | null {
  if (!address) return null;
  let a = address.normalize('NFKC');
  a = trimAndCollapseWhitespace(a);
  a = a.toLowerCase();
  // Conservative punctuation normalization: remove commas? Keep but normalize spaces around commas
  a = a.replace(/\s*,\s*/g, ', ');
  a = a.replace(/\s+/g, ' ');
  a = a.trim();
  return a || null;
}

export function normalizeCityForComparison(city: string | null): string | null {
  if (!city) return null;
  let c = city.normalize('NFKC');
  c = trimAndCollapseWhitespace(c);
  c = c.toLowerCase();
  return c || null;
}

export function normalizePostalCodeForComparison(postal: string | null): string | null {
  if (!postal) return null;
  let p = postal.trim().toLowerCase().replace(/\s+/g, '');
  return p || null;
}

export function normalizeCountryCodeForComparison(code: string | null): string | null {
  if (!code) return null;
  return code.trim().toUpperCase() || null;
}

// ---------------------------------------------------------------- Haversine distance

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------- Matching signals

export type MatchReason =
  | 'SAME_EXTERNAL_ID'
  | 'EMAIL_EXACT'
  | 'PHONE_EXACT'
  | 'NAME_ADDRESS'
  | 'NAME_POSTAL'
  | 'NAME_GEO'
  | 'NAME_CITY'
  | 'WEAK_NAME_ONLY';

export type MatchConfidence = 'EXACT' | 'STRONG' | 'PROBABLE' | 'NONE';

export interface MatchResult {
  matched: boolean;
  confidence: MatchConfidence;
  reasons: MatchReason[];
  candidateId?: string;
  explain: string;
}

// ---------------------------------------------------------------- Matching logic

export function matchNormalizedRecords(
  incoming: NormalizedBusinessRecord,
  existing: {
    id: string;
    externalId?: string | null;
    externalType?: string | null;
    discoverySourceId?: string | null;
    companyName: string;
    normalizedName?: string | null;
    email?: string | null;
    normalizedEmail?: string | null;
    phone?: string | null;
    normalizedPhone?: string | null;
    address?: string | null;
    normalizedAddress?: string | null;
    city?: string | null;
    normalizedCity?: string | null;
    postalCode?: string | null;
    normalizedPostalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  options?: {
    geoThresholdMeters?: number; // default 75
  }
): MatchResult {
  const geoThreshold = options?.geoThresholdMeters ?? 75;
  const reasons: MatchReason[] = [];

  // Pre-normalize existing if not already normalized
  const existingNormalizedName = existing.normalizedName ?? normalizeBusinessNameForComparison(existing.companyName || '');
  const existingNormalizedEmail = existing.normalizedEmail ?? normalizeEmailForComparison(existing.email || null);
  const existingNormalizedPhone = existing.normalizedPhone ?? normalizePhoneForComparison(existing.phone || null);
  const existingNormalizedPhoneDigits = getDigitsOnlyPhone(existing.normalizedPhone || existing.phone || null);
  const incomingPhoneDigits = getDigitsOnlyPhone(incoming.normalizedPhone || incoming.phone || null);
  const existingNormalizedAddress = existing.normalizedAddress ?? normalizeAddressForComparison(existing.address || null);
  const existingNormalizedCity = existing.normalizedCity ?? normalizeCityForComparison(existing.city || null);
  const existingNormalizedPostal = existing.normalizedPostalCode ?? normalizePostalCodeForComparison(existing.postalCode || null);

  // STRONG 1: same source + same external ID
  if (
    incoming.sourceId &&
    existing.discoverySourceId &&
    incoming.sourceId === existing.discoverySourceId &&
    incoming.externalId &&
    existing.externalId &&
    incoming.externalId === existing.externalId &&
    incoming.externalType &&
    existing.externalType &&
    incoming.externalType === existing.externalType
  ) {
    reasons.push('SAME_EXTERNAL_ID');
    return {
      matched: true,
      confidence: 'EXACT',
      reasons,
      candidateId: existing.id,
      explain: `Same source ${incoming.sourceId} and external ${incoming.externalType}/${incoming.externalId}`,
    };
  }

  // STRONG 2: normalized email exact
  if (incoming.normalizedEmail && existingNormalizedEmail && incoming.normalizedEmail === existingNormalizedEmail) {
    reasons.push('EMAIL_EXACT');
    return {
      matched: true,
      confidence: 'STRONG',
      reasons,
      candidateId: existing.id,
      explain: `Email exact ${incoming.normalizedEmail}`,
    };
  }

  // STRONG 3: normalized phone exact (including digits-only comparison for formatting differences)
  if (incoming.normalizedPhone && existingNormalizedPhone) {
    if (incoming.normalizedPhone === existingNormalizedPhone) {
      reasons.push('PHONE_EXACT');
      return {
        matched: true,
        confidence: 'STRONG',
        reasons,
        candidateId: existing.id,
        explain: `Phone exact ${incoming.normalizedPhone}`,
      };
    }
    // Also compare digits-only for +44 20 1234 5678 vs +442012345678 vs 020 1234 5678 suffix? Use exact digits for now, but also suffix safe?
    // For STRONG, require exact digits match
    if (incomingPhoneDigits && existingNormalizedPhoneDigits && incomingPhoneDigits === existingNormalizedPhoneDigits) {
      reasons.push('PHONE_EXACT');
      return {
        matched: true,
        confidence: 'STRONG',
        reasons,
        candidateId: existing.id,
        explain: `Phone digits exact ${incomingPhoneDigits}`,
      };
    }
  }

  // MEDIUM/COMPOSITE: name + full address
  if (incoming.normalizedName && existingNormalizedName && incoming.normalizedName === existingNormalizedName) {
    // Name matches exactly normalized
    if (incoming.normalizedAddress && existingNormalizedAddress && incoming.normalizedAddress === existingNormalizedAddress) {
      reasons.push('NAME_ADDRESS');
      return {
        matched: true,
        confidence: 'PROBABLE',
        reasons,
        candidateId: existing.id,
        explain: `Name exact + address exact: ${incoming.normalizedName} + ${incoming.normalizedAddress}`,
      };
    }
    // Name + postal code
    if (incoming.normalizedPostalCode && existingNormalizedPostal && incoming.normalizedPostalCode === existingNormalizedPostal) {
      reasons.push('NAME_POSTAL');
      return {
        matched: true,
        confidence: 'PROBABLE',
        reasons,
        candidateId: existing.id,
        explain: `Name exact + postal exact: ${incoming.normalizedName} + ${incoming.normalizedPostalCode}`,
      };
    }
    // Name + geo within threshold
    if (
      incoming.latitude != null &&
      incoming.longitude != null &&
      existing.latitude != null &&
      existing.longitude != null
    ) {
      const dist = haversineDistanceMeters(incoming.latitude, incoming.longitude, existing.latitude, existing.longitude);
      if (dist <= geoThreshold) {
        reasons.push('NAME_GEO');
        return {
          matched: true,
          confidence: 'PROBABLE',
          reasons,
          candidateId: existing.id,
          explain: `Name exact + geo ${dist.toFixed(1)}m <= ${geoThreshold}m: ${incoming.normalizedName}`,
        };
      }
    }
    // Name + city — weaker, but if city matches and name exact, we consider PROBABLE? For safety, require city but still PROBABLE
    if (incoming.normalizedCity && existingNormalizedCity && incoming.normalizedCity === existingNormalizedCity) {
      reasons.push('NAME_CITY');
      return {
        matched: true,
        confidence: 'PROBABLE',
        reasons,
        candidateId: existing.id,
        explain: `Name exact + city exact: ${incoming.normalizedName} + ${incoming.normalizedCity}`,
      };
    }
    // Name only — WEAK, must NEVER auto-merge
    reasons.push('WEAK_NAME_ONLY');
    return {
      matched: false,
      confidence: 'NONE',
      reasons,
      explain: `Weak name-only match: ${incoming.normalizedName} — not sufficient to merge`,
    };
  }

  // No match
  return {
    matched: false,
    confidence: 'NONE',
    reasons: [],
    explain: 'No matching signals',
  };
}

// ---------------------------------------------------------------- Auto-merge policy

export type AutoMergeDecision = {
  shouldAutoMerge: boolean;
  confidence: MatchConfidence;
  reasons: MatchReason[];
  explain: string;
};

export function decideAutoMerge(match: MatchResult): AutoMergeDecision {
  if (!match.matched) {
    return { shouldAutoMerge: false, confidence: match.confidence, reasons: match.reasons, explain: `No match — ${match.explain}` };
  }
  if (match.confidence === 'EXACT') {
    return { shouldAutoMerge: true, confidence: 'EXACT', reasons: match.reasons, explain: `EXACT auto-merge eligible: ${match.reasons.join(',')}` };
  }
  if (match.confidence === 'STRONG') {
    return { shouldAutoMerge: true, confidence: 'STRONG', reasons: match.reasons, explain: `STRONG auto-merge eligible: ${match.reasons.join(',')}` };
  }
  if (match.confidence === 'PROBABLE') {
    // For this phase, PROBABLE should NOT automatically merge unless additional supporting signal exists
    // Prefer false duplicate candidate over destructive wrong merge
    return {
      shouldAutoMerge: false,
      confidence: 'PROBABLE',
      reasons: match.reasons,
      explain: `PROBABLE not auto-merged in Phase 4C.4A — requires additional signal: ${match.reasons.join(',')}`,
    };
  }
  return { shouldAutoMerge: false, confidence: match.confidence, reasons: match.reasons, explain: `Not auto-merge eligible: ${match.explain}` };
}

// ---------------------------------------------------------------- Source provenance — can existing JSON metadata support multi-source?

// Desired conceptual evidence preserved in LeadCandidate.metadata and rawTags
// We will store sourceEvidence array in metadata without schema change

export interface SourceEvidence {
  sourceId: string | null;
  sourceType: SourceType;
  externalType: ExternalType;
  externalId: string;
  rawName: string;
  rawEmail: string | null;
  rawPhone: string | null;
  rawWebsite: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  collectedAt: string; // ISO
  matchReasons?: MatchReason[];
  confidence?: MatchConfidence;
}

export function buildSourceEvidence(record: NormalizedBusinessRecord, matchReasons?: MatchReason[], confidence?: MatchConfidence): SourceEvidence {
  return {
    sourceId: record.sourceId,
    sourceType: record.sourceType,
    externalType: record.externalType,
    externalId: record.externalId,
    rawName: record.name,
    rawEmail: record.email,
    rawPhone: record.phone,
    rawWebsite: record.website,
    address: record.address,
    city: record.city,
    country: record.country,
    postalCode: record.postalCode,
    latitude: record.latitude,
    longitude: record.longitude,
    collectedAt: record.collectedAt.toISOString(),
    matchReasons,
    confidence,
  };
}

// ---------------------------------------------------------------- Safe field merge rules

export interface MergeResult {
  canonicalChanges: Partial<{
    companyName: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  evidenceChanges: {
    newEvidence: SourceEvidence;
    allEvidence: SourceEvidence[];
  };
  qualificationRecheckRequired: boolean;
  reasons: string[];
}

/**
 * Pure/testable merge function — does NOT mutate DB
 * mergeBusinessEvidence(existingCandidate, incomingRecord)
 */
export function mergeBusinessEvidence(
  existingCandidate: {
    id: string;
    companyName: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
    metadata?: any;
    rawTags?: any;
  },
  incomingRecord: NormalizedBusinessRecord,
  matchResult?: MatchResult
): MergeResult {
  const reasons: string[] = [];
  const canonicalChanges: MergeResult['canonicalChanges'] = {};
  let qualificationRecheckRequired = false;

  // EMAIL: existing valid email should not be replaced by null
  if (incomingRecord.email && !existingCandidate.email) {
    canonicalChanges.email = incomingRecord.email;
    reasons.push('email_enriched_from_null');
    qualificationRecheckRequired = true;
  } else if (incomingRecord.email && existingCandidate.email) {
    // If existing email present, do not overwrite unless incoming is more complete? For safety, keep existing
    // But if normalized same, no change
    if (normalizeEmailForComparison(incomingRecord.email) !== normalizeEmailForComparison(existingCandidate.email)) {
      reasons.push('email_conflict_kept_existing');
    }
  } else if (!incomingRecord.email && existingCandidate.email) {
    reasons.push('email_null_does_not_overwrite');
  }

  // PHONE: existing phone should not be replaced by null
  if (incomingRecord.phone && !existingCandidate.phone) {
    canonicalChanges.phone = incomingRecord.phone;
    reasons.push('phone_enriched_from_null');
  } else if (!incomingRecord.phone && existingCandidate.phone) {
    reasons.push('phone_null_does_not_overwrite');
  }

  // WEBSITE: safety-critical — if ANY trusted source provides website, do not erase it because another source has none
  // Candidate must pass website verification, if example.com live → REJECT existing_website
  if (incomingRecord.website && !existingCandidate.website) {
    canonicalChanges.website = incomingRecord.website;
    reasons.push('website_enriched_from_null');
    qualificationRecheckRequired = true;
  } else if (incomingRecord.website && existingCandidate.website) {
    // Keep existing unless incoming has more complete? For safety, keep existing if both present
    // But if normalized hosts differ, preserve evidence and flag recheck
    const existingHost = normalizeWebsiteHostForComparison(existingCandidate.website);
    const incomingHost = incomingRecord.normalizedWebsiteHost;
    if (existingHost && incomingHost && existingHost !== incomingHost) {
      reasons.push('website_conflict_both_present_kept_existing');
      qualificationRecheckRequired = true;
    }
  } else if (!incomingRecord.website && existingCandidate.website) {
    reasons.push('website_null_does_not_overwrite');
  }

  // NAME: preserve canonical/display name unless clearly better source data — for now keep existing
  if (existingCandidate.companyName !== incomingRecord.name) {
    // If existing name is shorter and incoming longer and contains existing, maybe better? For safety keep existing
    reasons.push('name_diff_kept_existing');
  }

  // ADDRESS: prefer more complete non-empty address
  if (incomingRecord.address && !existingCandidate.address) {
    canonicalChanges.address = incomingRecord.address;
    reasons.push('address_enriched_from_null');
  } else if (incomingRecord.address && existingCandidate.address) {
    if (incomingRecord.address.length > existingCandidate.address.length) {
      // Prefer more complete? But for safety, keep existing unless clearly more complete and same city?
      // For this phase, keep existing to avoid destructive overwrite, but record reason
      reasons.push('address_both_present_kept_existing_more_complete_incoming_noted');
    }
  }

  // CITY: similar
  if (incomingRecord.city && !existingCandidate.city) {
    canonicalChanges.city = incomingRecord.city;
    reasons.push('city_enriched_from_null');
  }

  // COUNTRY
  if (incomingRecord.country && !existingCandidate.country) {
    canonicalChanges.country = incomingRecord.country;
    reasons.push('country_enriched_from_null');
  }

  // POSTAL
  if (incomingRecord.postalCode && !existingCandidate.postcode) {
    canonicalChanges.postalCode = incomingRecord.postalCode;
    reasons.push('postal_enriched_from_null');
  }

  // COORDINATES: preserve source evidence even if canonical coordinate chosen — keep existing for safety
  if (incomingRecord.latitude != null && incomingRecord.longitude != null) {
    if (existingCandidate.latitude == null || existingCandidate.longitude == null) {
      canonicalChanges.latitude = incomingRecord.latitude;
      canonicalChanges.longitude = incomingRecord.longitude;
      reasons.push('coordinates_enriched_from_null');
    } else {
      reasons.push('coordinates_both_present_kept_existing');
    }
  }

  // Source evidence merge
  const existingMetadata = existingCandidate.metadata || {};
  const existingEvidence: SourceEvidence[] = Array.isArray(existingMetadata.sourceEvidence)
    ? existingMetadata.sourceEvidence
    : existingMetadata.sourceEvidence
      ? [existingMetadata.sourceEvidence]
      : [];

  const newEvidence = buildSourceEvidence(incomingRecord, matchResult?.reasons, matchResult?.confidence);
  const allEvidence = [...existingEvidence, newEvidence];

  // If website evidence newly added, qualification recheck required
  if (canonicalChanges.website) {
    qualificationRecheckRequired = true;
  }
  if (canonicalChanges.email) {
    qualificationRecheckRequired = true;
  }

  return {
    canonicalChanges,
    evidenceChanges: { newEvidence, allEvidence },
    qualificationRecheckRequired,
    reasons,
  };
}

// ---------------------------------------------------------------- Website safety invariant

/**
 * Critical invariant:
 * OSM says website=null, Google says website=example.com → candidate is NOT NO_WEBSITE
 * It must enter existing website verification. If example.com live → REJECT existing_website.
 * Never interpret "one source has no website" as "business has no website."
 * TRUE_NO_SITE requires no trusted live website evidence.
 */
export function hasTrustedWebsiteEvidence(candidate: { website: string | null; metadata?: any }): boolean {
  if (candidate.website) return true;
  const evidence: SourceEvidence[] = candidate.metadata?.sourceEvidence || [];
  return evidence.some(e => !!e.rawWebsite);
}

export function getWebsiteEvidenceList(candidate: { website: string | null; metadata?: any }): string[] {
  const list: string[] = [];
  if (candidate.website) list.push(candidate.website);
  const evidence: SourceEvidence[] = candidate.metadata?.sourceEvidence || [];
  for (const ev of evidence) {
    if (ev.rawWebsite) list.push(ev.rawWebsite);
  }
  return Array.from(new Set(list));
}

// ---------------------------------------------------------------- Email safety

export function shouldRecheckEmailDomainLiveWebsite(email: string | null, existingEmail: string | null): boolean {
  if (!email) return false;
  if (existingEmail && normalizeEmailForComparison(email) === normalizeEmailForComparison(existingEmail)) return false;
  return true;
}

// ---------------------------------------------------------------- Lead dedup helpers

export function normalizeLeadForDedup(lead: { email?: string | null; phone?: string | null; companyName?: string; city?: string | null }) {
  return {
    normalizedEmail: normalizeEmailForComparison(lead.email || null),
    normalizedPhone: normalizePhoneForComparison(lead.phone || null),
    normalizedPhoneDigits: getDigitsOnlyPhone(lead.phone || null),
    normalizedName: normalizeBusinessNameForComparison(lead.companyName || ''),
    normalizedCity: normalizeCityForComparison(lead.city || null),
  };
}

// ---------------------------------------------------------------- Source metrics architecture

export type SourceMetrics = {
  source: string; // DataSource.name or type
  sourceType: SourceType;
  rawDiscovered: number;
  normalized: number;
  newCandidates: number;
  matchedExisting: number;
  rejectedWebsite: number;
  noEmail: number;
  qualified: number;
  duplicate: number;
  errors: number;
};

export function createEmptySourceMetrics(source: string, sourceType: SourceType): SourceMetrics {
  return {
    source,
    sourceType,
    rawDiscovered: 0,
    normalized: 0,
    newCandidates: 0,
    matchedExisting: 0,
    rejectedWebsite: 0,
    noEmail: 0,
    qualified: 0,
    duplicate: 0,
    errors: 0,
  };
}

// ---------------------------------------------------------------- Factory from OSM element (for collector integration)

export function normalizedFromOsmElement(
  el: { id: number | string; type: string; tags?: any; lat?: number; lon?: number; center?: { lat: number; lon: number } },
  categorySlug: string,
  location: { city: string; countryCode?: string; country?: string },
  sourceId: string | null
): NormalizedBusinessRecord | null {
  const tags = el.tags || {};
  const name = (tags.name || '').trim();
  if (!name || name.length < 3 || name.length > 200) return null;

  const website = (tags.website || tags['contact:website'] || tags.url || tags['contact:url'] || tags['website:en'] || '').trim() || null;
  const email = (tags.email || tags['contact:email'] || '').trim() || null;
  const phone = (tags.phone || tags['contact:phone'] || '').trim() || null;
  const address = (() => {
    const parts: string[] = [];
    if (tags['addr:housenumber'] && tags['addr:street']) parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
    else if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    return parts.join(', ') || tags.address || location.city || null;
  })();
  const city = (tags['addr:city'] || location.city || '').slice(0, 100) || null;
  const country = location.countryCode || location.country || null;
  const postcode = (tags['addr:postcode'] || '').slice(0, 20) || null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
    latitude = el.lat;
    longitude = el.lon;
  } else if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') {
    latitude = el.center.lat;
    longitude = el.center.lon;
  } else if (typeof (el as any).lat === 'number' && typeof (el as any).lon === 'number') {
    latitude = (el as any).lat;
    longitude = (el as any).lon;
  }

  const now = new Date();
  return {
    sourceId,
    sourceType: 'OVERPASS',
    externalType: el.type as ExternalType,
    externalId: String(el.id),
    name: name.slice(0, 200),
    normalizedName: normalizeBusinessNameForComparison(name),
    email: email?.slice(0, 150) || null,
    normalizedEmail: normalizeEmailForComparison(email),
    phone: phone?.slice(0, 40) || null,
    normalizedPhone: normalizePhoneForComparison(phone),
    website: website?.slice(0, 200) || null,
    normalizedWebsiteHost: normalizeWebsiteHostForComparison(website),
    websiteEvidence: website,
    address: address?.slice(0, 300) || null,
    normalizedAddress: normalizeAddressForComparison(address),
    city,
    normalizedCity: normalizeCityForComparison(city),
    region: null,
    country,
    countryCode: location.countryCode || null,
    normalizedCountryCode: normalizeCountryCodeForComparison(location.countryCode || null),
    postalCode: postcode,
    normalizedPostalCode: normalizePostalCodeForComparison(postcode),
    latitude,
    longitude,
    category: categorySlug,
    rawSourceData: tags,
    collectedAt: now,
  };
}

// Future Google adapter contract — same NormalizedBusinessRecord
export function normalizedFromGooglePlace(
  place: {
    place_id: string;
    name: string;
    formatted_address?: string;
    vicinity?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    email?: string; // Google Places doesn't return email, but future secondary might
    geometry?: { location: { lat: number; lng: number } };
    address_components?: any[];
  },
  categorySlug: string,
  sourceId: string | null
): NormalizedBusinessRecord | null {
  const name = (place.name || '').trim();
  if (!name) return null;
  const address = place.formatted_address || place.vicinity || null;
  const phone = place.formatted_phone_number || place.international_phone_number || null;
  const website = place.website || null;
  const lat = place.geometry?.location?.lat ?? null;
  const lng = place.geometry?.location?.lng ?? null;

  // Extract city, postal, country from address_components if available
  let city: string | null = null;
  let postal: string | null = null;
  let country: string | null = null;
  let countryCode: string | null = null;
  let region: string | null = null;
  if (place.address_components) {
    for (const comp of place.address_components) {
      if (comp.types?.includes('locality')) city = comp.long_name || city;
      if (comp.types?.includes('postal_code')) postal = comp.long_name || postal;
      if (comp.types?.includes('country')) {
        country = comp.long_name || country;
        countryCode = comp.short_name || countryCode;
      }
      if (comp.types?.includes('administrative_area_level_1')) region = comp.long_name || region;
    }
  }

  const now = new Date();
  return {
    sourceId,
    sourceType: 'GOOGLE_PLACES',
    externalType: 'place', // canonical per 4C.4B.1: sourceType already identifies Google, externalType=place externalId=place_id
    externalId: place.place_id,
    name: name.slice(0, 200),
    normalizedName: normalizeBusinessNameForComparison(name),
    email: place.email?.slice(0, 150) || null,
    normalizedEmail: normalizeEmailForComparison(place.email || null),
    phone: phone?.slice(0, 40) || null,
    normalizedPhone: normalizePhoneForComparison(phone),
    website: website?.slice(0, 200) || null,
    normalizedWebsiteHost: normalizeWebsiteHostForComparison(website),
    websiteEvidence: website,
    address: address?.slice(0, 300) || null,
    normalizedAddress: normalizeAddressForComparison(address),
    city,
    normalizedCity: normalizeCityForComparison(city),
    region,
    country,
    countryCode,
    normalizedCountryCode: normalizeCountryCodeForComparison(countryCode),
    postalCode: postal,
    normalizedPostalCode: normalizePostalCodeForComparison(postal),
    latitude: lat,
    longitude: lng,
    category: categorySlug,
    rawSourceData: place,
    collectedAt: now,
  };
}
