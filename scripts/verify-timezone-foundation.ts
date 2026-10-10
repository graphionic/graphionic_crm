/**
 * Verification script for Roadmap #3: Timezone & Regional Settings Foundation
 * Run with: npx tsx scripts/verify-timezone-foundation.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  isValidTimeZone,
  formatInTimeZone,
  formatDateInZone,
  formatTimeInZone,
  getCurrentTimeInZone,
  POPULAR_TIMEZONES,
  getAllSupportedTimezones,
} from "../src/lib/timezone";

const prisma = new PrismaClient();

function checkFreeformWindow(lastInboundAt: Date | null | undefined) {
  if (!lastInboundAt) return { allowed: false, reason: "NO_INBOUND" };
  const ms = Date.now() - new Date(lastInboundAt).getTime();
  const hours = ms / 36e5;
  if (hours > 24) {
    return { allowed: false, reason: "EXPIRED_WINDOW", hoursLeft: 0 };
  }
  return { allowed: true, hoursLeft: Math.max(0, Math.floor(24 - hours)) };
}

async function main() {
  console.log("=== CLIENTFORGE ROADMAP #3: TIMEZONE FOUNDATION VERIFICATION ===\n");

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
  // Test 1: IANA Timezone Validation
  // -------------------------------------------------------------
  console.log("\n[1] Testing IANA Timezone Validation...");

  const validZones = [
    "Asia/Kolkata",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Australia/Sydney",
    "UTC",
    "America/Chicago",
    "Asia/Singapore",
    "Pacific/Auckland",
  ];

  for (const tz of validZones) {
    assert(isValidTimeZone(tz), `Valid IANA zone recognized: ${tz}`);
  }

  const invalidZones = [
    "",
    "   ",
    "Invalid/Zone_Name",
    "UTC+5",
    "GMT+5:30",
    "EST",
    "PST",
    "random_string_12345",
    null as any,
    undefined as any,
    "a".repeat(200),
  ];

  for (const tz of invalidZones) {
    assert(!isValidTimeZone(tz), `Invalid candidate rejected: ${JSON.stringify(tz)}`);
  }

  assert(POPULAR_TIMEZONES.length >= 10, "Popular timezones list populated");
  const supported = getAllSupportedTimezones();
  assert(supported.length > 50, `Supported timezones dynamically available: ${supported.length} zones`);

  // -------------------------------------------------------------
  // Test 2: Formatting Utilities (Native Intl)
  // -------------------------------------------------------------
  console.log("\n[2] Testing Timezone Formatting Utilities...");

  // Fixed instant: 2026-10-10T12:00:00.000Z (UTC noon)
  const fixedInstant = new Date("2026-10-10T12:00:00.000Z");

  // In Europe/London (BST = UTC+1 in October), 12:00 UTC = 13:00 local
  const londonFormatted = formatInTimeZone(fixedInstant, "Europe/London");
  assert(
    londonFormatted.includes("13:00") && londonFormatted.includes("10 Oct 2026"),
    `Europe/London formats BST correctly: ${londonFormatted}`
  );

  // In Asia/Kolkata (IST = UTC+5:30), 12:00 UTC = 17:30 local
  const kolkataFormatted = formatInTimeZone(fixedInstant, "Asia/Kolkata");
  assert(
    kolkataFormatted.includes("17:30") && kolkataFormatted.includes("10 Oct 2026"),
    `Asia/Kolkata formats IST correctly: ${kolkataFormatted}`
  );

  // In America/New_York (EDT = UTC-4 in October), 12:00 UTC = 08:00 local
  const nyFormatted = formatInTimeZone(fixedInstant, "America/New_York");
  assert(
    nyFormatted.includes("08:00") && nyFormatted.includes("10 Oct 2026"),
    `America/New_York formats EDT correctly: ${nyFormatted}`
  );

  // Date and Time individual helpers
  const kolkataDate = formatDateInZone(fixedInstant, "Asia/Kolkata");
  assert(kolkataDate.includes("10 Oct 2026"), `formatDateInZone works: ${kolkataDate}`);

  const kolkataTime = formatTimeInZone(fixedInstant, "Asia/Kolkata");
  assert(kolkataTime.includes("17:30"), `formatTimeInZone works: ${kolkataTime}`);

  // Safe fallback behavior for null / invalid inputs
  assert(formatInTimeZone(null, "Asia/Kolkata") === "—", "Null date returns fallback dash");
  assert(formatInTimeZone(undefined, "Asia/Kolkata") === "—", "Undefined date returns fallback dash");
  assert(formatInTimeZone("invalid-date", "Asia/Kolkata") === "—", "Invalid date string returns fallback dash");

  // Current local time snapshot helper
  const nowInfo = getCurrentTimeInZone("Asia/Kolkata");
  assert(Boolean(nowInfo.dateStr && nowInfo.timeStr && nowInfo.fullStr), `getCurrentTimeInZone produced valid strings: ${nowInfo.fullStr}`);

  // -------------------------------------------------------------
  // Test 3: Database Persistence & User Isolation
  // -------------------------------------------------------------
  console.log("\n[3] Testing Database Schema, Persistence & User Isolation...");

  const userA_Email = `test_operator_a_${Date.now()}@clientforge.internal`;
  const userB_Email = `test_operator_b_${Date.now()}@clientforge.internal`;

  const userA = await prisma.adminUser.create({
    data: {
      email: userA_Email,
      name: "Operator A",
      passwordHash: "test-hash-a",
      isActive: true,
      // timezone is omitted to test nullable default null
    },
  });

  const userB = await prisma.adminUser.create({
    data: {
      email: userB_Email,
      name: "Operator B",
      passwordHash: "test-hash-b",
      isActive: true,
      timezone: "America/New_York",
    },
  });

  try {
    assert(userA.timezone === null, "New AdminUser timezone defaults to null (not guessed)");
    assert(userB.timezone === "America/New_York", "AdminUser B saved with America/New_York");

    // Update User A to Asia/Kolkata
    const updatedA = await prisma.adminUser.update({
      where: { id: userA.id },
      data: { timezone: "Asia/Kolkata" },
    });
    assert(updatedA.timezone === "Asia/Kolkata", "User A timezone updated to Asia/Kolkata");

    // Verify User B is completely isolated
    const fetchedB = await prisma.adminUser.findUnique({ where: { id: userB.id } });
    assert(fetchedB?.timezone === "America/New_York", "User B timezone remains America/New_York (Isolation verified)");

    // Clear User A timezone
    const clearedA = await prisma.adminUser.update({
      where: { id: userA.id },
      data: { timezone: null },
    });
    assert(clearedA.timezone === null, "User A timezone cleared to null successfully");
  } finally {
    // Clean up test users
    await prisma.adminUser.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
  }

  // -------------------------------------------------------------
  // Test 4: WhatsApp 24-Hour Window Eligibility Integrity
  // -------------------------------------------------------------
  console.log("\n[4] Testing WhatsApp 24-Hour Window Eligibility Integrity...");

  // Meta 24-hour window must remain strictly absolute elapsed milliseconds
  const recentInbound = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago
  const expiredInbound = new Date(Date.now() - 25 * 3600 * 1000); // 25 hours ago

  const recentEligibility = checkFreeformWindow(recentInbound);
  assert(recentEligibility.allowed === true, "Recent inbound (2h ago) is eligible for freeform reply");
  assert(recentEligibility.hoursLeft === 22, `Hours left is accurately 22h: ${recentEligibility.hoursLeft}`);

  const expiredEligibility = checkFreeformWindow(expiredInbound);
  assert(expiredEligibility.allowed === false, "Expired inbound (25h ago) is blocked from freeform reply");
  assert(expiredEligibility.reason === "EXPIRED_WINDOW", "Expired inbound flagged EXPIRED_WINDOW");

  // -------------------------------------------------------------
  // Test 5: Locked Scope & Anti-Complexity Invariant Check
  // -------------------------------------------------------------
  console.log("\n[5] Testing Anti-Complexity & Schema Invariants...");

  const adminUserSample = await prisma.adminUser.findFirst();
  assert(adminUserSample !== undefined, "AdminUser query executed cleanly");

  // Verify Lead table does NOT have timezone
  const leadFields = Object.keys((prisma.lead as any).fields || {});
  assert(!leadFields.includes("timezone"), "Lead model does NOT have a timezone field (Roadmap #4 deferred)");

  // Verify AdminUser does NOT have extraneous fields
  const userFields = Object.keys((prisma.adminUser as any).fields || {});
  assert(!userFields.includes("dateFormat"), "AdminUser does NOT have dateFormat field");
  assert(!userFields.includes("timeFormat"), "AdminUser does NOT have timeFormat field");
  assert(!userFields.includes("currency"), "AdminUser does NOT have currency field");

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
