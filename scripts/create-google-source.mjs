#!/usr/bin/env node
/**
 * Phase 4C.4C.3 — Idempotent Google Places DataSource creation
 * Creates ONE disabled source if none exists, reuses/updates safe non-secret config if one exists, stops if multiple
 * ZERO GOOGLE REQUESTS, NO SECRET
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(){
  const existing = await prisma.dataSource.findMany({ where:{ type:'google_places' } });
  console.log(`[google-source] Found ${existing.length} existing google_places sources`);

  if(existing.length > 1){
    console.error('[google-source] AMBIGUITY: multiple google_places sources exist, STOP and report');
    for(const ds of existing){
      console.log(` - id=${ds.id} name=${ds.name} enabled=${ds.enabled} type=${ds.type}`);
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  if(existing.length === 0){
    console.log('[google-source] No existing source, creating ONE disabled Google Places source');
    const created = await prisma.dataSource.create({
      data:{
        name:'Google Places',
        type:'google_places',
        enabled:false,
        priority:90,
        baseUrl:'https://places.googleapis.com',
        timeoutMs:25000,
        retryCount:0,
        concurrency:1,
        healthStatus:'unknown',
        config:{
          apiVersion:'v1',
          fieldStrategy:'staged', // SEARCH_ID_ONLY_MASK, SEARCH_DISCOVERY_MASK, etc.
          pageCap:3,
          source:'places_api_new',
          // No secret, no API key, no credential
        }
      }
    });
    console.log(`[google-source] Created id=${created.id} name=${created.name} enabled=${created.enabled} type=${created.type} priority=${created.priority}`);
  } else {
    const ds = existing[0];
    console.log(`[google-source] Reusing existing source id=${ds.id} name=${ds.name} enabled=${ds.enabled}`);
    // Update only safe non-secret configuration, keep disabled
    const safeConfig = {
      apiVersion:'v1',
      fieldStrategy:'staged',
      pageCap:3,
      source:'places_api_new',
    };
    const updated = await prisma.dataSource.update({
      where:{ id: ds.id },
      data:{
        // Keep disabled false, do not enable
        enabled:false,
        priority:90,
        baseUrl:'https://places.googleapis.com',
        timeoutMs:25000,
        retryCount:0,
        concurrency:1,
        healthStatus: ds.healthStatus || 'unknown',
        config: safeConfig,
      }
    });
    console.log(`[google-source] Updated to safe config, enabled=${updated.enabled} priority=${updated.priority} baseUrl=${updated.baseUrl}`);
  }

  const final = await prisma.dataSource.findMany({ where:{ type:'google_places' } });
  console.log(`[google-source] Final count=${final.length}`);
  for(const ds of final){
    console.log(` - id=${ds.id} name=${ds.name} enabled=${ds.enabled} type=${ds.type} priority=${ds.priority} baseUrl=${ds.baseUrl} configKeys=${Object.keys(ds.config||{}).join(',')}`);
    // Safety check: config must not contain secret
    const configStr = JSON.stringify(ds.config||{});
    if(configStr.toLowerCase().includes('apikey') || configStr.toLowerCase().includes('api_key') || configStr.includes('AIza') || configStr.toLowerCase().includes('credential') || configStr.toLowerCase().includes('authorization')){
      console.error('[google-source] FAIL: DataSource.config contains potential secret marker!');
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e)=>{
  console.error('Failed', e);
  try{ const { PrismaClient } = await import('@prisma/client'); const p = new PrismaClient(); await p.$disconnect(); }catch{}
  process.exit(1);
});
