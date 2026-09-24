import "server-only";
import { prisma } from "./prisma";
import { z } from "zod";
import { encryptCredential, decryptCredential, maskCredential, getKeyHint } from "./collector-crypto";

// ---- Validation Schemas ----

export const collectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  collectionMode: z.enum(["continuous", "scheduled", "manual"]).default("continuous"),
  defaultBatchSize: z.number().int().min(1).max(200).default(25),
  defaultQueryLimit: z.number().int().min(1).max(500).default(50),
  concurrentRequests: z.number().int().min(1).max(50).default(15),
  requestTimeoutMs: z.number().int().min(1000).max(120000).default(25000),
  retryCount: z.number().int().min(0).max(10).default(3),
  cooldownMs: z.number().int().min(0).max(60000).default(7000),
  collectionFrequencyMinutes: z.number().int().min(1).max(1440).default(15),
  verificationEnabled: z.boolean().default(true),
  emailRequired: z.boolean().default(true),
  websiteFilteringEnabled: z.boolean().default(true),
  duplicateFilteringEnabled: z.boolean().default(true),
});

export const locationSchema = z.object({
  country: z.string().min(2).max(100),
  countryCode: z.string().min(2).max(10).toUpperCase(),
  state: z.string().max(100).nullable().optional(),
  city: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  radiusKm: z.number().int().min(1).max(500).default(25),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  priorityLabel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).nullable().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  priorityLabel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  osmTags: z.any().nullable().optional(), // JSON array of OSM tags
  queryConfig: z.any().nullable().optional(),
  runLimit: z.number().int().min(1).max(1000).nullable().optional(),
});

export const dataSourceSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.string().min(2).max(50), // overpass | google_places | custom
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  baseUrl: z.string().url(),
  timeoutMs: z.number().int().min(1000).max(120000).default(25000),
  retryCount: z.number().int().min(0).max(10).default(3),
  concurrency: z.number().int().min(1).max(50).default(15),
  config: z.any().nullable().optional(),
  healthStatus: z.enum(["healthy", "degraded", "down", "unknown"]).default("unknown"),
});

export const credentialSchema = z.object({
  provider: z.string().min(2).max(50), // openai, google_maps, etc
  label: z.string().max(100).nullable().optional(),
  apiKey: z.string().min(8).max(500), // raw key from UI, will be encrypted
  enabled: z.boolean().default(true),
});

export const ruleSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  enabled: z.boolean().default(true),
  category: z.string().min(2).max(50).default("lead_requirements"),
  config: z.any().nullable().optional(),
});

// ---- Collector Config ----

export async function getCollectorConfig() {
  let config = await prisma.collectorConfig.findUnique({ where: { key: "default" } });
  if (!config) {
    config = await prisma.collectorConfig.create({
      data: { key: "default" },
    });
  }
  return config;
}

export async function updateCollectorConfig(data: z.infer<typeof collectorConfigSchema>) {
  const parsed = collectorConfigSchema.parse(data);
  return prisma.collectorConfig.upsert({
    where: { key: "default" },
    create: { key: "default", ...parsed },
    update: parsed,
  });
}

// ---- Locations ----

export async function getLocations(params?: { search?: string; enabled?: boolean; countryCode?: string }) {
  const where: any = {};
  if (params?.search) {
    where.OR = [
      { city: { contains: params.search, mode: "insensitive" } },
      { country: { contains: params.search, mode: "insensitive" } },
      { state: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.enabled !== undefined) where.enabled = params.enabled;
  if (params?.countryCode) where.countryCode = params.countryCode;

  return prisma.collectorLocation.findMany({
    where,
    orderBy: [{ priority: "desc" }, { country: "asc" }, { city: "asc" }],
  });
}

export async function createLocation(data: z.infer<typeof locationSchema>) {
  const parsed = locationSchema.parse(data);
  return prisma.collectorLocation.create({ data: parsed });
}

export async function updateLocation(id: string, data: Partial<z.infer<typeof locationSchema>>) {
  const parsed = locationSchema.partial().parse(data);
  return prisma.collectorLocation.update({ where: { id }, data: parsed });
}

export async function deleteLocation(id: string) {
  return prisma.collectorLocation.delete({ where: { id } });
}

export async function toggleLocation(id: string) {
  const loc = await prisma.collectorLocation.findUnique({ where: { id } });
  if (!loc) throw new Error("Location not found");
  return prisma.collectorLocation.update({ where: { id }, data: { enabled: !loc.enabled } });
}

// ---- Categories ----

export async function getCategories(params?: { search?: string; enabled?: boolean }) {
  const where: any = {};
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { slug: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.enabled !== undefined) where.enabled = params.enabled;

  return prisma.leadCategory.findMany({
    where,
    orderBy: [{ priority: "desc" }, { name: "asc" }],
  });
}

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const parsed = categorySchema.parse(data);
  return prisma.leadCategory.create({ data: parsed });
}

export async function updateCategory(id: string, data: Partial<z.infer<typeof categorySchema>>) {
  const parsed = categorySchema.partial().parse(data);
  return prisma.leadCategory.update({ where: { id }, data: parsed });
}

export async function deleteCategory(id: string) {
  return prisma.leadCategory.delete({ where: { id } });
}

export async function toggleCategory(id: string) {
  const cat = await prisma.leadCategory.findUnique({ where: { id } });
  if (!cat) throw new Error("Category not found");
  return prisma.leadCategory.update({ where: { id }, data: { enabled: !cat.enabled } });
}

// ---- Data Sources ----

export async function getDataSources() {
  return prisma.dataSource.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }],
  });
}

export async function createDataSource(data: z.infer<typeof dataSourceSchema>) {
  const parsed = dataSourceSchema.parse(data);
  return prisma.dataSource.create({ data: parsed });
}

export async function updateDataSource(id: string, data: Partial<z.infer<typeof dataSourceSchema>>) {
  const parsed = dataSourceSchema.partial().parse(data);
  return prisma.dataSource.update({ where: { id }, data: parsed });
}

export async function deleteDataSource(id: string) {
  return prisma.dataSource.delete({ where: { id } });
}

export async function toggleDataSource(id: string) {
  const ds = await prisma.dataSource.findUnique({ where: { id } });
  if (!ds) throw new Error("DataSource not found");
  return prisma.dataSource.update({ where: { id }, data: { enabled: !ds.enabled } });
}

// ---- Provider Credentials (Secure) ----

export async function getProviderCredentials() {
  const creds = await prisma.providerCredential.findMany({
    orderBy: [{ provider: "asc" }],
  });
  // Return safe projection for browser consumption — zero secret fragments
  return creds.map(c => ({
    id: c.id,
    provider: c.provider,
    label: c.label,
    configured: true,
    enabled: c.enabled,
    status: c.status,
    lastUsedAt: c.lastUsedAt,
    lastTestedAt: c.lastTestedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export async function getProviderCredentialRaw(provider: string, label?: string) {
  // Server-side only, for worker consumption
  const where: any = { provider };
  if (label) where.label = label;
  const cred = await prisma.providerCredential.findFirst({ where });
  if (!cred) return null;
  try {
    const decrypted = decryptCredential(cred.encryptedValue);
    return { ...cred, decryptedValue: decrypted };
  } catch {
    return { ...cred, decryptedValue: null };
  }
}

export async function createOrUpdateCredential(data: z.infer<typeof credentialSchema>) {
  const parsed = credentialSchema.parse(data);
  const encrypted = encryptCredential(parsed.apiKey);
  const hint = getKeyHint(parsed.apiKey);

  return prisma.providerCredential.upsert({
    where: {
      provider_label: {
        provider: parsed.provider,
        label: parsed.label || "",
      },
    },
    create: {
      provider: parsed.provider,
      label: parsed.label || "",
      encryptedValue: encrypted,
      keyHint: hint,
      enabled: parsed.enabled,
      status: "configured",
    },
    update: {
      encryptedValue: encrypted,
      keyHint: hint,
      enabled: parsed.enabled,
      status: "configured",
      lastTestedAt: new Date(),
    },
  });
}

export async function deleteCredential(id: string) {
  return prisma.providerCredential.delete({ where: { id } });
}

export async function toggleCredential(id: string) {
  const cred = await prisma.providerCredential.findUnique({ where: { id } });
  if (!cred) throw new Error("Credential not found");
  return prisma.providerCredential.update({ where: { id }, data: { enabled: !cred.enabled } });
}

export async function testCredential(id: string) {
  // Foundation only — do not actually call OpenAI yet, just update lastTestedAt
  // Future phases will implement actual provider test
  const cred = await prisma.providerCredential.findUnique({ where: { id } });
  if (!cred) throw new Error("Credential not found");

  // For now, just mark as tested, status stays configured
  // Do NOT decrypt and log
  return prisma.providerCredential.update({
    where: { id },
    data: {
      lastTestedAt: new Date(),
      status: "connected", // foundation — assume connected after test
    },
  });
}

// ---- Collection Rules ----

export async function getCollectionRules() {
  return prisma.collectionRule.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
}

export async function createRule(data: z.infer<typeof ruleSchema>) {
  const parsed = ruleSchema.parse(data);
  return prisma.collectionRule.create({ data: parsed });
}

export async function updateRule(id: string, data: Partial<z.infer<typeof ruleSchema>>) {
  const parsed = ruleSchema.partial().parse(data);
  return prisma.collectionRule.update({ where: { id }, data: parsed });
}

export async function deleteRule(id: string) {
  return prisma.collectionRule.delete({ where: { id } });
}

export async function toggleRule(id: string) {
  const rule = await prisma.collectionRule.findUnique({ where: { id } });
  if (!rule) throw new Error("Rule not found");
  return prisma.collectionRule.update({ where: { id }, data: { enabled: !rule.enabled } });
}

// ---- Collector State & Runs ----

export async function getCollectorStates() {
  return prisma.collectorState.findMany({
    include: { location: true, category: true, source: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function getCollectorRuns(params?: { status?: string; limit?: number }) {
  const where: any = {};
  if (params?.status) where.status = params.status;
  return prisma.collectorRun.findMany({
    where,
    include: { location: true, category: true, source: true },
    orderBy: { startedAt: "desc" },
    take: params?.limit || 50,
  });
}

// Phase 4C.1 — Next assignment prediction and yield metrics
export async function getNextAssignmentPrediction() {
  const enabledLocations = await prisma.collectorLocation.findMany({ where: { enabled: true } });
  const enabledCategories = await prisma.leadCategory.findMany({ where: { enabled: true } });
  const enabledSources = await prisma.dataSource.findMany({ where: { enabled: true, NOT: { healthStatus: "down" } } });

  // Sort with nulls first for fairness
  enabledLocations.sort((a: any, b: any) => {
    const aLast = a.lastCollectedAt ? new Date(a.lastCollectedAt).getTime() : 0;
    const bLast = b.lastCollectedAt ? new Date(b.lastCollectedAt).getTime() : 0;
    const aNull = a.lastCollectedAt == null;
    const bNull = b.lastCollectedAt == null;
    if (aNull && !bNull) return -1;
    if (!aNull && bNull) return 1;
    if (aLast !== bLast) return aLast - bLast;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return (a.city || "").localeCompare(b.city || "");
  });
  enabledCategories.sort((a: any, b: any) => {
    const aLast = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
    const bLast = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
    const aNull = a.lastRunAt == null;
    const bNull = b.lastRunAt == null;
    if (aNull && !bNull) return -1;
    if (!aNull && bNull) return 1;
    if (aLast !== bLast) return aLast - bLast;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return (a.slug || "").localeCompare(b.slug || "");
  });
  const healthOrder: any = { healthy: 0, degraded: 1, unknown: 2, down: 3 };
  enabledSources.sort((a: any, b: any) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const aHealth = healthOrder[a.healthStatus] ?? 2;
    const bHealth = healthOrder[b.healthStatus] ?? 2;
    if (aHealth !== bHealth) return aHealth - bHealth;
    return (a.name || "").localeCompare(b.name || "");
  });

  const existingStates = await prisma.collectorState.findMany({
    where: {
      locationId: { in: enabledLocations.map((l: any) => l.id) },
      categoryId: { in: enabledCategories.map((c: any) => c.id) },
      sourceId: { in: enabledSources.map((s: any) => s.id) },
    },
    include: { location: true, category: true, source: true },
  });
  const existingSet = new Set(existingStates.map((s: any) => `${s.locationId}|${s.categoryId}|${s.sourceId}`));

  // Missing combos
  const locSlice = enabledLocations.slice(0, 100);
  const catSlice = enabledCategories.slice(0, 20);
  const srcSlice = enabledSources.slice(0, 5);
  const missingCombos: any[] = [];
  for (const loc of locSlice) {
    for (const cat of catSlice) {
      for (const src of srcSlice) {
        const key = `${loc.id}|${cat.id}|${src.id}`;
        if (!existingSet.has(key)) {
          missingCombos.push({ loc, cat, src, key });
        }
      }
    }
  }

  if (missingCombos.length) {
    missingCombos.sort((a: any, b: any) => {
      if (a.cat.priority !== b.cat.priority) return b.cat.priority - a.cat.priority;
      if (a.src.priority !== b.src.priority) return b.src.priority - a.src.priority;
      const aLocLast = a.loc.lastCollectedAt ? new Date(a.loc.lastCollectedAt).getTime() : 0;
      const bLocLast = b.loc.lastCollectedAt ? new Date(b.loc.lastCollectedAt).getTime() : 0;
      const aLocNull = a.loc.lastCollectedAt == null;
      const bLocNull = b.loc.lastCollectedAt == null;
      if (aLocNull && !bLocNull) return -1;
      if (!aLocNull && bLocNull) return 1;
      if (aLocLast !== bLocLast) return aLocLast - bLocLast;
      if (a.loc.priority !== b.loc.priority) return b.loc.priority - a.loc.priority;
      const slugCmp = (a.cat.slug || "").localeCompare(b.cat.slug || "");
      if (slugCmp !== 0) return slugCmp;
      return (a.loc.city || "").localeCompare(b.loc.city || "");
    });
    const next = missingCombos[0];
    return {
      type: "missing",
      location: next.loc,
      category: next.cat,
      source: next.src,
      totalMissing: missingCombos.length,
      totalExisting: existingSet.size,
    };
  }

  // No missing, check eligible
  const now = new Date();
  let eligibleStates = await prisma.collectorState.findMany({
    where: {
      locationId: { in: enabledLocations.map((l: any) => l.id) },
      categoryId: { in: enabledCategories.map((c: any) => c.id) },
      sourceId: { in: enabledSources.map((s: any) => s.id) },
      OR: [{ nextEligibleRunAt: null }, { nextEligibleRunAt: { lte: now } }],
    },
    include: { location: true, category: true, source: true },
  });
  eligibleStates.sort((a: any, b: any) => {
    const nextA = a.nextEligibleRunAt ? new Date(a.nextEligibleRunAt).getTime() : 0;
    const nextB = b.nextEligibleRunAt ? new Date(b.nextEligibleRunAt).getTime() : 0;
    const nextANull = a.nextEligibleRunAt == null;
    const nextBNull = b.nextEligibleRunAt == null;
    if (nextANull && !nextBNull) return -1;
    if (!nextANull && nextBNull) return 1;
    if (nextA !== nextB) return nextA - nextB;
    const lastA = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
    const lastB = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
    const lastANull = a.lastRunAt == null;
    const lastBNull = b.lastRunAt == null;
    if (lastANull && !lastBNull) return -1;
    if (!lastANull && lastBNull) return 1;
    if (lastA !== lastB) return lastA - lastB;
    return 0;
  });
  if (eligibleStates.length) {
    const next = eligibleStates[0];
    return {
      type: "eligible",
      location: next.location,
      category: next.category,
      source: next.source,
      state: next,
      totalEligible: eligibleStates.length,
    };
  }

  const nextEligibleState = await prisma.collectorState.findFirst({
    where: {
      locationId: { in: enabledLocations.map((l: any) => l.id) },
      categoryId: { in: enabledCategories.map((c: any) => c.id) },
      sourceId: { in: enabledSources.map((s: any) => s.id) },
    },
    orderBy: { nextEligibleRunAt: "asc" },
    include: { location: true, category: true, source: true },
  });
  if (nextEligibleState) {
    return {
      type: "future",
      location: nextEligibleState.location,
      category: nextEligibleState.category,
      source: nextEligibleState.source,
      state: nextEligibleState,
      nextEligibleAt: nextEligibleState.nextEligibleRunAt,
    };
  }
  return null;
}

export async function getCollectorOverview() {
  const [config, locationsActive, categoriesActive, sourcesActive, rulesActive, statesCount, runs, creds, leadCount, totalLocations, totalCategories, totalSources, allSources, allStates, recentRunsWithMeta, candidateCount, candidatesByStatus] = await Promise.all([
    getCollectorConfig(),
    prisma.collectorLocation.count({ where: { enabled: true } }),
    prisma.leadCategory.count({ where: { enabled: true } }),
    prisma.dataSource.count({ where: { enabled: true } }),
    prisma.collectionRule.count({ where: { enabled: true } }),
    prisma.collectorState.count(),
    prisma.collectorRun.findMany({ orderBy: { startedAt: "desc" }, take: 5, include: { location: true, category: true, source: true } }),
    prisma.providerCredential.count(),
    prisma.lead.count(),
    prisma.collectorLocation.count(),
    prisma.leadCategory.count(),
    prisma.dataSource.count(),
    prisma.dataSource.findMany({ orderBy: [{ priority: "desc" }] }),
    prisma.collectorState.findMany({ include: { location: true, category: true, source: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.collectorRun.findMany({ orderBy: { startedAt: "desc" }, take: 20, include: { location: true, category: true, source: true } }),
    prisma.leadCandidate.count(),
    prisma.leadCandidate.groupBy({ by: ['status'], _count: { status: true } }),
  ]);

  const healthBreakdown = {
    healthy: allSources.filter((s: any) => s.healthStatus === "healthy").length,
    degraded: allSources.filter((s: any) => s.healthStatus === "degraded").length,
    down: allSources.filter((s: any) => s.healthStatus === "down").length,
    unknown: allSources.filter((s: any) => s.healthStatus === "unknown").length,
  };

  let totalRaw = 0, totalParsed = 0, totalEmailPresent = 0, totalAccepted = 0, totalInserted = 0, totalNoEmail = 0, totalWebsiteRejected = 0, totalRetries = 0;
  let totalCandidatesPersisted = 0, totalNeedingEnrichment = 0, totalCandidatesRejected = 0, totalCandidatesQualified = 0;
  for (const r of recentRunsWithMeta) {
    const meta: any = r.metadata || {};
    totalRaw += r.candidatesFound || 0;
    totalParsed += meta.parsedCount || 0;
    totalEmailPresent += meta.emailPresentCount || 0;
    totalAccepted += r.leadsAccepted || 0;
    totalInserted += r.leadsInserted || 0;
    totalNoEmail += r.noEmailRejected || 0;
    totalWebsiteRejected += r.websiteRejected || 0;
    totalRetries += meta.fetchResult?.retryDelays?.length || 0;
    totalCandidatesPersisted += meta.candidatesPersisted || 0;
    totalNeedingEnrichment += meta.candidatesNeedingEnrichment || 0;
    totalCandidatesRejected += meta.candidatesRejected || 0;
    totalCandidatesQualified += meta.candidatesQualified || 0;
  }
  const avgEmailPresenceRate = totalParsed ? (totalEmailPresent / totalParsed) : 0;
  const avgAcceptanceRate = totalParsed ? (totalAccepted / totalParsed) : 0;

  const nextAssignment = await getNextAssignmentPrediction();

  const now = new Date();
  const eligibleNow = allStates.filter((s: any) => !s.nextEligibleRunAt || new Date(s.nextEligibleRunAt) <= now).length;

  const candidateBreakdown: any = {};
  for (const g of candidatesByStatus) {
    candidateBreakdown[g.status] = g._count.status;
  }

  return {
    config,
    counts: {
      locationsActive,
      locationsTotal: totalLocations,
      categoriesActive,
      categoriesTotal: totalCategories,
      sourcesActive,
      sourcesTotal: totalSources,
      rulesActive,
      states: statesCount,
      creds,
      leadCount,
      eligibleNow,
      candidateCount,
    },
    recentRuns: runs,
    healthBreakdown,
    yieldMetrics: {
      totalRaw,
      totalParsed,
      totalEmailPresent,
      totalAccepted,
      totalInserted,
      totalNoEmail,
      totalWebsiteRejected,
      totalRetries,
      avgEmailPresenceRate,
      avgAcceptanceRate,
      totalCandidatesPersisted,
      totalNeedingEnrichment,
      totalCandidatesRejected,
      totalCandidatesQualified,
    },
    candidateBreakdown,
    nextAssignment,
    allSources: allSources.slice(0, 10),
    allStates: allStates.slice(0, 20),
  };
}

// ---- Phase 4C.2B Candidate Queue Data Layer ----

export async function getLeadCandidateStats() {
  const [total, byStatus, byRejection, byCategory, recentCount] = await Promise.all([
    prisma.leadCandidate.count(),
    prisma.leadCandidate.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.leadCandidate.groupBy({ by: ['rejectionReason'], where: { status: 'REJECTED' }, _count: { rejectionReason: true } }),
    prisma.leadCandidate.groupBy({ by: ['businessCategory'], _count: { businessCategory: true }, orderBy: { _count: { businessCategory: 'desc' } }, take: 20 }),
    prisma.leadCandidate.count({ where: { createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } } }),
  ]);

  const breakdown: Record<string, number> = {};
  for (const g of byStatus) breakdown[g.status] = g._count.status;

  const rejectionBreakdown: Record<string, number> = {};
  for (const g of byRejection) {
    if (g.rejectionReason) rejectionBreakdown[g.rejectionReason] = g._count.rejectionReason;
  }

  return {
    total,
    breakdown,
    rejectionBreakdown,
    byCategory,
    recent24h: recentCount,
    counts: {
      DISCOVERED: breakdown.DISCOVERED || 0,
      NEEDS_ENRICHMENT: breakdown.NEEDS_ENRICHMENT || 0,
      VERIFICATION_PENDING: breakdown.VERIFICATION_PENDING || 0,
      QUALIFIED: breakdown.QUALIFIED || 0,
      REJECTED: breakdown.REJECTED || 0,
    }
  };
}

export async function getLeadCandidatesPaginated(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category?: string;
  city?: string;
  sourceId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (params.status && params.status !== 'All') {
    where.status = params.status;
  }
  if (params.category && params.category !== 'All') {
    where.businessCategory = params.category;
  }
  if (params.city && params.city !== 'All') {
    where.city = { contains: params.city, mode: 'insensitive' };
  }
  if (params.sourceId && params.sourceId !== 'All') {
    where.discoverySourceId = params.sourceId;
  }
  if (params.search) {
    const s = params.search.trim();
    if (s) {
      where.OR = [
        { companyName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { country: { contains: s, mode: 'insensitive' } },
        { externalId: { contains: s, mode: 'insensitive' } },
      ];
    }
  }

  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder || 'desc';
  const allowedSort = ['createdAt', 'companyName', 'status', 'city', 'businessCategory'];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

  const [total, candidates] = await Promise.all([
    prisma.leadCandidate.count({ where }),
    prisma.leadCandidate.findMany({
      where,
      orderBy: { [orderByField]: sortOrder },
      skip,
      take: pageSize,
      select: {
        id: true,
        companyName: true,
        businessCategory: true,
        city: true,
        country: true,
        email: true,
        phone: true,
        website: true,
        externalId: true,
        externalType: true,
        status: true,
        rejectionReason: true,
        discoverySourceId: true,
        discoveryRunId: true,
        qualifiedLeadId: true,
        createdAt: true,
        updatedAt: true,
        discoverySource: { select: { id: true, name: true, type: true } },
        discoveryRun: { select: { id: true, startedAt: true, location: { select: { city: true, countryCode: true } }, category: { select: { slug: true } } } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    candidates,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// Keep backward compat for any existing callers
export async function getLeadCandidates(params?: { status?: string; limit?: number; city?: string; category?: string; search?: string }) {
  const result = await getLeadCandidatesPaginated({
    status: params?.status,
    city: params?.city,
    category: params?.category,
    search: params?.search,
    page: 1,
    pageSize: params?.limit || 50,
  });
  return result.candidates;
}

export async function getLeadCandidateById(id: string) {
  return prisma.leadCandidate.findUnique({
    where: { id },
    include: {
      discoverySource: true,
      discoveryRun: { include: { location: true, category: true, source: true } },
      qualifiedLead: true,
      enrichmentJob: true,
      enrichmentAttemptRecords: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { providerCredential: { select: { provider: true, label: true, keyHint: true } } },
      },
    },
  });
}
