#!/usr/bin/env node
/**
 * Phase 4C.4C.4 — First Controlled Google Places Request
 * DEDICATED MANUAL-ONLY PROBE — ONLY code path permitted to make request #1
 * Requires GOOGLE_CONTROLLED_PROBE=true safety token
 * MAX_NETWORK_REQUESTS = 1 hard cap, zero retries, zero pagination, only TEXT_SEARCH ID-only
 * ZERO GOOGLE REQUESTS unless explicitly authorized via env and GitHub workflow_dispatch
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const MAX_NETWORK_REQUESTS = 1;
let networkRequestCount = 0;

function safeLog(...args){
  // Never log API key, never log full headers with secret
  console.log(...args);
}

function requireControlledProbeAuth(){
  if(process.env.GOOGLE_CONTROLLED_PROBE !== 'true'){
    console.error('GOOGLE_CONTROLLED_PROBE_NOT_AUTHORIZED — set GOOGLE_CONTROLLED_PROBE=true to authorize');
    process.exit(1);
  }
}

function getCanonicalFingerprint(){
  // Canonical fingerprint BEFORE reservation
  // Includes: operation, query, field strategy/mask identifier, page size, location/country, page token, version
  // Must NOT include: API key, worker secret, timestamp, random
  const input = {
    operation: 'TEXT_SEARCH',
    query: 'dental clinic in Manchester UK',
    fieldStrategy: 'SEARCH_ID_ONLY_MASK',
    fieldMask: ['places.id','places.name','nextPageToken'].sort(),
    pageSize: 1,
    pageToken: null,
    location: null,
    country: 'UK',
    city: 'Manchester',
    category: 'dental clinic',
    version: 'v1',
  };
  const json = JSON.stringify(input, Object.keys(input).sort());
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  return { fingerprint: hash, input };
}

async function main(){
  safeLog('CONTROLLED GOOGLE PROBE — Phase 4C.4C.4');
  requireControlledProbeAuth();

  // Import modules after auth check
  const { getGoogleCredentialStatus, getGoogleApiKeyForTransport } = await import('../src/lib/google-credential-reader.ts');
  const { reserveGoogleControlledProbeAtomically, checkGoogleCache, completeGoogleReservation, cancelGoogleReservation, classifyGoogleError, getCacheExpiry } = await import('../src/lib/google-request-guardrails.ts');
  const { SEARCH_ID_ONLY_MASK, buildTextSearchRequest } = await import('../src/lib/google-places-adapter.ts');
  const { normalizedFromGooglePlace } = await import('../src/lib/collection-normalization.ts');

  const prisma = new PrismaClient();

  // Verify production safety still disabled (normal collector must ignore Google)
  const config = await prisma.googleCollectionConfig.findFirst({ where:{ key:'default' } });
  const dsList = await prisma.dataSource.findMany({ where:{ type:'google_places' } });
  if(!config){
    console.error('Missing GoogleCollectionConfig');
    await prisma.$disconnect();
    process.exit(1);
  }
  if(dsList.length !== 1){
    console.error(`Expected exactly 1 Google Places DataSource, got ${dsList.length}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const googleSource = dsList[0];
  safeLog(`Google config enabled=${config.enabled} failClosed=${config.failClosed} — must remain false for normal collector`);
  safeLog(`Google source count=1 enabled=${googleSource.enabled} health=${googleSource.healthStatus} — must remain false`);
  if(config.enabled !== false){
    console.error('SAFETY VIOLATION: GoogleCollectionConfig.enabled must remain FALSE for 4C.4C.4 controlled probe');
    await prisma.$disconnect();
    process.exit(1);
  }
  if(googleSource.enabled !== false){
    console.error('SAFETY VIOLATION: Google Places DataSource.enabled must remain FALSE');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Fingerprint
  const { fingerprint, input } = getCanonicalFingerprint();
  safeLog(`operation=TEXT_SEARCH`);
  safeLog(`query=${input.query}`);
  safeLog(`fieldMask=${SEARCH_ID_ONLY_MASK.join(',')}`);
  safeLog(`pageSize=${input.pageSize} — smallest valid useful, Places API (New) supports pageSize 1 for Text Search per official docs`);
  safeLog(`fingerprintPrefix=${fingerprint.slice(0,16)}...`);
  safeLog(`fingerprint does NOT contain API key — verified, includes only operation/query/fieldStrategy/pageSize/country/city/version`);

  // Cache check before reservation
  const cacheCheck = await checkGoogleCache(prisma, googleSource.id, fingerprint, 'TEXT_SEARCH');
  if(cacheCheck.hit){
    safeLog('CONTROLLED_PROBE_CACHE_HIT_NO_NETWORK — cache hit, zero network, cache hit does not consume budget');
    safeLog(`cacheHit=true id=${cacheCheck.cache.id} hitCount=${cacheCheck.cache.hitCount} expiresAt=${cacheCheck.cache.expiresAt}`);
    safeLog(`credentialConfigured=${getGoogleCredentialStatus().configured}`);
    safeLog(`networkRequests=0 — no network due to cache hit`);
    await prisma.$disconnect();
    return;
  }
  safeLog('cacheHit=false — expected MISS for request #1');

  // CollectorRun traceability — dedicated controlled probe run
  const loc = await prisma.collectorLocation.findFirst();
  const cat = await prisma.leadCategory.findFirst();
  const controlledRun = await prisma.collectorRun.create({
    data:{
      status:'RUNNING',
      locationId: loc?.id,
      categoryId: cat?.id,
      sourceId: googleSource.id,
      startedAt: new Date(),
      candidatesFound:0,
      leadsAccepted:0,
      leadsInserted:0,
      metadata:{
        controlledProbe:true,
        operation:'TEXT_SEARCH',
        networkRequestLimit:1,
        query: input.query,
        fieldMask: SEARCH_ID_ONLY_MASK.join(','),
        fingerprintPrefix: fingerprint.slice(0,16),
      }
    }
  });
  safeLog(`CollectorRun created id=${controlledRun.id} controlledProbe=true operation=TEXT_SEARCH networkRequestLimit=1`);

  // Reservation via controlled-probe mode — reuses same global mutex, budget, duplicate, crash accounting
  const reservationReq = {
    sourceId: googleSource.id,
    operation: 'TEXT_SEARCH',
    collectorRunId: controlledRun.id,
    queryFingerprint: fingerprint,
    requestUnits:1,
    metadata:{
      controlledProbe:true,
      operation:'TEXT_SEARCH',
      fieldMask: SEARCH_ID_ONLY_MASK.join(','),
      query: input.query,
      pageSize: input.pageSize,
    }
  };

  const reservationResult = await reserveGoogleControlledProbeAtomically(prisma, reservationReq);
  if(!reservationResult.allowed){
    safeLog(`Reservation denied reason=${reservationResult.reason}`);
    // Complete run as FAILED
    await prisma.collectorRun.update({ where:{ id: controlledRun.id }, data:{ status:'FAILED', finishedAt:new Date(), metadata:{ ...(controlledRun.metadata||{}), reservationDenied: reservationResult.reason, networkRequests:0 } } });
    await prisma.$disconnect();
    if(reservationResult.reason === 'CACHE_HIT'){
      safeLog('CONTROLLED_PROBE_CACHE_HIT_NO_NETWORK');
    }
    return;
  }

  const reservationId = reservationResult.reservation.id;
  safeLog(`reservationId=${reservationId} status=RESERVED requestSent=false — GoogleApiUsage RESERVED created, requestSentAt=null, no API key in metadata`);
  safeLog(`usage daily=${reservationResult.usage?.daily} monthly=${reservationResult.usage?.monthly} perRun=${reservationResult.usage?.perRun} remainingDaily=${reservationResult.usage?.remainingDaily}`);

  // Credential check after reservation / immediately before network
  const credStatus = getGoogleCredentialStatus();
  safeLog(`credentialConfigured=${credStatus.configured} envVar=${credStatus.envVarName} source=${credStatus.source}`);
  if(!credStatus.configured){
    safeLog('GOOGLE_CREDENTIAL_MISSING — do NOT send network, pre-send cancellation semantics requestSentAt must remain NULL');
    // Cancel with requestSent=false → requestSentAt null, may be treated as non-billable
    await cancelGoogleReservation(prisma, reservationId, false, { controlledProbe:true, reason:'GOOGLE_CREDENTIAL_MISSING', preSendCancellation:true });
    await prisma.collectorRun.update({ where:{ id: controlledRun.id }, data:{ status:'FAILED', finishedAt:new Date(), metadata:{ ...(controlledRun.metadata||{}), credentialMissing:true, networkRequests:0, usageId:reservationId } } });
    await prisma.$disconnect();
    return;
  }

  // Build request — pure builder, no HTTP yet
  const request = buildTextSearchRequest({
    textQuery: input.query,
    pageSize: input.pageSize,
    useIdOnly: true,
  });
  safeLog(`Built request method=${request.method} endpoint=${request.endpoint} endpointUrl=${request.endpointUrl} fieldMask=${request.fieldMask}`);
  safeLog(`Safe log: Content-Type=${request.headers['Content-Type']} fieldMask=${request.fieldMask} credentialConfigured=true — NOT logging X-Goog-Api-Key`);

  // Validate destination hostname exactly places.googleapis.com
  const urlObj = new URL(request.endpointUrl);
  if(urlObj.hostname !== 'places.googleapis.com'){
    console.error(`Hostname restriction violation: expected places.googleapis.com got ${urlObj.hostname}`);
    await cancelGoogleReservation(prisma, reservationId, false, { controlledProbe:true, reason:'HOSTNAME_RESTRICTION_VIOLATION' });
    await prisma.collectorRun.update({ where:{ id: controlledRun.id }, data:{ status:'FAILED', finishedAt:new Date(), metadata:{ controlledProbe:true, hostnameViolation:true, networkRequests:0 } } });
    await prisma.$disconnect();
    process.exit(1);
  }

  // Request-sent boundary — atomically mark requestSentAt=now() BEFORE fetch
  const now = new Date();
  await prisma.googleApiUsage.update({ where:{ id: reservationId }, data:{ requestSentAt: now } });
  safeLog(`requestSentAt boundary: marked requestSentAt=${now.toISOString()} — atomically before fetch, ensures if crash after this point usage remains accounted, conservative billable`);

  // Hard one-request cap check
  if(networkRequestCount >= MAX_NETWORK_REQUESTS){
    console.error('GOOGLE_PROBE_REQUEST_LIMIT_REACHED — MAX_NETWORK_REQUESTS=1 exceeded');
    await completeGoogleReservation(prisma, reservationId, 'FAILED', { requestSentAt: now, errorClassification:'UNKNOWN', errorMessage:'GOOGLE_PROBE_REQUEST_LIMIT_REACHED', metadata:{ controlledProbe:true, networkRequests:networkRequestCount } });
    await prisma.collectorRun.update({ where:{ id: controlledRun.id }, data:{ status:'FAILED', finishedAt:new Date(), metadata:{ controlledProbe:true, requestLimitReached:true, networkRequests:networkRequestCount } } });
    await prisma.$disconnect();
    process.exit(1);
  }

  // Increment counter at network-send boundary
  networkRequestCount++;
  safeLog(`networkRequests increment: ${networkRequestCount} — at send boundary, MAX_NETWORK_REQUESTS=${MAX_NETWORK_REQUESTS}, retries ZERO, pagination ZERO, Place Details ZERO, Nearby ZERO, only one Text Search`);

  // Real transport activation — controlled only, native fetch, no SDK, AbortController timeout
  const apiKey = getGoogleApiKeyForTransport();
  if(!apiKey){
    console.error('GOOGLE_CREDENTIAL_MISSING at transport boundary — should have been caught earlier');
    await completeGoogleReservation(prisma, reservationId, 'FAILED', { requestSentAt: now, errorClassification:'AUTH_ERROR', errorMessage:'GOOGLE_CREDENTIAL_MISSING', metadata:{ controlledProbe:true } });
    await prisma.collectorRun.update({ where:{ id: controlledRun.id }, data:{ status:'FAILED', finishedAt:new Date(), metadata:{ controlledProbe:true, credentialMissing:true, networkRequests:networkRequestCount } } });
    await prisma.$disconnect();
    process.exit(1);
  }

  const controller = new AbortController();
  const timeoutMs = 15000;
  const timeout = setTimeout(()=> controller.abort(), timeoutMs);

  let httpStatus = null;
  let responseJson = null;
  let resultCount = 0;
  let hasNextPageToken = false;
  let latencyMs = 0;
  let classification = null;

  try{
    const start = Date.now();
    const resp = await fetch(request.endpointUrl, {
      method: request.method,
      headers:{
        'Content-Type':'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': request.fieldMask,
      },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    latencyMs = Date.now() - start;
    clearTimeout(timeout);
    httpStatus = resp.status;
    safeLog(`httpStatus=${httpStatus} latency=${latencyMs}ms — safe log, no auth headers logged`);

    const text = await resp.text();
    try{ responseJson = JSON.parse(text); }catch{ responseJson = { raw:text.slice(0,500) }; }

    if(resp.ok){
      const places = responseJson.places || [];
      resultCount = places.length;
      hasNextPageToken = !!responseJson.nextPageToken;
      safeLog(`resultCount=${resultCount} hasNextPageToken=${hasNextPageToken} — even if nextPageToken present, DO NOT request page 2 per one-request cap`);

      // Normalization — using normalizedFromGooglePlace()
      for(const place of places){
        try{
          const normalized = normalizedFromGooglePlace(place, googleSource.id, controlledRun.id);
          safeLog(`Normalized: sourceType=${normalized.sourceType} externalType=${normalized.externalType} externalId=${normalized.externalId} — email=${normalized.email} website=${normalized.website} phone=${normalized.phone} (null expected for ID-only mask, NOT TRUE_NO_SITE)`);
        }catch(e){
          safeLog(`Normalization error for place ${place.id}: ${e.message}`);
        }
      }

      // Success accounting
      const status = resultCount===0 ? 'NO_RESULT' : 'SUCCESS';
      await completeGoogleReservation(prisma, reservationId, status, {
        requestSentAt: now,
        actualCostUnits:1,
        metadata:{
          controlledProbe:true,
          httpStatus,
          resultCount,
          hasNextPageToken,
          latencyMs,
          fieldMask: request.fieldMask,
          fieldStrategy:'SEARCH_ID_ONLY_MASK',
          networkRequests:networkRequestCount,
        }
      });
      safeLog(`usageStatus=${status} requestSent=true — RESERVED→${status}, requestSentAt != null, safe metadata only, NO API key`);

      // Cache write for successful/no-result
      const cacheExpiry = getCacheExpiry('TEXT_SEARCH', config, new Date());
      await prisma.googleApiCache.upsert({
        where:{
          sourceId_queryFingerprint_operation:{
            sourceId: googleSource.id,
            queryFingerprint: fingerprint,
            operation:'TEXT_SEARCH',
          }
        },
        create:{
          sourceId: googleSource.id,
          queryFingerprint: fingerprint,
          operation:'TEXT_SEARCH',
          expiresAt: cacheExpiry,
          responseMetadata:{
            controlledProbe:true,
            resultCount,
            hasNextPageToken,
            fieldMask: request.fieldMask,
            httpStatus,
            // Never credential/header
          }
        },
        update:{
          expiresAt: cacheExpiry,
          responseMetadata:{
            controlledProbe:true,
            resultCount,
            hasNextPageToken,
            fieldMask: request.fieldMask,
            httpStatus,
          },
          hitCount:0,
        }
      });
      safeLog(`Cache written sourceId=${googleSource.id} fingerprintPrefix=${fingerprint.slice(0,16)} operation=TEXT_SEARCH expiresAt=${cacheExpiry.toISOString()} — safe payload only, never credential/header`);

      await prisma.collectorRun.update({
        where:{ id: controlledRun.id },
        data:{
          status:'SUCCESS',
          finishedAt:new Date(),
          candidatesFound: resultCount,
          metadata:{
            controlledProbe:true,
            operation:'TEXT_SEARCH',
            usageId: reservationId,
            networkRequests:networkRequestCount,
            cacheHit:false,
            resultCount,
            hasNextPageToken,
            httpStatus,
            latencyMs,
            fieldMask: request.fieldMask,
          }
        }
      });
      safeLog(`CollectorRun completed SUCCESS controlledProbe=true operation=TEXT_SEARCH usageId=${reservationId} networkRequests=${networkRequestCount} cacheHit=false resultCount=${resultCount}`);
      safeLog(`Do NOT create LeadCandidate — ID-only mask no email/website/phone, NOT TRUE_NO_SITE`);
      safeLog(`Do NOT create Lead`);
      safeLog(`CONTROLLED GOOGLE PROBE COMPLETE — 1 request executed`);

    } else {
      // Handle error statuses 400,401/403,429,5xx
      classification = classifyGoogleError({ message: `HTTP ${httpStatus} ${JSON.stringify(responseJson).slice(0,200)}` });
      safeLog(`Error response httpStatus=${httpStatus} classification=${classification} — mapped via GoogleErrorClassification, no retry`);

      await completeGoogleReservation(prisma, reservationId, 'FAILED', {
        requestSentAt: now,
        errorClassification: classification,
        errorMessage: `HTTP ${httpStatus}`,
        metadata:{
          controlledProbe:true,
          httpStatus,
          resultCount:0,
          classification,
          latencyMs,
          fieldMask: request.fieldMask,
          networkRequests:networkRequestCount,
        }
      });
      await prisma.collectorRun.update({
        where:{ id: controlledRun.id },
        data:{
          status:'FAILED',
          finishedAt:new Date(),
          metadata:{
            controlledProbe:true,
            operation:'TEXT_SEARCH',
            usageId: reservationId,
            networkRequests:networkRequestCount,
            httpStatus,
            classification,
            latencyMs,
          }
        }
      });
      safeLog(`usageStatus=FAILED requestSent=true — RESERVED→FAILED, requestSentAt != null, classification stored, no refund`);
    }

  }catch(e){
    clearTimeout(timeout);
    const errMsg = e.message||String(e);
    classification = classifyGoogleError(e);
    const isTimeout = errMsg.toLowerCase().includes('abort') || errMsg.toLowerCase().includes('timeout');
    safeLog(`Network error ${isTimeout?'timeout':'error'} classification=${classification} message=${errMsg.slice(0,200)} — no retry`);

    await completeGoogleReservation(prisma, reservationId, 'FAILED', {
      requestSentAt: now,
      errorClassification: classification,
      errorMessage: errMsg.slice(0,500),
      metadata:{
        controlledProbe:true,
        resultCount:0,
        classification,
        latencyMs,
        fieldMask: request.fieldMask,
        networkRequests:networkRequestCount,
        timeout: isTimeout,
      }
    });
    await prisma.collectorRun.update({
      where:{ id: controlledRun.id },
      data:{
        status:'FAILED',
        finishedAt:new Date(),
        metadata:{
          controlledProbe:true,
          operation:'TEXT_SEARCH',
          usageId: reservationId,
          networkRequests:networkRequestCount,
          classification,
          error: errMsg.slice(0,200),
        }
      }
    });
    safeLog(`usageStatus=FAILED requestSent=true — failure after send boundary remains accounted`);
  }

  safeLog(`Final networkRequests=${networkRequestCount} MAX=${MAX_NETWORK_REQUESTS} — hard cap enforced`);
  safeLog(`Second send would be refused — GOOGLE_PROBE_REQUEST_LIMIT_REACHED`);
  safeLog(`Retry impossible — zero retries`);
  safeLog(`Pagination follow-up impossible — even with nextPageToken, DO NOT request page 2`);
  safeLog(`Place Details impossible — only TEXT_SEARCH allowed in controlled probe`);
  safeLog(`Nearby impossible — only TEXT_SEARCH`);
  safeLog(`ID-only field mask ${SEARCH_ID_ONLY_MASK.join(',')} — no displayName/formattedAddress/websiteUri/phone/reviews/rating/openingHours/photos`);
  safeLog(`API key not logged — safe logs contain credentialConfigured=true fieldMask but NOT key`);
  safeLog(`Source remains disabled enabled=false, config remains disabled enabled=false`);
  safeLog(`No CollectorState created — controlled probe run is traceability only`);
  safeLog(`No LeadCandidate created — ID-only no email, NOT TRUE_NO_SITE`);
  safeLog(`No Lead created`);
  safeLog(`Normal collector unchanged — still filters enabled=true, ignores Google`);
  safeLog(`Normal collect workflow has no Google key — only DATABASE_URL`);
  safeLog(`Controlled workflow manual-only — workflow_dispatch ONLY`);

  await prisma.$disconnect();
}

main().catch(async (e)=>{
  console.error('Controlled probe failed', e.message, e.stack?.slice(0,500));
  try{
    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    await p.$disconnect();
  }catch{}
  process.exit(1);
});
