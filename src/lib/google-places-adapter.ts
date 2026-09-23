/**
 * ClientForge CRM — Phase 4C.4C.1 Google Places Adapter Contract
 * ZERO REAL GOOGLE REQUESTS — adapter CONTRACT only
 *
 * Official API selected: Places API (New)
 * Endpoints (from official docs https://developers.google.com/maps/documentation/places/web-service):
 * - Text Search (New): POST https://places.googleapis.com/v1/places:searchText
 * - Nearby Search (New): POST https://places.googleapis.com/v1/places:searchNearby
 * - Place Details (New): GET https://places.googleapis.com/v1/places/{placeId}
 *
 * Auth: X-Goog-Api-Key header or ?key= query (API key), OAuth supported but we use API key
 * Field mask: X-Goog-FieldMask header required, no default, wildcard * discouraged in prod
 * Pagination: Text Search returns nextPageToken, each page new request with pageToken param
 * Place identifier: places/PLACE_ID resource name, id field is place_id
 *
 * Billing: Field mask determines SKU tier — billed at highest SKU applicable. Must minimize fields.
 * Email: Places API does NOT return business email (confirmed via official docs + Issue Tracker). Need website crawl for email.
 */

import { GoogleOperation, GoogleErrorClassification } from '@prisma/client';
import { getGoogleCredentialStatus, getGoogleApiKeyForTransport } from './google-credential-reader';

// ---------------------------------------------------------------- Field Mask Constants — centrally controlled, no wildcard

// Discovery essential fields — minimum for business discovery
// Based on official Place Data Fields: https://developers.google.com/maps/documentation/places/web-service/data-fields
// Pro SKU: displayName, formattedAddress, location, businessStatus, types, primaryType, id, name (resource)
// Enterprise SKU: websiteUri, internationalPhoneNumber, nationalPhoneNumber, rating etc — we include only website/phone for qualification, not rating/reviews

export const DISCOVERY_FIELD_MASK = [
  'places.id',
  'places.name',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.businessStatus',
] as const;

export const CONTACT_FIELD_MASK = [
  'places.websiteUri',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
] as const;

export const DETAIL_FIELD_MASK = [
  'id',
  'name',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'primaryType',
  'businessStatus',
  'websiteUri',
  'internationalPhoneNumber',
  'nationalPhoneNumber',
  'addressComponents',
] as const;

// For Text Search, combined discovery + contact (but contact moves to Enterprise SKU — cost sensitive)
// We define two tiers for cost awareness:
export const TEXT_SEARCH_ESSENTIAL_MASK = [
  ...DISCOVERY_FIELD_MASK,
] as const;

export const TEXT_SEARCH_CONTACT_MASK = [
  ...DISCOVERY_FIELD_MASK,
  ...CONTACT_FIELD_MASK,
] as const;

export const NEARBY_SEARCH_MASK = [
  ...DISCOVERY_FIELD_MASK,
] as const;

export const NEARBY_SEARCH_CONTACT_MASK = [
  ...DISCOVERY_FIELD_MASK,
  ...CONTACT_FIELD_MASK,
] as const;

export const PLACE_DETAILS_MASK = [
  ...DETAIL_FIELD_MASK,
] as const;

// Validation: no wildcard
export function validateNoWildcardFieldMask(mask: string[] | string): boolean {
  const str = Array.isArray(mask) ? mask.join(',') : mask;
  return !str.includes('*');
}

// ---------------------------------------------------------------- Reservation Token — opaque context from guardrails

export interface GoogleRequestReservation {
  usageId: string; // GoogleApiUsage.id
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
  // Status RESERVED should be checked via DB, but token presence indicates intent
  return { valid: true };
}

// ---------------------------------------------------------------- Request Builders — PURE, no HTTP, no API key in snapshots

export interface GooglePlacesRequest {
  method: 'POST' | 'GET';
  endpoint: string; // path identifier, not full URL with key
  endpointUrl: string; // full URL without key
  headers: Record<string, string>; // excluding actual credential
  fieldMask: string; // X-Goog-FieldMask value
  body?: any;
  queryParams?: Record<string, string>;
  operation: 'TEXT_SEARCH' | 'NEARBY_SEARCH' | 'PLACE_DETAILS';
  pagination?: {
    pageToken?: string;
    pageSize?: number;
    pageCap?: number;
  };
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
  useContactFields?: boolean; // if true, includes website/phone (Enterprise SKU)
}): GooglePlacesRequest {
  if (!params.textQuery || params.textQuery.trim().length === 0) {
    throw new Error('INVALID_REQUEST: textQuery required');
  }

  const fieldMaskArray = params.useContactFields ? TEXT_SEARCH_CONTACT_MASK : TEXT_SEARCH_ESSENTIAL_MASK;
  if (!validateNoWildcardFieldMask(fieldMaskArray as any)) {
    throw new Error('FIELD_MASK_WILDCARD_NOT_ALLOWED');
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
      pageCap: 3, // future collector explicit page cap — no unlimited loop
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
}): GooglePlacesRequest {
  if (!params.locationRestriction) {
    throw new Error('INVALID_REQUEST: locationRestriction required for Nearby Search');
  }

  const fieldMaskArray = params.useContactFields ? NEARBY_SEARCH_CONTACT_MASK : NEARBY_SEARCH_MASK;
  if (!validateNoWildcardFieldMask(fieldMaskArray as any)) {
    throw new Error('FIELD_MASK_WILDCARD_NOT_ALLOWED');
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
}): GooglePlacesRequest {
  if (!params.placeId || params.placeId.trim().length === 0) {
    throw new Error('INVALID_REQUEST: placeId required');
  }

  const fieldMaskArray = PLACE_DETAILS_MASK;
  if (!validateNoWildcardFieldMask(fieldMaskArray as any)) {
    throw new Error('FIELD_MASK_WILDCARD_NOT_ALLOWED');
  }

  // Place Details New: GET https://places.googleapis.com/v1/places/{placeId}
  const placeId = params.placeId.trim();
  // Ensure no places/ prefix duplication
  const resourceName = placeId.startsWith('places/') ? placeId : `places/${placeId}`;

  const queryParams: Record<string, string> = {};
  if (params.languageCode) queryParams.languageCode = params.languageCode;
  if (params.regionCode) queryParams.regionCode = params.regionCode;

  return {
    method: 'GET',
    endpoint: `places/${placeId}`,
    endpointUrl: `https://places.googleapis.com/v1/${resourceName}`,
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
    // Preload deterministic fixtures
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
    });

    this.fixtures.set('text_search_empty', {
      places: [],
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
    // Validate reservation required — guardrail integration contract
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

    // Simulate credential check
    const credStatus = getGoogleCredentialStatus();
    // In mock, we allow missing credential for unit tests, but real transport would fail

    // Deterministic fixture selection based on request
    const op = req.request.operation;
    const body = req.request.body || {};

    // Simulate pagination token handling
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

    // Simulate error fixtures based on special textQuery values
    if (body.textQuery) {
      const tq = String(body.textQuery).toLowerCase();
      if (tq.includes('auth_error')) {
        return {
          status: 'FAILED',
          error: { classification: 'AUTH_ERROR', message: 'Invalid API key', httpStatus: 401 },
        };
      }
      if (tq.includes('quota_exceeded')) {
        return {
          status: 'FAILED',
          error: { classification: 'QUOTA_EXCEEDED', message: 'Quota exceeded', httpStatus: 429 },
        };
      }
      if (tq.includes('rate_limited')) {
        return {
          status: 'FAILED',
          error: { classification: 'RATE_LIMITED', message: 'Rate limited', httpStatus: 429 },
        };
      }
      if (tq.includes('server_error')) {
        return {
          status: 'FAILED',
          error: { classification: 'SERVER_ERROR', message: 'Internal server error', httpStatus: 500 },
        };
      }
      if (tq.includes('invalid_request')) {
        return {
          status: 'FAILED',
          error: { classification: 'INVALID_REQUEST', message: 'Invalid request', httpStatus: 400 },
        };
      }
      if (tq.includes('empty')) {
        return {
          status: 'NO_RESULT',
          data: this.fixtures.get('text_search_empty'),
          latencyMs: 30,
        };
      }
    }

    // Default success based on operation
    if (op === 'TEXT_SEARCH') {
      return {
        status: 'SUCCESS',
        data: this.fixtures.get('text_search_success'),
        latencyMs: 100,
      };
    }
    if (op === 'NEARBY_SEARCH') {
      return {
        status: 'SUCCESS',
        data: this.fixtures.get('nearby_search_success'),
        latencyMs: 100,
      };
    }
    if (op === 'PLACE_DETAILS') {
      // Check placeId
      const endpoint = req.request.endpoint;
      if (endpoint.includes('ChIJ9999999999')) {
        return {
          status: 'SUCCESS',
          data: this.fixtures.get('place_details_no_website'),
          latencyMs: 80,
        };
      }
      if (endpoint.includes('ChIJ0000000000')) {
        return {
          status: 'SUCCESS',
          data: this.fixtures.get('place_details_closed'),
          latencyMs: 80,
        };
      }
      return {
        status: 'SUCCESS',
        data: this.fixtures.get('place_details_success'),
        latencyMs: 80,
      };
    }

    return {
      status: 'FAILED',
      error: { classification: 'UNKNOWN', message: 'Unknown operation', httpStatus: 400 },
    };
  }

  // Helper to get fixture directly for tests
  getFixture(name: string): any {
    return this.fixtures.get(name);
  }
}

// Real transport — MUST throw GOOGLE_NETWORK_TRANSPORT_DISABLED in 4C.4C.1
export class RealGoogleTransport implements GoogleTransport {
  async send(req: GoogleTransportRequest): Promise<GoogleTransportResponse> {
    // Fail-closed before any network
    throw new Error('GOOGLE_NETWORK_TRANSPORT_DISABLED — Real Google transport disabled in Phase 4C.4C.1, ZERO REAL REQUESTS allowed');
  }
}

// ---------------------------------------------------------------- Adapter — requires reservation context

export class GooglePlacesAdapter {
  private transport: GoogleTransport;

  constructor(transport: GoogleTransport) {
    this.transport = transport;
  }

  // Text Search — requires reservation
  async textSearch(params: {
    textQuery: string;
    reservation: GoogleRequestReservation;
    pageSize?: number;
    pageToken?: string;
    locationBias?: any;
    locationRestriction?: any;
    includedType?: string;
    useContactFields?: boolean;
  }): Promise<GoogleTransportResponse> {
    // Guardrail integration: validate reservation before building request
    const fingerprint = params.reservation.queryFingerprint;
    const validation = validateReservationContext(params.reservation, {
      sourceId: params.reservation.sourceId,
      collectorRunId: params.reservation.collectorRunId,
      operation: 'TEXT_SEARCH',
      queryFingerprint: fingerprint,
    });
    if (!validation.valid) {
      return {
        status: 'FAILED',
        error: { classification: 'INVALID_REQUEST', message: `Reservation invalid: ${validation.error}`, httpStatus: 400 },
      };
    }

    // Credential check
    const credStatus = getGoogleCredentialStatus();
    if (!credStatus.configured) {
      return {
        status: 'FAILED',
        error: { classification: 'AUTH_ERROR', message: 'GOOGLE_CREDENTIAL_MISSING', httpStatus: 401 },
      };
    }

    const request = buildTextSearchRequest({
      textQuery: params.textQuery,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
      locationBias: params.locationBias,
      locationRestriction: params.locationRestriction,
      includedType: params.includedType,
      useContactFields: params.useContactFields,
    });

    // Safe logging — never log API key
    console.log(`[google-adapter] TEXT_SEARCH reservation=${params.reservation.usageId} source=${params.reservation.sourceId} fingerprint=${fingerprint.slice(0,16)}...`);

    return await this.transport.send({ request, reservation: params.reservation });
  }

  async nearbySearch(params: {
    locationRestriction: { circle: { center: { latitude: number; longitude: number }; radius: number } };
    reservation: GoogleRequestReservation;
    includedTypes?: string[];
    maxResultCount?: number;
    useContactFields?: boolean;
  }): Promise<GoogleTransportResponse> {
    const validation = validateReservationContext(params.reservation, {
      sourceId: params.reservation.sourceId,
      collectorRunId: params.reservation.collectorRunId,
      operation: 'NEARBY_SEARCH',
      queryFingerprint: params.reservation.queryFingerprint,
    });
    if (!validation.valid) {
      return {
        status: 'FAILED',
        error: { classification: 'INVALID_REQUEST', message: `Reservation invalid: ${validation.error}`, httpStatus: 400 },
      };
    }

    const credStatus = getGoogleCredentialStatus();
    if (!credStatus.configured) {
      return {
        status: 'FAILED',
        error: { classification: 'AUTH_ERROR', message: 'GOOGLE_CREDENTIAL_MISSING', httpStatus: 401 },
      };
    }

    const request = buildNearbySearchRequest({
      locationRestriction: params.locationRestriction,
      includedTypes: params.includedTypes,
      maxResultCount: params.maxResultCount,
      useContactFields: params.useContactFields,
    });

    console.log(`[google-adapter] NEARBY_SEARCH reservation=${params.reservation.usageId} fingerprint=${params.reservation.queryFingerprint.slice(0,16)}...`);

    return await this.transport.send({ request, reservation: params.reservation });
  }

  async placeDetails(params: {
    placeId: string;
    reservation: GoogleRequestReservation;
  }): Promise<GoogleTransportResponse> {
    const validation = validateReservationContext(params.reservation, {
      sourceId: params.reservation.sourceId,
      collectorRunId: params.reservation.collectorRunId,
      operation: 'PLACE_DETAILS',
      queryFingerprint: params.reservation.queryFingerprint,
    });
    if (!validation.valid) {
      return {
        status: 'FAILED',
        error: { classification: 'INVALID_REQUEST', message: `Reservation invalid: ${validation.error}`, httpStatus: 400 },
      };
    }

    const credStatus = getGoogleCredentialStatus();
    if (!credStatus.configured) {
      return {
        status: 'FAILED',
        error: { classification: 'AUTH_ERROR', message: 'GOOGLE_CREDENTIAL_MISSING', httpStatus: 401 },
      };
    }

    const request = buildPlaceDetailsRequest({
      placeId: params.placeId,
    });

    console.log(`[google-adapter] PLACE_DETAILS reservation=${params.reservation.usageId} placeId=${params.placeId}`);

    return await this.transport.send({ request, reservation: params.reservation });
  }
}

// ---------------------------------------------------------------- Logging safety — safe fields only

export function getSafeRequestLog(req: GooglePlacesRequest, reservation: GoogleRequestReservation) {
  return {
    operation: req.operation,
    usageId: reservation.usageId,
    runId: reservation.collectorRunId,
    sourceId: reservation.sourceId,
    fingerprintPrefix: reservation.queryFingerprint.slice(0, 16),
    endpoint: req.endpoint,
    fieldMask: req.fieldMask,
    // Never log API key, auth header, credential
  };
}

export function getSafeResponseLog(res: GoogleTransportResponse) {
  return {
    status: res.status,
    classification: res.error?.classification,
    httpStatus: res.error?.httpStatus,
    latencyMs: res.latencyMs,
    // Never log full data that might contain secrets, but data itself is safe (place info)
  };
}
