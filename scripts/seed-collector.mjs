import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Collector Config Foundation — Phase 4A");

  // 1. CollectorConfig singleton
  const config = await prisma.collectorConfig.upsert({
    where: { key: "default" },
    create: {
      key: "default",
      enabled: true,
      collectionMode: "continuous",
      defaultBatchSize: 25,
      defaultQueryLimit: 50,
      concurrentRequests: 15,
      requestTimeoutMs: 25000,
      retryCount: 3,
      cooldownMs: 7000,
      collectionFrequencyMinutes: 15,
      verificationEnabled: true,
      emailRequired: true,
      websiteFilteringEnabled: true,
      duplicateFilteringEnabled: true,
      metadata: {
        version: "4A",
        description: "Foundation for continuous acquisition, admin controls dynamic instead of editing Python source",
        flow: "Config -> Neon -> Scheduled Worker -> Read active config -> Collect -> Verify -> Store in Neon -> AI later"
      }
    },
    update: {},
  });
  console.log("✓ CollectorConfig", config.id);

  // 2. Locations — dynamic records, not hardcoded ukEnabled flags
  const locations = [
    { country: "United States", countryCode: "US", state: "Texas", city: "Houston", latitude: 29.7604, longitude: -95.3698, radiusKm: 25, priority: 90, priorityLabel: "HIGH" },
    { country: "United Kingdom", countryCode: "GB", state: "England", city: "Manchester", latitude: 53.4808, longitude: -2.2426, radiusKm: 25, priority: 90, priorityLabel: "HIGH" },
    { country: "United Arab Emirates", countryCode: "AE", state: "Dubai", city: "Dubai", latitude: 25.2048, longitude: 55.2708, radiusKm: 25, priority: 80, priorityLabel: "HIGH" },
    { country: "Australia", countryCode: "AU", state: "Victoria", city: "Melbourne", latitude: -37.8136, longitude: 144.9631, radiusKm: 25, priority: 70, priorityLabel: "MEDIUM" },
    { country: "India", countryCode: "IN", state: "Gujarat", city: "Surat", latitude: 21.1702, longitude: 72.8311, radiusKm: 25, priority: 80, priorityLabel: "HIGH" },
    { country: "United Kingdom", countryCode: "GB", state: "England", city: "London", latitude: 51.5074, longitude: -0.1278, radiusKm: 30, priority: 100, priorityLabel: "HIGH" },
    { country: "United States", countryCode: "US", state: "New York", city: "New York", latitude: 40.7128, longitude: -74.006, radiusKm: 30, priority: 100, priorityLabel: "HIGH" },
    { country: "Thailand", countryCode: "TH", state: "Bangkok", city: "Bangkok", latitude: 13.7563, longitude: 100.5018, radiusKm: 25, priority: 60, priorityLabel: "MEDIUM" },
  ];

  for (const loc of locations) {
    const existing = await prisma.collectorLocation.findFirst({ where: { city: loc.city, countryCode: loc.countryCode } });
    if (!existing) {
      await prisma.collectorLocation.create({ data: loc });
      console.log(`  ✓ Location ${loc.city}, ${loc.countryCode}`);
    }
  }

  // 3. Categories — dynamic, not hardcoded
  const categories = [
    { name: "Dental", slug: "dental", description: "Dental clinics and dentists", priority: 90, priorityLabel: "HIGH", osmTags: ['"healthcare"="dentist"', '"amenity"="dentist"'] },
    { name: "Eye Clinic", slug: "eye", description: "Opticians, ophthalmologists, optometrists", priority: 90, priorityLabel: "HIGH", osmTags: ['"healthcare"="ophthalmologist"', '"healthcare"="optometrist"', '"shop"="optician"'] },
    { name: "Pet Store", slug: "pet_store", description: "Pet shops and veterinary clinics", priority: 80, priorityLabel: "HIGH", osmTags: ['"shop"="pet"', '"amenity"="veterinary"'] },
    { name: "Hospital", slug: "hospital", description: "Hospitals and clinics", priority: 85, priorityLabel: "HIGH", osmTags: ['"amenity"="hospital"', '"amenity"="clinic"'] },
    { name: "Physio", slug: "physio", description: "Physiotherapists", priority: 70, priorityLabel: "MEDIUM", osmTags: ['"healthcare"="physiotherapist"'] },
    { name: "Orthopedic", slug: "orthopedic", description: "Orthopedics", priority: 60, priorityLabel: "MEDIUM", osmTags: ['"healthcare"="orthopedics"'] },
    { name: "IVF", slug: "ivf", description: "Fertility clinics", priority: 60, priorityLabel: "MEDIUM", osmTags: ['"healthcare"="fertility"'] },
  ];

  for (const cat of categories) {
    await prisma.leadCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description, priority: cat.priority, priorityLabel: cat.priorityLabel, osmTags: cat.osmTags },
    });
    console.log(`  ✓ Category ${cat.name}`);
  }

  // 4. Data Sources — extensible, not hardcoded to 3 endpoints
  const sources = [
    { name: "Overpass DE", type: "overpass", baseUrl: "https://overpass-api.de/api/interpreter", priority: 100, timeoutMs: 25000, retryCount: 3, concurrency: 15, healthStatus: "healthy" },
    { name: "Overpass Kumi", type: "overpass", baseUrl: "https://overpass.kumi.systems/api/interpreter", priority: 90, timeoutMs: 25000, retryCount: 3, concurrency: 15, healthStatus: "healthy" },
    { name: "Overpass Mail.ru", type: "overpass", baseUrl: "https://maps.mail.ru/osm/tools/overpass/api/interpreter", priority: 80, timeoutMs: 25000, retryCount: 3, concurrency: 15, healthStatus: "unknown" },
  ];

  for (const src of sources) {
    const existing = await prisma.dataSource.findFirst({ where: { baseUrl: src.baseUrl } });
    if (!existing) {
      await prisma.dataSource.create({ data: src });
      console.log(`  ✓ Source ${src.name}`);
    }
  }

  // 5. Collection Rules — extensible
  const rules = [
    { key: "require_email", name: "Require Email", description: "Lead must have email", category: "lead_requirements", enabled: true },
    { key: "require_no_website", name: "Require No Website", description: "Only NO_SITE leads", category: "lead_requirements", enabled: true },
    { key: "reject_generic", name: "Reject Generic Email Domains", description: "Reject gmail, yahoo, outlook etc", category: "lead_requirements", enabled: true },
    { key: "verify_email_domain_website", name: "Verify Email Domain Website", description: "Check if email domain has live website (Emma Clinic fix)", category: "verification", enabled: true },
    { key: "reject_existing_website", name: "Reject Existing Website", description: "Reject if website field present", category: "verification", enabled: true },
    { key: "deduplicate_leads", name: "Deduplicate Leads", description: "By email or company+city before insert", category: "deduplication", enabled: true },
    { key: "https_check", name: "HTTPS Check", description: "Check https://domain", category: "verification", enabled: true },
    { key: "http_fallback", name: "HTTP Fallback", description: "Fallback to http://domain if https fails", category: "verification", enabled: true },
    { key: "follow_redirects", name: "Follow Redirects", description: "Follow redirects during website verification", category: "verification", enabled: true },
  ];

  for (const rule of rules) {
    await prisma.collectionRule.upsert({
      where: { key: rule.key },
      create: rule,
      update: { name: rule.name, description: rule.description, category: rule.category, enabled: rule.enabled },
    });
    console.log(`  ✓ Rule ${rule.key}`);
  }

  console.log("\n✅ Phase 4A Seed Complete");
  console.log(`Config: 1, Locations: ${locations.length}, Categories: ${categories.length}, Sources: ${sources.length}, Rules: ${rules.length}`);
  console.log("ProviderCredential: 0 (foundation only, no AI execution, no OpenAI calls)");
  console.log("CollectorState: 0 (persistence only, worker consumption later)");
  console.log("CollectorRun: 0 (persistence only, worker will create records)");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
