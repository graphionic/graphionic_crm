"use client";
import { useState, useEffect } from "react";

type Tab = "overview" | "general" | "locations" | "categories" | "sources" | "rules" | "runs" | "states";

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
  // Safe construction: known repo graphionic/graphionic_crm, but check if valid numeric
  const idStr = String(runId).trim();
  if (!/^\d+$/.test(idStr)) return null;
  return `https://github.com/graphionic/graphionic_crm/actions/runs/${idStr}`;
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

  // Countdown tick every second for next eligible
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
          slug: catForm.slug.toLowerCase().replace(/\s+/g, "-"),
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
    { id: "general", label: "General", count: null },
    { id: "locations", label: "Locations", count: locations.length },
    { id: "categories", label: "Categories", count: categories.length },
    { id: "sources", label: "Sources & APIs", count: sources.length },
    { id: "rules", label: "Rules", count: rules.length },
    { id: "runs", label: "Run History", count: runs.length },
    { id: "states", label: "State", count: states.length },
  ];

  const yieldMetrics = overview.yieldMetrics || {};
  const healthBreakdown = overview.healthBreakdown || { healthy: 0, degraded: 0, down: 0, unknown: 0 };
  const nextAssignment = overview.nextAssignment || null;

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collector Control Center</h2>
          <p style={{ fontSize: 13, color: "#60697A" }}>Phase 4C.1 — Fair rotation, observability, yield metrics. All settings stored in Neon PostgreSQL.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: overview.config.enabled ? "#EEF8F4" : "#FDECEC", color: overview.config.enabled ? "#4FAE91" : "#EC6262", border: `1px solid ${overview.config.enabled ? "#D5F0E5" : "#FBD5D5"}` }}>
            {overview.config.enabled ? "● Enabled" : "● Disabled"}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: "#F0ECFA", color: "#49339A", border: "1px solid #E0D6F5" }}>
            Next: {nextAssignment ? `${nextAssignment.location?.city || "?"} / ${nextAssignment.category?.slug || "?"} / ${nextAssignment.source?.name?.split("/")[0] || "?"}` : "None"} {nextAssignment?.type === "missing" ? `(${nextAssignment.totalMissing} missing)` : nextAssignment?.type === "eligible" ? `(${nextAssignment.totalEligible} eligible)` : ""}
          </span>
        </div>
      </div>

      {/* Overview Cards — Phase 4C.1 Enhanced */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Locations</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>{overview.counts.locationsActive} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview.counts.locationsTotal} Active</span></div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>{overview.counts.eligibleNow || 0} eligible now / {overview.counts.states || 0} states — Where to search</div>
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
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>{overview.counts.sourcesActive} active / {overview.counts.sourcesTotal} total — Map APIs</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Yield (Last 20 Runs)</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>{yieldMetrics.totalParsed || 0} parsed → {yieldMetrics.totalAccepted || 0} accepted → {yieldMetrics.totalInserted || 0} inserted</div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Email presence {(yieldMetrics.avgEmailPresenceRate*100 || 0).toFixed(2)}% — {yieldMetrics.totalNoEmail || 0} noEmail, {yieldMetrics.totalWebsiteRejected || 0} websiteRejected, {yieldMetrics.totalRetries || 0} retries</div>
            </div>
          </div>

          {/* Next Assignment + Last Run */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Next Assignment (Predicted) — Phase 4C.1 Fair Rotation</h3>
              {nextAssignment ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: nextAssignment.type === "missing" ? "#F0ECFA" : nextAssignment.type === "eligible" ? "#EEF8F4" : "#FFF6E3", color: nextAssignment.type === "missing" ? "#49339A" : nextAssignment.type === "eligible" ? "#4FAE91" : "#F29B38" }}>{nextAssignment.type === "missing" ? "Never-run" : nextAssignment.type === "eligible" ? "Eligible" : "Future"}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{nextAssignment.location?.city || "?"} {nextAssignment.location?.countryCode ? `(${nextAssignment.location.countryCode})` : ""} / {nextAssignment.category?.slug || nextAssignment.category?.name || "?"} / {nextAssignment.source?.name || "?"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#60697A" }}>
                    Type: {nextAssignment.type} — {nextAssignment.type === "missing" ? `${nextAssignment.totalMissing} missing combos, ${nextAssignment.totalExisting} existing — diversifies locations before exhausting cat/src of one location` : nextAssignment.type === "eligible" ? `${nextAssignment.totalEligible} eligible now — least recently run first` : `Next eligible at ${nextAssignment.nextEligibleAt ? new Date(nextAssignment.nextEligibleAt).toLocaleString() : "unknown"}`}
                  </div>
                  <div style={{ fontSize: 11, color: "#9299A8", background: "#FAF9F7", border: "1px solid #F0EEEA", borderRadius: 6, padding: 8 }}>
                    <strong>Algorithm:</strong> Missing combos (never-run) preferred over recently-run eligible. Sorted by cat prio desc, src prio desc, location lastCollected asc nulls first (never-run locations first), cat lastRun asc nulls first, location prio desc, city/slug asc deterministic. Eligible sorted by nextEligible asc nulls first, lastRun asc nulls first, failures asc, location lastCollected nulls first, priority sum desc. Prevents one high-priority location monopolizing.
                  </div>
                  {nextAssignment.state?.nextEligibleRunAt && (
                    <div style={{ fontSize: 11, color: "#60697A" }}>Next eligible in: <strong>{formatCountdown(nextAssignment.state.nextEligibleRunAt)}</strong> — {new Date(nextAssignment.state.nextEligibleRunAt).toLocaleString()}</div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#9299A8" }}>No next assignment — all disabled or no eligible and no missing. Check enabled locations/categories/sources.</div>
              )}
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Last Run — Production Verification</h3>
              {overview.recentRuns && overview.recentRuns.length ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {(() => {
                    const last = overview.recentRuns[0];
                    const meta = last.metadata || {};
                    return (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#151927" }}>{last.status} — {last.location?.city || "—"} / {last.category?.slug || "—"} / {last.source?.name?.split("/")[0] || "—"} — {last.durationMs ? `${Math.round(last.durationMs/1000)}s` : ""}</div>
                        <div style={{ fontSize: 11, color: "#60697A" }}>{new Date(last.startedAt).toLocaleString()} → {last.finishedAt ? new Date(last.finishedAt).toLocaleString() : "—"} — {last.candidatesFound} raw → {meta.parsedCount || "?"} parsed → {last.leadsAccepted} accepted → {last.leadsInserted} inserted</div>
                        <div style={{ fontSize: 11, color: "#60697A" }}>Email presence: {meta.emailPresentCount || 0} / {meta.parsedCount || 0} = {meta.yield?.emailPresenceRate || "0%"} — Acceptance {meta.yield?.acceptanceRate || "0%"} — NoEmail {last.noEmailRejected} ({meta.yield?.noEmailRate || ""}), Website {last.websiteRejected} ({meta.yield?.websiteRejectedRate || ""})</div>
                        <div style={{ fontSize: 11, color: "#60697A" }}>Retries: {meta.fetchResult?.retryDelays?.length || 0} — Attempt {meta.fetchResult?.attempt || 1} — Final status {meta.fetchResult?.status || "?"} — {meta.fetchResult?.retryDelays?.map((d: any) => `${d.status || d.error} ${Math.round(d.delay)}ms`).join(", ") || "no retries"}</div>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#9299A8" }}>BBOX: {meta.bbox || "—"} — Tags: {(meta.osmTags || []).join(", ").slice(0, 100)}</div>
                        {meta.githubRunId && (
                          <div style={{ fontSize: 11 }}>
                            GitHub: {githubRunUrl(meta.githubRunId) ? <a href={githubRunUrl(meta.githubRunId)!} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>Run #{meta.githubRunId}</a> : `Run #${meta.githubRunId}`} — Attempt {meta.githubRunAttempt || "1"}
                          </div>
                        )}
                        {last.errorMessage && <div style={{ fontSize: 11, color: "#EC6262", background: "#FDECEC", padding: "4px 8px", borderRadius: 4 }}>{last.errorMessage}</div>}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#9299A8" }}>No runs yet.</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Recent Runs — Phase 4C.1 Enhanced Observability</h3>
              {runs.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9299A8", padding: "20px 0", textAlign: "center" }}>No runs yet. Phase 4C.1 Node worker creates runs with parsed count, yield metrics, retry info, GitHub ID clickable.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {runs.map((run: any) => {
                    const meta = run.metadata || {};
                    const ghUrl = githubRunUrl(meta.githubRunId);
                    return (
                      <div key={run.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", border: "1px solid #F0EEEA", borderRadius: 8, background: run.status === "SUCCESS" ? "#FAF9F7" : run.status === "FAILED" ? "#FDF2F2" : "#FFF9F0" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#151927" }}>{run.status} — {run.location?.city || "—"} / {run.category?.slug || run.category?.name || "—"} / {run.source?.name?.split("/")[0] || "—"}</div>
                          <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2 }}>{new Date(run.startedAt).toLocaleString()} → {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "running"} — {run.candidatesFound} raw → {meta.parsedCount ?? "?"} parsed ({meta.emailPresentCount ?? 0} email, {meta.yield?.emailPresenceRate || "0%"} presence) → {run.leadsAccepted} accepted → {run.leadsInserted} inserted — {run.durationMs ? `${Math.round(run.durationMs/1000)}s` : ""} — {meta.fetchResult?.retryDelays?.length || 0} retries, status {meta.fetchResult?.status || "?"}</div>
                          <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2 }}>Rejected: noEmail {run.noEmailRejected}, generic {run.genericEmailRejected}, website {run.websiteRejected}, dup {run.duplicateRejected}, invalid {run.invalidRejected} — Yield acceptance {meta.yield?.acceptanceRate || "0%"}</div>
                          {run.metadata?.bbox && <div style={{ fontSize: 10, color: "#9299A8", marginTop: 2, fontFamily: "monospace" }}>bbox: {run.metadata.bbox} — tags: {(run.metadata.osmTags || []).join(", ").slice(0, 80)}</div>}
                          {ghUrl && <div style={{ fontSize: 10, marginTop: 2 }}><a href={ghUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>GH#{run.metadata.githubRunId}</a> attempt {run.metadata.githubRunAttempt || 1}</div>}
                        </div>
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: run.status === "SUCCESS" ? "#EEF8F4" : run.status === "FAILED" ? "#FDECEC" : "#FFF6E3", color: run.status === "SUCCESS" ? "#4FAE91" : run.status === "FAILED" ? "#EC6262" : "#F29B38", marginLeft: 12, whiteSpace: "nowrap" }}>{run.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#F0ECFA", border: "1px solid #E0D6F5", borderRadius: 8, fontSize: 11, color: "#49339A" }}>
                <strong>Phase 4C.1:</strong> Fair rotation — missing (never-run) preferred over eligible, location diversity first (never-run locations first, least recently collected), cat/src priority influences without starvation, deterministic. Source health: lastCheckedAt always updated, degraded if retries, down after 5 failures. Metrics: parsedCount, emailPresentCount, emailPresenceRate, acceptanceRate recorded in metadata. Example production run: 100 raw → 92 parsed → 1 email present (1.09%) → 0 accepted — OSM email sparsity is yield bottleneck, needs evidence across locations/categories before enrichment.
              </div>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Phase 4C.1 Architecture</h3>
                <div style={{ fontSize: 11, color: "#60697A", lineHeight: 1.6 }}>
                  Admin UI /settings/lead-collection ↓<br />
                  Neon (Config, Locations, Categories, Sources, Rules, State, Run) ↓<br />
                  GitHub Actions every 3h (Node 20, DATABASE_URL) ↓<br />
                  collector-worker.mjs ↓<br />
                  Prisma — read active config (nulls first) ↓<br />
                  selectNextAssignment — missing preferred, location diversity first ↓<br />
                  compute BBOX from lat/lng/radius ↓<br />
                  build Overpass QL from osmTags (safe validation) ↓<br />
                  fetch Overpass (retry, backoff, Retry-After, degraded health) ↓<br />
                  parse raw 100 → parsed 92 → emailPresent 1 (1.09%) ↓<br />
                  apply CollectionRules (noEmail, generic, website, dup) ↓<br />
                  verify website (Emma Clinic fix) ↓<br />
                  dedup email + company+city ↓<br />
                  insert Lead + update State (cycle, nextEligible now+15m) + finalize Run with yield ↓<br />
                  heartbeat (legacy) + debug CSV optional<br /><br />
                  <strong>Phase 4C.1:</strong> Fair rotation, source health observability, yield metrics, admin observability. No AI, no Google Places yet — gather evidence first.
                </div>
              </div>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Next Eligible States + Countdown</h3>
                {states.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#9299A8" }}>No states yet. Worker lazily creates states for selected assignments only, not full Cartesian product. After 5 runs, should have 5+ states with diverse locations.</div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {states.slice(0, 8).map((st: any) => {
                      const next = st.nextEligibleRunAt ? new Date(st.nextEligibleRunAt) : null;
                      const isNow = !next || next <= new Date();
                      return (
                        <div key={st.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "6px 8px", background: isNow ? "#EEF8F4" : "#FAF9F7", borderRadius: 6, border: `1px solid ${isNow ? "#D5F0E5" : "#F0EEEA"}` }}>
                          <span style={{ color: "#151927" }}>{st.location?.city || "?"} / {st.category?.slug || "?"} / {st.source?.name?.split("/")[0] || "?"}</span>
                          <span style={{ color: isNow ? "#4FAE91" : "#F29B38", fontWeight: isNow ? 600 : 400 }}>{isNow ? "Now" : formatCountdown(st.nextEligibleRunAt)} <span style={{ fontSize: 10, color: "#9299A8" }}>c{st.cycle} f{st.consecutiveFailures}</span></span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>{states.filter((s: any) => !s.nextEligibleRunAt || new Date(s.nextEligibleRunAt) <= new Date()).length} eligible now / {states.length} total states — Fair rotation should show diverse locations, not just London</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 6, width: "fit-content" }}>
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
            }}
          >
            {t.label} {t.count !== null && <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 10, background: activeTab === t.id ? "rgba(255,255,255,0.2)" : "#F0EEEA", color: activeTab === t.id ? "white" : "#9299A8" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>General Settings — CollectorConfig</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Enabled</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.enabled ? "Yes" : "No"} — Controls whether workers should run</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Collection Mode</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.collectionMode} — continuous | scheduled | manual</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Default Batch Size</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.defaultBatchSize} — leads per worker run</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Query Limit</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.defaultQueryLimit} — max queries per run</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Concurrent Requests</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.concurrentRequests} — Effective concurrency min(config, source, SAFE_CAP=3)</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Timeout</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.requestTimeoutMs}ms</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Retry Count</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.retryCount} — Exponential backoff 2^attempt*1000 + jitter, Retry-After support</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Cooldown</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.cooldownMs}ms — Backoff cap 2h on failure</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Frequency</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.collectionFrequencyMinutes} min — DB eligibility interval, different from GitHub cron every 3h</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Verification</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.verificationEnabled ? "Enabled" : "Disabled"} — TRUE NO_SITE check, Emma Clinic fix</div></div>
          </div>
          <div style={{ fontSize: 11, color: "#9299A8", background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            Phase 4C.1: Fair rotation — never-run preferred, location diversity first (lastCollected asc nulls first), priority influences without starvation, deterministic. Source health: lastCheckedAt always updated, degraded if retries, down after 5 failures. Yield: parsedCount, emailPresentCount, emailPresenceRate, acceptanceRate in metadata.
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === "locations" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Locations — Choose where ClientForge should search</h3>
              <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Records, not hardcoded flags. Add ANY location without code change. Rotation prioritizes least recently collected, never-run first.</p>
            </div>
            <button onClick={() => setShowLocationForm(!showLocationForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>{showLocationForm ? "Cancel" : "+ Add Location"}</button>
          </div>

          {showLocationForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Country *</label><input value={locForm.country} onChange={e => setLocForm({ ...locForm, country: e.target.value })} placeholder="United States" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Country Code *</label><input value={locForm.countryCode} onChange={e => setLocForm({ ...locForm, countryCode: e.target.value })} placeholder="US" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>State / Region</label><input value={locForm.state} onChange={e => setLocForm({ ...locForm, state: e.target.value })} placeholder="Texas" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>City *</label><input value={locForm.city} onChange={e => setLocForm({ ...locForm, city: e.target.value })} placeholder="Houston" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Latitude</label><input value={locForm.latitude} onChange={e => setLocForm({ ...locForm, latitude: e.target.value })} placeholder="29.7604" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Longitude</label><input value={locForm.longitude} onChange={e => setLocForm({ ...locForm, longitude: e.target.value })} placeholder="-95.3698" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Radius Km</label><input value={locForm.radiusKm} onChange={e => setLocForm({ ...locForm, radiusKm: e.target.value })} placeholder="25" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Priority</label><select value={locForm.priorityLabel} onChange={e => setLocForm({ ...locForm, priorityLabel: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></div>
              </div>
              <button onClick={handleCreateLocation} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Location</button>
            </div>
          )}

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <input value={searchLocation} onChange={e => setSearchLocation(e.target.value)} placeholder="Search locations..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} />
            <span style={{ fontSize: 11, color: "#9299A8" }}>{filteredLocations.length} locations — Sorted by lastCollected nulls first for fair rotation</span>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 14px" }}>Location</th>
                    <th style={{ padding: "10px 14px" }}>Country</th>
                    <th style={{ padding: "10px 14px" }}>Radius</th>
                    <th style={{ padding: "10px 14px" }}>Priority</th>
                    <th style={{ padding: "10px 14px" }}>Last Collected</th>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>No locations.</td></tr>
                  ) : filteredLocations.map((loc: any) => (
                    <tr key={loc.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 500, color: "#151927" }}>{loc.city}{loc.state ? `, ${loc.state}` : ""}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{loc.country}</div></td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: "#FAF9F7", border: "1px solid #E5E3DF", fontSize: 11 }}>{loc.countryCode}</span></td>
                      <td style={{ padding: "12px 14px", color: "#60697A" }}>{loc.radiusKm} km</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: loc.priorityLabel === "HIGH" ? "#FFF6E3" : loc.priorityLabel === "LOW" ? "#FAF9F7" : "#F0ECFA", color: loc.priorityLabel === "HIGH" ? "#F29B38" : loc.priorityLabel === "LOW" ? "#9299A8" : "#49339A", fontSize: 11, fontWeight: 500 }}>{loc.priorityLabel}</span></td>
                      <td style={{ padding: "12px 14px", color: "#60697A", fontSize: 12 }}>{loc.lastCollectedAt ? new Date(loc.lastCollectedAt).toLocaleString() : "Never — prioritized for rotation"}</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: loc.enabled ? "#EEF8F4" : "#F0EEEA", color: loc.enabled ? "#4FAE91" : "#9299A8", fontSize: 11 }}>{loc.enabled ? "Enabled" : "Disabled"}</span></td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleToggleLocation(loc.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{loc.enabled ? "Disable" : "Enable"}</button>
                          <button onClick={() => handleDeleteLocation(loc.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button>
                        </div>
                      </td>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Lead Categories — Configure types of businesses to discover</h3>
              <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Without changing code. Rotation prioritizes never-run categories first, priority influences without starvation.</p>
            </div>
            <button onClick={() => setShowCategoryForm(!showCategoryForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showCategoryForm ? "Cancel" : "+ Add Category"}</button>
          </div>

          {showCategoryForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label><input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="Dental" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Slug *</label><input value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="dental" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Description</label><input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Dental clinics" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Priority</label><select value={catForm.priorityLabel} onChange={e => setCatForm({ ...catForm, priorityLabel: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>OSM Tags JSON</label><input value={catForm.osmTags} onChange={e => setCatForm({ ...catForm, osmTags: e.target.value })} placeholder='["amenity"="dentist"]' style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateCategory} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Category</button>
            </div>
          )}

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", gap: 12 }}>
            <input value={searchCategory} onChange={e => setSearchCategory(e.target.value)} placeholder="Search categories..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} />
            <span style={{ fontSize: 11, color: "#9299A8" }}>{filteredCategories.length} categories — Sorted by lastRun nulls first for fair rotation</span>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Category</th><th style={{ padding: "10px 14px" }}>Source Query</th><th style={{ padding: "10px 14px" }}>Priority</th><th style={{ padding: "10px 14px" }}>Last Run</th><th style={{ padding: "10px 14px" }}>Status</th><th style={{ padding: "10px 14px" }}>Actions</th></tr></thead>
              <tbody>
                {filteredCategories.length === 0 ? <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>No categories.</td></tr> : filteredCategories.map((cat: any) => (
                  <tr key={cat.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 500, color: "#151927" }}>{cat.name}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{cat.slug}</div></td>
                    <td style={{ padding: "12px 14px", fontSize: 11, color: "#60697A", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.osmTags ? JSON.stringify(cat.osmTags).slice(0, 60) : cat.description || "—"}</td>
                    <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: cat.priorityLabel === "HIGH" ? "#FFF6E3" : cat.priorityLabel === "LOW" ? "#FAF9F7" : "#F0ECFA", color: cat.priorityLabel === "HIGH" ? "#F29B38" : cat.priorityLabel === "LOW" ? "#9299A8" : "#49339A", fontSize: 11, fontWeight: 500 }}>{cat.priorityLabel}</span></td>
                    <td style={{ padding: "12px 14px", color: "#60697A", fontSize: 12 }}>{cat.lastRunAt ? new Date(cat.lastRunAt).toLocaleString() : "Never — prioritized"}</td>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Sources & APIs — Health Observability</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Phase 4C.1: lastCheckedAt always updated, degraded if retries, down after 5 failures. 504×3 → degraded, not down, with retry info in run metadata.</p></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowSourceForm(!showSourceForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showSourceForm ? "Cancel" : "+ Add Source"}</button>
              <button onClick={() => setShowCredentialForm(!showCredentialForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E3DF", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ Provider Key</button>
            </div>
          </div>

          {showSourceForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label><input value={sourceForm.name} onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Type *</label><select value={sourceForm.type} onChange={e => setSourceForm({ ...sourceForm, type: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option value="overpass">overpass</option><option value="google_places">google_places</option><option value="google_maps">google_maps</option><option value="custom">custom</option></select></div>
                <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Base URL *</label><input value={sourceForm.baseUrl} onChange={e => setSourceForm({ ...sourceForm, baseUrl: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Timeout Ms</label><input value={sourceForm.timeoutMs} onChange={e => setSourceForm({ ...sourceForm, timeoutMs: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Concurrency</label><input value={sourceForm.concurrency} onChange={e => setSourceForm({ ...sourceForm, concurrency: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateSource} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Source</button>
            </div>
          )}

          {showCredentialForm && (
            <div style={{ background: "#FFF6E3", border: "1px solid #F4BE52", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927" }}>Secure Provider Credential</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Provider *</label><select value={credForm.provider} onChange={e => setCredForm({ ...credForm, provider: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option value="openai">openai</option><option value="google_maps">google_maps</option><option value="google_places">google_places</option><option value="enrichment">enrichment</option><option value="resend">resend</option><option value="custom">custom</option></select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Label</label><input value={credForm.label} onChange={e => setCredForm({ ...credForm, label: e.target.value })} placeholder="production" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>API Key *</label><input value={credForm.apiKey} onChange={e => setCredForm({ ...credForm, apiKey: e.target.value })} placeholder="sk-..." type="password" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateCredential} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#151927", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Save Encrypted Key</button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Configured Endpoints — {sources.length} — Health: {healthBreakdown.healthy} healthy, {healthBreakdown.degraded} degraded, {healthBreakdown.down} down</div>
              {sources.length === 0 ? <div style={{ padding: 20, fontSize: 12, color: "#9299A8", textAlign: "center" }}>No sources.</div> : sources.map((src: any) => (
                <div key={src.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{src.name}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{src.baseUrl} — {src.type} — {src.concurrency} conc — {src.timeoutMs}ms — Last checked {src.lastCheckedAt ? new Date(src.lastCheckedAt).toLocaleString() : "Never"}</div></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: src.healthStatus === "healthy" ? "#EEF8F4" : src.healthStatus === "down" ? "#FDECEC" : src.healthStatus === "degraded" ? "#FFF6E3" : "#FAF9F7", color: src.healthStatus === "healthy" ? "#4FAE91" : src.healthStatus === "down" ? "#EC6262" : src.healthStatus === "degraded" ? "#F29B38" : "#9299A8", fontSize: 11 }}>{src.healthStatus}</span>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: src.enabled ? "#EEF8F4" : "#F0EEEA", color: src.enabled ? "#4FAE91" : "#9299A8", fontSize: 11 }}>{src.enabled ? "Enabled" : "Disabled"}</span>
                    <button onClick={() => handleToggleSource(src.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{src.enabled ? "Disable" : "Enable"}</button>
                    <button onClick={() => handleDeleteSource(src.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Provider Credentials — Secure — {credentials.length}</div>
              {credentials.length === 0 ? <div style={{ padding: 20, fontSize: 12, color: "#9299A8", textAlign: "center" }}>No credentials.</div> : credentials.map((cred: any) => (
                <div key={cred.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{cred.provider} {cred.label ? `(${cred.label})` : ""}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{cred.maskedKey} — Status {cred.status}</div></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleTestCredential(cred.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>Test</button>
                    <button onClick={() => handleDeleteCredential(cred.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collection Rules</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Extensible, configuration controls only.</p></div>
            <button onClick={() => setShowRuleForm(!showRuleForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showRuleForm ? "Cancel" : "+ Add Rule"}</button>
          </div>

          {showRuleForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Key *</label><input value={ruleForm.key} onChange={e => setRuleForm({ ...ruleForm, key: e.target.value })} placeholder="require_email" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label><input value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Require Email" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Category</label><select value={ruleForm.category} onChange={e => setRuleForm({ ...ruleForm, category: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option value="lead_requirements">lead_requirements</option><option value="verification">verification</option><option value="deduplication">deduplication</option><option value="filtering">filtering</option></select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Description</label><input value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })} placeholder="Lead must have email" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateRule} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Rule</button>
            </div>
          )}

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Rules — {rules.length}</div>
            <div style={{ display: "grid", gap: 1, background: "#F0EEEA" }}>
              {rules.map((rule: any) => (
                <div key={rule.id} style={{ background: "white", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{rule.name} <span style={{ fontSize: 11, color: "#9299A8" }}>({rule.key})</span></div><div style={{ fontSize: 11, color: "#9299A8" }}>{rule.description || "—"} — {rule.category}</div></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: rule.enabled ? "#EEF8F4" : "#F0EEEA", color: rule.enabled ? "#4FAE91" : "#9299A8", fontSize: 11 }}>{rule.enabled ? "ON" : "OFF"}</span>
                    <button onClick={() => handleToggleRule(rule.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{rule.enabled ? "Disable" : "Enable"}</button>
                    <button onClick={() => handleDeleteRule(rule.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Runs Tab — Phase 4C.1 Enhanced */}
      {activeTab === "runs" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collector Run History — Phase 4C.1 Enhanced</h3>
              <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Every GitHub execution = 1 assignment. SUCCESS = worker completed (0 leads still SUCCESS). Metrics: raw → parsed → emailPresent (1.09% example) → accepted → inserted. Retries, HTTP status, GitHub ID clickable, finishedAt, errorMessage.</p>
            </div>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1100 }}>
                <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Started / Finished</th><th style={{ padding: "10px 14px" }}>Status / Error</th><th style={{ padding: "10px 14px" }}>Location / Category / Source</th><th style={{ padding: "10px 14px" }}>Raw / Parsed / EmailPresent</th><th style={{ padding: "10px 14px" }}>Rejected</th><th style={{ padding: "10px 14px" }}>Accepted / Inserted / Yield</th><th style={{ padding: "10px 14px" }}>Duration / Retries / HTTP / GitHub</th></tr></thead>
                <tbody>
                  {runs.length === 0 ? <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9299A8" }}>No runs yet. After 5 manual runs, should show diverse locations, not just London/dental/DE.</td></tr> : runs.map((run: any) => {
                    const meta = run.metadata || {};
                    const ghUrl = githubRunUrl(meta.githubRunId);
                    return (
                      <tr key={run.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                        <td style={{ padding: "10px 14px", color: "#60697A", fontSize: 11 }}>{new Date(run.startedAt).toLocaleString()}<br /><span style={{ fontSize: 10, color: "#9299A8" }}>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "running"}</span></td>
                        <td style={{ padding: "10px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: run.status === "SUCCESS" ? "#EEF8F4" : run.status === "FAILED" ? "#FDECEC" : "#FFF6E3", color: run.status === "SUCCESS" ? "#4FAE91" : run.status === "FAILED" ? "#EC6262" : "#F29B38", fontSize: 11 }}>{run.status}</span>{run.errorMessage ? <div style={{ fontSize: 10, color: "#EC6262", marginTop: 4, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", background: "#FDECEC", padding: "2px 6px", borderRadius: 4 }}>{run.errorMessage.slice(0, 100)}</div> : null}</td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#151927" }}><div style={{ fontWeight: 500 }}>{run.location?.city || "—"} / {run.category?.slug || "—"}</div><div style={{ fontSize: 10, color: "#9299A8" }}>{run.source?.name?.slice(0, 30) || "—"}</div></td>
                        <td style={{ padding: "10px 14px", color: "#60697A", fontSize: 11 }}>{run.candidatesFound} raw / {meta.parsedCount ?? "?"} parsed / {meta.emailPresentCount ?? 0} email ({meta.yield?.emailPresenceRate || "0%"})</td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#9299A8" }}>{run.noEmailRejected}/{run.genericEmailRejected}/{run.websiteRejected}/{run.duplicateRejected}/{run.invalidRejected}<br /><span style={{ fontSize: 10 }}>noEmail/gen/web/dup/inv</span></td>
                        <td style={{ padding: "10px 14px", color: "#4FAE91", fontWeight: 500, fontSize: 11 }}>{run.leadsAccepted} / {run.leadsInserted}<br /><span style={{ fontSize: 10, color: "#9299A8" }}>{meta.yield?.acceptanceRate || "0%"} accept</span></td>
                        <td style={{ padding: "10px 14px", color: "#60697A", fontSize: 11 }}>{run.durationMs ? `${Math.round(run.durationMs/1000)}s` : "—"}<br />{meta.fetchResult?.retryDelays?.length || 0} retries (attempt {meta.fetchResult?.attempt || 1})<br />HTTP {meta.fetchResult?.status || "?"}<br />{ghUrl ? <a href={ghUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>GH#{meta.githubRunId}</a> : meta.githubRunId ? `GH#${meta.githubRunId}` : ""} {meta.githubRunAttempt ? `a${meta.githubRunAttempt}` : ""}<br /><span style={{ fontSize: 10, fontFamily: "monospace" }}>{meta.bbox ? meta.bbox.slice(0, 30) : ""}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* States Tab — Phase 4C.1 Enhanced */}
      {activeTab === "states" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collector State — Phase 4C.1 Fair Rotation & Countdown</h3>
            <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Neon remembers progress. Fair rotation: missing (never-run) preferred, location diversity first (lastCollected asc nulls first), priority influences without starvation, deterministic. NextEligible = now + frequency (15m) on success, exponential backoff capped 2h on failure. Countdown shows time until eligible.</p>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1000 }}>
                <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Location / Category / Source</th><th style={{ padding: "10px 14px" }}>Last Run / Last Success / Next Eligible + Countdown</th><th style={{ padding: "10px 14px" }}>Cycle / Failures</th><th style={{ padding: "10px 14px" }}>Candidates / Accepted / Rejected</th><th style={{ padding: "10px 14px" }}>Cursor / BBOX / Last Run ID</th></tr></thead>
                <tbody>
                  {states.length === 0 ? <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#9299A8" }}>No state yet. After 5 runs, should have 5+ states with diverse locations, not just London. Each state unique [location,category,source].</td></tr> : states.map((st: any) => {
                    const next = st.nextEligibleRunAt ? new Date(st.nextEligibleRunAt) : null;
                    const isNow = !next || next <= new Date();
                    return (
                      <tr key={st.id} style={{ borderBottom: "1px solid #F0EEEA", background: isNow ? "#FAFDFB" : "white" }}>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}><div style={{ fontWeight: 500, color: "#151927" }}>{st.location?.city || "—"} / {st.category?.slug || st.category?.name || "—"}</div><div style={{ fontSize: 10, color: "#9299A8" }}>{st.source?.name?.slice(0, 30) || "—"} — P: {(st.location?.priority||0)+(st.category?.priority||0)+(st.source?.priority||0)} — {st.location?.countryCode || ""}</div></td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#60697A" }}><div>Last: {st.lastRunAt ? new Date(st.lastRunAt).toLocaleString() : "Never"}</div><div style={{ fontSize: 10, color: "#9299A8" }}>Success: {st.lastSuccessfulRunAt ? new Date(st.lastSuccessfulRunAt).toLocaleString() : "Never"}</div><div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}><span style={{ padding: "2px 6px", borderRadius: 4, background: isNow ? "#EEF8F4" : "#FFF6E3", color: isNow ? "#4FAE91" : "#F29B38", fontSize: 10, fontWeight: 600 }}>{isNow ? "Eligible Now" : `Next ${next?.toLocaleString()}`}</span><span style={{ fontSize: 11, fontWeight: 500, color: isNow ? "#4FAE91" : "#F29B38" }}>{formatCountdown(st.nextEligibleRunAt)}</span></div></td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.cycle} cycles / <span style={{ color: st.consecutiveFailures > 0 ? "#EC6262" : "#4FAE91", fontWeight: 500 }}>{st.consecutiveFailures} failures</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.totalCandidates} candidates / {st.totalAccepted} accepted / {st.totalRejected} rejected</td>
                        <td style={{ padding: "10px 14px", fontSize: 10, color: "#9299A8", maxWidth: 220, overflow: "hidden" }}><div style={{ fontFamily: "monospace" }}>{st.cursor?.lastBbox ? st.cursor.lastBbox.slice(0, 50) : st.cursor ? JSON.stringify(st.cursor).slice(0, 70) : "—"}</div><div style={{ fontSize: 10, color: "#9299A8", marginTop: 2 }}>Run: {st.cursor?.lastRunId?.slice(0, 8) || "—"} — {st.cursor?.lastAccepted ?? 0} accepted / {st.cursor?.lastCandidates ?? 0} candidates</div></td>
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
