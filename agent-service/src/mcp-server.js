import { timingSafeEqual } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { HIMI_TOOL_DEFINITIONS, executeHimiTool } from './himi-tools.js';

const MCP_PATH = '/mcp';
const MAX_BODY_BYTES = 1_000_000;
const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,127}$/;

export function createMcpRequestHandler(options = {}) {
  const enabled = options.enabled === true;
  const accessToken = String(options.accessToken || '').trim();
  const rateLimitPerMinute = positiveInteger(options.rateLimitPerMinute, 60);
  const allowedOrigins = new Set(normalizeList(options.allowedOrigins));
  const audit = typeof options.audit === 'function' ? options.audit : defaultAudit;
  const attempts = new Map();

  const configurationErrors = [];
  if (enabled && accessToken.length < 32) configurationErrors.push('MCP_ACCESS_TOKEN must contain at least 32 characters.');

  const configured = enabled && configurationErrors.length === 0;

  async function handle(request, response, url) {
    if (url.pathname !== MCP_PATH) return false;

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-MCP-Auth-Revision', '2');

    if (!configured) {
      audit('unavailable', { reason: enabled ? 'invalid_configuration' : 'disabled' });
      sendJsonRpcError(response, 503, -32000, 'MCP service is unavailable.');
      return true;
    }

    const source = requestSource(request);
    const rate = consumeRateLimit(attempts, source, rateLimitPerMinute);
    if (!rate.allowed) {
      response.setHeader('Retry-After', String(rate.retryAfterSeconds));
      audit('rate_limited', { source });
      sendJsonRpcError(response, 429, -32000, 'Too many MCP requests.');
      return true;
    }

    const origin = String(request.headers.origin || '').trim();
    if (origin !== '' && !allowedOrigins.has(origin)) {
      audit('origin_denied', { source, origin });
      sendJsonRpcError(response, 403, -32000, 'Origin is not allowed.');
      return true;
    }

    if (!validAccessToken(request.headers, accessToken)) {
      const diagnostic = authenticationDiagnostic(request.headers, accessToken);
      response.setHeader('WWW-Authenticate', 'Bearer realm="clientforge-himi-mcp"');
      response.setHeader('X-MCP-Auth-Input', diagnostic.input);
      response.setHeader('X-MCP-Auth-Length-Match', String(diagnostic.lengthMatch));
      audit('authentication_failed', { source, auth_input: diagnostic.input, length_match: diagnostic.lengthMatch });
      sendJsonRpcError(response, 401, -32001, 'Unauthorized.');
      return true;
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      sendJsonRpcError(response, 405, -32000, 'Method not allowed.');
      return true;
    }

    let body;
    try {
      body = await readJsonBody(request, MAX_BODY_BYTES);
    } catch (error) {
      audit('invalid_request', { source, reason: error instanceof Error ? error.message : 'invalid_body' });
      sendJsonRpcError(response, error instanceof McpHttpError ? error.status : 400, -32700, 'Invalid JSON request.');
      return true;
    }

    const mcpServer = createHimiMcpServer({
      audit,
      source,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(request, response, body);
    } catch (error) {
      audit('request_failed', { source, reason: safeErrorCode(error) });
      if (!response.headersSent) sendJsonRpcError(response, 500, -32603, 'Internal MCP error.');
    } finally {
      await transport.close().catch(() => {});
      await mcpServer.close().catch(() => {});
    }

    return true;
  }

  handle.status = Object.freeze({
    enabled,
    configured,
    endpoint: MCP_PATH,
    configurationErrors: [...configurationErrors],
  });

  return handle;
}

function createHimiMcpServer(options) {
  const toolsMap = new Map(HIMI_TOOL_DEFINITIONS.map((def) => [def.name, def]));
  const server = new Server(
    { name: 'clientforge-himi-agent', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      instructions: 'HIMI is the ClientForge AI Agent. Use read-only CRM tools to search leads, inspect lead details, view activity history, and retrieve outreach statistics. Never fabricate data or assume unverified facts.',
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: HIMI_TOOL_DEFINITIONS.map(publicToolDefinition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const startedAt = Date.now();
    const name = String(request.params.name || '');
    const definition = toolsMap.get(name);
    if (!definition) {
      options.audit('tool_denied', { source: options.source, tool: name, reason: 'not_in_catalog' });
      return toolError('TOOL_NOT_FOUND', 'The requested ClientForge tool is not available.');
    }

    const arguments_ = isPlainObject(request.params.arguments) ? request.params.arguments : {};
    let payload;
    try {
      payload = await executeHimiTool(name, arguments_);
    } catch (error) {
      options.audit('tool_failed', {
        source: options.source,
        tool: name,
        duration_ms: Date.now() - startedAt,
        reason: safeErrorCode(error),
      });
      return toolError('EXECUTION_FAILED', 'Failed to execute ClientForge CRM tool.');
    }

    const isError = payload?.ok !== true;
    options.audit('tool_completed', {
      source: options.source,
      tool: name,
      duration_ms: Date.now() - startedAt,
      ok: !isError,
      result_code: isError ? cleanAuditValue(payload?.error?.code) : 'OK',
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      structuredContent: isPlainObject(payload) ? payload : { result: payload },
      isError,
    };
  });

  return server;
}

function publicToolDefinition(definition) {
  const annotations = toolAnnotations(definition.name);
  return {
    name: definition.name,
    title: humanTitle(definition.name),
    description: definition.description,
    inputSchema: definition.input_schema,
    annotations,
  };
}

function toolAnnotations(name) {
  const readOnly = true; // All initial HIMI tools are read-only
  return {
    title: humanTitle(name),
    readOnlyHint: readOnly,
    destructiveHint: false,
    idempotentHint: readOnly,
    openWorldHint: false,
  };
}

async function readJsonBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new McpHttpError(413, 'body_too_large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) throw new McpHttpError(400, 'empty_body');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new McpHttpError(400, 'invalid_json');
  }
}

function validBearer(header, expected) {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  return validExactToken(header.slice(7), expected);
}

function validAccessToken(headers, expected) {
  return validBearer(headers.authorization, expected)
    || validExactToken(headers['x-mcp-access-token'], expected);
}

function authenticationDiagnostic(headers, expected) {
  const bearer = typeof headers.authorization === 'string' && headers.authorization.startsWith('Bearer ')
    ? headers.authorization.slice(7).trim()
    : null;
  const custom = typeof headers['x-mcp-access-token'] === 'string'
    ? headers['x-mcp-access-token'].trim()
    : null;
  const provided = [bearer, custom].filter((value) => value !== null);
  return {
    input: bearer !== null && custom !== null ? 'both' : bearer !== null ? 'bearer' : custom !== null ? 'custom' : 'none',
    lengthMatch: provided.some((value) => Buffer.byteLength(value) === Buffer.byteLength(expected)),
  };
}

function validExactToken(value, expected) {
  if (typeof value !== 'string') return false;
  const provided = value.trim();
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function consumeRateLimit(store, key, limit) {
  const now = Date.now();
  const windowMs = 60_000;
  let entry = store.get(key);
  if (!entry || now - entry.startedAt >= windowMs) entry = { startedAt: now, count: 0 };
  entry.count += 1;
  store.set(key, entry);

  if (store.size > 1_000) {
    for (const [candidate, value] of store) {
      if (now - value.startedAt >= windowMs) store.delete(candidate);
    }
  }

  return {
    allowed: entry.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - entry.startedAt)) / 1000)),
  };
}

function requestSource(request) {
  return cleanAuditValue(request.socket?.remoteAddress) || 'unknown';
}

function sendJsonRpcError(response, status, code, message) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }));
}

function toolError(code, message) {
  const payload = { ok: false, error: { code, message } };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: true,
  };
}

function defaultAudit(event, fields = {}) {
  process.stderr.write(`[mcp-audit] ${JSON.stringify({ event, ...fields, at: new Date().toISOString() })}\n`);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function humanTitle(value) {
  return String(value).split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanAuditValue(value) {
  const cleaned = String(value || '').replace(/[^a-zA-Z0-9_.:\-]/g, '').slice(0, 128);
  return cleaned || null;
}

function safeErrorCode(error) {
  return cleanAuditValue(error instanceof Error ? error.message : 'unknown_error') || 'unknown_error';
}

class McpHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
