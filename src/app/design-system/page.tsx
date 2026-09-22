export default function OverviewPage() {
  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>01 / 74 · FOUNDATIONS</span>
          <span style={{ fontSize: 12, color: "#9299A8" }}>v2.0 • Premium Admin</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginBottom: 12, lineHeight: 1.2 }}>Overview</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>
          ClientForge Admin Design System — premium commercial admin dashboard. Warm neutral canvas, white cards, slate navigation, indigo interaction, amber & aqua accents. Poppins geometric friendly.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "FOUNDATIONS", value: "9", sub: "Tokens & principles", accent: false },
          { label: "COMPONENTS", value: "52", sub: "Reusable UI", accent: false },
          { label: "PATTERNS", value: "8", sub: "Composite", accent: false },
          { label: "READY", value: "11", sub: "Production ready", accent: true },
        ].map((s) => (
          <div key={s.label} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16, borderLeft: s.accent ? "3px solid #49339A" : "1px solid #E5E3DF" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: s.accent ? "#49339A" : "#9299A8", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#151927" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Design Principles</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { title: "Premium", desc: "Commercial admin quality, not developer docs. Polished, pleasant, professional." },
            { title: "Restrained", desc: "Indigo controls primary, amber & aqua small accents. Never rainbow." },
            { title: "Comfortable", desc: "Generous whitespace, compact typography, subtle borders, no heavy shadows." },
            { title: "Friendly", desc: "Poppins geometric, rounded 8-12px, not excessively rounded, approachable." },
            { title: "Data-driven", desc: "Colorful charts used intentionally, clear hierarchy, scannable." },
            { title: "Consistent", desc: "Warm neutral canvas #F7F6F3 + white cards + slate nav #252E43." },
          ].map((p) => (
            <div key={p.title}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#151927", marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "#151927" }}>Color Philosophy — Canvas + Cards + Slate + Indigo + Amber/Aqua</h3>
          <div style={{ display: "flex", gap: 0, height: 56, borderRadius: 8, overflow: "hidden", marginBottom: 12, border: "1px solid #E5E3DF" }}>
            <div style={{ flex: 2, background: "#F7F6F3", display: "flex", alignItems: "center", justifyContent: "center", color: "#151927", fontSize: 10, fontWeight: 500 }}>Canvas #F7F6F3</div>
            <div style={{ flex: 2, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#151927", fontSize: 10, fontWeight: 500, borderLeft: "1px solid #E5E3DF", borderRight: "1px solid #E5E3DF" }}>Card #FFFFFF</div>
            <div style={{ flex: 2, background: "#252E43", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 500 }}>Slate #252E43</div>
            <div style={{ flex: 1.5, background: "#49339A", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 500 }}>Indigo</div>
            <div style={{ flex: 1, background: "#F4BE52", display: "flex", alignItems: "center", justifyContent: "center", color: "#151927", fontSize: 10, fontWeight: 500 }}>Amber</div>
            <div style={{ flex: 1, background: "#62BDD4", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 500 }}>Aqua</div>
          </div>
          <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.5 }}>Most screens consist of warm neutral canvas + white cards + dark slate navigation + indigo interaction + small amounts of amber/aqua. Interface should never look rainbow-colored.</div>
        </div>
        <div style={{ background: "#252E43", borderRadius: 12, padding: 20, color: "white" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#8B76CC", marginBottom: 10 }}>CLIENTFORGE</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>Premium outreach CRM for high-performance teams</div>
          <div style={{ fontSize: 12, color: "#C9CED9", lineHeight: 1.5, marginBottom: 14 }}>Warm, professional, visually pleasant — commercial admin template quality.</div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ background: "#303A52", padding: "4px 10px", borderRadius: 6, fontSize: 11, color: "#C9CED9" }}>v2.0</span>
            <span style={{ background: "#49339A", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500 }}>Premium</span>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "#151927" }}>Foundation Locked — Ready for Review</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {[
            { num: "01", name: "Overview", desc: "Principles, hierarchy, philosophy", ready: true },
            { num: "02", name: "Colors", desc: "Brand, accent, neutral, semantic, data viz + in-product", ready: true },
            { num: "03", name: "Typography", desc: "Poppins scale, specs, in-product", ready: true },
            { num: "04", name: "Spacing", desc: "Scale, radius, shadows", ready: true },
            { num: "10", name: "Buttons", desc: "Indigo primary, amber accent, 8px radius", ready: true },
            { num: "14", name: "Inputs", desc: "42px MD, 8px radius, indigo focus", ready: true },
            { num: "26", name: "Cards", desc: "White, E5E3DF border, 10-12px, subtle shadow", ready: true },
            { num: "61", name: "Dashboard Preview", desc: "Real dashboard, warm canvas, slate nav", ready: true },
          ].map((item) => (
            <div key={item.num} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#49339A", background: "white", border: "1px solid #E5E3DF", padding: "3px 7px", borderRadius: 6 }}>{item.num}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: "#151927" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#9299A8" }}>{item.desc}</div>
              </div>
              <span style={{ width: 6, height: 6, background: "#4FAE91", borderRadius: "50%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
