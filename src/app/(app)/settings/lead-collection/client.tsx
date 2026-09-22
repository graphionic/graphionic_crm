"use client";
import { useState } from "react";

type Tab = "overview" | "general" | "locations" | "categories" | "sources" | "rules" | "runs" | "states";

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
  const [overview] = useState(initialOverview);
  const [locations, setLocations] = useState(initialLocations);
  const [categories, setCategories] = useState(initialCategories);
  const [sources, setSources] = useState(initialSources);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [rules, setRules] = useState(initialRules);
  const [runs] = useState(initialRuns);
  const [states] = useState(initialStates);

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

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collector Control Center</h2>
          <p style={{ fontSize: 13, color: "#60697A" }}>Configure where and how ClientForge discovers businesses. All settings stored in Neon PostgreSQL.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: overview.config.enabled ? "#EEF8F4" : "#FDECEC", color: overview.config.enabled ? "#4FAE91" : "#EC6262", border: `1px solid ${overview.config.enabled ? "#D5F0E5" : "#FBD5D5"}` }}>
            {overview.config.enabled ? "● Enabled" : "● Disabled"}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Locations</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>{overview.counts.locationsActive} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview.counts.locationsTotal} Active</span></div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Where to search</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Categories</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>{overview.counts.categoriesActive} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview.counts.categoriesTotal} Active</span></div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Business types</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Sources</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>{overview.counts.sourcesActive} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview.counts.sourcesTotal} Healthy</span></div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Map APIs</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Verification</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: overview.config.verificationEnabled ? "#4FAE91" : "#9299A8" }}>{overview.config.verificationEnabled ? "Enabled" : "Disabled"}</div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>TRUE NO_SITE check</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Recent Runs — Phase 4B Worker</h3>
              {runs.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9299A8", padding: "20px 0", textAlign: "center" }}>No runs yet. Phase 4B Node worker (collector-worker.mjs) will create CollectorRun records here. Each GitHub Actions execution = 1 assignment (Location + Category + Source). SUCCESS means worker completed, not necessarily leads found.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {runs.map((run: any) => (
                    <div key={run.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #F0EEEA", borderRadius: 8, background: run.status === "SUCCESS" ? "#FAF9F7" : run.status === "FAILED" ? "#FDF2F2" : "#FFF9F0" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#151927" }}>{run.status} — {run.location?.city || "—"} / {run.category?.slug || run.category?.name || "—"} / {run.source?.name?.split("/")[0] || "—"}</div>
                        <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2 }}>{new Date(run.startedAt).toLocaleString()} — {run.candidatesFound} candidates → {run.leadsAccepted} accepted → {run.leadsInserted} inserted — {run.websiteRejected} websiteRejected, {run.duplicateRejected} dup — {run.durationMs ? `${Math.round(run.durationMs/1000)}s` : ""} {run.metadata?.githubRunId ? `— GH#${run.metadata.githubRunId}` : ""}</div>
                        {run.metadata?.bbox && <div style={{ fontSize: 10, color: "#9299A8", marginTop: 2, fontFamily: "monospace" }}>bbox: {run.metadata.bbox} — tags: {(run.metadata.osmTags || []).join(", ").slice(0, 80)}</div>}
                      </div>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: run.status === "SUCCESS" ? "#EEF8F4" : run.status === "FAILED" ? "#FDECEC" : "#FFF6E3", color: run.status === "SUCCESS" ? "#4FAE91" : run.status === "FAILED" ? "#EC6262" : "#F29B38", marginLeft: 12, whiteSpace: "nowrap" }}>{run.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#F0ECFA", border: "1px solid #E0D6F5", borderRadius: 8, fontSize: 11, color: "#49339A" }}>
                <strong>Phase 4B:</strong> Worker = Node.js + Prisma, 1 assignment per GitHub run, fair rotation via CollectorState (nextEligible → lastRun → priority → failures). GitHub cron every 3h, DB frequency {overview.config.collectionFrequencyMinutes}min. Concurrency min(config.concurrent, source.concurrency, {3}). User-Agent ClientForge-Collector/1.0. CSV optional debug only.
              </div>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Phase 4B Architecture</h3>
                <div style={{ fontSize: 11, color: "#60697A", lineHeight: 1.6 }}>
                  Admin UI /settings/lead-collection ↓<br />
                  Neon (Config, Locations, Categories, Sources, Rules) ↓<br />
                  GitHub Actions every 3h (Node 20) ↓<br />
                  collector-worker.mjs ↓<br />
                  Prisma — read active config ↓<br />
                  selectNextAssignment (fair rotation) ↓<br />
                  compute BBOX from lat/lng/radius ↓<br />
                  build Overpass QL from osmTags ↓<br />
                  fetch Overpass (safe, retry, backoff) ↓<br />
                  parse node/way/relation ↓<br />
                  apply CollectionRules ↓<br />
                  verify website (Emma Clinic fix) ↓<br />
                  dedup email + company+city ↓<br />
                  insert Lead + update State + finalize Run ↓<br />
                  heartbeat (legacy) + CSV debug optional<br /><br />
                  <strong>Phase 4B:</strong> Dynamic DB-backed, no hardcoded cities/categories/endpoints. Changing enabled location/category in UI affects future runs without deploy.
                </div>
              </div>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Next Eligible States</h3>
                {states.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#9299A8" }}>No states yet. Worker will lazily create states for selected assignments only, not full Cartesian product.</div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {states.slice(0, 5).map((st: any) => {
                      const next = st.nextEligibleRunAt ? new Date(st.nextEligibleRunAt) : null;
                      const isNow = !next || next <= new Date();
                      return (
                        <div key={st.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "6px 8px", background: isNow ? "#EEF8F4" : "#FAF9F7", borderRadius: 6, border: `1px solid ${isNow ? "#D5F0E5" : "#F0EEEA"}` }}>
                          <span style={{ color: "#151927" }}>{st.location?.city || "?"} / {st.category?.slug || "?"}</span>
                          <span style={{ color: isNow ? "#4FAE91" : "#9299A8", fontWeight: isNow ? 600 : 400 }}>{isNow ? "Now" : next?.toLocaleTimeString()}</span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>{states.filter((s: any) => !s.nextEligibleRunAt || new Date(s.nextEligibleRunAt) <= new Date()).length} eligible now / {states.length} total states</div>
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
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Concurrent Requests</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.concurrentRequests}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Timeout</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.requestTimeoutMs}ms</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Retry Count</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.retryCount}</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Cooldown</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.cooldownMs}ms</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Frequency</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.collectionFrequencyMinutes} min — collection frequency metadata</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Verification</div><div style={{ fontSize: 13, color: "#151927" }}>{overview.config.verificationEnabled ? "Enabled" : "Disabled"} — TRUE NO_SITE check</div></div>
          </div>
          <div style={{ fontSize: 11, color: "#9299A8", background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            Extensible via metadata JSON. Future workers will read this config from Neon instead of hardcoded Python constants. Stored in CollectorConfig model, key=default singleton.
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === "locations" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Locations — Choose where ClientForge should search</h3>
              <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Records, not hardcoded ukEnabled/usaEnabled flags. Add ANY location without changing code.</p>
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
            <span style={{ fontSize: 11, color: "#9299A8" }}>{filteredLocations.length} locations</span>
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
                    <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>No locations. Add Houston, Manchester, Dubai, Melbourne, Surat etc. Example: United States / Texas / Houston</td></tr>
                  ) : filteredLocations.map((loc: any) => (
                    <tr key={loc.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 500, color: "#151927" }}>{loc.city}{loc.state ? `, ${loc.state}` : ""}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{loc.country}</div></td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: "#FAF9F7", border: "1px solid #E5E3DF", fontSize: 11 }}>{loc.countryCode}</span></td>
                      <td style={{ padding: "12px 14px", color: "#60697A" }}>{loc.radiusKm} km</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: loc.priorityLabel === "HIGH" ? "#FFF6E3" : loc.priorityLabel === "LOW" ? "#FAF9F7" : "#F0ECFA", color: loc.priorityLabel === "HIGH" ? "#F29B38" : loc.priorityLabel === "LOW" ? "#9299A8" : "#49339A", fontSize: 11, fontWeight: 500 }}>{loc.priorityLabel}</span></td>
                      <td style={{ padding: "12px 14px", color: "#60697A", fontSize: 12 }}>{loc.lastCollectedAt ? new Date(loc.lastCollectedAt).toLocaleString() : "Never"}</td>
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
              <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Without changing Python source code. Future: Restaurants, Hotels, Law Firms, Salons, Real Estate etc.</p>
            </div>
            <button onClick={() => setShowCategoryForm(!showCategoryForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showCategoryForm ? "Cancel" : "+ Add Category"}</button>
          </div>

          {showCategoryForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label><input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="Dental" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Slug *</label><input value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="dental" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Description</label><input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Dental clinics and dentists" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Priority</label><select value={catForm.priorityLabel} onChange={e => setCatForm({ ...catForm, priorityLabel: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>OSM Tags JSON</label><input value={catForm.osmTags} onChange={e => setCatForm({ ...catForm, osmTags: e.target.value })} placeholder='["amenity"="dentist"]' style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateCategory} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Category</button>
            </div>
          )}

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", gap: 12 }}>
            <input value={searchCategory} onChange={e => setSearchCategory(e.target.value)} placeholder="Search categories..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} />
            <span style={{ fontSize: 11, color: "#9299A8" }}>{filteredCategories.length} categories</span>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Category</th><th style={{ padding: "10px 14px" }}>Source Query</th><th style={{ padding: "10px 14px" }}>Priority</th><th style={{ padding: "10px 14px" }}>Last Run</th><th style={{ padding: "10px 14px" }}>Status</th><th style={{ padding: "10px 14px" }}>Actions</th></tr></thead>
              <tbody>
                {filteredCategories.length === 0 ? <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>No categories. Add dental, eye, pet_store, hospital, physio, orthopedic, ivf, restaurants, hotels etc.</td></tr> : filteredCategories.map((cat: any) => (
                  <tr key={cat.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 500, color: "#151927" }}>{cat.name}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{cat.slug}</div></td>
                    <td style={{ padding: "12px 14px", fontSize: 11, color: "#60697A", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.osmTags ? JSON.stringify(cat.osmTags).slice(0, 60) : cat.description || "—"}</td>
                    <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: cat.priorityLabel === "HIGH" ? "#FFF6E3" : cat.priorityLabel === "LOW" ? "#FAF9F7" : "#F0ECFA", color: cat.priorityLabel === "HIGH" ? "#F29B38" : cat.priorityLabel === "LOW" ? "#9299A8" : "#49339A", fontSize: 11, fontWeight: 500 }}>{cat.priorityLabel}</span></td>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Sources & APIs — OpenStreetMap / Overpass + Future Providers</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Extensible source configuration, not hardcoded to 3 endpoints. Future: Google Maps, Google Places, custom providers.</p></div>
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
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927" }}>Secure Provider Credential — Encrypted at rest, never returned to client</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Provider *</label><select value={credForm.provider} onChange={e => setCredForm({ ...credForm, provider: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option value="openai">openai</option><option value="google_maps">google_maps</option><option value="google_places">google_places</option><option value="enrichment">enrichment</option><option value="resend">resend</option><option value="custom">custom</option></select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Label (optional)</label><input value={credForm.label} onChange={e => setCredForm({ ...credForm, label: e.target.value })} placeholder="production" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>API Key * — Encrypted with CREDENTIAL_ENCRYPTION_KEY env var, never logged, never returned</label><input value={credForm.apiKey} onChange={e => setCredForm({ ...credForm, apiKey: e.target.value })} placeholder="sk-..." type="password" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateCredential} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#151927", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Save Encrypted Key</button>
              <div style={{ fontSize: 11, color: "#9299A8" }}>Security: encrypted with AES-256-GCM using CREDENTIAL_ENCRYPTION_KEY (32 bytes base64) from env, NOT stored in Neon. UI shows only ••••9K2A hint, status Connected. Test Connection and Replace Key buttons, never expose full value.</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Configured Endpoints — {sources.length}</div>
              {sources.length === 0 ? <div style={{ padding: 20, fontSize: 12, color: "#9299A8", textAlign: "center" }}>No sources. Add overpass-api.de, kumi.systems, maps.mail.ru etc. Endpoint Strategy Automatic / Custom Pool, Timeout 25s, Retries 3, Concurrency 15</div> : sources.map((src: any) => (
                <div key={src.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{src.name}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{src.baseUrl} — {src.type} — {src.concurrency} concurrency — {src.timeoutMs}ms</div></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: src.healthStatus === "healthy" ? "#EEF8F4" : src.healthStatus === "down" ? "#FDECEC" : "#FAF9F7", color: src.healthStatus === "healthy" ? "#4FAE91" : src.healthStatus === "down" ? "#EC6262" : "#9299A8", fontSize: 11 }}>{src.healthStatus}</span>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: src.enabled ? "#EEF8F4" : "#F0EEEA", color: src.enabled ? "#4FAE91" : "#9299A8", fontSize: 11 }}>{src.enabled ? "Enabled" : "Disabled"}</span>
                    <button onClick={() => handleToggleSource(src.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>{src.enabled ? "Disable" : "Enable"}</button>
                    <button onClick={() => handleDeleteSource(src.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Provider Credentials — Secure — {credentials.length}</div>
              {credentials.length === 0 ? <div style={{ padding: 20, fontSize: 12, color: "#9299A8", textAlign: "center" }}>No credentials. Add OpenAI API Key ••••9K2A Status Configured [Test Connection] [Replace Key] — full value never returned to client</div> : credentials.map((cred: any) => (
                <div key={cred.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{cred.provider} {cred.label ? `(${cred.label})` : ""}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{cred.maskedKey} — Status {cred.status} — Last tested {cred.lastTestedAt ? new Date(cred.lastTestedAt).toLocaleString() : "Never"}</div></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleTestCredential(cred.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}>Test Connection</button>
                    <button onClick={() => handleDeleteCredential(cred.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ))}
              <div style={{ padding: 12, fontSize: 11, color: "#9299A8", background: "#FAF9F7" }}>DO NOT store secrets as plain Setting values. DO NOT expose API keys back to browser after saving. DO NOT log secrets. DO NOT include secrets in API responses. Encryption key from CREDENTIAL_ENCRYPTION_KEY env var, NOT stored in Neon. Provide safe env documentation, not production key.</div>
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collection Rules — Lead Requirements / Verification / Deduplication</h3><p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Extensible for future requirements, not overly rigid. Configuration controls only, do NOT rewrite verification implementation during Phase 4A.</p></div>
            <button onClick={() => setShowRuleForm(!showRuleForm)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{showRuleForm ? "Cancel" : "+ Add Rule"}</button>
          </div>

          {showRuleForm && (
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Key * (a-z0-9_)</label><input value={ruleForm.key} onChange={e => setRuleForm({ ...ruleForm, key: e.target.value })} placeholder="require_email" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label><input value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Require Email" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Category</label><select value={ruleForm.category} onChange={e => setRuleForm({ ...ruleForm, category: e.target.value })} style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}><option value="lead_requirements">lead_requirements</option><option value="verification">verification</option><option value="deduplication">deduplication</option><option value="filtering">filtering</option></select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Description</label><input value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })} placeholder="Lead must have email" style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }} /></div>
              </div>
              <button onClick={handleCreateRule} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}>Create Rule</button>
            </div>
          )}

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>Lead Requirements — {rules.filter((r: any) => r.category === "lead_requirements").length} rules</div>
            {rules.length === 0 ? (
              <div style={{ padding: 20, display: "grid", gap: 10 }}>
                {[
                  { key: "require_email", name: "Require email", desc: "Lead must have email", enabled: true },
                  { key: "require_no_website", name: "Require no website", desc: "Only NO_SITE leads", enabled: true },
                  { key: "reject_generic", name: "Reject generic email domains", desc: "Reject gmail, yahoo etc", enabled: true },
                  { key: "verify_email_domain", name: "Verify email domain website", desc: "Check if domain has live site (Emma Clinic fix)", enabled: true },
                  { key: "deduplicate", name: "Deduplicate before insert", desc: "By email or company+city", enabled: true },
                ].map(r => (
                  <div key={r.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #F0EEEA", borderRadius: 8, background: "#FAF9F7" }}>
                    <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{r.name}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{r.desc}</div></div>
                    <span style={{ padding: "4px 10px", borderRadius: 6, background: r.enabled ? "#49339A" : "#F0EEEA", color: r.enabled ? "white" : "#9299A8", fontSize: 11 }}>{r.enabled ? "ON" : "OFF"}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Example from spec — will be persisted in CollectionRule model after creation. Website Verification: HTTPS check ON, HTTP fallback ON, Follow redirects ON</div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* Runs Tab */}
      {activeTab === "runs" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collector Run History — Phase 4B Worker</h3>
              <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Every GitHub Actions execution creates 1 run. SUCCESS = worker completed without fatal error (0 leads still SUCCESS). PARTIAL = some queries failed but useful work done. FAILED = fatal error. Metadata contains GitHub run ID, bbox, OSM tags, endpoint, retries, warnings.</p>
            </div>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Started</th><th style={{ padding: "10px 14px" }}>Status</th><th style={{ padding: "10px 14px" }}>Location / Category / Source</th><th style={{ padding: "10px 14px" }}>Queries / Candidates</th><th style={{ padding: "10px 14px" }}>Rejected (noEmail/generic/website/dup/invalid)</th><th style={{ padding: "10px 14px" }}>Accepted / Inserted</th><th style={{ padding: "10px 14px" }}>Duration / GitHub / BBOX</th></tr></thead>
                <tbody>
                  {runs.length === 0 ? <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9299A8" }}>No runs yet. Phase 4B worker will create runs with metadata: githubRunId, bbox, osmTags, endpoint, retry info, warnings, query failures. Stale RUNNING recovery threshold {20}min. Concurrency min(config.concurrent, source.concurrency, SAFE_CAP=3). User-Agent ClientForge-Collector/1.0</td></tr> : runs.map((run: any) => (
                    <tr key={run.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      <td style={{ padding: "10px 14px", color: "#60697A", fontSize: 11 }}>{new Date(run.startedAt).toLocaleString()}<br /><span style={{ fontSize: 10, color: "#9299A8" }}>{run.metadata?.githubRunId ? `GH#${run.metadata.githubRunId}` : ""}</span></td>
                      <td style={{ padding: "10px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: run.status === "SUCCESS" ? "#EEF8F4" : run.status === "FAILED" ? "#FDECEC" : "#FFF6E3", color: run.status === "SUCCESS" ? "#4FAE91" : run.status === "FAILED" ? "#EC6262" : "#F29B38", fontSize: 11 }}>{run.status}</span>{run.errorMessage ? <div style={{ fontSize: 10, color: "#EC6262", marginTop: 4, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{run.errorMessage.slice(0, 80)}</div> : null}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#151927" }}><div style={{ fontWeight: 500 }}>{run.location?.city || "—"} / {run.category?.slug || "—"}</div><div style={{ fontSize: 10, color: "#9299A8" }}>{run.source?.name?.slice(0, 25) || "—"}</div></td>
                      <td style={{ padding: "10px 14px", color: "#60697A" }}>{run.queriesAttempted} / {run.candidatesFound}{run.metadata?.fetchResult?.retryDelays?.length ? <span style={{ fontSize: 10, color: "#F29B38" }}> ({run.metadata.fetchResult.retryDelays.length} retries)</span> : null}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#9299A8" }}>{run.noEmailRejected}/{run.genericEmailRejected}/{run.websiteRejected}/{run.duplicateRejected}/{run.invalidRejected}</td>
                      <td style={{ padding: "10px 14px", color: "#4FAE91", fontWeight: 500 }}>{run.leadsAccepted} / {run.leadsInserted}</td>
                      <td style={{ padding: "10px 14px", color: "#60697A", fontSize: 11 }}>{run.durationMs ? `${Math.round(run.durationMs/1000)}s` : "—"}<br /><span style={{ fontSize: 10, fontFamily: "monospace", color: "#9299A8" }}>{run.metadata?.bbox ? run.metadata.bbox.slice(0, 35) : ""}</span>{run.metadata?.warnings?.length ? <div style={{ fontSize: 10, color: "#F29B38" }}>{run.metadata.warnings.length} warnings</div> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* States Tab */}
      {activeTab === "states" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Collector State — Phase 4B Fair Rotation & Lazy Init</h3>
            <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Neon remembers progress because GitHub workers are stateless. Fair rotation: nextEligible ASC nulls first → lastRun ASC nulls first (least recently run) → failures ASC → priority sum DESC. Priority affects selection only, not frequency. Frequency = collectionFrequencyMinutes. Lazy init: only create state for selected combo, not full Cartesian product (scalable to 1000+ locations × 50+ categories). NextEligible = now + frequency on success, exponential backoff capped 2h on failure.</p>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 14px" }}>Location / Category / Source</th><th style={{ padding: "10px 14px" }}>Last Run / Last Success / Next Eligible</th><th style={{ padding: "10px 14px" }}>Cycle / Failures</th><th style={{ padding: "10px 14px" }}>Candidates / Accepted / Rejected</th><th style={{ padding: "10px 14px" }}>Cursor / BBOX</th></tr></thead>
                <tbody>
                  {states.length === 0 ? <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#9299A8" }}>No state yet. Worker will lazily create states. Supports location, category, source, lastRunAt, lastSuccessfulRunAt, nextEligibleRunAt, cursor (bbox, category, source, lastRunId), cycle, consecutiveFailures, totalCandidates/Accepted/Rejected. Unique [locationId, categoryId, sourceId]. Threshold for stale RUNNING recovery 20min.</td></tr> : states.map((st: any) => {
                    const next = st.nextEligibleRunAt ? new Date(st.nextEligibleRunAt) : null;
                    const isNow = !next || next <= new Date();
                    return (
                      <tr key={st.id} style={{ borderBottom: "1px solid #F0EEEA", background: isNow ? "#FAFDFB" : "white" }}>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}><div style={{ fontWeight: 500, color: "#151927" }}>{st.location?.city || "—"} / {st.category?.slug || st.category?.name || "—"}</div><div style={{ fontSize: 10, color: "#9299A8" }}>{st.source?.name?.slice(0, 30) || "—"} — P: {(st.location?.priority||0)+(st.category?.priority||0)+(st.source?.priority||0)}</div></td>
                        <td style={{ padding: "10px 14px", fontSize: 11, color: "#60697A" }}><div>{st.lastRunAt ? new Date(st.lastRunAt).toLocaleString() : "Never"}</div><div style={{ fontSize: 10, color: "#9299A8" }}>Success: {st.lastSuccessfulRunAt ? new Date(st.lastSuccessfulRunAt).toLocaleString() : "Never"}</div><div style={{ marginTop: 2 }}><span style={{ padding: "2px 6px", borderRadius: 4, background: isNow ? "#EEF8F4" : "#FFF6E3", color: isNow ? "#4FAE91" : "#F29B38", fontSize: 10, fontWeight: 500 }}>{isNow ? "Eligible Now" : `Next ${next?.toLocaleString()}`}</span></div></td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.cycle} / <span style={{ color: st.consecutiveFailures > 0 ? "#EC6262" : "#4FAE91" }}>{st.consecutiveFailures} failures</span></td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{st.totalCandidates} / {st.totalAccepted} / {st.totalRejected}</td>
                        <td style={{ padding: "10px 14px", fontSize: 10, color: "#9299A8", maxWidth: 200, overflow: "hidden" }}><div style={{ fontFamily: "monospace" }}>{st.cursor?.lastBbox ? st.cursor.lastBbox.slice(0, 40) : st.cursor ? JSON.stringify(st.cursor).slice(0, 60) : "—"}</div><div style={{ fontSize: 10, color: "#9299A8", marginTop: 2 }}>Run: {st.cursor?.lastRunId?.slice(0, 8) || "—"}</div></td>
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
