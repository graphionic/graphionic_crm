export default function SpacingPage() {
  const spacing = [
    { name: "0", value: "0", px: "0" },
    { name: "1", value: "0.25rem", px: "4px" },
    { name: "2", value: "0.5rem", px: "8px" },
    { name: "3", value: "0.75rem", px: "12px" },
    { name: "4", value: "1rem", px: "16px" },
    { name: "5", value: "1.25rem", px: "20px" },
    { name: "6", value: "1.5rem", px: "24px" },
    { name: "8", value: "2rem", px: "32px" },
    { name: "10", value: "2.5rem", px: "40px" },
    { name: "12", value: "3rem", px: "48px" },
    { name: "16", value: "4rem", px: "64px" },
  ];

  const radius = [
    { name: "sm", value: "6px", usage: "Badges, small elements" },
    { name: "base", value: "8px", usage: "Inputs, buttons" },
    { name: "md", value: "10px", usage: "Cards, default" },
    { name: "lg", value: "12px", usage: "Large cards" },
    { name: "xl", value: "14px", usage: "Modals, large surfaces" },
    { name: "full", value: "9999px", usage: "Pills, avatars, badges" },
  ];

  const shadows = [
    { name: "xs", value: "0 1px 2px 0 rgb(0 0 0 / 0.05)", usage: "Subtle, cards" },
    { name: "sm", value: "0 1px 3px 0 rgb(0 0 0 / 0.1)", usage: "Cards, dropdowns" },
    { name: "md", value: "0 4px 6px -1px rgb(0 0 0 / 0.1)", usage: "Elevated, sticky" },
    { name: "lg", value: "0 10px 15px -3px rgb(0 0 0 / 0.1)", usage: "Modals, popovers" },
  ];

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>04 / 74 · FOUNDATIONS</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Spacing & Layout</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>8px grid system, generous whitespace, consistent rhythm. Visualize each token rather than presenting only code.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0B1224", marginBottom: 20 }}>Spacing Scale — 8px Grid</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {spacing.map((s) => (
            <div key={s.name} style={{ display: "grid", gridTemplateColumns: "60px 80px 1fr 100px", gap: 16, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F6F8FC" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
              <span style={{ fontSize: 12, color: "#667085", fontFamily: "monospace" }}>{s.value}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: s.value, height: 16, background: "#315BE8", borderRadius: 4 }} />
                <div style={{ flex: 1, height: 1, background: "#DDE3EE" }} />
              </div>
              <span style={{ fontSize: 11, color: "#667085" }}>{s.px}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Radius Scale — 8-10px Inputs/Buttons, 10-14px Cards</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {radius.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 32, background: "#EEF3FF", border: "1px solid #315BE8", borderRadius: r.value }} />
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{r.name} — {r.value}</div><div style={{ fontSize: 11, color: "#667085" }}>{r.usage}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Shadows / Elevation — Very Subtle</h3>
          <div style={{ display: "grid", gap: 16 }}>
            {shadows.map((s) => (
              <div key={s.name} style={{ padding: 16, background: "white", borderRadius: 10, boxShadow: s.value, border: "1px solid #F6F8FC" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: "#667085", fontFamily: "monospace", marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#667085", marginTop: 4 }}>{s.usage}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 10, background: "#F6F8FC", borderRadius: 8, fontSize: 11, color: "#475467" }}>Avoid excessive shadows. Most UI uses xs/sm. lg only for modals/popovers.</div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Grid, Containers, Z-index</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, fontSize: 12 }}>
          <div><b>Breakpoints</b><div style={{ marginTop: 8, display: "grid", gap: 4 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>sm</span><span>640px</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>md</span><span>768px</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>lg</span><span>1024px</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>xl</span><span>1280px</span></div></div></div>
          <div><b>Z-index</b><div style={{ marginTop: 8, display: "grid", gap: 4 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>dropdown</span><span>1000</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>sticky</span><span>1020</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>modal</span><span>1050</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>tooltip</span><span>1070</span></div></div></div>
          <div><b>Containers</b><div style={{ marginTop: 8, display: "grid", gap: 4 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>sm</span><span>640px</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>lg</span><span>1024px</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>xl</span><span>1280px</span></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>full</span><span>100%</span></div></div></div>
        </div>
      </div>
    </div>
  );
}
