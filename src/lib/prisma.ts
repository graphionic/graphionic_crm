import { PrismaClient } from "@prisma/client";

// Fix common copy-paste issue: Neon dashboard sometimes copies &amp; instead of &
// and Vercel env var input may include quotes. Sanitize once at startup.
function sanitizeUrl(url?: string) {
  if (!url) return url;
  return url.trim().replace(/^["']|["']$/g, "").replace(/&amp;/g, "&");
}
if (process.env.DATABASE_URL) process.env.DATABASE_URL = sanitizeUrl(process.env.DATABASE_URL);
if (process.env.DIRECT_URL) process.env.DIRECT_URL = sanitizeUrl(process.env.DIRECT_URL);
if (process.env.SETTINGS_ENCRYPTION_KEY) {
  process.env.SETTINGS_ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/&amp;/g, "&");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
