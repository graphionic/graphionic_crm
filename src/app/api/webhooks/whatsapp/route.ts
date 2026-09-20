import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { normalisePhone } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WhatsApp Cloud API webhook.
 *
 *  GET  — Meta's verification handshake (hub.challenge)
 *  POST — inbound messages + delivery statuses
 *
 * Inbound messages are the important part: they set lastInboundAt on the lead,
 * which OPENS the 24-hour free-form window and lets you reply normally instead
 * of only through approved templates.
 */

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");

  const expected = await getSetting("wa_verify_token");
  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WaPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string };
          interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          recipient_id?: string;
          errors?: Array<{ title?: string; message?: string }>;
        }>;
      };
    }>;
  }>;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as WaPayload | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const changes = body.entry?.flatMap((e) => e.changes ?? []) ?? [];

  for (const change of changes) {
    const value = change.value;
    if (!value) continue;

    // ---------- inbound messages ----------
    for (const m of value.messages ?? []) {
      const fromRaw = m.from || "";
      const text =
        m.text?.body ||
        m.button?.text ||
        m.interactive?.button_reply?.title ||
        m.interactive?.list_reply?.title ||
        `[${m.type || "message"} received]`;

      // Match on the last 9 digits so 447700900123 finds +44 7700 900123
      const tail = normalisePhone(fromRaw).slice(-9);
      const lead = tail
        ? await prisma.lead.findFirst({
            where: {
              OR: [
                { whatsapp: { contains: tail } },
                { phone: { contains: tail } },
              ],
            },
            select: { id: true, status: true },
          })
        : null;

      if (lead) {
        const now = new Date();
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            lastInboundAt: now, // opens the 24h free-form window
            lastReplyAt: now,
            status: lead.status === "WON" || lead.status === "LOST" ? lead.status : "REPLIED",
            nextFollowUpAt: null,
          },
        });
        await prisma.activity.create({
          data: {
            leadId: lead.id,
            type: "WHATSAPP",
            direction: "IN",
            channel: "whatsapp_cloud",
            body: text,
            status: "received",
            externalId: m.id ?? null,
          },
        });

        // Auto-suppress obvious opt-outs — required by Meta policy and PECR
        if (/\b(stop|unsubscribe|remove me|don'?t message|opt out)\b/i.test(text)) {
          await prisma.suppression.upsert({
            where: { value: fromRaw.toLowerCase() },
            create: { value: fromRaw.toLowerCase(), reason: "Opted out via WhatsApp" },
            update: { reason: "Opted out via WhatsApp" },
          });
          await prisma.lead.update({
            where: { id: lead.id },
            data: { doNotContact: true, optedInWhatsapp: false, status: "LOST" },
          });
          await prisma.activity.create({
            data: {
              leadId: lead.id,
              type: "STATUS",
              direction: "OUT",
              body: "Auto-suppressed: contact asked to stop. All channels blocked.",
            },
          });
        }
      }
    }

    // ---------- delivery statuses ----------
    for (const s of value.statuses ?? []) {
      if (!s.id) continue;
      const failed = s.status === "failed";
      await prisma.activity.updateMany({
        where: { externalId: s.id },
        data: {
          status: s.status || null,
          error: failed
            ? s.errors?.map((e) => e.title || e.message).filter(Boolean).join("; ") || "delivery failed"
            : null,
        },
      });
    }
  }

  // Meta requires a fast 200 or it retries
  return NextResponse.json({ ok: true });
}
