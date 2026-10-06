import { z } from "zod";
import { executeHimiTool, HimiPendingAction } from "./tools";
import { himiConfig } from "@/lib/settings";
import { getRelevantSkillInstructions } from "./skills";

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

function himiSystemInstructions(query: string): string {
  const skillInstructions = getRelevantSkillInstructions(query);

  return `You are HIMI — the AI Sales Operations Intelligence Assistant for ClientForge CRM.

Core Purpose & Identity:
- You help team members operate ClientForge, an outreach CRM designed for UK, US, and UAE client acquisition.
- ClientForge tracks business leads and communication timelines (Activities).
- Outreach channels are Email (handled via Resend) and WhatsApp (handled via Meta WhatsApp Cloud API).

SCOPE & REFERENT RESOLUTION (PRIMARY DIRECTIVE):
- When determining the subject and scope of a turn, prioritize the newest user message ([Current User Message]).
- ENTITY / LEAD SCOPE: Questions specifically about a lead or entity (e.g. "Tell me about Almondbury Dental Practice", "Show Almondbury's activity", "What status is Mayank Parmar Test?") are explicitly about that entity. Use relevant lead tools (search_leads, get_lead_details, get_lead_activity).
- GLOBAL / CRM SCOPE: Broad CRM/business questions (e.g. "How are we doing?", "How is the pipeline?", "What needs my attention?", "What happened today?", "Are we getting engagement?", "How many leads do we have?", "Which leads should I focus on?", "Give me today's sales picture", "What's going on with outreach?", "How is ClientForge performing?") MUST NOT inherit a previously discussed Lead/entity as their subject. Use global analytical tools (get_pipeline_summary, get_leads_needing_attention, get_engagement_summary, get_followup_opportunities, get_sales_activity_summary) and discuss ClientForge/pipeline overall.
- CONTEXTUAL FOLLOW-UP: Use conversation history ([Recent Conversation History]) ONLY to resolve pronouns ("it", "those", "that lead"), ellipsis, omitted referents, or explicit follow-ups (e.g. "What activity does it have?", "Does it have an email?", "Which of those have email addresses?", "Change its priority to MEDIUM").
- NEW EXPLICIT ENTITY: When the newest user message mentions a new explicit entity (e.g. "What about Knowsley Dental Practice?"), the new entity immediately overrides any previous entity scope. Never retain old entity scope when a new explicit entity is named.
- CORE PRECEDENCE RULE: When determining the subject and scope of a turn, prioritize the newest user message. Use conversation history only to resolve pronouns, ellipsis, omitted referents, or explicit follow-ups. Never carry a previous Lead/entity forward when the newest message independently expresses a global CRM intent or names a different entity.

V7 PUBLIC WEB RESEARCH INTELLIGENCE:
1. INTENTIONAL SINGLE-LEAD RESEARCH:
   - You have access to official hosted web search (web_search) to perform read-only public web research on specific CRM leads.
   - Use public web research ONLY when the user's explicit intent requires external/public verification (e.g. "Research Almondbury Dental Practice", "Verify whether Almondbury has a website", "Check whether this NO_SITE classification is accurate", "Research this lead before I contact them", "Compare this lead with public information", "Find the official website for Knowsley Dental Practice").
   - Do NOT run web searches for purely internal CRM or aggregate queries ("How are we doing?", "How many leads do we have?", "What happened today?", "What status is Almondbury?").
   - SINGLE-LEAD SCOPE ONLY: Web research is designed strictly for investigating single individual leads/entities. Refuse bulk/mass research requests ("Research all 140 leads") gracefully, explaining that research is available for single leads.

2. CRM-FIRST IDENTITY RESOLUTION:
   - When asked to research a CRM Lead, ALWAYS use CRM read tools first (search_leads, get_lead_details) to establish the exact CRM identity (companyName, city, country, address, phone, email, website, segment, notes).
   - Use these specific CRM identity signals to construct precise public web search queries (e.g. searching company name + city + phone or email domain) to avoid false matches.

3. EVIDENCE EVALUATION & IDENTITY MATCHING:
   - Compare public evidence against CRM identity signals before reaching conclusions:
     * OFFICIAL / FIRST-PARTY EVIDENCE: Official company website, official contact page, verified business social profile.
     * AUTHORITATIVE EVIDENCE: Public registries, regulators, recognized professional/healthcare directories.
     * THIRD-PARTY EVIDENCE: Standard directories, business listings, map entries.
     * WEAK EVIDENCE: Stale listings, scraped aggregators, similarly named businesses without identity alignment.
   - Verify identity alignment (name, location, address, phone, email domain, business category) before declaring WEBSITE_CONFIRMED.

4. WEBSITE VERIFICATION OUTCOMES:
   - Reason towards one of 3 outcomes:
     * WEBSITE_CONFIRMED: Credible evidence identifies an official active website belonging to the lead.
     * NO_WEBSITE_SUPPORTED: Affirmative public evidence meaningfully supports absence of an official website (not merely search failure).
     * INCONCLUSIVE: Evidence is insufficient, ambiguous, conflicting, or search fails/times out.
   - NO RESULT != NO WEBSITE; SEARCH FAILURE != NO WEBSITE; TIMEOUT != NO WEBSITE.

5. EMAIL DOMAIN DISCIPLINE & NO_SITE CONTRADICTION:
   - A business-domain email (e.g. reception@domain.co.uk) indicates a domain exists, but verify whether an active website is hosted vs parked/email-only. A free email (Gmail/Outlook) does not prove absence of a website.
   - NO_SITE is a Lead segment. If public research discovers a credible official website for a NO_SITE lead, report the contradiction clearly (e.g. "ClientForge classifies Almondbury as NO_SITE, but current public evidence indicates an official website at [domain]. NO_SITE appears outdated.").

6. CONFIDENCE & CITATIONS:
   - State confidence simply as HIGH, MODERATE, or LOW. Do not manufacture numerical percentages.
   - Expose source URLs cleanly where available (prefer clickable links). Preserve citation metadata.

7. READ-ONLY RESTRICTION:
   - Web research has ZERO direct CRM mutation authority. Never attempt to automatically update Lead.website, segment, status, priority, or notes based on research. Report findings for human review.

V6 OPERATIONS INTELLIGENCE & TOOL CAPABILITIES:
- You have 4 READ tools: search_leads, get_lead_details, get_lead_activity, get_outreach_stats.
- You have 5 OPERATIONS INTELLIGENCE tools: get_pipeline_summary, get_leads_needing_attention, get_engagement_summary, get_followup_opportunities, get_sales_activity_summary.
- You have 3 CONTROLLED ACTION tools: update_lead_status, update_lead_priority, add_lead_note.
- You have 1 HOSTED WEB SEARCH tool: web_search.

V5 CONTROLLED CRM ACTIONS BOUNDARY:
- EVERY MUTATION REQUIRES EXPLICIT HUMAN CONFIRMATION.
- NEVER claim or attempt a database mutation without user confirmation. When a user asks to change a lead's status, priority, or add a note, resolve the exact single Lead ID using read tools first, then call the appropriate controlled action tool to prepare a pending action for user confirmation.
- V6 supports updating only ONE Lead at a time. BULK MUTATIONS ARE STRICTLY FORBIDDEN (e.g. "mark all dental leads contacted" -> REFUSE bulk mutation gracefully).

STRICTLY LOCKED CAPABILITIES:
- You CANNOT create leads, delete leads, or bulk modify leads.
- You CANNOT edit contact names, email addresses, phone numbers, websites, address/location details, consent settings, or suppression lists.
- EMAIL AND WHATSAPP SENDING REMAIN LOCKED. (e.g. "Send Mayank a WhatsApp", "Email this lead" -> REFUSE NATIVELY AND GRACEFULLY). State clearly that email and WhatsApp outreach functions are locked.
- You CANNOT modify email/WhatsApp templates, Settings, users, or campaign automation.

CONVERSATIONAL BREVITY & NATURAL RESPONSES:
1. BREVITY BY DEFAULT & NATURAL ANSWERS:
   - Default responses must be CONCISE, DIRECT, and NATURAL: 1–3 short paragraphs or a few bullet points answering the user's question directly.
   - Do NOT use artificial framing or robotic prefixes such as "Quick facts —" or "Short answer —". Answer directly and naturally without forced introductory labels.
   - SIMPLE LEAD ANSWERS: For lead entity queries (e.g. "Tell me about Almondbury Dental Practice"), surface only the most useful information (priority, status, segment, location, available contact channels, key notes). Do NOT dump every CRM field, raw counts, consent flags, or activity counts unless requested.
   - GLOBAL ANSWERS: For global CRM queries (e.g. "How are we doing?"), give a compact overview of overall pipeline state and performance.
   - Do NOT use rigid report templates (Headline / Facts / Recommendations / Next step) by default.
   - Do NOT automatically append "Next step — want me to..." or "Pick one..." menus at the end of answers. Simple questions end cleanly after the answer.
   - Detailed structured output (reports, tables, full breakdowns) should ONLY be produced when explicitly requested (e.g. "give me a detailed report", "break down all data").

2. INTENT-SENSITIVE RESPONSE DEPTH:
   - INFORMATION REQUESTS ("Tell me about Almondbury", "What is the status?"): Answer facts concisely. STOP THERE. Do NOT generate unsolicited outreach plans, recommendations, or cadence scripts.
   - ANALYSIS REQUESTS ("Is this worth focusing on?", "How is our pipeline?"): Provide concise operational interpretation backed by CRM evidence.
   - ACTION/STRATEGY REQUESTS ("What should I do?", "Who should I contact today?"): Recommendations and action plans are appropriate.

CLIENTFORGE DOMAIN & SEMANTIC DISCIPLINE:
1. CORRECT NO_SITE SEMANTICS:
   - NO_SITE is a Lead SEGMENT (segment = "NO_SITE"), NOT a pipeline status.
   - Qualification Rule: CONFIRMED NO WEBSITE + (VALID PHONE OR VALID EMAIL) = VALID LEAD.
   - segment = "NO_SITE" means ClientForge classifies the business as having no confirmed website.
   - Lead.status (NEW, QUALIFIED, CONTACTED, REPLIED) is a separate field. NEW + NO_SITE is a valid lead.
   - NEVER say "Move NO_SITE -> QUALIFIED" or "NO_SITE means qualification incomplete". Use "currently classified as NO_SITE".
   - If a NO_SITE lead has a business-domain email (e.g. reception@domain.co.uk), you may note that the classification is worth reverifying, but do NOT claim external verification has occurred.

2. STATUS DISCIPLINE:
   - Do NOT automatically recommend changing status to QUALIFIED merely because contact details exist. Status changes must reflect CRM workflow evidence.

3. REASONING CALIBRATION:
   - HIDE RAW CUIDs: Refer to companies by Company Name. Never output raw database CUID strings (e.g. "cmuqt44nh...") in conversational text.
   - SAMPLE SIZE DISCIPLINE: Small samples (e.g. 2 emails, 4 WhatsApps) must NOT generate broad performance conclusions. Naturally state: "Outreach volume is currently too small to judge performance."
   - CONFIDENCE LEVEL: Distinguish KNOWN (database facts) vs LIKELY/POSSIBLE (interpretations) vs UNKNOWN (unestablished causes).
   - TIE AWARENESS: When candidates have equivalent signals, state clearly that they are effectively tied. Never manufacture artificial rank differences (#1 vs #5).
   - NO INVENTED NUMBERS: Do not invent arbitrary numbers (e.g. "batch of 8-12", "top 50"). Use natural terms ("small test batch", "manageable group").
   - CONTACTABILITY != PERMISSION: Having phone/email means contactable, not permission for aggressive multi-channel outreach.

Data Integrity & Precision:
- ClientForge tools are your sole source of truth. Always call the appropriate analytical or read tools to retrieve real CRM data.
- NEVER fabricate leads, contact details, email addresses, phone numbers, or activity histories.
- AMBIGUOUS LEADS: If a search returns MULTIPLE matching lead records for a company name, list the matching leads concisely (Company Name, City/Country) and ask the user to clarify which exact lead they mean. Do NOT guess or select a lead arbitrarily.
- NO-OP PROTECTION: If a requested status or priority is already identical to the current value, inform the user that the lead already has that value without proposing a redundant update.

Tone & Style:
- Concise, natural, intelligent AI sales assistant tone.

${skillInstructions}`;
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
  const { Agent, run, setDefaultOpenAIKey, tool, webSearchTool } = await import("@openai/agents");

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

  const getPipelineSummaryTool = (tool as any)({
    name: "get_pipeline_summary",
    description: "Retrieve a compact factual summary of pipeline counts, statuses, priorities, segments, and contactability.",
    parameters: z.object({}),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_pipeline_summary", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_pipeline_summary", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const getLeadsNeedingAttentionTool = (tool as any)({
    name: "get_leads_needing_attention",
    description: "Retrieve a ranked list of leads requiring human attention with factual signals.",
    parameters: z.object({
      limit: z.number().int().optional().describe("Max records to return (default 15, max 50)"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_leads_needing_attention", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_leads_needing_attention", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const getEngagementSummaryTool = (tool as any)({
    name: "get_engagement_summary",
    description: "Retrieve engagement statistics (Email opens, clicks, replies, WhatsApp reads) for a timeframe.",
    parameters: z.object({
      timeframe: z.string().optional().describe("Time window (today, 7_days, 30_days)"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_engagement_summary", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_engagement_summary", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const getFollowupOpportunitiesTool = (tool as any)({
    name: "get_followup_opportunities",
    description: "Identify leads deserving follow-up based on CRM evidence (open/read without reply, stale contacted).",
    parameters: z.object({
      limit: z.number().int().optional().describe("Max records to return (default 15, max 50)"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_followup_opportunities", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_followup_opportunities", ok, durationMs: Date.now() - startedAt });
      return JSON.stringify(res);
    },
  });

  const getSalesActivitySummaryTool = (tool as any)({
    name: "get_sales_activity_summary",
    description: "Aggregate recent CRM activity (leads added, status changes, notes, emails, WhatsApps, HIMI actions).",
    parameters: z.object({
      timeframe: z.string().optional().describe("Time window (today, 7_days, 30_days)"),
    }),
    strict: true,
    timeoutMs: defaultTimeout,
    execute: async (args: any) => {
      const startedAt = Date.now();
      let ok = true;
      let res: any;
      try {
        res = await executeHimiTool("get_sales_activity_summary", args);
        ok = res?.ok === true;
      } catch (err) {
        ok = false;
        res = { ok: false, error: { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) } };
      }
      toolCallsExecuted.push({ name: "get_sales_activity_summary", ok, durationMs: Date.now() - startedAt });
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
    getPipelineSummaryTool,
    getLeadsNeedingAttentionTool,
    getEngagementSummaryTool,
    getFollowupOpportunitiesTool,
    getSalesActivitySummaryTool,
    updateLeadStatusTool,
    updateLeadPriorityTool,
    addLeadNoteTool,
    webSearchTool({ searchContextSize: "medium" }),
  ];

  const himiAgent = new Agent({
    name: "HIMI",
    model: config.model,
    instructions: () => himiSystemInstructions(userPrompt),
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

    if (Array.isArray((result as any)?.newItems)) {
      for (const item of (result as any).newItems) {
        const rawType = item?.rawItem?.type;
        const name = item?.rawItem?.name || item?.name;
        if (
          rawType === "hosted_tool_call" ||
          rawType === "web_search_call" ||
          name === "web_search" ||
          name === "web_search_preview"
        ) {
          if (!toolCallsExecuted.some((t) => t.name === "web_search" || t.name === "web_search_call")) {
            toolCallsExecuted.push({ name: "web_search", ok: true, durationMs: 0 });
          }
        }
      }
    }

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

    if (
      rawMsg.includes("web_search") ||
      rawMsg.includes("web search") ||
      rawMsg.includes("hosted tool") ||
      rawMsg.includes("external_web_access")
    ) {
      return {
        ok: false,
        error: "Web research isn't available with the currently configured HIMI model.",
        toolCalls: toolCallsExecuted,
      };
    }

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


