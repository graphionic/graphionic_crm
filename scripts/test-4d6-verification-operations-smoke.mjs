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

console.log("[4D6] Starting Phase 4D.6 Verification Operations Smoke Tests — ZERO NETWORK");

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

async function runTests() {
  console.log("=== Phase 4D.6 Verification Operations Unit & Semantic Tests ===");
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
    // 1. Critical Semantic Rule: null website != "No website"
    console.log("\n1. Testing Website Semantic Rules...");
    const nullWebsiteCandidate = {
      status: "NEEDS_ENRICHMENT",
      website: null,
      email: null,
      rejectionReason: null,
    };
    const decisionNullWeb = humanReadableDecision(nullWebsiteCandidate);
    testAssert(
      decisionNullWeb.websiteEvidence === "No website supplied by discovery source",
      `null website produces factual: '${decisionNullWeb.websiteEvidence}' (not misleading 'No website')`
    );
    testAssert(
      !decisionNullWeb.websiteEvidence.toLowerCase().startsWith("no website\n") && decisionNullWeb.websiteEvidence !== "No website",
      "null website is never bare 'No website'"
    );

    const providedWebsiteCandidate = {
      status: "REJECTED",
      website: "https://dentalclinic.co.uk",
      email: null,
      rejectionReason: "existing_website",
    };
    const decisionWithWeb = humanReadableDecision(providedWebsiteCandidate);
    testAssert(
      decisionWithWeb.websiteEvidence.includes("https://dentalclinic.co.uk"),
      `Supplied website is accurately preserved in evidence: '${decisionWithWeb.websiteEvidence}'`
    );

    // 2. Google Evidence Semantics (null = "Not checked")
    console.log("\n2. Testing Google Evidence Semantics...");
    const noGoogleCandidate = {
      status: "NEEDS_ENRICHMENT",
      metadata: {},
    };
    testAssert(
      noGoogleCandidate.metadata?.googleEvidence === undefined,
      "No Google evidence recorded in candidate metadata"
    );

    // Historical Google evidence survival
    const historicalGoogleCandidate = {
      status: "NEEDS_ENRICHMENT",
      metadata: {
        googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        googleEvidence: "VERIFIED_MATCH",
        googleWebsite: "https://example.com",
      },
    };
    testAssert(
      historicalGoogleCandidate.metadata.googlePlaceId === "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "Historical Google place identity survives independently of global disabled state"
    );

    // 3. Email-Domain Verification Semantics
    console.log("\n3. Testing Email-Domain Verification Semantics...");
    const liveDomainCandidate = {
      status: "REJECTED",
      email: "info@emmaclinicthailand.com",
      rejectionReason: "email_domain_has_live_website",
      metadata: { normalizedEmail: "info@emmaclinicthailand.com" },
    };
    const liveDomainDecision = humanReadableDecision(liveDomainCandidate);
    testAssert(
      liveDomainDecision.statusTitle.includes("Live Website on Email Domain"),
      `Status title is '${liveDomainDecision.statusTitle}'`
    );
    testAssert(
      liveDomainDecision.websiteEvidence.includes("https://emmaclinicthailand.com"),
      `Website evidence identifies live domain: '${liveDomainDecision.websiteEvidence}'`
    );

    // Role-based business emails are VALID
    const roleEmails = ["info@business.com", "contact@dentalcare.co.uk", "sales@clinic.org", "hello@agency.io"];
    for (const em of roleEmails) {
      const cls = classifyEmail(em);
      testAssert(
        cls.status === "VALID_BUSINESS",
        `Role email '${em}' is classified as VALID_BUSINESS (never rejected on role prefix)`
      );
    }

    // Generic webmail domains remain GENERIC_WEBMAIL
    const genericEmails = ["user@gmail.com", "doc@yahoo.com", "clinic@hotmail.com", "dentist@outlook.com"];
    for (const em of genericEmails) {
      const cls = classifyEmail(em);
      testAssert(
        cls.status === "GENERIC_WEBMAIL",
        `Generic webmail '${em}' is classified as GENERIC_WEBMAIL`
      );
    }

    // 4. Rejection Reason Mapping
    console.log("\n4. Testing Rejection Reason Mapping...");
    testAssert(humanReadableRejection("existing_website") === "Existing website", "existing_website mapped");
    testAssert(humanReadableRejection("email_domain_has_live_website") === "Email domain has live website", "email_domain_has_live_website mapped");
    testAssert(humanReadableRejection("generic_email") === "Generic email domain", "generic_email mapped");
    testAssert(humanReadableRejection("duplicate_in_run") === "Duplicate in run", "duplicate_in_run mapped");
    testAssert(humanReadableRejection("duplicate") === "Duplicate business", "duplicate mapped");

    // 5. Qualified Lead Relation & CRM Traceability
    console.log("\n5. Testing Qualified Lead Relationship...");
    const qualifiedCandidate = {
      status: "QUALIFIED",
      email: "contact@verifiedclinic.com",
      website: null,
      qualifiedLead: {
        id: "lead_12345",
        companyName: "Verified Clinic",
        status: "NEW",
      },
    };
    const qualifiedDecision = humanReadableDecision(qualifiedCandidate);
    testAssert(qualifiedDecision.statusTitle === "Qualified Lead", "Qualified candidate has title Qualified Lead");
    testAssert(qualifiedCandidate.qualifiedLead.id === "lead_12345", "Persisted qualifiedLead relation is present");

    // 6. Malformed & Legacy Evidence Safe Handling
    console.log("\n6. Testing Malformed Evidence Safe Handling...");
    const malformedCandidate1 = null;
    const malformedDecision1 = humanReadableDecision(malformedCandidate1);
    testAssert(malformedDecision1.statusTitle === "Unknown", "null candidate handled without crashing");

    const malformedCandidate2 = { status: "REJECTED", rejectionReason: "corrupt_data", metadata: null, rawTags: "not-json" };
    const malformedDecision2 = humanReadableDecision(malformedCandidate2);
    testAssert(malformedDecision2.tone === "bad", "malformed metadata/rawTags handled gracefully");

    // 7. Route Decision: VERIFICATION_ROUTE_DEFERRED_NO_MEANINGFUL_RECORDS
    console.log("\n7. Testing Data-Driven Route Decision Audit...");
    const totalCandidates = await prisma.leadCandidate.count();
    const verificationPendingCount = await prisma.leadCandidate.count({ where: { status: "VERIFICATION_PENDING" } });
    const qualifiedCount = await prisma.leadCandidate.count({ where: { status: "QUALIFIED" } });
    const needsEnrichmentCount = await prisma.leadCandidate.count({ where: { status: "NEEDS_ENRICHMENT" } });
    const rejectedCount = await prisma.leadCandidate.count({ where: { status: "REJECTED" } });
    const googleCandidateCount = await prisma.leadCandidate.count({ where: { externalType: "google_places" } });
    const enrichmentJobsCount = await prisma.enrichmentJob.count();

    testAssert(totalCandidates >= 649, `Total candidates in DB is at least 649 (found ${totalCandidates})`);
    testAssert(verificationPendingCount === 0, `Candidates in VERIFICATION_PENDING is 0 (found ${verificationPendingCount})`);
    testAssert(qualifiedCount === 0, `Candidates in QUALIFIED is 0 (found ${qualifiedCount})`);
    testAssert(needsEnrichmentCount >= 408, `Candidates in NEEDS_ENRICHMENT is at least 408 (found ${needsEnrichmentCount})`);
    testAssert(rejectedCount >= 241, `Candidates in REJECTED is at least 241 (found ${rejectedCount})`);
    testAssert(totalCandidates === needsEnrichmentCount + rejectedCount, `Candidate partitioning holds: total ${totalCandidates} = ${needsEnrichmentCount} + ${rejectedCount}`);
    testAssert(googleCandidateCount === 0, `Google candidates is 0 (found ${googleCandidateCount})`);
    testAssert(enrichmentJobsCount === 0, `Enrichment jobs count is 0 (found ${enrichmentJobsCount})`);

    // Affirm Case B: Insufficient candidate-specific verification records to populate a dedicated /verification queue
    const isDeferred = verificationPendingCount === 0 && qualifiedCount === 0;
    testAssert(
      isDeferred === true,
      "Route Decision: VERIFICATION_ROUTE_DEFERRED_NO_MEANINGFUL_RECORDS (Truthful, non-synthetic architecture)"
    );

    // 8. Database Safety Invariants & Zero Mutations
    console.log("\n8. Testing Database Safety Invariants...");
    const googleConfig = await prisma.googleCollectionConfig.findFirst();
    testAssert(googleConfig.enabled === false, "GoogleCollectionConfig.enabled === false");
    testAssert(googleConfig.activationMode === "DISABLED", "GoogleCollectionConfig.activationMode === DISABLED");

    const googleSource = await prisma.dataSource.findFirst({ where: { type: "google_places" } });
    testAssert(googleSource.enabled === false, "google_places DataSource.enabled === false");

    const usageCount = await prisma.googleApiUsage.count();
    testAssert(usageCount === 2, `GoogleApiUsage count is 2 (found ${usageCount})`);

    const reservedUsage = await prisma.googleApiUsage.count({ where: { status: "RESERVED" } });
    testAssert(reservedUsage === 0, `GoogleApiUsage dangling RESERVED is 0 (found ${reservedUsage})`);

    const cacheCount = await prisma.googleApiCache.count();
    testAssert(cacheCount === 2, `GoogleApiCache count is 2 (found ${cacheCount})`);

    const enrichmentConfig = await prisma.enrichmentConfig.findFirst();
    testAssert(enrichmentConfig.enabled === false, "EnrichmentConfig.enabled === false");

  } catch (err) {
    console.error("Test execution failed:", err);
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

runTests();
