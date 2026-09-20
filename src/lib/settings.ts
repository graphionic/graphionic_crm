import "server-only";
import { prisma } from "./prisma";
import { decrypt, encrypt } from "./crypto";

/**
 * Settings live in the database so you can configure mail/WhatsApp
 * from the UI without redeploying. Anything sensitive is encrypted
 * with SETTINGS_ENCRYPTION_KEY before it touches the database.
 */

export const SECRET_KEYS = new Set([
  "smtp_pass",
  "resend_api_key",
  "wa_access_token",
  "wa_app_secret",
  "wa_verify_token",
]);

export type SettingsMap = Record<string, string>;

export async function getSettings(): Promise<SettingsMap> {
  const rows = await prisma.setting.findMany();
  const out: SettingsMap = {};
  for (const r of rows) {
    out[r.key] = r.isSecret ? safeDecrypt(r.value) : r.value;
  }
  return out;
}

function safeDecrypt(v: string) {
  try {
    return decrypt(v);
  } catch {
    return "";
  }
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.isSecret ? safeDecrypt(row.value) : row.value;
}

export async function setSetting(key: string, value: string) {
  const isSecret = SECRET_KEYS.has(key);
  const stored = isSecret && value ? encrypt(value) : value;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: stored, isSecret },
    update: { value: stored, isSecret },
  });
}

export async function setSettings(map: SettingsMap) {
  for (const [k, v] of Object.entries(map)) {
    // A blank secret field means "leave unchanged", not "erase it"
    if (SECRET_KEYS.has(k) && (v === "" || v === undefined)) continue;
    await setSetting(k, v);
  }
}

/** Settings the client is allowed to see (secrets masked). */
export async function getPublicSettings() {
  const all = await getSettings();
  const out: Record<string, string> = { ...all };
  for (const k of SECRET_KEYS) {
    if (out[k]) out[k] = ""; // never send secrets to the browser
  }
  return out;
}

// ---- typed accessors used by the mailer / whatsapp helpers ----
export async function mailConfig() {
  const s = await getSettings();
  return {
    provider: s.mail_provider || "smtp", // "smtp" | "resend" | "none"
    fromName: s.mail_from_name || "",
    fromEmail: s.mail_from_email || "",
    replyTo: s.mail_reply_to || "",
    smtpHost: s.smtp_host || "",
    smtpPort: Number(s.smtp_port || 587),
    smtpUser: s.smtp_user || "",
    smtpPass: s.smtp_pass || "",
    smtpSecure: s.smtp_secure === "true",
    resendApiKey: s.resend_api_key || "",
  };
}

export async function whatsappConfig() {
  const s = await getSettings();
  return {
    enabled: s.wa_enabled === "true",
    phoneNumberId: s.wa_phone_number_id || "",
    businessAccountId: s.wa_business_account_id || "",
    accessToken: s.wa_access_token || "",
    appSecret: s.wa_app_secret || "",
    verifyToken: s.wa_verify_token || "",
    apiVersion: s.wa_api_version || "v21.0",
    defaultCountryCode: s.wa_default_country_code || "44",
  };
}
