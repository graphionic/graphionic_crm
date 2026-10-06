import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Agent, run, setDefaultOpenAIKey, tool } from '@openai/agents';
import { createMcpRequestHandler } from './mcp-server.js';
import { HIMI_TOOL_DEFINITIONS, executeHimiTool } from './himi-tools.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, '..', '..');
const inheritedMcpAccessToken = Object.hasOwn(process.env, 'MCP_ACCESS_TOKEN');
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

    // Agent structured execution endpoint
    if (request.method === 'POST' && (url.pathname === '/v1/agent-turn' || url.pathname === '/v1/structured-json')) {
      if (!apiKey) {
        return sendJson(response, 500, { error: 'OPENAI_API_KEY is not configured.' });
      }
      const rawBody = await readBody(request, 2_000_000);
      const body = parseJson(rawBody);
      const result = await runHimiAgentTurn(body);
      return sendJson(response, 200, result);
    }

    return sendJson(response, 404, { error: 'Route not found.' });
  } catch (error) {
    if (response.headersSent) return;
    return sendJson(response, error instanceof RequestError ? error.status : 500, {
      error: error instanceof Error ? error.message : 'Agent request failed.',
    });
  }
});

async function runHimiAgentTurn(inputPayload) {
  const userPrompt = String(inputPayload?.prompt || inputPayload?.text || '').trim();
  if (!userPrompt) {
    return { ok: false, error: 'Prompt is required.' };
  }

  const availableTools = HIMI_TOOL_DEFINITIONS.map((def) => tool({
    name: def.name,
    description: def.description,
    parameters: def.input_schema,
    strict: false,
    timeoutMs: defaultTimeout,
    execute: async (arguments_) => {
      const res = await executeHimiTool(def.name, arguments_);
      return JSON.stringify(res);
    },
  }));

  const himiAgent = new Agent({
    name: 'HIMI',
    model: defaultModel,
    instructions: () => himiSystemInstructions(),
    tools: availableTools,
  });

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), defaultTimeout);

  try {
    const result = await run(himiAgent, userPrompt, {
      signal: timeoutController.signal,
      workflowName: 'HIMI — ClientForge AI Agent',
      traceIncludeSensitiveData: false,
      maxTurns: 10,
    });

    const outputText = typeof result?.finalOutput === 'string'
      ? result.finalOutput.trim()
      : JSON.stringify(result?.finalOutput || {});

    return {
      ok: true,
      agent: 'HIMI',
      response: outputText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function himiSystemInstructions() {
  return `You are HIMI, the AI Agent for ClientForge CRM.

Core Role & Purpose:
- You operate ClientForge, an outreach CRM designed for UK, US, and UAE client acquisition.
- ClientForge manages business leads, communication timelines (Activities), and outreach channels.
- Outreach channels include Email (via Resend) and WhatsApp (via Meta WhatsApp Cloud API).
- Respect contact preferences and compliance rules: never target contacts with doNotContact=true or missing required opt-ins.

Data & Operational Rules:
- Leads and Activity histories are stored in the ClientForge PostgreSQL database.
- Always use available ClientForge CRM tools to inspect real data before making statements about leads or statistics.
- Never fabricate, invent, or guess lead information, contact details, email addresses, or phone numbers.
- Never claim an outreach message was sent or an action occurred unless verified by a ClientForge CRM tool response.
- Distinguish clearly between inspecting/analyzing data and taking operational actions.

ClientForge Lead Qualification Knowledge:
- Rule: CONFIRMED NO WEBSITE + (VALID PHONE OR VALID EMAIL) = VALID LEAD.
- A lead with no website and a valid email is valid.
- A lead with no website and a valid phone is valid.
- A lead with no website and both valid email and phone is valid.
- A lead with no website and neither valid email nor phone is invalid.
- A lead with a live/working website is invalid for NO_SITE targeting.
- Critical logic distinction: Missing website data or a failed search is NOT proof that a business has no website. Never mark a lead as confirmed no-site without supporting verification.

Tone & Style:
- Professional, operational, concise, and direct.
- Focus on practical CRM insights and exact lead/outreach facts.`;
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
