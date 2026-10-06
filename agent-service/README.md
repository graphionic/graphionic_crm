# HIMI — ClientForge AI Agent

HIMI is the native AI agent and Streamable HTTP MCP bridge for **ClientForge CRM**.

## Overview & Architecture

- **Engine:** Built on Node.js (ES Modules) using `@openai/agents` SDK and `@modelcontextprotocol/sdk`.
- **Purpose:** Operates ClientForge CRM read-only queries, lead inspections, activity history analysis, and outreach stats summaries.
- **Protocol:** Provides an authenticated MCP Streamable HTTP endpoint at `/mcp` and a conversational endpoint at `/v1/chat`.
- **Persistence:** Connects to ClientForge PostgreSQL via Prisma Client (`@prisma/client`).

## Current Read-Only Limitation

HIMI v2 is **100% read-only**. It cannot modify database records, mutate lead statuses, or send outreach messages. Write operations (lead management, status updates, email/WhatsApp dispatching) will be added in deliberate future phases. If asked to perform write or outreach actions, HIMI natively refuses.

## Available MCP & Conversational Tools

| Tool Name | Description | Access |
| --- | --- | --- |
| `search_leads` | Search and filter ClientForge leads by company, category, location, status, segment, or priority. | Read-Only |
| `get_lead_details` | Retrieve complete details for a single lead using its ClientForge ID. | Read-Only |
| `get_lead_activity` | Retrieve chronological communication and activity history for a specific lead. | Read-Only |
| `get_outreach_stats` | Provide a compact summary of lead counts, status breakdowns, and activity statistics. | Read-Only |

## Conversational Endpoint (`POST /v1/chat`)

Send natural-language CRM questions to HIMI. HIMI autonomously selects the necessary read-only tools and formulates natural answers.

### Request Format

```json
{
  "sessionId": "optional-session-id",
  "message": "Show me high priority dental leads in London"
}
```

### Response Format

```json
{
  "ok": true,
  "agent": "HIMI",
  "response": "Here are the high-priority dental leads in London...",
  "toolCalls": [
    {
      "name": "search_leads",
      "ok": true,
      "durationMs": 35
    }
  ]
}
```

### Conversational Continuity (`sessionId`)

Pass a `sessionId` string to maintain in-memory conversation history across turns (e.g. asking follow-up questions like "Which of those have email addresses?").

## Installation & Setup

```powershell
# Install dependencies
npm.cmd install

# Run static checks
npm.cmd run check

# Run unit test suite
npm.cmd test
```

## Environment Variables

HIMI automatically inherits the root `.env` file in the ClientForge repository. For standalone local use, copy `.env.example` to `.env`:

- `OPENAI_API_KEY`: OpenAI API key.
- `OPENAI_MODEL`: Defaults to `gpt-5-mini`.
- `OPENAI_AGENT_SDK_PORT`: Defaults to `8787`.
- `DATABASE_URL`: PostgreSQL connection string.
- `MCP_ENABLED`: Set to `true` to enable the `/mcp` endpoint.
- `MCP_ACCESS_TOKEN`: Minimum 32-character secret key for Bearer authentication.
- `MCP_ALLOWED_ORIGINS`: Comma-separated list of allowed browser origins (optional).

## Health & Status Check

```http
GET http://127.0.0.1:8787/health
```

Example response:

```json
{
  "ok": true,
  "service": "clientforge-himi-agent",
  "agent": "HIMI",
  "brain": "node-openai-agents-sdk",
  "sdk": "@openai/agents",
  "model": "gpt-5-mini",
  "mcp": {
    "enabled": false,
    "endpoint": "/mcp"
  }
}
```
