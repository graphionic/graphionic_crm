import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalisePhone } from "@/lib/whatsapp";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  props: { params: Promise<{ key: string }> }
) {
  const user = await requireActiveUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { key: rawKey } = await props.params;
  const key = decodeURIComponent(rawKey || "").trim();

  if (!key) {
    return NextResponse.json({ ok: false, error: "Invalid conversation key." }, { status: 400 });
  }

  try {
    const normKey = normalisePhone(key);
    const tail = normKey.length >= 9 ? normKey.slice(-9) : normKey;

    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { id: key },
          ...(tail ? [{ whatsapp: { contains: tail } }, { phone: { contains: tail } }] : []),
        ],
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        whatsapp: true,
        city: true,
        region: true,
        country: true,
        status: true,
        priority: true,
        doNotContact: true,
        optedInWhatsapp: true,
        lastInboundAt: true,
      },
    });

    const activities = await prisma.activity.findMany({
      where: {
        type: "WHATSAPP",
        OR: [
          { phone: normKey },
          ...(tail ? [{ phone: { contains: tail } }] : []),
          ...(lead ? [{ leadId: lead.id }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        direction: true,
        body: true,
        status: true,
        error: true,
        templateName: true,
        createdAt: true,
      },
    });

    // Compute suppression
    const isSuppressed = await prisma.suppression.findFirst({
      where: {
        OR: [
          { value: normKey.toLowerCase() },
          ...(tail ? [{ value: { contains: tail } }] : []),
        ],
      },
    });

    let canReplyFreeform = false;
    let windowExpiresAt: string | null = null;
    let hoursLeft: number | null = null;
    let blockedReason: string | null = null;

    if (isSuppressed) {
      canReplyFreeform = false;
      blockedReason = "SUPPRESSED";
    } else if (lead?.doNotContact) {
      canReplyFreeform = false;
      blockedReason = "DO_NOT_CONTACT";
    } else {
      const lastInboundActivity = activities
        .filter((a) => a.direction === "IN")
        .pop();

      const lastInboundDate = lead?.lastInboundAt || lastInboundActivity?.createdAt;

      if (!lastInboundDate) {
        canReplyFreeform = false;
        blockedReason = "NO_INBOUND_WINDOW";
      } else {
        const msSinceInbound = Date.now() - new Date(lastInboundDate).getTime();
        const hoursSinceInbound = msSinceInbound / 36e5;

        if (hoursSinceInbound > 24) {
          canReplyFreeform = false;
          blockedReason = "WINDOW_CLOSED";
        } else {
          canReplyFreeform = true;
          hoursLeft = Math.max(0, 24 - hoursSinceInbound);
          windowExpiresAt = new Date(new Date(lastInboundDate).getTime() + 24 * 36e5).toISOString();
        }
      }
    }

    const displayName =
      lead?.companyName ||
      lead?.contactName ||
      (normKey ? `+${normKey}` : "Unknown Contact");

    const formattedPhone = lead?.whatsapp || lead?.phone || (normKey ? `+${normKey}` : key);

    return NextResponse.json({
      ok: true,
      conversation: {
        key: normKey || key,
        phone: formattedPhone,
        displayName,
        lead,
        isKnown: Boolean(lead),
      },
      messages: activities,
      eligibility: {
        canReplyFreeform,
        windowExpiresAt,
        hoursLeft: hoursLeft ? Number(hoursLeft.toFixed(1)) : null,
        blockedReason,
      },
    });
  } catch (error) {
    console.error("[WhatsApp Conversation Detail Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load conversation details." },
      { status: 500 }
    );
  }
}
