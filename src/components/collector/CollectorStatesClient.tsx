"use client";

import { useState, useEffect } from "react";
import CollectionOperationsHeader from "./CollectionOperationsHeader";
import {
  formatCountdown,
  formatRelativeTime,
  formatYieldRate,
  humanReadableSource,
  rotationStateBadge,
} from "./collector-utils";

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

  // Client-side 1s tick for countdown updates without DB polling
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const totalCombinations = states.length;
  const readyStates = states.filter(s => {
    const b = rotationStateBadge(s.nextRunEligibleAt, s.lastRunStartedAt);
    return b.state === "READY";
  });
  const coolingStates = states.filter(s => {
    const b = rotationStateBadge(s.nextRunEligibleAt, s.lastRunStartedAt);
    return b.state === "COOLING";
  });
  const neverRunStates = states.filter(s => !s.lastRunStartedAt);

  // Identify next assignment: earliest nextRunEligibleAt among states (or nulls first)
  const sortedByEligibility = [...states].sort((a, b) => {
    const aLast = a.lastRunStartedAt ? new Date(a.lastRunStartedAt).getTime() : 0;
    const bLast = b.lastRunStartedAt ? new Date(b.lastRunStartedAt).getTime() : 0;
    if (!a.lastRunStartedAt && b.lastRunStartedAt) return -1;
    if (a.lastRunStartedAt && !b.lastRunStartedAt) return 1;
    const aNext = a.nextRunEligibleAt ? new Date(a.nextRunEligibleAt).getTime() : 0;
    const bNext = b.nextRunEligibleAt ? new Date(b.nextRunEligibleAt).getTime() : 0;
    if (aNext !== bNext) return aNext - bNext;
    return aLast - bLast;
  });

  const nextTarget = sortedByEligibility[0] || null;

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {showHeader && <CollectionOperationsHeader currentTab="states" />}

      {/* Explanation Banner */}
      <div style={{ background: "#F0ECFA", border: "1px solid #E0D6F5", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#49339A", display: "flex", gap: 8, alignItems: "center" }}>
        <span>↻</span>
        <span>Collection rotates across enabled location and category combinations to avoid repeatedly targeting the same market.</span>
      </div>

      {/* 1. Summary Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Tracked Combinations</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{totalCombinations}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Location × Category</div>
        </div>

        <div style={{ background: "white", border: "1px solid #D5F0E5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#276749", textTransform: "uppercase" }}>Eligible Now</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{readyStates.length}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Ready for collection</div>
        </div>

        <div style={{ background: "white", border: "1px solid #F4BE52", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#B7791F", textTransform: "uppercase" }}>Cooling Down</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{coolingStates.length}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>In cooldown window</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Never Run</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#151927", marginTop: 4 }}>{neverRunStates.length}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Pending first execution</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E0D6F5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#553C9A", textTransform: "uppercase" }}>Next Assignment</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {nextTarget ? `${nextTarget.location?.city || "City"} · ${nextTarget.category?.slug || "cat"}` : "—"}
          </div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>
            {nextTarget ? formatCountdown(nextTarget.nextRunEligibleAt) : "Ready"}
          </div>
        </div>
      </div>

      {/* 2. Rotation Table */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Target Location</th>
                <th style={{ padding: "10px 14px" }}>Category</th>
                <th style={{ padding: "10px 14px" }}>Source</th>
                <th style={{ padding: "10px 14px" }}>Last Run</th>
                <th style={{ padding: "10px 14px" }}>Next Eligible</th>
                <th style={{ padding: "10px 14px" }}>State</th>
                <th style={{ padding: "10px 14px" }}>Yield (Found / Qual)</th>
              </tr>
            </thead>
            <tbody>
              {states.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#151927", marginBottom: 4 }}>
                      No rotation states are available.
                    </div>
                    <div style={{ fontSize: 12, color: "#60697A" }}>
                      Rotation states are initialized automatically when collection locations and categories are configured.
                    </div>
                  </td>
                </tr>
              ) : (
                states.map((s: any) => {
                  const badge = rotationStateBadge(s.nextRunEligibleAt, s.lastRunStartedAt);
                  const isNext = nextTarget && nextTarget.id === s.id;
                  const found = s.candidatesFoundTotal ?? 0;
                  const qual = s.candidatesQualifiedTotal ?? 0;
                  const rate = formatYieldRate(qual, found);

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: "1px solid #F0EEEA",
                        background: isNext ? "#FAF8FE" : "transparent",
                      }}
                    >
                      {/* Target Location */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600, color: "#151927" }}>
                            {s.location?.city || "—"}{s.location?.country ? ` (${s.location.country})` : ""}
                          </span>
                          {isNext && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#F0ECFA", color: "#49339A", border: "1px solid #E0D6F5" }}>
                              NEXT
                            </span>
                          )}
                        </div>
                        {s.location?.countryCode && (
                          <div style={{ fontSize: 10, color: "#9299A8", marginTop: 1 }}>
                            {s.location.countryCode} · Radius {s.location.radiusKm || 25}km
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 500, color: "#151927" }}>{s.category?.name || s.category?.slug || "—"}</div>
                        <div style={{ fontSize: 10, color: "#9299A8" }}>{s.category?.slug || "—"}</div>
                      </td>

                      {/* Source */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ color: "#151927" }}>{humanReadableSource(s.source?.name)}</div>
                        <div style={{ fontSize: 10, color: "#9299A8" }}>{s.source?.type || "overpass"}</div>
                      </td>

                      {/* Last Run */}
                      <td style={{ padding: "10px 14px", color: "#60697A" }}>
                        {s.lastRunStartedAt ? (
                          <div>
                            <div>{formatRelativeTime(s.lastRunStartedAt)}</div>
                            <div style={{ fontSize: 10, color: "#9299A8" }}>
                              {new Date(s.lastRunStartedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#9299A8", fontStyle: "italic" }}>Never run</span>
                        )}
                      </td>

                      {/* Next Eligible */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 500, color: badge.state === "READY" ? "#276749" : "#151927" }}>
                          {formatCountdown(s.nextRunEligibleAt)}
                        </div>
                        {s.nextRunEligibleAt && badge.state === "COOLING" && (
                          <div style={{ fontSize: 10, color: "#9299A8" }}>
                            at {new Date(s.nextRunEligibleAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>

                      {/* State */}
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: "nowrap" }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Yield */}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ color: "#151927", fontWeight: 500 }}>
                          {found} found · {qual} qual
                        </div>
                        <div style={{ fontSize: 10, color: "#9299A8", marginTop: 1 }}>
                          Yield rate: {rate}
                        </div>
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
