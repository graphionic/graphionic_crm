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

export function humanReadableRejection(reason: string | null | undefined) {
  if (!reason) return "—";
  const map: Record<string, string> = {
    existing_website: "Existing Website",
    generic_email: "Generic Email",
    invalid_email: "Invalid Email",
    email_domain_has_live_website: "Email Domain Has Live Website",
    duplicate_in_run: "Duplicate in Run",
    duplicate_email: "Duplicate Email",
    duplicate_company_city: "Duplicate Company/City",
    duplicate: "Duplicate",
    enrichment_failed: "Enrichment Failed",
  };
  return map[reason] || reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function statusBadgeStyle(status: string) {
  switch (status) {
    case "NEEDS_ENRICHMENT":
      return { bg: "#FFF6E3", color: "#B7791F", border: "#F4BE52" };
    case "REJECTED":
      return { bg: "#FDECEC", color: "#C53030", border: "#FBD5D5" };
    case "QUALIFIED":
      return { bg: "#EEF8F4", color: "#276749", border: "#D5F0E5" };
    case "DISCOVERED":
      return { bg: "#F0ECFA", color: "#553C9A", border: "#E0D6F5" };
    case "VERIFICATION_PENDING":
      return { bg: "#EAF7FA", color: "#2B6CB0", border: "#C5E9F1" };
    default:
      return { bg: "#FAF9F7", color: "#60697A", border: "#E5E3DF" };
  }
}
