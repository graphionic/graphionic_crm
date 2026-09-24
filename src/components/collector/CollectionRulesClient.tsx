"use client";

import { useState } from "react";

interface CollectionRulesProps {
  initialRules?: any[];
  showHeader?: boolean;
}

export default function CollectionRulesClient({
  initialRules = [],
  showHeader = true,
}: CollectionRulesProps) {
  const [rules, setRules] = useState<any[]>(initialRules);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    key: "",
    name: "",
    description: "",
    category: "lead_requirements",
  });

  const handleCreateRule = async () => {
    try {
      const res = await fetch("/api/collector/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRules([data, ...rules]);
      setShowRuleForm(false);
      setRuleForm({ key: "", name: "", description: "", category: "lead_requirements" });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleRule = async (id: string) => {
    const res = await fetch(`/api/collector/rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    const data = await res.json();
    if (res.ok) setRules(rules.map((r: any) => (r.id === id ? data : r)));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collection Rules</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Modular qualification and filtering rule controls for candidate processing.</p>
          </div>
          <button
            onClick={() => setShowRuleForm(!showRuleForm)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            {showRuleForm ? "Cancel" : "+ Add Rule"}
          </button>
        </div>
      )}

      {showRuleForm && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Create New Collection Rule</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Key (unique snake_case) *</label>
              <input
                value={ruleForm.key}
                onChange={e => setRuleForm({ ...ruleForm, key: e.target.value })}
                placeholder="require_business_email"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Name *</label>
              <input
                value={ruleForm.name}
                onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="Require Business Email"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Description</label>
              <input
                value={ruleForm.description}
                onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                placeholder="Candidate must possess a non-generic business email address"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
          </div>
          <button
            onClick={handleCreateRule}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}
          >
            Create Rule
          </button>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E3DF", fontSize: 13, fontWeight: 600, color: "#151927" }}>
          Configured Rules — {rules.length}
        </div>
        {rules.map((rule: any) => (
          <div key={rule.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>
                {rule.name} <span style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>({rule.key})</span>
              </div>
              <div style={{ fontSize: 11, color: "#60697A" }}>
                {rule.description || "—"} · <span style={{ color: "#9299A8" }}>{rule.category}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ padding: "3px 8px", borderRadius: 6, background: rule.enabled ? "#EEF8F4" : "#F0EEEA", color: rule.enabled ? "#4FAE91" : "#9299A8", fontSize: 11, fontWeight: 500 }}>
                {rule.enabled ? "ENABLED" : "DISABLED"}
              </span>
              <button
                onClick={() => handleToggleRule(rule.id)}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}
              >
                {rule.enabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
