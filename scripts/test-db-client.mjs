#!/usr/bin/env node
/**
 * Phase 4C.4B.1 / 4C.4C.2 — Test DB Client Helper
 * Explicitly initializes PrismaClient against TEST_DATABASE_URL using Prisma 6 pattern
 * Does NOT overwrite production .env, does NOT modify DATABASE_URL
 *
 * Contract:
 * - TEST_DATABASE_URL present → use it explicitly via datasourceUrl override
 * - TEST_DATABASE_URL absent + production DATABASE_URL (neon.tech) → REFUSE
 * - TEST_DATABASE_URL pointing to same identity as production → REFUSE
 * - Production mutation without explicit allow impossible
 * - NEVER uses ALLOW_PRODUCTION_TEST_MUTATION
 */

import { PrismaClient } from '@prisma/client';

function isProductionUrl(url) {
  if (!url) return false;
  return url.includes('neon.tech') || url.includes('aws.neon');
}

function sanitizeUrl(url) {
  if (!url) return '';
  return url.trim().replace(/^["']|["']$/g, '').replace(/&amp;/g, '&');
}

function parseDbIdentity(url) {
  if (!url) return null;
  const sanitized = sanitizeUrl(url);
  try {
    // Replace postgresql:// and postgres:// with https:// for URL parsing
    const tmp = sanitized.replace(/^postgresql:\/\//i, 'https://').replace(/^postgres:\/\//i, 'https://');
    const parsed = new URL(tmp);
    const host = (parsed.hostname || '').toLowerCase();
    // Default postgres port 5432, Neon pooler may use 5432 or 6543
    const port = parsed.port || '5432';
    const pathname = parsed.pathname || '';
    const db = pathname.replace(/^\//, '').split('?')[0].split('/')[0] || '';
    const isNeon = host.includes('neon.tech') || sanitized.includes('neon.tech');
    // For Neon, branch/project identifier is embedded in host like ep-xxx-... . Extract first label
    let neonBranch = null;
    if (isNeon) {
      const firstLabel = host.split('.')[0] || '';
      neonBranch = firstLabel; // e.g. ep-soft-bread-b5symaj4-pooler
    }
    return { host, port, db: db.toLowerCase(), rawHost: parsed.hostname, isNeon, neonBranch, original: sanitized };
  } catch (e) {
    // Fallback: try regex extraction
    return { host: '', port: '', db: '', rawHost: '', isNeon: isProductionUrl(sanitized), neonBranch: null, original: sanitized, parseError: e.message };
  }
}

function identitiesEqual(a, b) {
  if (!a || !b) return false;
  // Exact URL match
  if (a.original && b.original && a.original === b.original) return true;
  // Host + port + db match
  if (a.host && b.host && a.host === b.host && a.port === b.port && a.db && b.db && a.db === b.db) return true;
  // For Neon, if host contains same branch and db same, treat as same
  if (a.isNeon && b.isNeon && a.host === b.host && a.db === b.db) return true;
  return false;
}

export function getTestPrismaClient() {
  const testUrlRaw = process.env.TEST_DATABASE_URL;
  const prodUrlRaw = process.env.DATABASE_URL;

  if (testUrlRaw) {
    const testIdentity = parseDbIdentity(testUrlRaw);
    const prodIdentity = parseDbIdentity(prodUrlRaw);

    // Production identity guard — compare normalized hostname/port/database
    if (prodIdentity && testIdentity && identitiesEqual(testIdentity, prodIdentity)) {
      const err = new Error(
        '[test-safety] REFUSING — TEST_DATABASE_URL points to same database identity as production DATABASE_URL\n' +
        `[test-safety] prod host=${prodIdentity.host} port=${prodIdentity.port} db=${prodIdentity.db} neonBranch=${prodIdentity.neonBranch || 'n/a'}\n` +
        `[test-safety] test host=${testIdentity.host} port=${testIdentity.port} db=${testIdentity.db} neonBranch=${testIdentity.neonBranch || 'n/a'}\n` +
        '[test-safety] Aborting to prevent production mutation\n' +
        '[test-safety] Use isolated database: clientforge_test or isolated Neon test branch'
      );
      err.code = 'PRODUCTION_IDENTITY_MATCH';
      throw err;
    }

    // Additional guard: if TEST_DATABASE_URL is production Neon host and prod db name
    if (prodIdentity && prodIdentity.isNeon && testIdentity && testIdentity.isNeon) {
      // If both are neon.tech and host matches production host (even without port/db), refuse if db matches
      if (testIdentity.host === prodIdentity.host) {
        const err = new Error(
          `[test-safety] REFUSING — TEST_DATABASE_URL host ${testIdentity.host} matches production Neon host\n` +
          '[test-safety] Isolated test branch required, not production branch'
        );
        err.code = 'PRODUCTION_NEON_HOST_MATCH';
        throw err;
      }
    }

    console.log('[test-db-client] Using TEST_DATABASE_URL for isolated test DB');
    console.log(`[test-db-client] test identity host=${testIdentity.host} port=${testIdentity.port} db=${testIdentity.db} isNeon=${testIdentity.isNeon}`);
    const sanitized = sanitizeUrl(testUrlRaw);
    try {
      return new PrismaClient({
        datasourceUrl: sanitized,
        log: ['error', 'warn'],
      });
    } catch (e) {
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
  if (isProductionUrl(prodUrlRaw)) {
    const prodIdentity = parseDbIdentity(prodUrlRaw);
    const err = new Error(
      '[test-safety] REFUSING to run DB-mutating test against production DATABASE_URL\n' +
      `[test-safety] prod host=${prodIdentity?.host} port=${prodIdentity?.port} db=${prodIdentity?.db}\n` +
      '[test-safety] TEST_DATABASE_URL is required for isolated test DB\n' +
      '[test-safety] Production mutation without TEST_DATABASE_URL is not allowed\n' +
      '[test-safety] Set TEST_DATABASE_URL to isolated test database (e.g. postgresql://test_user:test_pass@localhost:5432/clientforge_test)\n' +
      '[test-safety] Emergency override ALLOW_PRODUCTION_TEST_MUTATION=true is NOT part of normal verification and is FORBIDDEN'
    );
    err.code = 'PRODUCTION_DB_REFUSED';
    throw err;
  }

  console.log('[test-db-client] WARNING: Using DATABASE_URL (non-production) for tests, TEST_DATABASE_URL not set');
  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export function assertTestDatabaseAvailable() {
  const testUrl = process.env.TEST_DATABASE_URL;
  const prodUrl = process.env.DATABASE_URL;
  if (!testUrl) {
    if (isProductionUrl(prodUrl)) {
      const prodIdentity = parseDbIdentity(prodUrl);
      throw new Error(
        'DB INTEGRATION TESTS NOT RUN — TEST_DATABASE_URL REQUIRED\n' +
        `Production DATABASE_URL detected host=${prodIdentity?.host} db=${prodIdentity?.db}\n` +
        'Refusing to mutate production. Set TEST_DATABASE_URL to isolated database.'
      );
    }
    console.log('[test-db-client] TEST_DATABASE_URL not set, but DATABASE_URL is non-production, allowing');
    return;
  }
  // If TEST_DATABASE_URL set, verify not same as production
  const testIdentity = parseDbIdentity(testUrl);
  const prodIdentity = parseDbIdentity(prodUrl);
  if (prodIdentity && testIdentity && identitiesEqual(testIdentity, prodIdentity)) {
    throw new Error(
      'DB INTEGRATION TESTS NOT RUN — TEST_DATABASE_URL SAME AS PRODUCTION\n' +
      `prod host=${prodIdentity.host} port=${prodIdentity.port} db=${prodIdentity.db}\n` +
      `test host=${testIdentity.host} port=${testIdentity.port} db=${testIdentity.db}\n` +
      'Refusing to prevent production mutation'
    );
  }
}

// Export helpers for testing/reporting
export function getParsedIdentities() {
  return {
    prod: parseDbIdentity(process.env.DATABASE_URL),
    test: parseDbIdentity(process.env.TEST_DATABASE_URL),
  };
}
