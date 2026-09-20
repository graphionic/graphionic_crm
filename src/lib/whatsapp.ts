import "server-only";
import { whatsappConfig } from "./settings";

/**
 * WhatsApp Cloud API (Meta official).
 *
 * IMPORTANT — the rules this code enforces:
 *  - Free-form text is ONLY allowed inside a 24h window that the CUSTOMER
 *    opened by messaging you first. Outside that window you must use an
 *    approved template.
 *  - Templates may only be sent to contacts with a recorded opt-in.
 *    That is a WhatsApp policy requirement AND a PECR requirement in the UK.
 *
 * The send functions below therefore refuse to send rather than letting you
 * get the number banned — see `canSendFreeform` and the optIn checks in the
 * server actions.
 */

const BASE = "https://graph.facebook.com";

export type WaResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  code?: number;
};

export function normalisePhone(raw: string, defaultCountryCode = "44"): string {
  let p = (raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = defaultCountryCode + p.slice(1);
  return p;
}

export async function canSendFreeform(lastInboundAt: Date | null | undefined) {
  if (!lastInboundAt) return { allowed: false, reason: "No inbound message from this contact — the 24h window is NOT open. Use an approved template." };
  const ms = Date.now() - new Date(lastInboundAt).getTime();
  const hours = ms / 36e5;
  if (hours > 24) {
    return { allowed: false, reason: `Last inbound was ${hours.toFixed(1)}h ago. The 24h window is closed — use a template.` };
  }
  return { allowed: true, reason: `Window open (${(24 - hours).toFixed(1)}h remaining).`, hoursLeft: 24 - hours };
}

async function post(body: unknown): Promise<WaResult> {
  const c = await whatsappConfig();
  if (!c.enabled) return { ok: false, error: "WhatsApp is disabled. Enable it in Settings → WhatsApp." };
  if (!c.phoneNumberId || !c.accessToken) {
    return { ok: false, error: "Missing Phone Number ID or Access Token." };
  }
  const url = `${BASE}/${c.apiVersion}/${c.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error || {};
      return {
        ok: false,
        error: err?.error_data?.details || err?.message || `HTTP ${res.status}`,
        code: err?.code,
      };
    }
    return { ok: true, messageId: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Free-form text. Caller MUST have checked the 24h window first. */
export async function sendText(to: string, text: string): Promise<WaResult> {
  const c = await whatsappConfig();
  return post({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalisePhone(to, c.defaultCountryCode),
    type: "text",
    text: { preview_url: false, body: text },
  });
}

/** Approved template with optional body parameters. */
export async function sendTemplate(
  to: string,
  templateName: string,
  language: string,
  bodyParams: string[] = []
): Promise<WaResult> {
  const c = await whatsappConfig();
  const components =
    bodyParams.length > 0
      ? [{ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: t })) }]
      : [];
  return post({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalisePhone(to, c.defaultCountryCode),
    type: "template",
    template: {
      name: templateName,
      language: { code: language || "en_US" },
      components,
    },
  });
}

/** Pull the templates approved on the WhatsApp Business Account. */
export async function listTemplates(): Promise<{
  ok: boolean;
  templates?: Array<{ name: string; language: string; status: string; category: string; body: string }>;
  error?: string;
}> {
  const c = await whatsappConfig();
  if (!c.businessAccountId || !c.accessToken) {
    return { ok: false, error: "Set the WhatsApp Business Account ID and Access Token first." };
  }
  try {
    const url = `${BASE}/${c.apiVersion}/${c.businessAccountId}/message_templates?limit=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${c.accessToken}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    }
    type Raw = {
      name: string;
      language: string;
      status: string;
      category: string;
      components?: Array<{ type: string; text?: string }>;
    };
    const templates = ((data?.data ?? []) as Raw[]).map((t) => ({
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      body: t.components?.find((c2) => c2.type === "BODY")?.text ?? "",
    }));
    return { ok: true, templates };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Verify the token works at all — used by the Settings "Test" button. */
export async function verifyWhatsapp(): Promise<WaResult> {
  const c = await whatsappConfig();
  if (!c.phoneNumberId || !c.accessToken) {
    return { ok: false, error: "Missing Phone Number ID or Access Token." };
  }
  try {
    const url = `${BASE}/${c.apiVersion}/${c.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${c.accessToken}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { ok: true, messageId: `${data?.verified_name} · ${data?.display_phone_number} · quality ${data?.quality_rating}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
