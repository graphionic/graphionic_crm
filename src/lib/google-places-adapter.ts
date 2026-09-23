/**
 * ClientForge CRM — Phase 4C.4C.1 Google Places Adapter Contract (CORRECTED 4C.4C.1.1)
 * ZERO REAL GOOGLE REQUESTS — adapter CONTRACT only
 *
 * Official API selected: Places API (New)
 * Endpoints (official https://developers.google.com/maps/documentation/places/web-service):
 * - Text Search (New): POST https://places.googleapis.com/v1/places:searchText
 * - Nearby Search (New): POST https://places.googleapis.com/v1/places:searchNearby
 * - Place Details (New): GET https://places.googleapis.com/v1/places/{PLACE_ID} — bare place ID, NOT places/PLACE_ID in URL path double
 *
 * Auth: X-Goog-Api-Key header, X-Goog-FieldMask required, no default, wildcard * discouraged
 * Pagination: Text Search returns nextPageToken at top level, field mask must include nextPageToken to receive it (example: places.id,nextPageToken)
 * Place identifier: resource name places/PLACE_ID, but URL uses bare PLACE_ID, canonical externalId is bare PLACE_ID (ChIJ123)
 *
 * Billing: Field mask determines SKU — billed at highest SKU. Minimize fields.
 * Email: Places API does NOT return business email.
 */

import { getGoogleCredentialStatus } from './google-credential-reader';

// ---------------------------------------------------------------- Field Mask Constants — centrally controlled, no wildcard
// Staged masks for cost optimization — cheapest sufficient request shape

// ID-only: cheapest discovery, only place ID + resource name + pagination token
// Official Text Search Essentials IDs Only SKU triggers: places.id, places.name, places.attributions, nextPageToken
// For our objective, we need place ID and pagination token
export const SEARCH_ID_ONLY_MASK = [
  'places.id',
  'places.name',
  'nextPageToken',
] as const;

// Discovery essential — usable baseline (Pro SKU): displayName, formattedAddress, location, businessStatus, types, primaryType, id, name
export const SEARCH_DISCOVERY_MASK = [
  'places.id',
  'places.name',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.businessStatus',
] as const;

// Legacy name kept for backward compat
export const DISCOVERY_FIELD_MASK = SEARCH_DISCOVERY_MASK;

// Contact fields — isolated to Enterprise SKU (cost boundary)
export const CONTACT_FIELD_MASK = [
  'places.websiteUri',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
] as const;

// Discovery + contact combined (Enterprise) — only when website/phone justified
export const SEARCH_CONTACT_MASK = [
  ...SEARCH_DISCOVERY_MASK,
  ...CONTACT_FIELD_MASK,
] as const;

// Legacy aliases
export const TEXT_SEARCH_ESSENTIAL_MASK = SEARCH_DISCOVERY_MASK;
export const TEXT_SEARCH_CONTACT_MASK = SEARCH_CONTACT_MASK;
export const NEARBY_SEARCH_MASK = SEARCH_DISCOVERY_MASK;
export const NEARBY_SEARCH_CONTACT_MASK = SEARCH_CONTACT_MASK;

// Place Details — returns single Place, so masks use bare field names NOT places.* prefix
// Essential: id, name, displayName, formattedAddress, location, types, primaryType, businessStatus, addressComponents
export const PLACE_DETAILS_ESSENTIAL_MASK = [
  'id',
  'name',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'primaryType',
  'businessStatus',
  'addressComponents',
] as const;

// Contact for Place Details — Enterprise SKU
export const PLACE_DETAILS_CONTACT_MASK = [
  'websiteUri',
  'internationalPhoneNumber',
  'nationalPhoneNumber',
] as const;

export const PLACE_DETAILS_FULL_MASK = [
  ...PLACE_DETAILS_ESSENTIAL_MASK,
  ...PLACE_DETAILS_CONTACT_MASK,
] as const;

// Legacy alias
export const DETAIL_FIELD_MASK = PLACE_DETAILS_FULL_MASK;
export const PLACE_DETAILS_MASK = PLACE_DETAILS_FULL_MASK;

// Validation: no wildcard
export function validateNoWildcardFieldMask(mask: string[] | string): boolean {
  const str = Array.isArray(mask) ? mask.join(',') : mask;
  return !str.includes('*');
}

// Helpers to check prefix usage
export function isSearchMask(mask: string[]): boolean {
  // Search masks should use places.* paths and optionally nextPageToken at top level
  return mask.every(f => f.startsWith('places.') || f === 'nextPageToken');
}

export function isDetailsMask(mask: string[]): boolean {
  // Details masks should NOT use places.* prefix
  return mask.every(f => !f.startsWith('places.'));
}

// ---------------------------------------------------------------- Reservation Token — opaque context from guardrails

export interface GoogleRequestReservation {
  usageId: string;
  sourceId: string;
  collectorRunId: string;
  operation: 'TEXT_SEARCH' | 'NEARBY_SEARCH' | 'PLACE_DETAILS' | 'GEOCODING';
  queryFingerprint: string;
  reservedAt: Date;
}

export function validateReservationContext(
  reservation: GoogleRequestReservation | null | undefined,
  expected: {
    sourceId: string;
    collectorRunId: string;
    operation: string;
    queryFingerprint: string;
  }
): { valid: boolean; error?: string } {
  if (!reservation) return { valid: false, error: 'RESERVATION_REQUIRED' };
  if (!reservation.usageId) return { valid: false, error: 'INVALID_RESERVATION_MISSING_USAGE_ID' };
  if (reservation.sourceId !== expected.sourceId) return { valid: false, error: 'SOURCE_MISMATCH' };
  if (reservation.collectorRunId !== expected.collectorRunId) return { valid: false, error: 'RUN_MISMATCH' };
  if (reservation.operation !== expected.operation) return { valid: false, error: 'OPERATION_MISMATCH' };
  if (reservation.queryFingerprint !== expected.queryFingerprint) return { valid: false, error: 'FINGERPRINT_MISMATCH' };
  return { valid: true };
}

// ---------------------------------------------------------------- Request Builders — PURE, no HTTP, no API key in snapshots

export interface GooglePlacesRequest {
  method: 'POST' | 'GET';
  endpoint: string;
  endpointUrl: string;
  headers: Record<string, string>;
  fieldMask: string;
  body?: any;
  queryParams?: Record<string, string>;
  operation: 'TEXT_SEARCH' | 'NEARBY_SEARCH' | 'PLACE_DETAILS';
  pagination?: {
    pageToken?: string;
    pageSize?: number;
    pageCap?: number;
  };
}

// Place ID canonicalization — bare ID is canonical
// Input handling contract (4C.4C.1.1): normalize places/ChIJ123 → ChIJ123, reject path injection
export function canonicalizePlaceId(input: string): { placeId: string; wasNormalized: boolean } {
  if (!input || typeof input !== 'string') throw new Error('INVALID_REQUEST: placeId required');
  let trimmed = input.trim();
  if (trimmed.length === 0) throw new Error('INVALID_REQUEST: placeId required');

  // Reject path injection attempts
  if (trimmed.includes('..') || trimmed.includes('//') || trimmed.includes('\\')) {
    throw new Error('INVALID_REQUEST: placeId contains invalid path sequence');
  }

  // If resource-name form places/ChIJ123, extract bare ID
  let wasNormalized = false;
  if (trimmed.startsWith('places/')) {
    const parts = trimmed.split('/');
    if (parts.length !== 2 || !parts[1]) throw new Error('INVALID_REQUEST: invalid resource name format');
    const bare = parts[1];
    // Validate bare ID does not contain slashes or spaces
    if (bare.includes('/') || bare.includes(' ') || bare.includes('?') || bare.includes('#')) {
      throw new Error('INVALID_REQUEST: placeId contains invalid characters');
    }
    trimmed = bare;
    wasNormalized = true;
  }

  // After normalization, validate bare ID format — must not contain invalid chars
  if (trimmed.includes('/') || trimmed.includes(' ') || trimmed.includes('?') || trimmed.includes('#') || trimmed.includes('&') || trimmed.includes('%2F')) {
    throw new Error('INVALID_REQUEST: placeId contains invalid characters');
  }

  // Basic length check — place IDs are typically 20+ chars starting with ChIJ, but allow broader for test
  if (trimmed.length < 5 || trimmed.length > 200) {
    throw new Error('INVALID_REQUEST: placeId length invalid');
  }

  return { placeId: trimmed, wasNormalized };
}

export function buildTextSearchRequest(params: {
  textQuery: string;
  pageSize?: number;
  pageToken?: string;
  locationBias?: { circle: { center: { latitude: number; longitude: number }; radius: number } };
  locationRestriction?: { rectangle: { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } } };
  includedType?: string;
  languageCode?: string;
  regionCode?: string;
  useContactFields?: boolean;
  useIdOnly?: boolean; // cheapest: only ID + nextPageToken
}): GooglePlacesRequest {
  if (!params.textQuery || params.textQuery.trim().length === 0) {
    throw new Error('INVALID_REQUEST: textQuery required');
  }

  let fieldMaskArray: readonly string[];
  if (params.useIdOnly) {
    fieldMaskArray = SEARCH_ID_ONLY_MASK;
  } else if (params.useContactFields) {
    fieldMaskArray = TEXT_SEARCH_CONTACT_MASK;
  } else {
    fieldMaskArray = TEXT_SEARCH_ESSENTIAL_MASK;
  }

  if (!validateNoWildcardFieldMask(fieldMaskArray as any)) {
    throw new Error('FIELD_MASK_WILDCARD_NOT_ALLOWED');
  }

  // Validate prefix: search masks must use places.* or nextPageToken
  if (!isSearchMask([...fieldMaskArray])) {
    throw new Error('INVALID_FIELD_MASK_PREFIX: Text Search must use places.* paths and nextPageToken');
  }

  const body: any = {
    textQuery: params.textQuery.trim(),
  };
  if (params.pageSize) body.pageSize = params.pageSize;
  if (params.pageToken) body.pageToken = params.pageToken;
  if (params.locationBias) body.locationBias = params.locationBias;
  if (params.locationRestriction) body.locationRestriction = params.locationRestriction;
  if (params.includedType) body.includedType = params.includedType;
  if (params.languageCode) body.languageCode = params.languageCode;
  if (params.regionCode) body.regionCode = params.regionCode;

  return {
    method: 'POST',
    endpoint: 'places:searchText',
    endpointUrl: 'https://places.googleapis.com/v1/places:searchText',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': fieldMaskArray.join(','),
    },
    fieldMask: fieldMaskArray.join(','),
    body,
    operation: 'TEXT_SEARCH',
    pagination: {
      pageToken: params.pageToken,
      pageSize: params.pageSize,
      pageCap: 3,
    },
  };
}

export function buildNearbySearchRequest(params: {
  locationRestriction: { circle: { center: { latitude: number; longitude: number }; radius: number } };
  includedTypes?: string[];
  excludedTypes?: string[];
  maxResultCount?: number;
  rankPreference?: 'DISTANCE' | 'POPULARITY';
  languageCode?: string;
  regionCode?: string;
  useContactFields?: boolean;
  useIdOnly?: boolean;
}): GooglePlacesRequest {
  if (!params.locationRestriction) {
    throw new Error('INVALID_REQUEST: locationRestriction required for Nearby Search');
  }

  let fieldMaskArray: readonly string[];
  if (params.useIdOnly) {
    fieldMaskArray = SEARCH_ID_ONLY_MASK;
  } else if (params.useContactFields) {
    fieldMaskArray = NEARBY_SEARCH_CONTACT_MASK;
  } else {
    fieldMaskArray = NEARBY_SEARCH_MASK;
  }

  if (!validateNoWildcardFieldMask(fieldMaskArray as any)) {
    throw new Error('FIELD_MASK_WILDCARD_NOT_ALLOWED');
  }

  if (!isSearchMask([...fieldMaskArray])) {
    throw new Error('INVALID_FIELD_MASK_PREFIX: Nearby Search must use places.* paths and nextPageToken');
  }

  const body: any = {
    locationRestriction: params.locationRestriction,
  };
  if (params.includedTypes) body.includedTypes = params.includedTypes;
  if (params.excludedTypes) body.excludedTypes = params.excludedTypes;
  if (params.maxResultCount) body.maxResultCount = params.maxResultCount;
  if (params.rankPreference) body.rankPreference = params.rankPreference;
  if (params.languageCode) body.languageCode = params.languageCode;
  if (params.regionCode) body.regionCode = params.regionCode;

  return {
    method: 'POST',
    endpoint: 'places:searchNearby',
    endpointUrl: 'https://places.googleapis.com/v1/places:searchNearby',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': fieldMaskArray.join(','),
    },
    fieldMask: fieldMaskArray.join(','),
    body,
    operation: 'NEARBY_SEARCH',
    pagination: {
      pageSize: params.maxResultCount,
      pageCap: 3,
    },
  };
}

export function buildPlaceDetailsRequest(params: {
  placeId: string;
  languageCode?: string;
  regionCode?: string;
  useContactFields?: boolean; // if false, essential only; if true, includes contact
}): GooglePlacesRequest {
  if (!params.placeId || params.placeId.trim().length === 0) {
    throw new Error('INVALID_REQUEST: placeId required');
  }

  // Canonicalize — normalize places/ChIJ123 → ChIJ123, reject injection, encode safely
  const { placeId: canonicalId } = canonicalizePlaceId(params.placeId);

  // URL encoding for path component — encode but keep safe chars
  const encodedId = encodeURIComponent(canonicalId);

  let fieldMaskArray: readonly string[];
  if (params.useContactFields === false) {
    fieldMaskArray = PLACE_DETAILS_ESSENTIAL_MASK;
  } else {
    // Default includes contact for full detail, but caller can choose essential only for cheaper SKU
    fieldMaskArray = PLACE_DETAILS_FULL_MASK;
  }

  if (!validateNoWildcardFieldMask(fieldMaskArray as any)) {
    throw new Error('FIELD_MASK_WILDCARD_NOT_ALLOWED');
  }

  // Validate prefix: Place Details must NOT use places.* prefix
  if (!isDetailsMask([...fieldMaskArray])) {
    throw new Error('INVALID_FIELD_MASK_PREFIX: Place Details must NOT use places.* prefix, use bare field names like id,displayName');
  }

  const queryParams: Record<string, string> = {};
  if (params.languageCode) queryParams.languageCode = params.languageCode;
  if (params.regionCode) queryParams.regionCode = params.regionCode;

  // CORRECTED URL: https://places.googleapis.com/v1/places/{PLACE_ID} — bare ID, single /places/
  // Before fix: https://places.googleapis.com/v1/places/places/{placeId} was WRONG
  return {
    method: 'GET',
    endpoint: `places/${canonicalId}`, // canonical endpoint identifier — bare ID
    endpointUrl: `https://places.googleapis.com/v1/places/${encodedId}`, // CORRECTED: single /places/
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': fieldMaskArray.join(','),
    },
    fieldMask: fieldMaskArray.join(','),
    queryParams,
    operation: 'PLACE_DETAILS',
  };
}

// ---------------------------------------------------------------- Transport Interface — Mock vs Real

export interface GoogleTransportRequest {
  request: GooglePlacesRequest;
  reservation: GoogleRequestReservation;
}

export interface GoogleTransportResponse {
  status: 'SUCCESS' | 'NO_RESULT' | 'FAILED';
  data?: any;
  error?: {
    classification: 'AUTH_ERROR' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'INVALID_REQUEST' | 'NETWORK_ERROR' | 'UNKNOWN';
    message: string;
    httpStatus?: number;
  };
  latencyMs?: number;
}

export interface GoogleTransport {
  send(req: GoogleTransportRequest): Promise<GoogleTransportResponse>;
}

// Mock transport — deterministic fixtures, no external HTTP
export class MockGoogleTransport implements GoogleTransport {
  private fixtures: Map<string, any>;

  constructor() {
    this.fixtures = new Map();
    this.fixtures.set('text_search_success', {
      places: [
        {
          id: 'ChIJ1234567890',
          name: 'places/ChIJ1234567890',
          displayName: { text: 'Bright Smile Dental', languageCode: 'en' },
          formattedAddress: '10 High Street, London, UK',
          location: { latitude: 51.5, longitude: -0.12 },
          types: ['dentist', 'health', 'point_of_interest', 'establishment'],
          primaryType: 'dentist',
          businessStatus: 'OPERATIONAL',
          websiteUri: 'https://brightsmile.co.uk',
          internationalPhoneNumber: '+44 20 1234 5678',
        },
        {
          id: 'ChIJ0987654321',
          name: 'places/ChIJ0987654321',
          displayName: { text: 'City Dental Clinic', languageCode: 'en' },
          formattedAddress: '20 Main Road, London, UK',
          location: { latitude: 51.51, longitude: -0.11 },
          types: ['dentist', 'health'],
          primaryType: 'dentist',
          businessStatus: 'OPERATIONAL',
        },
      ],
      nextPageToken: 'nextPageToken123',
    });

    this.fixtures.set('text_search_empty', {
      places: [],
    });

    this.fixtures.set('text_search_id_only', {
      places: [
        { id: 'ChIJ1234567890', name: 'places/ChIJ1234567890' },
        { id: 'ChIJ0987654321', name: 'places/ChIJ0987654321' },
      ],
      nextPageToken: 'nextPageToken123',
    });

    this.fixtures.set('nearby_search_success', {
      places: [
        {
          id: 'ChIJ1111111111',
          name: 'places/ChIJ1111111111',
          displayName: { text: 'Nearby Dental Care', languageCode: 'en' },
          formattedAddress: '5 Nearby Lane, London',
          location: { latitude: 51.5001, longitude: -0.1201 },
          types: ['dentist'],
          primaryType: 'dentist',
          businessStatus: 'OPERATIONAL',
          websiteUri: 'https://nearbydental.co.uk',
        },
      ],
    });

    this.fixtures.set('place_details_success', {
      id: 'ChIJ1234567890',
      name: 'places/ChIJ1234567890',
      displayName: { text: 'Bright Smile Dental', languageCode: 'en' },
      formattedAddress: '10 High Street, London, UK',
      location: { latitude: 51.5, longitude: -0.12 },
      types: ['dentist'],
      primaryType: 'dentist',
      businessStatus: 'OPERATIONAL',
      websiteUri: 'https://brightsmile.co.uk',
      internationalPhoneNumber: '+44 20 1234 5678',
      nationalPhoneNumber: '020 1234 5678',
      addressComponents: [
        { longText: '10', shortText: '10', types: ['street_number'] },
        { longText: 'High Street', shortText: 'High St', types: ['route'] },
        { longText: 'London', shortText: 'London', types: ['locality'] },
        { longText: 'United Kingdom', shortText: 'GB', types: ['country'] },
      ],
    });

    this.fixtures.set('place_details_no_website', {
      id: 'ChIJ9999999999',
      name: 'places/ChIJ9999999999',
      displayName: { text: 'No Website Dental', languageCode: 'en' },
      formattedAddress: '30 No Site Road, London',
      location: { latitude: 51.5, longitude: -0.12 },
      types: ['dentist'],
      businessStatus: 'OPERATIONAL',
      internationalPhoneNumber: '+44 20 9999 8888',
    });

    this.fixtures.set('place_details_closed', {
      id: 'ChIJ0000000000',
      name: 'places/ChIJ0000000000',
      displayName: { text: 'Closed Dental', languageCode: 'en' },
      formattedAddress: '1 Closed Street, London',
      location: { latitude: 51.5, longitude: -0.12 },
      types: ['dentist'],
      businessStatus: 'CLOSED_PERMANENTLY',
    });
  }

  async send(req: GoogleTransportRequest): Promise<GoogleTransportResponse> {
    const validation = validateReservationContext(req.reservation, {
      sourceId: req.reservation.sourceId,
      collectorRunId: req.reservation.collectorRunId,
      operation: req.reservation.operation,
      queryFingerprint: req.reservation.queryFingerprint,
    });

    if (!validation.valid) {
      return {
        status: 'FAILED',
        error: {
          classification: 'INVALID_REQUEST',
          message: `Reservation validation failed: ${validation.error}`,
          httpStatus: 400,
        },
      };
    }

    const op = req.request.operation;
    const body = req.request.body || {};

    if (body.pageToken) {
      if (body.pageToken === 'nextPageToken123') {
        return {
          status: 'SUCCESS',
          data: {
            places: [
              {
                id: 'ChIJ2222222222',
                name: 'places/ChIJ2222222222',
                displayName: { text: 'Page 2 Dental', languageCode: 'en' },
                formattedAddress: 'Page 2 Street, London',
                location: { latitude: 51.52, longitude: -0.13 },
                types: ['dentist'],
                businessStatus: 'OPERATIONAL',
              },
            ],
            nextPageToken: null,
          },
          latencyMs: 50,
        };
      }
    }

    if (body.textQuery) {
      const tq = String(body.textQuery).toLowerCase();
      if (tq.includes('auth_error')) {
        return { status: 'FAILED', error: { classification: 'AUTH_ERROR', message: 'Invalid API key', httpStatus: 401 } };
      }
      if (tq.includes('quota_exceeded')) {
        return { status: 'FAILED', error: { classification: 'QUOTA_EXCEEDED', message: 'Quota exceeded', httpStatus: 429 } };
      }
      if (tq.includes('rate_limited')) {
        return { status: 'FAILED', error: { classification: 'RATE_LIMITED', message: 'Rate limited', httpStatus: 429 } };
      }
      if (tq.includes('server_error')) {
        return { status: 'FAILED', error: { classification: 'SERVER_ERROR', message: 'Internal server error', httpStatus: 500 } };
      }
      if (tq.includes('invalid_request')) {
        return { status: 'FAILED', error: { classification: 'INVALID_REQUEST', message: 'Invalid request', httpStatus: 400 } };
      }
      if (tq.includes('empty')) {
        return { status: 'NO_RESULT', data: this.fixtures.get('text_search_empty'), latencyMs: 30 };
      }
    }

    if (op === 'TEXT_SEARCH') {
      // If ID-only mask requested, return ID-only fixture
      if (req.request.fieldMask.includes('places.id') && !req.request.fieldMask.includes('places.displayName')) {
        return { status: 'SUCCESS', data: this.fixtures.get('text_search_id_only'), latencyMs: 100 };
      }
      return { status: 'SUCCESS', data: this.fixtures.get('text_search_success'), latencyMs: 100 };
    }
    if (op === 'NEARBY_SEARCH') {
      return { status: 'SUCCESS', data: this.fixtures.get('nearby_search_success'), latencyMs: 100 };
    }
    if (op === 'PLACE_DETAILS') {
      const endpoint = req.request.endpoint;
      if (endpoint.includes('ChIJ9999999999')) {
        return { status: 'SUCCESS', data: this.fixtures.get('place_details_no_website'), latencyMs: 80 };
      }
      if (endpoint.includes('ChIJ0000000000')) {
        return { status: 'SUCCESS', data: this.fixtures.get('place_details_closed'), latencyMs: 80 };
      }
      return { status: 'SUCCESS', data: this.fixtures.get('place_details_success'), latencyMs: 80 };
    }

    return { status: 'FAILED', error: { classification: 'UNKNOWN', message: 'Unknown operation', httpStatus: 400 } };
  }

  getFixture(name: string): any {
    return this.fixtures.get(name);
  }
}

export class RealGoogleTransport implements GoogleTransport {
  async send(req: GoogleTransportRequest): Promise<GoogleTransportResponse> {
    throw new Error('GOOGLE_NETWORK_TRANSPORT_DISABLED — Real Google transport disabled in Phase 4C.4C.1, ZERO REAL REQUESTS allowed');
  }
}

// ---------------------------------------------------------------- Adapter — requires reservation context

export class GooglePlacesAdapter {
  private transport: GoogleTransport;

  constructor(transport: GoogleTransport) {
    this.transport = transport;
  }

  async textSearch(params: {
    textQuery: string;
    reservation: GoogleRequestReservation;
    pageSize?: number;
    pageToken?: string;
    locationBias?: any;
    locationRestriction?: any;
    includedType?: string;
    useContactFields?: boolean;
    useIdOnly?: boolean;
  }): Promise<GoogleTransportResponse> {
    const fingerprint = params.reservation.queryFingerprint;
    const validation = validateReservationContext(params.reservation, {
      sourceId: params.reservation.sourceId,
      collectorRunId: params.reservation.collectorRunId,
      operation: 'TEXT_SEARCH',
      queryFingerprint: fingerprint,
    });
    if (!validation.valid) {
      return { status: 'FAILED', error: { classification: 'INVALID_REQUEST', message: `Reservation invalid: ${validation.error}`, httpStatus: 400 } };
    }

    const credStatus = getGoogleCredentialStatus();
    if (!credStatus.configured) {
      return { status: 'FAILED', error: { classification: 'AUTH_ERROR', message: 'GOOGLE_CREDENTIAL_MISSING', httpStatus: 401 } };
    }

    const request = buildTextSearchRequest({
      textQuery: params.textQuery,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
      locationBias: params.locationBias,
      locationRestriction: params.locationRestriction,
      includedType: params.includedType,
      useContactFields: params.useContactFields,
      useIdOnly: params.useIdOnly,
    });

    console.log(`[google-adapter] TEXT_SEARCH reservation=${params.reservation.usageId} source=${params.reservation.sourceId} fingerprint=${fingerprint.slice(0,16)}...`);

    return await this.transport.send({ request, reservation: params.reservation });
  }

  async nearbySearch(params: {
    locationRestriction: { circle: { center: { latitude: number; longitude: number }; radius: number } };
    reservation: GoogleRequestReservation;
    includedTypes?: string[];
    maxResultCount?: number;
    useContactFields?: boolean;
    useIdOnly?: boolean;
  }): Promise<GoogleTransportResponse> {
    const validation = validateReservationContext(params.reservation, {
      sourceId: params.reservation.sourceId,
      collectorRunId: params.reservation.collectorRunId,
      operation: 'NEARBY_SEARCH',
      queryFingerprint: params.reservation.queryFingerprint,
    });
    if (!validation.valid) {
      return { status: 'FAILED', error: { classification: 'INVALID_REQUEST', message: `Reservation invalid: ${validation.error}`, httpStatus: 400 } };
    }

    const credStatus = getGoogleCredentialStatus();
    if (!credStatus.configured) {
      return { status: 'FAILED', error: { classification: 'AUTH_ERROR', message: 'GOOGLE_CREDENTIAL_MISSING', httpStatus: 401 } };
    }

    const request = buildNearbySearchRequest({
      locationRestriction: params.locationRestriction,
      includedTypes: params.includedTypes,
      maxResultCount: params.maxResultCount,
      useContactFields: params.useContactFields,
      useIdOnly: params.useIdOnly,
    });

    console.log(`[google-adapter] NEARBY_SEARCH reservation=${params.reservation.usageId} fingerprint=${params.reservation.queryFingerprint.slice(0,16)}...`);

    return await this.transport.send({ request, reservation: params.reservation });
  }

  async placeDetails(params: {
    placeId: string;
    reservation: GoogleRequestReservation;
    useContactFields?: boolean;
  }): Promise<GoogleTransportResponse> {
    const validation = validateReservationContext(params.reservation, {
      sourceId: params.reservation.sourceId,
      collectorRunId: params.reservation.collectorRunId,
      operation: 'PLACE_DETAILS',
      queryFingerprint: params.reservation.queryFingerprint,
    });
    if (!validation.valid) {
      return { status: 'FAILED', error: { classification: 'INVALID_REQUEST', message: `Reservation invalid: ${validation.error}`, httpStatus: 400 } };
    }

    const credStatus = getGoogleCredentialStatus();
    if (!credStatus.configured) {
      return { status: 'FAILED', error: { classification: 'AUTH_ERROR', message: 'GOOGLE_CREDENTIAL_MISSING', httpStatus: 401 } };
    }

    const request = buildPlaceDetailsRequest({
      placeId: params.placeId,
      useContactFields: params.useContactFields,
    });

    console.log(`[google-adapter] PLACE_DETAILS reservation=${params.reservation.usageId} placeId=${params.placeId}`);

    return await this.transport.send({ request, reservation: params.reservation });
  }
}

// ---------------------------------------------------------------- Logging safety — never log API key, auth header, credential object
// Safe logging: operation, usageId, runId, sourceId, fingerprint prefix, status, latency, classification, endpoint, fieldMask
// Never log: API key, authorization header, credential object, full secret-bearing request headers

export function getSafeRequestLog(req: GooglePlacesRequest, reservation: GoogleRequestReservation) {
  return {
    operation: req.operation,
    usageId: reservation.usageId,
    runId: reservation.collectorRunId,
    sourceId: reservation.sourceId,
    fingerprintPrefix: reservation.queryFingerprint.slice(0, 16),
    endpoint: req.endpoint,
    fieldMask: req.fieldMask,
  };
}

export function getSafeResponseLog(res: GoogleTransportResponse) {
  return {
    status: res.status,
    classification: res.error?.classification,
    httpStatus: res.error?.httpStatus,
    latencyMs: res.latencyMs,
  };
}
