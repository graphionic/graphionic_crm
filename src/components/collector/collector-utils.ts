export const GENERIC_WEBMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'proton.me', 'yandex.com', 'mail.com',
  'gmx.com', 'zoho.com', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.co.uk',
  'live.com', 'msn.com', 'googlemail.com', 'ymail.com', 'inbox.com',
  'me.com', 'mac.com', 'qq.com', '163.com', '126.com'
]);

export function formatCountdown(nextEligible: string | null) {
  if (!nextEligible) return "Now";
  const now = Date.now();
  const next = new Date(nextEligible).getTime();
  const diff = next - now;
  if (diff <= 0) return "Now";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins > 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function githubRunUrl(runId: string | number | null | undefined) {
  if (!runId) return null;
  const idStr = String(runId).trim();
  if (!/^\d+$/.test(idStr)) return null;
  return `https://github.com/graphionic/graphionic_crm/actions/runs/${idStr}`;
}

export function humanReadableRejection(reason: string | null | undefined): string {
  if (!reason) return "—";
  const map: Record<string, string> = {
    existing_website: "Existing website",
    email_domain_has_live_website: "Email domain has live website",
    generic_email: "Generic email domain",
    invalid_email: "Invalid email format",
    duplicate_in_run: "Duplicate in run",
    duplicate_email: "Duplicate email",
    duplicate_company_city: "Duplicate company & city",
    duplicate: "Duplicate business",
    enrichment_failed: "Enrichment failed",
    no_email: "No email discovered",
    known_website: "Known website tag",
  };
  return map[reason] || reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function humanReadableSource(source: string | null | undefined): string {
  if (!source) return "OpenStreetMap";
  if (source.toLowerCase().includes("overpass")) return "OpenStreetMap (Overpass)";
  if (source.toLowerCase().includes("google")) return "Google Places";
  return source;
}

export function humanReadableExternalType(type: string | null | undefined): string {
  if (!type) return "Entity";
  const map: Record<string, string> = {
    node: "Node",
    way: "Way",
    relation: "Relation",
    google_place: "Place",
  };
  return map[type.toLowerCase()] || type.toUpperCase();
}

export function classifyEmail(email: string | null | undefined): {
  status: "VALID_BUSINESS" | "GENERIC_WEBMAIL" | "NONE" | "INVALID";
  domain: string | null;
  label: string;
} {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { status: "NONE", domain: null, label: "No email discovered" };
  }
  const clean = email.trim().toLowerCase();
  const at = clean.lastIndexOf("@");
  if (at <= 0 || at === clean.length - 1) {
    return { status: "INVALID", domain: null, label: "Invalid email format" };
  }
  const domain = clean.slice(at + 1);
  if (GENERIC_WEBMAIL_DOMAINS.has(domain)) {
    return { status: "GENERIC_WEBMAIL", domain, label: `Generic webmail (${domain})` };
  }
  return { status: "VALID_BUSINESS", domain, label: `Business domain (${domain})` };
}

export function statusBadgeStyle(status: string) {
  switch (status) {
    case "NEEDS_ENRICHMENT":
      return { bg: "#FFF6E3", color: "#B7791F", border: "#F4BE52", label: "Needs Enrichment" };
    case "REJECTED":
      return { bg: "#FDECEC", color: "#C53030", border: "#FBD5D5", label: "Rejected" };
    case "QUALIFIED":
      return { bg: "#EEF8F4", color: "#276749", border: "#D5F0E5", label: "Qualified" };
    case "DISCOVERED":
      return { bg: "#F0ECFA", color: "#553C9A", border: "#E0D6F5", label: "Discovered" };
    case "VERIFICATION_PENDING":
      return { bg: "#EAF7FA", color: "#2B6CB0", border: "#C5E9F1", label: "Verification Pending" };
    default:
      return { bg: "#FAF9F7", color: "#60697A", border: "#E5E3DF", label: status || "Unknown" };
  }
}

export function humanReadableDecision(candidate: any): {
  statusTitle: string;
  summary: string;
  emailEvidence: string;
  websiteEvidence: string;
  result: string;
  tone: "good" | "warn" | "bad" | "neutral";
} {
  if (!candidate) {
    return {
      statusTitle: "Unknown",
      summary: "No candidate data available.",
      emailEvidence: "Not checked",
      websiteEvidence: "Not checked",
      result: "Unknown",
      tone: "neutral",
    };
  }

  const status = candidate.status;
  const reason = candidate.rejectionReason;
  const emailClass = classifyEmail(candidate.email);
  const website = candidate.website;
  const rawTags = candidate.rawTags || {};
  const meta = candidate.metadata || {};

  if (status === "QUALIFIED") {
    return {
      statusTitle: "Qualified Lead",
      summary: "Passed all qualification filters. Valid business email and verified no website.",
      emailEvidence: candidate.email ? `Verified business email: ${candidate.email}` : "Email supplied",
      websiteEvidence: "No website supplied by discovery source or external verification",
      result: "Promoted to CRM Lead pipeline",
      tone: "good",
    };
  }

  if (status === "REJECTED") {
    if (reason === "existing_website" || website) {
      return {
        statusTitle: "Rejected — Existing Website",
        summary: "Discovery source tags contained an existing website URL.",
        emailEvidence: candidate.email ? `Email: ${candidate.email}` : "No email discovered",
        websiteEvidence: `Website supplied by OpenStreetMap: ${website || rawTags.website || "URL in tags"}`,
        result: "Not eligible for TRUE_NO_SITE outreach pipeline",
        tone: "bad",
      };
    }
    if (reason === "email_domain_has_live_website") {
      const dom = emailClass.domain || meta.normalizedEmail?.split("@")[1] || "domain";
      return {
        statusTitle: "Rejected — Live Website on Email Domain",
        summary: `Email domain has a live website responding on https://${dom}.`,
        emailEvidence: `Business email: ${candidate.email || meta.normalizedEmail || "—"}`,
        websiteEvidence: `Live website verified on domain: https://${dom}`,
        result: "Excluded to prevent false NO_SITE outreach to companies with active websites",
        tone: "bad",
      };
    }
    if (reason === "generic_email") {
      return {
        statusTitle: "Rejected — Generic Email Domain",
        summary: `Candidate email uses a generic consumer webmail provider (${emailClass.domain || "generic"}).`,
        emailEvidence: `Generic email: ${candidate.email}`,
        websiteEvidence: website ? `Website: ${website}` : "No website supplied",
        result: "Excluded because business identity cannot be verified against consumer webmail",
        tone: "bad",
      };
    }
    if (reason === "duplicate" || reason === "duplicate_in_run" || reason === "duplicate_email" || reason === "duplicate_company_city") {
      return {
        statusTitle: "Rejected — Duplicate Business",
        summary: "This business was previously collected in the current run or existing database.",
        emailEvidence: candidate.email ? `Email: ${candidate.email}` : "No email discovered",
        websiteEvidence: website ? `Website: ${website}` : "No website supplied",
        result: "Excluded to prevent duplicate CRM records",
        tone: "bad",
      };
    }
    return {
      statusTitle: `Rejected — ${humanReadableRejection(reason)}`,
      summary: `Candidate did not meet qualification rules (${reason || "unspecified reason"}).`,
      emailEvidence: candidate.email ? `Email: ${candidate.email}` : "No email discovered",
      websiteEvidence: website ? `Website: ${website}` : "No website supplied",
      result: "Not eligible for CRM Lead promotion",
      tone: "bad",
    };
  }

  if (status === "NEEDS_ENRICHMENT") {
    return {
      statusTitle: "Needs Enrichment",
      summary: "Discovered business lacks an email address and has no website tag.",
      emailEvidence: "No email supplied by discovery source",
      websiteEvidence: "No website supplied by discovery source",
      result: "Stored safely in discovery queue — pending email enrichment",
      tone: "warn",
    };
  }

  if (status === "VERIFICATION_PENDING") {
    return {
      statusTitle: "Verification Pending",
      summary: "Discovered with contact data — awaiting cross-source website verification.",
      emailEvidence: candidate.email ? `Email: ${candidate.email}` : "Contact data present",
      websiteEvidence: "Website status pending verification",
      result: "Queued for website verification",
      tone: "neutral",
    };
  }

  return {
    statusTitle: "Discovered",
    summary: "Initial discovery state.",
    emailEvidence: candidate.email || "No email discovered",
    websiteEvidence: website || "No website supplied",
    result: "Pending qualification evaluation",
    tone: "neutral",
  };
}
