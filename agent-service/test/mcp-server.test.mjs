import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { afterEach, test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpRequestHandler } from '../src/mcp-server.js';

const ACCESS_TOKEN = 'test-mcp-token-with-at-least-32-characters';
const runningServers = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => closeServer(server)));
});

test('disabled MCP endpoint fails closed', async () => {
  const gateway = await startGateway({ enabled: false });
  const response = await fetch(`${gateway.url}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.message, 'MCP service is unavailable.');
});

test('MCP endpoint requires exact bearer token and rejects unauthorized origins', async () => {
  const gateway = await startGateway();
  const request = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} };

  const unauthorized = await fetch(`${gateway.url}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
    body: JSON.stringify(request),
  });
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get('www-authenticate') || '', /^Bearer /);
  assert.equal(unauthorized.headers.get('x-mcp-auth-revision'), '2');

  const originDenied = await fetch(`${gateway.url}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}`, Origin: 'https://untrusted.example' },
    body: JSON.stringify(request),
  });
  assert.equal(originDenied.status, 403);
});

test('MCP exposes HIMI read-only tools catalog', async () => {
  const gateway = await startGateway();
  const client = new Client({ name: 'himi-mcp-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${gateway.url}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  });

  await client.connect(transport);
  const listed = await client.listTools();
  const toolNames = listed.tools.map((t) => t.name);

  assert.deepEqual(toolNames, ['search_leads', 'get_lead_details', 'get_lead_activity', 'get_outreach_stats']);
  assert.equal(listed.tools[0].annotations.readOnlyHint, true);
  assert.equal(listed.tools[0].annotations.destructiveHint, false);

  await client.close();
});

test('MCP allows explicitly configured browser origins', async () => {
  const gateway = await startGateway({ allowedOrigins: 'https://chatgpt.com' });
  const client = new Client({ name: 'himi-origin-test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${gateway.url}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, Origin: 'https://chatgpt.com' } },
  });

  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 4);
  await client.close();
});

test('MCP rate limits repeated requests', async () => {
  const gateway = await startGateway({ rateLimitPerMinute: 1 });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` };
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'invalid-test-method' });

  const first = await fetch(`${gateway.url}/mcp`, { method: 'POST', headers, body });
  assert.notEqual(first.status, 429);

  const limited = await fetch(`${gateway.url}/mcp`, { method: 'POST', headers, body });
  assert.equal(limited.status, 429);
});

async function startGateway(overrides = {}) {
  const handler = createMcpRequestHandler({
    enabled: true,
    accessToken: ACCESS_TOKEN,
    rateLimitPerMinute: 100,
    audit: () => {},
    ...overrides,
  });
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    if (await handler(request, response, url)) return;
    response.writeHead(404).end();
  });
  const url = await listen(server);
  return { server, url, handler };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  runningServers.push(server);
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolve) => server.close(resolve));
}
