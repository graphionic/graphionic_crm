import { z } from "zod";
import { executeHimiTool } from "./tools";
import { himiConfig } from "@/lib/settings";

export interface HimiHistoryMessage {
  sender: "user" | "assistant" | string;
  text: string;
}

export interface HimiChatPayload {
  message: string;
  history?: HimiHistoryMessage[];
}

export interface ToolCallExecution {
  name: string;
  ok: boolean;
  durationMs: number;
}

export interface HimiChatResponse {
  ok: boolean;
  agent?: string;
  response?: string;
  error?: string;
  toolCalls?: ToolCallExecution[];
}

function himiSystemInstructions(): string {
  return `You are HIMI — the AI operations assistant for ClientForge CRM.

Core Purpose & Identity:
- You help team members operate ClientForge, an outreach CRM designed for UK, US, and UAE client acquisition.
- ClientForge tracks business leads and communication timelines (Activities).
- Outreach channels are Email (handled via Resend) and WhatsApp (handled via Meta WhatsApp Cloud API).

STRICT READ-ONLY BOUNDARY:
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

export async function runHimiNativeTurn(payload: HimiChatPayload): Promise<HimiChatResponse> {
  const userPrompt = String(payload?.message || "").trim();
  if (!userPrompt) {
    return { ok: false, error: "message is required." };
  }

  const config = await himiConfig();
  if (!config.hasKey || !config.apiKey) {
    return {
      ok: false,
      error: "HIMI needs an OpenAI API key. Configure it in Settings.",
    };
  }

  // Dynamic import of @openai/agents at runtime
  const { Agent, run, setDefaultOpenAIKey, tool } = await import("@openai/agents");

  // Set the dynamic API key for this invocation
  setDefaultOpenAIKey(config.apiKey);

  const toolCallsExecuted: ToolCallExecution[] = [];
  const defaultTimeout = 45000;

  const searchLeadsTool = (tool as any)({
    name: "search_leads",
    description: "Search and filter existing ClientForge CRM leads by company name, category, city, country, status, segment, or priority.",
    parameters: z.object({
      query: z.string().optional().describe("Search term for company name, contact name, or email"),
      category: z.string().optional().describe("Business category (e.g. Dental Clinic, Plumber)"),
      city: z.string().optional().describe("City name"),
      country: z.string().optional().describe("Country code (e.g. UK, USA, UAE)"),
      status: z.string().optional().describe("Lead status (NEW, QUALIFIED, CONTACTED, REPLIED, CALL_BOOKED, PROPOSAL_SENT, WON, LOST, NURTURE)"),
      segment: z.string().optional().describe("Segment filter (NO_SITE, BROKEN, OUTDATED, OK, UNCHECKED)"),
      priority: z.string().optional().describe("Priority level (LOW, MEDIUM, HIGH)"),
      limit: z.number().int().optional().describe("Max records to return (default 20, max 100)"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("search_leads", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "search_leads", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const getLeadDetailsTool = (tool as any)({
    name: "get_lead_details",
    description: "Retrieve complete details for a single lead using its ClientForge ID.",
    parameters: z.object({
      lead_id: z.string().describe("Unique Lead ID"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_lead_details", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_lead_details", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const getLeadActivityTool = (tool as any)({
    name: "get_lead_activity",
    description: "Retrieve chronological communication and activity history for a specific lead.",
    parameters: z.object({
      lead_id: z.string().describe("Unique Lead ID"),
      limit: z.number().int().optional().describe("Max activities to return (default 20)"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_lead_activity", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_lead_activity", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const getOutreachStatsTool = (tool as any)({
    name: "get_outreach_stats",
    description: "Retrieve a compact read-only summary of lead counts, status breakdowns, and activity statistics.",
    parameters: z.object({}),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_outreach_stats", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_outreach_stats", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const availableTools = [
    searchLeadsTool,
    getLeadDetailsTool,
    getLeadActivityTool,
    getOutreachStatsTool,
  ];

  const himiAgent = new Agent({
    name: "HIMI",
    model: config.model,
    instructions: () => himiSystemInstructions(),
    tools: availableTools,
  });

  let promptText = userPrompt;
  if (Array.isArray(payload.history) && payload.history.length > 0) {
    const historyText = payload.history
      .slice(-10)
      .map((m) => `${m.sender === "user" ? "User" : "HIMI"}: ${m.text}`)
      .join("\n");
    promptText = `[Recent Conversation History]\n${historyText}\n\n[Current User Message]\n${userPrompt}`;
  }

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), defaultTimeout);

  try {
    const result = await run(himiAgent, promptText, {
      signal: timeoutController.signal,
      maxTurns: 10,
    } as any);

    const outputText =
      typeof result?.finalOutput === "string"
        ? result.finalOutput.trim()
        : JSON.stringify(result?.finalOutput || {});

    return {
      ok: true,
      agent: "HIMI",
      response: outputText,
      toolCalls: toolCallsExecuted,
    };
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    console.error("[HIMI Agent Turn Error]:", rawMsg);

    // Keep user-facing application level messages clean
    if (rawMsg.includes("OpenAI API key") || rawMsg.includes("message is required")) {
      return {
        ok: false,
        error: rawMsg,
        toolCalls: toolCallsExecuted,
      };
    }

    return {
      ok: false,
      error: "HIMI couldn't complete that request. Please try again.",
      toolCalls: toolCallsExecuted,
    };
  } finally {
    clearTimeout(timeout);
  }
}
