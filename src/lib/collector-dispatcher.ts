/**
 * ClientForge CRM — Phase 4C.4C.5B Source-Neutral Dispatcher
 * Dispatches collection execution behind a unified boundary by DataSource.type.
 * Supported types: 'overpass', 'google_places'.
 * Fails closed with UNSUPPORTED_COLLECTION_SOURCE on unknown types.
 * ZERO GOOGLE NETWORK — Google execution remains gated and production-disabled.
 */

import { PrismaClient } from '@prisma/client';
import { collectFromGoogleSource, GoogleCollectorContext, GoogleCollectorOptions, GoogleCollectorResult } from './google-collector-adapter';

export type SupportedSourceType = 'overpass' | 'google_places';

export interface CollectionDispatchContext {
  prisma: PrismaClient;
  source: {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    baseUrl?: string;
    healthStatus?: string;
    priority?: number;
    config?: any;
  };
  location: {
    id: string;
    city: string;
    countryCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  };
  category: {
    id: string;
    slug: string;
    name: string;
    osmTags?: any;
    searchTerms?: any;
  };
  collectorRun: {
    id: string;
    sourceId?: string | null;
    locationId?: string | null;
    categoryId?: string | null;
  };
  config?: any;
  options?: GoogleCollectorOptions;
}

export interface CollectionDispatchResult {
  sourceType: string;
  status: 'SUCCESS' | 'PARTIAL' | 'SKIPPED' | 'FAILED';
  reason?: string;
  candidatesFound?: number;
  leadsAccepted?: number;
  leadsInserted?: number;
  metrics?: Record<string, any>;
  safeLog?: Record<string, any>;
  error?: Error;
}

export class UnsupportedCollectionSourceError extends Error {
  constructor(public sourceType: string) {
    super(`UNSUPPORTED_COLLECTION_SOURCE: DataSource type "${sourceType}" is not supported`);
    this.name = 'UnsupportedCollectionSourceError';
  }
}

/**
 * Dispatch collection to the appropriate source adapter.
 * Gated fail-closed on unknown source types.
 */
export async function dispatchCollection(
  ctx: CollectionDispatchContext
): Promise<CollectionDispatchResult> {
  const sourceType = (ctx.source.type || '').trim().toLowerCase();

  switch (sourceType) {
    case 'overpass': {
      // Overpass collection is handled via normal Overpass pipeline
      return {
        sourceType: 'overpass',
        status: 'SUCCESS',
        reason: 'OVERPASS_DISPATCH_READY',
        safeLog: { sourceType: 'overpass', sourceName: ctx.source.name, city: ctx.location.city, category: ctx.category.slug },
      };
    }

    case 'google_places': {
      const googleCtx: GoogleCollectorContext = {
        prisma: ctx.prisma,
        location: {
          id: ctx.location.id,
          city: ctx.location.city,
          countryCode: (ctx.location.countryCode || 'GB').toUpperCase(),
          latitude: ctx.location.latitude,
          longitude: ctx.location.longitude,
        },
        category: {
          id: ctx.category.id,
          slug: ctx.category.slug,
          name: ctx.category.name,
        },
        source: ctx.source,
        collectorRunId: ctx.collectorRun.id,
        config: ctx.config,
      };

      const result = await collectFromGoogleSource(googleCtx, ctx.options);
      return {
        sourceType: 'google_places',
        status: result.status,
        reason: result.reason,
        candidatesFound: result.candidatesFound,
        metrics: result.metrics,
        safeLog: result.safeLog,
      };
    }

    default: {
      return {
        sourceType,
        status: 'FAILED',
        reason: 'UNSUPPORTED_COLLECTION_SOURCE',
        error: new UnsupportedCollectionSourceError(sourceType),
        safeLog: { sourceType, error: 'UNSUPPORTED_COLLECTION_SOURCE' },
      };
    }
  }
}
