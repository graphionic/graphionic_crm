"use client";

import { useState } from "react";
import { githubRunUrl } from "./collector-utils";

interface CollectorRunsProps {
  initialRuns?: any[];
  showHeader?: boolean;
}

export default function CollectorRunsClient({
  initialRuns = [],
  showHeader = true,
}: CollectorRunsProps) {
  const [runs] = useState<any[]>(initialRuns);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collector Run History</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Historical collection execution logs, candidate persistence, rejection breakdown, and GitHub Actions traceability.</p>
          </div>
          <div style={{ fontSize: 12, color: "#9299A8", background: "white", border: "1px solid #E5E3DF", padding: "6px 12px", borderRadius: 6 }}>
            Total Runs Logged: {runs.length}
          </div>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Started / Finished</th>
                <th style={{ padding: "10px 14px" }}>Status</th>
                <th style={{ padding: "10px 14px" }}>Location / Category</th>
                <th style={{ padding: "10px 14px" }}>Raw / Parsed / Candidates</th>
                <th style={{ padding: "10px 14px" }}>Rejected</th>
                <th style={{ padding: "10px 14px" }}>Accepted / Inserted</th>
                <th style={{ padding: "10px 14px" }}>Duration / GitHub</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
                    No collector runs recorded yet.
                  </td>
                </tr>
              ) : (
                runs.map((run: any) => {
                  const meta = run.metadata || {};
                  const ghUrl = githubRunUrl(meta.githubRunId);
                  return (
                    <tr key={run.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#60697A" }}>
                        {new Date(run.startedAt).toLocaleString()}<br />
                        <span style={{ fontSize: 10, color: "#9299A8" }}>
                          {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "running"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 6, background: run.status === "SUCCESS" ? "#EEF8F4" : "#FDECEC", color: run.status === "SUCCESS" ? "#4FAE91" : "#EC6262", fontSize: 11, fontWeight: 500 }}>
                          {run.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11 }}>
                        <span style={{ fontWeight: 500, color: "#151927" }}>{run.location?.city || "—"}</span> / {run.category?.slug || "—"}<br />
                        <span style={{ fontSize: 10, color: "#9299A8" }}>{run.source?.name?.slice(0, 24) || "—"}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11 }}>
                        {run.candidatesFound} raw / {meta.parsedCount ?? "?"} parsed<br />
                        <span style={{ fontSize: 10, color: "#49339A", background: "#F0ECFA", padding: "2px 4px", borderRadius: 3 }}>
                          {meta.candidatesPersisted ?? "?"} persisted / {meta.candidatesNeedingEnrichment ?? 0} needEnrich
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#9299A8" }}>
                        {run.noEmailRejected} / {run.websiteRejected} / {run.duplicateRejected}<br />
                        <span style={{ fontSize: 10 }}>noEmail / web / dup</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#4FAE91", fontWeight: 500 }}>
                        {run.leadsAccepted} / {run.leadsInserted}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11 }}>
                        {run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : "—"}<br />
                        {ghUrl ? (
                          <a href={ghUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#49339A", textDecoration: "underline" }}>
                            GH#{meta.githubRunId}
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
