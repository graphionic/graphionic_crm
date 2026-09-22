export default function ColorsPage() {
  const brandColors = [
    { name: "Forge Navy", hex: "#0B1224", var: "--color-forge-navy", role: "Primary brand, headers, primary text", usage: "Headers, navigation, primary text, footers", textColor: "white" },
    { name: "Midnight", hex: "#111B33", var: "--color-forge-midnight", role: "Darker navy, sidebar, elevated surfaces", usage: "Sidebar background, modals, dark surfaces", textColor: "white" },
    { name: "Forge Blue", hex: "#315BE8", var: "--color-forge-blue", role: "Primary interactive, CTAs, links", usage: "Buttons, links, active states, primary actions", textColor: "white" },
    { name: "Electric Blue", hex: "#4C73FF", var: "--color-forge-electric", role: "Hover, active, focus states", usage: "Button hover, focus rings, interactive hover", textColor: "white" },
    { name: "Sky Blue", hex: "#38BDF8", var: "--color-forge-sky", role: "Secondary, informational", usage: "Secondary buttons, info states, accents", textColor: "#0B1224" },
    { name: "Signal Cyan", hex: "#22D3EE", var: "--color-forge-cyan", role: "Energetic highlights, small accents", usage: "Badges, highlights, progress, small energetic elements", textColor: "#0B1224" },
    { name: "Violet", hex: "#7C5CFC", var: "--color-forge-violet", role: "AI, automation, special functionality", usage: "AI features, automation, premium, special CTAs", textColor: "white" },
  ];

  const neutral = [
    { name: "Canvas", hex: "#F6F8FC", var: "--color-canvas", role: "Page background", usage: "App background, page canvas" },
    { name: "Surface", hex: "#FFFFFF", var: "--color-surface", role: "Card, surface", usage: "Cards, modals, surfaces" },
    { name: "Soft Blue", hex: "#EEF3FF", var: "--color-soft-blue", role: "Subtle background, hover", usage: "Hover states, subtle backgrounds, selected" },
    { name: "Border", hex: "#DDE3EE", var: "--color-border", role: "Borders, dividers", usage: "Borders, dividers, input borders" },
    { name: "Slate", hex: "#667085", var: "--color-slate", role: "Secondary text, icons", usage: "Secondary text, icons, muted" },
    { name: "Ink", hex: "#101828", var: "--color-ink", role: "Primary text", usage: "Primary text, headings, body" },
  ];

  const semantic = [
    { name: "Success", hex: "#16A36A", bg: "#ECFDF5", role: "Success, positive, completed", usage: "Success badges, toasts, validation" },
    { name: "Warning", hex: "#F59E0B", bg: "#FFFBEB", role: "Warning, caution, pending", usage: "Warning alerts, pending states" },
    { name: "Danger", hex: "#E5484D", bg: "#FEF2F2", role: "Error, danger, destructive", usage: "Error states, delete actions, danger" },
  ];

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>02 / 74 · FOUNDATIONS</span>
          <span style={{ fontSize: 12, color: "#667085" }}>Brand • Neutral • Semantic</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Colors</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>
          Color system establishes hierarchy: Navy → Forge Blue → Cyan → Violet. Most interface remains white/light-neutral with dark navy typography. Blue dominates interactive elements.
        </p>
      </div>

      {/* Brand Colors - Large specimens */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0B1224", marginBottom: 20 }}>Brand Colors — Large Specimens</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {brandColors.map((c) => (
            <div key={c.name} style={{ border: "1px solid #DDE3EE", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ height: 120, background: c.hex, display: "flex", alignItems: "flex-end", padding: 16, color: c.textColor }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{c.hex}</div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                  <span style={{ fontSize: 11, background: "#F6F8FC", padding: "2px 8px", borderRadius: 12 }}>{c.var}</span>
                </div>
                <div style={{ fontSize: 11, color: "#667085", marginBottom: 4 }}><b>Role:</b> {c.role}</div>
                <div style={{ fontSize: 11, color: "#667085" }}><b>Usage:</b> {c.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Neutral Scale */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0B1224", marginBottom: 20 }}>Neutral Scale — Ink to Canvas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {neutral.map((c) => (
            <div key={c.name} style={{ textAlign: "center" }}>
              <div style={{ height: 80, background: c.hex, border: "1px solid #DDE3EE", borderRadius: 10, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: "#667085" }}>{c.hex}</div>
              <div style={{ fontSize: 10, color: "#667085", marginTop: 4 }}>{c.var}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Semantic */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0B1224", marginBottom: 20 }}>Semantic Colors — Status Only</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {semantic.map((c) => (
            <div key={c.name} style={{ border: "1px solid #DDE3EE", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ height: 80, background: c.hex, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>{c.name} {c.hex}</div>
              <div style={{ background: c.bg, padding: 12, fontSize: 11, color: "#344054" }}>
                <b>Role:</b> {c.role}<br />
                <b>Usage:</b> {c.usage}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: 12, background: "#F6F8FC", borderRadius: 8, fontSize: 12, color: "#475467" }}>
          <b>Do:</b> Use semantic colors only for status, validation, alerts. <b>Don't:</b> Use green/orange/red for primary actions or decoration. Blue should dominate interactive.
        </div>
      </div>

      {/* Color in UI */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0B1224", marginBottom: 16 }}>Color in UI — Real Components</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{ background: "#315BE8", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Primary Button</button>
          <button style={{ background: "white", color: "#315BE8", border: "1px solid #315BE8", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Secondary</button>
          <input placeholder="Input with #DDE3EE border" style={{ padding: "10px 14px", border: "1px solid #DDE3EE", borderRadius: 8, fontSize: 13, width: 200 }} />
          <span style={{ background: "#EEF3FF", color: "#315BE8", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Badge Soft Blue</span>
          <span style={{ background: "#22D3EE", color: "#0B1224", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Cyan Highlight</span>
          <span style={{ background: "#7C5CFC", color: "white", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Violet AI</span>
        </div>
      </div>

      {/* Accessibility */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0B1224", marginBottom: 16 }}>Accessibility — Contrast Ratios</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: 12 }}>
          <div style={{ padding: 12, background: "#0B1224", color: "white", borderRadius: 8, display: "flex", justifyContent: "space-between" }}><span>White on Forge Navy #0B1224</span><span>✓ 16.5:1 AAA</span></div>
          <div style={{ padding: 12, background: "white", color: "#101828", border: "1px solid #DDE3EE", borderRadius: 8, display: "flex", justifyContent: "space-between" }}><span>Ink #101828 on White</span><span>✓ 17.2:1 AAA</span></div>
          <div style={{ padding: 12, background: "#315BE8", color: "white", borderRadius: 8, display: "flex", justifyContent: "space-between" }}><span>White on Forge Blue #315BE8</span><span>✓ 5.2:1 AA</span></div>
          <div style={{ padding: 12, background: "#F6F8FC", color: "#101828", border: "1px solid #DDE3EE", borderRadius: 8, display: "flex", justifyContent: "space-between" }}><span>Ink on Canvas #F6F8FC</span><span>✓ 16.1:1 AAA</span></div>
        </div>
      </div>
    </div>
  );
}
