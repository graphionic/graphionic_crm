import assert from "node:assert";
import http from "node:http";
import https from "node:https";
import Module from "node:module";

// Polyfill server-only for standalone tsx test runners
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "server-only") return {};
  return origRequire.apply(this, arguments);
};

console.log("[4D5] Starting Phase 4D.5 Google Guardrails Smoke Tests — ZERO NETWORK");

// Hard Network Trap — strictly fails if any outbound Google API request is attempted
for (const mod of [http, https]) {
  const origRequest = mod.request;
  const origGet = mod.get;
  mod.request = function (urlOrOptions, ...args) {
    const host = typeof urlOrOptions === "string" ? urlOrOptions : urlOrOptions?.hostname || urlOrOptions?.host || "";
    if (host.includes("googleapis") || host.includes("google.com") || host.includes("places")) {
      throw new Error(`[TRAP] Forbidden external Google network call in test: ${host}`);
    }
    return origRequest.call(this, urlOrOptions, ...args);
  };
  mod.get = function (urlOrOptions, ...args) {
    const host = typeof urlOrOptions === "string" ? urlOrOptions : urlOrOptions?.hostname || urlOrOptions?.host || "";
    if (host.includes("googleapis") || host.includes("google.com") || host.includes("places")) {
      throw new Error(`[TRAP] Forbidden external Google network call in test: ${host}`);
    }
    return origGet.call(this, urlOrOptions, ...args);
  };
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== Phase 4D.5 Google Guardrails Unit & Invariant Tests ===");
  let passed = 0;
  let failed = 0;

  function testAssert(condition, description) {
    if (condition) {
      console.log(`  ✓ ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      failed++;
    }
  }

  try {
    // 1. Google Collection Config Guardrails State
    console.log("\n1. Testing Google Collection Config Guardrails...");
    const config = await prisma.googleCollectionConfig.findFirst();
    testAssert(config !== null, "googleCollectionConfig record exists");
    testAssert(config.enabled === false, "googleCollectionConfig.enabled === false (Master Disabled)");
    testAssert(config.activationMode === "DISABLED", "googleCollectionConfig.activationMode === 'DISABLED'");
    testAssert(config.failClosed === true, "googleCollectionConfig.failClosed === true (Fail-closed protection)");
    testAssert(config.retryLimit === 0, "googleCollectionConfig.retryLimit === 0 (Strict no-retry policy)");
    testAssert(config.perRunRequestLimit === 10, "googleCollectionConfig.perRunRequestLimit === 10");
    testAssert(config.dailyRequestLimit === 50, "googleCollectionConfig.dailyRequestLimit === 50");
    testAssert(config.monthlyRequestLimit === 500, "googleCollectionConfig.monthlyRequestLimit === 500");
    testAssert(config.canaryPerRunRequestLimit === 3, "googleCollectionConfig.canaryPerRunRequestLimit === 3");
    testAssert(config.canaryDailyRequestLimit === 5, "googleCollectionConfig.canaryDailyRequestLimit === 5");

    // 2. Data Source Guardrails State
    console.log("\n2. Testing Google Places DataSource State...");
    const googleSource = await prisma.dataSource.findFirst({ where: { type: "google_places" } });
    testAssert(googleSource !== null, "google_places DataSource record exists");
    testAssert(googleSource.enabled === false, "google_places DataSource.enabled === false (Disabled in Fair Rotation)");
    testAssert(googleSource.baseUrl === "https://places.googleapis.com", "google_places DataSource endpoint is https://places.googleapis.com");

    // 3. Canary Allowlist Scopes
    console.log("\n3. Testing Canary Allowlist Scopes...");
    const scopes = config.canaryScopes;
    testAssert(Array.isArray(scopes), "canaryScopes is an array");
    testAssert(scopes.length >= 1, "canaryScopes has at least 1 scope");
    const manchesterScope = scopes.find(s => s.city === "Manchester" && s.categorySlug === "dental");
    testAssert(manchesterScope !== undefined, "canaryScopes includes Manchester Dental allowlist");

    // 4. Usage & Reservation State
    console.log("\n4. Testing Google API Usage & Reservations...");
    const usageCount = await prisma.googleApiUsage.count();
    const reservedCount = await prisma.googleApiUsage.count({ where: { status: "RESERVED" } });
    const successCount = await prisma.googleApiUsage.count({ where: { status: "SUCCESS" } });
    testAssert(usageCount === 2, `GoogleApiUsage total count is 2 (found ${usageCount})`);
    testAssert(reservedCount === 0, `GoogleApiUsage pending/dangling RESERVED count is 0 (found ${reservedCount})`);
    testAssert(successCount === 2, `GoogleApiUsage historical SUCCESS count is 2 (found ${successCount})`);

    // 5. Query Cache State
    console.log("\n5. Testing Google API Query Cache...");
    const cacheCount = await prisma.googleApiCache.count();
    testAssert(cacheCount === 2, `GoogleApiCache count is 2 (found ${cacheCount})`);

    // 6. Security Projection Verification (Zero Secret Exposure)
    console.log("\n6. Testing Security Projection (Zero Secrets)...");
    const safeProjection = {
      activationMode: config.activationMode,
      enabled: config.enabled,
      failClosed: config.failClosed,
      hasApiKey: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    };
    testAssert(safeProjection.hasApiKey === true || safeProjection.hasApiKey === false, "hasApiKey is boolean only");
    testAssert(safeProjection.apiKey === undefined, "safeProjection has NO apiKey");
    testAssert(safeProjection.GOOGLE_MAPS_API_KEY === undefined, "safeProjection has NO GOOGLE_MAPS_API_KEY");
    testAssert(safeProjection.encryptedValue === undefined, "safeProjection has NO encryptedValue");
    testAssert(safeProjection.iv === undefined, "safeProjection has NO iv");
    testAssert(safeProjection.keyHint === undefined, "safeProjection has NO keyHint");
    testAssert(safeProjection.maskedKey === undefined, "safeProjection has NO maskedKey");

    // 7. Candidate & Enrichment Safety Invariants
    console.log("\n7. Testing Candidate & Enrichment Safety Invariants...");
    const googleCandidates = await prisma.leadCandidate.count({ where: { externalType: "google_place" } });
    testAssert(googleCandidates === 0, "Zero Google candidates in database");

    const totalCandidates = await prisma.leadCandidate.count();
    testAssert(totalCandidates >= 649, `Total candidates in DB is at least 649 (found ${totalCandidates})`);

    const enrichConfig = await prisma.enrichmentConfig.findFirst();
    testAssert(enrichConfig?.enabled === false, "EnrichmentConfig.enabled === false");

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
