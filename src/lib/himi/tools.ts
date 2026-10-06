import { prisma } from "@/lib/prisma";

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
    description: "Retrieve a ranked list of leads requiring human attention with factual signals.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max records to return (default 15, max 50)" },
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
    description: "Identify leads deserving follow-up based on CRM evidence (open/read without reply, stale contacted).",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max records to return (default 15, max 50)" },
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
];


export interface HimiPendingAction {
  action: "update_lead_status" | "update_lead_priority" | "add_lead_note";
  leadId: string;
  companyName: string;
  currentValue?: string | null;
  newValue: string;
  arguments: Record<string, any>;
}

export async function executeHimiTool(name: string, args: Record<string, any> = {}) {
  switch (name) {
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
      const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);

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

        if (lead.priority === "HIGH") {
          signals.push("HIGH priority lead");
          scoreWeight += 25;
        }

        if (lead.status === "REPLIED" || lead.lastReplyAt) {
          signals.push("Reply received (needs response)");
          scoreWeight += 50;
        }

        if (lead.status === "PROPOSAL_SENT") {
          signals.push("Proposal sent (pending follow-up)");
          scoreWeight += 35;
        }

        if (lead.status === "CALL_BOOKED") {
          signals.push("Call booked (requires preparation/action)");
          scoreWeight += 30;
        }

        if ((lead.status === "NEW" || lead.status === "QUALIFIED") && lead.emailSentCount === 0 && lead.whatsappSentCount === 0) {
          signals.push("Untouched lead (no outreach recorded)");
          scoreWeight += 20;
        }

        const failedAct = lead.activities.find((a) => a.status === "failed" || (a.error && a.error.length > 0));
        if (failedAct) {
          signals.push(`Outreach delivery failed (${failedAct.type})`);
          scoreWeight += 40;
        }

        const daysSinceLastActivity = lead.activities[0]
          ? Math.floor((Date.now() - new Date(lead.activities[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        if (lead.status === "CONTACTED" && daysSinceLastActivity >= 5) {
          signals.push(`Stale contacted lead (${daysSinceLastActivity} days without progress)`);
          scoreWeight += 25;
        }

        const hasEmail = Boolean(lead.email && lead.email.trim());
        const hasPhone = Boolean(lead.phone || lead.whatsapp);
        const contactability = hasEmail && hasPhone ? "both" : hasEmail ? "email_only" : hasPhone ? "phone_only" : "none";

        return {
          leadId: lead.id,
          companyName: lead.companyName,
          status: lead.status,
          priority: lead.priority,
          score: lead.score,
          contactability,
          signals,
          scoreWeight,
          lastActivityAt: lead.activities[0]?.createdAt || lead.updatedAt,
        };
      });

      const ranked = items
        .filter((item) => item.signals.length > 0)
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
      let emailFailed = 0;

      let waSent = 0;
      let waDelivered = 0;
      let waRead = 0;
      let waFailed = 0;

      let inboundCount = 0;

      for (const act of activities) {
        if (act.direction === "IN") {
          inboundCount++;
        }

        if (act.type === "EMAIL") {
          if (act.direction === "OUT") emailSent++;
          if (act.status === "delivered") emailDelivered++;
          if (act.status === "failed" || act.error) emailFailed++;

          if (act.meta && (act.meta.includes('"opened"') || act.meta.includes('"open"'))) {
            emailOpened++;
          }
          if (act.meta && (act.meta.includes('"clicked"') || act.meta.includes('"click"'))) {
            emailClicked++;
          }
        }

        if (act.type === "WHATSAPP") {
          if (act.direction === "OUT") waSent++;
          if (act.status === "delivered") waDelivered++;
          if (act.status === "read") waRead++;
          if (act.status === "failed" || act.error) waFailed++;
        }
      }

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
            failed: emailFailed,
          },
          whatsapp: {
            sent: waSent,
            delivered: waDelivered,
            read: waRead,
            failed: waFailed,
          },
          inboundReplies: inboundCount,
          totalActivitiesInWindow: activities.length,
        },
      };
    }

    case "get_followup_opportunities": {
      const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);

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
        if (lastOutbound && lastOutbound.meta && lastOutbound.meta.includes('"opened"')) {
          signals.push("Email opened previously (potential engagement signal)");
        }
        if (daysSinceActivity >= 4) {
          signals.push(`No activity in ${daysSinceActivity} days`);
        }

        return {
          leadId: lead.id,
          companyName: lead.companyName,
          status: lead.status,
          priority: lead.priority,
          lastOutreachDate: lead.lastEmailAt || lead.lastWhatsappAt || lastOutbound?.createdAt || null,
          lastReplyDate: lead.lastReplyAt || null,
          daysSinceActivity,
          signals,
        };
      });

      const filtered = opportunities
        .filter((o) => o.signals.length > 0)
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
  const ALLOWED_ACTIONS = ["update_lead_status", "update_lead_priority", "add_lead_note"];
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

