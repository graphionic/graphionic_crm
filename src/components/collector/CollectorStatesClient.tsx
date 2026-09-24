"use client";

import { useState, useEffect } from "react";
import { formatCountdown } from "./collector-utils";

interface CollectorStatesProps {
  initialStates?: any[];
  showHeader?: boolean;
}

export default function CollectorStatesClient({
  initialStates = [],
  showHeader = true,
}: CollectorStatesProps) {
  const [states] = useState<any[]>(initialStates);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Fair Rotation States</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Persistent location-category-source rotation state, cooldown schedules, and next run eligibility.</p>
          </div>
          <div style={{ fontSize: 12, color: "#9299A8", background: "white", border: "1px solid #E5E3DF", padding: "6px 12px", borderRadius: 6 }}>
            Total Combinations Tracked: {states.length}
          </div>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 800 }}>
            <thead>
              <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Location / Category / Source</th>
                <th style={{ padding: "10px 14px" }}>Last Run / Next Eligible</th>
                <th style={{ padding: "10px 14px" }}>Cycle / Failures</th>
                <th style={{ padding: "10px 14px" }}>Candidates Yield</th>
              </tr>
            </thead>
            <tbody>
              {states.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
                    No collector rotation states initialized yet.
                  </td>
                </tr>
              ) : (
                states.map((st: any) => {
                  const next = st.nextEligibleRunAt ? new Date(st.nextEligibleRunAt) : null;
                  const isNow = !next || next <= new Date();
                  return (
                    <tr key={st.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                      <td style={{ padding: "10px 14px", fontSize: 11 }}>
                        <div style={{ fontWeight: 500, color: "#151927" }}>
                          {st.location?.city || "—"} {st.location?.countryCode ? `(${st.location.countryCode})` : ""}
                        </div>
                        <div style={{ fontSize: 10, color: "#60697A" }}>
                          {st.category?.name || st.category?.slug || "—"} · {st.source?.name?.slice(0, 24) || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11 }}>
                        {st.lastRunAt ? new Date(st.lastRunAt).toLocaleString() : "Never"}<br />
                        <span style={{ padding: "2px 6px", borderRadius: 4, background: isNow ? "#EEF8F4" : "#FFF6E3", color: isNow ? "#4FAE91" : "#F29B38", fontSize: 10, fontWeight: 500 }}>
                          {isNow ? "Eligible Now" : `Next in ${formatCountdown(st.nextEligibleRunAt)}`}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11 }}>
                        Cycle {st.cycle} · {st.consecutiveFailures} {st.consecutiveFailures === 1 ? "failure" : "failures"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11 }}>
                        <span style={{ fontWeight: 500, color: "#151927" }}>{st.totalCandidates}</span> candidates / <span style={{ color: "#4FAE91", fontWeight: 500 }}>{st.totalAccepted}</span> accepted
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
