import { iconCategories, iconMap, iconSizes } from "@/assets/icons/iconList";

export default function IconsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>02 Icons — Component System</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Icons themselves should be treated as a component system. 80+ icons categorized. Stored in <code>src/assets/icons/</code></p>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Icon Sizes</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {Object.entries(iconSizes).map(([name, size]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div style={{ width: 40, height: 40, background: "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size as number }}>◉</div>
              <div style={{ fontSize: 10, marginTop: 4 }}>{name}</div>
              <div style={{ fontSize: 9, color: "#666" }}>{size}px</div>
            </div>
          ))}
        </div>
      </div>

      {Object.entries(iconCategories).map(([cat, icons]) => (
        <div key={cat} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, textTransform: "capitalize" }}>{cat} — {icons.length} icons</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 12 }}>
            {icons.map((name) => (
              <div key={name} style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{(iconMap as any)[name] || "◍"}</div>
                <div style={{ fontSize: 10, fontWeight: 600, wordBreak: "break-all" }}>{name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Icon Variants</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["default", "muted", "primary", "success", "warning", "danger", "disabled"].map((v) => (
            <span key={v} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, background: v === "primary" ? "#2563eb" : v === "success" ? "#22c55e" : v === "danger" ? "#ef4444" : v === "warning" ? "#f59e0b" : "#f3f4f6", color: ["primary", "success", "danger", "warning"].includes(v) ? "white" : "#111" }}>{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
