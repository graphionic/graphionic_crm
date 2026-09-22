export default function RadiusPage() {
  const radii = [
    { name: "radius-none", value: "0", px: 0, usage: "Sharp edges, table headers", example: "Table header" },
    { name: "radius-xs", value: "4px", px: 4, usage: "Tiny elements, progress", example: "Progress bar" },
    { name: "radius-sm", value: "6px", px: 6, usage: "Tags, compact controls, small badges", example: "Tag" },
    { name: "radius-md", value: "8px", px: 8, usage: "Buttons, inputs, default controls", example: "Button / Input" },
    { name: "radius-lg", value: "10px", px: 10, usage: "Standard cards", example: "Card" },
    { name: "radius-xl", value: "12px", px: 12, usage: "Large cards, dialogs", example: "Large Card / Dialog" },
    { name: "radius-2xl", value: "16px", px: 16, usage: "Special elevated panels", example: "Elevated Panel" },
    { name: "radius-full", value: "9999px", px: 9999, usage: "Avatars, status pills only", example: "Avatar / Pill" },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>05 / 74 · FOUNDATIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Radius</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Professional CRM, not consumer app. Avoid 20-30px everywhere. Standard cards 10px, buttons/inputs 8px, pills full only for avatars/status.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Radius Scale — Visualized on Identical Specimens</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {radii.map((r) => (
            <div key={r.name} style={{ textAlign: "center" }}>
              <div style={{ width: "100%", height: 80, background: "#F0ECFA", border: "1px solid #49339A", borderRadius: r.value === "9999px" ? 9999 : r.px, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#49339A" }}>{r.px}px</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "#60697A", fontFamily: "monospace", marginTop: 2 }}>{r.value}</div>
              <div style={{ fontSize: 11, color: "#9299A8", marginTop: 4 }}>{r.usage}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Usage Guidance</h4>
          <div style={{ display: "grid", gap: 10, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#60697A" }}>4px tiny</span><span style={{ fontWeight: 500, color: "#151927" }}>Progress, tiny indicators</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#60697A" }}>6px tags</span><span style={{ fontWeight: 500, color: "#151927" }}>Tags, compact controls</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#60697A" }}>8px controls</span><span style={{ fontWeight: 500, color: "#151927" }}>Buttons, inputs (default)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#60697A" }}>10px cards</span><span style={{ fontWeight: 500, color: "#151927" }}>Standard cards</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#60697A" }}>12px large</span><span style={{ fontWeight: 500, color: "#151927" }}>Large cards, dialogs</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#60697A" }}>16px elevated</span><span style={{ fontWeight: 500, color: "#151927" }}>Special panels</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}><span style={{ color: "#60697A" }}>Full</span><span style={{ fontWeight: 500, color: "#151927" }}>Avatars, status pills ONLY</span></div>
          </div>
        </div>

        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Do / Don't</h4>
          <div style={{ display: "grid", gap: 12, fontSize: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, color: "#4FAE91", marginBottom: 4 }}>✓ Do</div>
              <div style={{ color: "#60697A" }}>Buttons 8px, cards 10px, large cards 12px, pills full only for avatars/status. Professional, restrained.</div>
            </div>
            <div style={{ background: "white", border: "1px solid #FBD5D5", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, color: "#EC6262", marginBottom: 4 }}>✗ Don't</div>
              <div style={{ color: "#60697A" }}>Make every surface 20-30px radius. Pill-shaped buttons everywhere. Consumer-app look for enterprise CRM.</div>
            </div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 60, height: 32, background: "#49339A", borderRadius: 8 }} />
              <span style={{ fontSize: 11, color: "#60697A" }}>✓ 8px professional</span>
              <div style={{ width: 60, height: 32, background: "#49339A", borderRadius: 20, marginLeft: 12 }} />
              <span style={{ fontSize: 11, color: "#EC6262" }}>✗ 20px too rounded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
