"use client";

import Link from "next/link";
import CollectionOperationsHeader from "./CollectionOperationsHeader";
import {
  formatCountdown,
  formatDuration,
  formatRelativeTime,
  humanReadableSource,
  runStatusBadgeStyle,
  githubRunUrl,
} from "./collector-utils";

interface CollectorOverviewProps {
  overview: any;
  candidateStats?: any;
  showHeader?: boolean;
}

export default function CollectorOverviewClient({
  overview,
  candidateStats,
  showHeader = true,
}: CollectorOverviewProps) {
  const counts = overview?.counts || {};
  const lastRun = overview?.recentRuns?.[0] || overview?.runs?.[0] || null;
  const nextAssignment = overview?.nextAssignment || null;
  const sources = overview?.sources || overview?.allSources || [];

  const candidateTotal = candidateStats?.total ?? counts?.candidateCount ?? 0;
  const candidateNeeds = candidateStats?.counts?.NEEDS_ENRICHMENT ?? overview?.candidateBreakdown?.NEEDS_ENRICHMENT ?? 0;
  const candidateRej = candidateStats?.counts?.REJECTED ?? overview?.candidateBreakdown?.REJECTED ?? 0;
  const candidateQual = candidateStats?.counts?.QUALIFIED ?? overview?.candidateBreakdown?.QUALIFIED ?? 0;
  const candidatePending = candidateStats?.counts?.VERIFICATION_PENDING ?? overview?.candidateBreakdown?.VERIFICATION_PENDING ?? 0;

  const osmSource = sources.find((s: any) => s.type === "overpass" || s.name?.toLowerCase().includes("overpass"));
  const googleSource = sources.find((s: any) => s.type === "google_places" || s.name?.toLowerCase().includes("google"));

  const lastRunBadge = lastRun ? runStatusBadgeStyle(lastRun.status) : null;
  const lastRunGh = lastRun?.metadata?.githubRunId ? githubRunUrl(lastRun.metadata.githubRunId) : null;

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {showHeader && (
        <CollectionOperationsHeader
          currentTab="overview"
          extraRight={
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 6,
                background: overview?.config?.enabled ? "#EEF8F4" : "#FDECEC",
                color: overview?.config?.enabled ? "#276749" : "#C53030",
                border: `1px solid ${overview?.config?.enabled ? "#D5F0E5" : "#FBD5D5"}`,
              }}
            >
              {overview?.config?.enabled ? "● Engine Operational" : "● Engine Disabled"}
            </span>
          }
        />
      )}

      {/* 1. Top Operational Metric Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Active Locations</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>
            {counts?.locationsActive ?? 0} <span style={{ fontSize: 12, color: "#9299A8", fontWeight: 400 }}>/ {counts?.locationsTotal ?? 0}</span>
          </div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Enabled target cities</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Active Categories</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>
            {counts?.categoriesActive ?? 0} <span style={{ fontSize: 12, color: "#9299A8", fontWeight: 400 }}>/ {counts?.categoriesTotal ?? 0}</span>
          </div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Business taxonomies</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Active Sources</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>
            {counts?.sourcesActive ?? 0} <span style={{ fontSize: 12, color: "#9299A8", fontWeight: 400 }}>/ {counts?.sourcesTotal ?? 0}</span>
          </div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>OSM Overpass active</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Total Runs</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{counts?.runsTotal ?? overview?.runs?.length ?? 0}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Executed collections</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Total Candidates</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateTotal}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Discovered businesses</div>
        </div>
      </div>

      {/* 2. Collection Health Factual Signals */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 10 }}>
          Collection Health Signals
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {/* Signal 1: OSM Status */}
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>🟢</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>OpenStreetMap (Overpass)</div>
              <div style={{ fontSize: 11, color: "#60697A" }}>
                Active · Last activity: {lastRun ? formatRelativeTime(lastRun.finishedAt || lastRun.startedAt) : "Recently"}
              </div>
            </div>
          </div>

          {/* Signal 2: Google Guardrails Status */}
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>Google Places Discovery</div>
              <div style={{ fontSize: 11, color: "#60697A" }}>
                Disabled · Protected by guardrails (Mode: DISABLED)
              </div>
            </div>
          </div>

          {/* Signal 3: Last Collector Run Result */}
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>{lastRun?.status === "SUCCESS" ? "✓" : "●"}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>Last Collector Run</div>
              <div style={{ fontSize: 11, color: "#60697A" }}>
                {lastRun ? `${lastRun.location?.city || "City"} (${lastRun.category?.slug || "cat"}) · ${lastRun.candidatesFound ?? 0} found` : "No runs logged"}
              </div>
            </div>
          </div>

          {/* Signal 4: Next Rotation Assignment */}
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>↻</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>Next Rotation Target</div>
              <div style={{ fontSize: 11, color: "#60697A" }}>
                {nextAssignment ? `${nextAssignment.city} (${nextAssignment.category}) · ${formatCountdown(nextAssignment.nextEligibleAt)}` : "Ready now"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operational Two-Column: Last Run + Next Rotation */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        {/* Left: Last Run Details */}
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Last Collector Run</div>
              {lastRunBadge && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: lastRunBadge.bg, color: lastRunBadge.color, border: `1px solid ${lastRunBadge.border}` }}>
                  {lastRunBadge.label}
                </span>
              )}
            </div>

            {lastRun ? (
              <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#9299A8" }}>Target:</span>{" "}
                  <strong style={{ color: "#151927" }}>{lastRun.location?.city || "—"}{lastRun.location?.country ? `, ${lastRun.location.country}` : ""}</strong>
                  <span style={{ color: "#60697A" }}> · {lastRun.category?.name || lastRun.category?.slug || "Taxonomy"}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, background: "#FAF9F7", padding: 10, borderRadius: 8, border: "1px solid #E5E3DF" }}>
                  <div><span style={{ color: "#9299A8" }}>Source:</span> <span style={{ color: "#151927", fontWeight: 500 }}>{humanReadableSource(lastRun.source?.name)}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Duration:</span> <span style={{ color: "#151927", fontWeight: 500 }}>{formatDuration(lastRun.durationSeconds, "s")}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Candidates:</span> <span style={{ color: "#151927", fontWeight: 600 }}>{lastRun.candidatesFound ?? 0} found</span></div>
                  <div><span style={{ color: "#9299A8" }}>Persisted:</span> <span style={{ color: "#151927", fontWeight: 600 }}>{lastRun.candidatesPersisted ?? lastRun.leadsAccepted ?? 0}</span></div>
                </div>

                <div style={{ fontSize: 11, color: "#60697A" }}>
                  Executed {formatRelativeTime(lastRun.startedAt)} ({new Date(lastRun.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                  {lastRunGh && (
                    <span style={{ marginLeft: 8 }}>
                      · <a href={lastRunGh} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>GH Actions #{lastRun.metadata.githubRunId} ↗</a>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#9299A8", fontStyle: "italic" }}>No collector runs have been recorded yet.</div>
            )}
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #F0EEEA", display: "flex", justifyContent: "flex-end" }}>
            <Link href="/collection/runs" style={{ fontSize: 12, color: "#49339A", fontWeight: 500, textDecoration: "none" }}>
              View all run history →
            </Link>
          </div>
        </div>

        {/* Right: Next Fair Rotation Assignment */}
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Next Fair Rotation Target</div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#EEF8F4", color: "#276749", border: "1px solid #D5F0E5" }}>
                Fair Rotation
              </span>
            </div>

            {nextAssignment ? (
              <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#9299A8" }}>Next Target:</span>{" "}
                  <strong style={{ color: "#151927" }}>{nextAssignment.city}{nextAssignment.country ? `, ${nextAssignment.country}` : ""}</strong>
                  <span style={{ color: "#60697A" }}> · {nextAssignment.category}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, background: "#FAF9F7", padding: 10, borderRadius: 8, border: "1px solid #E5E3DF" }}>
                  <div><span style={{ color: "#9299A8" }}>Source:</span> <span style={{ color: "#151927", fontWeight: 500 }}>{humanReadableSource(nextAssignment.source)}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Eligibility:</span> <span style={{ color: "#276749", fontWeight: 600 }}>{formatCountdown(nextAssignment.nextEligibleAt)}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Last Target Run:</span> <span style={{ color: "#60697A" }}>{formatRelativeTime(nextAssignment.lastCollectedAt)}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Prior Yield:</span> <span style={{ color: "#151927" }}>{nextAssignment.candidatesYield ?? "—"}</span></div>
                </div>

                <div style={{ fontSize: 11, color: "#60697A" }}>
                  Selected automatically based on fair rotation cooldown intervals across active locations.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#60697A" }}>
                All active location and category combinations are currently ready for next collection assignment.
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #F0EEEA", display: "flex", justifyContent: "flex-end" }}>
            <Link href="/collection/states" style={{ fontSize: 12, color: "#49339A", fontWeight: 500, textDecoration: "none" }}>
              View full rotation queue →
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Pipeline Yield Flow (Factual Counts) */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>
            Candidate Pipeline Yield
          </div>
          <Link href="/candidates" style={{ fontSize: 12, color: "#49339A", fontWeight: 500, textDecoration: "none" }}>
            View Candidate Queue →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase", fontWeight: 600 }}>1. Discovered</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateTotal}</div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Raw businesses collected</div>
          </div>

          <div style={{ background: "#FFF6E3", border: "1px solid #F4BE52", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#B7791F", textTransform: "uppercase", fontWeight: 600 }}>2. Needs Enrichment</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateNeeds}</div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>No website, missing email</div>
          </div>

          <div style={{ background: "#FDECEC", border: "1px solid #FBD5D5", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#C53030", textTransform: "uppercase", fontWeight: 600 }}>3. Disqualified / Rejected</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateRej}</div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Website or domain exists</div>
          </div>

          <div style={{ background: "#EAF7FA", border: "1px solid #C5E9F1", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#2B6CB0", textTransform: "uppercase", fontWeight: 600 }}>4. Verification Pending</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidatePending}</div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Cross-check queued</div>
          </div>

          <div style={{ background: "#EEF8F4", border: "1px solid #D5F0E5", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#276749", textTransform: "uppercase", fontWeight: 600 }}>5. Qualified CRM Leads</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{candidateQual}</div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Promoted to lead pipeline</div>
          </div>
        </div>
      </div>

      {/* 5. Sources Snapshot */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>
            Discovery Source Snapshot
          </div>
          <Link href="/collection/sources" style={{ fontSize: 12, color: "#49339A", fontWeight: 500, textDecoration: "none" }}>
            Manage all sources →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {/* OSM Snapshot Card */}
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <strong style={{ fontSize: 13, color: "#151927" }}>OpenStreetMap / Overpass</strong>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#EEF8F4", color: "#276749", border: "1px solid #D5F0E5" }}>
                ACTIVE
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#60697A", display: "grid", gap: 3 }}>
              <div>Endpoint: <span style={{ color: "#151927", fontFamily: "monospace" }}>overpass-api.de/api/interpreter</span></div>
              <div>Credential: <span style={{ color: "#276749" }}>Not required (Public API)</span></div>
              <div>Health: <span style={{ color: "#276749", fontWeight: 500 }}>Healthy / Operational</span></div>
            </div>
          </div>

          {/* Google Places Snapshot Card */}
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <strong style={{ fontSize: 13, color: "#151927" }}>Google Places Discovery</strong>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#FDECEC", color: "#C53030", border: "1px solid #FBD5D5" }}>
                DISABLED
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#60697A", display: "grid", gap: 3 }}>
              <div>Activation Mode: <span style={{ color: "#C53030", fontWeight: 500 }}>DISABLED</span></div>
              <div>Guardrails: <span style={{ color: "#276749" }}>Fail Closed (Zero live requests)</span></div>
              <div style={{ marginTop: 2 }}>
                <Link href="/settings/google" style={{ color: "#49339A", fontSize: 11, textDecoration: "underline" }}>
                  View Google Guardrails →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
