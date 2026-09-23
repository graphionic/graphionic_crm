#!/usr/bin/env node
/**
 * ClientForge CRM — Phase 4C.2A Collector Worker
 * Node.js + Prisma, production GitHub Actions worker
 * 
 * Architecture:
 * GitHub Actions -> Node 20 -> collector-worker.mjs -> Prisma -> Neon
 * Reads: CollectorConfig, CollectorLocation, LeadCategory, DataSource, CollectionRule
 * Writes: CollectorState, CollectorRun, LeadCandidate, Lead, Setting.collector_heartbeat (legacy)
 * 
 * Single assignment per execution: Location + Category + DataSource
 * Fair rotation, lazy state init, conservative Overpass handling
 * Phase 4C.2A: LeadCandidate persistence + Run traceability, no enrichment yet
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// --- Sanitization (same as src/lib/prisma.ts) ---
function sanitizeUrl(url) {
  if (!url) return url;
  return url.trim().replace(/^["']|["']$/g, '').replace(/&amp;/g, '&');
}
if (process.env.DATABASE_URL) process.env.DATABASE_URL = sanitizeUrl(process.env.DATABASE_URL);
if (process.env.DIRECT_URL) process.env.DIRECT_URL = sanitizeUrl(process.env.DIRECT_URL);

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// --- Constants ---
const SAFE_INTERNAL_CAP = 3;
const STALE_RUN_THRESHOLD_MINUTES = 20;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 200_000;
const USER_AGENT = 'ClientForge-Collector/1.0';
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID || null;
const GITHUB_RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT || null;

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'proton.me', 'yandex.com', 'mail.com',
  'gmx.com', 'zoho.com', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.co.uk',
  'live.com', 'msn.com', 'googlemail.com', 'ymail.com', 'inbox.com',
  'me.com', 'mac.com', 'qq.com', '163.com', '126.com'
]);

// --- Logging ---
function log(msg, data = {}) {
  const safeData = { ...data };
  delete safeData.DATABASE_URL;
  delete safeData.apiKey;
  delete safeData.encryptedValue;
  const dataStr = Object.keys(safeData).length ? ` ${JSON.stringify(safeData)}` : '';
  console.log(`[collector] ${msg}${dataStr}`);
}
function logWarn(msg, data = {}) {
  const safeData = { ...data };
  delete safeData.DATABASE_URL;
  console.warn(`[collector:warn] ${msg}${Object.keys(safeData).length ? ` ${JSON.stringify(safeData)}` : ''}`);
}
function logError(msg, data = {}) {
  const safeData = { ...data };
  delete safeData.DATABASE_URL;
  console.error(`[collector:error] ${msg}${Object.keys(safeData).length ? ` ${JSON.stringify(safeData)}` : ''}`);
}

// --- Helpers ---
function normalizeEmail(email) {
  if (!email) return null;
  return email.trim().toLowerCase();
}
function extractEmailDomain(email) {
  if (!email) return null;
  const norm = normalizeEmail(email);
  if (!norm || !norm.includes('@')) return null;
  const parts = norm.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].trim();
  if (!domain || domain.length < 4 || !domain.includes('.')) return null;
  if (domain.includes(' ') || domain.includes('/')) return null;
  return domain;
}
function isGenericDomain(domain) {
  if (!domain) return false;
  return GENERIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

// --- BBOX ---
function computeBbox(latitude, longitude, radiusKm) {
  if (latitude == null || longitude == null || radiusKm == null) {
    throw new Error('Missing latitude/longitude/radiusKm');
  }
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude ${latitude} must be -90..90`);
  }
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude ${longitude} must be -180..180`);
  }
  if (typeof radiusKm !== 'number' || radiusKm <= 0 || radiusKm > 500) {
    throw new Error(`Invalid radiusKm ${radiusKm} must be 1..500`);
  }
  const latDelta = radiusKm / 111.0;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const safeCos = Math.abs(cosLat) < 0.0001 ? 0.0001 : Math.abs(cosLat);
  const lngDelta = radiusKm / (111.0 * safeCos);
  let south = latitude - latDelta;
  let north = latitude + latDelta;
  let west = longitude - lngDelta;
  let east = longitude + lngDelta;
  south = Math.max(-90, Math.min(90, south));
  north = Math.max(-90, Math.min(90, north));
  west = Math.max(-180, Math.min(180, west));
  east = Math.max(-180, Math.min(180, east));
  if (south > north) [south, north] = [north, south];
  if (west > east) {
    logWarn('bbox crosses antimeridian', { west, east });
  }
  const bboxStr = `${south},${west},${north},${east}`;
  return {
    south,
    west,
    north,
    east,
    bboxStr,
    center: { lat: latitude, lng: longitude },
    radiusKm,
  };
}

// --- OSM Tags validation & query generation ---
const UNSAFE_CHARS_REGEX = /[;{}\[\]()<>\n\r]/;
const SAFE_TAG_REGEX = /^"?([a-zA-Z0-9_:]+)"?\s*=\s*"?([a-zA-Z0-9_\- ]+)"?$/;

function validateAndNormalizeOsmTag(rawTag) {
  if (typeof rawTag !== 'string') {
    return { valid: false, reason: 'not_string', raw: rawTag };
  }
  const trimmed = rawTag.trim();
  if (!trimmed) {
    return { valid: false, reason: 'empty', raw: rawTag };
  }
  if (trimmed.length > 200) {
    return { valid: false, reason: 'too_long', raw: rawTag };
  }
  if (UNSAFE_CHARS_REGEX.test(trimmed)) {
    return { valid: false, reason: 'unsafe_chars', raw: rawTag };
  }
  const match = trimmed.match(SAFE_TAG_REGEX);
  if (!match) {
    return { valid: false, reason: 'invalid_format', raw: rawTag };
  }
  const key = match[1].trim();
  const value = match[2].trim();
  if (!key || !value) {
    return { valid: false, reason: 'missing_key_or_value', raw: rawTag };
  }
  if (key.length < 2 || key.length > 50) {
    return { valid: false, reason: 'key_length', raw: rawTag };
  }
  if (value.length < 2 || value.length > 100) {
    return { valid: false, reason: 'value_length', raw: rawTag };
  }
  const safe = `"${key}"="${value}"`;
  return { valid: true, key, value, safe, raw: rawTag };
}

function parseOsmTags(osmTagsJson) {
  const warnings = [];
  const validTags = [];
  const invalidTags = [];

  if (!osmTagsJson) {
    return { validTags: [], invalidTags: [], warnings: ['osmTags empty'] };
  }

  let tagsArray = [];
  if (Array.isArray(osmTagsJson)) {
    tagsArray = osmTagsJson;
  } else if (typeof osmTagsJson === 'object' && osmTagsJson.tags && Array.isArray(osmTagsJson.tags)) {
    tagsArray = osmTagsJson.tags;
  } else if (typeof osmTagsJson === 'string') {
    try {
      const parsed = JSON.parse(osmTagsJson);
      tagsArray = Array.isArray(parsed) ? parsed : [];
    } catch {
      warnings.push('osmTags string parse failed');
      return { validTags, invalidTags, warnings };
    }
  } else {
    warnings.push('osmTags unexpected format');
    return { validTags, invalidTags, warnings };
  }

  for (const raw of tagsArray) {
    const result = validateAndNormalizeOsmTag(raw);
    if (result.valid) {
      validTags.push(result);
    } else {
      invalidTags.push(result);
      warnings.push(`invalid_osm_tag: ${result.raw} reason=${result.reason}`);
    }
  }

  return { validTags, invalidTags, warnings };
}

function buildOverpassQuery(validTags, bboxStr, timeoutSeconds = 25) {
  if (!validTags.length) {
    throw new Error('No valid OSM tags to build query');
  }
  if (!bboxStr) {
    throw new Error('Missing bbox for query');
  }
  const timeout = Math.max(10, Math.min(120, timeoutSeconds));
  const clauses = [];
  for (const tag of validTags) {
    const t = tag.safe;
    clauses.push(`  node[${t}](${bboxStr});`);
    clauses.push(`  way[${t}](${bboxStr});`);
    clauses.push(`  relation[${t}](${bboxStr});`);
  }
  const query = `[out:json][timeout:${timeout}];\n(\n${clauses.join('\n')}\n);\nout center 100;`;
  return query;
}

// --- Overpass fetching ---
async function fetchOverpass(baseUrl, query, options = {}) {
  const {
    timeoutMs = 25000,
    retryCount = 3,
    concurrency = 3,
  } = options;

  let attempt = 0;
  let lastError = null;
  const retryDelays = [];

  while (attempt <= retryCount) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      log(`overpass attempt ${attempt}/${retryCount + 1}`, { baseUrl, queryLength: query.length });

      const body = new URLSearchParams({ data: query }).toString();

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        const retryAfterHeader = res.headers.get('Retry-After');
        let retryAfterMs = 0;
        if (retryAfterHeader) {
          const secs = parseInt(retryAfterHeader, 10);
          if (!isNaN(secs)) retryAfterMs = secs * 1000;
        }
        const backoffBase = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = Math.max(retryAfterMs, backoffBase + jitter);

        lastError = new Error(`Overpass ${res.status} ${res.statusText}, retry-after ${retryAfterMs}ms`);
        retryDelays.push({ attempt, status: res.status, delay, retryAfter: retryAfterMs });

        if (attempt <= retryCount) {
          logWarn(`overpass ${res.status}, backing off ${Math.round(delay)}ms`, { baseUrl, attempt });
          await new Promise(r => setTimeout(r, delay));
          continue;
        } else {
          throw lastError;
        }
      }

      if (!res.ok) {
        lastError = new Error(`Overpass HTTP ${res.status} ${res.statusText}`);
        if (attempt <= retryCount) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          retryDelays.push({ attempt, status: res.status, delay });
          logWarn(`overpass http ${res.status}, retrying in ${Math.round(delay)}ms`, { baseUrl });
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw lastError;
      }

      const json = await res.json();
      return {
        success: true,
        data: json,
        attempt,
        retryDelays,
        status: res.status,
      };
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      const isAbort = err.name === 'AbortError';

      if (attempt <= retryCount) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        retryDelays.push({ attempt, error: err.message, delay, abort: isAbort });
        logWarn(`overpass fetch error attempt ${attempt}, retrying in ${Math.round(delay)}ms`, {
          baseUrl,
          error: err.message,
          abort: isAbort,
        });
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return {
        success: false,
        error: lastError,
        attempt,
        retryDelays,
        status: null,
      };
    }
  }

  return {
    success: false,
    error: lastError,
    attempt,
    retryDelays,
    status: null,
  };
}

// --- Lead parsing — Phase 4C.2A enhanced ---
function parseOsmElement(el, categorySlug, location) {
  const tags = el.tags || {};
  const name = (tags.name || '').trim();
  if (!name || name.length < 3 || name.length > 100) return null;

  const website = (tags.website || tags['contact:website'] || '').trim();
  const email = (tags.email || tags['contact:email'] || '').trim();
  const phone = (tags.phone || tags['contact:phone'] || '').trim();

  if (email) {
    if (email.length > 80) return null;
    if (!email.includes('@') || !email.split('@')[1]?.includes('.')) return null;
    if (['example.com', 'test.com', 'noreply', 'no-reply', '.png', '.jpg'].some(b => email.toLowerCase().includes(b))) {
      return null;
    }
  }

  const addressParts = [];
  if (tags['addr:housenumber'] && tags['addr:street']) {
    addressParts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    addressParts.push(tags['addr:street']);
  }
  if (tags['addr:city']) addressParts.push(tags['addr:city']);
  if (tags['addr:postcode']) addressParts.push(tags['addr:postcode']);

  const address = addressParts.join(', ') || tags.address || location.city || '';

  // Phase 4C.2A — extract more data
  let latitude = null;
  let longitude = null;
  if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
    latitude = el.lat;
    longitude = el.lon;
  } else if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') {
    latitude = el.center.lat;
    longitude = el.center.lon;
  } else if (typeof el.lat === 'number' && typeof el.lon === 'number') {
    latitude = el.lat;
    longitude = el.lon;
  }

  const postcode = (tags['addr:postcode'] || '').slice(0, 20) || null;

  return {
    company_name: name.slice(0, 100),
    business_category: categorySlug, // MUST continue from LeadCategory.slug, not OSM tags
    website: website.slice(0, 200),
    email: email.slice(0, 150),
    phone: phone.slice(0, 40),
    address: address.slice(0, 200),
    city: (tags['addr:city'] || location.city || '').slice(0, 100),
    country: location.countryCode || location.country || 'UK',
    postcode,
    latitude,
    longitude,
    osm_id: el.id,
    osm_type: el.type,
    externalId: String(el.id),
    externalType: el.type,
    rawTags: tags,
    source: `overpass_${(location.countryCode || 'unknown').toLowerCase()}`,
  };
}

// --- Website verification ---
async function hasLiveWebsite(domain, opts = {}) {
  const options = {
    httpsCheck: true,
    httpFallback: true,
    followRedirects: true,
    timeoutMs: 8000,
    maxRedirects: MAX_REDIRECTS,
    maxBodyBytes: MAX_BODY_BYTES,
    userAgent: USER_AGENT,
    ...opts,
  };

  if (!domain) return { live: false, reason: 'no_domain' };
  const normalized = domain.toLowerCase().trim();
  if (GENERIC_EMAIL_DOMAINS.has(normalized)) return { live: false, reason: 'generic_domain' };
  if (normalized.length < 4 || !normalized.includes('.')) return { live: false, reason: 'invalid_domain_format' };

  async function fetchWithSafety(url, redirectCount = 0) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': options.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
        redirect: options.followRedirects ? 'follow' : 'manual',
      });
      clearTimeout(timeout);
      const status = res.status;

      if (options.followRedirects && [301, 302, 303, 307, 308].includes(status)) {
        if (redirectCount >= options.maxRedirects) {
          return { live: false, reason: `too_many_redirects_${redirectCount}`, statusCode: status, finalUrl: url, redirectCount };
        }
        const loc = res.headers.get('location');
        if (!loc) return { live: false, reason: 'redirect_no_location', statusCode: status, finalUrl: url, redirectCount };
        const nextUrl = new URL(loc, url).toString();
        return fetchWithSafety(nextUrl, redirectCount + 1);
      }

      if (status >= 200 && status < 400) {
        let body = '';
        try {
          const text = await res.text();
          body = text.slice(0, options.maxBodyBytes);
        } catch {
          body = '';
        }
        const lower = body.toLowerCase();
        const hasHtml = lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<body');
        if (body.length > 500 && hasHtml) {
          return { live: true, reason: 'valid_html', statusCode: status, finalUrl: url, redirectCount, bodyLength: body.length };
        }
        return { live: false, reason: body.length < 500 ? `body_too_small_${body.length}` : 'no_html_tag', statusCode: status, finalUrl: url, redirectCount, bodyLength: body.length };
      }
      return { live: false, reason: `status_${status}`, statusCode: status, finalUrl: url, redirectCount };
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err.name === 'AbortError';
      return { live: false, reason: isTimeout ? 'timeout' : 'fetch_error', finalUrl: url, redirectCount };
    }
  }

  if (options.httpsCheck) {
    const httpsResult = await fetchWithSafety(`https://${normalized}`, 0);
    if (httpsResult.live) return { ...httpsResult, reason: `https_${httpsResult.reason}` };
    if (options.httpFallback) {
      const httpResult = await fetchWithSafety(`http://${normalized}`, 0);
      if (httpResult.live) return { ...httpResult, reason: `http_${httpResult.reason}` };
      return httpResult;
    }
    return httpsResult;
  }
  if (options.httpFallback) {
    return fetchWithSafety(`http://${normalized}`, 0);
  }
  return { live: false, reason: 'checks_disabled' };
}

// --- Collection Rules ---
function buildRulesMap(rules) {
  const map = {};
  const warnings = [];
  const supported = new Set([
    'require_email',
    'require_no_website',
    'reject_generic',
    'verify_email_domain_website',
    'reject_existing_website',
    'deduplicate_leads',
    'https_check',
    'http_fallback',
    'follow_redirects',
  ]);

  for (const rule of rules) {
    map[rule.key] = rule;
    if (!supported.has(rule.key)) {
      warnings.push(`unsupported_rule: ${rule.key} (${rule.name}) - not enforced, recorded as warning`);
    }
  }
  return { map, warnings, supported };
}

// --- Stale RUNNING recovery ---
async function recoverStaleRuns() {
  const thresholdDate = new Date(Date.now() - STALE_RUN_THRESHOLD_MINUTES * 60 * 1000);
  const staleRuns = await prisma.collectorRun.findMany({
    where: {
      status: 'RUNNING',
      startedAt: { lt: thresholdDate },
    },
  });

  if (!staleRuns.length) {
    log(`no stale RUNNING runs (threshold ${STALE_RUN_THRESHOLD_MINUTES}m)`);
    return 0;
  }

  log(`found ${staleRuns.length} stale RUNNING runs, marking FAILED`, { threshold: thresholdDate.toISOString() });

  for (const run of staleRuns) {
    try {
      await prisma.collectorRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          durationMs: Date.now() - new Date(run.startedAt).getTime(),
          errorMessage: `stale/incomplete previous worker execution - startedAt ${run.startedAt.toISOString()} exceeded ${STALE_RUN_THRESHOLD_MINUTES}m threshold`,
          metadata: {
            ...(typeof run.metadata === 'object' && run.metadata ? run.metadata : {}),
            recoveredAt: new Date().toISOString(),
            recoveryReason: 'stale_run',
          },
        },
      });
      log(`recovered stale run ${run.id}`, { startedAt: run.startedAt });
    } catch (e) {
      logError(`failed to recover stale run ${run.id}`, { error: e.message });
    }
  }
  return staleRuns.length;
}

// --- Fair rotation selection — Phase 4C.1 Improved (unchanged in 4C.2A) ---
async function selectNextAssignment(config, dryRun = false) {
  let enabledLocations = await prisma.collectorLocation.findMany({ where: { enabled: true } });
  let enabledCategories = await prisma.leadCategory.findMany({ where: { enabled: true } });
  let enabledSources = await prisma.dataSource.findMany({ where: { enabled: true, NOT: { healthStatus: 'down' } } });

  enabledLocations.sort((a, b) => {
    const aLast = a.lastCollectedAt ? new Date(a.lastCollectedAt).getTime() : 0;
    const bLast = b.lastCollectedAt ? new Date(b.lastCollectedAt).getTime() : 0;
    const aNull = a.lastCollectedAt == null;
    const bNull = b.lastCollectedAt == null;
    if (aNull && !bNull) return -1;
    if (!aNull && bNull) return 1;
    if (aLast !== bLast) return aLast - bLast;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return (a.city || '').localeCompare(b.city || '');
  });
  enabledCategories.sort((a, b) => {
    const aLast = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
    const bLast = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
    const aNull = a.lastRunAt == null;
    const bNull = b.lastRunAt == null;
    if (aNull && !bNull) return -1;
    if (!aNull && bNull) return 1;
    if (aLast !== bLast) return aLast - bLast;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return (a.slug || '').localeCompare(b.slug || '');
  });
  const healthOrder = { healthy: 0, degraded: 1, unknown: 2, down: 3 };
  enabledSources.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const aHealth = healthOrder[a.healthStatus] ?? 2;
    const bHealth = healthOrder[b.healthStatus] ?? 2;
    if (aHealth !== bHealth) return aHealth - bHealth;
    return (a.name || '').localeCompare(b.name || '');
  });

  log(`enabled counts`, {
    locations: enabledLocations.length,
    categories: enabledCategories.length,
    sources: enabledSources.length,
  });

  if (!enabledLocations.length || !enabledCategories.length || !enabledSources.length) {
    logWarn('no enabled locations/categories/sources', {
      locations: enabledLocations.length,
      categories: enabledCategories.length,
      sources: enabledSources.length,
    });
    return null;
  }

  const existingStates = await prisma.collectorState.findMany({
    where: {
      locationId: { in: enabledLocations.map(l => l.id) },
      categoryId: { in: enabledCategories.map(c => c.id) },
      sourceId: { in: enabledSources.map(s => s.id) },
    },
    include: { location: true, category: true, source: true },
  });
  const existingSet = new Set(existingStates.map(s => `${s.locationId}|${s.categoryId}|${s.sourceId}`));

  const locSlice = enabledLocations.slice(0, 100);
  const catSlice = enabledCategories.slice(0, 20);
  const srcSlice = enabledSources.slice(0, 5);
  const missingCombos = [];
  for (const loc of locSlice) {
    for (const cat of catSlice) {
      for (const src of srcSlice) {
        const key = `${loc.id}|${cat.id}|${src.id}`;
        if (!existingSet.has(key)) {
          missingCombos.push({ loc, cat, src, key });
        }
      }
    }
  }
  log(`existing combos ${existingSet.size}, missing combos ${missingCombos.length} (from ${locSlice.length}×${catSlice.length}×${srcSlice.length} slice)`);

  if (missingCombos.length) {
    missingCombos.sort((a, b) => {
      if (a.cat.priority !== b.cat.priority) return b.cat.priority - a.cat.priority;
      if (a.src.priority !== b.src.priority) return b.src.priority - a.src.priority;
      const aLocLast = a.loc.lastCollectedAt ? new Date(a.loc.lastCollectedAt).getTime() : 0;
      const bLocLast = b.loc.lastCollectedAt ? new Date(b.loc.lastCollectedAt).getTime() : 0;
      const aLocNull = a.loc.lastCollectedAt == null;
      const bLocNull = b.loc.lastCollectedAt == null;
      if (aLocNull && !bLocNull) return -1;
      if (!aLocNull && bLocNull) return 1;
      if (aLocLast !== bLocLast) return aLocLast - bLocLast;
      if (a.loc.priority !== b.loc.priority) return b.loc.priority - a.loc.priority;
      const slugCmp = (a.cat.slug || '').localeCompare(b.cat.slug || '');
      if (slugCmp !== 0) return slugCmp;
      const cityCmp = (a.loc.city || '').localeCompare(b.loc.city || '');
      if (cityCmp !== 0) return cityCmp;
      return (a.src.name || '').localeCompare(b.src.name || '');
    });

    const selectedMissing = missingCombos[0];
    log(`selected missing combo (never-run)`, {
      location: `${selectedMissing.loc.city} ${selectedMissing.loc.countryCode}`,
      category: selectedMissing.cat.slug,
      source: selectedMissing.src.name,
      locationLastCollected: selectedMissing.loc.lastCollectedAt,
      categoryLastRun: selectedMissing.cat.lastRunAt,
      prioritySum: (selectedMissing.loc.priority||0)+(selectedMissing.cat.priority||0)+(selectedMissing.src.priority||0),
      totalMissing: missingCombos.length,
    });

    if (dryRun) {
      const virtualState = {
        id: `dryrun-${selectedMissing.loc.id}-${selectedMissing.cat.id}-${selectedMissing.src.id}`,
        locationId: selectedMissing.loc.id,
        categoryId: selectedMissing.cat.id,
        sourceId: selectedMissing.src.id,
        cycle: 0,
        consecutiveFailures: 0,
        totalCandidates: 0,
        totalAccepted: 0,
        totalRejected: 0,
        lastRunAt: null,
        lastSuccessfulRunAt: null,
        nextEligibleRunAt: null,
        cursor: null,
      };
      return {
        location: selectedMissing.loc,
        category: selectedMissing.cat,
        source: selectedMissing.src,
        state: virtualState,
        isNewState: true,
      };
    }

    const newState = await prisma.collectorState.create({
      data: {
        locationId: selectedMissing.loc.id,
        categoryId: selectedMissing.cat.id,
        sourceId: selectedMissing.src.id,
        cycle: 0,
        consecutiveFailures: 0,
        totalCandidates: 0,
        totalAccepted: 0,
        totalRejected: 0,
      },
      include: { location: true, category: true, source: true },
    });
    return {
      location: newState.location,
      category: newState.category,
      source: newState.source,
      state: newState,
      isNewState: true,
    };
  }

  const now = new Date();
  let eligibleStates = await prisma.collectorState.findMany({
    where: {
      locationId: { in: enabledLocations.map(l => l.id) },
      categoryId: { in: enabledCategories.map(c => c.id) },
      sourceId: { in: enabledSources.map(s => s.id) },
      OR: [{ nextEligibleRunAt: null }, { nextEligibleRunAt: { lte: now } }],
      location: { enabled: true },
      category: { enabled: true },
      source: { enabled: true, NOT: { healthStatus: 'down' } },
    },
    include: { location: true, category: true, source: true },
  });

  eligibleStates.sort((a, b) => {
    const nextA = a.nextEligibleRunAt ? new Date(a.nextEligibleRunAt).getTime() : 0;
    const nextB = b.nextEligibleRunAt ? new Date(b.nextEligibleRunAt).getTime() : 0;
    const nextANull = a.nextEligibleRunAt == null;
    const nextBNull = b.nextEligibleRunAt == null;
    if (nextANull && !nextBNull) return -1;
    if (!nextANull && nextBNull) return 1;
    if (nextA !== nextB) return nextA - nextB;
    const lastA = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
    const lastB = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
    const lastANull = a.lastRunAt == null;
    const lastBNull = b.lastRunAt == null;
    if (lastANull && !lastBNull) return -1;
    if (!lastANull && lastBNull) return 1;
    if (lastA !== lastB) return lastA - lastB;
    if (a.consecutiveFailures !== b.consecutiveFailures) return a.consecutiveFailures - b.consecutiveFailures;
    const aLocLast = a.location?.lastCollectedAt ? new Date(a.location.lastCollectedAt).getTime() : 0;
    const bLocLast = b.location?.lastCollectedAt ? new Date(b.location.lastCollectedAt).getTime() : 0;
    const aLocNull = a.location?.lastCollectedAt == null;
    const bLocNull = b.location?.lastCollectedAt == null;
    if (aLocNull && !bLocNull) return -1;
    if (!aLocNull && bLocNull) return 1;
    if (aLocLast !== bLocLast) return aLocLast - bLocLast;
    const aCatLast = a.category?.lastRunAt ? new Date(a.category.lastRunAt).getTime() : 0;
    const bCatLast = b.category?.lastRunAt ? new Date(b.category.lastRunAt).getTime() : 0;
    const aCatNull = a.category?.lastRunAt == null;
    const bCatNull = b.category?.lastRunAt == null;
    if (aCatNull && !bCatNull) return -1;
    if (!aCatNull && bCatNull) return 1;
    if (aCatLast !== bCatLast) return aCatLast - bCatLast;
    const prioA = (a.location?.priority || 0) + (a.category?.priority || 0) + (a.source?.priority || 0);
    const prioB = (b.location?.priority || 0) + (b.category?.priority || 0) + (b.source?.priority || 0);
    if (prioA !== prioB) return prioB - prioA;
    const cityCmp = (a.location?.city || '').localeCompare(b.location?.city || '');
    if (cityCmp !== 0) return cityCmp;
    return (a.category?.slug || '').localeCompare(b.category?.slug || '');
  });

  if (eligibleStates.length) {
    const selected = eligibleStates[0];
    log(`selected eligible state`, {
      location: `${selected.location?.city} ${selected.location?.countryCode}`,
      category: selected.category?.slug,
      source: selected.source?.name,
      lastRunAt: selected.lastRunAt,
      nextEligible: selected.nextEligibleRunAt,
      failures: selected.consecutiveFailures,
      prioritySum: (selected.location?.priority||0)+(selected.category?.priority||0)+(selected.source?.priority||0),
      totalEligible: eligibleStates.length,
    });
    return {
      location: selected.location,
      category: selected.category,
      source: selected.source,
      state: selected,
      isNewState: false,
    };
  }

  const nextEligibleState = await prisma.collectorState.findFirst({
    where: {
      locationId: { in: enabledLocations.map(l => l.id) },
      categoryId: { in: enabledCategories.map(c => c.id) },
      sourceId: { in: enabledSources.map(s => s.id) },
    },
    orderBy: { nextEligibleRunAt: 'asc' },
    include: { location: true, category: true, source: true },
  });

  if (nextEligibleState) {
    log(`no eligible now, next eligible at ${nextEligibleState.nextEligibleRunAt}`, {
      location: `${nextEligibleState.location?.city}`,
      category: nextEligibleState.category?.slug,
      nextEligible: nextEligibleState.nextEligibleRunAt,
    });
  } else {
    log('no states and no missing combos — possible all disabled or large dataset slice limit');
  }

  return null;
}

// --- Main worker — Phase 4C.2A with LeadCandidate persistence ---
async function main() {
  const dryRun = process.env.COLLECTOR_DRY_RUN === 'true';
  const debugCsv = process.env.COLLECTOR_DEBUG_CSV === 'true';
  const startTime = Date.now();

  log(`starting collector worker Phase 4C.2A`, {
    dryRun,
    debugCsv,
    githubRunId: GITHUB_RUN_ID,
    githubAttempt: GITHUB_RUN_ATTEMPT,
    nodeVersion: process.version,
  });

  let config = await prisma.collectorConfig.findUnique({ where: { key: 'default' } });
  if (!config) {
    log('no CollectorConfig found, creating default');
    if (!dryRun) {
      config = await prisma.collectorConfig.create({ data: { key: 'default' } });
    } else {
      config = {
        key: 'default',
        enabled: true,
        collectionMode: 'continuous',
        defaultBatchSize: 25,
        defaultQueryLimit: 50,
        concurrentRequests: 15,
        requestTimeoutMs: 25000,
        retryCount: 3,
        cooldownMs: 7000,
        collectionFrequencyMinutes: 15,
        verificationEnabled: true,
        emailRequired: true,
        websiteFilteringEnabled: true,
        duplicateFilteringEnabled: true,
      };
    }
  }

  log(`config`, {
    enabled: config.enabled,
    mode: config.collectionMode,
    batch: config.defaultBatchSize,
    queryLimit: config.defaultQueryLimit,
    concurrent: config.concurrentRequests,
    timeout: config.requestTimeoutMs,
    retry: config.retryCount,
    cooldown: config.cooldownMs,
    frequency: config.collectionFrequencyMinutes,
  });

  if (!config.enabled) {
    log('Collector disabled — nothing to do.');
    await prisma.$disconnect();
    process.exit(0);
  }

  const recovered = await recoverStaleRuns();
  if (recovered) log(`recovered ${recovered} stale runs`);

  const rules = await prisma.collectionRule.findMany({ where: { enabled: true } });
  const { map: rulesMap, warnings: ruleWarnings } = buildRulesMap(rules);
  log(`rules`, { enabled: rules.length, warnings: ruleWarnings.length });
  if (ruleWarnings.length) {
    for (const w of ruleWarnings) logWarn(w);
  }

  const assignment = await selectNextAssignment(config, dryRun);
  if (!assignment) {
    log('no eligible assignment — nothing to do, exiting SUCCESS');
    if (!dryRun) {
      const hb = {
        timestamp: new Date().toISOString(),
        message: 'No eligible assignment - next eligible in future',
        collectors: 1,
        source: 'collector-worker',
        githubRunId: GITHUB_RUN_ID,
      };
      await prisma.setting.upsert({
        where: { key: 'collector_heartbeat' },
        update: { value: JSON.stringify(hb) },
        create: { key: 'collector_heartbeat', value: JSON.stringify(hb) },
      });
    }
    await prisma.$disconnect();
    process.exit(0);
  }

  const { location, category, source, state, isNewState } = assignment;

  log(`assignment`, {
    location: `${location.city} ${location.countryCode} (${location.country})`,
    category: `${category.name} (${category.slug})`,
    source: `${source.name} (${source.type})`,
    stateId: state.id,
    isNewState,
  });

  let bbox;
  try {
    if (location.latitude == null || location.longitude == null) {
      throw new Error(`Location ${location.city} missing latitude/longitude`);
    }
    bbox = computeBbox(location.latitude, location.longitude, location.radiusKm);
    log(`bbox`, { bbox: bbox.bboxStr, center: bbox.center, radius: bbox.radiusKm });
  } catch (e) {
    logError(`bbox computation failed`, { error: e.message, location: location.city });
    if (!dryRun) {
      await prisma.collectorRun.create({
        data: {
          status: 'FAILED',
          locationId: location.id,
          categoryId: category.id,
          sourceId: source.id,
          startedAt: new Date(),
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          queriesAttempted: 0,
          candidatesFound: 0,
          errorMessage: `BBOX failed: ${e.message}`,
          metadata: {
            githubRunId: GITHUB_RUN_ID,
            githubRunAttempt: GITHUB_RUN_ATTEMPT,
            location: { city: location.city, countryCode: location.countryCode },
            category: category.slug,
            source: source.name,
          },
        },
      });
      await prisma.collectorState.update({
        where: { id: state.id },
        data: {
          lastRunAt: new Date(),
          consecutiveFailures: { increment: 1 },
          nextEligibleRunAt: new Date(Date.now() + Math.min(60 * 60 * 1000, config.cooldownMs * Math.pow(2, state.consecutiveFailures + 1))),
        },
      });
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  const { validTags, invalidTags, warnings: osmWarnings } = parseOsmTags(category.osmTags);
  log(`osmTags`, {
    valid: validTags.length,
    invalid: invalidTags.length,
    warnings: osmWarnings.length,
    tags: validTags.map(t => t.safe),
  });
  if (osmWarnings.length) {
    for (const w of osmWarnings) logWarn(w);
  }
  if (!validTags.length) {
    logError(`no valid OSM tags for category ${category.slug}`, { osmTags: category.osmTags });
    if (!dryRun) {
      await prisma.collectorRun.create({
        data: {
          status: 'FAILED',
          locationId: location.id,
          categoryId: category.id,
          sourceId: source.id,
          startedAt: new Date(),
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          queriesAttempted: 0,
          candidatesFound: 0,
          errorMessage: `No valid OSM tags for category ${category.slug}`,
          metadata: {
            githubRunId: GITHUB_RUN_ID,
            bbox: bbox.bboxStr,
            category: category.slug,
            osmTags: category.osmTags,
            invalidTags: invalidTags.map(t => t.raw),
            warnings: [...osmWarnings, ...ruleWarnings],
          },
        },
      });
      await prisma.collectorState.update({
        where: { id: state.id },
        data: {
          lastRunAt: new Date(),
          consecutiveFailures: { increment: 1 },
          nextEligibleRunAt: new Date(Date.now() + Math.min(60 * 60 * 1000, config.cooldownMs * Math.pow(2, state.consecutiveFailures + 1))),
        },
      });
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  let overpassQuery;
  try {
    const timeoutSec = Math.floor((source.timeoutMs || config.requestTimeoutMs) / 1000);
    overpassQuery = buildOverpassQuery(validTags, bbox.bboxStr, timeoutSec);
    log(`overpass query built`, { length: overpassQuery.length, timeout: timeoutSec });
    if (dryRun) {
      log(`[dry-run] query`, { query: overpassQuery.slice(0, 500) });
    }
  } catch (e) {
    logError(`query build failed`, { error: e.message });
    if (!dryRun) {
      await prisma.collectorRun.create({
        data: {
          status: 'FAILED',
          locationId: location.id,
          categoryId: category.id,
          sourceId: source.id,
          startedAt: new Date(),
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          queriesAttempted: 0,
          candidatesFound: 0,
          errorMessage: `Query build failed: ${e.message}`,
          metadata: {
            githubRunId: GITHUB_RUN_ID,
            bbox: bbox.bboxStr,
            category: category.slug,
          },
        },
      });
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  if (dryRun) {
    log(`[dry-run] would select assignment`, {
      location: `${location.city} ${location.countryCode}`,
      category: category.slug,
      source: source.name,
      bbox: bbox.bboxStr,
      tags: validTags.map(t => t.safe),
      rules: Object.keys(rulesMap),
    });
    log(`[dry-run] would persist candidates, would mark NEEDS_ENRICHMENT for no-email, would qualify TRUE_NO_SITE, but no DB mutations (dry-run guarantee)`);
    log(`[dry-run] no DB mutations, no Overpass call, exiting`);
    await prisma.$disconnect();
    process.exit(0);
  }

  const run = await prisma.collectorRun.create({
    data: {
      status: 'RUNNING',
      locationId: location.id,
      categoryId: category.id,
      sourceId: source.id,
      startedAt: new Date(),
      queriesAttempted: 0,
      candidatesFound: 0,
      metadata: {
        githubRunId: GITHUB_RUN_ID,
        githubRunAttempt: GITHUB_RUN_ATTEMPT,
        bbox: bbox.bboxStr,
        bboxCenter: bbox.center,
        category: category.slug,
        osmTags: validTags.map(t => t.safe),
        endpoint: source.baseUrl,
        warnings: [...osmWarnings, ...ruleWarnings],
        invalidTags: invalidTags.map(t => ({ raw: t.raw, reason: t.reason })),
      },
    },
  });
  log(`created run ${run.id} RUNNING`);

  const effectiveConcurrency = Math.min(
    config.concurrentRequests,
    source.concurrency,
    SAFE_INTERNAL_CAP
  );
  const timeoutMs = Math.min(source.timeoutMs || config.requestTimeoutMs, 60000);
  const retryCount = Math.min(source.retryCount ?? config.retryCount, 5);

  log(`fetching overpass`, {
    baseUrl: source.baseUrl,
    effectiveConcurrency,
    timeoutMs,
    retryCount,
  });

  let fetchResult;
  let candidatesFound = 0;
  let queriesAttempted = 0;
  let queryFailures = [];
  let elements = [];

  try {
    queriesAttempted = 1;
    fetchResult = await fetchOverpass(source.baseUrl, overpassQuery, {
      timeoutMs,
      retryCount,
      concurrency: effectiveConcurrency,
    });

    if (!fetchResult.success) {
      throw fetchResult.error;
    }

    elements = fetchResult.data?.elements || [];
    candidatesFound = elements.length;

    log(`overpass success`, {
      candidates: candidatesFound,
      attempt: fetchResult.attempt,
      retries: fetchResult.retryDelays.length,
    });
  } catch (e) {
    logError(`overpass failed`, { error: e.message, attempt: fetchResult?.attempt });
    queryFailures.push({ error: e.message, baseUrl: source.baseUrl, attempt: fetchResult?.attempt });

    const durationMs = Date.now() - startTime;
    await prisma.collectorRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        durationMs,
        queriesAttempted,
        candidatesFound: 0,
        errorMessage: `Overpass failed: ${e.message}`,
        metadata: {
          ...(typeof run.metadata === 'object' ? run.metadata : {}),
          fetchResult,
          queryFailures,
          bbox: bbox.bboxStr,
        },
      },
    });

    const backoffMs = Math.min(
      2 * 60 * 60 * 1000,
      config.cooldownMs * Math.pow(2, state.consecutiveFailures + 1)
    );
    await prisma.collectorState.update({
      where: { id: state.id },
      data: {
        lastRunAt: new Date(),
        consecutiveFailures: { increment: 1 },
        nextEligibleRunAt: new Date(Date.now() + backoffMs),
        totalCandidates: { increment: candidatesFound },
      },
    });

    const newFailures = state.consecutiveFailures + 1;
    let healthStatus = source.healthStatus;
    if (newFailures >= 5) healthStatus = 'down';
    else if (newFailures >= 3) healthStatus = 'degraded';
    else healthStatus = 'degraded';

    try {
      await prisma.dataSource.update({
        where: { id: source.id },
        data: { healthStatus, lastCheckedAt: new Date() },
      });
      logWarn(`marking source ${source.name} as ${healthStatus} after failure`, { failures: newFailures, previous: source.healthStatus });
    } catch (e) {
      logWarn(`failed to update source health on failure for ${source.name}`, { error: e.message });
    }

    const hb = {
      timestamp: new Date().toISOString(),
      message: `FAILED: ${location.city}/${category.slug} - ${e.message}`,
      collectors: 1,
      source: 'collector-worker',
      githubRunId: GITHUB_RUN_ID,
      lastRun: { status: 'FAILED', location: location.city, category: category.slug, error: e.message },
    };
    await prisma.setting.upsert({
      where: { key: 'collector_heartbeat' },
      update: { value: JSON.stringify(hb) },
      create: { key: 'collector_heartbeat', value: JSON.stringify(hb) },
    });

    await prisma.$disconnect();
    process.exit(1);
  }

  // 9. Parse leads — Phase 4C.2A enhanced with lat/lng, postcode, rawTags
  const parsedLeads = [];
  for (const el of elements) {
    const parsed = parseOsmElement(el, category.slug, location);
    if (parsed) parsedLeads.push(parsed);
  }
  const parsedCount = parsedLeads.length;
  const emailPresentCount = parsedLeads.filter(l => l.email && l.email.trim()).length;
  const emailPresenceRate = parsedCount ? (emailPresentCount / parsedCount) : 0;
  log(`parsed`, { raw: candidatesFound, parsed: parsedCount, emailPresent: emailPresentCount, emailPresenceRate: `${(emailPresenceRate*100).toFixed(2)}%` });

  // 10. Phase 4C.2A — Candidate persistence + filtering
  let noEmailRejected = 0;
  let genericEmailRejected = 0;
  let websiteRejected = 0;
  let duplicateRejected = 0;
  let invalidRejected = 0;
  let leadsAccepted = 0;
  let leadsInserted = 0;

  // New metrics Phase 4C.2A
  let candidatesPersisted = 0;
  let candidatesNeedingEnrichment = 0;
  let candidatesRejected = 0;
  let candidatesQualified = 0;
  const candidateIds = [];
  const leadIds = [];

  const inRunSet = new Set();
  const acceptedLeadsWithCandidate = []; // { lead, candidateId }

  const requireEmail = rulesMap['require_email']?.enabled !== false;
  const requireNoWebsite = rulesMap['require_no_website']?.enabled !== false;
  const rejectExistingWebsite = rulesMap['reject_existing_website']?.enabled !== false;
  const rejectGeneric = rulesMap['reject_generic']?.enabled !== false;
  const verifyEmailDomain = rulesMap['verify_email_domain_website']?.enabled !== false;
  const deduplicate = rulesMap['deduplicate_leads']?.enabled !== false;
  const httpsCheck = rulesMap['https_check']?.enabled !== false;
  const httpFallback = rulesMap['http_fallback']?.enabled !== false;
  const followRedirects = rulesMap['follow_redirects']?.enabled !== false;

  log(`rules active`, {
    requireEmail,
    requireNoWebsite,
    rejectExistingWebsite,
    rejectGeneric,
    verifyEmailDomain,
    deduplicate,
    httpsCheck,
    httpFallback,
    followRedirects,
  });

  // Helper to persist candidate with dedup: sourceId + externalType + externalId unique
  async function upsertCandidate(parsedLead, status, rejectionReason = null) {
    try {
      const externalId = parsedLead.externalId || String(parsedLead.osm_id);
      const externalType = parsedLead.externalType || parsedLead.osm_type || 'node';

      // Try to find existing candidate by source + externalType + externalId
      const existing = await prisma.leadCandidate.findUnique({
        where: {
          discoverySourceId_externalType_externalId: {
            discoverySourceId: source.id,
            externalType,
            externalId,
          },
        },
      });

      if (existing) {
        // Update existing candidate with latest data, keep qualifiedLeadId if already qualified
        const updated = await prisma.leadCandidate.update({
          where: { id: existing.id },
          data: {
            companyName: parsedLead.company_name.slice(0, 200),
            businessCategory: parsedLead.business_category,
            address: parsedLead.address?.slice(0, 300) || null,
            city: parsedLead.city?.slice(0, 100) || location.city,
            country: parsedLead.country || location.countryCode || 'UK',
            postcode: parsedLead.postcode || null,
            latitude: parsedLead.latitude,
            longitude: parsedLead.longitude,
            phone: parsedLead.phone || null,
            email: parsedLead.email ? normalizeEmail(parsedLead.email) : null,
            website: parsedLead.website || null,
            discoveryRunId: run.id, // update to latest run
            status,
            rejectionReason,
            rawTags: parsedLead.rawTags || null,
            metadata: {
              ...(typeof existing.metadata === 'object' && existing.metadata ? existing.metadata : {}),
              lastSeenRunId: run.id,
              lastSeenAt: new Date().toISOString(),
              osmId: parsedLead.osm_id,
              osmType: parsedLead.osm_type,
            },
          },
        });
        return updated;
      } else {
        const created = await prisma.leadCandidate.create({
          data: {
            externalId,
            externalType,
            companyName: parsedLead.company_name.slice(0, 200),
            businessCategory: parsedLead.business_category,
            address: parsedLead.address?.slice(0, 300) || null,
            city: parsedLead.city?.slice(0, 100) || location.city,
            country: parsedLead.country || location.countryCode || 'UK',
            postcode: parsedLead.postcode || null,
            latitude: parsedLead.latitude,
            longitude: parsedLead.longitude,
            phone: parsedLead.phone || null,
            email: parsedLead.email ? normalizeEmail(parsedLead.email) : null,
            website: parsedLead.website || null,
            discoverySourceId: source.id,
            discoveryRunId: run.id,
            status,
            rejectionReason,
            rawTags: parsedLead.rawTags || null,
            metadata: {
              osmId: parsedLead.osm_id,
              osmType: parsedLead.osm_type,
              discoveredAt: new Date().toISOString(),
              sourceCity: location.city,
              sourceCountry: location.countryCode,
            },
          },
        });
        return created;
      }
    } catch (e) {
      // If unique constraint fails due to null discoverySourceId, fallback to find by company+city
      logWarn(`candidate upsert failed, fallback`, { error: e.message, company: parsedLead.company_name });
      try {
        const fallback = await prisma.leadCandidate.findFirst({
          where: {
            companyName: parsedLead.company_name.slice(0, 200),
            city: parsedLead.city?.slice(0, 100) || location.city,
            discoverySourceId: source.id,
          },
        });
        if (fallback) {
          const updated = await prisma.leadCandidate.update({
            where: { id: fallback.id },
            data: {
              address: parsedLead.address?.slice(0, 300) || null,
              phone: parsedLead.phone || null,
              email: parsedLead.email ? normalizeEmail(parsedLead.email) : null,
              website: parsedLead.website || null,
              discoveryRunId: run.id,
              status,
              rejectionReason,
              rawTags: parsedLead.rawTags || null,
            },
          });
          return updated;
        }
      } catch (e2) {
        logError(`fallback candidate upsert also failed`, { error: e2.message });
      }
      return null;
    }
  }

  for (const parsedLead of parsedLeads) {
    const emailNorm = normalizeEmail(parsedLead.email);
    const key = `${(parsedLead.company_name || '').toLowerCase().trim()}|${emailNorm}|${(parsedLead.city || '').toLowerCase().trim()}`;

    // In-run dedup
    if (inRunSet.has(key)) {
      duplicateRejected++;
      const cand = await upsertCandidate(parsedLead, 'REJECTED', 'duplicate_in_run');
      if (cand) {
        candidateIds.push(cand.id);
        candidatesPersisted++;
        candidatesRejected++;
      }
      continue;
    }

    // Phase 4C.2A — Persist candidate first as DISCOVERED, then update status
    // For no-email case, we still persist as NEEDS_ENRICHMENT
    if (requireEmail && !emailNorm) {
      noEmailRejected++;
      const cand = await upsertCandidate(parsedLead, 'NEEDS_ENRICHMENT', null);
      if (cand) {
        candidateIds.push(cand.id);
        candidatesPersisted++;
        candidatesNeedingEnrichment++;
      }
      inRunSet.add(key);
      continue;
    }

    // Website present
    if ((requireNoWebsite || rejectExistingWebsite) && parsedLead.website) {
      websiteRejected++;
      const cand = await upsertCandidate(parsedLead, 'REJECTED', 'existing_website');
      if (cand) {
        candidateIds.push(cand.id);
        candidatesPersisted++;
        candidatesRejected++;
      }
      inRunSet.add(key);
      continue;
    }

    // Generic email
    const domain = extractEmailDomain(parsedLead.email);
    if (rejectGeneric && domain && isGenericDomain(domain)) {
      genericEmailRejected++;
      const cand = await upsertCandidate(parsedLead, 'REJECTED', 'generic_email');
      if (cand) {
        candidateIds.push(cand.id);
        candidatesPersisted++;
        candidatesRejected++;
      }
      inRunSet.add(key);
      continue;
    }

    // Invalid email
    if (!emailNorm || !emailNorm.includes('@')) {
      invalidRejected++;
      const cand = await upsertCandidate(parsedLead, 'REJECTED', 'invalid_email');
      if (cand) {
        candidateIds.push(cand.id);
        candidatesPersisted++;
        candidatesRejected++;
      }
      inRunSet.add(key);
      continue;
    }

    // Verify email domain website (Emma Clinic fix) — must remain unchanged
    if (verifyEmailDomain && domain) {
      const check = await hasLiveWebsite(domain, {
        httpsCheck,
        httpFallback,
        followRedirects,
        timeoutMs: 8000,
        maxRedirects: MAX_REDIRECTS,
        maxBodyBytes: MAX_BODY_BYTES,
        userAgent: USER_AGENT,
      });
      if (check.live) {
        log(`FALSE NO_SITE rejected: ${parsedLead.company_name} - ${domain} has live site`, {
          reason: check.reason,
          status: check.statusCode,
        });
        websiteRejected++;
        const cand = await upsertCandidate(parsedLead, 'REJECTED', 'email_domain_has_live_website');
        if (cand) {
          candidateIds.push(cand.id);
          candidatesPersisted++;
          candidatesRejected++;
        }
        inRunSet.add(key);
        continue;
      }
    }

    // Passed all checks — qualified candidate
    inRunSet.add(key);
    const cand = await upsertCandidate(parsedLead, 'VERIFICATION_PENDING', null);
    if (cand) {
      candidateIds.push(cand.id);
      candidatesPersisted++;
      // Will become QUALIFIED after Lead insertion
      acceptedLeadsWithCandidate.push({ lead: { ...parsedLead, email: emailNorm, _key: key, _domain: domain }, candidateId: cand.id, candidate: cand });
      leadsAccepted++;
    } else {
      // If candidate upsert failed, still count as accepted for compatibility
      acceptedLeadsWithCandidate.push({ lead: { ...parsedLead, email: emailNorm, _key: key, _domain: domain }, candidateId: null, candidate: null });
      leadsAccepted++;
    }
  }

  log(`after filtering Phase 4C.2A`, {
    accepted: leadsAccepted,
    noEmail: noEmailRejected,
    generic: genericEmailRejected,
    website: websiteRejected,
    duplicateInRun: duplicateRejected,
    invalid: invalidRejected,
    candidatesPersisted,
    needingEnrichment: candidatesNeedingEnrichment,
    rejected: candidatesRejected,
    qualifiedPending: acceptedLeadsWithCandidate.length,
  });

  // 11. DB dedup and insert Leads with traceability
  const debugRows = [];

  for (const { lead, candidateId, candidate } of acceptedLeadsWithCandidate) {
    try {
      if (deduplicate) {
        const existingByEmail = await prisma.lead.findFirst({
          where: { email: lead.email },
        });
        if (existingByEmail) {
          duplicateRejected++;
          log(`duplicate by email: ${lead.email} exists as ${existingByEmail.id}`);
          // Update candidate as REJECTED duplicate, but keep qualifiedLeadId if existing lead already qualified?
          if (candidateId) {
            await prisma.leadCandidate.update({
              where: { id: candidateId },
              data: {
                status: 'REJECTED',
                rejectionReason: 'duplicate_email',
                qualifiedLeadId: existingByEmail.id, // link to existing lead for traceability
                metadata: {
                  ...(candidate?.metadata || {}),
                  duplicateOfLeadId: existingByEmail.id,
                },
              },
            });
            candidatesRejected++;
            // Adjust qualified count? It was pending, now rejected, so candidatesQualified not yet incremented
          }
          continue;
        }
        const existingByCompanyCity = await prisma.lead.findFirst({
          where: {
            companyName: lead.company_name,
            city: lead.city || undefined,
          },
        });
        if (existingByCompanyCity) {
          duplicateRejected++;
          log(`duplicate by company+city: ${lead.company_name} ${lead.city} exists as ${existingByCompanyCity.id}`);
          if (candidateId) {
            await prisma.leadCandidate.update({
              where: { id: candidateId },
              data: {
                status: 'REJECTED',
                rejectionReason: 'duplicate_company_city',
                qualifiedLeadId: existingByCompanyCity.id,
              },
            });
            candidatesRejected++;
          }
          continue;
        }
      }

      const inserted = await prisma.lead.create({
        data: {
          companyName: lead.company_name.slice(0, 120),
          businessCategory: lead.business_category || category.name,
          website: lead.website || null,
          email: lead.email.slice(0, 200),
          phone: lead.phone || null,
          address: lead.address || null,
          city: lead.city || location.city || null,
          country: lead.country || location.countryCode || 'UK',
          postcode: lead.postcode || null,
          source: `collector_worker_${source.type}_${location.city.toLowerCase().replace(/\\s+/g, '_')}`,
          status: 'NEW',
          priority: 'HIGH',
          optedInEmail: true,
          score: 100,
          segment: 'NO_SITE',
          hookLine: `Found ${lead.company_name} on OpenStreetMap - noticed you don't have a website yet. We help ${lead.business_category} businesses in ${lead.city} get more bookings with a simple site.`,
          collectorRunId: run.id, // Phase 4C.2A traceability
        },
      });

      leadsInserted++;
      leadIds.push(inserted.id);
      log(`inserted lead`, { company: lead.company_name, email: lead.email, city: lead.city, id: inserted.id, runId: run.id });

      if (candidateId) {
        await prisma.leadCandidate.update({
          where: { id: candidateId },
          data: {
            status: 'QUALIFIED',
            qualifiedLeadId: inserted.id,
            metadata: {
              ...(candidate?.metadata || {}),
              qualifiedAt: new Date().toISOString(),
              leadId: inserted.id,
            },
          },
        });
        candidatesQualified++;
      }

      if (debugCsv) {
        debugRows.push(lead);
      }
    } catch (e) {
      logError(`failed to insert lead ${lead.company_name} ${lead.email}`, { error: e.message });
      invalidRejected++;
      if (candidateId) {
        try {
          await prisma.leadCandidate.update({
            where: { id: candidateId },
            data: {
              status: 'REJECTED',
              rejectionReason: `insert_failed: ${e.message.slice(0, 100)}`,
            },
          });
          candidatesRejected++;
        } catch {}
      }
    }
  }

  log(`insertion done Phase 4C.2A`, { inserted: leadsInserted, accepted: leadsAccepted, candidatesQualified, candidatesPersisted, leadIds: leadIds.length, candidateIds: candidateIds.length });

  const nextEligible = new Date(Date.now() + config.collectionFrequencyMinutes * 60 * 1000);
  await prisma.collectorState.update({
    where: { id: state.id },
    data: {
      lastRunAt: new Date(),
      lastSuccessfulRunAt: new Date(),
      nextEligibleRunAt: nextEligible,
      consecutiveFailures: 0,
      cycle: { increment: 1 },
      totalCandidates: { increment: candidatesFound },
      totalAccepted: { increment: leadsAccepted },
      totalRejected: { increment: noEmailRejected + genericEmailRejected + websiteRejected + duplicateRejected + invalidRejected },
      cursor: {
        lastBbox: bbox.bboxStr,
        lastCategory: category.slug,
        lastSource: source.baseUrl,
        lastRunId: run.id,
        lastCandidates: candidatesFound,
        lastAccepted: leadsAccepted,
      },
    },
  });

  await prisma.collectorLocation.update({
    where: { id: location.id },
    data: { lastCollectedAt: new Date(), nextCollectAt: nextEligible },
  });
  await prisma.leadCategory.update({
    where: { id: category.id },
    data: { lastRunAt: new Date() },
  });
  const hadRetries = fetchResult && fetchResult.retryDelays && fetchResult.retryDelays.length > 0;
  const newHealthStatus = hadRetries ? 'degraded' : 'healthy';
  try {
    await prisma.dataSource.update({
      where: { id: source.id },
      data: {
        healthStatus: newHealthStatus,
        lastCheckedAt: new Date(),
      },
    });
    if (hadRetries) {
      logWarn(`source ${source.name} marked degraded after ${fetchResult.retryDelays.length} retries but eventual success`, {
        retries: fetchResult.retryDelays.length,
        attempt: fetchResult.attempt,
        status: fetchResult.status,
      });
    } else {
      log(`source ${source.name} marked healthy, no retries`, { lastCheckedAt: new Date().toISOString() });
    }
  } catch (e) {
    logWarn(`failed to update source health for ${source.name}`, { error: e.message });
  }

  const durationMs = Date.now() - startTime;
  const finalStatus = queryFailures.length ? 'PARTIAL' : 'SUCCESS';
  const acceptanceRate = parsedCount ? (leadsAccepted / parsedCount) : 0;
  const insertionRate = parsedCount ? (leadsInserted / parsedCount) : 0;

  await prisma.collectorRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      finishedAt: new Date(),
      durationMs,
      queriesAttempted,
      candidatesFound,
      noEmailRejected,
      genericEmailRejected,
      websiteRejected,
      duplicateRejected,
      invalidRejected,
      leadsAccepted,
      leadsInserted,
      metadata: {
        ...(typeof run.metadata === 'object' ? run.metadata : {}),
        fetchResult: {
          attempt: fetchResult.attempt,
          retryDelays: fetchResult.retryDelays,
          status: fetchResult.status,
        },
        queryFailures,
        bbox: bbox.bboxStr,
        bboxCenter: bbox.center,
        effectiveConcurrency,
        timeoutMs,
        retryCount,
        warnings: [...osmWarnings, ...ruleWarnings],
        durationMs,
        parsedCount,
        emailPresentCount,
        emailPresenceRate: parseFloat(emailPresenceRate.toFixed(4)),
        acceptanceRate: parseFloat(acceptanceRate.toFixed(4)),
        insertionRate: parseFloat(insertionRate.toFixed(4)),
        yield: {
          raw: candidatesFound,
          parsed: parsedCount,
          emailPresent: emailPresentCount,
          emailPresenceRate: `${(emailPresenceRate*100).toFixed(2)}%`,
          accepted: leadsAccepted,
          inserted: leadsInserted,
          acceptanceRate: `${(acceptanceRate*100).toFixed(2)}%`,
          noEmailRate: parsedCount ? `${((noEmailRejected/parsedCount)*100).toFixed(2)}%` : '0%',
          websiteRejectedRate: parsedCount ? `${((websiteRejected/parsedCount)*100).toFixed(2)}%` : '0%',
        },
        // Phase 4C.2A traceability
        candidateIds,
        leadIds,
        candidatesPersisted,
        candidatesNeedingEnrichment,
        candidatesRejected,
        candidatesQualified,
      },
    },
  });

  log(`run finalized Phase 4C.2A`, {
    runId: run.id,
    status: finalStatus,
    duration: `${Math.round(durationMs / 1000)}s`,
    candidates: candidatesFound,
    parsed: parsedCount,
    candidatesPersisted,
    needingEnrichment: candidatesNeedingEnrichment,
    rejected: candidatesRejected,
    qualified: candidatesQualified,
    accepted: leadsAccepted,
    inserted: leadsInserted,
    websiteRejected,
    duplicateRejected,
    genericRejected: genericEmailRejected,
    noEmail: noEmailRejected,
    candidateIds: candidateIds.length,
    leadIds: leadIds.length,
  });

  if (debugCsv && debugRows.length) {
    const csvPath = path.join(process.cwd(), 'collector-debug.csv');
    const header = 'company_name,business_category,website,email,phone,address,city,country,source\n';
    const rows = debugRows.map(r =>
      `"${r.company_name.replace(/"/g, '""')}","${r.business_category}","${r.website}","${r.email}","${r.phone}","${r.address.replace(/"/g, '""')}","${r.city}","${r.country}","${r.source}"`
    ).join('\n');
    fs.writeFileSync(csvPath, header + rows, 'utf8');
    log(`debug CSV written`, { path: csvPath, rows: debugRows.length });
  } else if (debugCsv) {
    const csvPath = path.join(process.cwd(), 'collector-debug.csv');
    fs.writeFileSync(csvPath, 'company_name,business_category,website,email,phone,address,city,country,source\n', 'utf8');
    log(`debug CSV written empty (no accepted leads)`, { path: csvPath });
  }

  const hb = {
    timestamp: new Date().toISOString(),
    message: `Worker ${location.city}/${category.slug}: ${leadsInserted} inserted, ${candidatesFound} raw, ${parsedCount} parsed, ${candidatesPersisted} candidates, ${candidatesNeedingEnrichment} needEnrichment, ${candidatesQualified} qualified - ${finalStatus} - ${fetchResult.retryDelays.length} retries`,
    collectors: 1,
    source: 'collector-worker',
    githubRunId: GITHUB_RUN_ID,
    lastRun: {
      runId: run.id,
      status: finalStatus,
      location: location.city,
      category: category.slug,
      source: source.name,
      candidatesFound,
      parsedCount,
      emailPresentCount,
      emailPresenceRate: `${(emailPresenceRate*100).toFixed(2)}%`,
      candidatesPersisted,
      candidatesNeedingEnrichment,
      candidatesRejected,
      candidatesQualified,
      leadsAccepted,
      leadsInserted,
      acceptanceRate: `${(acceptanceRate*100).toFixed(2)}%`,
      durationMs,
      retries: fetchResult.retryDelays.length,
      attempt: fetchResult.attempt,
      finalStatus: fetchResult.status,
      health: newHealthStatus,
      candidateIds: candidateIds.slice(0, 5),
      leadIds: leadIds.slice(0, 5),
    },
  };
  await prisma.setting.upsert({
    where: { key: 'collector_heartbeat' },
    update: { value: JSON.stringify(hb) },
    create: { key: 'collector_heartbeat', value: JSON.stringify(hb) },
  });

  console.log(`[collector] assignment ${location.city} / ${category.slug} / ${source.name}`);
  console.log(`[collector] candidates=${candidatesFound} parsed=${parsedCount} emailPresent=${emailPresentCount} emailPresenceRate=${(emailPresenceRate*100).toFixed(2)}%`);
  console.log(`[collector] candidatesPersisted=${candidatesPersisted} needingEnrichment=${candidatesNeedingEnrichment} rejected=${candidatesRejected} qualified=${candidatesQualified}`);
  console.log(`[collector] accepted=${leadsAccepted} inserted=${leadsInserted} acceptanceRate=${(acceptanceRate*100).toFixed(2)}%`);
  console.log(`[collector] websiteRejected=${websiteRejected} duplicateRejected=${duplicateRejected} genericRejected=${genericEmailRejected} noEmailRejected=${noEmailRejected}`);
  console.log(`[collector] candidateIds=${candidateIds.length} leadIds=${leadIds.length}`);
  console.log(`[collector] retries=${fetchResult.retryDelays.length} attempt=${fetchResult.attempt} status=${fetchResult.status} health=${newHealthStatus}`);
  console.log(`[collector] run=${finalStatus} duration=${Math.round(durationMs / 1000)}s`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  logError(`fatal error`, { error: e.message, stack: e.stack?.slice(0, 1000) });
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
