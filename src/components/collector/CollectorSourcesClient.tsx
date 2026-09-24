"use client";

import { useState } from "react";

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

  const handleCreateSource = async () => {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSources([data, ...sources]);
      setShowSourceForm(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleSource = async (id: string) => {
    const res = await fetch(`/api/collector/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    const data = await res.json();
    if (res.ok) setSources(sources.map((s: any) => (s.id === id ? data : s)));
  };

  const handleCreateCredential = async () => {
    try {
      const res = await fetch("/api/collector/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCredentials([data, ...credentials]);
      setShowCredentialForm(false);
      setCredForm({ provider: "openai", label: "", apiKey: "" });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm("Delete this credential? This cannot be undone.")) return;
    const res = await fetch(`/api/collector/credentials/${id}`, { method: "DELETE" });
    if (res.ok) setCredentials(credentials.filter((c: any) => c.id !== id));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Data Sources & Endpoints</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Discovery endpoints, health monitoring, protocol parameters, and masked provider credentials.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowSourceForm(!showSourceForm)}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              {showSourceForm ? "Cancel" : "+ Add Source"}
            </button>
            <button
              onClick={() => setShowCredentialForm(!showCredentialForm)}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E3DF", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              + Provider Key
            </button>
          </div>
        </div>
      )}

      {showSourceForm && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Add Discovery Data Source</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label>
              <input
                value={sourceForm.name}
                onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })}
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Type *</label>
              <select
                value={sourceForm.type}
                onChange={e => setSourceForm({ ...sourceForm, type: e.target.value })}
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13, background: "white" }}
              >
                <option value="overpass">overpass</option>
                <option value="google_places">google_places</option>
                <option value="custom">custom</option>
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Base URL *</label>
              <input
                value={sourceForm.baseUrl}
                onChange={e => setSourceForm({ ...sourceForm, baseUrl: e.target.value })}
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
          </div>
          <button
            onClick={handleCreateSource}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}
          >
            Create Source
          </button>
        </div>
      )}

      {showCredentialForm && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Add Provider Credential (AES-256 Encrypted)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Provider *</label>
              <input
                value={credForm.provider}
                onChange={e => setCredForm({ ...credForm, provider: e.target.value })}
                placeholder="openai, resend, etc"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Label</label>
              <input
                value={credForm.label}
                onChange={e => setCredForm({ ...credForm, label: e.target.value })}
                placeholder="Primary Key"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>API Key *</label>
              <input
                type="password"
                value={credForm.apiKey}
                onChange={e => setCredForm({ ...credForm, apiKey: e.target.value })}
                placeholder="Secret key (stored securely encrypted)"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
          </div>
          <button
            onClick={handleCreateCredential}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}
          >
            Encrypt & Store Key
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Endpoints Table */}
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>
            Configured Data Sources — {sources.length}
          </div>
          {sources.map((src: any) => (
            <div key={src.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{src.name}</div>
                <div style={{ fontSize: 11, color: "#9299A8" }}>
                  {src.type} · {src.baseUrl?.slice(0, 45)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ padding: "3px 8px", borderRadius: 6, background: src.healthStatus === "healthy" ? "#EEF8F4" : src.healthStatus === "down" ? "#FDECEC" : "#FFF6E3", color: src.healthStatus === "healthy" ? "#4FAE91" : src.healthStatus === "down" ? "#EC6262" : "#F29B38", fontSize: 11, fontWeight: 500 }}>
                  {src.healthStatus}
                </span>
                <button
                  onClick={() => handleToggleSource(src.id)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}
                >
                  {src.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Credentials Table */}
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>
            Provider Credentials — {credentials.length}
          </div>
          {credentials.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
              No custom credentials configured.
            </div>
          ) : (
            credentials.map((cred: any) => (
              <div key={cred.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>
                    {cred.provider} {cred.label ? `(${cred.label})` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>
                    {cred.maskedKey || cred.keyHint || "••••••••"}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCredential(cred.id)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
