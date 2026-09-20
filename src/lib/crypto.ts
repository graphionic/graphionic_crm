import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for secrets stored in the database
 * (SMTP passwords, WhatsApp access tokens, API keys).
 *
 * Key comes from SETTINGS_ENCRYPTION_KEY (base64, 32 bytes).
 * Never store a raw token in the DB — if the database leaks, the
 * secrets are useless without the env var.
 */

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY must be 32 bytes base64. Generate with: openssl rand -base64 32"
    );
  }
  return buf;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

export function decrypt(payload: string): string {
  if (!payload?.startsWith("v1.")) return payload; // plaintext (first run / not secret)
  const [, ivB64, dataB64, tagB64] = payload.split(".");
  try {
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong/rotated key — fail closed rather than returning garbage
    throw new Error("Could not decrypt setting. Was SETTINGS_ENCRYPTION_KEY changed?");
  }
}

/** Mask a secret for display in the UI: sk_live_abcd…wxyz */
export function mask(value: string, keep = 4): string {
  if (!value) return "";
  if (value.length <= keep * 2) return "•".repeat(value.length);
  return `${value.slice(0, keep)}${"•".repeat(8)}${value.slice(-keep)}`;
}
