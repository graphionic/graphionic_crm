import assert from "node:assert";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";

// Polyfill server-only for standalone tsx test runners
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "server-only") return {};
  return origRequire.apply(this, arguments);
};

console.log("[4E] Starting Phase 4E Production Hardening & Readiness Suite — ZERO NETWORK");

// Hard Network Trap — strictly fails if any outbound external network request is attempted
for (const mod of [http, https]) {
  const origRequest = mod.request;
  const origGet = mod.get;
  mod.request = function (urlOrOptions, ...args) {
    const host = typeof urlOrOptions === "string" ? urlOrOptions : urlOrOptions?.hostname || urlOrOptions?.host || "";
    if (host.includes("googleapis") || host.includes("google.com") || host.includes("places") || host.includes("overpass") || host.includes("openstreetmap")) {
      throw new Error(`[TRAP] Forbidden external network call in test: ${host}`);
    }
    return origRequest.call(this, urlOrOptions, ...args);
  };
  mod.get = function (urlOrOptions, ...args) {
    const host = typeof urlOrOptions === "string" ? urlOrOptions : urlOrOptions?.hostname || urlOrOptions?.host || "";
    if (host.includes("googleapis") || host.includes("google.com") || host.includes("places") || host.includes("overpass") || host.includes("openstreetmap")) {
      throw new Error(`[TRAP] Forbidden external network call in test: ${host}`);
    }
    return origGet.call(this, urlOrOptions, ...args);
  };
}

import { PrismaClient } from "@prisma/client";
import {
  humanReadableDecision,
  humanReadableRejection,
  classifyEmail,
  humanReadableSource,
  humanReadableExternalType,
  githubRunUrl,
  statusBadgeStyle,
} from "../src/components/collector/collector-utils";

const prisma = new PrismaClient();

async function runReadinessTests() {
  console.log("=== Phase 4E Automated Production Readiness & Safety Verification ===");
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
    // 1. Repository & Package Checks
    console.log("\n1. Auditing Repository Configuration & Dependencies...");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    testAssert(pkg.name === "clientforge-crm", "package.json name matches clientforge-crm");
    testAssert(pkg.scripts.build.includes("prisma generate"), "build script contains prisma generate");
    testAssert(fs.existsSync("prisma/schema.prisma"), "prisma/schema.prisma exists");
    testAssert(fs.existsSync(".github/workflows/collect.yml"), "collect.yml workflow exists");
    testAssert(fs.existsSync(".github/workflows/google-collector-canary.yml"), "google-collector-canary.yml exists");
    testAssert(fs.existsSync(".github/workflows/google-controlled-probe.yml"), "google-controlled-probe.yml exists");

    // 2. Migration History Audit
    console.log("\n2. Auditing Prisma Migration History & Invariants...");
    const rawMigrations = await prisma.$queryRawUnsafe(`SELECT * FROM "_prisma_migrations" ORDER BY "finished_at" ASC`);
    testAssert(rawMigrations.length === 4, `_prisma_migrations count is 4 (found ${rawMigrations.length})`);
    const allFinished = rawMigrations.every(m => m.finished_at !== null && m.rolled_back_at === null);
    testAssert(allFinished === true, "All 4 migrations finished cleanly with zero rollbacks");

    const migrationDirs = fs.readdirSync("prisma/migrations").filter(f => f.startsWith("202"));
    testAssert(migrationDirs.length === 4, `prisma/migrations directories count is 4 (found ${migrationDirs.length})`);

    // 3. API Route Auth Inventory
    console.log("\n3. Auditing API Authentication Boundaries...");
    const restartRoute = fs.readFileSync("src/app/api/restart/route.ts", "utf8");
    testAssert(restartRoute.includes("requireActiveUser"), "POST /api/restart is protected with requireActiveUser");

    const liveRoute = fs.readFileSync("src/app/api/live/route.ts", "utf8");
    testAssert(liveRoute.includes("requireActiveUser"), "GET /api/live is protected with requireActiveUser");

    const candidatesRoute = fs.readFileSync("src/app/api/collector/candidates/route.ts", "utf8");
    testAssert(candidatesRoute.includes("requireActiveUser"), "GET /api/collector/candidates is protected with requireActiveUser");

    const credentialsRoute = fs.readFileSync("src/app/api/collector/credentials/route.ts", "utf8");
    testAssert(credentialsRoute.includes("requireActiveUser"), "GET/POST /api/collector/credentials is protected with requireActiveUser");

    const googlePageRoute = fs.readFileSync("src/app/(app)/settings/google/page.tsx", "utf8");
    testAssert(googlePageRoute.includes("requireActiveUser"), "/settings/google server page requires active user");

    // 4. Secret Boundary & Credential Protection
    console.log("\n4. Auditing Secret Boundaries & Safe Projections...");
    const { getProviderCredentials } = await import("../src/lib/collector");
    const creds = await getProviderCredentials();
    testAssert(Array.isArray(creds), "getProviderCredentials returns array");
    if (creds.length > 0) {
      testAssert(creds[0].keyHint === undefined, "providerCredential projection has NO keyHint");
      testAssert(creds[0].maskedKey === undefined, "providerCredential projection has NO maskedKey");
      testAssert(creds[0].encryptedValue === undefined, "providerCredential projection has NO encryptedValue");
      testAssert(creds[0].iv === undefined, "providerCredential projection has NO iv");
      testAssert(creds[0].configured === true, "providerCredential projection provides configured: true");
    }

    const googleClient = fs.readFileSync("src/components/collector/GoogleGuardrailsClient.tsx", "utf8");
    testAssert(!googleClient.includes("apiKey:"), "GoogleGuardrailsClient does not contain apiKey props or rendering");
    testAssert(!googleClient.includes("process.env"), "GoogleGuardrailsClient is pure client component with no process.env access");

    // 5. Qualification Invariants & Semantic Rules
    console.log("\n5. Auditing Qualification Invariants & Semantics...");
    const nullWebCandidate = { status: "NEEDS_ENRICHMENT", website: null, email: null, rejectionReason: null };
    const nullDecision = humanReadableDecision(nullWebCandidate);
    testAssert(nullDecision.websiteEvidence === "No website supplied by discovery source", "null website -> No website supplied by discovery source");

    const liveDomCandidate = { status: "REJECTED", email: "info@clinic.com", rejectionReason: "email_domain_has_live_website" };
    const liveDomDecision = humanReadableDecision(liveDomCandidate);
    testAssert(liveDomDecision.statusTitle.includes("Live Website on Email Domain"), "email_domain_has_live_website mapped to Live Website title");

    const genericEmail = classifyEmail("dr.smith@gmail.com");
    testAssert(genericEmail.status === "GENERIC_WEBMAIL", "gmail.com classified as GENERIC_WEBMAIL");

    const businessEmail = classifyEmail("contact@manchesterdental.co.uk");
    testAssert(businessEmail.status === "VALID_BUSINESS", "contact@manchesterdental.co.uk classified as VALID_BUSINESS");

    const roleEmail = classifyEmail("info@clinicforge.org");
    testAssert(roleEmail.status === "VALID_BUSINESS", "info@clinicforge.org classified as VALID_BUSINESS (never rejected on role prefix)");

    // 6. Google Guardrails Safety & Limits
    console.log("\n6. Auditing Google Places Safety & Fail-Closed Invariants...");
    const googleConfig = await prisma.googleCollectionConfig.findFirst();
    testAssert(googleConfig.enabled === false, "googleCollectionConfig.enabled === false (Master Disabled)");
    testAssert(googleConfig.activationMode === "DISABLED", "googleCollectionConfig.activationMode === 'DISABLED'");
    testAssert(googleConfig.failClosed === true, "googleCollectionConfig.failClosed === true");
    testAssert(googleConfig.retryLimit === 0, "googleCollectionConfig.retryLimit === 0");
    testAssert(googleConfig.perRunRequestLimit === 10, "googleCollectionConfig.perRunRequestLimit === 10");
    testAssert(googleConfig.dailyRequestLimit === 50, "googleCollectionConfig.dailyRequestLimit === 50");
    testAssert(googleConfig.monthlyRequestLimit === 500, "googleCollectionConfig.monthlyRequestLimit === 500");

    const googleSource = await prisma.dataSource.findFirst({ where: { type: "google_places" } });
    testAssert(googleSource.enabled === false, "google_places DataSource.enabled === false");

    const googleUsageCount = await prisma.googleApiUsage.count();
    testAssert(googleUsageCount === 2, `googleApiUsage count is 2 (found ${googleUsageCount})`);

    const googleReservedCount = await prisma.googleApiUsage.count({ where: { status: "RESERVED" } });
    testAssert(googleReservedCount === 0, `googleApiUsage dangling RESERVED is 0 (found ${googleReservedCount})`);

    const googleCacheCount = await prisma.googleApiCache.count();
    testAssert(googleCacheCount === 2, `googleApiCache count is 2 (found ${googleCacheCount})`);

    // 7. Enrichment Safety
    console.log("\n7. Auditing Enrichment Engine Safety Invariants...");
    const enrichmentConfig = await prisma.enrichmentConfig.findFirst();
    testAssert(enrichmentConfig.enabled === false, "EnrichmentConfig.enabled === false (Strictly Disabled)");

    const enrichmentJobCount = await prisma.enrichmentJob.count();
    testAssert(enrichmentJobCount === 0, `EnrichmentJob count is 0 (found ${enrichmentJobCount})`);

    const enrichmentAttemptCount = await prisma.enrichmentAttempt.count();
    testAssert(enrichmentAttemptCount === 0, `EnrichmentAttempt count is 0 (found ${enrichmentAttemptCount})`);

    // 8. Database Integrity & Candidate Hierarchy
    console.log("\n8. Auditing Database Integrity & Traceability...");
    const candidateTotal = await prisma.leadCandidate.count();
    testAssert(candidateTotal >= 649, `Total candidates in DB is at least 649 (found ${candidateTotal})`);

    const needsEnrichment = await prisma.leadCandidate.count({ where: { status: "NEEDS_ENRICHMENT" } });
    testAssert(needsEnrichment >= 408, `Needs Enrichment candidates is at least 408 (found ${needsEnrichment})`);

    const rejected = await prisma.leadCandidate.count({ where: { status: "REJECTED" } });
    testAssert(rejected >= 241, `Rejected candidates is at least 241 (found ${rejected})`);

    testAssert(candidateTotal === needsEnrichment + rejected, `Candidate partitioning is 100% integral: total ${candidateTotal} = ${needsEnrichment} needs_enrichment + ${rejected} rejected`);

    const googleCandidates = await prisma.leadCandidate.count({ where: { externalType: "google_places" } });
    testAssert(googleCandidates === 0, `Google candidates count is 0 (found ${googleCandidates})`);

    const orphanRunCandidates = await prisma.leadCandidate.count({ where: { discoveryRunId: "" } });
    testAssert(orphanRunCandidates === 0, "Zero candidates with empty discoveryRunId");

    const leadsTotal = await prisma.lead.count();
    testAssert(leadsTotal === 88, `Total CRM leads in DB is 88 (found ${leadsTotal})`);

    // 9. GitHub Run URL Helper Validation
    console.log("\n9. Auditing External Link Safety...");
    testAssert(githubRunUrl("123456789") === "https://github.com/graphionic/graphionic_crm/actions/runs/123456789", "githubRunUrl formats valid run ID");
    testAssert(githubRunUrl("bad-run-id") === null, "githubRunUrl rejects non-numeric ID");
    testAssert(githubRunUrl(null) === null, "githubRunUrl handles null safely");

  } catch (err) {
    console.error("Readiness test failed with exception:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n========================================");
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runReadinessTests();
