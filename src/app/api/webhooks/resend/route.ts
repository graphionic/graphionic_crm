import { NextResponse, type NextRequest } from "next/server";
import { getSetting } from "@/lib/settings";
import {
  verifySvixSignature,
  handleResendLifecycleEvent,
  type ResendWebhookEvent,
} from "@/lib/resend-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend Email Lifecycle Webhook.
 *
 * Receives signed webhook events from Resend (via Svix) for email lifecycle:
 * email.sent, email.delivered, email.delivery_delayed, email.opened,
 * email.clicked, email.bounced, email.complained, email.failed.
 *
 * Configured in Resend Dashboard → Webhooks pointing to:
 *   POST https://YOUR-DOMAIN/api/webhooks/resend
 */
export async function POST(req: NextRequest) {
  // Read RAW payload body before parsing JSON — required for cryptographic signature verification
  const rawPayload = await req.text();

  const svixId = req.headers.get("svix-id") || "";
  const svixTimestamp = req.headers.get("svix-timestamp") || "";
  const svixSignature = req.headers.get("svix-signature") || "";

  // Retrieve signing secret from encrypted Settings or environment
  const dbSecret = await getSetting("resend_webhook_secret");
  const secret = dbSecret || process.env.RESEND_WEBHOOK_SECRET || "";

  if (!secret) {
    console.error("[Resend Webhook] Webhook secret not configured in Settings or RESEND_WEBHOOK_SECRET");
    return NextResponse.json(
      { ok: false, error: "Resend webhook signing secret is not configured" },
      { status: 503 }
    );
  }

  // Cryptographically verify Svix signature
  const isValid = verifySvixSignature({
    payload: rawPayload,
    svixId,
    svixTimestamp,
    svixSignature,
    secret,
  });

  if (!isValid) {
    console.warn("[Resend Webhook] Signature verification failed");
    return NextResponse.json(
      { ok: false, error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const result = await handleResendLifecycleEvent(event, svixId);

  return NextResponse.json(result, { status: 200 });
}
