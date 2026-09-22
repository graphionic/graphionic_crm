export default function GridPage() {
  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>07 / 74 · FOUNDATIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Grid & Breakpoints</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Responsive layout: 12 columns desktop, 8 tablet, 4 mobile. Warm neutral canvas, white cards, slate navigation.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Breakpoints</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { name: "XS", value: "< 480px", usage: "Small mobile", cols: "4 cols" },
            { name: "SM", value: "480px", usage: "Mobile", cols: "4 cols" },
            { name: "MD", value: "768px", usage: "Tablet", cols: "8 cols" },
            { name: "LG", value: "1024px", usage: "Laptop", cols: "12 cols" },
            { name: "XL", value: "1280px", usage: "Desktop", cols: "12 cols" },
            { name: "2XL", value: "1440px+", usage: "Wide desktop", cols: "12 cols" },
          ].map((b) => (
            <div key={b.name} style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, background: "#FAF9F7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#151927" }}>{b.name}</span>
                <span style={{ fontSize: 11, color: "#60697A", fontFamily: "monospace" }}>{b.value}</span>
              </div>
              <div style={{ fontSize: 11, color: "#9299A8", marginTop: 4 }}>{b.usage} • {b.cols}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>12 Column Grid — Visualized</h3>
        <div style={{ background: "#F7F6F3", borderRadius: 8, padding: 16, border: "1px solid #E5E3DF" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ height: 40, background: "#E2D8F5", border: "1px solid #C5B1EB", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#49339A" }}>{i + 1}</div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Desktop: 12 columns • Gutter: 24px (token 6) • Page padding: 32px (token 8) • Card gap: 16px (token 4)</div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>TABLET — 8 columns</div>
            <div style={{ background: "#F7F6F3", borderRadius: 8, padding: 12, border: "1px solid #E5E3DF" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ height: 32, background: "#FFEDC2", border: "1px solid #F4BE52", borderRadius: 4 }} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>MOBILE — 4 columns</div>
            <div style={{ background: "#F7F6F3", borderRadius: 8, padding: 12, border: "1px solid #E5E3DF" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 32, background: "#D4EFF5", border: "1px solid #62BDD4", borderRadius: 4 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Example: 4 KPI Cards</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>DESKTOP — 4 columns</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12, height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>KPI {i}</div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>TABLET — 2×2</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 400 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12, height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>KPI {i}</div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>MOBILE — 1 column</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, maxWidth: 300 }}>
              {[1, 2].map((i) => (
                <div key={i} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 12, height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>KPI {i}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Sidebar Behavior</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 12 }}>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, background: "#FAF9F7" }}>
            <div style={{ fontWeight: 600, color: "#151927", marginBottom: 4 }}>Desktop</div>
            <div style={{ color: "#60697A" }}>Persistent sidebar 260px, content marginLeft 260px, page padding 32px</div>
          </div>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, background: "#FAF9F7" }}>
            <div style={{ fontWeight: 600, color: "#151927", marginBottom: 4 }}>Tablet</div>
            <div style={{ color: "#60697A" }}>Collapsible sidebar, overlay on open, content full width</div>
          </div>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, background: "#FAF9F7" }}>
            <div style={{ fontWeight: 600, color: "#151927", marginBottom: 4 }}>Mobile</div>
            <div style={{ color: "#60697A" }}>Drawer navigation, hamburger menu, page padding 16px</div>
          </div>
        </div>
      </div>
    </div>
  );
}
