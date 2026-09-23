/**
 * Test safety guard — prevents DB-mutating enrichment tests from running against production
 * Pattern: ALLOW_PRODUCTION_TEST_MUTATION must NEVER default true
 * Prefer TEST_DATABASE_URL for DB-mutating tests
 */

export function assertSafeTestEnvironment() {
  const databaseUrl = process.env.DATABASE_URL || '';
  const testDatabaseUrl = process.env.TEST_DATABASE_URL || '';
  const allowProd = process.env.ALLOW_PRODUCTION_TEST_MUTATION === 'true';

  // If TEST_DATABASE_URL is set, we assume test isolation is intended — allow
  if (testDatabaseUrl) {
    console.log('[test-safety] TEST_DATABASE_URL set — assuming isolated test DB');
    return;
  }

  // If DATABASE_URL looks like production Neon and no explicit allow, refuse
  const looksLikeProd = databaseUrl.includes('neon.tech') || databaseUrl.includes('pooler') || databaseUrl.includes('prod') || process.env.NODE_ENV === 'production';

  if (looksLikeProd && !allowProd) {
    console.error('[test-safety] REFUSING to run DB-mutating test against production DATABASE_URL');
    console.error('[test-safety] DATABASE_URL appears to be production (neon.tech / prod)');
    console.error('[test-safety] To run against production intentionally, set ALLOW_PRODUCTION_TEST_MUTATION=true');
    console.error('[test-safety] Preferred: set TEST_DATABASE_URL to isolated test database');
    throw new Error('Test safety guard: Refusing to mutate production DB without ALLOW_PRODUCTION_TEST_MUTATION=true or TEST_DATABASE_URL');
  }

  if (allowProd) {
    console.warn('[test-safety] ALLOW_PRODUCTION_TEST_MUTATION=true — running against production DB intentionally');
  }
}

export function isProductionDatabaseUrl() {
  const url = process.env.DATABASE_URL || '';
  return url.includes('neon.tech') || url.includes('pooler');
}
