#!/usr/bin/env node
/**
 * ClientForge CRM — Phase 4C.4C.5D.2A Fresh Verification Candidate Finder
 *
 * READ-ONLY / ZERO GOOGLE REQUESTS / NO PRODUCTION MUTATION
 *
 * Queries existing OSM candidates to find a fresh, active candidate suitable for
 * future single-candidate Phase 5D.2 Google Places cross-source website verification.
 *
 * Requirements:
 * 1. Delegates to canonical evaluateGoogleWebsiteVerificationEligibility() and website verification rules.
 * 2. Allows role-based local parts (info@, contact@, sales@, hello@) on valid business domains.
 * 3. Excludes generic/free email domains (gmail, yahoo, etc.).
 * 4. Excludes candidates with known websites or live website evidence.
 * 5. Excludes candidates previously rejected for existing_website or email_domain_has_live_website.
 * 6. Excludes already qualified leads.
 * 7. Enforces OSM discovery provenance (no synthetic/Google-only records).
 * 8. Enforces strong identity data (rejects name-only and coordinates-only).
 * 9. Deterministic selection: active status (NEEDS_ENRICHMENT) > strongest identity > newest createdAt.
 * 10. Returns structured exclusion counts and safe candidate summary.
 */

import { PrismaClient } from '@prisma/client';
import {
  extractEmailDomain,
  isGenericEmailDomain,
} from '../src/lib/website-verification.ts';
import {
  evaluateGoogleWebsiteVerificationEligibility,
  planGoogleIdentityResolutionSearch,
  MAX_VERIFICATION_NETWORK_REQUESTS_CAP,
} from '../src/lib/google-website-verification.ts';

export const COMMON_ROLE_LOCAL_PARTS = new Set([
  'info',
  'contact',
  'support',
  'admin',
  'office',
  'help',
  'sales',
  'hello',
  'enquiries',
  'enquiry',
  'mail',
  'team',
  'service',
]);

export function isOsmSource(candidate) {
  if (!candidate) return false;
  const srcType = candidate.discoverySource?.type || '';
  if (srcType === 'overpass') return true;
  const extType = candidate.externalType || '';
  if (['node', 'way', 'relation'].includes(extType)) return true;
  const srcStr = (candidate.source || '').toLowerCase();
  if (srcStr.includes('overpass') || srcStr.includes('osm')) return true;
  return false;
}

export function computeIdentityStrength(candidate) {
  let score = 0;
  const fields = [];

  if (candidate.companyName && candidate.companyName.trim().length > 0) {
    fields.push('companyName');
    score += 1;
  }
  if (candidate.address && candidate.address.trim().length > 0) {
    fields.push('address');
    score += 3;
  }
  if ((candidate.postcode || candidate.postalCode) && (candidate.postcode || candidate.postalCode).trim().length > 0) {
    fields.push('postcode');
    score += 3;
  }
  if (candidate.phone && candidate.phone.trim().length > 0) {
    fields.push('phone');
    score += 3;
  }
  if (candidate.city && candidate.city.trim().length > 0) {
    fields.push('city');
    score += 2;
  }
  if (candidate.latitude != null && candidate.longitude != null) {
    fields.push('coordinates');
    score += 1;
  }

  return { score, fields };
}

export async function findGoogleVerificationCandidate(prisma, options = {}) {
  const candidates = options.mockCandidates || await prisma.leadCandidate.findMany({
    include: {
      discoverySource: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const exclusionCounts = {
    totalCandidates: candidates.length,
    missingEmail: 0,
    genericEmailDomain: 0,
    knownWebsite: 0,
    emailDomainLiveWebsite: 0,
    existingWebsite: 0,
    alreadyQualified: 0,
    wrongSource: 0,
    insufficientIdentity: 0,
    permanentlyRejectedOther: 0,
    alreadyVerifiedLive: 0,
  };

  const eligibleCandidates = [];

  for (const candidate of candidates) {
    // 1. Check if already qualified
    if (candidate.status === 'QUALIFIED' || candidate.qualifiedLeadId) {
      exclusionCounts.alreadyQualified++;
      continue;
    }

    // 2. Check rejection reasons for conclusive past live website checks
    if (candidate.status === 'REJECTED') {
      const rej = candidate.rejectionReason || '';
      if (rej === 'existing_website') {
        exclusionCounts.existingWebsite++;
        continue;
      }
      if (rej === 'email_domain_has_live_website') {
        exclusionCounts.emailDomainLiveWebsite++;
        continue;
      }
      if (rej === 'duplicate' || rej === 'invalid_data') {
        exclusionCounts.permanentlyRejectedOther++;
        continue;
      }
    }

    // 3. Source requirement: OSM provenance
    if (!isOsmSource(candidate)) {
      exclusionCounts.wrongSource++;
      continue;
    }

    // 4. Known website check
    if (candidate.website && candidate.website.trim().length > 0) {
      exclusionCounts.knownWebsite++;
      continue;
    }

    // 5. Metadata live website check
    if (candidate.metadata && typeof candidate.metadata === 'object') {
      const meta = candidate.metadata;
      if (meta.googleWebsiteVerifiedLive === true) {
        exclusionCounts.alreadyVerifiedLive++;
        continue;
      }
    }

    // 6. Email presence
    const rawEmail = (candidate.email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      exclusionCounts.missingEmail++;
      continue;
    }

    // 7. Generic email domain check
    const emailDomain = extractEmailDomain(rawEmail);
    if (!emailDomain || isGenericEmailDomain(emailDomain)) {
      exclusionCounts.genericEmailDomain++;
      continue;
    }

    // 8. Identity requirements (reject name-only or coordinates-only)
    const { score: identityScore, fields: identityFields } = computeIdentityStrength(candidate);
    const hasStrongAnchor =
      identityFields.includes('address') ||
      identityFields.includes('postcode') ||
      identityFields.includes('phone') ||
      (identityFields.includes('city') && identityFields.includes('coordinates'));

    if (!hasStrongAnchor) {
      exclusionCounts.insufficientIdentity++;
      continue;
    }

    // 9. Canonical eligibility evaluation
    const elig = evaluateGoogleWebsiteVerificationEligibility(candidate);
    if (!elig.eligible) {
      if (elig.reason?.includes('EMAIL')) exclusionCounts.missingEmail++;
      else if (elig.reason?.includes('WEBSITE')) exclusionCounts.knownWebsite++;
      else exclusionCounts.insufficientIdentity++;
      continue;
    }

    // Candidate passed all gates
    const localPart = rawEmail.split('@')[0].trim();
    const isRoleMailbox = COMMON_ROLE_LOCAL_PARTS.has(localPart);

    eligibleCandidates.push({
      candidate,
      identityScore,
      identityFields,
      emailDomain,
      isRoleMailbox,
      eligibilityReason: elig.reason || 'PASSED_ALL_CANONICAL_GATES',
    });
  }

  if (eligibleCandidates.length === 0) {
    return {
      status: 'NO_ELIGIBLE_CANDIDATE',
      selectedCandidate: null,
      eligibleCandidatesCount: 0,
      exclusionCounts,
      dryRun: true,
      networkRequests: 0,
      budgetReservations: 0,
      dbMutations: 0,
    };
  }

  // Deterministic sorting:
  // 1. Status: NEEDS_ENRICHMENT > others
  // 2. Identity Score: higher > lower
  // 3. Recency: createdAt descending
  eligibleCandidates.sort((a, b) => {
    const statusPriorityA = a.candidate.status === 'NEEDS_ENRICHMENT' ? 10 : 0;
    const statusPriorityB = b.candidate.status === 'NEEDS_ENRICHMENT' ? 10 : 0;
    if (statusPriorityA !== statusPriorityB) {
      return statusPriorityB - statusPriorityA;
    }

    if (a.identityScore !== b.identityScore) {
      return b.identityScore - a.identityScore;
    }

    const timeA = new Date(a.candidate.createdAt || 0).getTime();
    const timeB = new Date(b.candidate.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const winner = eligibleCandidates[0];
  const winCand = winner.candidate;

  let futureStageAQuery = `${winCand.companyName}`;
  try {
    const plan = planGoogleIdentityResolutionSearch({ candidate: winCand });
    futureStageAQuery = plan.textQuery;
  } catch {
    // fallback
    if (winCand.city) futureStageAQuery += ` ${winCand.city}`;
    if (winCand.country) futureStageAQuery += ` ${winCand.country}`;
  }

  const selectedSummary = {
    candidateId: winCand.id,
    companyName: winCand.companyName,
    category: winCand.businessCategory || 'unknown',
    city: winCand.city || null,
    country: winCand.country || null,
    candidateStatus: winCand.status,
    emailDomain: winner.emailDomain,
    roleMailbox: winner.isRoleMailbox,
    identityFieldsAvailable: winner.identityFields,
    identityScore: winner.identityScore,
    discoverySource: winCand.discoverySource?.name || 'OpenStreetMap Overpass',
    discoveredAt: winCand.createdAt ? new Date(winCand.createdAt).toISOString() : null,
    eligibilityReason: winner.eligibilityReason,
    futureStageAQuery,
    futureMaximumGoogleRequests: MAX_VERIFICATION_NETWORK_REQUESTS_CAP,
  };

  return {
    status: 'SELECTED',
    selectedCandidate: selectedSummary,
    eligibleCandidatesCount: eligibleCandidates.length,
    exclusionCounts,
    dryRun: true,
    networkRequests: 0,
    budgetReservations: 0,
    dbMutations: 0,
  };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('====================================================');
    console.log('[candidate-finder] Phase 4C.4C.5D.2A Read-Only Candidate Finder');
    console.log('====================================================');

    const result = await findGoogleVerificationCandidate(prisma);
    console.log(JSON.stringify(result, null, 2));

    if (result.status === 'SELECTED') {
      console.log('\n[candidate-finder] CANDIDATE SELECTED for future Phase 5D.2 proof:');
      console.log(`- Candidate ID: ${result.selectedCandidate.candidateId}`);
      console.log(`- Company Name: ${result.selectedCandidate.companyName}`);
      console.log(`- Scope: ${result.selectedCandidate.country} / ${result.selectedCandidate.city} / ${result.selectedCandidate.category}`);
      console.log(`- Status: ${result.selectedCandidate.candidateStatus}`);
      console.log(`- Email Domain: ${result.selectedCandidate.emailDomain} (Role mailbox: ${result.selectedCandidate.roleMailbox})`);
      console.log(`- Identity Fields: ${result.selectedCandidate.identityFieldsAvailable.join(', ')} (Score: ${result.selectedCandidate.identityScore})`);
      console.log(`- Future Search Query: "${result.selectedCandidate.futureStageAQuery}"`);
      console.log(`- Future Max Requests: ${result.selectedCandidate.futureMaximumGoogleRequests}`);
      console.log('\n[candidate-finder] STOPPED: Do NOT activate Google or verify candidate until authorized.');
    } else {
      console.log('\n[candidate-finder] NO_ELIGIBLE_CANDIDATE in current production pool.');
      console.log('Exclusion Breakdown:', JSON.stringify(result.exclusionCounts, null, 2));
      console.log('\nScheduled OSM collection will continue producing fresh candidates.');
    }
  } catch (err) {
    console.error('[candidate-finder] ERROR:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && (process.argv[1].endsWith('/find-google-verification-candidate.mjs') || process.argv[1].endsWith('scripts/find-google-verification-candidate.mjs')) && !process.argv[1].includes('test-')) {
  main();
}
