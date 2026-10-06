import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const directory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(directory, '..', '..');
loadEnvironment(resolve(projectRoot, '.env'));

const nodeBaseUrl = (process.env.OPENAI_AGENT_SDK_URL
  || `http://${process.env.OPENAI_AGENT_SDK_HOST || '127.0.0.1'}:${process.env.OPENAI_AGENT_SDK_PORT || '8787'}`).replace(/\/$/, '');

const health = await request(`${nodeBaseUrl}/health`);
assertStatus(health, 200, 'HIMI health');
const healthBody = await health.json();

if (healthBody.service !== 'clientforge-himi-agent') {
  fail(`HIMI health returned invalid service name: ${healthBody.service}`);
}
if (healthBody.agent !== 'HIMI') {
  fail(`HIMI health returned invalid agent identity: ${healthBody.agent}`);
}

let mcpToolCount = 0;
if (booleanEnv(process.env.MCP_ENABLED, false)) {
  if (healthBody.mcp?.enabled !== true) fail('MCP is enabled in environment but reported unavailable in HIMI health.');
  const mcpAccessToken = required('MCP_ACCESS_TOKEN');
  const client = new Client({ name: 'himi-smoke', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${nodeBaseUrl}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${mcpAccessToken}` } },
  });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    if (!Array.isArray(tools.tools) || tools.tools.length === 0) fail('HIMI MCP returned an empty tool catalog.');
    mcpToolCount = tools.tools.length;
  } finally {
    await client.close().catch(() => {});
  }
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  service: healthBody.service,
  agent: healthBody.agent,
  model: healthBody.model,
  mcp_enabled: healthBody.mcp?.enabled === true,
  mcp_tool_count: mcpToolCount,
})}\n`);

async function request(url, options = {}) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    fail(`Unable to reach ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertStatus(response, expected, label) {
  if (response.status !== expected) fail(`${label} returned HTTP ${response.status}; expected ${expected}.`);
}

function required(name) {
  const value = (process.env[name] || '').trim();
  if (!value) fail(`${name} is required for the local smoke test.`);
  return value;
}

function booleanEnv(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function loadEnvironment(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#;][^=]+?)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
