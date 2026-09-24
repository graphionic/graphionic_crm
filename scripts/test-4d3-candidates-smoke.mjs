import { PrismaClient } from "@prisma/client";
import {
  formatCountdown,
  githubRunUrl,
  humanReadableRejection,
  humanReadableSource,
  humanReadableExternalType,
  classifyEmail,
  statusBadgeStyle,
  humanReadableDecision,
} from "../src/components/collector/collector-utils.ts";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== Phase 4D.3 Candidate Operations Smoke Tests ===");
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
    // 1. Formatters & Classifiers
    console.log("\n1. Testing Collector Formatters & Classifiers...");
    assert(humanReadableRejection("existing_website") === "Existing website", "humanReadableRejection existing_website");
    assert(humanReadableRejection("email_domain_has_live_website") === "Email domain has live website", "humanReadableRejection email_domain_has_live_website");
    assert(humanReadableRejection("generic_email") === "Generic email domain", "humanReadableRejection generic_email");
    assert(humanReadableSource("overpass") === "OpenStreetMap (Overpass)", "humanReadableSource overpass");
    assert(humanReadableSource("google_places") === "Google Places", "humanReadableSource google_places");
    assert(humanReadableExternalType("node") === "Node", "humanReadableExternalType node");
    assert(humanReadableExternalType("way") === "Way", "humanReadableExternalType way");

    const genericTest = classifyEmail("owner@gmail.com");
    assert(genericTest.status === "GENERIC_WEBMAIL" && genericTest.domain === "gmail.com", "classifyEmail identifies generic webmail");

    const businessTest = classifyEmail("contact@dentist-berlin.de");
    assert(businessTest.status === "VALID_BUSINESS" && businessTest.domain === "dentist-berlin.de", "classifyEmail identifies business domain");

    const emptyTest = classifyEmail(null);
    assert(emptyTest.status === "NONE", "classifyEmail handles null/empty email");

    const ghLink = githubRunUrl("18014512705");
    assert(ghLink === "https://github.com/graphionic/graphionic_crm/actions/runs/18014512705", "githubRunUrl formats valid run ID");
    assert(githubRunUrl(null) === null, "githubRunUrl handles null");

    // 2. Human Readable Decision Intelligence
    console.log("\n2. Testing Human Readable Decision Intelligence...");
    const sampleNeedsEnrichment = {
      status: "NEEDS_ENRICHMENT",
      email: null,
      website: null,
    };
    const decisionNE = humanReadableDecision(sampleNeedsEnrichment);
    assert(decisionNE.statusTitle === "Needs Enrichment" && decisionNE.tone === "warn", "Decision for NEEDS_ENRICHMENT");

    const sampleRejectedWebsite = {
      status: "REJECTED",
      rejectionReason: "existing_website",
      website: "https://example.com",
    };
    const decisionRW = humanReadableDecision(sampleRejectedWebsite);
    assert(decisionRW.statusTitle === "Rejected — Existing Website" && decisionRW.tone === "bad", "Decision for existing_website");

    const sampleRejectedDomainSite = {
      status: "REJECTED",
      rejectionReason: "email_domain_has_live_website",
      email: "info@emmaclinic.com",
    };
    const decisionRDS = humanReadableDecision(sampleRejectedDomainSite);
    assert(decisionRDS.statusTitle === "Rejected — Live Website on Email Domain" && decisionRDS.tone === "bad", "Decision for email_domain_has_live_website");

    // 3. Database Safety & Candidate Records Integrity
    console.log("\n3. Testing Database Safety & Candidate Integrity...");
    const totalCandidates = await prisma.leadCandidate.count();
    const needsEnrichmentCount = await prisma.leadCandidate.count({ where: { status: "NEEDS_ENRICHMENT" } });
    const rejectedCount = await prisma.leadCandidate.count({ where: { status: "REJECTED" } });

    assert(totalCandidates >= 649, `Total candidates in DB is at least 649 (found ${totalCandidates})`);
    assert(needsEnrichmentCount >= 408, `Needs Enrichment candidates is at least 408 (found ${needsEnrichmentCount})`);
    assert(rejectedCount >= 241, `Rejected candidates is at least 241 (found ${rejectedCount})`);
    assert(totalCandidates === needsEnrichmentCount + rejectedCount, `Partitioning intact: total ${totalCandidates} = ${needsEnrichmentCount} + ${rejectedCount}`);

    // Safety invariants: Google disabled, zero google candidates
    const googleConfig = await prisma.googleCollectionConfig.findFirst();
    assert(googleConfig?.enabled === false && googleConfig?.activationMode === "DISABLED", "Google Places config is strictly DISABLED");

    const googleSource = await prisma.dataSource.findFirst({ where: { type: "google_places" } });
    assert(googleSource?.enabled === false, "Google Places DataSource is strictly disabled");

    const googleCandidates = await prisma.leadCandidate.count({ where: { externalType: "google_place" } });
    assert(googleCandidates === 0, `Zero Google candidates in DB (found ${googleCandidates})`);

    // Fetch sample candidate with all relations and verify structure
    const sampleRecord = await prisma.leadCandidate.findFirst({
      where: { rejectionReason: "existing_website" },
      include: {
        discoverySource: true,
        discoveryRun: { include: { location: true, category: true, source: true } },
      },
    });
    assert(sampleRecord !== null, "Found sample candidate record with relations");
    assert(sampleRecord.discoverySource !== null, "Sample candidate has discoverySource relation");
    assert(sampleRecord.discoveryRun !== null, "Sample candidate has discoveryRun relation");

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
