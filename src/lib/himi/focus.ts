import { prisma } from "@/lib/prisma";

export type FocusLevel = "ACTION" | "WATCH" | "OPPORTUNITY";

export type FocusIntent =
  | "review_reply"
  | "review_delivery_issue"
  | "prepare_followup"
  | "prepare_first_touch";

export interface HimiFocusItem {
  id: string;
  leadId: string;
  level: FocusLevel;
  companyName: string;
  contactName?: string | null;
  headline: string;
  reason: string;
  intent: FocusIntent;
  ctaText: string;
  href: string;
  city?: string | null;
  country?: string | null;
}

/**
 * Deterministically computes up to 3 high-priority daily focus items for the sales operator.
 * 
 * Strict Ordering Priority:
 * 1. Genuine inbound reply requiring attention (ACTION)
 * 2. Genuine due/overdue follow-up from a previously contacted Lead (ACTION)
 * 3. Recent meaningful delivery problem requiring review (WATCH)
 * 4. Meaningful engagement on a previously contacted Lead (WATCH)
 * 5. Strong untouched prospect aligned with current BUSINESS strategy (OPPORTUNITY)
 * 6. Other strong untouched HIGH-priority prospect (OPPORTUNITY)
 * 
 * Invariants:
 * - Maximum 3 items hard cap.
 * - Deduplication: A lead appears at most once across all items.
 * - Never Contacted ≠ Follow-up (Untouched NEW leads are NEVER called follow-ups).
 * - Zero LLM invocation, zero ambient token cost.
 */
export async function getHimiDailyFocus(): Promise<HimiFocusItem[]> {
  const items: HimiFocusItem[] = [];
  const seenLeadIds = new Set<string>();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 864e5);

  try {
    // -------------------------------------------------------------
    // 1. Genuine Inbound Replies (ACTION)
    // -------------------------------------------------------------
    const repliedLeads = await prisma.lead.findMany({
      where: {
        doNotContact: false,
        status: { notIn: ["WON", "LOST"] },
        OR: [
          { status: "REPLIED" },
          { lastReplyAt: { not: null } },
        ],
      },
      orderBy: { lastReplyAt: "desc" },
      take: 3,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        status: true,
        city: true,
        country: true,
        lastReplyAt: true,
      },
    });

    for (const lead of repliedLeads) {
      if (items.length >= 3) break;
      if (seenLeadIds.has(lead.id)) continue;
      seenLeadIds.add(lead.id);

      items.push({
        id: `reply-${lead.id}`,
        leadId: lead.id,
        level: "ACTION",
        companyName: lead.companyName,
        contactName: lead.contactName,
        headline: "Prospect replied",
        reason: `Inbound reply received${lead.contactName ? ` from ${lead.contactName}` : ""}. Review and draft response.`,
        intent: "review_reply",
        ctaText: "Review reply",
        href: `/himi?leadId=${encodeURIComponent(lead.id)}&intent=review_reply`,
        city: lead.city,
        country: lead.country,
      });
    }

    // -------------------------------------------------------------
    // 2. Genuine Due / Overdue Follow-ups (ACTION)
    // Locked invariant: NEVER CONTACTED ≠ FOLLOW-UP.
    // Only leads previously contacted with an active scheduled follow-up.
    // -------------------------------------------------------------
    if (items.length < 3) {
      const dueFollowUps = await prisma.lead.findMany({
        where: {
          doNotContact: false,
          status: { notIn: ["WON", "LOST"] },
          nextFollowUpAt: { lte: new Date(now.getTime() + 864e5) },
          OR: [
            { status: "CONTACTED" },
            { emailSentCount: { gt: 0 } },
            { whatsappSentCount: { gt: 0 } },
          ],
        },
        orderBy: { nextFollowUpAt: "asc" },
        take: 3,
        select: {
          id: true,
          companyName: true,
          contactName: true,
          status: true,
          city: true,
          country: true,
          nextFollowUpAt: true,
        },
      });

      for (const lead of dueFollowUps) {
        if (items.length >= 3) break;
        if (seenLeadIds.has(lead.id)) continue;
        seenLeadIds.add(lead.id);

        const isOverdue = lead.nextFollowUpAt && lead.nextFollowUpAt < now;
        items.push({
          id: `followup-${lead.id}`,
          leadId: lead.id,
          level: "ACTION",
          companyName: lead.companyName,
          contactName: lead.contactName,
          headline: isOverdue ? "Overdue follow-up" : "Follow-up due",
          reason: `Scheduled follow-up due for previously contacted lead.`,
          intent: "prepare_followup",
          ctaText: "Prepare follow-up",
          href: `/himi?leadId=${encodeURIComponent(lead.id)}&intent=prepare_followup`,
          city: lead.city,
          country: lead.country,
        });
      }
    }

    // -------------------------------------------------------------
    // 3. Recent Meaningful Delivery Problems (WATCH)
    // Deduplicated by Lead: 5 failures on 1 lead -> 1 consolidated card.
    // -------------------------------------------------------------
    if (items.length < 3) {
      const failureActivities = await prisma.activity.findMany({
        where: {
          createdAt: { gte: weekAgo },
          OR: [
            { status: { in: ["failed", "bounced", "complained"] } },
            { error: { not: null } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          lead: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              city: true,
              country: true,
              doNotContact: true,
            },
          },
        },
      });

      for (const act of failureActivities) {
        if (items.length >= 3) break;
        if (!act.lead || seenLeadIds.has(act.lead.id)) continue;
        seenLeadIds.add(act.lead.id);

        const channel = act.type === "WHATSAPP" ? "WhatsApp" : "Email";
        const shortError = act.error
          ? act.error.length > 80
            ? `${act.error.slice(0, 80)}…`
            : act.error
          : null;

        items.push({
          id: `delivery-${act.lead.id}`,
          leadId: act.lead.id,
          level: "WATCH",
          companyName: act.lead.companyName,
          contactName: act.lead.contactName,
          headline: "Delivery issue",
          reason: `Recent ${channel} delivery failed${shortError ? `: ${shortError}` : ""}. Review contact channel.`,
          intent: "review_delivery_issue",
          ctaText: "Review with HIMI",
          href: `/himi?leadId=${encodeURIComponent(act.lead.id)}&intent=review_delivery_issue`,
          city: act.lead.city,
          country: act.lead.country,
        });
      }
    }

    // -------------------------------------------------------------
    // 4. Meaningful Engagement on Previously Contacted Lead (WATCH)
    // -------------------------------------------------------------
    if (items.length < 3) {
      const engagedActivities = await prisma.activity.findMany({
        where: {
          createdAt: { gte: weekAgo },
          direction: "OUT",
          OR: [
            { status: "read" },
            { meta: { contains: '"opened":true' } },
            { meta: { contains: '"clicked":true' } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          lead: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              status: true,
              city: true,
              country: true,
              lastReplyAt: true,
              doNotContact: true,
            },
          },
        },
      });

      for (const act of engagedActivities) {
        if (items.length >= 3) break;
        if (
          !act.lead ||
          act.lead.doNotContact ||
          act.lead.lastReplyAt ||
          seenLeadIds.has(act.lead.id)
        )
          continue;
        seenLeadIds.add(act.lead.id);

        items.push({
          id: `engaged-${act.lead.id}`,
          leadId: act.lead.id,
          level: "WATCH",
          companyName: act.lead.companyName,
          contactName: act.lead.contactName,
          headline: "Prospect engaged",
          reason: `Outreach was opened/read with no reply yet. Good candidate for follow-up.`,
          intent: "prepare_followup",
          ctaText: "Prepare follow-up",
          href: `/himi?leadId=${encodeURIComponent(act.lead.id)}&intent=prepare_followup`,
          city: act.lead.city,
          country: act.lead.country,
        });
      }
    }

    // -------------------------------------------------------------
    // 5. Strong Untouched Prospect Aligned with Active BUSINESS Memory (OPPORTUNITY)
    // -------------------------------------------------------------
    if (items.length < 3) {
      const activeBusinessMemories = await prisma.himiMemory.findMany({
        where: {
          scope: "BUSINESS",
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
      });

      const activeMem = activeBusinessMemories[0];
      const memText = activeMem?.content?.toLowerCase() || "";
      const isUkFocus = memText.includes("uk") || memText.includes("united kingdom") || memText.includes("british");
      const isDentalFocus = memText.includes("dental") || memText.includes("dentist") || memText.includes("orthodont");

      if (activeMem && (isUkFocus || isDentalFocus)) {
        const matchingLeads = await prisma.lead.findMany({
          where: {
            status: "NEW",
            doNotContact: false,
            emailSentCount: 0,
            whatsappSentCount: 0,
            ...(isUkFocus ? { country: "UK" } : {}),
            ...(isDentalFocus
              ? {
                  OR: [
                    { businessCategory: { contains: "dental", mode: "insensitive" } },
                    { companyName: { contains: "dental", mode: "insensitive" } },
                    { companyName: { contains: "dentist", mode: "insensitive" } },
                    { companyName: { contains: "orthodontics", mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: [{ score: "desc" }, { createdAt: "desc" }],
          take: 10,
          select: {
            id: true,
            companyName: true,
            contactName: true,
            city: true,
            country: true,
            priority: true,
            score: true,
          },
        });

        // Ensure HIGH priority leads rank above MEDIUM / LOW
        const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        matchingLeads.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

        for (const lead of matchingLeads) {
          if (items.length >= 3) break;
          if (seenLeadIds.has(lead.id)) continue;
          seenLeadIds.add(lead.id);

          const loc = lead.city ? `${lead.city}, ${lead.country || "UK"}` : lead.country || "UK";
          items.push({
            id: `strat-${lead.id}`,
            leadId: lead.id,
            level: "OPPORTUNITY",
            companyName: lead.companyName,
            contactName: lead.contactName,
            headline: "Strong prospect",
            reason: `High-priority prospect matching current UK dental focus (${loc}).`,
            intent: "prepare_first_touch",
            ctaText: "Ask HIMI",
            href: `/himi?leadId=${encodeURIComponent(lead.id)}&intent=prepare_first_touch`,
            city: lead.city,
            country: lead.country,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 6. Other Strong Untouched HIGH-priority Prospects (OPPORTUNITY)
    // -------------------------------------------------------------
    if (items.length < 3) {
      const generalHighLeads = await prisma.lead.findMany({
        where: {
          status: "NEW",
          priority: "HIGH",
          doNotContact: false,
          emailSentCount: 0,
          whatsappSentCount: 0,
        },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          companyName: true,
          contactName: true,
          city: true,
          country: true,
          score: true,
        },
      });

      for (const lead of generalHighLeads) {
        if (items.length >= 3) break;
        if (seenLeadIds.has(lead.id)) continue;
        seenLeadIds.add(lead.id);

        items.push({
          id: `opp-${lead.id}`,
          leadId: lead.id,
          level: "OPPORTUNITY",
          companyName: lead.companyName,
          contactName: lead.contactName,
          headline: "Strong prospect",
          reason: `High-priority prospect (score ${lead.score}) with no outreach recorded.`,
          intent: "prepare_first_touch",
          ctaText: "Ask HIMI",
          href: `/himi?leadId=${encodeURIComponent(lead.id)}&intent=prepare_first_touch`,
          city: lead.city,
          country: lead.country,
        });
      }
    }
  } catch (error) {
    console.error("[HIMI Daily Focus Error]:", error);
    // Graceful degradation: return whatever items were safely resolved or empty array
  }

  return items.slice(0, 3);
}
