// Shared constants — safe to import from client components.

export const LEAD_STATUSES = [
  { value: "NEW", label: "New", tone: "slate" },
  { value: "QUALIFIED", label: "Qualified", tone: "blue" },
  { value: "CONTACTED", label: "Contacted", tone: "amber" },
  { value: "REPLIED", label: "Replied", tone: "violet" },
  { value: "CALL_BOOKED", label: "Call booked", tone: "cyan" },
  { value: "PROPOSAL_SENT", label: "Proposal sent", tone: "indigo" },
  { value: "WON", label: "Won", tone: "green" },
  { value: "NURTURE", label: "Nurture", tone: "amber" },
  { value: "LOST", label: "Lost", tone: "red" },
] as const;

export const COUNTRIES = [
  { value: "UK", label: "United Kingdom", dial: "44", currency: "GBP" },
  { value: "USA", label: "United States", dial: "1", currency: "USD" },
  { value: "UAE", label: "United Arab Emirates", dial: "971", currency: "AED" },
  { value: "AU", label: "Australia", dial: "61", currency: "AUD" },
  { value: "CA", label: "Canada", dial: "1", currency: "CAD" },
  { value: "SG", label: "Singapore", dial: "65", currency: "SGD" },
  { value: "IN", label: "India", dial: "91", currency: "INR" },
  { value: "OTHER", label: "Other", dial: "", currency: "USD" },
] as const;

export const SEGMENTS = [
  { value: "NO_SITE", label: "No website", tone: "red", weight: 100 },
  { value: "BROKEN", label: "Broken", tone: "amber", weight: 75 },
  { value: "OUTDATED", label: "Outdated", tone: "amber", weight: 35 },
  { value: "UNCHECKED", label: "Unchecked", tone: "slate", weight: 55 },
  { value: "OK", label: "Fine", tone: "green", weight: 15 },
] as const;

export const BUSINESS_CATEGORIES = [
  "Dental Clinic",
  "Medical / GP Practice",
  "Physiotherapy",
  "Aesthetics / Beauty",
  "Veterinary",
  "Plumber",
  "Electrician",
  "Roofer",
  "Landscaper / Gardener",
  "Builder / Construction",
  "Accountant / Bookkeeping",
  "Solicitor / Legal",
  "Recruitment Agency",
  "Marketing Agency",
  "Web / Design Agency",
  "SEO Agency",
  "Consultancy",
  "E-commerce / Retail",
  "Restaurant / Cafe",
  "Hotel / Hospitality",
  "Gym / Fitness",
  "Real Estate",
  "SaaS / Software",
  "Other",
] as const;

export const ACTIVITY_TYPES = [
  "EMAIL",
  "WHATSAPP",
  "CALL",
  "NOTE",
  "STATUS",
  "TASK",
] as const;

export function statusTone(status: string): string {
  const s = LEAD_STATUSES.find((x) => x.value === status);
  return s?.tone ?? "slate";
}

export function segmentTone(segment: string | null | undefined): string {
  const s = SEGMENTS.find((x) => x.value === segment);
  return s?.tone ?? "slate";
}

export function countryLabel(code: string | null | undefined): string {
  return COUNTRIES.find((c) => c.value === code)?.label ?? (code || "—");
}

export function money(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  const symbols: Record<string, string> = {
    USD: "$", GBP: "£", AED: "AED ", INR: "₹", AUD: "A$", CAD: "C$", SGD: "S$",
  };
  return `${symbols[currency] ?? ""}${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}
