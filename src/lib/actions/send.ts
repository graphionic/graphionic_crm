"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { sendEmail } from "@/lib/mailer";
import { canSendFreeform, sendTemplate, sendText } from "@/lib/whatsapp";
import { isSuppressed } from "./leads";

/**
 * Every send goes through here so that the SAME guardrails always apply:
 *   1. do-not-contact / suppression list check
 *   2. opt-in check per channel
 *   3. WhatsApp 24h window check (free-form text is refused outside it)
 *   4. an Activity row is always written, success or failure
 *
 * Nothing bypasses this by calling the provider directly.
 */

export async function sendLeadEmail(leadId: string, subject: string, body: string) {
  await requireActiveUser();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found" } as const;

  if (lead.doNotContact)
    return { ok: false, error: "This lead is marked do-not-contact." } as const;

  const sup = await isSuppressed(lead);
  if (sup)
    return { ok: false, error: `Blocked: ${lead.email || lead.phone} is on the suppression list.` } as const;

  if (!lead.email)
    return { ok: false, error: "No email address on this lead." } as const;

  if (!lead.optedInEmail)
    return {
      ok: false,
      error:
        "No email opt-in recorded for this contact. Tick 'Email opt-in' on the lead before sending.",
    } as const;

  const result = await sendEmail({ to: lead.email, subject, body });

  await prisma.activity.create({
    data: {
      leadId,
      type: "EMAIL",
      direction: "OUT",
      channel: result.provider,
      subject,
      body,
      status: result.ok ? "sent" : "failed",
      externalId: result.messageId ?? null,
      error: result.ok ? null : result.error ?? null,
    },
  });

  if (result.ok) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastEmailAt: new Date(),
        emailSentCount: { increment: 1 },
        status: lead.status === "NEW" || lead.status === "QUALIFIED" ? "CONTACTED" : lead.status,
      },
    });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/outbox");
  revalidatePath("/dashboard");

  return result.ok
    ? ({ ok: true, messageId: result.messageId } as const)
    : ({ ok: false, error: result.error || "Send failed" } as const);
}

export async function sendLeadWhatsapp(
  leadId: string,
  opts: { mode: "text" | "template"; text?: string; templateName?: string; language?: string; params?: string[] }
) {
  await requireActiveUser();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found" } as const;

  const to = lead.whatsapp || lead.phone;
  if (!to) return { ok: false, error: "No WhatsApp number on this lead." } as const;

  if (lead.doNotContact)
    return { ok: false, error: "This lead is marked do-not-contact." } as const;

  const sup = await isSuppressed(lead);
  if (sup)
    return { ok: false, error: "Blocked: number is on the suppression list." } as const;

  if (!lead.optedInWhatsapp)
    return {
      ok: false,
      error:
        "No WhatsApp opt-in recorded. WhatsApp policy requires explicit opt-in before any business message — tick it on the lead only if they genuinely asked you to message them.",
    } as const;

  // ---- 24h window enforcement ----
  if (opts.mode === "text") {
    const win = await canSendFreeform(lead.lastInboundAt);
    if (!win.allowed) {
      return { ok: false, error: `${win.reason} Switch to a template.` } as const;
    }
  }

  const result =
    opts.mode === "template"
      ? await sendTemplate(to, opts.templateName || "", opts.language || "en_US", opts.params || [])
      : await sendText(to, opts.text || "");

  await prisma.activity.create({
    data: {
      leadId,
      type: "WHATSAPP",
      direction: "OUT",
      channel: "whatsapp_cloud",
      templateName: opts.mode === "template" ? opts.templateName : null,
      body: opts.mode === "template" ? `[template: ${opts.templateName}]` : opts.text,
      status: result.ok ? "sent" : "failed",
      externalId: result.messageId ?? null,
      error: result.ok ? null : result.error ?? null,
      meta: JSON.stringify({ mode: opts.mode, params: opts.params ?? [] }),
    },
  });

  if (result.ok) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastWhatsappAt: new Date(),
        whatsappSentCount: { increment: 1 },
        status: lead.status === "NEW" || lead.status === "QUALIFIED" ? "CONTACTED" : lead.status,
      },
    });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/outbox");
  revalidatePath("/dashboard");

  return result.ok
    ? ({ ok: true, messageId: result.messageId } as const)
    : ({ ok: false, error: result.error || "Send failed" } as const);
}
