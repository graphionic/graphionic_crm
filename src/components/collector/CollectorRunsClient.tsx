"use client";

import { useState, useEffect, useId } from "react";
import CollectionOperationsHeader from "./CollectionOperationsHeader";
import {
  formatDuration,
  formatRelativeTime,
  humanReadableSource,
  runStatusBadgeStyle,
  githubRunUrl,
} from "./collector-utils";

interface CollectorRunsProps {
  initialRuns?: any[];
  showHeader?: boolean;
}

export default function CollectorRunsClient({
  initialRuns = [],
  showHeader = true,
}: CollectorRunsProps) {
  const [runs] = useState<any[]>(initialRuns);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rawMetaOpen, setRawMetaOpen] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);

  const drawerTitleId = useId();

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const filteredRuns = runs.filter(r => {
    if (filterStatus !== "All") {
      const s = (r.status || "").toUpperCase();
      if (filterStatus === "SUCCESS" && s !== "SUCCESS" && s !== "COMPLETED") return false;
      if (filterStatus === "FAILED" && s !== "FAILED" && s !== "ERROR") return false;
      if (filterStatus === "RUNNING" && s !== "RUNNING" && s !== "IN_PROGRESS") return false;
    }
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase().trim();
      const city = (r.location?.city || "").toLowerCase();
      const cat = (r.category?.slug || r.category?.name || "").toLowerCase();
      const src = (r.source?.name || "").toLowerCase();
      const id = String(r.id || "").toLowerCase();
      const gh = String(r.metadata?.githubRunId || "").toLowerCase();
      if (!city.includes(q) && !cat.includes(q) && !src.includes(q) && !id.includes(q) && !gh.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Calculate stats from the bounded initialRuns dataset
  const totalCount = runs.length;
  const successCount = runs.filter(r => (r.status || "").toUpperCase() === "SUCCESS" || (r.status || "").toUpperCase() === "COMPLETED").length;
  const failedCount = runs.filter(r => (r.status || "").toUpperCase() === "FAILED" || (r.status || "").toUpperCase() === "ERROR").length;
  const runningCount = runs.filter(r => (r.status || "").toUpperCase() === "RUNNING" || (r.status || "").toUpperCase() === "IN_PROGRESS").length;

  const validDurations = runs.filter(r => typeof r.durationSeconds === "number" && r.durationSeconds > 0);
  const avgDurationSeconds = validDurations.length > 0
    ? validDurations.reduce((acc, r) => acc + r.durationSeconds, 0) / validDurations.length
    : 0;

  const handleInspect = (run: any) => {
    setSelectedRun(run);
    setDrawerOpen(true);
    setRawMetaOpen(false);
    setCopiedMeta(false);
  };

  const copyMetadata = () => {
    if (!selectedRun) return;
    navigator.clipboard.writeText(JSON.stringify(selectedRun.metadata || {}, null, 2)).then(() => {
      setCopiedMeta(true);
      setTimeout(() => setCopiedMeta(false), 2000);
    }).catch(() => {});
  };

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {showHeader && <CollectionOperationsHeader currentTab="runs" />}

      {/* 1. Summary Strip (Bounded Dataset) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Logged Runs</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{totalCount}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Current result set</div>
        </div>

        <div style={{ background: "white", border: "1px solid #D5F0E5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#276749", textTransform: "uppercase" }}>Successful</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{successCount}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Passed collections</div>
        </div>

        <div style={{ background: "white", border: "1px solid #FBD5D5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#C53030", textTransform: "uppercase" }}>Failed</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{failedCount}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Errors / timeouts</div>
        </div>

        <div style={{ background: "white", border: "1px solid #F4BE52", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#B7791F", textTransform: "uppercase" }}>Running</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{runningCount}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>In progress</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Avg Duration</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{formatDuration(avgDurationSeconds, "s")}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Per execution</div>
        </div>
      </div>

      {/* 2. Filters */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          placeholder="Filter city, category, source, run ID, GH#..."
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "#FAF9F7" }}
        />

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 12, background: "white", minWidth: 130 }}
        >
          <option value="All">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
        </select>

        {(filterStatus !== "All" || filterSearch) && (
          <button
            onClick={() => { setFilterStatus("All"); setFilterSearch(""); }}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", background: "#FAF9F7", fontSize: 12, cursor: "pointer", color: "#EC6262", fontWeight: 500 }}
          >
            Clear filters
          </button>
        )}

        <div style={{ marginLeft: "auto", fontSize: 11, color: "#9299A8" }}>
          Showing {filteredRuns.length} of {totalCount} runs
        </div>
      </div>

      {/* 3. Runs Table */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1000 }}>
            <thead>
              <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Run / Traceability</th>
                <th style={{ padding: "10px 14px" }}>Target</th>
                <th style={{ padding: "10px 14px" }}>Source</th>
                <th style={{ padding: "10px 14px" }}>Status</th>
                <th style={{ padding: "10px 14px" }}>Started</th>
                <th style={{ padding: "10px 14px" }}>Duration</th>
                <th style={{ padding: "10px 14px" }}>Yield Results</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "36px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#151927", marginBottom: 4 }}>
                      No collector runs match these filters.
                    </div>
                    <div style={{ fontSize: 12, color: "#60697A" }}>
                      Try adjusting the search keyword or status filter.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r: any) => {
                  const badge = runStatusBadgeStyle(r.status);
                  const gh = r.metadata?.githubRunId ? githubRunUrl(r.metadata.githubRunId) : null;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      {/* Run / Traceability */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#151927" }}>
                          {r.id?.slice(0, 8)}…
                        </div>
                        {gh && (
                          <div style={{ marginTop: 2 }}>
                            <a
                              href={gh}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#49339A", fontSize: 10, textDecoration: "underline" }}
                            >
                              GH Actions #{r.metadata.githubRunId} ↗
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Target */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#151927" }}>
                          {r.location?.city || "—"}{r.location?.country ? ` (${r.location.country})` : ""}
                        </div>
                        <div style={{ fontSize: 11, color: "#60697A", marginTop: 1 }}>
                          {r.category?.name || r.category?.slug || "—"}
                        </div>
                      </td>

                      {/* Source */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ color: "#151927" }}>{humanReadableSource(r.source?.name)}</div>
                        <div style={{ fontSize: 10, color: "#9299A8" }}>{r.source?.type || "overpass"}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Started */}
                      <td style={{ padding: "10px 14px", color: "#60697A" }}>
                        <div>{formatRelativeTime(r.startedAt)}</div>
                        <div style={{ fontSize: 10, color: "#9299A8" }}>
                          {new Date(r.startedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {new Date(r.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Duration */}
                      <td style={{ padding: "10px 14px", color: "#151927", fontWeight: 500 }}>
                        {formatDuration(r.durationSeconds, "s")}
                      </td>

                      {/* Yield Results */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ color: "#151927", fontWeight: 600 }}>
                          {r.candidatesFound ?? 0} found
                        </div>
                        <div style={{ fontSize: 10, color: "#60697A", marginTop: 1 }}>
                          {r.candidatesPersisted ?? r.leadsAccepted ?? 0} persisted · {r.leadsRejected ?? r.metadata?.websiteRejectedCount ?? 0} rejected
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <button
                          onClick={() => handleInspect(r)}
                          style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer", color: "#49339A", fontWeight: 500 }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Slide-Over Run Inspection Drawer */}
      {drawerOpen && selectedRun && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerTitleId}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(21,25,39,0.4)" }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: "relative",
              width: "min(560px, 94vw)",
              background: "#FFFFFF",
              borderLeft: "1px solid #E5E3DF",
              boxShadow: "-8px 0 24px rgba(21,25,39,0.08)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "100vh",
              overflow: "hidden",
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E3DF", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#FAF9F7" }}>
              <div>
                <div style={{ fontSize: 11, color: "#9299A8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Collector Run Inspection</div>
                <h3 id={drawerTitleId} style={{ fontSize: 16, fontWeight: 600, color: "#151927", margin: "2px 0 2px" }}>
                  Run {selectedRun.id?.slice(0, 12)}…
                </h3>
                <div style={{ fontSize: 12, color: "#60697A" }}>
                  {selectedRun.location?.city || "—"} · {selectedRun.category?.name || selectedRun.category?.slug || "—"}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close run inspection"
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
              >
                ✕ Close
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "grid", gap: 14 }}>
              {/* 1. Run Summary Callout */}
              {(() => {
                const badge = runStatusBadgeStyle(selectedRun.status);
                return (
                  <div style={{ background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: badge.color, textTransform: "uppercase" }}>
                        Execution Status
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: "white", color: badge.color, border: `1px solid ${badge.border}` }}>
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 4 }}>
                      Collected {selectedRun.candidatesFound ?? 0} businesses from {humanReadableSource(selectedRun.source?.name)}
                    </div>
                    <div style={{ fontSize: 11, color: "#60697A" }}>
                      Target: {selectedRun.location?.city || "—"} ({selectedRun.category?.name || selectedRun.category?.slug || "Taxonomy"}) · Duration: {formatDuration(selectedRun.durationSeconds, "s")}
                    </div>
                  </div>
                );
              })()}

              {/* 2. Failure Details if failed */}
              {(selectedRun.status === "FAILED" || selectedRun.status === "ERROR" || selectedRun.errorMessage) && (
                <div style={{ background: "#FDECEC", border: "1px solid #FBD5D5", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#EC6262", textTransform: "uppercase", marginBottom: 6 }}>
                    Failure Information
                  </div>
                  <div style={{ fontSize: 12, color: "#C53030", fontWeight: 500, marginBottom: 4 }}>
                    {selectedRun.errorMessage || "Collector run terminated with an error."}
                  </div>
                  {selectedRun.metadata?.errorContext && (
                    <div style={{ fontSize: 11, color: "#60697A" }}>
                      Context: {selectedRun.metadata.errorContext}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Execution Yield Breakdown */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                  Execution Yield Breakdown
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div style={{ background: "#FAF9F7", padding: 8, borderRadius: 6, border: "1px solid #E5E3DF" }}>
                    <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase" }}>Raw Discovered</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginTop: 2 }}>{selectedRun.candidatesFound ?? 0}</div>
                  </div>
                  <div style={{ background: "#FAF9F7", padding: 8, borderRadius: 6, border: "1px solid #E5E3DF" }}>
                    <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase" }}>Parsed Valid</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginTop: 2 }}>{selectedRun.metadata?.parsedCount ?? selectedRun.candidatesFound ?? 0}</div>
                  </div>
                  <div style={{ background: "#FFF6E3", padding: 8, borderRadius: 6, border: "1px solid #F4BE52" }}>
                    <div style={{ fontSize: 10, color: "#B7791F", textTransform: "uppercase" }}>Needs Enrichment</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginTop: 2 }}>{selectedRun.metadata?.needsEnrichmentCount ?? selectedRun.candidatesPersisted ?? selectedRun.leadsAccepted ?? 0}</div>
                  </div>
                  <div style={{ background: "#FDECEC", padding: 8, borderRadius: 6, border: "1px solid #FBD5D5" }}>
                    <div style={{ fontSize: 10, color: "#C53030", textTransform: "uppercase" }}>Rejected / Site Exists</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginTop: 2 }}>{selectedRun.leadsRejected ?? selectedRun.metadata?.websiteRejectedCount ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* 4. Traceability & GitHub */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
                  Traceability
                </div>
                <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                  <div><span style={{ color: "#9299A8" }}>Run ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11, color: "#151927" }}>{selectedRun.id}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Started:</span> <span style={{ color: "#151927" }}>{new Date(selectedRun.startedAt).toLocaleString()}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Finished:</span> <span style={{ color: "#151927" }}>{selectedRun.finishedAt ? new Date(selectedRun.finishedAt).toLocaleString() : "Running / In progress"}</span></div>
                  {selectedRun.metadata?.githubRunId && (
                    <div>
                      <span style={{ color: "#9299A8" }}>GitHub Execution:</span>{" "}
                      <a
                        href={githubRunUrl(selectedRun.metadata.githubRunId) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#49339A", textDecoration: "underline", fontWeight: 500 }}
                      >
                        View GitHub Actions Run #{selectedRun.metadata.githubRunId} ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Collapsible Metadata JSON */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>
                    Run Metadata
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={copyMetadata}
                      style={{ fontSize: 11, color: "#60697A", background: "none", border: "none", cursor: "pointer" }}
                    >
                      {copiedMeta ? "✓ Copied" : "Copy Metadata"}
                    </button>
                    <button
                      onClick={() => setRawMetaOpen(!rawMetaOpen)}
                      style={{ fontSize: 11, color: "#49339A", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                    >
                      {rawMetaOpen ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                {rawMetaOpen && (
                  <pre style={{ margin: "10px 0 0", padding: 10, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 6, fontSize: 11, overflowX: "auto", maxHeight: 200, fontFamily: "monospace" }}>
                    {JSON.stringify(selectedRun.metadata || {}, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
