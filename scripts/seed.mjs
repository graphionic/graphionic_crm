#!/usr/bin/env node
/**
 * Creates (or resets) the admin account from env vars, plus a few starter
 * templates. Safe to run repeatedly — it upserts.
 *
 *   ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME  from .env
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("\n  ✖ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env\n");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("\n  ✖ ADMIN_PASSWORD must be at least 12 characters.\n");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: { passwordHash, name, isActive: true },
  });

  console.log(`\n  ✓ Admin ready: ${user.email}`);
  console.log(`    Password: ${password === process.env.ADMIN_PASSWORD ? "(as set in .env)" : ""}`);

  const existing = await prisma.template.count();
  if (existing === 0) {
    await prisma.template.createMany({
      data: [
        {
          name: "Audit opener",
          channel: "EMAIL",
          subject: "Quick note about {{company}}'s website",
          body: `{{hook_line}}

Three things I'd fix first:
1. {{issue_1}}
2. {{issue_2}}

I build sites for {{category}} businesses and recorded a 60-second walkthrough of exactly what I'd change — no charge, no pitch:

[LOOM LINK]

If it's useful I'll send the fix list. If not, no follow-up from me.

From,
[Your name]
[Your business] · [UK number]`,
        },
        {
          name: "Follow-up 2",
          channel: "EMAIL",
          subject: "Re: quick note about your website",
          body: `Quick add-on to my last note — the mobile issue is the easy fix. The bigger one is that there's no way to book or enquire outside your phone hours, which is when most people actually search.

Worth a 15-minute call? Thursday 10:00 or Friday 14:00 UK time both work.`,
        },
        {
          name: "Close-out",
          channel: "EMAIL",
          subject: "Closing the file on {{company}}",
          body: `I'll stop here — I don't want to clutter your inbox. Three notes and I'm gone:

1. The issue I flagged is still live on your site.
2. If you ever want the fix list, reply "send it" and I'll pass it over with no obligation.
3. If someone else handles the website, feel free to forward this their way.

Best of luck with the business.`,
        },
      ],
    });
    console.log("  ✓ 3 starter email templates created");
  }

  console.log("");
}

main()
  .catch((e) => {
    console.error("\n  ✖ Seed failed:", e.message, "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
