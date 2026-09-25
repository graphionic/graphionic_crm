#!/usr/bin/env node
/**
 * ClientForge CRM — International Collection Expansion Script
 * Idempotently configures 30 active international locations across USA, UK, AU, CA, AE, NZ, TH
 * Disables India (Surat) from future collection while preserving historical data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INTERNATIONAL_LOCATIONS = [
  // USA (10)
  { country: "United States", countryCode: "US", state: "New York", city: "New York", latitude: 40.7128, longitude: -74.0060, radiusKm: 30, priority: 100, priorityLabel: "HIGH", enabled: true },
  { country: "United States", countryCode: "US", state: "Texas", city: "Houston", latitude: 29.7604, longitude: -95.3698, radiusKm: 25, priority: 90, priorityLabel: "HIGH", enabled: true },
  { country: "United States", countryCode: "US", state: "Texas", city: "Dallas", latitude: 32.7767, longitude: -96.7970, radiusKm: 25, priority: 85, priorityLabel: "HIGH", enabled: true },
  { country: "United States", countryCode: "US", state: "Texas", city: "Austin", latitude: 30.2672, longitude: -97.7431, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },
  { country: "United States", countryCode: "US", state: "Florida", city: "Miami", latitude: 25.7617, longitude: -80.1918, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },
  { country: "United States", countryCode: "US", state: "Florida", city: "Orlando", latitude: 28.5383, longitude: -81.3792, radiusKm: 25, priority: 75, priorityLabel: "MEDIUM", enabled: true },
  { country: "United States", countryCode: "US", state: "Illinois", city: "Chicago", latitude: 41.8781, longitude: -87.6298, radiusKm: 30, priority: 90, priorityLabel: "HIGH", enabled: true },
  { country: "United States", countryCode: "US", state: "Arizona", city: "Phoenix", latitude: 33.4484, longitude: -112.0740, radiusKm: 25, priority: 75, priorityLabel: "MEDIUM", enabled: true },
  { country: "United States", countryCode: "US", state: "California", city: "San Diego", latitude: 32.7157, longitude: -117.1611, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },
  { country: "United States", countryCode: "US", state: "Georgia", city: "Atlanta", latitude: 33.7490, longitude: -84.3880, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },

  // UK (8)
  { country: "United Kingdom", countryCode: "GB", state: "England", city: "London", latitude: 51.5074, longitude: -0.1278, radiusKm: 30, priority: 100, priorityLabel: "HIGH", enabled: true },
  { country: "United Kingdom", countryCode: "GB", state: "England", city: "Manchester", latitude: 53.4808, longitude: -2.2426, radiusKm: 25, priority: 90, priorityLabel: "HIGH", enabled: true },
  { country: "United Kingdom", countryCode: "GB", state: "England", city: "Birmingham", latitude: 52.4862, longitude: -1.8904, radiusKm: 25, priority: 85, priorityLabel: "HIGH", enabled: true },
  { country: "United Kingdom", countryCode: "GB", state: "England", city: "Leeds", latitude: 53.8008, longitude: -1.5491, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },
  { country: "United Kingdom", countryCode: "GB", state: "England", city: "Bristol", latitude: 51.4545, longitude: -2.5879, radiusKm: 25, priority: 75, priorityLabel: "MEDIUM", enabled: true },
  { country: "United Kingdom", countryCode: "GB", state: "England", city: "Liverpool", latitude: 53.4084, longitude: -2.9916, radiusKm: 25, priority: 75, priorityLabel: "MEDIUM", enabled: true },
  { country: "United Kingdom", countryCode: "GB", state: "Scotland", city: "Glasgow", latitude: 55.8642, longitude: -4.2518, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },
  { country: "United Kingdom", countryCode: "GB", state: "Scotland", city: "Edinburgh", latitude: 55.9533, longitude: -3.1883, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },

  // Australia (5)
  { country: "Australia", countryCode: "AU", state: "Victoria", city: "Melbourne", latitude: -37.8136, longitude: 144.9631, radiusKm: 25, priority: 70, priorityLabel: "MEDIUM", enabled: true },
  { country: "Australia", countryCode: "AU", state: "New South Wales", city: "Sydney", latitude: -33.8688, longitude: 151.2093, radiusKm: 25, priority: 85, priorityLabel: "HIGH", enabled: true },
  { country: "Australia", countryCode: "AU", state: "Queensland", city: "Brisbane", latitude: -27.4698, longitude: 153.0251, radiusKm: 25, priority: 75, priorityLabel: "MEDIUM", enabled: true },
  { country: "Australia", countryCode: "AU", state: "Western Australia", city: "Perth", latitude: -31.9505, longitude: 115.8605, radiusKm: 25, priority: 70, priorityLabel: "MEDIUM", enabled: true },
  { country: "Australia", countryCode: "AU", state: "South Australia", city: "Adelaide", latitude: -34.9285, longitude: 138.6007, radiusKm: 25, priority: 65, priorityLabel: "MEDIUM", enabled: true },

  // Canada (3)
  { country: "Canada", countryCode: "CA", state: "Ontario", city: "Toronto", latitude: 43.6532, longitude: -79.3832, radiusKm: 25, priority: 85, priorityLabel: "HIGH", enabled: true },
  { country: "Canada", countryCode: "CA", state: "British Columbia", city: "Vancouver", latitude: 49.2827, longitude: -123.1207, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },
  { country: "Canada", countryCode: "CA", state: "Alberta", city: "Calgary", latitude: 51.0447, longitude: -114.0719, radiusKm: 25, priority: 70, priorityLabel: "MEDIUM", enabled: true },

  // UAE (2)
  { country: "United Arab Emirates", countryCode: "AE", state: "Dubai", city: "Dubai", latitude: 25.2048, longitude: 55.2708, radiusKm: 25, priority: 80, priorityLabel: "HIGH", enabled: true },
  { country: "United Arab Emirates", countryCode: "AE", state: "Abu Dhabi", city: "Abu Dhabi", latitude: 24.4539, longitude: 54.3773, radiusKm: 25, priority: 75, priorityLabel: "MEDIUM", enabled: true },

  // New Zealand (1)
  { country: "New Zealand", countryCode: "NZ", state: "Auckland", city: "Auckland", latitude: -36.8485, longitude: 174.7633, radiusKm: 25, priority: 70, priorityLabel: "MEDIUM", enabled: true },

  // Thailand (1)
  { country: "Thailand", countryCode: "TH", state: "Bangkok", city: "Bangkok", latitude: 13.7563, longitude: 100.5018, radiusKm: 25, priority: 60, priorityLabel: "MEDIUM", enabled: true },
];

async function main() {
  console.log("=== CLIENTFORGE INTERNATIONAL COLLECTION EXPANSION ===");

  // 1. Snapshot Before
  const locCountBefore = await prisma.collectorLocation.count();
  const activeLocCountBefore = await prisma.collectorLocation.count({ where: { enabled: true } });
  const catCountBefore = await prisma.leadCategory.count({ where: { enabled: true } });
  const candCountBefore = await prisma.leadCandidate.count();
  const leadCountBefore = await prisma.lead.count();
  const googleUsageBefore = await prisma.googleApiUsage.count();
  const googleReservedBefore = await prisma.googleApiUsage.count({ where: { status: 'RESERVED' } });
  const enrichJobsBefore = await prisma.enrichmentJob.count();

  console.log("Pre-expansion metrics:", {
    totalLocations: locCountBefore,
    activeLocations: activeLocCountBefore,
    activeCategories: catCountBefore,
    totalCandidates: candCountBefore,
    totalLeads: leadCountBefore,
  });

  // 2. Disable India (Surat)
  const suratLoc = await prisma.collectorLocation.findFirst({ where: { city: "Surat", countryCode: "IN" } });
  if (suratLoc) {
    await prisma.collectorLocation.update({
      where: { id: suratLoc.id },
      data: { enabled: false }
    });
    console.log("✓ Disabled Surat (IN) location from active collection (historical data preserved)");
  } else {
    console.log("! Surat (IN) location not found to disable");
  }

  // 3. Upsert International Locations
  for (const loc of INTERNATIONAL_LOCATIONS) {
    const existing = await prisma.collectorLocation.findFirst({
      where: { city: loc.city, countryCode: loc.countryCode }
    });

    if (existing) {
      await prisma.collectorLocation.update({
        where: { id: existing.id },
        data: {
          country: loc.country,
          state: loc.state,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusKm: loc.radiusKm,
          priority: loc.priority,
          priorityLabel: loc.priorityLabel,
          enabled: true,
        }
      });
      console.log(`✓ Updated existing location: ${loc.city}, ${loc.countryCode}`);
    } else {
      await prisma.collectorLocation.create({
        data: loc
      });
      console.log(`+ Created new international location: ${loc.city}, ${loc.countryCode}`);
    }
  }

  // 4. Snapshot After & Validation
  const locCountAfter = await prisma.collectorLocation.count();
  const activeLocCountAfter = await prisma.collectorLocation.count({ where: { enabled: true } });
  const disabledLocCountAfter = await prisma.collectorLocation.count({ where: { enabled: false } });
  const activeIndiaCount = await prisma.collectorLocation.count({ where: { countryCode: "IN", enabled: true } });
  const catCountAfter = await prisma.leadCategory.count({ where: { enabled: true } });
  const candCountAfter = await prisma.leadCandidate.count();
  const leadCountAfter = await prisma.lead.count();
  const googleUsageAfter = await prisma.googleApiUsage.count();
  const googleReservedAfter = await prisma.googleApiUsage.count({ where: { status: 'RESERVED' } });
  const enrichJobsAfter = await prisma.enrichmentJob.count();

  console.log("\nPost-expansion validation:", {
    totalLocations: locCountAfter,
    activeLocations: activeLocCountAfter,
    disabledLocations: disabledLocCountAfter,
    activeIndiaLocations: activeIndiaCount,
    activeCategories: catCountAfter,
    totalTargetSpace: `${activeLocCountAfter} locations × ${catCountAfter} categories = ${activeLocCountAfter * catCountAfter} targets`,
    candidateMutationDelta: candCountAfter - candCountBefore,
    leadMutationDelta: leadCountAfter - leadCountBefore,
    googleUsageDelta: googleUsageAfter - googleUsageBefore,
    googleReservedDelta: googleReservedAfter - googleReservedBefore,
    enrichmentJobsDelta: enrichJobsAfter - enrichJobsBefore,
  });

  if (activeIndiaCount > 0) {
    throw new Error("SAFETY VIOLATION: Active Indian locations detected!");
  }
  if (candCountAfter !== candCountBefore) {
    throw new Error("MUTATION VIOLATION: Candidates count changed during configuration expansion!");
  }
  if (leadCountAfter !== leadCountBefore) {
    throw new Error("MUTATION VIOLATION: Leads count changed during configuration expansion!");
  }

  await prisma.$disconnect();
  console.log("=== EXPANSION COMPLETE & VERIFIED CLEAN ===");
}

main().catch(err => {
  console.error("Expansion error:", err);
  process.exit(1);
});
