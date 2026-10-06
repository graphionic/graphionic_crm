import crypto from "crypto";
import { prisma } from "./prisma";

export interface ResendWebhookEvent {
  type: string;
  created_at?: string;
  data: {
    email_id?: string;
    id?: string;
    created_at?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
    broadcast_id?: string | null;
    click?: {
      link?: string;
      ipAddress?: string;
      userAgent?: string;
    };
    link?: string;
    url?: string;
    bounce?: {
      type?: string;
      sub_type?: string;
      message?: string;
      permanent?: boolean;
    };
    bounce_type?: string;
    subtype?: string;
    type?: string;
    message?: string;
    error?: string;
    reason?: string;
  };
}

export interface ActivityMetadata {
  mode?: string;
  params?: string[];
  sentAt?: string;
  deliveredAt?: string;
  deliveryDelayed?: boolean;
  deliveryDelayedAt?: string;
  delayReason?: string;
  opened?: boolean;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  openCount?: number;
  clicked?: boolean;
  firstClickedAt?: string;
  lastClickedAt?: string;
  clickCount?: number;
  clickedUrls?: string[];
  lastClickedUrl?: string;
  bouncedAt?: string;
  bounceType?: string;
  bounceSubType?: string;
  bounceMessage?: string;
  complainedAt?: string;
  failedAt?: string;
  failureReason?: string;
  processedEvents?: string[];
  [key: string]: unknown;
}

export function parseActivityMeta(metaStr: string | null | undefined): ActivityMetadata {
  if (!metaStr) return {};
  try {
    const parsed = JSON.parse(metaStr);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Cryptographically verifies Svix webhook signatures used by Resend.
 */
export function verifySvixSignature({
  payload,
  svixId,
  svixTimestamp,
  svixSignature,
  secret,
  toleranceSeconds = 300,
}: {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  if (!payload || !svixId || !svixTimestamp || !svixSignature || !secret) {
    return false;
  }

  // Verify timestamp tolerance if enabled (> 0)
  if (toleranceSeconds > 0) {
    const ts = parseInt(svixTimestamp, 10);
    if (isNaN(ts)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > toleranceSeconds) return false;
  }

  // Svix signing secrets start with "whsec_" and the remainder is base64
  const cleanSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(cleanSecret, "base64");
  } catch {
    return false;
  }

  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSig = crypto.createHmac("sha256", keyBytes).update(toSign).digest("base64");

  const candidates = svixSignature.split(" ");
  for (const candidate of candidates) {
    const [version, sig] = candidate.split(",");
    if (version === "v1" && sig) {
      const sigBuf = Buffer.from(sig, "utf8");
      const expBuf = Buffer.from(expectedSig, "utf8");
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Processes a verified Resend lifecycle event and updates the matching Activity,
 * Lead opt-in state, and Suppression table idempotently.
 */
export async function handleResendLifecycleEvent(
  event: ResendWebhookEvent,
  svixId?: string
): Promise<{ ok: boolean; matched: boolean; eventType?: string; error?: string }> {
  const emailId = event.data?.email_id || event.data?.id;
  if (!emailId) {
    return { ok: true, matched: false, error: "No email_id in event payload" };
  }

  // Primary match: Activity.type = EMAIL, Activity.direction = OUT, Activity.externalId = emailId
  const activity = await prisma.activity.findFirst({
    where: {
      type: "EMAIL",
      direction: "OUT",
      externalId: emailId,
    },
    include: { lead: true },
  });

  if (!activity) {
    // Return success so Resend does not retry forever; log non-sensitive diagnostic
    console.warn(`[Resend Webhook] No matching outbound EMAIL activity for externalId: ${emailId}`);
    return { ok: true, matched: false };
  }

  const eventTime = event.data?.created_at || event.created_at || new Date().toISOString();
  const meta = parseActivityMeta(activity.meta);
  const processedEvents = Array.isArray(meta.processedEvents) ? [...meta.processedEvents] : [];

  // Check event deduplication for idempotent replays
  const isDuplicateEvent = Boolean(svixId && processedEvents.includes(svixId));

  switch (event.type) {
    case "email.sent": {
      // Confirm status as 'sent' if not already in a more advanced state
      const nextStatus = (!activity.status || activity.status === "queued" || activity.status === "sent")
        ? "sent"
        : activity.status;
      meta.sentAt = meta.sentAt || eventTime;
      if (svixId && !processedEvents.includes(svixId)) processedEvents.push(svixId);
      meta.processedEvents = processedEvents.slice(-50);

      // Webhook processing must NOT increment lead.emailSentCount (original send already incremented it)
      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: nextStatus,
          meta: JSON.stringify(meta),
        },
      });
      break;
    }

    case "email.delivered": {
      meta.deliveredAt = eventTime;
      meta.deliveryDelayed = false;
      if (svixId && !processedEvents.includes(svixId)) processedEvents.push(svixId);
      meta.processedEvents = processedEvents.slice(-50);

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: "delivered",
          meta: JSON.stringify(meta),
        },
      });
      break;
    }

    case "email.delivery_delayed": {
      meta.deliveryDelayed = true;
      meta.deliveryDelayedAt = eventTime;
      const delayReason = event.data?.error || event.data?.reason || event.data?.message;
      if (delayReason) meta.delayReason = String(delayReason);
      if (svixId && !processedEvents.includes(svixId)) processedEvents.push(svixId);
      meta.processedEvents = processedEvents.slice(-50);

      const nextStatus = (activity.status === "sent" || !activity.status) ? "delayed" : activity.status;

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: nextStatus,
          meta: JSON.stringify(meta),
        },
      });
      break;
    }

    case "email.opened": {
      meta.opened = true;
      meta.firstOpenedAt = meta.firstOpenedAt || eventTime;
      meta.lastOpenedAt = eventTime;
      if (!isDuplicateEvent) {
        meta.openCount = (meta.openCount || 0) + 1;
        if (svixId) processedEvents.push(svixId);
      }
      meta.processedEvents = processedEvents.slice(-50);

      // Do not downgrade delivery or reply status
      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          meta: JSON.stringify(meta),
        },
      });
      break;
    }

    case "email.clicked": {
      meta.clicked = true;
      meta.firstClickedAt = meta.firstClickedAt || eventTime;
      meta.lastClickedAt = eventTime;
      const clickedUrl = event.data?.click?.link || event.data?.link || event.data?.url;
      if (clickedUrl) {
        meta.lastClickedUrl = clickedUrl;
        const currentUrls = Array.isArray(meta.clickedUrls) ? meta.clickedUrls : [];
        if (!currentUrls.includes(clickedUrl)) {
          meta.clickedUrls = [...currentUrls, clickedUrl].slice(0, 10);
        }
      }
      if (!isDuplicateEvent) {
        meta.clickCount = (meta.clickCount || 0) + 1;
        if (svixId) processedEvents.push(svixId);
      }
      meta.processedEvents = processedEvents.slice(-50);

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          meta: JSON.stringify(meta),
        },
      });
      break;
    }

    case "email.bounced": {
      const bounceType = event.data?.bounce?.type || event.data?.bounce_type || event.data?.type || "";
      const bounceSubType = event.data?.bounce?.sub_type || event.data?.subtype || "";
      const bounceMessage = event.data?.bounce?.message || event.data?.message || "";

      meta.bouncedAt = eventTime;
      if (bounceType) meta.bounceType = bounceType;
      if (bounceSubType) meta.bounceSubType = bounceSubType;
      if (bounceMessage) meta.bounceMessage = bounceMessage;
      if (svixId && !processedEvents.includes(svixId)) processedEvents.push(svixId);
      meta.processedEvents = processedEvents.slice(-50);

      const errText = bounceMessage || (bounceSubType ? `Bounce: ${bounceSubType}` : "Email bounced");

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: "bounced",
          error: errText,
          meta: JSON.stringify(meta),
        },
      });

      // Transient bounces (e.g. mailbox full) do not trigger permanent suppression
      const isTransient = /transient/i.test(bounceType) || /transient/i.test(bounceSubType);
      const isPermanent = !isTransient;

      if (isPermanent) {
        const rawTo = event.data?.to;
        const recipientEmail = (Array.isArray(rawTo) ? rawTo[0] : rawTo) || activity.lead.email || "";
        const cleanEmail = recipientEmail.toLowerCase().trim();

        if (cleanEmail) {
          const reason = `Resend permanent bounce${bounceSubType ? `: ${bounceSubType}` : ""}`;
          await prisma.suppression.upsert({
            where: { value: cleanEmail },
            create: { value: cleanEmail, reason },
            update: { reason },
          });
        }

        // Revoke email opt-in (do not set global doNotContact to true so WhatsApp remains unblocked)
        await prisma.lead.update({
          where: { id: activity.leadId },
          data: { optedInEmail: false },
        });
      }
      break;
    }

    case "email.complained": {
      meta.complainedAt = eventTime;
      if (svixId && !processedEvents.includes(svixId)) processedEvents.push(svixId);
      meta.processedEvents = processedEvents.slice(-50);

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: "complained",
          error: "Spam complaint reported",
          meta: JSON.stringify(meta),
        },
      });

      const rawTo = event.data?.to;
      const recipientEmail = (Array.isArray(rawTo) ? rawTo[0] : rawTo) || activity.lead.email || "";
      const cleanEmail = recipientEmail.toLowerCase().trim();

      if (cleanEmail) {
        const reason = "Resend spam complaint";
        await prisma.suppression.upsert({
          where: { value: cleanEmail },
          create: { value: cleanEmail, reason },
          update: { reason },
        });
      }

      // Revoke email opt-in
      await prisma.lead.update({
        where: { id: activity.leadId },
        data: { optedInEmail: false },
      });
      break;
    }

    case "email.failed": {
      const failureReason = event.data?.error || event.data?.reason || event.data?.message || "Sending failed";
      meta.failedAt = eventTime;
      meta.failureReason = failureReason;
      if (svixId && !processedEvents.includes(svixId)) processedEvents.push(svixId);
      meta.processedEvents = processedEvents.slice(-50);

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: "failed",
          error: failureReason,
          meta: JSON.stringify(meta),
        },
      });
      break;
    }

    default: {
      console.log(`[Resend Webhook] Unhandled event type: ${event.type}`);
      break;
    }
  }

  return { ok: true, matched: true, eventType: event.type };
}
