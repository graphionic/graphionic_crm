import "server-only";
import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalisePhone, canSendFreeform, sendText } from "@/lib/whatsapp";

export async function sendWhatsappReply({
  phone,
  text,
  leadId,
}: {
  phone: string;
  text: string;
  leadId?: string | null;
}) {
  await requireActiveUser();

  const normPhone = normalisePhone(phone);
  const trimmedText = (text || "").trim();

  if (!normPhone) {
    return { ok: false, error: "Valid phone number is required." } as const;
  }

  if (!trimmedText) {
    return { ok: false, error: "Message text cannot be empty." } as const;
  }

  if (trimmedText.length > 4096) {
    return { ok: false, error: "Message exceeds maximum length (4,096 characters)." } as const;
  }

  // 1. Suppression check
  const phoneTail = normPhone.slice(-9);
  const isSuppressed = await prisma.suppression.findFirst({
    where: {
      OR: [
        { value: normPhone.toLowerCase() },
        ...(phoneTail ? [{ value: { contains: phoneTail } }] : []),
      ],
    },
  });

  if (isSuppressed) {
    return { ok: false, error: "Recipient is on the suppression list. Messaging blocked." } as const;
  }

  // 2. Known Lead reply path
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return { ok: false, error: "Lead not found." } as const;
    }

    if (lead.doNotContact) {
      return { ok: false, error: "This lead is marked do-not-contact. Messaging blocked." } as const;
    }

    // 24-hour customer service window check
    const win = await canSendFreeform(lead.lastInboundAt);
    if (!win.allowed) {
      return { ok: false, error: win.reason } as const;
    }

    const sendRes = await sendText(normPhone, trimmedText);

    const activity = await prisma.activity.create({
      data: {
        leadId: lead.id,
        phone: normPhone,
        contactName: lead.contactName || lead.companyName || null,
        type: "WHATSAPP",
        direction: "OUT",
        channel: "whatsapp_cloud",
        body: trimmedText,
        status: sendRes.ok ? "sent" : "failed",
        externalId: sendRes.messageId ?? null,
        error: sendRes.ok ? null : sendRes.error ?? null,
        meta: JSON.stringify({ mode: "text", source: "inbox" }),
      },
    });

    if (sendRes.ok) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          lastWhatsappAt: new Date(),
          whatsappSentCount: { increment: 1 },
        },
      });
    }

    return {
      ok: sendRes.ok,
      messageId: sendRes.messageId,
      error: sendRes.error,
      activityId: activity.id,
    } as const;
  }

  // 3. Unknown contact reply path (Inbound message established customer-service window)
  const lastInbound = await prisma.activity.findFirst({
    where: {
      type: "WHATSAPP",
      direction: "IN",
      OR: [
        { phone: normPhone },
        ...(phoneTail ? [{ phone: { contains: phoneTail } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const win = await canSendFreeform(lastInbound?.createdAt);
  if (!win.allowed) {
    return { ok: false, error: win.reason } as const;
  }

  const sendRes = await sendText(normPhone, trimmedText);

  const activity = await prisma.activity.create({
    data: {
      leadId: null,
      phone: normPhone,
      contactName: lastInbound?.contactName || null,
      type: "WHATSAPP",
      direction: "OUT",
      channel: "whatsapp_cloud",
      body: trimmedText,
      status: sendRes.ok ? "sent" : "failed",
      externalId: sendRes.messageId ?? null,
      error: sendRes.ok ? null : sendRes.error ?? null,
      meta: JSON.stringify({ mode: "text", source: "inbox" }),
    },
  });

  return {
    ok: sendRes.ok,
    messageId: sendRes.messageId,
    error: sendRes.error,
    activityId: activity.id,
  } as const;
}
