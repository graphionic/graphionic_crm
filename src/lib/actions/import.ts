"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { parseCsv, mapRow, guessCountry } from "@/lib/csv";

export type ImportResult = {
  ok: boolean;
  message: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
};

/**
 * Bulk upsert leads from CSV text.
 *
 * Dedupe order: companyNumber → email → companyName+postcode.
 * Re-importing the same file updates instead of duplicating, so you can
 * refresh a qualified list every month without creating duplicates.
 */
export async function importLeadsCsv(csvText: string): Promise<ImportResult> {
  await requireActiveUser();

  if (!csvText.trim()) return { ok: false, message: "Nothing to import." };

  const { headers, rows } = parseCsv(csvText);
  if (rows.length === 0) {
    return { ok: false, message: "No data rows found. Is the first line a header row?" };
  }

  const mapped = rows.map(mapRow).filter((r) => r.companyName);
  if (mapped.length === 0) {
    return {
      ok: false,
      message: `Found ${rows.length} rows but no company name column. Detected headers: ${headers.slice(0, 12).join(", ")}`,
    };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of mapped) {
    try {
      const country =
        (r.country || "").toUpperCase().slice(0, 3) ||
        guessCountry(r.address || "") ||
        "UK";

      const data = {
        companyName: r.companyName!,
        businessCategory: r.businessCategory || null,
        industry: r.industry || null,
        country: country === "UNI" ? "UK" : country,
        city: r.city || null,
        region: r.region || null,
        address: r.address || null,
        postcode: r.postcode || null,
        companyNumber: r.companyNumber || null,
        companyUrl: r.companyUrl || null,
        website: r.website || null,
        websiteStatus: r.websiteStatus || null,
        segment: r.segment || null,
        score: r.score ? Math.max(0, Math.min(100, parseInt(r.score, 10) || 0)) : 0,
        issues: r.issues || null,
        hookLine: r.hookLine || null,
        contactName: r.contactName || null,
        contactRole: r.contactRole || null,
        email: r.email || null,
        phone: r.phone || null,
        whatsapp: r.whatsapp || null,
        linkedin: r.linkedin || null,
        source: r.source || "csv_import",
        status: r.status || "NEW",
        priority: r.priority || "MEDIUM",
        notes: r.notes || null,
        tags: r.tags || null,
        // Imported UK Ltd/LLP companies: cold B2B email is lawful, so the
        // email opt-in box is ticked automatically. WhatsApp is NEVER
        // auto-ticked — that needs real consent from the person.
        optedInEmail: true,
      };

      // ---- find an existing match ----
      let existing = null;
      if (data.companyNumber) {
        existing = await prisma.lead.findFirst({ where: { companyNumber: data.companyNumber } });
      }
      if (!existing && data.email) {
        existing = await prisma.lead.findFirst({ where: { email: data.email } });
      }
      if (!existing && data.companyName) {
        existing = await prisma.lead.findFirst({
          where: {
            companyName: data.companyName,
            ...(data.postcode ? { postcode: data.postcode } : {}),
          },
        });
      }

      if (existing) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            ...data,
            // don't clobber a human-edited field with a blank from the CSV
            notes: data.notes ?? existing.notes,
            hookLine: data.hookLine ?? existing.hookLine,
            website: data.website ?? existing.website,
          },
        });
        updated++;
      } else {
        await prisma.lead.create({
          data: {
            ...data,
            activities: {
              create: { type: "STATUS", direction: "OUT", body: `Imported from CSV (source: ${data.source})` },
            },
          },
        });
        inserted++;
      }
    } catch (e) {
      skipped++;
      if (errors.length < 5) errors.push(`${r.companyName}: ${(e as Error).message}`);
    }
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Imported ${inserted} new, updated ${updated}${skipped ? `, skipped ${skipped}` : ""}.`,
    inserted,
    updated,
    skipped,
    errors,
  };
}
