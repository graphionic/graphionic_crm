export default function ShadowsPage() {
  const shadows = [
    { name: "shadow-none", value: "none", usage: "Canvas, flat surfaces", level: "Level 0" },
    { name: "shadow-xs", value: "0 1px 2px rgba(21,25,39,0.04)", usage: "Very subtle control elevation", level: "Level 1" },
    { name: "shadow-sm", value: "0 1px 3px rgba(21,25,39,0.08), 0 1px 2px rgba(21,25,39,0.04)", usage: "Dropdown, small floating", level: "Level 3" },
    { name: "shadow-md", value: "0 4px 8px rgba(21,25,39,0.08), 0 2px 4px rgba(21,25,39,0.04)", usage: "Popover, floating menu", level: "Level 3" },
    { name: "shadow-lg", value: "0 8px 24px rgba(21,25,39,0.10), 0 4px 8px rgba(21,25,39,0.06)", usage: "Modal, important overlay", level: "Level 5" },
    { name: "shadow-xl", value: "0 16px 40px rgba(21,25,39,0.14), 0 8px 16px rgba(21,25,39,0.08)", usage: "Rare high elevation", level: "Level 5+" },
  ];

  const elevation = [
    { level: "Level 0", name: "Canvas", bg: "#F7F6F3", border: "none", shadow: "none", usage: "Application background" },
    { level: "Level 1", name: "Card", bg: "#FFFFFF", border: "1px solid #E5E3DF", shadow: "none", usage: "Default card — border before shadow" },
    { level: "Level 2", name: "Sticky", bg: "#FFFFFF", border: "1px solid #E5E3DF", shadow: "0 1px 2px rgba(21,25,39,0.04)", usage: "Sticky header, topbar" },
    { level: "Level 3", name: "Dropdown", bg: "#FFFFFF", border: "1px solid #E5E3DF", shadow: "0 4px 8px rgba(21,25,39,0.08)", usage: "Dropdown, popover, select" },
    { level: "Level 4", name: "Drawer", bg: "#FFFFFF", border: "1px solid #E5E3DF", shadow: "0 8px 24px rgba(21,25,39,0.10)", usage: "Drawer, side panel" },
    { level: "Level 5", name: "Modal", bg: "#FFFFFF", border: "1px solid #E5E3DF", shadow: "0 16px 40px rgba(21,25,39,0.14)", usage: "Modal, dialog, important overlay" },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>06 / 74 · FOUNDATIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Shadows</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Borders before shadows. Normal cards use background #FFFFFF + border #E5E3DF, not visible shadows. Shadows only for floating layers.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Shadow Tokens — Displayed on Warm Canvas #F7F6F3</h3>
        <div style={{ background: "#F7F6F3", borderRadius: 10, padding: 24, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {shadows.map((s) => (
            <div key={s.name} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16, boxShadow: s.value === "none" ? "none" : s.value }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>{s.name}</div>
              <div style={{ fontSize: 10, color: "#9299A8", fontFamily: "monospace", marginTop: 4, wordBreak: "break-all" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#60697A", marginTop: 8 }}>{s.usage}</div>
              <div style={{ fontSize: 10, color: "#9299A8", marginTop: 4, fontWeight: 500 }}>{s.level}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Elevation Hierarchy</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {elevation.map((e, i) => (
            <div key={e.level} style={{ display: "grid", gridTemplateColumns: "100px 120px 1fr 200px", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: i === elevation.length - 1 ? "none" : "1px solid #FAF9F7" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>{e.level}</span>
              <div style={{ background: e.bg, border: e.border, boxShadow: e.shadow as any, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 500, color: "#151927", textAlign: "center" }}>{e.name}</div>
              <span style={{ fontSize: 12, color: "#60697A" }}>{e.usage}</span>
              <span style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>{e.shadow}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 10 }}>Do / Don't</h4>
          <div style={{ display: "grid", gap: 10, fontSize: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, color: "#4FAE91" }}>✓ Do</div>
              <div style={{ color: "#60697A", marginTop: 4 }}>Cards: #FFFFFF + #E5E3DF border. No shadow. Only dropdown/popover/modal get shadows. Borders before shadows.</div>
            </div>
            <div style={{ background: "white", border: "1px solid #FBD5D5", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, color: "#EC6262" }}>✗ Don't</div>
              <div style={{ color: "#60697A", marginTop: 4 }}>Add visible shadow to every card. Floating every surface. Heavy shadows that make UI feel cluttered.</div>
            </div>
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 10 }}>Visual Comparison</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#9299A8", marginBottom: 6, fontWeight: 500 }}>✓ Correct — Border only</div>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16, height: 60 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#EC6262", marginBottom: 6, fontWeight: 500 }}>✗ Avoid — Heavy shadow</div>
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16, height: 60, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
