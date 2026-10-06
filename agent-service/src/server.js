import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Agent, MemorySession, run, setDefaultOpenAIKey, tool } from '@openai/agents';
import { createMcpRequestHandler } from './mcp-server.js';
import { HIMI_TOOL_DEFINITIONS, executeHimiTool } from './himi-tools.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, '..', '..');
loadProjectEnvironment(projectRoot);

const host = process.env.OPENAI_AGENT_SDK_HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const port = positiveInteger(process.env.PORT || process.env.OPENAI_AGENT_SDK_PORT, 8787);
const apiKey = (process.env.OPENAI_API_KEY || '').trim();
const defaultModel = (process.env.OPENAI_MODEL || 'gpt-5-mini').trim();
const defaultTimeout = positiveInteger(process.env.OPENAI_TIMEOUT, 45) * 1000;

const mcpHandler = createMcpRequestHandler({
  enabled: booleanEnv(process.env.MCP_ENABLED, false),
  accessToken: process.env.MCP_ACCESS_TOKEN,
  allowedOrigins: process.env.MCP_ALLOWED_ORIGINS,
  rateLimitPerMinute: process.env.MCP_RATE_LIMIT_PER_MINUTE,
});

if (apiKey) {
  setDefaultOpenAIKey(apiKey);
}

// Lightweight in-memory session store for conversational continuity
const activeSessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessionId) return undefined;
  let session = activeSessions.get(sessionId);
  if (!session) {
    session = new MemorySession();
    activeSessions.set(sessionId, session);
  }
  return session;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

    // Health endpoint
    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, {
        ok: true,
        service: 'clientforge-himi-agent',
        agent: 'HIMI',
        brain: 'node-openai-agents-sdk',
        sdk: '@openai/agents',
        model: defaultModel,
        mcp: {
          enabled: mcpHandler.status.configured,
          endpoint: mcpHandler.status.endpoint,
        },
      });
    }

    // MCP HTTP Endpoint
    if (await mcpHandler(request, response, url)) return;

    // Conversational Chat Endpoint
    if (request.method === 'POST' && (url.pathname === '/v1/chat' || url.pathname === '/v1/agent-turn')) {
      const activeApiKey = (process.env.OPENAI_API_KEY || apiKey).trim();
      if (!activeApiKey) {
        return sendJson(response, 500, { ok: false, error: 'OPENAI_API_KEY is not configured.' });
      }
      setDefaultOpenAIKey(activeApiKey);
      const rawBody = await readBody(request, 2_000_000);
      const body = parseJson(rawBody);
      const result = await runHimiChatTurn(body, activeApiKey);
      return sendJson(response, result.ok ? 200 : 400, result);
    }

    return sendJson(response, 404, { ok: false, error: 'Route not found.' });
  } catch (error) {
    if (response.headersSent) return;
    return sendJson(response, error instanceof RequestError ? error.status : 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Agent request failed.',
    });
  }
});

async function runHimiChatTurn(inputPayload, activeApiKey) {
  const userPrompt = String(inputPayload?.message || inputPayload?.prompt || inputPayload?.text || '').trim();
  const sessionId = String(inputPayload?.sessionId || '').trim() || undefined;

  if (!userPrompt) {
    return { ok: false, error: 'message is required.' };
  }

  const toolCallsExecuted = [];

  const availableTools = HIMI_TOOL_DEFINITIONS.map((def) => tool({
    name: def.name,
    description: def.description,
    parameters: def.input_schema,
    strict: false,
    timeoutMs: defaultTimeout,
    execute: async (arguments_) => {
      const startedAt = Date.now();
      let ok = true;
      let res;
      try {
        res = await executeHimiTool(def.name, arguments_);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: 'TOOL_EXECUTION_ERROR', message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({
        name: def.name,
        ok,
        durationMs: Date.now() - startedAt,
      });
      return JSON.stringify(res);
    },
  }));

  const himiAgent = new Agent({
    name: 'HIMI',
    model: defaultModel,
    instructions: () => himiSystemInstructions(),
    tools: availableTools,
  });

  const session = getOrCreateSession(sessionId);
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), defaultTimeout);

  try {
    const runOptions = {
      signal: timeoutController.signal,
      workflowName: 'HIMI — ClientForge Conversational AI Agent',
      traceIncludeSensitiveData: false,
      maxTurns: 10,
    };
    if (session) {
      runOptions.session = session;
    }

    const result = await run(himiAgent, userPrompt, runOptions);

    const outputText = typeof result?.finalOutput === 'string'
      ? result.finalOutput.trim()
      : JSON.stringify(result?.finalOutput || {});

    return {
      ok: true,
      agent: 'HIMI',
      response: outputText,
      toolCalls: toolCallsExecuted,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to execute HIMI turn.',
      toolCalls: toolCallsExecuted,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function himiSystemInstructions() {
  return `You are HIMI — the AI operations assistant for ClientForge CRM.

Core Purpose & Identity:
- You help team members operate ClientForge, an outreach CRM designed for UK, US, and UAE client acquisition.
- ClientForge tracks business leads and communication timelines (Activities).
- Outreach channels are Email (handled via Resend) and WhatsApp (handled via Meta WhatsApp Cloud API).

STRICT READ-ONLY BOUNDARY (HIMI V2):
- Current HIMI capabilities are STRICTLY READ-ONLY.
- You have 4 available tools: search_leads, get_lead_details, get_lead_activity, get_outreach_stats.
- If the user asks to modify a lead, change a status, create a record, delete data, send an email, or send a WhatsApp message (e.g. "Send Mayank a WhatsApp", "Change lead to interested"), REFUSE NATIVELY AND GRACEFULLY.
- State clearly that you currently have read-only CRM access and cannot perform database updates or send outreach messages yet.
- NEVER pretend or claim an unsupported action occurred.

Data Integrity & Tool Selection:
- ClientForge tools are your sole source of truth. Always call the appropriate read-only tools to retrieve real CRM data.
- NEVER fabricate leads, contact details, email addresses, phone numbers, or activity histories.
- If a search for a company name returns MULTIPLE plausible lead records, list the matching leads concisely (ID, Company Name, City/Country) and ask the user to clarify which lead they mean.
- If no leads match or database data is unavailable, state so clearly.

ClientForge Lead Qualification Rules:
- Rule: CONFIRMED NO WEBSITE + (VALID PHONE OR VALID EMAIL) = VALID LEAD.
- No website + valid email = valid lead.
- No website + valid phone = valid lead.
- No website + both = valid lead.
- No website + neither = invalid.
- Live/working website = invalid for NO_SITE targeting.
- Critical logic: Missing website data or a failed search is NOT proof that a business has no website. Never infer confirmed no-site status without verification.

Tone & Style:
- Concise, operational, confident only when supported by CRM data, helpful, and natural.
- Keep responses focused, direct, and well-structured. Avoid unnecessary filler.`;
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function booleanEnv(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function loadProjectEnvironment(rootPath) {
  const envPath = resolve(rootPath, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#;][^=]+?)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function readBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new RequestError(413, 'Payload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400, 'Invalid JSON body');
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, host, () => {
    process.stdout.write(`[clientforge-himi-agent] Server running on http://${host}:${port}\n`);
  });
}
