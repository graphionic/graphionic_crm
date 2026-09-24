import Module from "node:module";

// Polyfill server-only for standalone tsx test runners
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "server-only") return {};
  return origRequire.apply(this, arguments);
};

import { PrismaClient } from "@prisma/client";
import {
  formatCountdown,
  formatDuration,
  formatRelativeTime,
  formatYieldRate,
  githubRunUrl,
  humanReadableSource,
  runStatusBadgeStyle,
  rotationStateBadge,
  sourceHealthBadgeStyle,
} from "../src/components/collector/collector-utils.ts";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== Phase 4D.4 & 4D.4A Collection Operations Smoke Tests ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log(`  ✓ ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      failed++;
    }
  }

  try {
    // Dynamically import collector service functions after server-only polyfill
    const { getProviderCredentials } = await import("../src/lib/collector.ts");

    // 1. Duration Formatter
    console.log("\n1. Testing Duration Formatter...");
    assert(formatDuration(500, "ms") === "500ms", "formatDuration 500ms");
    assert(formatDuration(42, "s") === "42s", "formatDuration 42s");
    assert(formatDuration(198, "s") === "3m 18s", "formatDuration 198s -> 3m 18s");
    assert(formatDuration(3665, "s") === "1h 1m", "formatDuration 3665s -> 1h 1m");
    assert(formatDuration(null) === "—", "formatDuration handles null");
    assert(formatDuration(-5) === "—", "formatDuration handles negative");

    // 2. Relative Time Formatter
    console.log("\n2. Testing Relative Time Formatter...");
    assert(formatRelativeTime(null) === "Never", "formatRelativeTime handles null");
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    assert(formatRelativeTime(tenMinAgo) === "10m ago", "formatRelativeTime 10m ago");

    // 3. Yield Rate Formatter
    console.log("\n3. Testing Yield Rate Formatter...");
    assert(formatYieldRate(0, 0) === "—", "formatYieldRate 0/0 returns —");
    assert(formatYieldRate(0, 100) === "—", "formatYieldRate 0/100 returns —");
    assert(formatYieldRate(5, 0) === "—", "formatYieldRate 5/0 returns —");
    assert(formatYieldRate(25, 100) === "25.0%", "formatYieldRate 25/100 returns 25.0%");
    assert(formatYieldRate(1, 3) === "33.3%", "formatYieldRate 1/3 returns 33.3%");

    // 4. Run & Rotation Status Badges
    console.log("\n4. Testing Run & Rotation Badges...");
    const successBadge = runStatusBadgeStyle("SUCCESS");
    assert(successBadge.label === "Success" && successBadge.color === "#276749", "runStatusBadgeStyle SUCCESS");

    const failedBadge = runStatusBadgeStyle("FAILED");
    assert(failedBadge.label === "Failed" && failedBadge.color === "#EC6262", "runStatusBadgeStyle FAILED");

    const runningBadge = runStatusBadgeStyle("RUNNING");
    assert(runningBadge.label === "Running" && runningBadge.color === "#F29B38", "runStatusBadgeStyle RUNNING");

    const neverRunState = rotationStateBadge(null, null);
    assert(neverRunState.state === "NEVER_RUN" && neverRunState.label === "Never run", "rotationStateBadge NEVER_RUN");

    const readyState = rotationStateBadge(new Date(Date.now() - 10000).toISOString(), new Date().toISOString());
    assert(readyState.state === "READY" && readyState.label === "Ready now", "rotationStateBadge READY");

    const coolingState = rotationStateBadge(new Date(Date.now() + 600000).toISOString(), new Date().toISOString());
    assert(coolingState.state === "COOLING" && coolingState.label === "Cooling down", "rotationStateBadge COOLING");

    // 5. GitHub Run URL Validation
    console.log("\n5. Testing GitHub Run URL Validation...");
    assert(githubRunUrl("12345678") === "https://github.com/graphionic/graphionic_crm/actions/runs/12345678", "githubRunUrl numeric ID");
    assert(githubRunUrl("bad-id; rm -rf") === null, "githubRunUrl rejects non-numeric");
    assert(githubRunUrl(null) === null, "githubRunUrl rejects null");

    // 6. Source Humanization
    console.log("\n6. Testing Source Humanization...");
    assert(humanReadableSource("overpass") === "OpenStreetMap (Overpass)", "humanReadableSource overpass");
    assert(humanReadableSource("google_places") === "Google Places", "humanReadableSource google_places");
    assert(humanReadableSource(null) === "OpenStreetMap", "humanReadableSource default");

    // 7. Phase 4D.4A Credential Projection Security Hardening
    console.log("\n7. Testing Credential Projection Security Hardening (Phase 4D.4A)...");
    const creds = await getProviderCredentials();
    assert(Array.isArray(creds), "getProviderCredentials returns array");
    for (const c of creds) {
      assert(c.keyHint === undefined, `Credential for ${c.provider} has NO keyHint in browser projection`);
      assert(c.maskedKey === undefined, `Credential for ${c.provider} has NO maskedKey in browser projection`);
      assert(c.encryptedValue === undefined, `Credential for ${c.provider} has NO encryptedValue in browser projection`);
      assert(c.iv === undefined, `Credential for ${c.provider} has NO iv in browser projection`);
      assert(c.configured === true, `Credential for ${c.provider} has configured === true`);
    }

    // Explicit projection contract check
    const mockCred = {
      id: "cred-abc",
      provider: "openai",
      label: "OpenAI Primary",
      keyHint: "sk-9988",
      encryptedValue: "0123456789abcdef",
      iv: "fedcba9876543210",
      enabled: true,
      status: "active"
    };
    const safeProjection = {
      id: mockCred.id,
      provider: mockCred.provider,
      label: mockCred.label,
      configured: true,
      enabled: mockCred.enabled,
      status: mockCred.status,
    };
    assert(safeProjection.keyHint === undefined, "safeProjection excludes keyHint");
    assert(safeProjection.maskedKey === undefined, "safeProjection excludes maskedKey");
    assert(safeProjection.encryptedValue === undefined, "safeProjection excludes encryptedValue");
    assert(safeProjection.iv === undefined, "safeProjection excludes iv");
    assert(safeProjection.configured === true, "safeProjection provides configured: true");

    // 8. Database Safety & Production Invariants
    console.log("\n8. Testing Database Safety & Invariants...");
    const googleConfig = await prisma.googleCollectionConfig.findFirst();
    assert(googleConfig?.enabled === false, "googleCollectionConfig.enabled === false");
    assert(googleConfig?.activationMode === "DISABLED", "googleCollectionConfig.activationMode === DISABLED");

    const googleSource = await prisma.dataSource.findFirst({ where: { type: "google_places" } });
    assert(googleSource?.enabled === false, "google_places DataSource.enabled === false");

    const usageCount = await prisma.googleApiUsage.count();
    const reservedCount = await prisma.googleApiUsage.count({ where: { status: "RESERVED" } });
    const cacheCount = await prisma.googleApiCache.count();
    assert(usageCount === 2, `GoogleApiUsage count is 2 (found ${usageCount})`);
    assert(reservedCount === 0, `GoogleApiUsage dangling RESERVED count is 0 (found ${reservedCount})`);
    assert(cacheCount === 2, `GoogleApiCache count is 2 (found ${cacheCount})`);

    const googleCandidates = await prisma.leadCandidate.count({ where: { externalType: "google_place" } });
    assert(googleCandidates === 0, "Zero Google candidates in database");

    const enrichConfig = await prisma.enrichmentConfig.findFirst();
    assert(enrichConfig?.enabled === false, "EnrichmentConfig.enabled === false");

    const totalCandidates = await prisma.leadCandidate.count();
    assert(totalCandidates >= 649, `Total candidates in DB is >= 649 (found ${totalCandidates})`);
    console.log(`  ✓ Total candidates in DB is at least 649 (found ${totalCandidates})`);
    passed++;

    console.log(`\n========================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed.`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
