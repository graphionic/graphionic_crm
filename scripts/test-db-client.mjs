#!/usr/bin/env node
/**
 * Phase 4C.4B.1 — Test DB Client Helper
 * Explicitly initializes PrismaClient against TEST_DATABASE_URL using Prisma 6 pattern
 * Does NOT overwrite production .env, does NOT modify DATABASE_URL
 *
 * Contract:
 * - TEST_DATABASE_URL present → use it explicitly via datasourceUrl override
 * - TEST_DATABASE_URL absent + production DATABASE_URL (neon.tech) → REFUSE
 * - Production mutation without explicit allow impossible
 */

import { PrismaClient } from '@prisma/client';

function isProductionUrl(url) {
  if (!url) return false;
  return url.includes('neon.tech') || url.includes('prod') || url.includes('aws.neon');
}

export function getTestPrismaClient() {
  const testUrl = process.env.TEST_DATABASE_URL;
  const prodUrl = process.env.DATABASE_URL;

  if (testUrl) {
    // Prisma 6 supports datasourceUrl override and datasources.db.url override
    // Use datasourceUrl as primary, fallback to datasources for compatibility
    console.log('[test-db-client] Using TEST_DATABASE_URL for isolated test DB');
    // Sanitize like prisma.ts does
    const sanitized = testUrl.trim().replace(/^["']|["']$/g, '').replace(/&amp;/g, '&');
    try {
      // Preferred Prisma 6 API: datasourceUrl
      return new PrismaClient({
        datasourceUrl: sanitized,
        log: ['error', 'warn'],
      });
    } catch (e) {
      // Fallback to legacy datasources override
      console.log('[test-db-client] datasourceUrl not supported, falling back to datasources.db.url');
      return new PrismaClient({
        datasources: {
          db: {
            url: sanitized,
          },
        },
        log: ['error', 'warn'],
      });
    }
  }

  // No TEST_DATABASE_URL
  if (isProductionUrl(prodUrl)) {
    const err = new Error(
      '[test-safety] REFUSING to run DB-mutating test against production DATABASE_URL\n' +
      '[test-safety] TEST_DATABASE_URL is required for isolated test DB\n' +
      '[test-safety] Production mutation without TEST_DATABASE_URL is not allowed\n' +
      '[test-safety] Set TEST_DATABASE_URL to isolated test database\n' +
      '[test-safety] Emergency override ALLOW_PRODUCTION_TEST_MUTATION=true is NOT part of normal verification'
    );
    err.code = 'PRODUCTION_DB_REFUSED';
    throw err;
  }

  // Non-production DATABASE_URL and no TEST_DATABASE_URL — allow but warn
  console.log('[test-db-client] WARNING: Using DATABASE_URL (non-production) for tests, TEST_DATABASE_URL not set');
  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export function assertTestDatabaseAvailable() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    const prodUrl = process.env.DATABASE_URL;
    if (isProductionUrl(prodUrl)) {
      throw new Error(
        'DB INTEGRATION TESTS NOT RUN — TEST_DATABASE_URL REQUIRED\n' +
        'Production DATABASE_URL detected, refusing to mutate production'
      );
    }
    console.log('[test-db-client] TEST_DATABASE_URL not set, but DATABASE_URL is non-production, allowing');
  }
}
