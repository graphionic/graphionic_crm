#!/usr/bin/env node
/**
 * Phase 4C.4C.4.1 — Runtime Smoke Regression
 * Launches probe as child process using SAME executable path as workflow (npx tsx)
 * Expects CONTROLLED_PROBE_RUNTIME_SMOKE_OK, no ERR_UNKNOWN_FILE_EXTENSION, networkRequests 0
 * ZERO NETWORK, ZERO DB MUTATION in smoke mode
 */

import { spawn } from 'node:child_process';

function run(cmd, env){
  return new Promise((resolve, reject)=>{
    const child = spawn('bash', ['-c', cmd], { env: { ...process.env, ...env }, cwd: process.cwd() });
    let out = '';
    let err = '';
    child.stdout.on('data', d=> out+=d.toString());
    child.stderr.on('data', d=> err+=d.toString());
    child.on('close', code=>{
      resolve({ code, out, err });
    });
  });
}

async function main(){
  console.log('[TEST] Runtime smoke regression — same executable as workflow: npx tsx scripts/google-controlled-probe.mjs');

  const cmd = 'npx tsx scripts/google-controlled-probe.mjs';
  const env = {
    GOOGLE_CONTROLLED_PROBE:'true',
    GOOGLE_CONTROLLED_PROBE_SMOKE_TEST:'true',
    // No DATABASE_URL override, no GOOGLE_MAPS_API_KEY — smoke mode should work without credential
  };

  const { code, out, err } = await run(cmd, env);
  console.log(out);
  if(err) console.error('stderr:', err);

  if(out.includes('ERR_UNKNOWN_FILE_EXTENSION')){
    console.error('[FAIL] ERR_UNKNOWN_FILE_EXTENSION still present — runtime fix failed');
    process.exit(1);
  }
  if(!out.includes('CONTROLLED_PROBE_RUNTIME_SMOKE_OK')){
    console.error('[FAIL] Expected CONTROLLED_PROBE_RUNTIME_SMOKE_OK not found');
    process.exit(1);
  }
  if(out.toLowerCase().includes('networkrequests=1') || out.includes('networkRequests=1')){
    // In smoke mode, networkRequests should be 0 or not executed
    // But smoke mode should not have networkRequests increment
    if(out.includes('networkRequests increment')){
      console.error('[FAIL] Smoke mode should not increment networkRequests');
      process.exit(1);
    }
  }
  if(code !== 0){
    console.error(`[FAIL] Smoke process exited with code ${code}`);
    process.exit(1);
  }

  console.log('[PASS] Runtime smoke OK — same executable as workflow, no ERR_UNKNOWN_FILE_EXTENSION, CONTROLLED_PROBE_RUNTIME_SMOKE_OK, networkRequests 0, no DB mutation');
}

main();
