"use client";

export default function ColorsPage() {
  const brand = [
    { name: "Royal Indigo", hex: "#49339A", token: "--brand / brand.500", purpose: "Primary buttons, active nav, links, selected", color: "#49339A" },
    { name: "Primary Hover", hex: "#38247F", token: "brand.600", purpose: "Hover, pressed states", color: "#38247F" },
    { name: "Primary Soft", hex: "#F0ECFA", token: "brand.50", purpose: "Soft backgrounds, focus rings", color: "#F0ECFA", textDark: true },
  ];

  const accent = [
    { name: "Warm Amber", hex: "#F4BE52", token: "accent.300", purpose: "Highlighted metrics, secondary emphasis", color: "#F4BE52", textDark: true },
    { name: "Warm Cream", hex: "#FFF6E3", token: "accent.50", purpose: "Amber tint backgrounds, warnings", color: "#FFF6E3", textDark: true },
    { name: "Aqua", hex: "#62BDD4", token: "aqua.300", purpose: "Information, charts, secondary stats", color: "#62BDD4", textDark: true },
    { name: "Ice Aqua", hex: "#EAF7FA", token: "aqua.50", purpose: "Aqua tint, info backgrounds", color: "#EAF7FA", textDark: true },
  ];

  const neutral = [
    { name: "Ink / Heading", hex: "#151927", token: "text.primary", purpose: "Headings, primary text", color: "#151927" },
    { name: "Body", hex: "#60697A", token: "text.secondary", purpose: "Body text, secondary", color: "#60697A" },
    { name: "Muted", hex: "#9299A8", token: "text.tertiary", purpose: "Muted, captions, placeholders", color: "#9299A8" },
    { name: "Border", hex: "#E5E3DF", token: "border.default", purpose: "Borders, dividers", color: "#E5E3DF", textDark: true },
    { name: "Canvas", hex: "#F7F6F3", token: "surface.canvas", purpose: "Application background", color: "#F7F6F3", textDark: true },
    { name: "Card", hex: "#FFFFFF", token: "surface.default", purpose: "Primary surface, cards", color: "#FFFFFF", textDark: true, border: true },
  ];

  const semantic = [
    { name: "Success", hex: "#4FAE91", token: "semantic.success", purpose: "Success, active, completed", color: "#4FAE91" },
    { name: "Warning", hex: "#F29B38", token: "semantic.warning", purpose: "Warning, pending, attention", color: "#F29B38", textDark: true },
    { name: "Danger", hex: "#EC6262", token: "semantic.danger", purpose: "Error, danger, failed", color: "#EC6262" },
    { name: "Info", hex: "#62BDD4", token: "semantic.info", purpose: "Information, aqua", color: "#62BDD4", textDark: true },
  ];

  const dataViz = [
    { name: "Indigo", hex: "#49339A", token: "dataViz.indigo", purpose: "Primary data series", color: "#49339A" },
    { name: "Amber", hex: "#F4BE52", token: "dataViz.amber", purpose: "Comparison, highlight", color: "#F4BE52", textDark: true },
    { name: "Aqua", hex: "#62BDD4", token: "dataViz.aqua", purpose: "Secondary series", color: "#62BDD4", textDark: true },
    { name: "Green", hex: "#4FAE91", token: "dataViz.green", purpose: "Success metric", color: "#4FAE91" },
    { name: "Coral", hex: "#EC6262", token: "dataViz.coral", purpose: "Negative / alert", color: "#EC6262" },
    { name: "Lavender", hex: "#8B76CC", token: "dataViz.lavender", purpose: "Tertiary series", color: "#8B76CC" },
  ];

  const Specimen = ({ items, section }: { items: any[]; section: string }) => (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16, letterSpacing: "-0.01em" }}>{section}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {items.map((c) => (
          <div
            key={c.hex + c.name}
            style={{
              background: "white",
              border: "1px solid #E5E3DF",
              borderRadius: 10,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 72,
                background: c.color,
                borderBottom: c.border ? "1px solid #E5E3DF" : "none",
                display: "flex",
                alignItems: "flex-end",
                padding: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: c.textDark ? "#151927" : "white",
                  background: c.textDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.2)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {c.hex}
              </span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#151927" }}>{c.name}</span>
                <span style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>{c.hex}</span>
              </div>
              <div style={{ fontSize: 11, color: "#60697A", fontFamily: "monospace", marginBottom: 4 }}>{c.token}</div>
              <div style={{ fontSize: 12, color: "#9299A8", lineHeight: 1.4 }}>{c.purpose}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "#49339A",
            background: "#F0ECFA",
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          02 / 74 · FOUNDATIONS
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#151927", marginTop: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>
          Colors
        </h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>
          Premium admin palette: warm neutral canvas, white cards, slate navigation, indigo interaction, small amber & aqua accents. Never rainbow.
        </p>
      </div>

      <Specimen items={brand} section="01 Brand — Royal Indigo" />
      <Specimen items={accent} section="02 Accent — Amber & Aqua" />
      <Specimen items={neutral} section="03 Neutral — Ink to Canvas" />
      <Specimen items={semantic} section="04 Semantic" />
      <Specimen items={dataViz} section="05 Data Visualization" />

      {/* Color in Product */}
      <div style={{ marginTop: 48, background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginBottom: 6 }}>Color in Product</h3>
        <p style={{ fontSize: 13, color: "#9299A8", marginBottom: 20 }}>
          Evaluate colors in context — miniature ClientForge interface.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 0, border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden", background: "#F7F6F3" }}>
          {/* Mini sidebar */}
          <div style={{ background: "#252E43", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#8992A6", letterSpacing: "0.08em", marginBottom: 4 }}>NAVIGATION</div>
            {[
              { label: "Dashboard", active: true },
              { label: "Leads", active: false },
              { label: "Campaigns", active: false },
            ].map((i) => (
              <div
                key={i.label}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: i.active ? "#49339A" : "transparent",
                  color: i.active ? "white" : "#C9CED9",
                  fontSize: 12,
                  fontWeight: i.active ? 500 : 400,
                }}
              >
                {i.label}
              </div>
            ))}
          </div>

          {/* Mini main */}
          <div style={{ padding: 16, background: "#F7F6F3" }}>
            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
              {[
                { k: "Total Leads", v: "1,284", accent: "#49339A" },
                { k: "New", v: "126", accent: "#F4BE52" },
                { k: "Response", v: "24.8%", accent: "#62BDD4" },
              ].map((kpi) => (
                <div key={kpi.k} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 4 }}>{kpi.k.toUpperCase()}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#151927" }}>{kpi.v}</div>
                  <div style={{ height: 3, background: "#F7F6F3", borderRadius: 2, marginTop: 8 }}>
                    <div style={{ width: "60%", height: "100%", background: kpi.accent, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons + badges + form */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <button style={{ background: "#49339A", color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: "Poppins" }}>
                Primary
              </button>
              <button style={{ background: "white", color: "#49339A", border: "1px solid #49339A", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
                Secondary
              </button>
              <button style={{ background: "#F4BE52", color: "#151927", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
                Accent
              </button>
              <span style={{ background: "#EEF8F4", color: "#4FAE91", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>Active</span>
              <span style={{ background: "#FFF6E3", color: "#F29B38", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>Pending</span>
              <span style={{ background: "#F0ECFA", color: "#49339A", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>New</span>
              <span style={{ background: "#EAF7FA", color: "#3D93AB", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>Info</span>
            </div>

            {/* Table row + chart + input */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Lead Activity</div>
                <div style={{ display: "flex", alignItems: "end", gap: 4, height: 40 }}>
                  <div style={{ flex: 1, height: "40%", background: "#E5E3DF", borderRadius: 2 }} />
                  <div style={{ flex: 1, height: "70%", background: "#8B76CC", borderRadius: 2 }} />
                  <div style={{ flex: 1, height: "50%", background: "#F4BE52", borderRadius: 2 }} />
                  <div style={{ flex: 1, height: "90%", background: "#49339A", borderRadius: 2 }} />
                  <div style={{ flex: 1, height: "65%", background: "#62BDD4", borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Form Control</div>
                <input placeholder="Glow Dentistry" style={{ width: "100%", height: 36, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 10px", fontSize: 12, fontFamily: "Poppins" }} />
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <div style={{ width: 24, height: 24, background: "#F0ECFA", border: "1px solid #49339A", borderRadius: 6 }} />
                  <div style={{ fontSize: 11, color: "#60697A" }}>Selected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: "#FFF6E3", border: "1px solid #FFEDC2", borderRadius: 10, fontSize: 12, color: "#60697A" }}>
        <strong style={{ color: "#151927" }}>Philosophy:</strong> Most screens = warm neutral canvas #F7F6F3 + white cards + dark slate nav #252E43 + indigo interaction #49339A + small amber/aqua. Never rainbow.
      </div>
    </div>
  );
}
