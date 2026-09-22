"use client";

export default function SpacingPage() {
  const tokens = [
    { name: "0", value: "0", px: 0 },
    { name: "1", value: "4px", px: 4 },
    { name: "2", value: "8px", px: 8 },
    { name: "3", value: "12px", px: 12 },
    { name: "4", value: "16px", px: 16 },
    { name: "5", value: "20px", px: 20 },
    { name: "6", value: "24px", px: 24 },
    { name: "8", value: "32px", px: 32 },
    { name: "10", value: "40px", px: 40 },
    { name: "12", value: "48px", px: 48 },
    { name: "16", value: "64px", px: 64 },
    { name: "20", value: "80px", px: 80 },
    { name: "24", value: "96px", px: 96 },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>04 / 74 · FOUNDATIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Spacing</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>4px base unit. Visualize every token as actual distance. Consistent rhythm for premium admin.</p>
      </div>

      {/* Tokens visualized */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Spacing Scale — 4px Base</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {tokens.map((t) => (
            <div key={t.name} style={{ display: "grid", gridTemplateColumns: "50px 70px 1fr 60px", gap: 16, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#151927" }}>{t.name}</span>
              <span style={{ fontSize: 12, color: "#60697A", fontFamily: "monospace" }}>{t.value}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: t.px, height: 14, background: "#49339A", borderRadius: 3, minWidth: t.px === 0 ? 1 : t.px }} />
                <div style={{ flex: 1, height: 1, background: "#F0EEEA", position: "relative" }}>
                  {t.px > 0 && <div style={{ position: "absolute", top: -3, left: 0, width: t.px, height: 7, borderLeft: "1px solid #E5E3DF", borderRight: "1px solid #E5E3DF", borderTop: "1px solid #E5E3DF" }} />}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#9299A8" }}>{t.px}px</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacing in Components */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Spacing in Components</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 10 }}>BUTTON — Gap 8px icon, Padding 16px</div>
            <button style={{ background: "#49339A", color: "white", border: "none", height: 42, padding: "0 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins", display: "flex", alignItems: "center", gap: 8 }}>
              <span>+</span> Create Lead
            </button>
            <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8", display: "flex", gap: 12 }}>
              <span>Icon gap: 8px (token 2)</span><span>Padding: 16px (token 4)</span>
            </div>
          </div>

          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 10 }}>INPUT — Label→Input 8px, Field gap 20px</div>
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#151927", marginBottom: 8 }}>Company Name</div>
                <input defaultValue="Glow Dentistry" style={{ width: "100%", height: 42, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 12px", fontFamily: "Poppins", fontSize: 14 }} />
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 10 }}>CARD — Padding 24px standard</div>
            <div style={{ background: "#FAF9F7", border: "1px dashed #E5E3DF", borderRadius: 8, padding: 4 }}>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#151927" }}>Card Content</div>
                <div style={{ fontSize: 12, color: "#60697A", marginTop: 4 }}>24px padding (token 6)</div>
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 10 }}>TABLE ROW — Cell padding 12px 14px</div>
            <div style={{ display: "flex", gap: 0, border: "1px solid #E5E3DF", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", background: "white", fontSize: 12, borderRight: "1px solid #F0EEEA" }}>Glow Dentistry</div>
              <div style={{ padding: "12px 14px", background: "white", fontSize: 12 }}>info@...</div>
            </div>
          </div>

          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 10 }}>SIDEBAR ITEM — 42px height, 10px padding</div>
            <div style={{ background: "#252E43", borderRadius: 8, padding: 8 }}>
              <div style={{ background: "#49339A", color: "white", padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Dashboard</div>
              <div style={{ color: "#C9CED9", padding: "10px 12px", fontSize: 13, marginTop: 2 }}>Leads</div>
            </div>
          </div>

          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 10 }}>FORM GROUP — Field gap 20px</div>
            <div style={{ display: "grid", gap: 20 }}>
              <input placeholder="Field 1" style={{ height: 42, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 12px" }} />
              <input placeholder="Field 2" style={{ height: 42, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 12px" }} />
            </div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Gap: 20px (token 5)</div>
          </div>
        </div>
      </div>

      {/* Recommended defaults */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Recommended Defaults</h4>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Desktop page padding</span><span style={{ fontWeight: 500, color: "#151927" }}>32px (token 8)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Tablet</span><span style={{ fontWeight: 500, color: "#151927" }}>24px (token 6)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Mobile</span><span style={{ fontWeight: 500, color: "#151927" }}>16px (token 4)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Card padding standard</span><span style={{ fontWeight: 500, color: "#151927" }}>24px (token 6)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Card compact</span><span style={{ fontWeight: 500, color: "#151927" }}>20px (token 5)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Card spacious</span><span style={{ fontWeight: 500, color: "#151927" }}>32px (token 8)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#9299A8" }}>Section gap</span><span style={{ fontWeight: 500, color: "#151927" }}>32-40px (token 8-10)</span></div>
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Micro Spacing</h4>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Form field gap</span><span style={{ fontWeight: 500, color: "#151927" }}>20px (token 5)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Label → input</span><span style={{ fontWeight: 500, color: "#151927" }}>8px (token 2)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Inline icon gap</span><span style={{ fontWeight: 500, color: "#151927" }}>8px (token 2)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Icon + text compact</span><span style={{ fontWeight: 500, color: "#151927" }}>6px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Icon + text standard</span><span style={{ fontWeight: 500, color: "#151927" }}>8px (token 2)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#9299A8" }}>Table cell padding</span><span style={{ fontWeight: 500, color: "#151927" }}>12px 14px (token 3 + 4)</span></div>
          </div>
          <div style={{ marginTop: 12, padding: 10, background: "#FAF9F7", borderRadius: 8, fontSize: 11, color: "#60697A" }}>
            Do: Use 4px base consistently. Don't: Random 5px, 7px, 13px values.
          </div>
        </div>
      </div>
    </div>
  );
}
