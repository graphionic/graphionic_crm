/**
 * Phase 4C.4C.5C.1 — Google Places Canary Configuration Lifecycle Manager
 *
 * Provides safe, idempotent lifecycle operations for Google Places collection:
 *   --prepare   : Persists approved Manchester+dental scope into canaryScopes, preserves disabled state.
 *   --activate  : (Future 5C.2 only) Validates baseline & scope, enables config & source in CANARY mode.
 *   --deactivate: Idempotent fail-safe cleanup, resets config & source to DISABLED/false.
 *   --status    : Read-only status report without secret leakage.
 *
 * ZERO GOOGLE NETWORK REQUESTS.
 */

import { PrismaClient } from '@prisma/client';
import { getGoogleCredentialStatus } from '../src/lib/google-credential-reader.ts';

export const APPROVED_CANARY_SCOPES = [
  {
    countryCode: 'GB',
    city: 'Manchester',
    categorySlug: 'dental',
  },
];

export const CANARY_LIMIT_CAPS = {
  maxPerRun: 3,
  maxDaily: 5,
  maxMonthly: 500,
  retryLimit: 0,
  paginationEnabled: false,
};

export async function getCanaryStatus(prisma) {
  const config = await prisma.googleCollectionConfig.findFirst({
    where: { key: 'default' },
  });

  const source = await prisma.dataSource.findFirst({
    where: { type: 'google_places' },
  });

  const credStatus = getGoogleCredentialStatus();
  const usageCount = await prisma.googleApiUsage.count();
  const cacheCount = await prisma.googleApiCache.count();
  const stateCount = source
    ? await prisma.collectorState.count({ where: { sourceId: source.id } })
    : 0;

  // Safe parsing of canaryScopes
  let parsedScopes = null;
  if (config?.canaryScopes) {
    parsedScopes = typeof config.canaryScopes === 'string'
      ? JSON.parse(config.canaryScopes)
      : config.canaryScopes;
  }

  return {
    config: {
      id: config?.id || null,
      key: config?.key || 'default',
      enabled: config?.enabled || false,
      failClosed: config?.failClosed !== false,
      activationMode: config?.activationMode || 'DISABLED',
      perRunRequestLimit: config?.perRunRequestLimit,
      dailyRequestLimit: config?.dailyRequestLimit,
      monthlyRequestLimit: config?.monthlyRequestLimit,
      canaryPerRunRequestLimit: config?.canaryPerRunRequestLimit,
      canaryDailyRequestLimit: config?.canaryDailyRequestLimit,
      canaryMonthlyRequestLimit: config?.canaryMonthlyRequestLimit,
      canaryScopes: parsedScopes,
    },
    dataSource: source
      ? {
          id: source.id,
          name: source.name,
          type: source.type,
          enabled: source.enabled,
          healthStatus: source.healthStatus,
          baseUrl: source.baseUrl,
        }
      : null,
    credential: {
      configured: credStatus.configured,
      envVarName: credStatus.envVarName,
    },
    usageCount,
    cacheCount,
    googleStateCount: stateCount,
  };
}

export async function prepareCanary(prisma) {
  console.log('[configure-canary] Running PREPARE...');

  const config = await prisma.googleCollectionConfig.findFirst({
    where: { key: 'default' },
  });

  if (!config) {
    throw new Error('CONFIG_NOT_FOUND: GoogleCollectionConfig default row missing');
  }

  const source = await prisma.dataSource.findFirst({
    where: { type: 'google_places' },
  });

  if (!source) {
    throw new Error('SOURCE_NOT_FOUND: google_places DataSource missing');
  }

  // Persist exact approved canary scope and limits while keeping DISABLED
  const updatedConfig = await prisma.googleCollectionConfig.update({
    where: { key: 'default' },
    data: {
      canaryScopes: APPROVED_CANARY_SCOPES,
      canaryPerRunRequestLimit: 3,
      canaryDailyRequestLimit: 5,
      // Invariants: MUST remain disabled in PREPARE mode
      enabled: false,
      activationMode: 'DISABLED',
      failClosed: true,
    },
  });

  // Ensure Google DataSource also remains disabled
  if (source.enabled) {
    await prisma.dataSource.update({
      where: { id: source.id },
      data: { enabled: false },
    });
  }

  console.log('[configure-canary] PREPARE complete. Scope persisted:', JSON.stringify(APPROVED_CANARY_SCOPES));
  console.log('[configure-canary] Verification: config.enabled=false, activationMode=DISABLED, source.enabled=false');

  return {
    status: 'PREPARED',
    config: updatedConfig,
    scopes: APPROVED_CANARY_SCOPES,
  };
}

export async function activateCanary(prisma) {
  console.log('[configure-canary] Running ACTIVATE (Future 5C.2 only)...');

  // Confirmation gate
  if (process.env.GOOGLE_CANARY_ACTIVATE_CONFIRM !== 'true') {
    throw new Error('ACTIVATION_NOT_CONFIRMED: Set GOOGLE_CANARY_ACTIVATE_CONFIRM=true to authorize live canary activation');
  }

  const config = await prisma.googleCollectionConfig.findFirst({
    where: { key: 'default' },
  });
  const source = await prisma.dataSource.findFirst({
    where: { type: 'google_places' },
  });

  if (!config || !source) {
    throw new Error('CONFIG_OR_SOURCE_NOT_FOUND');
  }

  // Expected baseline checks before activating
  if (config.activationMode === 'PRODUCTION') {
    throw new Error('INVALID_ACTIVATION: Cannot activate canary when config is in PRODUCTION mode');
  }

  // Validate scope
  let scopes = config.canaryScopes;
  if (typeof scopes === 'string') scopes = JSON.parse(scopes);
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('INVALID_CANARY_SCOPES: Empty or missing canaryScopes');
  }

  const validScope = scopes.some(
    s =>
      s.countryCode?.toUpperCase() === 'GB' &&
      s.city?.toLowerCase() === 'manchester' &&
      s.categorySlug?.toLowerCase() === 'dental'
  );
  if (!validScope) {
    throw new Error('INVALID_CANARY_SCOPES: Only GB/Manchester/dental is approved');
  }

  // Validate limits
  if ((config.canaryPerRunRequestLimit || 0) > CANARY_LIMIT_CAPS.maxPerRun) {
    throw new Error(`LIMIT_VIOLATION: canaryPerRunRequestLimit exceeds cap ${CANARY_LIMIT_CAPS.maxPerRun}`);
  }
  if ((config.canaryDailyRequestLimit || 0) > CANARY_LIMIT_CAPS.maxDaily) {
    throw new Error(`LIMIT_VIOLATION: canaryDailyRequestLimit exceeds cap ${CANARY_LIMIT_CAPS.maxDaily}`);
  }

  // Single atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const updatedConfig = await tx.googleCollectionConfig.update({
      where: { key: 'default' },
      data: {
        enabled: true,
        activationMode: 'CANARY',
        failClosed: true,
      },
    });

    const updatedSource = await tx.dataSource.update({
      where: { id: source.id },
      data: {
        enabled: true,
      },
    });

    return { config: updatedConfig, source: updatedSource };
  });

  console.log('[configure-canary] ACTIVATE complete: config.enabled=true, activationMode=CANARY, source.enabled=true');
  return { status: 'ACTIVATED', ...result };
}

export async function deactivateCanary(prisma) {
  console.log('[configure-canary] Running DEACTIVATE (Fail-safe cleanup)...');

  const config = await prisma.googleCollectionConfig.findFirst({
    where: { key: 'default' },
  });
  const source = await prisma.dataSource.findFirst({
    where: { type: 'google_places' },
  });

  const result = await prisma.$transaction(async (tx) => {
    let updatedConfig = null;
    let updatedSource = null;

    if (config) {
      updatedConfig = await tx.googleCollectionConfig.update({
        where: { key: 'default' },
        data: {
          enabled: false,
          activationMode: 'DISABLED',
          failClosed: true,
        },
      });
    }

    if (source) {
      updatedSource = await tx.dataSource.update({
        where: { id: source.id },
        data: {
          enabled: false,
        },
      });
    }

    return { config: updatedConfig, source: updatedSource };
  });

  console.log('[configure-canary] DEACTIVATE complete: config.enabled=false, activationMode=DISABLED, source.enabled=false');
  return { status: 'DEACTIVATED', ...result };
}

async function main() {
  const args = process.argv.slice(2);
  const prisma = new PrismaClient();

  try {
    if (args.includes('--prepare')) {
      const res = await prepareCanary(prisma);
      console.log(JSON.stringify(res, null, 2));
    } else if (args.includes('--activate')) {
      const res = await activateCanary(prisma);
      console.log(JSON.stringify(res, null, 2));
    } else if (args.includes('--deactivate')) {
      const res = await deactivateCanary(prisma);
      console.log(JSON.stringify(res, null, 2));
    } else if (args.includes('--status')) {
      const status = await getCanaryStatus(prisma);
      console.log('=== GOOGLE CANARY STATUS ===');
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('Usage: node configure-google-canary.mjs [--prepare | --activate | --deactivate | --status]');
      process.exit(1);
    }
  } catch (err) {
    console.error('[configure-canary] ERROR:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith('configure-google-canary.mjs')) {
  main();
}
