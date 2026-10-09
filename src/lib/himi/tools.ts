import { prisma } from "@/lib/prisma";
import { sendLeadEmail, sendLeadWhatsapp } from "@/lib/actions/send";
import { canSendFreeform } from "@/lib/whatsapp";
import { isSuppressed } from "@/lib/actions/leads";

function parseMetaSafe(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export const HIMI_TOOL_DEFINITIONS = [
  {
    name: "search_leads",
    description:
      "Search and filter existing ClientForge CRM leads by company name, category, city, country, status, segment, or priority.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term for company name, contact name, or email" },
        category: { type: "string", description: "Business category (e.g. Dental Clinic, Plumber)" },
        city: { type: "string", description: "City name" },
        country: { type: "string", description: "Country code (e.g. UK, USA, UAE)" },
        status: {
          type: "string",
          description:
            "Lead status (NEW, QUALIFIED, CONTACTED, REPLIED, CALL_BOOKED, PROPOSAL_SENT, WON, LOST, NURTURE)",
        },
        segment: {
          type: "string",
          description: "Segment filter (NO_SITE, BROKEN, OUTDATED, OK, UNCHECKED)",
        },
        priority: { type: "string", description: "Priority level (LOW, MEDIUM, HIGH)" },
        limit: { type: "integer", description: "Max records to return (default 20, max 100)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_lead_details",
    description: "Retrieve complete details for a single lead using its ClientForge ID.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Unique Lead ID" },
      },
      required: ["lead_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_lead_activity",
    description: "Retrieve chronological communication and activity history for a specific lead.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Unique Lead ID" },
        limit: { type: "integer", description: "Max activities to return (default 20)" },
      },
      required: ["lead_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_outreach_stats",
    description:
      "Retrieve a compact read-only summary of lead counts, status breakdowns, and activity statistics.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "update_lead_status",
    description: "Prepare a pending lead status update for user confirmation.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Unique Lead ID" },
        status: {
          type: "string",
          description: "Target status (NEW, QUALIFIED, CONTACTED, REPLIED, CALL_BOOKED, PROPOSAL_SENT, WON, LOST, NURTURE)",
        },
      },
      required: ["lead_id", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "update_lead_priority",
    description: "Prepare a pending lead priority update for user confirmation.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Unique Lead ID" },
        priority: { type: "string", description: "Target priority (LOW, MEDIUM, HIGH)" },
      },
      required: ["lead_id", "priority"],
      additionalProperties: false,
    },
  },
  {
    name: "add_lead_note",
    description: "Prepare a pending note to be added to a lead's history for user confirmation.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Unique Lead ID" },
        note: { type: "string", description: "Note text content to add" },
      },
      required: ["lead_id", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "get_pipeline_summary",
    description: "Retrieve a compact factual summary of pipeline counts, statuses, priorities, segments, and contactability.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_leads_needing_attention",
    description: "Retrieve a ranked list of active leads requiring human attention with factual signals, contactability, and channel eligibility.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max records to return (default 15, max 15)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_engagement_summary",
    description: "Retrieve engagement statistics (Email opens, clicks, replies, WhatsApp reads) for a timeframe.",
    input_schema: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          description: "Time window (today, 7_days, 30_days)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_followup_opportunities",
    description: "Identify previously contacted leads deserving follow-up based on CRM evidence (open/read without reply, stale contacted) with channel eligibility.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max records to return (default 15, max 15)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_sales_activity_summary",
    description: "Aggregate recent CRM activity (leads added, status changes, notes, emails, WhatsApps, HIMI actions).",
    input_schema: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          description: "Time window (today, 7_days, 30_days)",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_business_profile",
    description: "Retrieve complete configured internal business profile, pricing policy, and sales positioning guidance.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_business_services",
    description: "Retrieve enabled services, deliverables, technologies, ideal customer profiles, timeline guidance, and pricing rules.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term for service name, deliverables, technologies, or ICP" },
        category: { type: "string", description: "Category filter" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_business_portfolio",
    description: "Retrieve enabled portfolio case studies, project outcomes, client references, and proof.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term for project name, client, industry, or outcome" },
        industry: { type: "string", description: "Industry filter" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "prepare_send_email",
    description: "Prepare a pending email action for user confirmation when the user expresses explicit intent to send an email to a lead. DOES NOT SEND EMAIL.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Unique Lead ID" },
        subject: { type: "string", description: "Exact email subject line" },
        body: { type: "string", description: "Exact email body text" },
      },
      required: ["lead_id", "subject", "body"],
      additionalProperties: false,
    },
  },
  {
    name: "prepare_send_whatsapp",
    description: "Prepare a pending WhatsApp message action for user confirmation when the user expresses explicit intent to send a WhatsApp message to a lead. DOES NOT SEND WHATSAPP.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Unique Lead ID" },
        mode: { type: "string", description: "Send mode: 'text' (free-form inside 24h window) or 'template' (approved template)" },
        text: { type: "string", description: "Free-form text message content (required if mode is 'text')" },
        template_name: { type: "string", description: "Approved Meta template name (required if mode is 'template')" },
        language: { type: "string", description: "Template language code (e.g. 'en', default 'en')" },
        params: { type: "array", items: { type: "string" }, description: "Optional template parameters" },
      },
      required: ["lead_id"],
      additionalProperties: false,
    },
  },
];


export interface HimiPendingAction {
  action: "update_lead_status" | "update_lead_priority" | "add_lead_note" | "send_email" | "send_whatsapp";
  actionId?: string;
  leadId: string;
  companyName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  whatsappMode?: "text" | "template" | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateParams?: string[] | null;
  subject?: string | null;
  body?: string | null;
  currentValue?: string | null;
  newValue: string;
  arguments: Record<string, any>;
}

export async function executeHimiTool(name: string, args: Record<string, any> = {}) {
  switch (name) {
    case "get_business_profile": {
      try {
        const profile = await prisma.himiBusinessProfile.findUnique({
          where: { id: "default" },
        });

        if (!profile) {
          return {
            ok: true,
            configured: false,
            message: "No business profile is currently configured.",
          };
        }

        return {
          ok: true,
          configured: true,
          profile: {
            businessName: profile.businessName,
            description: profile.description,
            industry: profile.industry,
            website: profile.website,
            contactEmail: profile.contactEmail,
            contactPhone: profile.contactPhone,
            headquarters: profile.headquarters,
            targetMarkets: profile.targetMarkets,
            valueProposition: profile.valueProposition,
            positioning: profile.positioning,
            pricingPolicy: profile.pricingPolicy,
            salesGuidance: profile.salesGuidance,
          },
        };
      } catch (err) {
        console.error("Tool execution failed [get_business_profile]:", err);
        return { ok: false, error: "Failed to retrieve business profile." };
      }
    }

    case "get_business_services": {
      try {
        const queryTerm = String(args?.query || "").trim();
        const categoryFilter = String(args?.category || "").trim();

        const whereClause: any = { enabled: true };

        if (categoryFilter) {
          whereClause.category = { contains: categoryFilter, mode: "insensitive" };
        }

        if (queryTerm) {
          whereClause.OR = [
            { name: { contains: queryTerm, mode: "insensitive" } },
            { category: { contains: queryTerm, mode: "insensitive" } },
            { description: { contains: queryTerm, mode: "insensitive" } },
            { deliverables: { contains: queryTerm, mode: "insensitive" } },
            { technologies: { contains: queryTerm, mode: "insensitive" } },
            { idealCustomer: { contains: queryTerm, mode: "insensitive" } },
          ];
        }

        const services = await prisma.himiService.findMany({
          where: whereClause,
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
          take: 20,
        });

        return {
          ok: true,
          count: services.length,
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            description: s.description,
            deliverables: s.deliverables,
            technologies: s.technologies,
            idealCustomer: s.idealCustomer,
            pricingGuidance: s.pricingGuidance,
            timelineGuidance: s.timelineGuidance,
            salesNotes: s.salesNotes,
            priority: s.priority,
          })),
        };
      } catch (err) {
        console.error("Tool execution failed [get_business_services]:", err);
        return { ok: false, error: "Failed to retrieve business services." };
      }
    }

    case "get_business_portfolio": {
      try {
        const queryTerm = String(args?.query || "").trim();
        const industryFilter = String(args?.industry || "").trim();

        const whereClause: any = { enabled: true };

        if (industryFilter) {
          whereClause.industry = { contains: industryFilter, mode: "insensitive" };
        }

        if (queryTerm) {
          whereClause.OR = [
            { projectName: { contains: queryTerm, mode: "insensitive" } },
            { clientName: { contains: queryTerm, mode: "insensitive" } },
            { industry: { contains: queryTerm, mode: "insensitive" } },
            { description: { contains: queryTerm, mode: "insensitive" } },
            { servicesProvided: { contains: queryTerm, mode: "insensitive" } },
            { technologies: { contains: queryTerm, mode: "insensitive" } },
            { resultOutcome: { contains: queryTerm, mode: "insensitive" } },
          ];
        }

        const items = await prisma.himiPortfolioItem.findMany({
          where: whereClause,
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
          take: 20,
        });

        return {
          ok: true,
          count: items.length,
          portfolio: items.map((p) => ({
            id: p.id,
            projectName: p.projectName,
            clientName: p.clientName,
            industry: p.industry,
            description: p.description,
            servicesProvided: p.servicesProvided,
            technologies: p.technologies,
            resultOutcome: p.resultOutcome,
            projectUrl: p.projectUrl,
            priority: p.priority,
          })),
        };
      } catch (err) {
        console.error("Tool execution failed [get_business_portfolio]:", err);
        return { ok: false, error: "Failed to retrieve portfolio proof." };
      }
    }
    case "search_leads": {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
      const where: any = {};

      if (args.query) {
        where.OR = [
          { companyName: { contains: args.query, mode: "insensitive" } },
          { contactName: { contains: args.query, mode: "insensitive" } },
          { email: { contains: args.query, mode: "insensitive" } },
        ];
      }
      if (args.category) where.businessCategory = { contains: args.category, mode: "insensitive" };
      if (args.city) where.city = { contains: args.city, mode: "insensitive" };
      if (args.country) where.country = { equals: args.country, mode: "insensitive" };
      if (args.status) where.status = args.status;
      if (args.segment) where.segment = args.segment;
      if (args.priority) where.priority = args.priority;

      const leads = await prisma.lead.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          companyName: true,
          businessCategory: true,
          country: true,
          city: true,
          website: true,
          websiteStatus: true,
          segment: true,
          contactName: true,
          email: true,
          phone: true,
          whatsapp: true,
          status: true,
          priority: true,
          optedInEmail: true,
          optedInWhatsapp: true,
          doNotContact: true,
          emailSentCount: true,
          whatsappSentCount: true,
          lastEmailAt: true,
          lastWhatsappAt: true,
          nextFollowUpAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { ok: true, count: leads.length, data: leads };
    }

    case "get_lead_details": {
      if (!args.lead_id) {
        return { ok: false, error: { code: "MISSING_LEAD_ID", message: "lead_id is required." } };
      }
      const lead = await prisma.lead.findUnique({
        where: { id: args.lead_id },
        include: {
          activities: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!lead) {
        return { ok: false, error: { code: "LEAD_NOT_FOUND", message: `No lead found with ID ${args.lead_id}` } };
      }
      return { ok: true, data: lead };
    }

    case "get_lead_activity": {
      if (!args.lead_id) {
        return { ok: false, error: { code: "MISSING_LEAD_ID", message: "lead_id is required." } };
      }
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
      const activities = await prisma.activity.findMany({
        where: { leadId: args.lead_id },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return { ok: true, count: activities.length, leadId: args.lead_id, data: activities };
    }

    case "get_outreach_stats": {
      const [totalLeads, statusCounts, segmentCounts, totalActivities] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.lead.groupBy({
          by: ["segment"],
          _count: { _all: true },
        }),
        prisma.activity.count(),
      ]);

      const statusMap: Record<string, number> = {};
      for (const item of statusCounts) {
        statusMap[item.status || "UNKNOWN"] = item._count._all;
      }

      const segmentMap: Record<string, number> = {};
      for (const item of segmentCounts) {
        segmentMap[item.segment || "UNCHECKED"] = item._count._all;
      }

      return {
        ok: true,
        data: {
          totalLeads,
          totalActivities,
          statusBreakdown: statusMap,
          segmentBreakdown: segmentMap,
        },
      };
    }

    case "update_lead_status": {
      if (!args.lead_id || !args.status) {
        return { ok: false, error: { code: "INVALID_ARGS", message: "lead_id and status are required." } };
      }
      const targetStatus = String(args.status).toUpperCase();
      const lead = await prisma.lead.findUnique({
        where: { id: args.lead_id },
        select: { id: true, companyName: true, status: true },
      });
      if (!lead) {
        return { ok: false, error: { code: "LEAD_NOT_FOUND", message: `No lead found with ID ${args.lead_id}` } };
      }
      if (lead.status === targetStatus) {
        return {
          ok: true,
          isNoOp: true,
          companyName: lead.companyName,
          status: lead.status,
          message: `${lead.companyName} is already in ${lead.status} status. No update needed.`,
        };
      }
      return {
        ok: true,
        requiresConfirmation: true,
        pendingAction: {
          action: "update_lead_status",
          leadId: lead.id,
          companyName: lead.companyName,
          currentValue: lead.status,
          newValue: targetStatus,
          arguments: { status: targetStatus },
        },
        message: `Status change prepared for ${lead.companyName}: ${lead.status} → ${targetStatus}. Awaiting user confirmation.`,
      };
    }

    case "update_lead_priority": {
      if (!args.lead_id || !args.priority) {
        return { ok: false, error: { code: "INVALID_ARGS", message: "lead_id and priority are required." } };
      }
      const targetPriority = String(args.priority).toUpperCase();
      const lead = await prisma.lead.findUnique({
        where: { id: args.lead_id },
        select: { id: true, companyName: true, priority: true },
      });
      if (!lead) {
        return { ok: false, error: { code: "LEAD_NOT_FOUND", message: `No lead found with ID ${args.lead_id}` } };
      }
      if (lead.priority === targetPriority) {
        return {
          ok: true,
          isNoOp: true,
          companyName: lead.companyName,
          priority: lead.priority,
          message: `${lead.companyName} priority is already set to ${lead.priority}. No update needed.`,
        };
      }
      return {
        ok: true,
        requiresConfirmation: true,
        pendingAction: {
          action: "update_lead_priority",
          leadId: lead.id,
          companyName: lead.companyName,
          currentValue: lead.priority,
          newValue: targetPriority,
          arguments: { priority: targetPriority },
        },
        message: `Priority change prepared for ${lead.companyName}: ${lead.priority} → ${targetPriority}. Awaiting user confirmation.`,
      };
    }

    case "add_lead_note": {
      if (!args.lead_id || !args.note || !String(args.note).trim()) {
        return { ok: false, error: { code: "INVALID_ARGS", message: "lead_id and non-empty note are required." } };
      }
      const lead = await prisma.lead.findUnique({
        where: { id: args.lead_id },
        select: { id: true, companyName: true },
      });
      if (!lead) {
        return { ok: false, error: { code: "LEAD_NOT_FOUND", message: `No lead found with ID ${args.lead_id}` } };
      }
      const noteText = String(args.note).trim();
      return {
        ok: true,
        requiresConfirmation: true,
        pendingAction: {
          action: "add_lead_note",
          leadId: lead.id,
          companyName: lead.companyName,
          currentValue: null,
          newValue: noteText,
          arguments: { note: noteText },
        },
        message: `Note addition prepared for ${lead.companyName}. Awaiting user confirmation.`,
      };
    }

    case "prepare_send_email": {
      if (!args.lead_id || !args.subject || !args.body || !String(args.subject).trim() || !String(args.body).trim()) {
        return { ok: false, error: { code: "INVALID_ARGS", message: "lead_id, subject, and body are required." } };
      }
      const lead = await prisma.lead.findUnique({
        where: { id: args.lead_id },
        select: { id: true, companyName: true, email: true },
      });
      if (!lead) {
        return { ok: false, error: { code: "LEAD_NOT_FOUND", message: `No lead found with ID ${args.lead_id}` } };
      }
      if (!lead.email) {
        return { ok: false, error: { code: "NO_EMAIL", message: `${lead.companyName} does not have an email address recorded.` } };
      }
      const subjectText = String(args.subject).trim();
      const bodyText = String(args.body).trim();
      const actionId = `act_${crypto.randomUUID()}`;

      return {
        ok: true,
        requiresConfirmation: true,
        pendingAction: {
          action: "send_email",
          actionId,
          leadId: lead.id,
          companyName: lead.companyName,
          recipientEmail: lead.email,
          subject: subjectText,
          body: bodyText,
          currentValue: null,
          newValue: `To: ${lead.email} | Subject: ${subjectText}`,
          arguments: {
            lead_id: lead.id,
            recipient_email: lead.email,
            subject: subjectText,
            body: bodyText,
          },
        },
        message: `Email send prepared for ${lead.companyName} (${lead.email}). Awaiting user confirmation.`,
      };
    }

    case "prepare_send_whatsapp": {
      if (!args.lead_id) {
        return { ok: false, error: { code: "INVALID_ARGS", message: "lead_id is required." } };
      }

      // Infer mode if omitted: if template_name is provided, default to template, otherwise default to text
      let mode: "text" | "template" =
        args.mode === "text" || args.mode === "template"
          ? args.mode
          : args.template_name
          ? "template"
          : "text";

      const lead = await prisma.lead.findUnique({
        where: { id: args.lead_id },
      });
      if (!lead) {
        return { ok: false, error: { code: "LEAD_NOT_FOUND", message: `No lead found with ID ${args.lead_id}` } };
      }

      const to = lead.whatsapp || lead.phone;
      if (!to) {
        return { ok: false, error: { code: "NO_WHATSAPP_PHONE", message: `${lead.companyName} does not have a WhatsApp or phone number recorded.` } };
      }

      if (lead.doNotContact) {
        return { ok: false, error: { code: "DO_NOT_CONTACT", message: `${lead.companyName} is marked do-not-contact.` } };
      }

      if (!lead.optedInWhatsapp) {
        return { ok: false, error: { code: "NO_OPT_IN", message: `This lead isn't eligible for WhatsApp because no WhatsApp opt-in is recorded.` } };
      }

      const sup = await isSuppressed(lead);
      if (sup) {
        return { ok: false, error: { code: "SUPPRESSED", message: `Blocked: ${to} is on the suppression list.` } };
      }

      if (mode === "text") {
        const win = await canSendFreeform(lead.lastInboundAt);
        if (!win.allowed) {
          if (args.template_name) {
            mode = "template";
          } else {
            return {
              ok: false,
              error: {
                code: "WINDOW_CLOSED",
                message: `${win.reason} The free-form WhatsApp message can't be sent because the 24-hour customer-service window is closed. An approved Meta template (e.g. 'dental_website_intro') is required.`,
              },
            };
          }
        }
      }

      if (mode === "text" && (!args.text || !String(args.text).trim())) {
        return { ok: false, error: { code: "INVALID_ARGS", message: "text content is required when mode is 'text'." } };
      }

      let templateName = args.template_name || (mode === "template" ? "dental_website_intro" : null);
      if (mode === "template" && !templateName) {
        return { ok: false, error: { code: "INVALID_ARGS", message: "template_name is required when mode is 'template'." } };
      }

      let resolvedParams = Array.isArray(args.params) ? args.params.map(String) : [];
      if (mode === "template" && resolvedParams.length === 0) {
        if (templateName === "dental_website_intro") {
          resolvedParams = [lead.companyName || "", lead.city || ""];
        }
      }

      const textBody = args.text ? String(args.text).trim() : null;
      const actionId = `act_${crypto.randomUUID()}`;

      return {
        ok: true,
        requiresConfirmation: true,
        pendingAction: {
          action: "send_whatsapp",
          actionId,
          leadId: lead.id,
          companyName: lead.companyName,
          recipientPhone: to,
          whatsappMode: mode,
          templateName: templateName,
          templateLanguage: args.language || "en",
          templateParams: resolvedParams,
          body: textBody,
          currentValue: null,
          newValue: mode === "text"
            ? `To: ${to} | Text: "${(textBody || "").slice(0, 40)}..."`
            : `To: ${to} | Template: ${templateName}`,
          arguments: {
            lead_id: lead.id,
            mode,
            text: textBody,
            template_name: templateName,
            language: args.language || "en",
            params: resolvedParams,
            recipient_phone: to,
          },
        },
        message: `WhatsApp message prepared for ${lead.companyName} (${to}). Awaiting user confirmation.`,
      };
    }

    case "get_pipeline_summary": {
      const [
        totalLeads,
        statusCounts,
        priorityCounts,
        segmentCounts,
        emailOnlyCount,
        phoneOnlyCount,
        bothCount,
        neitherCount,
        doNotContactCount,
        untouchedNewCount,
      ] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.lead.groupBy({ by: ["priority"], _count: { _all: true } }),
        prisma.lead.groupBy({ by: ["segment"], _count: { _all: true } }),
        prisma.lead.count({ where: { email: { not: null }, phone: null, whatsapp: null } }),
        prisma.lead.count({ where: { email: null, OR: [{ phone: { not: null } }, { whatsapp: { not: null } }] } }),
        prisma.lead.count({ where: { email: { not: null }, OR: [{ phone: { not: null } }, { whatsapp: { not: null } }] } }),
        prisma.lead.count({ where: { email: null, phone: null, whatsapp: null } }),
        prisma.lead.count({ where: { doNotContact: true } }),
        prisma.lead.count({ where: { status: { in: ["NEW", "QUALIFIED"] }, emailSentCount: 0, whatsappSentCount: 0 } }),
      ]);

      const statusBreakdown: Record<string, number> = {};
      for (const item of statusCounts) {
        statusBreakdown[item.status || "UNKNOWN"] = item._count._all;
      }

      const priorityBreakdown: Record<string, number> = {};
      for (const item of priorityCounts) {
        priorityBreakdown[item.priority || "UNKNOWN"] = item._count._all;
      }

      const segmentBreakdown: Record<string, number> = {};
      for (const item of segmentCounts) {
        segmentBreakdown[item.segment || "UNCHECKED"] = item._count._all;
      }

      return {
        ok: true,
        data: {
          totalLeads,
          statusBreakdown,
          priorityBreakdown,
          segmentBreakdown,
          contactability: {
            emailOnly: emailOnlyCount,
            phoneOnly: phoneOnlyCount,
            both: bothCount,
            neither: neitherCount,
          },
          pipelineFunnel: {
            untouchedNew: untouchedNewCount,
            contacted: statusBreakdown["CONTACTED"] || 0,
            replied: statusBreakdown["REPLIED"] || 0,
            callBooked: statusBreakdown["CALL_BOOKED"] || 0,
            proposalSent: statusBreakdown["PROPOSAL_SENT"] || 0,
            won: statusBreakdown["WON"] || 0,
            lost: statusBreakdown["LOST"] || 0,
            nurture: statusBreakdown["NURTURE"] || 0,
            doNotContact: doNotContactCount,
          },
        },
      };
    }

    case "get_leads_needing_attention": {
      const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 15);

      const leads = await prisma.lead.findMany({
        where: {
          doNotContact: false,
          status: { notIn: ["WON", "LOST"] },
        },
        take: 100,
        orderBy: { updatedAt: "desc" },
        include: {
          activities: {
            take: 3,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      const items = leads.map((lead) => {
        const signals: string[] = [];
        let scoreWeight = 0;

        if (lead.status === "REPLIED" || lead.lastReplyAt) {
          signals.push("Reply received (needs response)");
          scoreWeight += 50;
        }

        const failedAct = lead.activities.find((a) => a.status === "failed" || (a.error && a.error.length > 0));
        if (failedAct) {
          signals.push(`Outreach delivery failed (${failedAct.type})`);
          scoreWeight += 45;
        }

        if (lead.status === "PROPOSAL_SENT") {
          signals.push("Proposal sent (pending follow-up)");
          scoreWeight += 35;
        }

        if (lead.status === "CALL_BOOKED") {
          signals.push("Call booked (requires preparation/action)");
          scoreWeight += 30;
        }

        const daysSinceLastActivity = lead.activities[0]
          ? Math.floor((Date.now() - new Date(lead.activities[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        if (lead.status === "CONTACTED" && daysSinceLastActivity >= 5) {
          signals.push(`Stale contacted lead (${daysSinceLastActivity} days without progress)`);
          scoreWeight += 25;
        }

        if ((lead.status === "NEW" || lead.status === "QUALIFIED") && lead.emailSentCount === 0 && lead.whatsappSentCount === 0) {
          signals.push("Untouched prospect (no outreach recorded)");
          scoreWeight += lead.priority === "HIGH" ? 20 : 15;
        } else if (lead.priority === "HIGH") {
          signals.push("HIGH priority lead");
          scoreWeight += 10;
        }

        const hasEmail = Boolean(lead.email && lead.email.trim());
        const hasPhone = Boolean(lead.phone || lead.whatsapp);
        const contactability = hasEmail && hasPhone ? "both" : hasEmail ? "email_only" : hasPhone ? "phone_only" : "none";

        const emailEligible = Boolean(hasEmail && lead.optedInEmail && !lead.doNotContact);
        const whatsappEligible = Boolean(hasPhone && lead.optedInWhatsapp && !lead.doNotContact);

        return {
          leadId: lead.id,
          companyName: lead.companyName,
          status: lead.status,
          priority: lead.priority,
          score: lead.score,
          segment: lead.segment || "UNCHECKED",
          city: lead.city || null,
          country: lead.country || "UK",
          businessCategory: lead.businessCategory || null,
          contactability,
          emailEligible,
          whatsappEligible,
          optedInEmail: lead.optedInEmail,
          optedInWhatsapp: lead.optedInWhatsapp,
          doNotContact: lead.doNotContact,
          hookLine: lead.hookLine || null,
          issues: lead.issues ? lead.issues.split(";").map((s) => s.trim()).filter(Boolean).slice(0, 3) : [],
          attentionReasons: signals,
          scoreWeight,
          daysSinceLastActivity,
          lastActivityAt: lead.activities[0]?.createdAt || lead.updatedAt,
          lastEmailAt: lead.lastEmailAt || null,
          lastWhatsappAt: lead.lastWhatsappAt || null,
          lastReplyAt: lead.lastReplyAt || null,
        };
      });

      const ranked = items
        .filter((item) => item.attentionReasons.length > 0)
        .sort((a, b) => b.scoreWeight - a.scoreWeight)
        .slice(0, limit);

      return {
        ok: true,
        count: ranked.length,
        data: ranked.map(({ scoreWeight, ...rest }) => rest),
      };
    }

    case "get_engagement_summary": {
      const timeframe = String(args.timeframe || "7_days").toLowerCase();
      const now = new Date();
      let startDate = new Date();

      if (timeframe === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === "30_days") {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate.setDate(now.getDate() - 7);
      }

      const activities = await prisma.activity.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          type: true,
          direction: true,
          status: true,
          meta: true,
          error: true,
        },
      });

      let emailSent = 0;
      let emailDelivered = 0;
      let emailOpened = 0;
      let emailClicked = 0;
      let emailBounced = 0;
      let emailComplained = 0;
      let emailFailed = 0;

      let waSent = 0;
      let waDelivered = 0;
      let waRead = 0;
      let waFailed = 0;

      let inboundEmailReplies = 0;
      let inboundWhatsappReplies = 0;
      let totalInboundReplies = 0;

      for (const act of activities) {
        const meta = parseMetaSafe(act.meta);

        if (act.direction === "IN") {
          totalInboundReplies++;
          if (act.type === "EMAIL") inboundEmailReplies++;
          if (act.type === "WHATSAPP") inboundWhatsappReplies++;
        }

        if (act.type === "EMAIL" && act.direction === "OUT") {
          emailSent++;
          if (act.status === "delivered" || meta.deliveredAt || meta.opened || meta.clicked) {
            emailDelivered++;
          }
          if (act.status === "failed" || act.error) {
            emailFailed++;
          }
          if (act.status === "bounced" || meta.bouncedAt) {
            emailBounced++;
          }
          if (act.status === "complained" || meta.complainedAt) {
            emailComplained++;
          }
          if (meta.opened === true || (meta.openCount && meta.openCount > 0)) {
            emailOpened++;
          }
          if (meta.clicked === true || (meta.clickCount && meta.clickCount > 0)) {
            emailClicked++;
          }
        }

        if (act.type === "WHATSAPP" && act.direction === "OUT") {
          waSent++;
          if (act.status === "delivered" || act.status === "read") {
            waDelivered++;
          }
          if (act.status === "read") {
            waRead++;
          }
          if (act.status === "failed" || act.error) {
            waFailed++;
          }
        }
      }

      const emailDeliveryRate = emailSent > 0 ? Number(((emailDelivered / emailSent) * 100).toFixed(1)) : null;
      const emailOpenRate = emailDelivered > 0 ? Number(((emailOpened / emailDelivered) * 100).toFixed(1)) : null;
      const emailClickRate = emailDelivered > 0 ? Number(((emailClicked / emailDelivered) * 100).toFixed(1)) : null;
      const emailBounceRate = emailSent > 0 ? Number(((emailBounced / emailSent) * 100).toFixed(1)) : null;
      const emailReplyRate = emailDelivered > 0 ? Number(((inboundEmailReplies / emailDelivered) * 100).toFixed(1)) : null;

      const waDeliveryRate = waSent > 0 ? Number(((waDelivered / waSent) * 100).toFixed(1)) : null;
      const waReadRate = waDelivered > 0 ? Number(((waRead / waDelivered) * 100).toFixed(1)) : null;
      const waReplyRate = waDelivered > 0 ? Number(((inboundWhatsappReplies / waDelivered) * 100).toFixed(1)) : null;

      const totalOutreachSent = emailSent + waSent;
      const sampleSizeContext = totalOutreachSent < 20
        ? `Low volume (${totalOutreachSent} total sends): early signals only. Sample size is too small for statistical conversion conclusions.`
        : `Sufficient volume (${totalOutreachSent} total sends) for operational trend analysis.`;

      return {
        ok: true,
        timeframe,
        startDate: startDate.toISOString(),
        data: {
          email: {
            sent: emailSent,
            delivered: emailDelivered,
            opened: emailOpened,
            clicked: emailClicked,
            bounced: emailBounced,
            complained: emailComplained,
            failed: emailFailed,
            inboundReplies: inboundEmailReplies,
            rates: {
              deliveryRatePercent: emailDeliveryRate,
              openRatePercent: emailOpenRate,
              clickRatePercent: emailClickRate,
              bounceRatePercent: emailBounceRate,
              replyRatePercent: emailReplyRate,
            },
          },
          whatsapp: {
            sent: waSent,
            delivered: waDelivered,
            read: waRead,
            failed: waFailed,
            inboundReplies: inboundWhatsappReplies,
            rates: {
              deliveryRatePercent: waDeliveryRate,
              readRatePercent: waReadRate,
              replyRatePercent: waReplyRate,
            },
          },
          inboundReplies: totalInboundReplies,
          totalOutreachSent,
          sampleSizeContext,
          totalActivitiesInWindow: activities.length,
        },
      };
    }

    case "get_followup_opportunities": {
      const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 15);

      const leads = await prisma.lead.findMany({
        where: {
          doNotContact: false,
          status: { notIn: ["WON", "LOST"] },
          OR: [
            { status: "CONTACTED" },
            { status: "PROPOSAL_SENT" },
            { status: "CALL_BOOKED" },
            { emailSentCount: { gt: 0 } },
            { whatsappSentCount: { gt: 0 } },
          ],
        },
        take: 100,
        orderBy: { updatedAt: "desc" },
        include: {
          activities: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      const opportunities = leads.map((lead) => {
        const lastAct = lead.activities[0];
        const lastOutbound = lead.activities.find((a) => a.direction === "OUT");
        const daysSinceActivity = lastAct
          ? Math.floor((Date.now() - new Date(lastAct.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

        const signals: string[] = [];
        if (lead.status === "PROPOSAL_SENT") {
          signals.push("Proposal sent (awaiting follow-up)");
        }
        if (lead.status === "CALL_BOOKED") {
          signals.push("Call booked (follow-up/prep required)");
        }
        if (lastOutbound && lastOutbound.status === "delivered" && lead.status === "CONTACTED") {
          signals.push("Outreach delivered but no reply yet");
        }
        if (lastOutbound && lastOutbound.status === "read") {
          signals.push("WhatsApp message read but no reply yet");
        }
        const outboundMeta = parseMetaSafe(lastOutbound?.meta);
        if (outboundMeta.opened === true || (outboundMeta.openCount && outboundMeta.openCount > 0)) {
          signals.push("Email opened previously (positive engagement signal)");
        }
        if (daysSinceActivity >= 4) {
          signals.push(`No activity in ${daysSinceActivity} days`);
        }

        const hasEmail = Boolean(lead.email && lead.email.trim());
        const hasPhone = Boolean(lead.phone || lead.whatsapp);
        const emailEligible = Boolean(hasEmail && lead.optedInEmail && !lead.doNotContact);
        const whatsappEligible = Boolean(hasPhone && lead.optedInWhatsapp && !lead.doNotContact);
        const lastOutreachChannel = lastOutbound?.type?.toLowerCase() || (lead.lastWhatsappAt ? "whatsapp" : lead.lastEmailAt ? "email" : "unknown");

        return {
          leadId: lead.id,
          companyName: lead.companyName,
          status: lead.status,
          priority: lead.priority,
          segment: lead.segment || "UNCHECKED",
          city: lead.city || null,
          country: lead.country || "UK",
          businessCategory: lead.businessCategory || null,
          emailEligible,
          whatsappEligible,
          optedInEmail: lead.optedInEmail,
          optedInWhatsapp: lead.optedInWhatsapp,
          doNotContact: lead.doNotContact,
          lastOutreachChannel,
          lastOutreachDate: lead.lastEmailAt || lead.lastWhatsappAt || lastOutbound?.createdAt || null,
          lastInboundAt: lead.lastInboundAt || null,
          lastReplyDate: lead.lastReplyAt || null,
          daysSinceActivity,
          followupReasons: signals,
        };
      });

      const filtered = opportunities
        .filter((o) => o.followupReasons.length > 0)
        .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
        .slice(0, limit);

      return {
        ok: true,
        count: filtered.length,
        data: filtered,
      };
    }

    case "get_sales_activity_summary": {
      const timeframe = String(args.timeframe || "today").toLowerCase();
      const now = new Date();
      let startDate = new Date();

      if (timeframe === "30_days") {
        startDate.setDate(now.getDate() - 30);
      } else if (timeframe === "7_days") {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setHours(0, 0, 0, 0);
      }

      const [leadsCreatedCount, activities] = await Promise.all([
        prisma.lead.count({
          where: { createdAt: { gte: startDate } },
        }),
        prisma.activity.findMany({
          where: { createdAt: { gte: startDate } },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            lead: {
              select: { companyName: true },
            },
          },
        }),
      ]);

      let statusChanges = 0;
      let priorityChanges = 0;
      let notesAdded = 0;
      let emailsSent = 0;
      let whatsappsSent = 0;
      let repliesReceived = 0;
      let himiActionsCount = 0;

      for (const act of activities) {
        if (act.meta && act.meta.includes('"source":"HIMI"')) {
          himiActionsCount++;
        }
        if (act.direction === "IN") {
          repliesReceived++;
        }
        if (act.type === "STATUS") {
          if (act.body?.startsWith("Status:")) statusChanges++;
          if (act.body?.startsWith("Priority:")) priorityChanges++;
        }
        if (act.type === "NOTE") notesAdded++;
        if (act.type === "EMAIL" && act.direction === "OUT") emailsSent++;
        if (act.type === "WHATSAPP" && act.direction === "OUT") whatsappsSent++;
      }

      const recentKeyEvents = activities.slice(0, 10).map((a) => ({
        id: a.id,
        companyName: a.lead?.companyName || "Unknown Lead",
        type: a.type,
        direction: a.direction,
        body: a.body,
        createdAt: a.createdAt,
      }));

      return {
        ok: true,
        timeframe,
        startDate: startDate.toISOString(),
        data: {
          summary: {
            leadsCreated: leadsCreatedCount,
            statusChanges,
            priorityChanges,
            notesAdded,
            emailsSent,
            whatsappsSent,
            repliesReceived,
            himiActionsCount,
            totalActivities: activities.length,
          },
          recentKeyEvents,
        },
      };
    }

    default:
      return { ok: false, error: { code: "UNKNOWN_TOOL", message: `Unknown tool ${name}` } };
  }
}


export async function executeConfirmedHimiAction(
  pendingAction: HimiPendingAction,
  actorEmail?: string
) {
  const ALLOWED_ACTIONS = ["update_lead_status", "update_lead_priority", "add_lead_note", "send_email", "send_whatsapp"];
  if (!pendingAction || !ALLOWED_ACTIONS.includes(pendingAction.action)) {
    return { ok: false, error: "Invalid or unallowed action type." };
  }

  const { action, leadId, arguments: args } = pendingAction;
  if (!leadId) {
    return { ok: false, error: "Missing lead ID." };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return { ok: false, error: `Lead not found (ID: ${leadId}).` };
  }

  const actor = actorEmail || "HIMI Admin";

  switch (action) {
    case "send_whatsapp": {
      const mode = (args?.mode || pendingAction.whatsappMode || "text") as "text" | "template";
      const text = args?.text || pendingAction.body || undefined;
      const templateName = args?.template_name || pendingAction.templateName || undefined;
      const language = args?.language || pendingAction.templateLanguage || "en";
      const params = (args?.params || pendingAction.templateParams || []) as string[];
      const actionId = pendingAction.actionId;
      const expectedRecipient = pendingAction.recipientPhone || args?.recipient_phone;

      if (!actionId) {
        return { ok: false, error: "Missing action ID for WhatsApp send execution." };
      }

      const currentTo = lead.whatsapp || lead.phone;
      if (!currentTo) {
        return { ok: false, error: `${lead.companyName} does not have a WhatsApp or phone number recorded.` };
      }

      if (expectedRecipient && currentTo !== expectedRecipient) {
        return {
          ok: false,
          error: "The lead's WhatsApp destination changed after this action was prepared. Please prepare the message again.",
        };
      }

      if (lead.doNotContact) {
        return { ok: false, error: "This lead is marked do-not-contact." };
      }

      if (!lead.optedInWhatsapp) {
        return { ok: false, error: "No WhatsApp opt-in recorded for this contact." };
      }

      const sup = await isSuppressed(lead);
      if (sup) {
        return { ok: false, error: "Blocked: number is on the suppression list." };
      }

      if (mode === "text") {
        const win = await canSendFreeform(lead.lastInboundAt);
        if (!win.allowed) {
          return { ok: false, error: `${win.reason} Switch to an approved template.` };
        }
      }

      // ---------------------------------------------------------------- ATOMIC CLAIM
      try {
        await prisma.himiActionClaim.create({
          data: { actionId },
        });
      } catch (err: any) {
        if (err?.code === "P2002" || String(err?.message || "").includes("HimiActionClaim_actionId_key")) {
          return { ok: false, error: "This WhatsApp action has already been processed. No additional message was sent." };
        }
        console.error("[HIMI Action Claim Error]:", err);
        return { ok: false, error: "Failed to claim action execution." };
      }

      // ---------------------------------------------------------------- CANONICAL SENDER
      const sendRes = await sendLeadWhatsapp(leadId, {
        mode,
        text,
        templateName,
        language,
        params,
        actionId,
      });

      if (!sendRes.ok) {
        return { ok: false, error: sendRes.error || "Failed to send WhatsApp message." };
      }

      return {
        ok: true,
        response: `WhatsApp message submitted to Meta for delivery to **${lead.companyName}** (${currentTo}).`,
        executedAction: {
          action: "send_whatsapp",
          companyName: lead.companyName,
          newValue: `To: ${currentTo} | ${mode === "template" ? `Template: ${templateName}` : "Free-form message"}`,
        },
      };
    }
    case "send_email": {
      const subject = String(args?.subject || "").trim();
      const body = String(args?.body || "").trim();
      const actionId = pendingAction.actionId;
      const expectedRecipient = pendingAction.recipientEmail || args?.recipient_email;

      if (!actionId) {
        return { ok: false, error: "Missing action ID for email send execution." };
      }

      if (!subject || !body) {
        return { ok: false, error: "Email subject and body are required." };
      }

      if (!lead.email) {
        return { ok: false, error: `${lead.companyName} does not have an email address recorded.` };
      }

      if (expectedRecipient && lead.email !== expectedRecipient) {
        return {
          ok: false,
          error: "The lead's email address changed after this action was prepared. Please prepare the email again.",
        };
      }

      if (lead.doNotContact) {
        return { ok: false, error: "This lead is marked do-not-contact." };
      }

      if (!lead.optedInEmail) {
        return { ok: false, error: "No email opt-in recorded for this contact." };
      }

      // ---------------------------------------------------------------- ATOMIC CLAIM
      // Postgres UNIQUE constraint on HimiActionClaim.actionId is the concurrency authority.
      // If two requests arrive concurrently with the same actionId, exactly ONE succeeds.
      try {
        await prisma.himiActionClaim.create({
          data: { actionId },
        });
      } catch (err: any) {
        if (err?.code === "P2002" || String(err?.message || "").includes("HimiActionClaim_actionId_key")) {
          return { ok: false, error: "This email action has already been processed. No additional email was sent." };
        }
        console.error("[HIMI Action Claim Error]:", err);
        return { ok: false, error: "Failed to claim action execution." };
      }

      // ---------------------------------------------------------------- CANONICAL SENDER
      const sendRes = await sendLeadEmail(leadId, subject, body, { actionId });
      if (!sendRes.ok) {
        return { ok: false, error: sendRes.error || "Failed to send email." };
      }

      return {
        ok: true,
        response: `Email sent to **${lead.companyName}** (${lead.email}).`,
        executedAction: {
          action: "send_email",
          companyName: lead.companyName,
          newValue: `To: ${lead.email} | Subject: ${subject}`,
        },
      };
    }
    case "update_lead_status": {
      const VALID_STATUSES = [
        "NEW",
        "QUALIFIED",
        "CONTACTED",
        "REPLIED",
        "CALL_BOOKED",
        "PROPOSAL_SENT",
        "WON",
        "LOST",
        "NURTURE",
      ];
      const targetStatus = String(args?.status || "").toUpperCase();
      if (!VALID_STATUSES.includes(targetStatus)) {
        return { ok: false, error: `Invalid status "${args?.status}". Valid statuses: ${VALID_STATUSES.join(", ")}` };
      }

      if (lead.status === targetStatus) {
        return {
          ok: true,
          isNoOp: true,
          response: `No changes made: **${lead.companyName}** is already in **${targetStatus}** status.`,
          executedAction: {
            action,
            companyName: lead.companyName,
            previousValue: lead.status,
            newValue: targetStatus,
          },
        };
      }

      const prevStatus = lead.status;

      await prisma.lead.update({
        where: { id: leadId },
        data: { status: targetStatus },
      });

      await prisma.activity.create({
        data: {
          leadId,
          type: "STATUS",
          direction: "OUT",
          channel: "manual",
          body: `Status: ${prevStatus} → ${targetStatus}`,
          meta: JSON.stringify({
            source: "HIMI",
            action: "update_lead_status",
            previousValue: prevStatus,
            newValue: targetStatus,
            actor,
          }),
        },
      });

      return {
        ok: true,
        executedAction: {
          action,
          companyName: lead.companyName,
          previousValue: prevStatus,
          newValue: targetStatus,
        },
        response: `Successfully updated status for **${lead.companyName}** from **${prevStatus}** to **${targetStatus}**.`,
      };
    }

    case "update_lead_priority": {
      const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
      const targetPriority = String(args?.priority || "").toUpperCase();
      if (!VALID_PRIORITIES.includes(targetPriority)) {
        return { ok: false, error: `Invalid priority "${args?.priority}". Valid priorities: LOW, MEDIUM, HIGH.` };
      }

      if (lead.priority === targetPriority) {
        return {
          ok: true,
          isNoOp: true,
          response: `No changes made: **${lead.companyName}** priority is already **${targetPriority}**.`,
          executedAction: {
            action,
            companyName: lead.companyName,
            previousValue: lead.priority,
            newValue: targetPriority,
          },
        };
      }

      const prevPriority = lead.priority;

      await prisma.lead.update({
        where: { id: leadId },
        data: { priority: targetPriority },
      });

      await prisma.activity.create({
        data: {
          leadId,
          type: "STATUS",
          direction: "OUT",
          channel: "manual",
          body: `Priority: ${prevPriority} → ${targetPriority}`,
          meta: JSON.stringify({
            source: "HIMI",
            action: "update_lead_priority",
            previousValue: prevPriority,
            newValue: targetPriority,
            actor,
          }),
        },
      });

      return {
        ok: true,
        executedAction: {
          action,
          companyName: lead.companyName,
          previousValue: prevPriority,
          newValue: targetPriority,
        },
        response: `Successfully updated priority for **${lead.companyName}** from **${prevPriority}** to **${targetPriority}**.`,
      };
    }

    case "add_lead_note": {
      const noteText = String(args?.note || "").trim();
      if (!noteText) {
        return { ok: false, error: "Note content cannot be empty." };
      }
      if (noteText.length > 5000) {
        return { ok: false, error: "Note content exceeds maximum length of 5000 characters." };
      }

      const existingNotes = lead.notes ? lead.notes.trim() : "";
      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n[HIMI Note ${new Date().toISOString().split("T")[0]}]: ${noteText}`
        : noteText;

      await prisma.lead.update({
        where: { id: leadId },
        data: { notes: updatedNotes },
      });

      await prisma.activity.create({
        data: {
          leadId,
          type: "NOTE",
          direction: "OUT",
          channel: "manual",
          body: noteText,
          meta: JSON.stringify({
            source: "HIMI",
            action: "add_lead_note",
            actor,
          }),
        },
      });

      return {
        ok: true,
        executedAction: {
          action,
          companyName: lead.companyName,
          newValue: noteText,
        },
        response: `Successfully added note to **${lead.companyName}**.`,
      };
    }

    default:
      return { ok: false, error: "Unknown action." };
  }
}

