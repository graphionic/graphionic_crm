import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GoogleGuardrailsClient from "@/components/collector/GoogleGuardrailsClient";

export const dynamic = "force-dynamic";

export default async function SettingsGooglePage() {
  await requireActiveUser();

  const [config, source, usageCount, usageReserved, cacheCount, usages, caches] = await Promise.all([
    prisma.googleCollectionConfig.findFirst(),
    prisma.dataSource.findFirst({ where: { type: "google_places" } }),
    prisma.googleApiUsage.count(),
    prisma.googleApiUsage.count({ where: { status: "RESERVED" } }),
    prisma.googleApiCache.count(),
    prisma.googleApiUsage.findMany({
      include: { collectorRun: { include: { location: true, category: true } } },
      orderBy: { reservedAt: "desc" },
      take: 10,
    }),
    prisma.googleApiCache.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const hasApiKey = Boolean(process.env.GOOGLE_MAPS_API_KEY);

  // Safe browser projection — zero secrets, zero API key fragments
  const safeUsages = usages.map(u => ({
    id: u.id,
    operation: u.operation,
    status: u.status,
    reservedAt: u.reservedAt ? u.reservedAt.toISOString() : null,
    completedAt: u.completedAt ? u.completedAt.toISOString() : null,
    latencyMs: (u.metadata as any)?.latencyMs || null,
    httpStatus: (u.metadata as any)?.httpStatus || null,
    resultCount: (u.metadata as any)?.resultCount != null ? (u.metadata as any).resultCount : null,
    activityType: (u.metadata as any)?.controlledProbe ? "Controlled Probe" : (u.metadata as any)?.canary ? "Canary Execution" : "Collection",
    city: u.collectorRun?.location?.city || null,
    countryCode: u.collectorRun?.location?.countryCode || null,
    category: u.collectorRun?.category?.slug || u.collectorRun?.category?.name || null,
    collectorRunId: u.collectorRunId,
  }));

  const safeCaches = caches.map(c => ({
    id: c.id,
    queryFingerprint: c.queryFingerprint,
    operation: c.operation,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    hitCount: c.hitCount,
    createdAt: c.createdAt ? c.createdAt.toISOString() : null,
    placesCount: Array.isArray((c.responseMetadata as any)?.places)
      ? (c.responseMetadata as any).places.length
      : ((c.responseMetadata as any)?.resultCount != null ? (c.responseMetadata as any).resultCount : null),
  }));

  return (
    <GoogleGuardrailsClient
      config={config}
      source={source}
      usageCount={usageCount}
      usageReserved={usageReserved}
      cacheCount={cacheCount}
      usages={safeUsages}
      caches={safeCaches}
      hasApiKey={hasApiKey}
      showHeader={true}
    />
  );
}
