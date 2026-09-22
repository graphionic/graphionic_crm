import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

/**
 * Secure credential encryption for ProviderCredential
 * Uses CREDENTIAL_ENCRYPTION_KEY env var (32 bytes base64)
 * Falls back to SETTINGS_ENCRYPTION_KEY if CREDENTIAL_ENCRYPTION_KEY not set (for dev convenience)
 * Never store raw API keys in DB
 */

function getEncryptionKey(): Buffer {
  let raw = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("CREDENTIAL_ENCRYPTION_KEY or SETTINGS_ENCRYPTION_KEY is not set. Generate with: openssl rand -base64 32");

  raw = raw.trim().replace(/^["']|["']$/g, "").trim();
  raw = raw.replace(/&amp;/g, "&");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must be 32 bytes base64 (got ${buf.length} bytes). Generate with: openssl rand -base64 32 — starts with: ${raw.slice(0, 8)}...`
    );
  }
  return buf;
}

export function encryptCredential(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptCredential(payload: string): string {
  if (!payload?.startsWith("v1.")) return payload;
  const [, ivB64, dataB64, tagB64] = payload.split(".");
  try {
    const decipher = crypto.createDecipheriv(ALGO, getEncryptionKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Could not decrypt credential. Was CREDENTIAL_ENCRYPTION_KEY changed?");
  }
}

/** Mask API key for UI: sk-...9K2A -> ••••9K2A or last 4 */
export function maskCredential(value: string, keep = 4): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= keep) return "•".repeat(trimmed.length);
  const last = trimmed.slice(-keep);
  return `••••••••••••••••${last}`;
}

export function getKeyHint(value: string, keep = 4): string {
  if (!value) return "";
  return value.slice(-keep);
}
