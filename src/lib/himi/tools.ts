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
];

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

    default:
      return { ok: false, error: { code: "UNKNOWN_TOOL", message: `Unknown tool ${name}` } };
  }
}
