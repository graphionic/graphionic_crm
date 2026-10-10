/**
 * Backfill script for Roadmap #4: Lead Local-Time Awareness
 * Runs deterministic timezone resolution on all existing leads.
 *
 * Run with: npx tsx scripts/backfill-lead-timezones.ts
 */

import { PrismaClient } from "@prisma/client";
import { resolveLeadTimezone } from "../src/lib/lead-timezone";
import { isValidTimeZone } from "../src/lib/timezone";

const prisma = new PrismaClient();

async function backfill() {
  console.log("=== CLIENTFORGE ROADMAP #4: LEAD TIMEZONE BACKFILL ===\n");

  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      companyName: true,
      country: true,
      city: true,
      region: true,
      timezone: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total leads to evaluate: ${leads.length}\n`);

  let resolvedCount = 0;
  let unknownCount = 0;
  let alreadySetCount = 0;
  const distribution: Record<string, number> = {};

  for (const lead of leads) {
    let finalTimezone: string | null = null;

    if (lead.timezone && isValidTimeZone(lead.timezone)) {
      finalTimezone = lead.timezone;
      alreadySetCount++;
    } else {
      const resolved = resolveLeadTimezone({
        country: lead.country,
        city: lead.city,
        region: lead.region,
      });

      if (resolved && isValidTimeZone(resolved)) {
        finalTimezone = resolved;
        await prisma.lead.update({
          where: { id: lead.id },
          data: { timezone: resolved },
        });
        resolvedCount++;
      } else {
        unknownCount++;
      }
    }

    if (finalTimezone) {
      distribution[finalTimezone] = (distribution[finalTimezone] || 0) + 1;
    }
  }

  console.log("---------------- BACKFILL SUMMARY ----------------");
  console.log(`Total Leads Evaluated:   ${leads.length}`);
  console.log(`Newly Resolved & Stored: ${resolvedCount}`);
  console.log(`Previously Set:          ${alreadySetCount}`);
  console.log(`Total With Timezone:     ${resolvedCount + alreadySetCount}`);
  console.log(`Remaining Unknown:       ${unknownCount}`);
  console.log("--------------------------------------------------");

  console.log("\nTimezone Distribution:");
  const sortedDist = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  for (const [tz, count] of sortedDist) {
    const pct = ((count / leads.length) * 100).toFixed(1);
    console.log(`  - ${tz.padEnd(25)} : ${String(count).padStart(3)} leads (${pct}%)`);
  }

  console.log("\n✓ Backfill script finished successfully.");
}

backfill()
  .catch((e) => {
    console.error("FATAL backfill error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
