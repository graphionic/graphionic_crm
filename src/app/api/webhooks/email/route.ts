import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inbound email webhook.
 *
 * Point your provider's inbound-parse webhook here (Resend inbound, Mailgun
 * routes, Cloudflare Email Workers, Zapier, whatever you use) and replies get
 * matched to the lead, logged on the timeline, and the lead moved to REPLIED.
 *
 * Authenticate with a shared secret in the body or an ?secret= query param.
 *
 *   curl -X POST https://your-app.vercel.app/api/webhooks/email \
 *     -H 'content-type: application/json' \
 *     -d '{"secret":"YOUR_WATCH_SECRET","from":"jane@clinic.co.uk",
 *          "subject":"Re: your note","text":"Send the fix list please"}'
 */
export async function POST(req: NextRequest) {
  const secret = await getSetting("watch_secret");
  const provided =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("x-webhook-secret") ||
    "";

  let body: { secret?: string; from?: string; subject?: string; text?: string; html?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Set a webhook secret in Settings → Compliance first." },
      { status: 503 }
    );
  }
  if (provided !== secret && body.secret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const fromRaw = (body.from || "").toLowerCase();
  const emailMatch = fromRaw.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const fromEmail = emailMatch ? emailMatch[0] : "";

  if (!fromEmail) {
    return NextResponse.json({ ok: false, error: "No sender address" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: { email: { equals: fromEmail, mode: "insensitive" } },
    select: { id: true, status: true },
  });

  if (!lead) {
    // Unknown sender — record nothing rather than inventing a lead.
    return NextResponse.json({ ok: true, matched: false });
  }

  const now = new Date();
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lastReplyAt: now,
      lastInboundAt: now,
      status: ["WON", "LOST"].includes(lead.status) ? lead.status : "REPLIED",
      nextFollowUpAt: null,
    },
  });

  const text = (body.text || "").trim();

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: "EMAIL",
      direction: "IN",
      channel: "webhook",
      subject: body.subject || "(no subject)",
      body: text || "[html-only reply]",
      status: "received",
    },
  });

  // Auto-suppress unsubscribe requests — PECR requires it be honoured
  const hay = `${body.subject || ""} ${text}`;
  if (/\b(unsubscribe|opt out|opt-out|remove me|stop emailing|do not email)\b/i.test(hay)) {
    await prisma.suppression.upsert({
      where: { value: fromEmail },
      create: { value: fromEmail, reason: "Unsubscribed via email reply" },
      update: { reason: "Unsubscribed via email reply" },
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { doNotContact: true, optedInEmail: false, status: "LOST" },
    });
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: "STATUS",
        direction: "OUT",
        body: "Auto-suppressed: unsubscribe request received. All channels blocked.",
      },
    });
  }

  return NextResponse.json({ ok: true, matched: true, leadId: lead.id });
}
