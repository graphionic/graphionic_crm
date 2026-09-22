"use client";
import { useState } from "react";

export default function InputsPage() {
  const [focused, setFocused] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>14 / 74 · FORM CONTROLS</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Text Inputs</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>Professional form controls with clear states, validation, and specifications. Real CRM examples, not lorem ipsum.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.05em", marginBottom: 16 }}>INPUT TYPES</h3>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              { label: "Company Name *", placeholder: "Glow Dentistry", helper: "Full legal company name", type: "text" },
              { label: "Email", placeholder: "info@glowdentistry.co.uk", helper: "Business email with domain", type: "email" },
              { label: "Phone", placeholder: "+44 20 7123 4567", helper: "Optional, with country code", type: "tel" },
              { label: "Search Leads", placeholder: "Search by company, email, city...", helper: "Global search with highlighting", type: "search", icon: "⌕" },
            ].map((field) => (
              <div key={field.label}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#0B1224" }}>{field.label}</label>
                <div style={{ position: "relative", marginTop: 6 }}>
                  {field.icon && <span style={{ position: "absolute", left: 12, top: 10, color: "#667085", fontSize: 13 }}>{field.icon}</span>}
                  <input
                    placeholder={field.placeholder}
                    onFocus={() => setFocused(field.label)}
                    onBlur={() => setFocused(null)}
                    style={{
                      width: "100%",
                      padding: field.icon ? "10px 14px 10px 36px" : "10px 14px",
                      border: `1px solid ${focused === field.label ? "#315BE8" : "#DDE3EE"}`,
                      borderRadius: 8,
                      fontSize: 13,
                      outline: "none",
                      boxShadow: focused === field.label ? "0 0 0 3px #D9E4FF" : "none",
                      transition: "all 0.15s",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "#667085", marginTop: 6 }}>{field.helper}</div>
              </div>
            ))}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#0B1224" }}>With Prefix</label>
                <div style={{ display: "flex", marginTop: 6 }}>
                  <span style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRight: "none", padding: "10px 12px", borderRadius: "8px 0 0 8px", fontSize: 12, color: "#667085" }}>https://</span>
                  <input placeholder="example.com" style={{ flex: 1, padding: "10px 14px", border: "1px solid #DDE3EE", borderRadius: "0 8px 8px 0", fontSize: 13, outline: "none" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#0B1224" }}>Currency</label>
                <div style={{ position: "relative", marginTop: 6 }}>
                  <span style={{ position: "absolute", left: 12, top: 10, fontSize: 13, color: "#667085" }}>₹</span>
                  <input placeholder="8,42,500" style={{ width: "100%", padding: "10px 14px 10px 28px", border: "1px solid #DDE3EE", borderRadius: 8, fontSize: 13, outline: "none" }} />
                </div>
              </div>
            </div>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 12, marginTop: 24, marginBottom: 12, color: "#667085" }}>STATES — Default / Hover / Focus / Filled / Error / Disabled</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div><div style={{ fontSize: 10, color: "#667085", marginBottom: 4 }}>Default</div><input placeholder="Default" style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EE", borderRadius: 8, fontSize: 12 }} /></div>
            <div><div style={{ fontSize: 10, color: "#667085", marginBottom: 4 }}>Focus</div><input placeholder="Focused" style={{ width: "100%", padding: "8px 12px", border: "1px solid #315BE8", borderRadius: 8, fontSize: 12, boxShadow: "0 0 0 3px #D9E4FF", outline: "none" }} /></div>
            <div><div style={{ fontSize: 10, color: "#667085", marginBottom: 4 }}>Filled</div><input defaultValue="Glow Dentistry" style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EE", borderRadius: 8, fontSize: 12, background: "#F6F8FC" }} /></div>
            <div><div style={{ fontSize: 10, color: "#E5484D", marginBottom: 4 }}>Error</div><input defaultValue="invalid@" style={{ width: "100%", padding: "8px 12px", border: "1px solid #E5484D", borderRadius: 8, fontSize: 12 }} /><div style={{ fontSize: 10, color: "#E5484D", marginTop: 4 }}>Invalid email format</div></div>
            <div><div style={{ fontSize: 10, color: "#16A36A", marginBottom: 4 }}>Success</div><input defaultValue="info@glowdentistry.co.uk" style={{ width: "100%", padding: "8px 12px", border: "1px solid #16A36A", borderRadius: 8, fontSize: 12 }} /><div style={{ fontSize: 10, color: "#16A36A", marginTop: 4 }}>✓ Valid email</div></div>
            <div><div style={{ fontSize: 10, color: "#667085", marginBottom: 4 }}>Disabled</div><input disabled placeholder="Disabled" style={{ width: "100%", padding: "8px 12px", border: "1px solid #EEF3FF", borderRadius: 8, fontSize: 12, background: "#F6F8FC", color: "#98A2B3" }} /></div>
          </div>
        </div>

        <div style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 16 }}>INPUT ANATOMY & SPEC</h3>
          <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Company Name *</div>
            <input defaultValue="Glow Dentistry" style={{ width: "100%", padding: "10px 14px", border: "1px solid #315BE8", borderRadius: 8, fontSize: 13, boxShadow: "0 0 0 3px #D9E4FF", outline: "none" }} />
            <div style={{ fontSize: 10, color: "#667085", marginTop: 6 }}>Helper text • 0/100 characters</div>
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Height</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>40px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Padding</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>10px 14px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Radius</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>8px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Border</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>1px #DDE3EE</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Focus</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>#315BE8 + 3px #D9E4FF</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#667085" }}>Font</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>13px / Inter</span></div>
          </div>
          <div style={{ marginTop: 16, padding: 10, background: "white", borderRadius: 8, fontSize: 11 }}>
            <b>Supporting:</b> Label (12px/600), Required *, Placeholder #98A2B3, Helper #667085, Error #E5484D, Counter, Prefix/Suffix, Tooltip
          </div>
        </div>
      </div>
    </div>
  );
}
