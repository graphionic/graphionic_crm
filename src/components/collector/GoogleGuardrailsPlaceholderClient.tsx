"use client";

interface GoogleGuardrailsPlaceholderProps {
  config?: any;
  usageCount?: number;
  cacheCount?: number;
  hasApiKey?: boolean;
  showHeader?: boolean;
}

export default function GoogleGuardrailsPlaceholderClient({
  config,
  usageCount = 2,
  cacheCount = 2,
  hasApiKey = true,
  showHeader = true,
}: GoogleGuardrailsPlaceholderProps) {
  const mode = config?.activationMode || "DISABLED";
  const isEnabled = Boolean(config?.enabled);
  const canaryScopes = config?.canaryScopes || [{ countryCode: "GB", city: "Manchester", categorySlug: "dental" }];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Google Places Guardrails & Safety</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Paid request guardrails, strict rate limits, canary scope isolation, and API usage tracking.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: isEnabled ? "#FFF6E3" : "#FDECEC", color: isEnabled ? "#B7791F" : "#EC6262", border: `1px solid ${isEnabled ? "#F4BE52" : "#FBD5D5"}` }}>
              {isEnabled ? "● Master Enabled" : "● Master Disabled (Fail-Closed)"}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, background: mode === "PRODUCTION" ? "#EEF8F4" : mode === "CANARY" ? "#FFF6E3" : "#FAF9F7", color: mode === "PRODUCTION" ? "#4FAE91" : mode === "CANARY" ? "#F29B38" : "#9299A8", border: "1px solid #E5E3DF" }}>
              Mode: {mode}
            </span>
          </div>
        </div>
      )}

      {/* Safety Notice Callout */}
      <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18, color: "#49339A" }}>◈</span>
        <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.6 }}>
          <strong style={{ color: "#151927" }}>Phase 4D.2 Safe Read-Only Observability:</strong> This view reflects current database guardrail parameters. Google activation controls and interactive mode switches remain locked until Phase 4D.5 to prevent unintended API calls during navigation restructuring.
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Activation Mode</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: mode === "DISABLED" ? "#60697A" : "#49339A" }}>{mode}</div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Default: DISABLED (Fail-closed)</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>API Key Status</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: hasApiKey ? "#4FAE91" : "#EC6262" }}>
            {hasApiKey ? "● Configured" : "✕ Missing"}
          </div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>Zero-Secret Guarantee (Never rendered)</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Request Limits</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>
            Canary: {config?.canaryPerRunRequestLimit ?? 3}/run · {config?.canaryDailyRequestLimit ?? 5}/day
          </div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>
            Hard Cap: {config?.monthlyRequestLimit ?? 500} requests/month
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Usage & Cache Audit</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>
            {usageCount} Total Requests Logged
          </div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>
            {cacheCount} Cached Queries (TTL: {config?.queryCacheTtlHours ?? 24}h Search / {config?.placeDetailsCacheTtlHours ?? 168}h Details)
          </div>
        </div>
      </div>

      {/* Canary Allowlist Scopes */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Canary Allowlist Scopes (Zero Out-of-Scope Requests)</h3>
        <p style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>In CANARY mode, only requests matching these exact location-category tuples are permitted.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.isArray(canaryScopes) && canaryScopes.map((scope: any, i: number) => (
            <div key={i} style={{ background: "#F0ECFA", border: "1px solid #E0D6F5", padding: "6px 12px", borderRadius: 8, fontSize: 12, color: "#49339A", fontWeight: 500 }}>
              {scope.city}, {scope.countryCode} · {scope.categorySlug}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
