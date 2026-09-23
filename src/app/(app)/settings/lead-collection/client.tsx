"use client";
import { useState, useEffect, useCallback } from "react";

type Tab = "overview" | "general" | "locations" | "categories" | "sources" | "rules" | "runs" | "states" | "candidates";

function formatCountdown(nextEligible: string | null) {
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

function githubRunUrl(runId: string | number | null | undefined) {
  if (!runId) return null;
  const idStr = String(runId).trim();
  if (!/^\d+$/.test(idStr)) return null;
  return `https://github.com/graphionic/graphionic_crm/actions/runs/${idStr}`;
}

function humanReadableRejection(reason: string | null | undefined) {
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
  };
  return map[reason] || reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function statusBadgeStyle(status: string) {
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

export default function LeadCollectionClient({
  initialOverview,
  initialLocations,
  initialCategories,
  initialSources,
  initialCredentials,
  initialRules,
  initialRuns,
  initialStates,
}: any) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState(initialOverview);
  const [locations, setLocations] = useState(initialLocations);
  const [categories, setCategories] = useState(initialCategories);
  const [sources, setSources] = useState(initialSources);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [rules, setRules] = useState(initialRules);
  const [runs, setRuns] = useState(initialRuns);
  const [states, setStates] = useState(initialStates);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);

  const [locForm, setLocForm] = useState({ country: "", countryCode: "", state: "", city: "", latitude: "", longitude: "", radiusKm: "25", priority: "50", priorityLabel: "MEDIUM" });
  const [catForm, setCatForm] = useState({ name: "", slug: "", description: "", priority: "50", priorityLabel: "MEDIUM", osmTags: '["amenity"="dentist"]' });
  const [sourceForm, setSourceForm] = useState({ name: "OpenStreetMap / Overpass", type: "overpass", baseUrl: "https://overpass-api.de/api/interpreter", timeoutMs: "25000", retryCount: "3", concurrency: "15", priority: "50" });
  const [credForm, setCredForm] = useState({ provider: "openai", label: "", apiKey: "" });
  const [ruleForm, setRuleForm] = useState({ key: "", name: "", description: "", category: "lead_requirements" });

  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("");

  // Candidate Queue State
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateSearchDebounced, setCandidateSearchDebounced] = useState("");
  const [candidateStatus, setCandidateStatus] = useState("All");
  const [candidateCategory, setCandidateCategory] = useState("All");
  const [candidateCity, setCandidateCity] = useState("All");
  const [candidateSourceId, setCandidateSourceId] = useState("All");
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidatePageSize, setCandidatePageSize] = useState(25);
  const [candidateSortBy, setCandidateSortBy] = useState("createdAt");
  const [candidateSortOrder, setCandidateSortOrder] = useState<"asc" | "desc">("desc");
  const [candidateData, setCandidateData] = useState<{ candidates: any[]; total: number; page: number; pageSize: number; totalPages: number } | null>(null);
  const [candidateStats, setCandidateStats] = useState<any>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rawTagsOpen, setRawTagsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCandidateSearchDebounced(candidateSearch), 400);
    return () => clearTimeout(t);
  }, [candidateSearch]);

  const fetchCandidateStats = useCallback(async () => {
    try {
      const res = await fetch("/api/collector/candidates/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setCandidateStats(data);
    } catch (e: any) {
      console.error(e);
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    setCandidateLoading(true);
    setCandidateError(null);
    try {
      const params = new URLSearchParams({
        page: String(candidatePage),
        pageSize: String(candidatePageSize),
        sortBy: candidateSortBy,
        sortOrder: candidateSortOrder,
      });
      if (candidateSearchDebounced) params.set("search", candidateSearchDebounced);
      if (candidateStatus && candidateStatus !== "All") params.set("status", candidateStatus);
      if (candidateCategory && candidateCategory !== "All") params.set("category", candidateCategory);
      if (candidateCity && candidateCity !== "All") params.set("city", candidateCity);
      if (candidateSourceId && candidateSourceId !== "All") params.set("sourceId", candidateSourceId);

      const res = await fetch(`/api/collector/candidates?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const data = await res.json();
      setCandidateData(data);
    } catch (e: any) {
      setCandidateError(e.message);
    } finally {
      setCandidateLoading(false);
    }
  }, [candidatePage, candidatePageSize, candidateSearchDebounced, candidateStatus, candidateCategory, candidateCity, candidateSourceId, candidateSortBy, candidateSortOrder]);

  const fetchCandidateDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setSelectedCandidateId(id);
    setDetailOpen(true);
    setRawTagsOpen(false);
    try {
      const res = await fetch(`/api/collector/candidates/${id}`);
      if (!res.ok) throw new Error("Failed to fetch candidate detail");
      const data = await res.json();
      setSelectedCandidate(data);
    } catch (e: any) {
      setSelectedCandidate(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "candidates") {
      fetchCandidateStats();
    }
  }, [activeTab, fetchCandidateStats]);

  useEffect(() => {
    if (activeTab === "candidates") {
      fetchCandidates();
    }
  }, [activeTab, fetchCandidates]);

  useEffect(() => {
    setCandidatePage(1);
  }, [candidateSearchDebounced, candidateStatus, candidateCategory, candidateCity, candidateSourceId]);

  const filteredLocations = locations.filter((l: any) => {
    if (!searchLocation) return true;
    const q = searchLocation.toLowerCase();
    return l.city.toLowerCase().includes(q) || l.country.toLowerCase().includes(q) || l.countryCode.toLowerCase().includes(q);
  });

  const filteredCategories = categories.filter((c: any) => {
    if (!searchCategory) return true;
    const q = searchCategory.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  const handleCreateLocation = async () => {
    try {
      const res = await fetch("/api/collector/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: locForm.country,
          countryCode: locForm.countryCode.toUpperCase(),
          state: locForm.state || null,
          city: locForm.city,
          latitude: locForm.latitude ? parseFloat(locForm.latitude) : null,
          longitude: locForm.longitude ? parseFloat(locForm.longitude) : null,
          radiusKm: parseInt(locForm.radiusKm) || 25,
          priority: parseInt(locForm.priority) || 50,
          priorityLabel: locForm.priorityLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocations([data, ...locations]);
      setShowLocationForm(false);
      setLocForm({ country: "", countryCode: "", state: "", city: "", latitude: "", longitude: "", radiusKm: "25", priority: "50", priorityLabel: "MEDIUM" });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleLocation = async (id: string) => {
    const res = await fetch(`/api/collector/locations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle" }) });
    const data = await res.json();
    if (res.ok) setLocations(locations.map((l: any) => l.id === id ? data : l));
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    const res = await fetch(`/api/collector/locations/${id}`, { method: "DELETE" });
    if (res.ok) setLocations(locations.filter((l: any) => l.id !== id));
  };

  const handleCreateCategory = async () => {
    try {
      let osmTags = null;
      try { osmTags = JSON.parse(catForm.osmTags); } catch { osmTags = catForm.osmTags; }
      const res = await fetch("/api/collector/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catForm.name,
          slug: catForm.slug.toLowerCase().replace(/\\s+/g, "-"),
          description: catForm.description || null,
          priority: parseInt(catForm.priority) || 50,
          priorityLabel: catForm.priorityLabel,
          osmTags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories([data, ...categories]);
      setShowCategoryForm(false);
      setCatForm({ name: "", slug: "", description: "", priority: "50", priorityLabel: "MEDIUM", osmTags: '["amenity"="dentist"]' });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleCategory = async (id: string) => {
    const res = await fetch(`/api/collector/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle" }) });
    const data = await res.json();
    if (res.ok) setCategories(categories.map((c: any) => c.id === id ? data : c));
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/collector/categories/${id}`, { method: "DELETE" });
    if (res.ok) setCategories(categories.filter((c: any) => c.id !== id));
  };

  const handleCreateSource = async () => {
    try {
      const res = await fetch("/api/collector/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceForm.name,
          type: sourceForm.type,
          baseUrl: sourceForm.baseUrl,
          timeoutMs: parseInt(sourceForm.timeoutMs) || 25000,
          retryCount: parseInt(sourceForm.retryCount) || 3,
          concurrency: parseInt(sourceForm.concurrency) || 15,
          priority: parseInt(sourceForm.priority) || 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSources([data, ...sources]);
      setShowSourceForm(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleSource = async (id: string) => {
    const res = await fetch(`/api/collector/sources/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle" }) });
    const data = await res.json();
    if (res.ok) setSources(sources.map((s: any) => s.id === id ? data : s));
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm("Delete this source?")) return;
    const res = await fetch(`/api/collector/sources/${id}`, { method: "DELETE" });
    if (res.ok) setSources(sources.filter((s: any) => s.id !== id));
  };

  const handleCreateCredential = async () => {
    try {
      const res = await fetch("/api/collector/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCredentials([data, ...credentials]);
      setShowCredentialForm(false);
      setCredForm({ provider: "openai", label: "", apiKey: "" });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleTestCredential = async (id: string) => {
    const res = await fetch(`/api/collector/credentials/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    const data = await res.json();
    if (res.ok) {
      setCredentials(credentials.map((c: any) => c.id === id ? { ...c, status: data.status, lastTestedAt: data.lastTestedAt } : c));
      alert(`Tested: ${data.status}`);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Delete this credential? This cannot be undone.")) return;
    const res = await fetch(`/api/collector/credentials/${id}`, { method: "DELETE" });
    if (res.ok) setCredentials(credentials.filter((c: any) => c.id !== id));
  };

  const handleCreateRule = async () => {
    try {
      const res = await fetch("/api/collector/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRules([data, ...rules]);
      setShowRuleForm(false);
      setRuleForm({ key: "", name: "", description: "", category: "lead_requirements" });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleRule = async (id: string) => {
    const res = await fetch(`/api/collector/rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle" }) });
    const data = await res.json();
    if (res.ok) setRules(rules.map((r: any) => r.id === id ? data : r));
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const res = await fetch(`/api/collector/rules/${id}`, { method: "DELETE" });
    if (res.ok) setRules(rules.filter((r: any) => r.id !== id));
  };

  const tabs = [
    { id: "overview", label: "Overview", count: null },
    { id: "runs", label: "Runs", count: runs.length },
    { id: "states", label: "States", count: states.length },
    { id: "candidates", label: "Candidates", count: candidateStats?.total ?? overview.counts?.candidateCount ?? null },
    { id: "locations", label: "Locations", count: locations.length },
    { id: "categories", label: "Categories", count: categories.length },
    { id: "sources", label: "Sources", count: sources.length },
    { id: "rules", label: "Rules", count: rules.length },
    { id: "general", label: "General", count: null },
  ];

  const yieldMetrics = overview.yieldMetrics || {};
  const healthBreakdown = overview.healthBreakdown || { healthy: 0, degraded: 0, down: 0, unknown: 0 };
  const nextAssignment = overview.nextAssignment || null;
  const candidateBreakdown = candidateStats?.breakdown || overview.candidateBreakdown || {};
  const candidateCount = candidateStats?.total ?? overview.counts?.candidateCount ?? 0;

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collector Control Center</h2>
          <p style={{ fontSize: 13, color: "#60697A" }}>Lead discovery, candidate queue, run history and collection settings.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: overview.config.enabled ? "#EEF8F4" : "#FDECEC", color: overview.config.enabled ? "#4FAE91" : "#EC6262", border: `1px solid ${overview.config.enabled ? "#D5F0E5" : "#FBD5D5"}` }}>
            {overview.config.enabled ? "● Enabled" : "● Disabled"}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: "#F0ECFA", color: "#49339A", border: "1px solid #E0D6F5" }}>
            Next: {nextAssignment ? `${nextAssignment.location?.city || "?"} / ${nextAssignment.category?.slug || "?"} / ${nextAssignment.source?.name?.split("/")[0] || "?"}` : "None"} {nextAssignment?.type === "missing" ? `(${nextAssignment.totalMissing} missing)` : nextAssignment?.type === "eligible" ? `(${nextAssignment.totalEligible} eligible)` : ""}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: "#FFF6E3", color: "#B7791F", border: "1px solid #F4BE52" }}>
            Candidates: {candidateCount}
          </span>
        </div>
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Locations</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>{overview.counts.locationsActive} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview.counts.locationsTotal} Active</span></div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>{overview.counts.eligibleNow || 0} eligible now / {overview.counts.states || 0} states</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Categories</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>{overview.counts.categoriesActive} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview.counts.categoriesTotal} Active</span></div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Business types — Priority influences without starvation</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Sources Health</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ background: "#EEF8F4", color: "#4FAE91", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.healthy} healthy</span>
                <span style={{ background: "#FFF6E3", color: "#F29B38", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.degraded} degraded</span>
                <span style={{ background: "#FDECEC", color: "#EC6262", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.down} down</span>
                <span style={{ background: "#FAF9F7", color: "#9299A8", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.unknown} unknown</span>
              </div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>{overview.counts.sourcesActive} active / {overview.counts.sourcesTotal} total</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Yield + Candidates</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>{yieldMetrics.totalParsed || 0} parsed → {yieldMetrics.totalAccepted || 0} accepted → {yieldMetrics.totalInserted || 0} inserted</div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Email {(yieldMetrics.avgEmailPresenceRate*100 || 0).toFixed(1)}% — {yieldMetrics.totalNoEmail || 0} noEmail, {yieldMetrics.totalWebsiteRejected || 0} websiteRejected</div>
              <div style={{ fontSize: 11, color: "#49339A", marginTop: 6, background: "#F0ECFA", padding: "4px 6px", borderRadius: 4 }}>Candidates: {candidateCount} — {candidateBreakdown.NEEDS_ENRICHMENT || 0} needEnrich, {candidateBreakdown.QUALIFIED || 0} qualified, {candidateBreakdown.REJECTED || 0} rejected</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Next Assignment — Fair Rotation</h3>
              {nextAssignment ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: nextAssignment.type === "missing" ? "#F0ECFA" : nextAssignment.type === "eligible" ? "#EEF8F4" : "#FFF6E3", color: nextAssignment.type === "missing" ? "#49339A" : nextAssignment.type === "eligible" ? "#4FAE91" : "#F29B38" }}>{nextAssignment.type === "missing" ? "Never-run" : nextAssignment.type === "eligible" ? "Eligible" : "Future"}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{nextAssignment.location?.city || "?"} {nextAssignment.location?.countryCode ? `(${nextAssignment.location.countryCode})` : ""} / {nextAssignment.category?.slug || "?"} / {nextAssignment.source?.name || "?"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#60697A" }}>Type: {nextAssignment.type} — {nextAssignment.type === "missing" ? `${nextAssignment.totalMissing} missing combos` : nextAssignment.type === "eligible" ? `${nextAssignment.totalEligible} eligible now` : `Next eligible at ${nextAssignment.nextEligibleAt ? new Date(nextAssignment.nextEligibleAt).toLocaleString() : "unknown"}`}</div>
                  {nextAssignment.state?.nextEligibleRunAt && <div style={{ fontSize: 11, color: "#60697A" }}>Next in: <strong>{formatCountdown(nextAssignment.state.nextEligibleRunAt)}</strong></div>}
                </div>
              ) : <div style={{ fontSize: 11, color: "#9299A8" }}>No next assignment</div>}
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Last Run</h3>
              {overview.recentRuns && overview.recentRuns.length ? (() => {
                const last = overview.recentRuns[0];
                const meta = last.metadata || {};
                return (
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#151927" }}>{last.status} — {last.location?.city || "—"} / {last.category?.slug || "—"} / {last.source?.name?.split("/")[0] || "—"}</div>
                    <div style={{ fontSize: 11, color: "#60697A" }}>{new Date(last.startedAt).toLocaleString()} — {last.candidatesFound} raw → {meta.parsedCount || "?"} parsed → {last.leadsAccepted} accepted</div>
                    <div style={{ fontSize: 11, color: "#60697A" }}>Candidates: {meta.candidatesPersisted || 0} persisted, {meta.candidatesNeedingEnrichment || 0} needEnrich</div>
                  </div>
                );
              })() : <div style={{ fontSize: 11, color: "#9299A8" }}>No runs yet</div>}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 6, width: "fit-content", maxWidth: "100%" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: activeTab === t.id ? "#49339A" : "transparent",
              color: activeTab === t.id ? "white" : "#60697A",
              fontSize: 13,
              fontWeight: activeTab === t.id ? 500 : 400,
              cursor: "pointer",
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontFamily: "'Poppins', sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {t.label} {t.count !== null && <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 10, background: activeTab === t.id ? "rgba(255,255,255,0.2)" : "#F0EEEA", color: activeTab === t.id ? "white" : "#9299A8" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Candidates Tab — Phase 4C.2C cleaned */}
      {activeTab === "candidates" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Candidate Queue</h3>
            <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Discovery storage of parsed businesses. Candidates with known website are rejected before enrichment.</p>
          </div>

          {/* Summary — dynamic counts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Total Candidates</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.total ?? candidateCount ?? 0}</div>
              <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>24h: {candidateStats?.recent24h ?? 0} new</div>
            </div>
            <div style={{ background: "white", border: "1px solid #F4BE52", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#B7791F", textTransform: "uppercase" }}>Needs Enrichment</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.NEEDS_ENRICHMENT ?? candidateBreakdown.NEEDS_ENRICHMENT ?? 0}</div>
              <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>No email, no website</div>
            </div>
            <div style={{ background: "white", border: "1px solid #FBD5D5", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#C53030", textTransform: "uppercase" }}>Rejected</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.REJECTED ?? candidateBreakdown.REJECTED ?? 0}</div>
              <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Website exists / duplicate</div>
            </div>
            <div style={{ background: "white", border: "1px solid #D5F0E5", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#276749", textTransform: "uppercase" }}>Qualified</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.QUALIFIED ?? candidateBreakdown.QUALIFIED ?? 0}</div>
              <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Linked to CRM Lead</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E0D6F5", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#553C9A", textTransform: "uppercase" }}>Discovered</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.DISCOVERED ?? candidateBreakdown.DISCOVERED ?? 0}</div>
              <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Initial state</div>
            </div>
            <div style={{ background: "white", border: "1px solid #C5E9F1", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#2B6CB0", textTransform: "uppercase" }}>Verification Pending</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateStats?.counts?.VERIFICATION_PENDING ?? candidateBreakdown.VERIFICATION_PENDING ?? 0}</div>
              <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Awaiting verification</div>
            </div>
          </div>

          {/* Search + Filters — Compressed to 2 rows */}
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
            {/* Row 1: Search + Clear */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={candidateSearch}
                onChange={e => setCandidateSearch(e.target.value)}
                placeholder="Search company, email, phone, city, externalId..."
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
              <button onClick={() => { setCandidateSearch(""); setCandidateStatus("All"); setCandidateCategory("All"); setCandidateCity("All"); setCandidateSourceId("All"); setCandidatePage(1); }} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E5E3DF", background: "#FAF9F7", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>Clear filters</button>
            </div>
            {/* Row 2: Status / Category / Source / City / PageSize / Sort */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={candidateStatus} onChange={e => setCandidateStatus(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white", minWidth: 140 }}>
                <option value="All">All Status</option>
                <option value="NEEDS_ENRICHMENT">Needs Enrichment</option>
                <option value="REJECTED">Rejected</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="DISCOVERED">Discovered</option>
                <option value="VERIFICATION_PENDING">Verification Pending</option>
              </select>
              <select value={candidateCategory} onChange={e => setCandidateCategory(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white", minWidth: 140 }}>
                <option value="All">All Categories</option>
                {categories.map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
              <select value={candidateSourceId} onChange={e => setCandidateSourceId(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white", minWidth: 130 }}>
                <option value="All">All Sources</option>
                {sources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                value={candidateCity === "All" ? "" : candidateCity}
                onChange={e => setCandidateCity(e.target.value || "All")}
                placeholder="City"
                style={{ width: 120, padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12 }}
              />
              <select value={candidatePageSize} onChange={e => setCandidatePageSize(parseInt(e.target.value))} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white" }}>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
              <select value={candidateSortBy} onChange={e => setCandidateSortBy(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white" }}>
                <option value="createdAt">Newest</option>
                <option value="companyName">Business A-Z</option>
                <option value="status">Status</option>
                <option value="city">City</option>
              </select>
              <div style={{ marginLeft: "auto", fontSize: 11, color: "#9299A8", display: "flex", gap: 12 }}>
                <span>Total: {candidateData?.total ?? 0}</span>
                {candidateData && <span>Page {candidateData.page}/{candidateData.totalPages}</span>}
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
                <thead>
                  <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Business</th>
                    <th style={{ padding: "10px 12px" }}>Category</th>
                    <th style={{ padding: "10px 12px" }}>Location</th>
                    <th style={{ padding: "10px 12px" }}>Contact</th>
                    <th style={{ padding: "10px 12px" }}>Discovery</th>
                    <th style={{ padding: "10px 12px" }}>Status</th>
                    <th style={{ padding: "10px 12px" }}>Reason</th>
                    <th style={{ padding: "10px 12px" }}>Created</th>
                    <th style={{ padding: "10px 12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateLoading ? (
                    <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>Loading candidates...</td></tr>
                  ) : candidateError ? (
                    <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#EC6262", fontSize: 12 }}>Error: {candidateError}</td></tr>
                  ) : !candidateData || candidateData.candidates.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>{candidateSearchDebounced || candidateStatus !== "All" || candidateCategory !== "All" || candidateCity !== "All" || candidateSourceId !== "All" ? "No candidates match these filters." : "No candidates discovered yet. Run collector to discover businesses."}</td></tr>
                  ) : (
                    candidateData.candidates.map((c: any) => {
                      const badge = statusBadgeStyle(c.status);
                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 500, color: "#151927", fontSize: 12 }}>{c.companyName}</div>
                            <div style={{ fontSize: 10, color: "#9299A8", fontFamily: "monospace" }}>{c.externalType} {c.externalId}</div>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>{c.businessCategory}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: "#151927" }}>
                            <div>{c.city || "—"} {c.country ? `(${c.country})` : ""}</div>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>
                            <div>{c.email || "—"}</div>
                            <div style={{ fontSize: 10, color: "#9299A8" }}>{c.phone || ""}</div>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>
                            <div>{c.discoverySource?.name || "—"}</div>
                            <div style={{ fontSize: 10, color: "#9299A8", fontFamily: "monospace" }}>Run {c.discoveryRunId.slice(0, 8)}… {c.discoveryRun?.location?.city ? `(${c.discoveryRun.location.city})` : ""}</div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 6, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: "nowrap" }}>{c.status}</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>{humanReadableRejection(c.rejectionReason)}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: "#9299A8" }}>{new Date(c.createdAt).toLocaleDateString()}<br /><span style={{ fontSize: 10 }}>{new Date(c.createdAt).toLocaleTimeString()}</span></td>
                          <td style={{ padding: "10px 12px" }}>
                            <button onClick={() => fetchCandidateDetail(c.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer", color: "#49339A", fontWeight: 500 }}>View</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {candidateData && candidateData.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #E5E3DF", background: "#FAF9F7", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 11, color: "#60697A" }}>
                  Showing {(candidateData.page - 1) * candidateData.pageSize + 1}–{Math.min(candidateData.page * candidateData.pageSize, candidateData.total)} of {candidateData.total} — Page {candidateData.page} / {candidateData.totalPages}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={candidateData.page <= 1} onClick={() => setCandidatePage(p => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: candidateData.page <= 1 ? "#F0EEEA" : "white", fontSize: 11, cursor: candidateData.page <= 1 ? "not-allowed" : "pointer", color: candidateData.page <= 1 ? "#9299A8" : "#151927" }}>Prev</button>
                  <span style={{ padding: "6px 10px", fontSize: 11, color: "#60697A" }}>{candidateData.page} / {candidateData.totalPages}</span>
                  <button disabled={candidateData.page >= candidateData.totalPages} onClick={() => setCandidatePage(p => Math.min(candidateData.totalPages, p + 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: candidateData.page >= candidateData.totalPages ? "#F0EEEA" : "white", fontSize: 11, cursor: candidateData.page >= candidateData.totalPages ? "not-allowed" : "pointer", color: candidateData.page >= candidateData.totalPages ? "#9299A8" : "#151927" }}>Next</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: "10px 12px", background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 11, color: "#60697A" }}>
            Candidate Queue is read-only. Server-side search, filters and pagination. Business / Category / Location / Contact / Discovery / Status / Reason / Created / Action columns preserved.
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detailOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setDetailOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(21,25,39,0.4)" }} />
          <div style={{ position: "relative", width: "min(480px, 92vw)", background: "white", borderLeft: "1px solid #E5E3DF", boxShadow: "-8px 0 24px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", maxHeight: "100vh", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E3DF", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAF9F7" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#151927" }}>Candidate Detail</div>
                <div style={{ fontSize: 11, color: "#9299A8" }}>{selectedCandidateId?.slice(0, 12)}…</div>
              </div>
              <button onClick={() => setDetailOpen(false)} aria-label="Close detail" style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer" }}>✕ Close</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "grid", gap: 16 }}>
              {detailLoading ? (
                <div style={{ fontSize: 12, color: "#9299A8", padding: 20, textAlign: "center" }}>Loading candidate...</div>
              ) : !selectedCandidate ? (
                <div style={{ fontSize: 12, color: "#EC6262", padding: 20, textAlign: "center" }}>Failed to load candidate.</div>
              ) : (
                <>
                  {/* Business */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Business</div>
                    <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Company Name:</span> <strong style={{ color: "#151927" }}>{selectedCandidate.companyName}</strong></div>
                      <div><span style={{ color: "#9299A8" }}>Category:</span> {selectedCandidate.businessCategory}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#9299A8" }}>Status:</span> <span style={{ ...(() => { const s = statusBadgeStyle(selectedCandidate.status); return { background: s.bg, color: s.color, border: `1px solid ${s.border}` }; })(), fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 6 }}>{selectedCandidate.status}</span></div>
                      {selectedCandidate.rejectionReason && <div><span style={{ color: "#9299A8" }}>Rejection Reason:</span> <span style={{ background: "#FDECEC", color: "#C53030", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{humanReadableRejection(selectedCandidate.rejectionReason)} <span style={{ fontSize: 10, color: "#9299A8" }}>({selectedCandidate.rejectionReason})</span></span></div>}
                    </div>
                  </div>

                  {/* Pipeline Timeline */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Pipeline Timeline</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 11 }}>
                      {(() => {
                        const status = selectedCandidate.status;
                        const steps = [
                          { key: "discovered", label: "Discovered", done: true },
                          { key: "persisted", label: "Persisted", done: true },
                          { key: "needs_enrichment", label: "Needs Enrichment", active: status === "NEEDS_ENRICHMENT", done: ["NEEDS_ENRICHMENT", "VERIFICATION_PENDING", "QUALIFIED"].includes(status) || status === "REJECTED" && selectedCandidate.rejectionReason !== "duplicate_in_run", pending: false },
                          { key: "enriched", label: "Enriched", active: false, done: false, future: true },
                          { key: "verification", label: "Verification", active: status === "VERIFICATION_PENDING", done: status === "QUALIFIED" || status === "REJECTED" && ["existing_website", "email_domain_has_live_website", "generic_email", "invalid_email"].includes(selectedCandidate.rejectionReason || "") ? false : ["QUALIFIED"].includes(status), pending: status === "NEEDS_ENRICHMENT" },
                          { key: "qualified", label: "Qualified", active: status === "QUALIFIED", done: status === "QUALIFIED", pending: ["NEEDS_ENRICHMENT", "VERIFICATION_PENDING"].includes(status) },
                          { key: "crm", label: "CRM Lead", active: false, done: status === "QUALIFIED" && !!selectedCandidate.qualifiedLeadId, pending: status !== "QUALIFIED" },
                        ];
                        // Special handling for REJECTED
                        if (status === "REJECTED") {
                          return (
                            <>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#4FAE91" }}>✓</span> Discovered</div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#4FAE91" }}>✓</span> Persisted</div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#EC6262" }}>✕</span> Rejected — {humanReadableRejection(selectedCandidate.rejectionReason)}</div>
                              <div style={{ fontSize: 10, color: "#9299A8", marginLeft: 20, marginTop: 4, background: "#FDECEC", padding: "4px 8px", borderRadius: 4 }}>Reason: {selectedCandidate.rejectionReason} — Business retained for audit, not lost.</div>
                            </>
                          );
                        }
                        return steps.map(s => {
                          let icon = "○";
                          let color = "#9299A8";
                          if (s.done) { icon = "✓"; color = "#4FAE91"; }
                          if (s.active) { icon = "●"; color = "#49339A"; }
                          if (s.key === "needs_enrichment" && status === "NEEDS_ENRICHMENT") { icon = "●"; color = "#B7791F"; }
                          return (
                            <div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", color: s.done || s.active ? "#151927" : "#9299A8", fontWeight: s.active ? 600 : 400 }}>
                              <span style={{ color, width: 16, textAlign: "center" }}>{icon}</span> {s.label} {s.active ? "(current)" : ""}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Contact */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Contact</div>
                    <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Email:</span> {selectedCandidate.email || <span style={{ color: "#9299A8" }}>— (needs enrichment)</span>}</div>
                      <div><span style={{ color: "#9299A8" }}>Phone:</span> {selectedCandidate.phone || "—"}</div>
                      <div><span style={{ color: "#9299A8" }}>Website:</span> {selectedCandidate.website ? <a href={selectedCandidate.website} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>{selectedCandidate.website}</a> : <span style={{ color: "#9299A8" }}>—</span>}</div>
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Location</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Address:</span> {selectedCandidate.address || "—"}</div>
                      <div><span style={{ color: "#9299A8" }}>City:</span> {selectedCandidate.city || "—"} — <span style={{ fontSize: 10, color: "#9299A8" }}>Candidate city = actual business city, not search area</span></div>
                      <div><span style={{ color: "#9299A8" }}>Country:</span> {selectedCandidate.country || "—"}</div>
                      <div><span style={{ color: "#9299A8" }}>Postcode:</span> {selectedCandidate.postcode || "—"}</div>
                      <div><span style={{ color: "#9299A8" }}>Latitude:</span> {selectedCandidate.latitude ?? "—"} <span style={{ color: "#9299A8" }}>Longitude:</span> {selectedCandidate.longitude ?? "—"}</div>
                    </div>
                  </div>

                  {/* Discovery */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Discovery</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Discovery Source:</span> {selectedCandidate.discoverySource?.name || selectedCandidate.discoverySourceId} ({selectedCandidate.discoverySource?.type || "—"})</div>
                      <div><span style={{ color: "#9299A8" }}>External Type:</span> {selectedCandidate.externalType || "—"} <span style={{ color: "#9299A8" }}>External ID:</span> {selectedCandidate.externalId || "—"}</div>
                      <div><span style={{ color: "#9299A8" }}>Discovery Run ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11 }}>{selectedCandidate.discoveryRunId}</span> {selectedCandidate.discoveryRun && <span style={{ fontSize: 10, color: "#9299A8" }}>— {selectedCandidate.discoveryRun.location?.city} / {selectedCandidate.discoveryRun.category?.slug} / {selectedCandidate.discoveryRun.source?.name}</span>}</div>
                      <div><span style={{ color: "#9299A8" }}>Created At:</span> {new Date(selectedCandidate.createdAt).toLocaleString()}</div>
                      <div><span style={{ color: "#9299A8" }}>Updated At:</span> {new Date(selectedCandidate.updatedAt).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Enrichment */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Enrichment (Future)</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Enrichment Attempts:</span> {selectedCandidate.enrichmentAttempts ?? 0}</div>
                      <div><span style={{ color: "#9299A8" }}>Last Enrichment At:</span> {selectedCandidate.lastEnrichmentAt ? new Date(selectedCandidate.lastEnrichmentAt).toLocaleString() : "—"}</div>
                      <div><span style={{ color: "#9299A8" }}>Enrichment Provider:</span> {selectedCandidate.enrichmentProvider || "—"}</div>
                      <div style={{ fontSize: 10, color: "#9299A8" }}>Currently empty — part of future enrichment architecture, displayed for traceability.</div>
                    </div>
                  </div>

                  {/* Qualification */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>Qualification</div>
                    <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                      <div><span style={{ color: "#9299A8" }}>Qualified Lead ID:</span> {selectedCandidate.qualifiedLeadId ? <span style={{ fontFamily: "monospace", fontSize: 11 }}>{selectedCandidate.qualifiedLeadId}</span> : "—"}</div>
                      {selectedCandidate.qualifiedLead && (
                        <div style={{ background: "#EEF8F4", border: "1px solid #D5F0E5", borderRadius: 6, padding: 8 }}>
                          <div style={{ fontWeight: 500, color: "#276749" }}>{selectedCandidate.qualifiedLead.companyName}</div>
                          <div style={{ fontSize: 11, color: "#60697A" }}>{selectedCandidate.qualifiedLead.email} — {selectedCandidate.qualifiedLead.city}</div>
                          <div style={{ fontSize: 10, color: "#9299A8" }}>CollectorRunId: {selectedCandidate.qualifiedLead.collectorRunId}</div>
                        </div>
                      )}
                      {!selectedCandidate.qualifiedLeadId && <div style={{ fontSize: 10, color: "#9299A8" }}>No qualified Lead yet — candidate not yet passed TRUE_NO_SITE.</div>}
                    </div>
                  </div>

                  {/* Raw Source Data — neutral */}
                  <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Raw Source Data</div>
                      <button onClick={() => setRawTagsOpen(!rawTagsOpen)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "#FAF9F7", fontSize: 11, cursor: "pointer" }}>{rawTagsOpen ? "Collapse" : "Expand"} JSON</button>
                    </div>
                    <div style={{ fontSize: 10, color: "#9299A8", marginBottom: 8, background: "#FAF9F7", padding: "6px 8px", borderRadius: 6, border: "1px solid #E5E3DF" }}>
                      Original tags as received from discovery source.
                    </div>
                    {rawTagsOpen ? (
                      <pre style={{ background: "#151927", color: "#E5E3DF", padding: 12, borderRadius: 8, fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300, overflowY: "auto" }}>{JSON.stringify(selectedCandidate.rawTags, null, 2)}</pre>
                    ) : (
                      <div style={{ display: "grid", gap: 4, fontSize: 11 }}>
                        {selectedCandidate.rawTags ? Object.entries(selectedCandidate.rawTags).slice(0, 12).map(([k, v]: any) => (
                          <div key={k} style={{ display: "flex", gap: 8 }}><span style={{ color: "#9299A8", minWidth: 100 }}>{k}:</span> <span style={{ color: "#151927", wordBreak: "break-all" }}>{String(v).slice(0, 120)}</span></div>
                        )) : <div style={{ color: "#9299A8" }}>No rawTags</div>}
                        {selectedCandidate.rawTags && Object.keys(selectedCandidate.rawTags).length > 12 && <div style={{ color: "#9299A8", fontSize: 10 }}>+{Object.keys(selectedCandidate.rawTags).length - 12} more keys — expand to see all</div>}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 10, color: "#9299A8", padding: "8px 12px", background: "#FAF9F7", border: "1px solid #F0EEEA", borderRadius: 8 }}>
                    Read-only detail. No edit or enrichment actions. Traceable via discovery run and source.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* General Tab */}
      {activeTab === "general" && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>General Settings — CollectorConfig</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Enabled</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.enabled ? "Yes" : "No"}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Collection Mode</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.collectionMode}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Default Batch Size</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.defaultBatchSize}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Query Limit</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.defaultQueryLimit}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Concurrent Requests</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.concurrentRequests}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Frequency</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.collectionFrequencyMinutes} min</div></div>
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === "locations" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Locations</h3>
              <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Records, not hardcoded flags. Rotation prioritizes least recently collected.</p>
            </div>
            <button onClick={() => setShowLocationForm(!showLocationForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showLocationForm ? "Cancel" : "+ Add Location"}</button>
          </div>
          {showLocationForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Country *</label><input value={locForm.country} onChange={e => setLocForm({ ...locForm, country: e.target.value })} placeholder="United States" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Country Code *</label><input value={locForm.countryCode} onChange={e => setLocForm({ ...locForm, countryCode: e.target.value })} placeholder="US" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>City *</label><input value={locForm.city} onChange={e => setLocForm({ ...locForm, city: e.target.value })} placeholder="Houston" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Latitude</label><input value={locForm.latitude} onChange={e => setLocForm({ ...locForm, latitude: e.target.value })} placeholder="29.7604" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateLocation} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Location</button>
            </div>
          )}
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input value={searchLocation} onChange={e => setSearchLocation(e.target.value)} placeholder="Search locations..." style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} />
            <span style={{ fontSize: 11, color: "#9299A8" }}>{filteredLocations.length} locations</span>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Location</th><th style={{ padding: "10px 14px" }}>Country</th><th style={{ padding: "10px 14px" }}>Radius</th><th style={{ padding: "10px 14px" }}>Priority</th><th style={{ padding: "10px 14px" }}>Last Collected</th><th style={{ padding: "10px 14px" }}>Status</th><th style={{ padding: "10px 14px" }}>Actions</th></tr></thead>
                <tbody>
                  {filteredLocations.map((loc: any) => (
                    <tr key={loc.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 500, color: "#151927" }}>{loc.city}{loc.state ? `, ${loc.state}` : ""}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{loc.country}</div></td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: "#FAF9F7", border: "1px solid #E5E3DF", fontSize: 11 }}>{loc.countryCode}</span></td>
                      <td style={{ padding: "12px 14px", color: "#60697A" }}>{loc.radiusKm} km</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: loc.priorityLabel === "HIGH" ? "#FFF6E3" : "#F0ECFA", color: loc.priorityLabel === "HIGH" ? "#F29B38" : "#49339A", fontSize: 11 }}>{loc.priorityLabel}</span></td>
                      <td style={{ padding: "12px 14px", color: "#60697A", fontSize: 12 }}>{loc.lastCollectedAt ? new Date(loc.lastCollectedAt).toLocaleString() : "Never"}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: loc.enabled ? "#EEF8F4" : "#F0EEEA", color: loc.enabled ? "#4FAE91" : "#9299A8", fontSize: 11 }}>{loc.enabled ? "Enabled" : "Disabled"}</span></td>
                      <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}><button onClick={() => handleToggleLocation(loc.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{loc.enabled ? "Disable" : "Enable"}</button><button onClick={() => handleDeleteLocation(loc.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Lead Categories</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Configure types of businesses to discover without code change.</p></div>
            <button onClick={() => setShowCategoryForm(!showCategoryForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showCategoryForm ? "Cancel" : "+ Add Category"}</button>
          </div>
          {showCategoryForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label><input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="Dental" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Slug *</label><input value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="dental" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateCategory} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Category</button>
            </div>
          )}
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Category</th><th style={{ padding: "10px 14px" }}>Priority</th><th style={{ padding: "10px 14px" }}>Last Run</th><th style={{ padding: "10px 14px" }}>Status</th><th style={{ padding: "10px 14px" }}>Actions</th></tr></thead>
              <tbody>
                {filteredCategories.map((cat: any) => (
                  <tr key={cat.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 500, color: "#151927" }}>{cat.name}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{cat.slug}</div></td>
                    <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: cat.priorityLabel === "HIGH" ? "#FFF6E3" : "#F0ECFA", color: cat.priorityLabel === "HIGH" ? "#F29B38" : "#49339A", fontSize: 11 }}>{cat.priorityLabel}</span></td>
                    <td style={{ padding: "12px 14px", color: "#60697A", fontSize: 12 }}>{cat.lastRunAt ? new Date(cat.lastRunAt).toLocaleString() : "Never"}</td>
                    <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: cat.enabled ? "#EEF8F4" : "#F0EEEA", color: cat.enabled ? "#4FAE91" : "#9299A8", fontSize: 11 }}>{cat.enabled ? "Enabled" : "Disabled"}</span></td>
                    <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}><button onClick={() => handleToggleCategory(cat.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{cat.enabled ? "Disable" : "Enable"}</button><button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sources Tab */}
      {activeTab === "sources" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Sources & APIs</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Health: healthy/degraded/down with lastCheckedAt always updated.</p></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowSourceForm(!showSourceForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showSourceForm ? "Cancel" : "+ Add Source"}</button>
              <button onClick={() => setShowCredentialForm(!showCredentialForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E3DF", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ Provider Key</button>
            </div>
          </div>
          {showSourceForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label><input value={sourceForm.name} onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Type *</label><select value={sourceForm.type} onChange={e => setSourceForm({ ...sourceForm, type: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option value="overpass">overpass</option><option value="google_places">google_places</option><option value="custom">custom</option></select></div>
                <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Base URL *</label><input value={sourceForm.baseUrl} onChange={e => setSourceForm({ ...sourceForm, baseUrl: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateSource} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Source</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Endpoints — {sources.length}</div>
              {sources.map((src: any) => (
                <div key={src.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{src.name}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{src.type} — {src.baseUrl.slice(0, 40)}</div></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: src.healthStatus === "healthy" ? "#EEF8F4" : src.healthStatus === "down" ? "#FDECEC" : "#FFF6E3", color: src.healthStatus === "healthy" ? "#4FAE91" : src.healthStatus === "down" ? "#EC6262" : "#F29B38", fontSize: 11 }}>{src.healthStatus}</span>
                    <button onClick={() => handleToggleSource(src.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{src.enabled ? "Disable" : "Enable"}</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Credentials — {credentials.length}</div>
              {credentials.map((cred: any) => (
                <div key={cred.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{cred.provider} {cred.label ? `(${cred.label})` : ""}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{cred.maskedKey}</div></div>
                  <button onClick={() => handleDeleteCredential(cred.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collection Rules</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Extensible configuration controls only.</p></div>
            <button onClick={() => setShowRuleForm(!showRuleForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showRuleForm ? "Cancel" : "+ Add Rule"}</button>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Rules — {rules.length}</div>
            {rules.map((rule: any) => (
              <div key={rule.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{rule.name} <span style={{ fontSize: 11, color: "#9299A8" }}>({rule.key})</span></div><div style={{ fontSize: 11, color: "#9299A8" }}>{rule.description || "—"} — {rule.category}</div></div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ padding: "3px 8px", borderRadius: 6, background: rule.enabled ? "#EEF8F4" : "#F0EEEA", color: rule.enabled ? "#4FAE91" : "#9299A8", fontSize: 11 }}>{rule.enabled ? "ON" : "OFF"}</span>
                  <button onClick={() => handleToggleRule(rule.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{rule.enabled ? "Disable" : "Enable"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Runs Tab */}
      {activeTab === "runs" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collector Run History</h3>
            <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Every GitHub execution = 1 assignment. Candidate persistence: parsed → persisted as LeadCandidate, no-email → NEEDS_ENRICHMENT, traceability via candidateIds/leadIds.</p>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1100 }}>
                <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Started / Finished</th><th style={{ padding: "10px 14px" }}>Status</th><th style={{ padding: "10px 14px" }}>Location / Category</th><th style={{ padding: "10px 14px" }}>Raw / Parsed / Candidates</th><th style={{ padding: "10px 14px" }}>Rejected</th><th style={{ padding: "10px 14px" }}>Accepted / Inserted</th><th style={{ padding: "10px 14px" }}>Duration / GitHub</th></tr></thead>
                <tbody>
                  {runs.map((run: any) => {
                    const meta = run.metadata || {};
                    const ghUrl = githubRunUrl(meta.githubRunId);
                    return (
                      <tr key={run.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#60697A" }}>{new Date(run.startedAt).toLocaleString()}<br /><span style={{ fontSize: 10, color: "#9299A8" }}>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "running"}</span></td>
                        <td style={{ padding: "10px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: run.status === "SUCCESS" ? "#EEF8F4" : "#FDECEC", color: run.status === "SUCCESS" ? "#4FAE91" : "#EC6262", fontSize: 11 }}>{run.status}</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{run.location?.city || "—"} / {run.category?.slug || "—"}<br /><span style={{ fontSize: 10, color: "#9299A8" }}>{run.source?.name?.slice(0, 20) || "—"}</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{run.candidatesFound} raw / {meta.parsedCount ?? "?"} parsed<br /><span style={{ fontSize: 10, color: "#49339A", background: "#F0ECFA", padding: "2px 4px", borderRadius: 3 }}>{meta.candidatesPersisted ?? "?"} persisted / {meta.candidatesNeedingEnrichment ?? 0} needEnrich</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#9299A8" }}>{run.noEmailRejected}/{run.websiteRejected}/{run.duplicateRejected}<br /><span style={{ fontSize: 10 }}>noEmail/web/dup</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#4FAE91" }}>{run.leadsAccepted} / {run.leadsInserted}</td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{run.durationMs ? `${Math.round(run.durationMs/1000)}s` : "—"}<br />{ghUrl ? <a href={ghUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>GH#{meta.githubRunId}</a> : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* States Tab */}
      {activeTab === "states" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collector State — Fair Rotation & Countdown</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Neon remembers progress. Fair rotation: missing preferred, location diversity first.</p></div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 800 }}>
                <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Location / Category / Source</th><th style={{ padding: "10px 14px" }}>Last Run / Next Eligible</th><th style={{ padding: "10px 14px" }}>Cycle / Failures</th><th style={{ padding: "10px 14px" }}>Candidates</th></tr></thead>
                <tbody>
                  {states.map((st: any) => {
                    const next = st.nextEligibleRunAt ? new Date(st.nextEligibleRunAt) : null;
                    const isNow = !next || next <= new Date();
                    return (
                      <tr key={st.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.location?.city || "—"} / {st.category?.slug || "—"} / {st.source?.name?.slice(0, 20) || "—"}</td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.lastRunAt ? new Date(st.lastRunAt).toLocaleString() : "Never"}<br /><span style={{ padding: "2px 6px", borderRadius: 4, background: isNow ? "#EEF8F4" : "#FFF6E3", color: isNow ? "#4FAE91" : "#F29B38", fontSize: 10 }}>{isNow ? "Now" : formatCountdown(st.nextEligibleRunAt)}</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.cycle} / {st.consecutiveFailures} failures</td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.totalCandidates} candidates / {st.totalAccepted} accepted</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
