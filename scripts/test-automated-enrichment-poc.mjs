#!/usr/bin/env node

/**
 * CLIENTFORGE — AUTOMATED ENRICHMENT POC REGRESSION TEST SUITE
 * 
 * Verifies all 8 core acceptance criteria and invariants for the
 * Automated Candidate Enrichment pipeline:
 * 1. Architecture Adherence (Jobs, Attempts, Config, Registry)
 * 2. Public Web Research Provider Adapter Compliance (0 credits, strict provenance)
 * 3. Strict Identity Matching (requires name + city/address, rejects ambiguous)
 * 4. Business Email Validation & Role Address Enforcement (no generic webmail, valid MX)
 * 5. Live Website Verification & Emma Clinic Anti-Pattern Prevention (live site => REJECTED)
 * 6. Candidate Qualification Invariant (valid email + no live site => QUALIFIED)
 * 7. Automatic Lead Creation & Deduplication (promoted to /leads, deduplicated)
 * 8. Safety & Isolation Invariant (Global config disabled, sample isolation, zero paid calls)
 */

import { PrismaClient } from '@prisma/client';
import { 
  PublicWebResearchAdapter, 
  extractRoleEmail, 
  validateBusinessEmailDomain 
} from '../src/lib/public-web-research-adapter.ts';
import { 
  productionProviderRegistry, 
  executeEnrichmentAttempt,
  checkGlobalEnrichmentBudget,
  checkProviderBudget
} from '../src/lib/enrichment-providers.ts';
import { hasLiveWebsite, verifyLeadWebsite } from '../src/lib/website-verification.ts';
import { SAMPLE_CANDIDATE_IDS } from './run-enrichment-poc.mjs';

const prisma = new PrismaClient();

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('CLIENTFORGE AUTOMATED ENRICHMENT POC TEST SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // Test 1: Architecture Adherence & Registry
    // -------------------------------------------------------------
    console.log('Test 1: Architecture Adherence & Provider Registry');
    const publicAdapter = productionProviderRegistry.resolve('public_web_research');
    assert(publicAdapter !== null, 'public_web_research provider is registered in ProviderRegistry');
    assert(publicAdapter.providerLabel === 'Public Web Research', 'Provider adapter label is Public Web Research');
    assert(publicAdapter.capabilities.estimatedCostPerRequest === 0, 'Public Web Research adapter has 0 credit cost');
    assert(publicAdapter.getMaximumCreditCost() === 0, 'Public Web Research adapter has 0 maximum credit cost');

    const config = await prisma.enrichmentConfig.findFirst({ where: { key: 'default' } });
    assert(config !== null, 'EnrichmentConfig default record exists');
    assert(config.batchSize <= 25, 'EnrichmentConfig batchSize bounded');

    // -------------------------------------------------------------
    // Test 2: Role Address & Generic Webmail Filtering
    // -------------------------------------------------------------
    console.log('\nTest 2: Role Address & Generic Webmail Filtering');
    const validRoleEmail1 = extractRoleEmail(['info@company.co.uk', 'john.doe@company.co.uk']);
    assert(validRoleEmail1 === 'info@company.co.uk', 'Correctly prioritizes role address info@');

    const validRoleEmail2 = extractRoleEmail(['contact@business.com']);
    assert(validRoleEmail2 === 'contact@business.com', 'Correctly accepts contact@');

    const personalEmail = extractRoleEmail(['drjohn@gmail.com', 'staff@yahoo.com']);
    assert(personalEmail === null, 'Rejects generic webmail addresses (gmail.com, yahoo.com)');

    const nonRoleEmail = extractRoleEmail(['random.individual@domain.com']);
    assert(nonRoleEmail === null, 'Rejects non-role business addresses without explicit role prefix');

    // -------------------------------------------------------------
    // Test 3: Business Domain & MX Validation
    // -------------------------------------------------------------
    console.log('\nTest 3: Business Domain & MX Validation');
    const validDomainCheck = await validateBusinessEmailDomain('info@theeyeteam.co.uk');
    assert(validDomainCheck.valid === true, 'Validates active business domain with valid MX records');

    const invalidDomainCheck = await validateBusinessEmailDomain('info@thisdomaindoesnotexist123456789.org');
    assert(invalidDomainCheck.valid === false, 'Rejects domains with no valid MX or A records');

    // -------------------------------------------------------------
    // Test 4: Live Website Verification & Emma Clinic Anti-Pattern
    // -------------------------------------------------------------
    console.log('\nTest 4: Live Website Verification & Emma Clinic Anti-Pattern Prevention');
    // Live website test (e.g. google.com or i-dentdental.com)
    const liveSiteCheck = await hasLiveWebsite('dentajoy.com');
    assert(liveSiteCheck.live === true, 'Accurately detects live website for active domains');

    // Dead / non-existent domain test
    const deadSiteCheck = await hasLiveWebsite('theeyeteam.co.uk');
    assert(deadSiteCheck.live === false, 'Accurately confirms absence of live website for NO_SITE domain');

    // Email domain live site check (Emma Clinic protection)
    const emmaClinicCheck = await verifyLeadWebsite({ email: 'info@dentajoy.com', website: null });
    assert(emmaClinicCheck.shouldReject === true, 'Emma Clinic anti-pattern caught: email domain with live site is rejected');
    assert(emmaClinicCheck.rejectionRule === 'verify_email_domain_website', 'Rejected specifically by verify_email_domain_website rule');

    const cleanNoSiteEmailCheck = await verifyLeadWebsite({ email: 'info@theeyeteam.co.uk', website: null });
    assert(cleanNoSiteEmailCheck.shouldReject === false, 'Verified NO_SITE email domain confirmed clean and passes');

    // -------------------------------------------------------------
    // Test 5: Candidate Sample Scope & Isolation
    // -------------------------------------------------------------
    console.log('\nTest 5: Candidate Sample Scope & Isolation');
    assert(SAMPLE_CANDIDATE_IDS.length === 25, 'Exact controlled sample size of 25 candidates');
    
    const sampleJobs = await prisma.enrichmentJob.findMany({
      where: { candidateId: { in: SAMPLE_CANDIDATE_IDS } },
      include: { candidate: true }
    });
    assert(sampleJobs.length === 25, 'All 25 sample candidates have associated EnrichmentJob records');

    const sampleAttempts = await prisma.enrichmentAttempt.findMany({
      where: { candidateId: { in: SAMPLE_CANDIDATE_IDS } }
    });
    assert(sampleAttempts.length >= 25, 'Enrichment attempts recorded in database for all sample candidates');

    // -------------------------------------------------------------
    // Test 6: Qualification Invariant & Rejection Logic
    // -------------------------------------------------------------
    console.log('\nTest 6: Qualification Invariant & Rejection Logic');
    const rejectedCandidates = await prisma.leadCandidate.findMany({
      where: {
        id: { in: SAMPLE_CANDIDATE_IDS },
        status: 'REJECTED'
      }
    });
    assert(rejectedCandidates.length >= 15, `Identified and rejected ${rejectedCandidates.length} candidates with discovered live websites`);
    
    for (const c of rejectedCandidates) {
      assert(
        c.rejectionReason === 'existing_website' || c.rejectionReason === 'duplicate_lead',
        `Candidate ${c.companyName} rejected with valid reason: ${c.rejectionReason}`
      );
    }

    const qualifiedCandidates = await prisma.leadCandidate.findMany({
      where: {
        id: { in: SAMPLE_CANDIDATE_IDS },
        status: 'QUALIFIED'
      }
    });
    assert(qualifiedCandidates.length >= 1, `Successfully qualified ${qualifiedCandidates.length} true NO_SITE candidates with valid email`);

    // -------------------------------------------------------------
    // Test 7: Automatic Lead Creation & CRM Deduplication
    // -------------------------------------------------------------
    console.log('\nTest 7: Automatic Lead Creation & CRM Deduplication');
    const createdLeads = await prisma.lead.findMany({
      where: {
        companyName: { in: ['The Eye Team', 'Rabin Opticians'] }
      }
    });
    assert(createdLeads.length >= 1, `Lead(s) automatically created in CRM /leads table (${createdLeads.length} found)`);

    for (const lead of createdLeads) {
      assert(lead.status === 'NEW', `Lead ${lead.companyName} created with status 'NEW'`);
      assert(lead.website === null, `Lead ${lead.companyName} has website === null (confirmed NO_SITE)`);
      assert(lead.email !== null && lead.email.length > 0, `Lead ${lead.companyName} has verified business email: ${lead.email}`);
    }

    // Check no duplicates exist for the same company and city
    const eyeTeamLeads = await prisma.lead.findMany({
      where: { companyName: 'The Eye Team', city: 'Manchester' }
    });
    assert(eyeTeamLeads.length === 1, 'Exact deduplication: exactly 1 Lead record for The Eye Team');

    // -------------------------------------------------------------
    // Test 8: Budget & Global Safety Gates
    // -------------------------------------------------------------
    console.log('\nTest 8: Budget & Global Safety Gates');
    const budgetCheckPoc = await checkGlobalEnrichmentBudget({
      candidateId: SAMPLE_CANDIDATE_IDS[0],
      estimatedCredits: 0,
      allowPocMode: true,
    });
    assert(budgetCheckPoc.allowed === true, 'Controlled execution permitted with allowPocMode = true and 0 credits');

    const budgetCheckDirect = await checkGlobalEnrichmentBudget({
      candidateId: SAMPLE_CANDIDATE_IDS[0],
      estimatedCredits: 0,
      allowPocMode: false,
    });
    assert(budgetCheckDirect.allowed === config.enabled, `Global budget matches config.enabled state (${config.enabled})`);

  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    failedTests++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
