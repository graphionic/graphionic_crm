export default function ButtonsPage() {
  const variants = [
    { name: "Primary", bg: "#2563eb", color: "white", desc: "Main actions" },
    { name: "Secondary", bg: "#f1f5f9", color: "#334155", desc: "Secondary actions" },
    { name: "Tertiary", bg: "transparent", color: "#2563eb", desc: "Low emphasis" },
    { name: "Outline", bg: "white", color: "#2563eb", border: "#2563eb", desc: "Outlined" },
    { name: "Ghost", bg: "transparent", color: "#4b5563", desc: "Minimal" },
    { name: "Danger", bg: "#ef4444", color: "white", desc: "Destructive" },
    { name: "Success", bg: "#22c55e", color: "white", desc: "Success" },
    { name: "Warning", bg: "#f59e0b", color: "white", desc: "Warning" },
  ];

  const sizes = [
    { name: "XS", padding: "4px 8px", fontSize: 11 },
    { name: "Small", padding: "6px 12px", fontSize: 12 },
    { name: "Medium", padding: "8px 16px", fontSize: 14 },
    { name: "Large", padding: "10px 20px", fontSize: 16 },
    { name: "XL", padding: "12px 24px", fontSize: 18 },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>03 Buttons — Complete System</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>A complete dashboard needs far more than one button. Variants, sizes, types, states.</p>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Variants</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {variants.map((v) => (
            <div key={v.name} style={{ textAlign: "center" }}>
              <button style={{ background: v.bg, color: v.color, border: v.border ? `1px solid ${v.border}` : "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13 }}>{v.name}</button>
              <div style={{ fontSize: 10, marginTop: 6, color: "#666" }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Sizes XS → XL</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {sizes.map((s) => (
            <button key={s.name} style={{ background: "#2563eb", color: "white", border: "none", padding: s.padding, borderRadius: 6, fontSize: s.fontSize, fontWeight: 600 }}>{s.name}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Types</h3>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div>Text button</div>
            <div>Icon + text: <button style={{ background: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: 6 }}>＋ Add lead</button></div>
            <div>Icon-only: <button style={{ background: "#f3f4f6", border: "none", padding: 8, borderRadius: 6 }}>⚙</button></div>
            <div>Circular: <button style={{ background: "#2563eb", color: "white", border: "none", width: 36, height: 36, borderRadius: "50%" }}>＋</button></div>
            <div>Floating action: <button style={{ background: "#2563eb", color: "white", border: "none", width: 48, height: 48, borderRadius: "50%", boxShadow: "0 4px 12px rgba(37,99,235,0.4)" }}>＋</button></div>
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>States</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <button style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: 6 }}>Default</button>
            <button style={{ background: "#1d4ed8", color: "white", border: "none", padding: "8px 16px", borderRadius: 6 }}>Hover</button>
            <button style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, outline: "2px solid #93c5fd" }}>Focus</button>
            <button style={{ background: "#1e40af", color: "white", border: "none", padding: "8px 16px", borderRadius: 6 }}>Active</button>
            <button style={{ background: "#93c5fd", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}><span style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} /> Loading</button>
            <button disabled style={{ background: "#e5e7eb", color: "#9ca3af", border: "none", padding: "8px 16px", borderRadius: 6 }}>Disabled</button>
          </div>
        </div>
      </div>
    </div>
  );
}
