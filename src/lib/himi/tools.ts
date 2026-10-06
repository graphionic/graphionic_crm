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

