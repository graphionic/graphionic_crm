import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface VerifiedLeadInput {
  companyName: string;
  businessCategory: string;
  industry: string;
  country: string;
  city: string;
  region: string;
  address: string;
  postcode: string;
  website: null;
  websiteStatus: string;
  segment: string;
  status: string;
  priority: string;
  score: number;
  contactName?: string | null;
  contactRole?: string | null;
  email?: string | null;
  phone?: string | null;
  source: string;
  dealValueCents: number;
  quotedCurrency: string;
  hookLine: string;
  notes: string;
  tags: string;
}

const verifiedLeads: VerifiedLeadInput[] = [
  {
    companyName: "Lisa Brassington Physiotherapy",
    businessCategory: "Specialist Physiotherapy",
    industry: "Healthcare & Physical Therapy",
    country: "United Kingdom",
    city: "Nottingham",
    region: "East Midlands",
    address: "11 Clumber Avenue, Mapperley",
    postcode: "NG3 5JY",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 85,
    contactName: "Lisa Brassington",
    contactRole: "Specialist Neurological Physiotherapist / Director",
    email: "lisabphysio@outlook.com",
    phone: "+447887907044",
    source: "Manual Research",
    dealValueCents: 150000,
    quotedCurrency: "GBP",
    hookLine: "Specialist neurological physiotherapy clinic in Nottingham offering home visits and clinical assessments without an official website.",
    notes: "Verified via CSP and clinical directory with public direct mobile and email. High conversion potential for a bespoke service website with online appointment requests.",
    tags: "manual-research,uk-expansion,no-website,physiotherapy,healthcare,high-priority"
  },
  {
    companyName: "Mode Aesthetics",
    businessCategory: "Medical & Cosmetic Aesthetics",
    industry: "Health & Beauty",
    country: "United Kingdom",
    city: "Liverpool",
    region: "North West",
    address: "58 St Mary's Road, Garston",
    postcode: "L19 2JD",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 85,
    contactName: null,
    contactRole: "Clinic Lead",
    email: "modegarston@gmail.com",
    phone: "+441512467988",
    source: "Manual Research",
    dealValueCents: 175000,
    quotedCurrency: "GBP",
    hookLine: "Aesthetics and beauty clinic on St Mary's Road in Garston, Liverpool operating without a standalone website.",
    notes: "Verified physical clinic on St Mary's Road in South Liverpool with direct phone and email. Strong commercial fit for treatment showcases, consultation booking, and price lists.",
    tags: "manual-research,uk-expansion,no-website,aesthetics,beauty-clinic,high-priority"
  },
  {
    companyName: "Adams Accountants",
    businessCategory: "Accounting & Taxation Practice",
    industry: "Financial & Professional Services",
    country: "United Kingdom",
    city: "Birmingham",
    region: "West Midlands",
    address: "274 Green Lane, Small Heath",
    postcode: "B9 5DL",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Practice Manager",
    email: null,
    phone: "+441217726555",
    source: "Manual Research",
    dealValueCents: 200000,
    quotedCurrency: "GBP",
    hookLine: "Independent accountancy practice in Small Heath, Birmingham providing tax and bookkeeping services without an official website.",
    notes: "Established independent practice on Green Lane in Birmingham. High local business clientele demand, ideal candidate for corporate credibility site and client portal gateway.",
    tags: "manual-research,uk-expansion,no-website,accounting,professional-services,high-priority"
  },
  {
    companyName: "Buggins & Co Dental Laboratory",
    businessCategory: "Dental Laboratory & Technicians",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Birmingham",
    region: "West Midlands",
    address: "33 Charlotte Road, Stirchley",
    postcode: "B30 2BT",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Senior Dental Technician / Managing Director",
    email: null,
    phone: "+441214581993",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Long-standing dental laboratory in Stirchley, Birmingham providing dental prosthetics and repairs without an official website.",
    notes: "C.E. Buggins & Co. Ltd operating from Stirchley, Birmingham. Commercial B2B laboratory serving local dental clinics without digital presence.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,b2b-healthcare,high-priority"
  },
  {
    companyName: "Dentcraft Dental Laboratory Ltd",
    businessCategory: "Dental Laboratory & Technicians",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Leeds",
    region: "Yorkshire and the Humber",
    address: "28a Hunger Hill, Morley",
    postcode: "LS27 9AD",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Managing Director",
    email: null,
    phone: "+441132537331",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Established dental laboratory in Morley, Leeds providing prosthetic and restorative dental services without an official website.",
    notes: "Independent dental laboratory based in Morley, Leeds. Excellent candidate for digital lab portfolio, lab docket downloads, and practitioner outreach.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,leeds,high-priority"
  },
  {
    companyName: "Cooke & Sevens Dental Laboratory",
    businessCategory: "Dental Laboratory & Technicians",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Leeds",
    region: "Yorkshire and the Humber",
    address: "Unit 5 Ashbrooke Park, Park Road",
    postcode: "LS11 5TD",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Lead Dental Technician",
    email: null,
    phone: "+441132770817",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Commercial dental laboratory at Ashbrooke Park in Leeds manufacturing dental appliances without an official website.",
    notes: "Commercial dental manufacturing unit in South Leeds industrial park. Needs professional B2B site showcasing certifications and lab turnaround schedules.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,leeds,high-priority"
  },
  {
    companyName: "John Foster Private Prosthetics Ltd",
    businessCategory: "DAMAS Dental Laboratory",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Newcastle upon Tyne",
    region: "North East",
    address: "2 Hood Street, Gateshead",
    postcode: "NE16 3HS",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 85,
    contactName: "John Foster",
    contactRole: "Chief Dental Prosthetist / Director",
    email: null,
    phone: "+441914885262",
    source: "Manual Research",
    dealValueCents: 185000,
    quotedCurrency: "GBP",
    hookLine: "DAMAS registered private dental prosthetics laboratory in Gateshead, Newcastle operating without an official website.",
    notes: "DAMAS quality-assured dental prosthetics laboratory serving clinical dentists and patients across Tyne & Wear. Prime candidate for a modern compliance-backed web presence.",
    tags: "manual-research,uk-expansion,no-website,dental-prosthetics,newcastle,damas,high-priority"
  },
  {
    companyName: "Central Crown & Bridge",
    businessCategory: "Crown & Bridge Dental Laboratory",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Edinburgh",
    region: "Scotland",
    address: "6 New Market Road, Slateford",
    postcode: "EH14 1RJ",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Principal Technician",
    email: null,
    phone: "+441314436152",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Specialist crown and bridge dental laboratory in Slateford, Edinburgh producing dental restorations without an official website.",
    notes: "Specialist restorative dental laboratory in Slateford area of Edinburgh with 30+ years track record. High commercial value for Scottish dentist network.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,edinburgh,scotland,high-priority"
  },
  {
    companyName: "Dentec Dental Laboratory",
    businessCategory: "Dental Laboratory & Technicians",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Glasgow",
    region: "Scotland",
    address: "1743 Cumbernauld Road, Millerston",
    postcode: "G33 1AA",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Laboratory Manager",
    email: null,
    phone: "+441417795958",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Dental laboratory on Cumbernauld Road in Glasgow providing dental technician services without an official website.",
    notes: "Established dental appliance laboratory in East Glasgow serving private and NHS practitioners without online visibility.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,glasgow,scotland,high-priority"
  },
  {
    companyName: "The Paul Kallos Dental Laboratory Ltd",
    businessCategory: "Dental Laboratory & Prosthetics",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Glasgow",
    region: "Scotland",
    address: "17 Leven Street, Pollokshields",
    postcode: "G41 2JB",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: "Paul Kallos",
    contactRole: "Managing Director & Dental Technician",
    email: null,
    phone: "+441414231762",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Established dental laboratory on Leven Street in South Glasgow operating without an official website.",
    notes: "Long-standing South Glasgow dental lab with established practitioner relationships in Strathclyde.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,glasgow,scotland,high-priority"
  },
  {
    companyName: "Apex Dental Laboratories",
    businessCategory: "Dental Laboratory & Technicians",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Cardiff",
    region: "Wales",
    address: "101 Whitchurch Road",
    postcode: "CF14 3JQ",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Senior Technician",
    email: null,
    phone: "+442920621536",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Dental laboratory on Whitchurch Road in Cardiff providing dental prosthetics and repairs without an official website.",
    notes: "Cardiff-based dental laboratory serving South Wales dental surgeries. High upside for local market dominance with a focused professional site.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,cardiff,wales,high-priority"
  },
  {
    companyName: "Bristol Denture Repairs Limited",
    businessCategory: "Denture Repair Clinic & Dental Lab",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Bristol",
    region: "South West",
    address: "39-41 High Street, Kingswood",
    postcode: "BS15 4AA",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 85,
    contactName: null,
    contactRole: "Clinical Dental Technician",
    email: null,
    phone: "+441179662225",
    source: "Manual Research",
    dealValueCents: 175000,
    quotedCurrency: "GBP",
    hookLine: "Specialist denture clinic and dental repair laboratory on High Street in Kingswood, Bristol without an official website.",
    notes: "Prime high-street clinic offering direct same-day repairs and prosthetics in Kingswood, Bristol. Prime target for consumer emergency capture and local SEO.",
    tags: "manual-research,uk-expansion,no-website,denture-repairs,bristol,high-priority"
  },
  {
    companyName: "Taylor Dental Laboratory Ltd",
    businessCategory: "Dental Laboratory & Prosthetics",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Leicester",
    region: "East Midlands",
    address: "47 Orson Street",
    postcode: "LE5 5EN",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Principal Dental Technician",
    email: null,
    phone: "+441163195151",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Prosthetic dental laboratory on Orson Street in Leicester providing dental technician services without an official website.",
    notes: "Full prosthetics dental laboratory serving dental clinics across Leicestershire without a digital presence.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,leicester,high-priority"
  },
  {
    companyName: "Denture Care Clinic",
    businessCategory: "Denture Care Clinic & Laboratory",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Leicester",
    region: "East Midlands",
    address: "17 Leicester Road, Blaby",
    postcode: "LE8 4GR",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 85,
    contactName: null,
    contactRole: "Clinical Director",
    email: null,
    phone: "+441162553544",
    source: "Manual Research",
    dealValueCents: 175000,
    quotedCurrency: "GBP",
    hookLine: "Established denture clinic and dental laboratory in Blaby, Leicester operating for over 30 years without an official website.",
    notes: "30+ years in Blaby offering precision partials, implant-retained dentures, and 1-hour emergency repairs without a website.",
    tags: "manual-research,uk-expansion,no-website,denture-clinic,leicester,high-priority"
  },
  {
    companyName: "Brooks Dental Laboratory",
    businessCategory: "Dental Laboratory & Technicians",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Coventry",
    region: "West Midlands",
    address: "106 Marlborough Road",
    postcode: "CV2 4ER",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Principal Dental Technician",
    email: null,
    phone: "+447961169199",
    source: "Manual Research",
    dealValueCents: 175000,
    quotedCurrency: "GBP",
    hookLine: "Dental laboratory on Marlborough Road in Coventry providing dental technician services without an official website.",
    notes: "Independent dental laboratory in Coventry providing prosthetic appliances and dental technician support across the West Midlands.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,coventry,high-priority"
  },
  {
    companyName: "Godiva Dental Laboratories",
    businessCategory: "Dental Laboratory & Prosthetics",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Coventry",
    region: "West Midlands",
    address: "70 Walsgrave Road",
    postcode: "CV2 4EB",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Lead Dental Technician",
    email: null,
    phone: "+442476445443",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Dental laboratory on Walsgrave Road in Coventry providing dental prosthetics and repairs without an official website.",
    notes: "Walsgrave Road dental laboratory in East Coventry delivering prosthetics and repairs for local dentists without a website.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,coventry,high-priority"
  },
  {
    companyName: "Midland Dental Laboratory",
    businessCategory: "Dental Laboratory & Technicians",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Nottingham",
    region: "East Midlands",
    address: "17 Mayfield Drive, Stapleford",
    postcode: "NG9 8JF",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Senior Dental Technician",
    email: null,
    phone: "+441159170020",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Dental laboratory in Stapleford, Nottingham providing dental prosthetics and technician services without an official website.",
    notes: "Specialist prosthetic laboratory in Stapleford, Nottingham serving Nottinghamshire and Derbyshire clinics.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,nottingham,high-priority"
  },
  {
    companyName: "C & S Dental Laboratory Ltd",
    businessCategory: "Dental Laboratory & Denture Repairs",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Liverpool",
    region: "North West",
    address: "3A-4 The Parade, Wavertree",
    postcode: "L15 7JU",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 85,
    contactName: "Paul",
    contactRole: "Lead Technician & Partner",
    email: null,
    phone: "+441513450116",
    source: "Manual Research",
    dealValueCents: 185000,
    quotedCurrency: "GBP",
    hookLine: "Established dental laboratory in Wavertree, Liverpool operating for over 25 years providing prosthetics and same-day repairs without an official website.",
    notes: "25+ years in Wavertree offering prosthetics, complete denture sets, and emergency same-day repairs without a website.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,liverpool,high-priority"
  },
  {
    companyName: "G P C Dental Laboratory Ltd",
    businessCategory: "Dental Laboratory & Restorations",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Sheffield",
    region: "Yorkshire and the Humber",
    address: "2 Carterknowle Road",
    postcode: "S7 2DX",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Principal Dental Technician",
    email: null,
    phone: "+441142589985",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Dental laboratory on Carterknowle Road in Sheffield providing dental crowns, bridges, and prosthetics without an official website.",
    notes: "Sheffield laboratory manufacturing crowns, bridges, implants, and same-day denture repairs without an online presence.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,sheffield,high-priority"
  },
  {
    companyName: "Arch Dental Laboratory Ltd",
    businessCategory: "Dental Laboratory & Medical Supplies",
    industry: "Dental Healthcare & Manufacturing",
    country: "United Kingdom",
    city: "Sheffield",
    region: "Yorkshire and the Humber",
    address: "269 Handsworth Road, Handsworth",
    postcode: "S13 9BN",
    website: null,
    websiteStatus: "MISSING",
    segment: "NO_SITE",
    status: "NEW",
    priority: "HIGH",
    score: 80,
    contactName: null,
    contactRole: "Managing Director",
    email: null,
    phone: "+441142698443",
    source: "Manual Research",
    dealValueCents: 180000,
    quotedCurrency: "GBP",
    hookLine: "Dental laboratory on Handsworth Road in Sheffield providing dental appliances and technician services without an official website.",
    notes: "Established dental appliance laboratory in Handsworth, Sheffield serving dental practices across South Yorkshire without a website.",
    tags: "manual-research,uk-expansion,no-website,dental-laboratory,sheffield,high-priority"
  }
];

async function insertAll() {
  console.log(`Starting insertion of ${verifiedLeads.length} leads...`);
  let inserted = 0;
  let skipped = 0;

  for (const lead of verifiedLeads) {
    const existing = await prisma.lead.findFirst({
      where: {
        OR: [
          { companyName: { equals: lead.companyName, mode: "insensitive" } },
          ...(lead.phone ? [{ phone: { equals: lead.phone } }] : []),
          ...(lead.email ? [{ email: { equals: lead.email, mode: "insensitive" as const } }] : [])
        ]
      }
    });

    if (existing) {
      console.log(`Skipping duplicate: ${lead.companyName} (matches ID: ${existing.id})`);
      skipped++;
      continue;
    }

    const created = await prisma.lead.create({
      data: lead
    });
    console.log(`[${++inserted}/${verifiedLeads.length}] Inserted: ${created.companyName} (${created.id}) - ${created.city}`);
  }

  const finalTotal = await prisma.lead.count();
  const ukTotal = await prisma.lead.count({ where: { country: "United Kingdom" } });
  const noSiteTotal = await prisma.lead.count({ where: { segment: "NO_SITE" } });

  console.log("\n=== INSERTION SUMMARY ===");
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Skipped duplicates: ${skipped}`);
  console.log(`Total Leads in DB: ${finalTotal}`);
  console.log(`UK Leads in DB: ${ukTotal}`);
  console.log(`NO_SITE Leads in DB: ${noSiteTotal}`);
}

insertAll()
  .catch((e) => {
    console.error("Insertion error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
