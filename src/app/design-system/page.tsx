export default function OverviewPage() {
  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>01 / 74 · FOUNDATIONS</span>
          <span style={{ fontSize: 12, color: "#667085" }}>Updated 2 hours ago • Ready</span>
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 16, lineHeight: 1.1 }}>Overview</h1>
        <p style={{ fontSize: 18, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>
          ClientForge Admin Design System is the source of truth for our outreach CRM. Professional, precise, and data-driven — built for developers and designers to ship consistent, premium SaaS experiences.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085", marginBottom: 8 }}>FOUNDATIONS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0B1224" }}>9</div>
          <div style={{ fontSize: 12, color: "#667085" }}>Tokens & principles</div>
        </div>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085", marginBottom: 8 }}>COMPONENTS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0B1224" }}>52</div>
          <div style={{ fontSize: 12, color: "#667085" }}>Reusable UI elements</div>
        </div>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085", marginBottom: 8 }}>PATTERNS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0B1224" }}>8</div>
          <div style={{ fontSize: 12, color: "#667085" }}>Composite patterns</div>
        </div>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20, borderLeft: "3px solid #315BE8" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#315BE8", marginBottom: 8 }}>READY</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0B1224" }}>10</div>
          <div style={{ fontSize: 12, color: "#667085" }}>Production ready</div>
        </div>
      </div>

      {/* Design Principles */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 28, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0B1224", marginBottom: 20 }}>Design Principles</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { title: "Professional", desc: "Every pixel has purpose. No decoration without function. Clean but not sterile.", icon: "◈" },
            { title: "Precise", desc: "8px grid, consistent spacing, predictable interactions. Data-driven decisions.", icon: "◎" },
            { title: "Efficient", desc: "Fast to scan, fast to act. Minimize cognitive load for power users.", icon: "⚡" },
            { title: "Reliable", desc: "Consistent patterns, clear states, accessible by default. Trust through predictability.", icon: "⬢" },
            { title: "Modern", desc: "Premium SaaS aesthetic. Navy → Blue → Cyan hierarchy. Subtle, not flashy.", icon: "◐" },
            { title: "Technical", desc: "Built for developers. Tokens, specs, and code alongside previews.", icon: "⬣" },
          ].map((p) => (
            <div key={p.title} style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 36, height: 36, background: "#EEF3FF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#315BE8", fontSize: 14, flexShrink: 0 }}>{p.icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#0B1224", marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "#667085", lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Color Hierarchy */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#0B1224" }}>Visual Hierarchy — Navy → Blue → Cyan → Violet</h3>
          <div style={{ display: "flex", gap: 0, height: 64, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ flex: 2, background: "#0B1224", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 600 }}>Navy #0B1224<br/>Headers, Text</div>
            <div style={{ flex: 2, background: "#315BE8", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 600 }}>Forge Blue #315BE8<br/>Interactive</div>
            <div style={{ flex: 1, background: "#22D3EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#0B1224", fontSize: 11, fontWeight: 600 }}>Cyan<br/>Highlights</div>
            <div style={{ flex: 1, background: "#7C5CFC", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 600 }}>Violet<br/>AI / Special</div>
          </div>
          <div style={{ fontSize: 12, color: "#667085", lineHeight: 1.5 }}>
            Most interface remains white/light-neutral with dark navy typography. Blue dominates interactive elements. Cyan provides small energetic highlights. Violet reserved for AI, automation and special functionality. Green, orange, red are semantic only.
          </div>
        </div>
        <div style={{ background: "#0B1224", borderRadius: 14, padding: 24, color: "white" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#7C5CFC", marginBottom: 12 }}>CLIENTFORGE</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>Professional outreach CRM for high-performance teams</div>
          <div style={{ fontSize: 12, color: "#8CA0C7", lineHeight: 1.5, marginBottom: 16 }}>Data-driven, efficient, and reliable — built for teams that value precision over decoration.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ background: "#111B33", border: "1px solid #1E2A4A", padding: "4px 10px", borderRadius: 20, fontSize: 11 }}>v1.0</span>
            <span style={{ background: "#315BE8", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Ready</span>
          </div>
        </div>
      </div>

      {/* First 10 */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#0B1224" }}>First Implementation — 10 Production-Quality Sections</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { num: "01", name: "Overview", desc: "Principles, hierarchy, structure", ready: true },
            { num: "02", name: "Colors", desc: "Brand, neutral, semantic, accessibility", ready: true },
            { num: "03", name: "Typography", desc: "Display, H1-H6, body, label, code", ready: true },
            { num: "04", name: "Spacing", desc: "Scale, radius, shadows, grid", ready: true },
            { num: "10", name: "Buttons", desc: "Variants, sizes, states, anatomy", ready: true },
            { num: "14", name: "Text Inputs", desc: "Types, states, validation, specs", ready: true },
            { num: "16", name: "Select", desc: "Basic, searchable, multi, async", ready: true },
            { num: "28", name: "Badges & Tags", desc: "Status, dot, removable, filters", ready: true },
            { num: "26", name: "Cards", desc: "Basic, KPI, lead, analytics, selectable", ready: true },
            { num: "31", name: "Tables", desc: "Leads table, sorting, filters, bulk", ready: true },
          ].map((item) => (
            <div key={item.num} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: item.ready ? "#F6F8FC" : "white", border: "1px solid #DDE3EE", borderRadius: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#315BE8", background: "white", border: "1px solid #DDE3EE", padding: "4px 8px", borderRadius: 6 }}>{item.num}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#0B1224" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#667085" }}>{item.desc}</div>
              </div>
              <span style={{ width: 8, height: 8, background: item.ready ? "#16A36A" : "#DDE3EE", borderRadius: "50%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
