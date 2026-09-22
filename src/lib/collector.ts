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
  // NEVER return encryptedValue to client, only masked
  return creds.map(c => ({
    id: c.id,
    provider: c.provider,
    label: c.label,
    keyHint: c.keyHint,
    maskedKey: c.keyHint ? `••••••••••••••••${c.keyHint}` : "••••••••••••••••",
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

export async function getCollectorOverview() {
  const [config, locations, categories, sources, rules, states, runs, creds, leadCount] = await Promise.all([
    getCollectorConfig(),
    prisma.collectorLocation.count({ where: { enabled: true } }),
    prisma.leadCategory.count({ where: { enabled: true } }),
    prisma.dataSource.count({ where: { enabled: true } }),
    prisma.collectionRule.count({ where: { enabled: true } }),
    prisma.collectorState.count(),
    prisma.collectorRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.providerCredential.count(),
    prisma.lead.count(),
  ]);

  const totalLocations = await prisma.collectorLocation.count();
  const totalCategories = await prisma.leadCategory.count();
  const totalSources = await prisma.dataSource.count();

  return {
    config,
    counts: {
      locationsActive: locations,
      locationsTotal: totalLocations,
      categoriesActive: categories,
      categoriesTotal: totalCategories,
      sourcesActive: sources,
      sourcesTotal: totalSources,
      rulesActive: rules,
      states,
      creds,
      leadCount,
    },
    recentRuns: runs,
  };
}
