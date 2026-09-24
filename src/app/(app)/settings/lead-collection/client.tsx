"use client";

import { useState, useEffect, useCallback } from "react";
import CandidateQueueClient from "@/components/collector/CandidateQueueClient";
import CollectorOverviewClient from "@/components/collector/CollectorOverviewClient";
import CollectorRunsClient from "@/components/collector/CollectorRunsClient";
import CollectorStatesClient from "@/components/collector/CollectorStatesClient";
import CollectorSourcesClient from "@/components/collector/CollectorSourcesClient";
import CollectorLocationsClient from "@/components/collector/CollectorLocationsClient";
import CollectorCategoriesClient from "@/components/collector/CollectorCategoriesClient";
import CollectionRulesClient from "@/components/collector/CollectionRulesClient";

type Tab = "overview" | "general" | "locations" | "categories" | "sources" | "rules" | "runs" | "states" | "candidates" | "enrichment";

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
  const [locations] = useState(initialLocations);
  const [categories] = useState(initialCategories);
  const [sources] = useState(initialSources);
  const [credentials] = useState(initialCredentials);
  const [rules] = useState(initialRules);
  const [runs] = useState(initialRuns);
  const [states] = useState(initialStates);

  // Enrichment State — Phase 4C.3A
  const [enrichmentStats, setEnrichmentStats] = useState<any>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentJobs, setEnrichmentJobs] = useState<any>(null);
  const [enrichmentJobsPage, setEnrichmentJobsPage] = useState(1);
  const [enrichmentJobsStatus, setEnrichmentJobsStatus] = useState("All");

  const fetchEnrichmentStats = useCallback(async () => {
    setEnrichmentLoading(true);
    try {
      const res = await fetch("/api/enrichment/stats");
      if (!res.ok) throw new Error("Failed to fetch enrichment stats");
      const data = await res.json();
      setEnrichmentStats(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setEnrichmentLoading(false);
    }
  }, []);

  const fetchEnrichmentJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(enrichmentJobsPage), pageSize: "25" });
      if (enrichmentJobsStatus && enrichmentJobsStatus !== "All") params.set("status", enrichmentJobsStatus);
      const res = await fetch(`/api/enrichment/jobs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setEnrichmentJobs(data);
    } catch (e: any) {
      console.error(e);
    }
  }, [enrichmentJobsPage, enrichmentJobsStatus]);

  useEffect(() => {
    if (activeTab === "enrichment") {
      fetchEnrichmentStats();
      fetchEnrichmentJobs();
    }
  }, [activeTab, fetchEnrichmentStats, fetchEnrichmentJobs]);

  const tabs = [
    { id: "overview", label: "Overview", count: null },
    { id: "runs", label: "Runs", count: runs.length },
    { id: "states", label: "States", count: states.length },
    { id: "candidates", label: "Candidates", count: overview.counts?.candidateCount ?? null },
    { id: "enrichment", label: "Enrichment", count: enrichmentStats?.totalJobs ?? null },
    { id: "locations", label: "Locations", count: locations.length },
    { id: "categories", label: "Categories", count: categories.length },
    { id: "sources", label: "Sources", count: sources.length },
    { id: "rules", label: "Rules", count: rules.length },
    { id: "general", label: "General", count: null },
  ];

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collector Control Center (Legacy Hub)</h2>
          <p style={{ fontSize: 13, color: "#60697A" }}>Unified administration console for discovery, candidate queue, run history, and collection settings.</p>
        </div>
      </div>

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

      {/* Tab Contents */}
      {activeTab === "overview" && <CollectorOverviewClient overview={overview} showHeader={false} />}
      {activeTab === "candidates" && <CandidateQueueClient categories={categories} sources={sources} showHeader={false} />}
      {activeTab === "runs" && <CollectorRunsClient initialRuns={runs} showHeader={false} />}
      {activeTab === "states" && <CollectorStatesClient initialStates={states} showHeader={false} />}
      {activeTab === "locations" && <CollectorLocationsClient initialLocations={locations} showHeader={false} />}
      {activeTab === "categories" && <CollectorCategoriesClient initialCategories={categories} showHeader={false} />}
      {activeTab === "sources" && <CollectorSourcesClient initialSources={sources} initialCredentials={credentials} showHeader={false} />}
      {activeTab === "rules" && <CollectionRulesClient initialRules={rules} showHeader={false} />}

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

      {/* Enrichment Tab */}
      {activeTab === "enrichment" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Enrichment Engine — Budget Guardrails</h3>
            <p style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>Provider-agnostic enrichment with hard budget enforcement, atomic reservations, UTC accounting. Default disabled, fail-closed before claim.</p>
          </div>

          {enrichmentLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#9299A8", fontSize: 12, background: "white", border: "1px solid #E5E3DF", borderRadius: 12 }}>Loading enrichment stats...</div>
          ) : !enrichmentStats ? (
            <div style={{ padding: 24, textAlign: "center", color: "#EC6262", fontSize: 12, background: "white", border: "1px solid #E5E3DF", borderRadius: 12 }}>Failed to load enrichment stats</div>
          ) : (
            <>
              {/* Config + Budget Status */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <div style={{ background: enrichmentStats.config?.enabled ? "#FDECEC" : "#EEF8F4", border: `1px solid ${enrichmentStats.config?.enabled ? "#FBD5D5" : "#D5F0E5"}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: enrichmentStats.config?.enabled ? "#C53030" : "#276749", textTransform: "uppercase" }}>Enrichment Status</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginTop: 4 }}>{enrichmentStats.config?.enabled ? "● Enabled" : "● Disabled"}</div>
                  <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>{enrichmentStats.config?.enabled ? "Budget gates enforced" : "Fail-closed, no external calls"}</div>
                </div>
                <div style={{ background: enrichmentStats.budgetStatus === "WITHIN_BUDGET" ? "#EEF8F4" : enrichmentStats.budgetStatus === "ENRICHMENT_DISABLED" ? "#FAF9F7" : "#FDECEC", border: `1px solid ${enrichmentStats.budgetStatus === "WITHIN_BUDGET" ? "#D5F0E5" : enrichmentStats.budgetStatus === "ENRICHMENT_DISABLED" ? "#E5E3DF" : "#FBD5D5"}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: enrichmentStats.budgetStatus === "WITHIN_BUDGET" ? "#276749" : enrichmentStats.budgetStatus === "ENRICHMENT_DISABLED" ? "#9299A8" : "#C53030", textTransform: "uppercase" }}>Budget Status</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginTop: 4 }}>{enrichmentStats.budgetStatus || "—"}</div>
                  <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>{enrichmentStats.budgetStatus === "WITHIN_BUDGET" ? "Within budget" : "Enrichment disabled"}</div>
                </div>
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Daily Limit / Batch</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 4 }}>{enrichmentStats.config?.dailyCandidateLimit} / {enrichmentStats.config?.batchSize}</div>
                  <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Max attempts {enrichmentStats.config?.maxAttemptsPerCandidate}, cooldown {enrichmentStats.config?.retryCooldownMinutes}m</div>
                </div>
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Providers</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 4 }}>{enrichmentStats.providerCount ?? 0} configured</div>
                  <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>{enrichmentStats.providers?.length ?? 0} credentials recorded</div>
                </div>
              </div>

              {/* Jobs Table */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E3DF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#151927" }}>Enrichment Jobs — {enrichmentJobs?.total ?? 0} total</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={enrichmentJobsStatus} onChange={e => { setEnrichmentJobsStatus(e.target.value); setEnrichmentJobsPage(1); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white" }}>
                      <option value="All">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="FAILED">Failed</option>
                      <option value="EXHAUSTED">Exhausted</option>
                    </select>
                    <button onClick={() => { fetchEnrichmentStats(); fetchEnrichmentJobs(); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "#FAF9F7", fontSize: 11, cursor: "pointer" }}>Refresh</button>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                    <thead><tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}><th style={{ padding: "10px 12px" }}>Job / Candidate</th><th style={{ padding: "10px 12px" }}>Status</th><th style={{ padding: "10px 12px" }}>Attempts</th><th style={{ padding: "10px 12px" }}>Next Attempt</th><th style={{ padding: "10px 12px" }}>Result</th><th style={{ padding: "10px 12px" }}>Created</th></tr></thead>
                    <tbody>
                      {!enrichmentJobs || enrichmentJobs.jobs.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#9299A8", fontSize: 12 }}>No enrichment jobs — clean queue.</td></tr>
                      ) : (
                        enrichmentJobs.jobs.map((j: any) => (
                          <tr key={j.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                            <td style={{ padding: "10px 12px" }}><div style={{ fontWeight: 500, color: "#151927", fontSize: 12 }}>{j.candidate?.companyName || j.candidateId.slice(0, 8)}</div><div style={{ fontSize: 10, color: "#9299A8", fontFamily: "monospace" }}>{j.id.slice(0, 8)}…</div></td>
                            <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10, fontWeight: 600, padding: "3px 7px", borderRadius: 6, background: "#FAF9F7", color: "#151927", border: "1px solid #E5E3DF" }}>{j.status}</span></td>
                            <td style={{ padding: "10px 12px", fontSize: 11 }}>{j.attemptCount}/{j.maxAttempts}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>{j.nextAttemptAt ? new Date(j.nextAttemptAt).toLocaleString() : "—"}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#60697A" }}>{j.resultEmail || j.resultWebsite || "—"}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#9299A8" }}>{new Date(j.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
