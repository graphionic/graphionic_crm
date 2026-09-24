export const GENERIC_WEBMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'proton.me', 'yandex.com', 'mail.com',
  'gmx.com', 'zoho.com', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.co.uk',
  'live.com', 'msn.com', 'googlemail.com', 'ymail.com', 'inbox.com',
  'me.com', 'mac.com', 'qq.com', '163.com', '126.com'
]);

export function formatCountdown(nextEligible: string | null) {
  if (!nextEligible) return "Ready now";
  const now = Date.now();
  const next = new Date(nextEligible).getTime();
  const diff = next - now;
  if (diff <= 0) return "Ready now";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function formatDuration(durationOrSeconds: number | null | undefined, unit: "ms" | "s" = "ms"): string {
  if (durationOrSeconds == null || isNaN(durationOrSeconds) || durationOrSeconds < 0) return "—";
  const ms = unit === "s" ? durationOrSeconds * 1000 : durationOrSeconds;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSecs = Math.round(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const remSecs = totalSecs % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}m ${remSecs}s`;
}

export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Never";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = Date.now();
  const diff = now - date.getTime();
  if (isNaN(diff)) return "—";
  if (diff < 0) return "Just now";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatYieldRate(qualified: number | null | undefined, total: number | null | undefined): string {
  if (!total || total <= 0 || !qualified || qualified <= 0) return "—";
  const pct = (qualified / total) * 100;
  return `${pct.toFixed(1)}%`;
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

export function runStatusBadgeStyle(status: string | null | undefined) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "SUCCESS":
    case "COMPLETED":
      return { bg: "#EEF8F4", color: "#276749", border: "#D5F0E5", label: "Success" };
    case "FAILED":
    case "ERROR":
      return { bg: "#FDECEC", color: "#EC6262", border: "#FBD5D5", label: "Failed" };
    case "RUNNING":
    case "IN_PROGRESS":
      return { bg: "#FFF6E3", color: "#F29B38", border: "#F4BE52", label: "Running" };
    default:
      return { bg: "#FAF9F7", color: "#60697A", border: "#E5E3DF", label: status || "Unknown" };
  }
}

export function rotationStateBadge(nextEligible: string | null | undefined, lastRun: string | null | undefined) {
  if (!lastRun) {
    return { state: "NEVER_RUN" as const, label: "Never run", bg: "#FAF9F7", color: "#9299A8", border: "#E5E3DF" };
  }
  if (!nextEligible) {
    return { state: "READY" as const, label: "Ready now", bg: "#EEF8F4", color: "#276749", border: "#D5F0E5" };
  }
  const diff = new Date(nextEligible).getTime() - Date.now();
  if (diff <= 0) {
    return { state: "READY" as const, label: "Ready now", bg: "#EEF8F4", color: "#276749", border: "#D5F0E5" };
  }
  return { state: "COOLING" as const, label: "Cooling down", bg: "#FFF6E3", color: "#B7791F", border: "#F4BE52" };
}

export function sourceHealthBadgeStyle(status: string | null | undefined) {
  const norm = (status || "").toLowerCase();
  switch (norm) {
    case "healthy":
    case "operational":
      return { bg: "#EEF8F4", color: "#276749", border: "#D5F0E5", label: "Healthy" };
    case "degraded":
      return { bg: "#FFF6E3", color: "#F29B38", border: "#F4BE52", label: "Degraded" };
    case "down":
    case "error":
      return { bg: "#FDECEC", color: "#EC6262", border: "#FBD5D5", label: "Down" };
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
