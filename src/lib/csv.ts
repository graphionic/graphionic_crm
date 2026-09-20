// Small dependency-free CSV parser. Handles quoted fields, escaped quotes,
// CRLF, and BOM. Good enough for the Companies House / Apollo exports.

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const out = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows: out };
}

/**
 * Maps whatever column names the source file uses onto our Lead fields.
 * Handles the exact output of uk_leads.py / enrich_leads.py / qualify_leads.py
 * as well as common Apollo / manual spreadsheets.
 */
const ALIASES: Record<string, string> = {
  // company
  company_name: "companyName",
  companyname: "companyName",
  company: "companyName",
  "company name": "companyName",
  business_name: "companyName",
  name: "companyName",
  business: "companyName",
  organization: "companyName",
  "organization name": "companyName",

  business_category: "businessCategory",
  category: "businessCategory",
  industry: "industry",
  sector: "industry",

  country: "country",
  city: "city",
  town: "city",
  region: "region",
  county: "region",
  address: "address",
  registered_address: "address",
  "registered address": "address",
  postcode: "postcode",
  post_code: "postcode",
  zip: "postcode",

  company_number: "companyNumber",
  "company number": "companyNumber",
  companies_house_url: "companyUrl",
  company_url: "companyUrl",

  // website analysis
  website: "website",
  site: "website",
  url: "website",
  website_status: "websiteStatus",
  segment: "segment",
  score: "score",
  issues: "issues",
  hook_line: "hookLine",
  "hook line": "hookLine",

  // contact
  decision_maker: "contactName",
  contact_name: "contactName",
  "contact name": "contactName",
  person_name: "contactName",
  "person name": "contactName",
  full_name: "contactName",
  first_name: "contactName",
  owner: "contactName",
  contact_role: "contactRole",
  role: "contactRole",
  job_title: "contactRole",
  title: "contactRole",

  email: "email",
  email_address: "email",
  "email address": "email",
  work_email: "email",

  phone: "phone",
  phone_number: "phone",
  "phone number": "phone",
  telephone: "phone",
  mobile: "phone",
  contact_no: "phone",
  "contact no": "phone",

  whatsapp: "whatsapp",
  whatsapp_number: "whatsapp",

  linkedin: "linkedin",
  linkedin_url: "linkedin",
  "linkedin url": "linkedin",

  source: "source",
  notes: "notes",
  tags: "tags",
  status: "status",
  priority: "priority",
};

export function mapRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = rawKey.trim().toLowerCase().replace(/\s+/g, " ");
    const target = ALIASES[key];
    if (target && value) out[target] = value;
  }
  return out;
}

/** Guess the country from an address string when the column is missing. */
export function guessCountry(address: string): string {
  const a = (address || "").toLowerCase();
  if (/\b(united kingdom|england|scotland|wales|northern ireland|uk)\b/.test(a)) return "UK";
  if (/\b(united states|usa|california|texas|new york|florida)\b/.test(a)) return "USA";
  if (/\b(united arab emirates|uae|dubai|abu dhabi|sharjah)\b/.test(a)) return "UAE";
  if (/\b(australia|nsw|victoria|queensland)\b/.test(a)) return "AU";
  if (/\b(canada|ontario|quebec|british columbia)\b/.test(a)) return "CA";
  return "";
}
