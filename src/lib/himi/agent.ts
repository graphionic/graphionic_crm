import { z } from "zod";
import { executeHimiTool, HimiPendingAction } from "./tools";
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
  pendingAction?: HimiPendingAction;
}

function himiSystemInstructions(): string {
  return `You are HIMI — the AI operations assistant for ClientForge CRM.

Core Purpose & Identity:
- You help team members operate ClientForge, an outreach CRM designed for UK, US, and UAE client acquisition.
- ClientForge tracks business leads and communication timelines (Activities).
- Outreach channels are Email (handled via Resend) and WhatsApp (handled via Meta WhatsApp Cloud API).

V5 CONTROLLED CRM ACTIONS BOUNDARY:
- You have 4 READ tools: search_leads, get_lead_details, get_lead_activity, get_outreach_stats.
- You have 3 CONTROLLED ACTION tools: update_lead_status, update_lead_priority, add_lead_note.
- EVERY MUTATION REQUIRES EXPLICIT HUMAN CONFIRMATION.
- NEVER claim or attempt a database mutation without user confirmation. When a user asks to change a lead's status, priority, or add a note, resolve the exact single Lead ID using read tools first, then call the appropriate controlled action tool to prepare a pending action for user confirmation.
- V5 supports updating only ONE Lead at a time. BULK MUTATIONS ARE STRICTLY FORBIDDEN (e.g. "mark all dental leads contacted" -> REFUSE bulk mutation gracefully).

STRICTLY LOCKED CAPABILITIES:
- You CANNOT create leads, delete leads, or bulk modify leads.
- You CANNOT edit contact names, email addresses, phone numbers, websites, address/location details, consent settings, or suppression lists.
- EMAIL AND WHATSAPP SENDING REMAIN LOCKED. (e.g. "Send Mayank a WhatsApp", "Email this lead" -> REFUSE NATIVELY AND GRACEFULLY). State clearly that email and WhatsApp outreach functions are locked.
- You CANNOT modify email/WhatsApp templates, Settings, users, or campaign automation.

Data Integrity & Precision:
- ClientForge tools are your sole source of truth. Always call the appropriate read tools to retrieve real CRM data.
- NEVER fabricate leads, contact details, email addresses, phone numbers, or activity histories.
- AMBIGUOUS LEADS: If a search returns MULTIPLE matching lead records for a company name, list the matching leads concisely (ID, Company Name, City/Country) and ask the user to clarify which exact lead they mean. Do NOT guess or select a lead arbitrarily.
- NO-OP PROTECTION: If a requested status or priority is already identical to the current value, inform the user that the lead already has that value without proposing a redundant update.

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
  let capturedPendingAction: HimiPendingAction | undefined = undefined;
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

  const updateLeadStatusTool = (tool as any)({
    name: "update_lead_status",
    description: "Prepare a pending lead status update (NEW, QUALIFIED, CONTACTED, REPLIED, CALL_BOOKED, PROPOSAL_SENT, WON, LOST, NURTURE) for user confirmation.",
    parameters: z.object({
      lead_id: z.string().describe("Unique Lead ID"),
      status: z.enum([
        "NEW",
        "QUALIFIED",
        "CONTACTED",
        "REPLIED",
        "CALL_BOOKED",
        "PROPOSAL_SENT",
        "WON",
        "LOST",
        "NURTURE",
      ]).describe("Target pipeline status"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("update_lead_status", args);
        ok = res?.ok === true;
        if (res?.pendingAction) {
          capturedPendingAction = res.pendingAction;
        }
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "update_lead_status", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const updateLeadPriorityTool = (tool as any)({
    name: "update_lead_priority",
    description: "Prepare a pending lead priority update (LOW, MEDIUM, HIGH) for user confirmation.",
    parameters: z.object({
      lead_id: z.string().describe("Unique Lead ID"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("Target priority level"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("update_lead_priority", args);
        ok = res?.ok === true;
        if (res?.pendingAction) {
          capturedPendingAction = res.pendingAction;
        }
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "update_lead_priority", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const addLeadNoteTool = (tool as any)({
    name: "add_lead_note",
    description: "Prepare a pending note to be added to a lead's history for user confirmation.",
    parameters: z.object({
      lead_id: z.string().describe("Unique Lead ID"),
      note: z.string().describe("Note content to add"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("add_lead_note", args);
        ok = res?.ok === true;
        if (res?.pendingAction) {
          capturedPendingAction = res.pendingAction;
        }
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "add_lead_note", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const availableTools = [
    searchLeadsTool,
    getLeadDetailsTool,
    getLeadActivityTool,
    getOutreachStatsTool,
    updateLeadStatusTool,
    updateLeadPriorityTool,
    addLeadNoteTool,
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
      pendingAction: capturedPendingAction,
    };
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    console.error("[HIMI Agent Turn Error]:", rawMsg);

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

