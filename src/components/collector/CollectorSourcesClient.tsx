"use client";

import { useState } from "react";
import Link from "next/link";
import CollectionOperationsHeader from "./CollectionOperationsHeader";
import {
  humanReadableSource,
  sourceHealthBadgeStyle,
} from "./collector-utils";

interface CollectorSourcesProps {
  initialSources?: any[];
  initialCredentials?: any[];
  showHeader?: boolean;
}

export default function CollectorSourcesClient({
  initialSources = [],
  initialCredentials = [],
  showHeader = true,
}: CollectorSourcesProps) {
  const [sources, setSources] = useState<any[]>(initialSources);
  const [credentials, setCredentials] = useState<any[]>(initialCredentials);

  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);

  const [sourceForm, setSourceForm] = useState({
    name: "OpenStreetMap / Overpass",
    type: "overpass",
    baseUrl: "https://overpass-api.de/api/interpreter",
    timeoutMs: "25000",
    retryCount: "3",
    concurrency: "15",
    priority: "50",
  });

  const [credForm, setCredForm] = useState({ provider: "openai", label: "", apiKey: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleCreateSource = async () => {
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await fetch("/api/collector/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sourceForm,
          timeoutMs: parseInt(sourceForm.timeoutMs),
          retryCount: parseInt(sourceForm.retryCount),
          concurrency: parseInt(sourceForm.concurrency),
          priority: parseInt(sourceForm.priority),
        }),
      });
      if (!res.ok) throw new Error("Failed to create source");
      const created = await res.json();
      setSources([...sources, created]);
      setShowSourceForm(false);
      setFormSuccess("Source created successfully");
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (e: any) {
      setFormError(e.message || "Failed to create source");
    }
  };

  const handleToggleSource = async (id: string, currentEnabled: boolean, type: string) => {
    if (type === "google_places" && !currentEnabled) {
      alert("Google Places activation is strictly controlled via Phase 4D.5 Guardrails. Activation is currently disabled.");
      return;
    }
    try {
      const res = await fetch(`/api/collector/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (!res.ok) throw new Error("Failed to update source");
      const updated = await res.json();
      setSources(sources.map(s => s.id === id ? updated : s));
    } catch (e: any) {
      alert(e.message || "Failed to update source");
    }
  };

  const handleCreateCredential = async () => {
    setFormError(null);
    try {
      const res = await fetch("/api/collector/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credForm),
      });
      if (!res.ok) throw new Error("Failed to create credential");
      const created = await res.json();
      setCredentials([...credentials, created]);
      setShowCredentialForm(false);
      setCredForm({ provider: "openai", label: "", apiKey: "" });
      setFormSuccess("Credential stored securely");
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (e: any) {
      setFormError(e.message || "Failed to create credential");
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credential?")) return;
    try {
      const res = await fetch(`/api/collector/credentials/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete credential");
      setCredentials(credentials.filter(c => c.id !== id));
    } catch (e: any) {
      alert(e.message || "Failed to delete credential");
    }
  };

  const osmSource = sources.find(s => s.type === "overpass" || s.name?.toLowerCase().includes("overpass"));
  const googleSource = sources.find(s => s.type === "google_places" || s.name?.toLowerCase().includes("google"));
  const customSources = sources.filter(s => s.type !== "overpass" && s.type !== "google_places" && !s.name?.toLowerCase().includes("overpass") && !s.name?.toLowerCase().includes("google"));

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {showHeader && (
        <CollectionOperationsHeader
          currentTab="sources"
          extraRight={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowCredentialForm(!showCredentialForm)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer", fontWeight: 500, color: "#151927" }}
              >
                + Add Provider Key
              </button>
              <button
                onClick={() => setShowSourceForm(!showSourceForm)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #49339A", background: "#49339A", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
              >
                + Add Custom Source
              </button>
            </div>
          }
        />
      )}

      {formSuccess && (
        <div style={{ background: "#EEF8F4", border: "1px solid #D5F0E5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#276749" }}>
          ✓ {formSuccess}
        </div>
      )}
      {formError && (
        <div style={{ background: "#FDECEC", border: "1px solid #FBD5D5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#EC6262" }}>
          ✕ Error: {formError}
        </div>
      )}

      {/* Forms Modal/Accordion if toggled */}
      {showSourceForm && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#151927" }}>Add Custom Discovery Source</h4>
            <button onClick={() => setShowSourceForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", display: "block", marginBottom: 4 }}>Source Name</label>
              <input value={sourceForm.name} onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #E5E3DF", fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", display: "block", marginBottom: 4 }}>Type</label>
              <input value={sourceForm.type} onChange={e => setSourceForm({ ...sourceForm, type: e.target.value })} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #E5E3DF", fontSize: 12 }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", display: "block", marginBottom: 4 }}>Base URL / Endpoint</label>
              <input value={sourceForm.baseUrl} onChange={e => setSourceForm({ ...sourceForm, baseUrl: e.target.value })} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #E5E3DF", fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setShowSourceForm(false)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12 }}>Cancel</button>
            <button onClick={handleCreateSource} style={{ padding: "6px 14px", borderRadius: 6, background: "#49339A", color: "white", border: "none", fontSize: 12, fontWeight: 500 }}>Create Source</button>
          </div>
        </div>
      )}

      {showCredentialForm && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#151927" }}>Add Secure Provider Credential</h4>
            <button onClick={() => setShowCredentialForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", display: "block", marginBottom: 4 }}>Provider</label>
              <select value={credForm.provider} onChange={e => setCredForm({ ...credForm, provider: e.target.value })} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #E5E3DF", fontSize: 12, background: "white" }}>
                <option value="openai">OpenAI</option>
                <option value="hunter">Hunter.io</option>
                <option value="dropcontact">Dropcontact</option>
                <option value="snovio">Snov.io</option>
                <option value="anymailfinder">Anymail Finder</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", display: "block", marginBottom: 4 }}>Label (optional)</label>
              <input value={credForm.label} onChange={e => setCredForm({ ...credForm, label: e.target.value })} placeholder="e.g. Primary OpenAI Key" style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #E5E3DF", fontSize: 12 }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", display: "block", marginBottom: 4 }}>API Key (Encrypted via AES-256-GCM on server)</label>
              <input type="password" value={credForm.apiKey} onChange={e => setCredForm({ ...credForm, apiKey: e.target.value })} placeholder="Enter key..." style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #E5E3DF", fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setShowCredentialForm(false)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12 }}>Cancel</button>
            <button onClick={handleCreateCredential} style={{ padding: "6px 14px", borderRadius: 6, background: "#49339A", color: "white", border: "none", fontSize: 12, fontWeight: 500 }}>Store Key</button>
          </div>
        </div>
      )}

      {/* 1. Discovery Provider Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        {/* OpenStreetMap Card */}
        {osmSource && (
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🟢</span>
                  <strong style={{ fontSize: 15, color: "#151927" }}>{osmSource.name}</strong>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: osmSource.enabled ? "#EEF8F4" : "#FAF9F7", color: osmSource.enabled ? "#276749" : "#9299A8", border: `1px solid ${osmSource.enabled ? "#D5F0E5" : "#E5E3DF"}` }}>
                  {osmSource.enabled ? "ACTIVE" : "DISABLED"}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
                Primary discovery endpoint providing global business points of interest, amenities, and entity tags.
              </div>

              <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, display: "grid", gap: 6, fontSize: 11 }}>
                <div><span style={{ color: "#9299A8" }}>Endpoint:</span> <span style={{ color: "#151927", fontFamily: "monospace" }}>{osmSource.baseUrl}</span></div>
                <div><span style={{ color: "#9299A8" }}>Credential:</span> <span style={{ color: "#276749", fontWeight: 500 }}>Not required (Public API)</span></div>
                <div><span style={{ color: "#9299A8" }}>Health Status:</span> <span style={{ color: "#276749", fontWeight: 500 }}>{osmSource.healthStatus || "healthy"}</span></div>
                <div><span style={{ color: "#9299A8" }}>Timeout / Concurrency:</span> <span style={{ color: "#151927" }}>{osmSource.timeoutMs}ms / {osmSource.concurrency} req</span></div>
                <div><span style={{ color: "#9299A8" }}>Priority Weight:</span> <span style={{ color: "#151927" }}>{osmSource.priority}</span></div>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9299A8" }}>Configured in fair rotation</span>
              <button
                onClick={() => handleToggleSource(osmSource.id, osmSource.enabled, osmSource.type)}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer", color: osmSource.enabled ? "#EC6262" : "#276749" }}
              >
                {osmSource.enabled ? "Disable Source" : "Enable Source"}
              </button>
            </div>
          </div>
        )}

        {/* Google Places Card (Protected by Guardrails) */}
        {googleSource && (
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <strong style={{ fontSize: 15, color: "#151927" }}>{googleSource.name}</strong>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "#FDECEC", color: "#C53030", border: "1px solid #FBD5D5" }}>
                  DISABLED
                </span>
              </div>

              <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>
                High-precision commercial discovery and cross-source verification. Protected by global guardrails.
              </div>

              <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, display: "grid", gap: 6, fontSize: 11 }}>
                <div><span style={{ color: "#9299A8" }}>Activation Mode:</span> <span style={{ color: "#C53030", fontWeight: 600 }}>DISABLED</span></div>
                <div><span style={{ color: "#9299A8" }}>Guardrails Policy:</span> <span style={{ color: "#276749", fontWeight: 500 }}>Fail Closed (Zero live requests)</span></div>
                <div><span style={{ color: "#9299A8" }}>Credential Status:</span> <span style={{ color: "#60697A" }}>Configured (Server-only, zero UI exposure)</span></div>
                <div><span style={{ color: "#9299A8" }}>Usage Recorded:</span> <span style={{ color: "#151927" }}>2 historical requests (0 pending)</span></div>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9299A8" }}>Safety Level: Enforced</span>
              <Link
                href="/settings/google"
                style={{ fontSize: 11, color: "#49339A", fontWeight: 500, textDecoration: "underline" }}
              >
                View Google Guardrails →
              </Link>
            </div>
          </div>
        )}

        {/* Custom Sources if any */}
        {customSources.map((cs: any) => {
          const healthBadge = sourceHealthBadgeStyle(cs.healthStatus);
          return (
            <div key={cs.id} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 15, color: "#151927" }}>{cs.name}</strong>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: cs.enabled ? "#EEF8F4" : "#FAF9F7", color: cs.enabled ? "#276749" : "#9299A8", border: `1px solid ${cs.enabled ? "#D5F0E5" : "#E5E3DF"}` }}>
                    {cs.enabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>

                <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, display: "grid", gap: 6, fontSize: 11 }}>
                  <div><span style={{ color: "#9299A8" }}>Type:</span> <span style={{ color: "#151927" }}>{cs.type}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Endpoint:</span> <span style={{ color: "#151927", fontFamily: "monospace" }}>{cs.baseUrl}</span></div>
                  <div><span style={{ color: "#9299A8" }}>Health:</span> <span style={{ color: healthBadge.color, fontWeight: 500 }}>{healthBadge.label}</span></div>
                </div>
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #F0EEEA", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => handleToggleSource(cs.id, cs.enabled, cs.type)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer", color: cs.enabled ? "#EC6262" : "#276749" }}
                >
                  {cs.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Provider Credentials Inventory */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", textTransform: "uppercase" }}>
              Provider Credentials Inventory
            </div>
            <div style={{ fontSize: 12, color: "#60697A", marginTop: 2 }}>
              API keys stored with server-side AES-256-GCM encryption. Zero raw secret exposure to browser.
            </div>
          </div>
        </div>

        {credentials.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
            No external provider credentials configured.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 12px" }}>Provider</th>
                  <th style={{ padding: "8px 12px" }}>Label</th>
                  <th style={{ padding: "8px 12px" }}>Key Hint</th>
                  <th style={{ padding: "8px 12px" }}>Status</th>
                  <th style={{ padding: "8px 12px" }}>Last Used</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "#151927" }}>{c.provider}</td>
                    <td style={{ padding: "8px 12px", color: "#60697A" }}>{c.label || "—"}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#60697A" }}>
                      {c.maskedKey || (c.keyHint ? `••••••••••••••••${c.keyHint}` : "••••••••••••••••")}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: c.enabled ? "#EEF8F4" : "#FAF9F7", color: c.enabled ? "#276749" : "#9299A8", border: `1px solid ${c.enabled ? "#D5F0E5" : "#E5E3DF"}` }}>
                        {c.enabled ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#9299A8" }}>
                      {c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <button
                        onClick={() => handleDeleteCredential(c.id)}
                        style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #FBD5D5", background: "white", color: "#EC6262", fontSize: 11, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
