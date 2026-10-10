import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalisePhone } from "@/lib/whatsapp";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireActiveUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activities = await prisma.activity.findMany({
      where: { type: "WHATSAPP" },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        lead: {
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
        },
      },
    });

    const conversationMap = new Map<string, {
      key: string;
      phone: string;
      displayName: string;
      leadId?: string | null;
      companyName?: string | null;
      contactName?: string | null;
      city?: string | null;
      country?: string | null;
      leadStatus?: string | null;
      priority?: string | null;
      latestMessage: string;
      latestDirection: string;
      latestStatus: string | null;
      latestAt: Date;
      isKnown: boolean;
    }>();

    for (const act of activities) {
      let rawPhone = act.phone;
      if (!rawPhone && act.lead) {
        rawPhone = act.lead.whatsapp || act.lead.phone;
      }

      const key = rawPhone ? normalisePhone(rawPhone) : act.leadId || act.id;
      if (!conversationMap.has(key)) {
        const displayName =
          act.lead?.companyName ||
          act.lead?.contactName ||
          act.contactName ||
          (rawPhone ? `+${normalisePhone(rawPhone)}` : "Unknown Contact");

        conversationMap.set(key, {
          key,
          phone: rawPhone ? (rawPhone.startsWith("+") ? rawPhone : `+${normalisePhone(rawPhone)}`) : "Unknown Number",
          displayName,
          leadId: act.lead?.id || null,
          companyName: act.lead?.companyName || null,
          contactName: act.lead?.contactName || act.contactName || null,
          city: act.lead?.city || null,
          country: act.lead?.country || null,
          leadStatus: act.lead?.status || null,
          priority: act.lead?.priority || null,
          latestMessage: act.body || (act.templateName ? `[Template: ${act.templateName}]` : "—"),
          latestDirection: act.direction,
          latestStatus: act.status,
          latestAt: act.createdAt,
          isKnown: Boolean(act.lead),
        });
      }
    }

    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
      .slice(0, 50);

    return NextResponse.json({ ok: true, conversations });
  } catch (error) {
    console.error("[WhatsApp Conversations List Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load WhatsApp conversations." },
      { status: 500 }
    );
  }
}
