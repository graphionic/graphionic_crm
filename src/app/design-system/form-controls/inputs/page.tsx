"use client";
import { useState } from "react";

export default function InputsPage() {
  const [focused, setFocused] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>14 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Text Inputs</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Height SM 36 / MD 42 / LG 48, radius 8px, white bg, border #E5E3DF, focus indigo with subtle ring.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.02em", marginBottom: 16, color: "#151927" }}>INPUT TYPES</h3>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              { label: "Company Name", placeholder: "Glow Dentistry", helper: "Full legal company name", type: "text" },
              { label: "Email", placeholder: "info@glowdentistry.co.uk", helper: "Business email with domain", type: "email" },
              { label: "Phone", placeholder: "+44 20 7123 4567", helper: "Optional, with country code", type: "tel" },
              { label: "Search Leads", placeholder: "Search by company, email, city...", helper: "Global search with highlighting", type: "search", icon: "⌕" },
            ].map((field) => (
              <div key={field.label}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{field.label}</label>
                <div style={{ position: "relative", marginTop: 6 }}>
                  {field.icon && <span style={{ position: "absolute", left: 12, top: 11, color: "#9299A8", fontSize: 13 }}>{field.icon}</span>}
                  <input
                    placeholder={field.placeholder}
                    onFocus={() => setFocused(field.label)}
                    onBlur={() => setFocused(null)}
                    style={{
                      width: "100%",
                      height: 42,
                      padding: field.icon ? "0 14px 0 36px" : "0 14px",
                      border: `1px solid ${focused === field.label ? "#49339A" : "#E5E3DF"}`,
                      borderRadius: 8,
                      fontSize: 14,
                      outline: "none",
                      boxShadow: focused === field.label ? "0 0 0 3px #F0ECFA" : "none",
                      transition: "all 0.15s",
                      fontFamily: "Poppins",
                      background: "white",
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "#9299A8", marginTop: 6 }}>{field.helper}</div>
              </div>
            ))}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>With Prefix</label>
                <div style={{ display: "flex", marginTop: 6 }}>
                  <span style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRight: "none", padding: "0 12px", height: 42, display: "flex", alignItems: "center", borderRadius: "8px 0 0 8px", fontSize: 13, color: "#60697A" }}>https://</span>
                  <input placeholder="example.com" style={{ flex: 1, height: 42, padding: "0 14px", border: "1px solid #E5E3DF", borderRadius: "0 8px 8px 0", fontSize: 14, outline: "none", fontFamily: "Poppins" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>Currency</label>
                <div style={{ position: "relative", marginTop: 6 }}>
                  <span style={{ position: "absolute", left: 12, top: 11, fontSize: 13, color: "#9299A8" }}>₹</span>
                  <input placeholder="8,42,500" style={{ width: "100%", height: 42, padding: "0 14px 0 28px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "Poppins" }} />
                </div>
              </div>
            </div>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 11, marginTop: 24, marginBottom: 12, color: "#9299A8", letterSpacing: "0.06em" }}>STATES</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div><div style={{ fontSize: 10, color: "#9299A8", marginBottom: 4, fontWeight: 500 }}>Default</div><input placeholder="Default" style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }} /></div>
            <div><div style={{ fontSize: 10, color: "#49339A", marginBottom: 4, fontWeight: 500 }}>Focus</div><input placeholder="Focused" style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #49339A", borderRadius: 8, fontSize: 13, boxShadow: "0 0 0 3px #F0ECFA", outline: "none", fontFamily: "Poppins" }} /></div>
            <div><div style={{ fontSize: 10, color: "#60697A", marginBottom: 4, fontWeight: 500 }}>Filled</div><input defaultValue="Glow Dentistry" style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 13, background: "#FAF9F7", fontFamily: "Poppins" }} /></div>
            <div><div style={{ fontSize: 10, color: "#EC6262", marginBottom: 4, fontWeight: 500 }}>Error</div><input defaultValue="invalid@" style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #EC6262", borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }} /><div style={{ fontSize: 10, color: "#EC6262", marginTop: 4 }}>Invalid email format</div></div>
            <div><div style={{ fontSize: 10, color: "#4FAE91", marginBottom: 4, fontWeight: 500 }}>Success</div><input defaultValue="info@glowdentistry.co.uk" style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #4FAE91", borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }} /><div style={{ fontSize: 10, color: "#4FAE91", marginTop: 4 }}>✓ Valid email</div></div>
            <div><div style={{ fontSize: 10, color: "#9299A8", marginBottom: 4, fontWeight: 500 }}>Disabled</div><input disabled placeholder="Disabled" style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 13, background: "#FAF9F7", color: "#B8BDC8", fontFamily: "Poppins" }} /></div>
          </div>
        </div>

        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.04em", marginBottom: 16, color: "#151927" }}>INPUT SPEC</h3>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "#151927" }}>Company Name</div>
            <input defaultValue="Glow Dentistry" style={{ width: "100%", height: 42, padding: "0 14px", border: "1px solid #49339A", borderRadius: 8, fontSize: 14, boxShadow: "0 0 0 3px #F0ECFA", outline: "none", fontFamily: "Poppins" }} />
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 6 }}>Helper text • 0/100 characters</div>
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Height MD</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>42px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Radius</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>8px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Border</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>1px #E5E3DF</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Focus</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>#49339A + #F0ECFA ring</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#9299A8" }}>Font</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>14px / Poppins</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
