"use client";

import Link from "next/link";
import { formatDuration, formatRelativeTime } from "./collector-utils";

interface GoogleGuardrailsProps {
  config?: any;
  source?: any;
  usageCount?: number;
  usageReserved?: number;
  cacheCount?: number;
  usages?: any[];
  caches?: any[];
  hasApiKey?: boolean;
  showHeader?: boolean;
}

export default function GoogleGuardrailsClient({
  config,
  source,
  usageCount = 2,
  usageReserved = 0,
  cacheCount = 2,
  usages = [],
  caches = [],
  hasApiKey = true,
  showHeader = true,
}: GoogleGuardrailsProps) {
  const mode = config?.activationMode || "DISABLED";
  const isEnabled = Boolean(config?.enabled);
  const isSourceEnabled = Boolean(source?.enabled);
  const failClosed = config?.failClosed !== false;
  const canaryScopes = config?.canaryScopes || [{ countryCode: "GB", city: "Manchester", categorySlug: "dental" }];

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {/* Header */}
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#9299A8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>
              <span>Configuration</span>
              <span>/</span>
              <span style={{ color: "#49339A" }}>Google Guardrails</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", margin: "0 0 4px" }}>Google Places Guardrails & Safety</h2>
            <p style={{ fontSize: 13, color: "#60697A", margin: 0 }}>
              Paid API request guardrails, strict rate limits, canary scope isolation, and usage observability.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: "#FAF9F7", color: "#60697A", border: "1px solid #E5E3DF" }}>
              {isEnabled ? "● Master Enabled" : "● Master Disabled"}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: "#EEF8F4", color: "#276749", border: "1px solid #D5F0E5" }}>
              {failClosed ? "Guardrails: Fail Closed" : "Guardrails: Permissive"}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: mode === "DISABLED" ? "#FAF9F7" : "#F0ECFA", color: mode === "DISABLED" ? "#60697A" : "#49339A", border: "1px solid #E5E3DF" }}>
              Mode: {mode}
            </span>
          </div>
        </div>
      )}

      {/* 1. Operational Status Explanation Callout */}
      <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18, color: "#49339A" }}>◈</span>
        <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.6 }}>
          <strong style={{ color: "#151927" }}>Operational Status:</strong> Google Places collection is currently disabled. Both the Google collection configuration and the <span style={{ fontFamily: "monospace" }}>google_places</span> data source are disabled. Protection policy is set to <strong>Fail Closed</strong>, blocking requests rather than attempting them when protection requirements are not met.
        </div>
      </div>

      {/* 2. Core Operational Metrics Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Activation Mode</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: mode === "DISABLED" ? "#60697A" : "#49339A", marginTop: 4 }}>{mode}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Read-only state</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Credential Status</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: hasApiKey ? "#276749" : "#B7791F", marginTop: 4 }}>
            {hasApiKey ? "Configured" : "Missing"}
          </div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Server-only secret</div>
        </div>

        <div style={{ background: "white", border: "1px solid #D5F0E5", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#276749", textTransform: "uppercase" }}>Guardrails Policy</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#276749", marginTop: 4 }}>Fail Closed</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Zero unverified calls</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Pending Reservations</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: usageReserved > 0 ? "#B7791F" : "#151927", marginTop: 4 }}>{usageReserved}</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Dangling: 0</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Recorded Usage</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#151927", marginTop: 4 }}>{usageCount} requests</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Historical total</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>Cached Responses</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#151927", marginTop: 4 }}>{cacheCount} queries</div>
          <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>TTL: 24h search / 7d details</div>
        </div>
      </div>

      {/* 3. Safety Controls & Rate Limits */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 4 }}>
          Safety Controls & Rate Limits
        </div>
        <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
          Enforced server-side prior to sending any Google Places HTTP requests.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase", fontWeight: 600 }}>Canary Limits</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 2 }}>
              {config?.canaryPerRunRequestLimit ?? 3} / run · {config?.canaryDailyRequestLimit ?? 5} / day
            </div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Micro-budget canary ceiling</div>
          </div>

          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase", fontWeight: 600 }}>Production Limits</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 2 }}>
              {config?.perRunRequestLimit ?? 10} / run · {config?.dailyRequestLimit ?? 50} / day
            </div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Daily rate limiting ceiling</div>
          </div>

          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase", fontWeight: 600 }}>Monthly Hard Cap</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 2 }}>
              {config?.monthlyRequestLimit ?? 500} requests / mo
            </div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Absolute account ceiling</div>
          </div>

          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase", fontWeight: 600 }}>Retry Policy</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 2 }}>
              {config?.retryLimit ?? 0} retries (Strict)
            </div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Prevents budget bypass on errors</div>
          </div>

          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase", fontWeight: 600 }}>Query Cache TTL</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 2 }}>
              {config?.queryCacheTtlHours ?? 24} hours
            </div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Text search cache window</div>
          </div>

          <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: "#9299A8", textTransform: "uppercase", fontWeight: 600 }}>Details Cache TTL</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginTop: 2 }}>
              {config?.placeDetailsCacheTtlHours ?? 168} hours (7 days)
            </div>
            <div style={{ fontSize: 10, color: "#60697A", marginTop: 2 }}>Place details cache window</div>
          </div>
        </div>
      </div>

      {/* 4. Canary Allowlist Scopes */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 4 }}>
          Canary Allowlist Scope (Zero Out-of-Scope Requests)
        </div>
        <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
          In CANARY mode, only requests matching these exact location-category tuples are permitted. Currently inactive while mode is DISABLED.
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {Array.isArray(canaryScopes) && canaryScopes.map((scope: any, i: number) => (
            <div key={i} style={{ background: "#F0ECFA", border: "1px solid #E0D6F5", padding: "8px 14px", borderRadius: 8, fontSize: 12, color: "#49339A", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📍</span>
              <span>{scope.city}, {scope.countryCode} · {scope.categorySlug}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#9299A8" }}>
          All collection targets outside this allowlist are rejected at the reservation stage before any network request can occur.
        </div>
      </div>

      {/* 5. Usage & Controlled Activity History */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 4 }}>
          Controlled Activity & API Usage Log ({usages.length})
        </div>
        <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
          Audit records for controlled probes and canary executions.
        </div>

        {usages.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
            No Google API requests recorded.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 12px" }}>Activity</th>
                  <th style={{ padding: "8px 12px" }}>Operation</th>
                  <th style={{ padding: "8px 12px" }}>Target</th>
                  <th style={{ padding: "8px 12px" }}>Status</th>
                  <th style={{ padding: "8px 12px" }}>Latency</th>
                  <th style={{ padding: "8px 12px" }}>Results</th>
                  <th style={{ padding: "8px 12px" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {usages.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "#151927" }}>
                      {u.activityType || "Controlled Run"}
                    </td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#60697A" }}>
                      {u.operation}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {u.city ? `${u.city}${u.countryCode ? ` (${u.countryCode})` : ""} · ${u.category || "—"}` : "—"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: u.status === "SUCCESS" ? "#EEF8F4" : "#FAF9F7", color: u.status === "SUCCESS" ? "#276749" : "#60697A", border: `1px solid ${u.status === "SUCCESS" ? "#D5F0E5" : "#E5E3DF"}` }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#60697A" }}>
                      {u.latencyMs ? `${u.latencyMs}ms` : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#151927" }}>
                      {u.resultCount != null ? `${u.resultCount} places` : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#9299A8" }}>
                      {u.reservedAt ? new Date(u.reservedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Query Cache Inventory */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 4 }}>
          Query Cache Inventory ({caches.length})
        </div>
        <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
          Persisted responses stored to eliminate redundant Google API requests across runs.
        </div>

        {caches.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
            No Google API cache entries stored.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
              <thead>
                <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 12px" }}>Query Fingerprint</th>
                  <th style={{ padding: "8px 12px" }}>Operation</th>
                  <th style={{ padding: "8px 12px" }}>Cached Results</th>
                  <th style={{ padding: "8px 12px" }}>Hit Count</th>
                  <th style={{ padding: "8px 12px" }}>Expires At</th>
                </tr>
              </thead>
              <tbody>
                {caches.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#151927" }}>
                      {c.queryFingerprint?.slice(0, 16)}…
                    </td>
                    <td style={{ padding: "8px 12px", color: "#60697A" }}>{c.operation}</td>
                    <td style={{ padding: "8px 12px", color: "#151927" }}>
                      {c.placesCount != null ? `${c.placesCount} places` : "Response metadata"}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#60697A" }}>{c.hitCount} hits</td>
                    <td style={{ padding: "8px 12px", color: "#9299A8" }}>
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. How Google Activation Works (Operational Safety Checklist) */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase", marginBottom: 4 }}>
          Google Activation Operational Requirements
        </div>
        <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
          To make live Google Places collection requests, all 5 safety requirements must be met simultaneously:
        </div>

        <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#FAF9F7", padding: "8px 12px", borderRadius: 6 }}>
            <span style={{ color: hasApiKey ? "#276749" : "#B7791F", fontWeight: 700 }}>1.</span>
            <div><strong style={{ color: "#151927" }}>Server Environment Credential:</strong> Valid <span style={{ fontFamily: "monospace" }}>GOOGLE_MAPS_API_KEY</span> present in server environment ({hasApiKey ? "Configured" : "Missing"}).</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#FAF9F7", padding: "8px 12px", borderRadius: 6 }}>
            <span style={{ color: mode !== "DISABLED" ? "#276749" : "#60697A", fontWeight: 700 }}>2.</span>
            <div><strong style={{ color: "#151927" }}>Explicit Activation Mode:</strong> <span style={{ fontFamily: "monospace" }}>activationMode</span> explicitly set to <span style={{ fontFamily: "monospace" }}>CANARY</span> or <span style={{ fontFamily: "monospace" }}>PRODUCTION</span> via controlled workflow (Currently: <strong>DISABLED</strong>).</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#FAF9F7", padding: "8px 12px", borderRadius: 6 }}>
            <span style={{ color: "#60697A", fontWeight: 700 }}>3.</span>
            <div><strong style={{ color: "#151927" }}>Canary Allowlist Matching:</strong> Target location and category must match the configured <span style={{ fontFamily: "monospace" }}>canaryScopes</span> tuple.</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#FAF9F7", padding: "8px 12px", borderRadius: 6 }}>
            <span style={{ color: isEnabled && isSourceEnabled ? "#276749" : "#60697A", fontWeight: 700 }}>4.</span>
            <div><strong style={{ color: "#151927" }}>Dual Master Enable:</strong> Both <span style={{ fontFamily: "monospace" }}>GoogleCollectionConfig.enabled</span> and <span style={{ fontFamily: "monospace" }}>DataSource(google_places).enabled</span> must be toggled on.</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#FAF9F7", padding: "8px 12px", borderRadius: 6 }}>
            <span style={{ color: "#276749", fontWeight: 700 }}>5.</span>
            <div><strong style={{ color: "#151927" }}>Budget Reservation Success:</strong> Pre-request reservation must succeed within per-run, daily, and monthly caps.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
