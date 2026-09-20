#!/usr/bin/env node
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter(r => r.some(c => c.trim() !== ""));
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map(h => h.trim());
  const out = nonEmpty.slice(1).map(r => {
    const o = {}; headers.forEach((h, idx) => o[h] = (r[idx] ?? "").trim()); return o;
  });
  return { headers, rows: out };
}

const ALIASES = {
  company_name: "companyName", companyname: "companyName", company: "companyName", "company name": "companyName", business_name: "companyName", name: "companyName", business: "companyName", organization: "companyName", "organization name": "companyName",
  business_category: "businessCategory", category: "businessCategory", industry: "industry", sector: "industry",
  country: "country", city: "city", town: "city", region: "region", county: "region", address: "address", registered_address: "address", "registered address": "address", postcode: "postcode", post_code: "postcode", zip: "postcode",
  company_number: "companyNumber", "company number": "companyNumber", companies_house_url: "companyUrl", company_url: "companyUrl",
  website: "website", site: "website", url: "website", website_status: "websiteStatus", segment: "segment", score: "score", issues: "issues", hook_line: "hookLine", "hook line": "hookLine",
  decision_maker: "contactName", contact_name: "contactName", "contact name": "contactName", person_name: "contactName", "person name": "contactName", full_name: "contactName", first_name: "contactName", owner: "contactName", contact_role: "contactRole", role: "contactRole", job_title: "contactRole", title: "contactRole",
  email: "email", email_address: "email", "email address": "email", work_email: "email",
  phone: "phone", phone_number: "phone", "phone number": "phone", telephone: "phone", mobile: "phone", contact_no: "phone", "contact no": "phone",
  whatsapp: "whatsapp", whatsapp_number: "whatsapp",
  linkedin: "linkedin", linkedin_url: "linkedin", "linkedin url": "linkedin",
  source: "source", notes: "notes", tags: "tags", status: "status", priority: "priority",
};

function mapRow(row) {
  const out = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = rawKey.trim().toLowerCase().replace(/\s+/g, " ");
    const target = ALIASES[key];
    if (target && value) out[target] = value;
  }
  return out;
}

function guessCountry(address) {
  const a = (address || "").toLowerCase();
  if (/\b(united kingdom|england|scotland|wales|northern ireland|uk)\b/.test(a)) return "UK";
  if (/\b(united states|usa|california|texas|new york|florida)\b/.test(a)) return "USA";
  if (/\b(united arab emirates|uae|dubai|abu dhabi|sharjah)\b/.test(a)) return "UAE";
  return "";
}

async function importFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  skip ${filePath} — not found`);
    return { inserted: 0, updated: 0 };
  }
  const text = fs.readFileSync(filePath, "utf8");
  const { rows } = parseCsv(text);
  const mapped = rows.map(mapRow).filter(r => r.companyName);
  console.log(`  ${filePath}: ${rows.length} rows → ${mapped.length} with companyName`);
  let inserted = 0, updated = 0, skipped = 0;
  for (const r of mapped) {
    try {
      const country = (r.country || "").toUpperCase().slice(0, 3) || guessCountry(r.address || "") || "UK";
      const data = {
        companyName: r.companyName,
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
        optedInEmail: true,
      };
      let existing = null;
      if (data.companyNumber) existing = await prisma.lead.findFirst({ where: { companyNumber: data.companyNumber } });
      if (!existing && data.email) existing = await prisma.lead.findFirst({ where: { email: data.email } });
      if (!existing && data.companyName) existing = await prisma.lead.findFirst({ where: { companyName: data.companyName, ...(data.postcode ? { postcode: data.postcode } : {}) } });
      if (existing) {
        await prisma.lead.update({ where: { id: existing.id }, data: { ...data, notes: data.notes ?? existing.notes, hookLine: data.hookLine ?? existing.hookLine, website: data.website ?? existing.website } });
        updated++;
      } else {
        await prisma.lead.create({ data: { ...data, activities: { create: { type: "STATUS", direction: "OUT", body: `Imported from ${filePath}` } } } });
        inserted++;
      }
    } catch (e) {
      skipped++;
      if (skipped < 5) console.log(`    error ${r.companyName}: ${e.message}`);
    }
  }
  console.log(`    → inserted ${inserted}, updated ${updated}, skipped ${skipped}`);
  return { inserted, updated };
}

async function main() {
  const base = "/home/user/leads";
  const files = [
    `${base}/leads-dental-qualified.csv`,
    `${base}/leads-trades-qualified.csv`,
    `${base}/leads-agencies.csv`,
  ];
  let totalIns = 0, totalUpd = 0;
  for (const f of files) {
    const r = await importFile(f);
    totalIns += r.inserted;
    totalUpd += r.updated;
  }
  console.log(`\nTOTAL: inserted ${totalIns}, updated ${totalUpd}`);
  const counts = await prisma.lead.groupBy({ by: ["segment"], _count: { _all: true } });
  console.log("Segments:", counts);
  const total = await prisma.lead.count();
  console.log(`Leads in DB: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
