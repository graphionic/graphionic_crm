/**
 * Verification script for Roadmap #4: Lead Local-Time Awareness
 * Run with: npx tsx scripts/verify-lead-timezone.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  resolveLeadTimezone,
  normalizeCountry,
} from "../src/lib/lead-timezone";
import {
  isValidTimeZone,
  formatInTimeZone,
  formatTimeInZone,
} from "../src/lib/timezone";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CLIENTFORGE ROADMAP #4: LEAD LOCAL-TIME AWARENESS VERIFICATION ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Country Normalization
  // -------------------------------------------------------------
  console.log("\n[1] Testing Country Normalization...");

  assert(normalizeCountry("UK") === "GB", "UK -> GB");
  assert(normalizeCountry("United Kingdom") === "GB", "United Kingdom -> GB");
  assert(normalizeCountry("Great Britain") === "GB", "Great Britain -> GB");
  assert(normalizeCountry("GB") === "GB", "GB -> GB");
  assert(normalizeCountry("england") === "GB", "england -> GB");

  assert(normalizeCountry("USA") === "US", "USA -> US");
  assert(normalizeCountry("US") === "US", "US -> US");
  assert(normalizeCountry("United States") === "US", "United States -> US");
  assert(normalizeCountry("United States of America") === "US", "United States of America -> US");

  assert(normalizeCountry("UAE") === "AE", "UAE -> AE");
  assert(normalizeCountry("AE") === "AE", "AE -> AE");
  assert(normalizeCountry("United Arab Emirates") === "AE", "United Arab Emirates -> AE");

  assert(normalizeCountry("AU") === "AU", "AU -> AU");
  assert(normalizeCountry("Australia") === "AU", "Australia -> AU");

  assert(normalizeCountry("PH") === "PH", "PH -> PH");
  assert(normalizeCountry("Philippines") === "PH", "Philippines -> PH");

  assert(normalizeCountry("MY") === "MY", "MY -> MY");
  assert(normalizeCountry("Malaysia") === "MY", "Malaysia -> MY");

  assert(normalizeCountry("TH") === "TH", "TH -> TH");
  assert(normalizeCountry("Thailand") === "TH", "Thailand -> TH");

  assert(normalizeCountry("SG") === "SG", "SG -> SG");
  assert(normalizeCountry("Singapore") === "SG", "Singapore -> SG");

  assert(normalizeCountry("IN") === "IN", "IN -> IN");
  assert(normalizeCountry("India") === "IN", "India -> IN");

  assert(normalizeCountry("CA") === "CA", "CA -> CA");
  assert(normalizeCountry("Canada") === "CA", "Canada -> CA");

  assert(normalizeCountry("invalid_country_xyz") === null, "Invalid country returns null");
  assert(normalizeCountry("") === null, "Empty country returns null");
  assert(normalizeCountry(null) === null, "Null country returns null");

  // -------------------------------------------------------------
  // Test 2: Safe Single-Zone Country Resolution
  // -------------------------------------------------------------
  console.log("\n[2] Testing Safe Single-Zone Country Resolution...");

  assert(resolveLeadTimezone({ country: "UK", city: "London" }) === "Europe/London", "London, UK -> Europe/London");
  assert(resolveLeadTimezone({ country: "United Kingdom", city: "Manchester" }) === "Europe/London", "Manchester, UK -> Europe/London");
  assert(resolveLeadTimezone({ country: "GB" }) === "Europe/London", "GB alone -> Europe/London");

  assert(resolveLeadTimezone({ country: "AE", city: "Dubai" }) === "Asia/Dubai", "Dubai, AE -> Asia/Dubai");
  assert(resolveLeadTimezone({ country: "UAE", city: "Abu Dhabi" }) === "Asia/Dubai", "Abu Dhabi, UAE -> Asia/Dubai");

  assert(resolveLeadTimezone({ country: "TH", city: "Bangkok" }) === "Asia/Bangkok", "Bangkok, TH -> Asia/Bangkok");
  assert(resolveLeadTimezone({ country: "TH", city: "Phuket" }) === "Asia/Bangkok", "Phuket, TH -> Asia/Bangkok");

  assert(resolveLeadTimezone({ country: "SG", city: "Singapore" }) === "Asia/Singapore", "Singapore, SG -> Asia/Singapore");
  assert(resolveLeadTimezone({ country: "PH", city: "Manila" }) === "Asia/Manila", "Manila, PH -> Asia/Manila");
  assert(resolveLeadTimezone({ country: "MY", city: "Kuala Lumpur" }) === "Asia/Kuala_Lumpur", "Kuala Lumpur, MY -> Asia/Kuala_Lumpur");
  assert(resolveLeadTimezone({ country: "IN", city: "Surat" }) === "Asia/Kolkata", "Surat, IN -> Asia/Kolkata");

  // -------------------------------------------------------------
  // Test 3: United States Resolution (including Arizona Phoenix NO-DST rule)
  // -------------------------------------------------------------
  console.log("\n[3] Testing United States Resolution...");

  assert(resolveLeadTimezone({ country: "USA", city: "New York" }) === "America/New_York", "New York, USA -> America/New_York");
  assert(resolveLeadTimezone({ country: "US", city: "Brooklyn" }) === "America/New_York", "Brooklyn, US -> America/New_York");
  assert(resolveLeadTimezone({ country: "USA", city: "Boston" }) === "America/New_York", "Boston, USA -> America/New_York");
  assert(resolveLeadTimezone({ country: "USA", city: "Miami" }) === "America/New_York", "Miami, USA -> America/New_York");

  assert(resolveLeadTimezone({ country: "USA", city: "Los Angeles" }) === "America/Los_Angeles", "Los Angeles, USA -> America/Los_Angeles");
  assert(resolveLeadTimezone({ country: "USA", city: "San Francisco" }) === "America/Los_Angeles", "San Francisco, USA -> America/Los_Angeles");
  assert(resolveLeadTimezone({ country: "USA", city: "Seattle" }) === "America/Los_Angeles", "Seattle, USA -> America/Los_Angeles");

  assert(resolveLeadTimezone({ country: "USA", city: "Dallas" }) === "America/Chicago", "Dallas, USA -> America/Chicago");
  assert(resolveLeadTimezone({ country: "USA", city: "Houston" }) === "America/Chicago", "Houston, USA -> America/Chicago");
  assert(resolveLeadTimezone({ country: "USA", city: "Austin" }) === "America/Chicago", "Austin, USA -> America/Chicago");
  assert(resolveLeadTimezone({ country: "USA", city: "Chicago" }) === "America/Chicago", "Chicago, USA -> America/Chicago");

  assert(resolveLeadTimezone({ country: "USA", city: "Denver" }) === "America/Denver", "Denver, USA -> America/Denver");
  assert(resolveLeadTimezone({ country: "USA", city: "Salt Lake City" }) === "America/Denver", "Salt Lake City, USA -> America/Denver");

  // CRITICAL PHOENIX NO-DST TEST
  const phoenixResult = resolveLeadTimezone({ country: "USA", city: "Phoenix" });
  assert(phoenixResult === "America/Phoenix", `Phoenix, USA -> America/Phoenix (Result: ${phoenixResult})`);
  assert(phoenixResult !== "America/Denver", "Phoenix does NOT collapse to America/Denver (DST divergence preserved)");

  // US State mapping tests
  assert(resolveLeadTimezone({ country: "USA", region: "NY" }) === "America/New_York", "Region NY -> America/New_York");
  assert(resolveLeadTimezone({ country: "USA", region: "California" }) === "America/Los_Angeles", "Region California -> America/Los_Angeles");
  assert(resolveLeadTimezone({ country: "USA", region: "TX" }) === "America/Chicago", "Region TX -> America/Chicago");
  assert(resolveLeadTimezone({ country: "USA", region: "AZ" }) === "America/Phoenix", "Region AZ -> America/Phoenix");
  assert(resolveLeadTimezone({ country: "USA", region: "CO" }) === "America/Denver", "Region CO -> America/Denver");

  // -------------------------------------------------------------
  // Test 4: Australia Resolution
  // -------------------------------------------------------------
  console.log("\n[4] Testing Australia Resolution...");

  assert(resolveLeadTimezone({ country: "AU", city: "Sydney" }) === "Australia/Sydney", "Sydney, AU -> Australia/Sydney");
  assert(resolveLeadTimezone({ country: "AU", city: "Melbourne" }) === "Australia/Melbourne", "Melbourne, AU -> Australia/Melbourne");
  assert(resolveLeadTimezone({ country: "AU", city: "Brisbane" }) === "Australia/Brisbane", "Brisbane, AU -> Australia/Brisbane");
  assert(resolveLeadTimezone({ country: "AU", city: "Perth" }) === "Australia/Perth", "Perth, AU -> Australia/Perth");
  assert(resolveLeadTimezone({ country: "AU", city: "Adelaide" }) === "Australia/Adelaide", "Adelaide, AU -> Australia/Adelaide");

  assert(resolveLeadTimezone({ country: "AU", region: "NSW" }) === "Australia/Sydney", "AU Region NSW -> Australia/Sydney");
  assert(resolveLeadTimezone({ country: "AU", region: "Victoria" }) === "Australia/Melbourne", "AU Region Victoria -> Australia/Melbourne");
  assert(resolveLeadTimezone({ country: "AU", region: "QLD" }) === "Australia/Brisbane", "AU Region QLD -> Australia/Brisbane");
  assert(resolveLeadTimezone({ country: "AU", region: "WA" }) === "Australia/Perth", "AU Region WA -> Australia/Perth");
  assert(resolveLeadTimezone({ country: "AU", region: "SA" }) === "Australia/Adelaide", "AU Region SA -> Australia/Adelaide");

  // -------------------------------------------------------------
  // Test 5: Strict Ambiguous & Insufficient Location Safety (NO-GUESS RULE)
  // -------------------------------------------------------------
  console.log("\n[5] Testing Ambiguous & Insufficient Location Safety...");

  assert(resolveLeadTimezone({ country: "USA" }) === null, "USA country only -> null (UNKNOWN)");
  assert(resolveLeadTimezone({ country: "AU" }) === null, "AU country only -> null (UNKNOWN)");
  assert(resolveLeadTimezone({ country: "CA" }) === null, "CA country only -> null (UNKNOWN)");

  assert(resolveLeadTimezone({ country: "USA", city: "Springfield" }) === null, "Springfield, USA without state -> null (UNKNOWN)");
  assert(resolveLeadTimezone({ country: "USA", city: "Portland" }) === null, "Portland, USA without state -> null (UNKNOWN)");
  assert(resolveLeadTimezone({ country: "USA", city: "Richmond" }) === null, "Richmond, USA without state -> null (UNKNOWN)");
  assert(resolveLeadTimezone({ country: "USA", city: "Columbus" }) === null, "Columbus, USA without state -> null (UNKNOWN)");

  // With disambiguating state:
  assert(resolveLeadTimezone({ country: "USA", city: "Springfield", region: "IL" }) === "America/Chicago", "Springfield + IL -> America/Chicago");
  assert(resolveLeadTimezone({ country: "USA", city: "Portland", region: "OR" }) === "America/Los_Angeles", "Portland + OR -> America/Los_Angeles");
  assert(resolveLeadTimezone({ country: "USA", city: "Portland", region: "ME" }) === "America/New_York", "Portland + ME -> America/New_York");

  assert(resolveLeadTimezone({ country: "invalid_xyz", city: "Anywhere" }) === null, "Invalid country -> null");
  assert(resolveLeadTimezone({}) === null, "Empty location object -> null");

  // -------------------------------------------------------------
  // Test 6: Production Database Lead Timezone Coverage & Schema
  // -------------------------------------------------------------
  console.log("\n[6] Testing Database Schema & Stored Lead Timezone Quality...");

  const allLeads = await prisma.lead.findMany({
    select: {
      id: true,
      companyName: true,
      country: true,
      city: true,
      timezone: true,
    },
  });

  assert(allLeads.length === 160, `All 160 production leads retrieved (Count: ${allLeads.length})`);

  let validTzCount = 0;
  for (const lead of allLeads) {
    if (lead.timezone && isValidTimeZone(lead.timezone)) {
      validTzCount++;
    }
  }

  assert(validTzCount === 160, `100% of production leads have valid IANA timezones (Count: ${validTzCount}/160)`);

  // Verify Lead table schema invariants
  const leadSample = await prisma.lead.findFirst();
  assert(leadSample !== null, "Lead record exists");
  const leadFields = Object.keys((prisma.lead as any).fields || {});
  assert(leadFields.includes("timezone"), "Lead model contains timezone field");
  assert(!leadFields.includes("timezoneSource"), "Lead model does NOT contain timezoneSource");
  assert(!leadFields.includes("timezoneConfidence"), "Lead model does NOT contain timezoneConfidence");
  assert(!leadFields.includes("timezoneOverride"), "Lead model does NOT contain timezoneOverride");

  // -------------------------------------------------------------
  // Test 7: Lead Local Time Formatting Helper
  // -------------------------------------------------------------
  console.log("\n[7] Testing Lead Local-Time Formatting...");

  const fixedUtc = new Date("2026-10-10T12:00:00.000Z");
  const londonTime = formatTimeInZone(fixedUtc, "Europe/London");
  const nyTime = formatTimeInZone(fixedUtc, "America/New_York");
  const tokyoTime = formatTimeInZone(fixedUtc, "Asia/Tokyo");

  assert(londonTime === "13:00", `Europe/London formatTimeInZone (BST): ${londonTime}`);
  assert(nyTime === "08:00", `America/New_York formatTimeInZone (EDT): ${nyTime}`);
  assert(tokyoTime === "21:00", `Asia/Tokyo formatTimeInZone (JST): ${tokyoTime}`);

  console.log(`\n========================================`);
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("FATAL verification error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
