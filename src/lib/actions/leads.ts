"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";

/** Normalise a phone/email into suppression-list form. */
function norm(v: string) {
  return (v || "").toLowerCase().trim();
}

const LeadInput = z.object({
  companyName: z.string().min(1, "Company name is required"),
  businessCategory: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  country: z.string().default("UK"),
  city: z.string().optional().default(""),
  region: z.string().optional().default(""),
  address: z.string().optional().default(""),
  postcode: z.string().optional().default(""),
  companyNumber: z.string().optional().default(""),
  contactName: z.string().optional().default(""),
  contactRole: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  whatsapp: z.string().optional().default(""),
  linkedin: z.string().optional().default(""),
  website: z.string().optional().default(""),
  source: z.string().optional().default("manual"),
  status: z.string().default("NEW"),
  priority: z.string().default("MEDIUM"),
  segment: z.string().optional().default(""),
  score: z.coerce.number().int().min(0).max(100).default(0),
  issues: z.string().optional().default(""),
  hookLine: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  dealValueCents: z.coerce.number().int().optional().nullable(),
  quotedCurrency: z.string().optional().default("GBP"),
  optedInEmail: z.coerce.boolean().default(false),
  optedInWhatsapp: z.coerce.boolean().default(false),
  doNotContact: z.coerce.boolean().default(false),
  nextFollowUpAt: z.string().optional().default(""),
});

function fromForm(fd: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") raw[k] = v;
  }
  // checkboxes only appear when ticked
  for (const b of ["optedInEmail", "optedInWhatsapp", "doNotContact"]) {
    raw[b] = raw[b] === "on" || raw[b] === "true";
  }
  if (raw.dealValue) {
    raw.dealValueCents = Math.round(Number(raw.dealValue) * 100);
  }
  return LeadInput.safeParse(raw);
}

export async function createLead(fd: FormData) {
  await requireActiveUser();
  const parsed = fromForm(fd);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const lead = await prisma.lead.create({
    data: {
      ...d,
      email: d.email || null,
      phone: d.phone || null,
      nextFollowUpAt: d.nextFollowUpAt ? new Date(d.nextFollowUpAt) : null,
      dealValueCents: d.dealValueCents ?? null,
      activities: {
        create: {
          type: "STATUS",
          direction: "OUT",
          body: "Lead created",
        },
      },
    },
  });
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, fd: FormData) {
  await requireActiveUser();
  const parsed = fromForm(fd);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return { error: "Lead not found" };

  await prisma.lead.update({
    where: { id },
    data: {
      ...d,
      email: d.email || null,
      phone: d.phone || null,
      nextFollowUpAt: d.nextFollowUpAt ? new Date(d.nextFollowUpAt) : null,
      dealValueCents: d.dealValueCents ?? null,
    },
  });

  if (before.status !== d.status) {
    await prisma.activity.create({
      data: {
        leadId: id,
        type: "STATUS",
        direction: "OUT",
        body: `Status: ${before.status} → ${d.status}`,
      },
    });
  }
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteLead(id: string) {
  await requireActiveUser();
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/leads");
}

/** Quick status change from the list or detail page. */
export async function setStatus(id: string, status: string) {
  await requireActiveUser();
  const before = await prisma.lead.findUnique({
    where: { id },
    select: { status: true },
  });
  await prisma.lead.update({ where: { id }, data: { status } });
  if (before && before.status !== status) {
    await prisma.activity.create({
      data: {
        leadId: id,
        type: "STATUS",
        direction: "OUT",
        body: `Status: ${before.status} → ${status}`,
      },
    });
  }
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

export async function addNote(leadId: string, body: string, type = "NOTE") {
  await requireActiveUser();
  if (!body.trim()) return { error: "Note is empty" };
  await prisma.activity.create({
    data: { leadId, type, direction: "OUT", body: body.trim() },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function logReply(leadId: string, body: string) {
  await requireActiveUser();
  const now = new Date();
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastReplyAt: now,
      lastInboundAt: now, // opens the 24h WhatsApp window
      status: "REPLIED",
      nextFollowUpAt: null,
    },
  });
  await prisma.activity.create({
    data: {
      leadId,
      type: "NOTE",
      direction: "IN",
      channel: "manual",
      body: body || "Reply received",
      status: "received",
    },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setFollowUp(leadId: string, isoDate: string) {
  await requireActiveUser();
  const at = isoDate ? new Date(isoDate) : null;
  await prisma.lead.update({ where: { id: leadId }, data: { nextFollowUpAt: at } });
  await prisma.activity.create({
    data: {
      leadId,
      type: "TASK",
      direction: "OUT",
      body: at ? `Follow-up scheduled for ${at.toDateString()}` : "Follow-up cleared",
    },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Add to the suppression list — blocks all future sending to this contact. */
export async function suppressLead(leadId: string, reason = "Opt-out requested") {
  await requireActiveUser();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "Lead not found" };
  const values = [lead.email, lead.phone, lead.whatsapp].filter(Boolean) as string[];
  for (const v of values) {
    await prisma.suppression.upsert({
      where: { value: norm(v) },
      create: { value: norm(v), reason },
      update: { reason },
    });
  }
  await prisma.lead.update({
    where: { id: leadId },
    data: { doNotContact: true, status: "LOST" },
  });
  await prisma.activity.create({
    data: {
      leadId,
      type: "STATUS",
      direction: "OUT",
      body: `Added to suppression list — ${reason}. No further messages will be sent.`,
    },
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/settings/compliance");
  return { ok: true };
}

export async function isSuppressed(lead: {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}) {
  const values = [lead.email, lead.phone, lead.whatsapp]
    .filter(Boolean)
    .map((v) => norm(v as string));
  if (values.length === 0) return null;
  const hit = await prisma.suppression.findFirst({ where: { value: { in: values } } });
  return hit;
}
