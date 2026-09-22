import { colors } from "@/assets/tokens/colors";
import { typography } from "@/assets/tokens/typography";
import { spacing, radius, shadows, zIndex, breakpoints, animation, iconSizes } from "@/assets/tokens/spacing";

export default function FoundationsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>01 Foundations / Design Tokens</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Before individual components, the dashboard needs its foundation. Stored in <code>src/assets/tokens/</code></p>

      {/* Colors */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Color Palette</h3>
        {Object.entries(colors).slice(0, 6).map(([name, shades]) => (
          <div key={name} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, textTransform: "capitalize" }}>{name}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {typeof shades === "object" && Object.entries(shades as any).map(([shade, hex]) => (
                <div key={shade} style={{ textAlign: "center" }}>
                  <div style={{ width: 60, height: 40, background: hex as string, borderRadius: 6, border: "1px solid #eee" }} />
                  <div style={{ fontSize: 10, marginTop: 4 }}>{shade}</div>
                  <div style={{ fontSize: 9, color: "#666" }}>{hex as string}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Typography */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Typography Scale</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div><span style={{ fontSize: 10, color: "#999" }}>H1</span><div style={typography.heading.h1 as any}>Heading H1 — 2.25rem / 800</div></div>
          <div><span style={{ fontSize: 10, color: "#999" }}>H2</span><div style={typography.heading.h2 as any}>Heading H2 — 1.875rem / 700</div></div>
          <div><span style={{ fontSize: 10, color: "#999" }}>H3</span><div style={typography.heading.h3 as any}>Heading H3 — 1.5rem / 600</div></div>
          <div><span style={{ fontSize: 10, color: "#999" }}>Body</span><div style={typography.body.base as any}>Body base — 1rem / 400 / 1.5 line height</div></div>
          <div><span style={{ fontSize: 10, color: "#999" }}>Caption</span><div style={typography.caption as any}>Caption — 0.75rem / muted</div></div>
        </div>
        <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 12 }}>
          <b>Font family:</b> {typography.fontFamily.sans}<br />
          <b>Weights:</b> {Object.entries(typography.fontWeight).map(([k, v]) => `${k}(${v})`).join(", ")}
        </div>
      </div>

      {/* Spacing */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Spacing Scale</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          {Object.entries(spacing).slice(0, 10).map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ width: v as string, height: v as string, background: "#2563eb", borderRadius: 4, margin: "0 auto" }} />
              <div style={{ fontSize: 10, marginTop: 4 }}>{k}</div>
              <div style={{ fontSize: 9, color: "#666" }}>{v as string}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radius, Shadows, etc */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Border Radius</h3>
          {Object.entries(radius).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
              <span>{k}</span><span style={{ color: "#666" }}>{v as string}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Shadows / Elevation</h3>
          {Object.entries(shadows).slice(0, 6).map(([k, v]) => (
            <div key={k} style={{ padding: 12, marginBottom: 8, background: "white", borderRadius: 8, boxShadow: v as string, fontSize: 12 }}>
              {k}: {v as string}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Breakpoints, Z-index, Animation</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 12 }}>
          <div>
            <b>Breakpoints</b>
            {Object.entries(breakpoints).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{k}</span><span>{v as string}</span></div>)}
          </div>
          <div>
            <b>Z-index</b>
            {Object.entries(zIndex).slice(0, 6).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{k}</span><span>{String(v)}</span></div>)}
          </div>
          <div>
            <b>Icon Sizes</b>
            {Object.entries(iconSizes).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{k}</span><span>{v as string}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
