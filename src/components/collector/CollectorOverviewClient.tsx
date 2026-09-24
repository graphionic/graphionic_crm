"use client";

import { formatCountdown } from "./collector-utils";

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
  const yieldMetrics = overview?.yieldMetrics || {};
  const healthBreakdown = overview?.healthBreakdown || { healthy: 0, degraded: 0, down: 0, unknown: 0 };
  const nextAssignment = overview?.nextAssignment || null;
  const candidateBreakdown = candidateStats?.breakdown || overview?.candidateBreakdown || {};
  const candidateCount = candidateStats?.total ?? overview?.counts?.candidateCount ?? 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collection Overview</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Lead collection engine status, fair rotation schedule, source health, and pipeline yield metrics.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: overview?.config?.enabled ? "#EEF8F4" : "#FDECEC", color: overview?.config?.enabled ? "#4FAE91" : "#EC6262", border: `1px solid ${overview?.config?.enabled ? "#D5F0E5" : "#FBD5D5"}` }}>
              {overview?.config?.enabled ? "● Collector Active" : "● Collector Disabled"}
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Locations</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>
            {overview?.counts?.locationsActive ?? 0} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview?.counts?.locationsTotal ?? 0} Active</span>
          </div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>
            {overview?.counts?.eligibleNow ?? 0} eligible now / {overview?.counts?.states ?? 0} rotation states
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Categories</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>
            {overview?.counts?.categoriesActive ?? 0} <span style={{ fontSize: 14, color: "#9299A8", fontWeight: 400 }}>/ {overview?.counts?.categoriesTotal ?? 0} Active</span>
          </div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Business types with fair priority weighting</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Sources Health</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ background: "#EEF8F4", color: "#4FAE91", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.healthy} healthy</span>
            <span style={{ background: "#FFF6E3", color: "#F29B38", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.degraded} degraded</span>
            <span style={{ background: "#FDECEC", color: "#EC6262", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.down} down</span>
            <span style={{ background: "#FAF9F7", color: "#9299A8", padding: "2px 6px", borderRadius: 4 }}>{healthBreakdown.unknown} unknown</span>
          </div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>
            {overview?.counts?.sourcesActive ?? 0} active / {overview?.counts?.sourcesTotal ?? 0} total sources
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Yield & Candidates</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>
            {yieldMetrics.totalParsed || 0} parsed → {yieldMetrics.totalAccepted || 0} accepted → {yieldMetrics.totalInserted || 0} inserted
          </div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>
            Email Presence: {(yieldMetrics.avgEmailPresenceRate * 100 || 0).toFixed(1)}% ({yieldMetrics.totalNoEmail || 0} no-email, {yieldMetrics.totalWebsiteRejected || 0} website-rejected)
          </div>
          <div style={{ fontSize: 11, color: "#49339A", marginTop: 6, background: "#F0ECFA", padding: "4px 6px", borderRadius: 4 }}>
            Candidates: {candidateCount} ({candidateBreakdown.NEEDS_ENRICHMENT || 0} needEnrich, {candidateBreakdown.QUALIFIED || 0} qualified, {candidateBreakdown.REJECTED || 0} rejected)
          </div>
        </div>
      </div>

      {/* Rotation & Last Run Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Next Assignment — Fair Rotation</h3>
          {nextAssignment ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: nextAssignment.type === "missing" ? "#F0ECFA" : nextAssignment.type === "eligible" ? "#EEF8F4" : "#FFF6E3", color: nextAssignment.type === "missing" ? "#49339A" : nextAssignment.type === "eligible" ? "#4FAE91" : "#F29B38" }}>
                  {nextAssignment.type === "missing" ? "Never-run" : nextAssignment.type === "eligible" ? "Eligible" : "Future"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>
                  {nextAssignment.location?.city || "?"} {nextAssignment.location?.countryCode ? `(${nextAssignment.location.countryCode})` : ""} / {nextAssignment.category?.slug || "?"} / {nextAssignment.source?.name || "?"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#60697A" }}>
                Type: {nextAssignment.type} — {nextAssignment.type === "missing" ? `${nextAssignment.totalMissing} missing combos` : nextAssignment.type === "eligible" ? `${nextAssignment.totalEligible} eligible now` : `Next eligible at ${nextAssignment.nextEligibleAt ? new Date(nextAssignment.nextEligibleAt).toLocaleString() : "unknown"}`}
              </div>
              {nextAssignment.state?.nextEligibleRunAt && (
                <div style={{ fontSize: 11, color: "#60697A" }}>
                  Next run in: <strong>{formatCountdown(nextAssignment.state.nextEligibleRunAt)}</strong>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#9299A8" }}>No next assignment scheduled</div>
          )}
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Last Run Summary</h3>
          {overview?.recentRuns && overview.recentRuns.length ? (() => {
            const last = overview.recentRuns[0];
            const meta = last.metadata || {};
            return (
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#151927" }}>
                  {last.status} — {last.location?.city || "—"} / {last.category?.slug || "—"} / {last.source?.name?.split("/")[0] || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#60697A" }}>
                  {new Date(last.startedAt).toLocaleString()} — {last.candidatesFound} raw → {meta.parsedCount || "?"} parsed → {last.leadsAccepted} accepted
                </div>
                <div style={{ fontSize: 11, color: "#60697A" }}>
                  Candidates: {meta.candidatesPersisted || 0} persisted, {meta.candidatesNeedingEnrichment || 0} needEnrich
                </div>
              </div>
            );
          })() : (
            <div style={{ fontSize: 11, color: "#9299A8" }}>No runs executed yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
