export default function AssetsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>08 Assets & Theme — Customizable Admin</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Theme assets stored in <code>src/assets/</code> — always structured and organized. Customizable light/dark.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>📁 Current Structure</h3>
          <pre style={{ background: "#f9fafb", padding: 12, borderRadius: 8, fontSize: 11, overflow: "auto" }}>
{`src/assets/
├── tokens/
│   ├── colors.ts (primary, secondary, semantic)
│   ├── typography.ts (H1-H6, body, caption)
│   └── spacing.ts (spacing, radius, shadows)
├── themes/
│   ├── light.ts (light theme)
│   ├── dark.ts (dark theme)
│   └── index.ts (provider, CSS vars)
├── icons/
│   └── iconList.ts (80+ icons)
└── components/ (future)`}
          </pre>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>🎨 Theme Customization</h3>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div style={{ marginBottom: 8 }}><b>1. Edit tokens:</b> Change <code>colors.ts</code> primary color</div>
            <div style={{ marginBottom: 8 }}><b>2. Themes auto-update:</b> light/dark use tokens</div>
            <div style={{ marginBottom: 8 }}><b>3. CSS vars:</b> <code>generateCSSVariables(theme)</code> creates vars</div>
            <div style={{ marginBottom: 8 }}><b>4. Components:</b> Use tokens, not hardcoded colors</div>
            <div style={{ padding: 8, background: "#f0fdf4", borderRadius: 6, marginTop: 12 }}>
              <b>Example:</b> Change <code>primary[500]</code> from #2563eb to #7c3aed → entire admin updates
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🌓 Light / Dark Themes</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Light Theme (default)</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              <div style={{ width: 20, height: 20, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 4 }} />
              <div style={{ width: 20, height: 20, background: "#f9fafb", borderRadius: 4 }} />
              <div style={{ width: 20, height: 20, background: "#2563eb", borderRadius: 4 }} />
              <div style={{ width: 20, height: 20, background: "#111827", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>bg: #ffffff, subtle: #f9fafb, primary: #2563eb, text: #111827</div>
          </div>
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "white" }}>Dark Theme</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              <div style={{ width: 20, height: 20, background: "#0f172a", border: "1px solid #334155", borderRadius: 4 }} />
              <div style={{ width: 20, height: 20, background: "#1e293b", borderRadius: 4 }} />
              <div style={{ width: 20, height: 20, background: "#3b82f6", borderRadius: 4 }} />
              <div style={{ width: 20, height: 20, background: "#f1f5f9", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>bg: #0f172a, subtle: #1e293b, primary: #3b82f6, text: #f1f5f9</div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>📦 How to Add New Asset</h3>
        <pre style={{ background: "#f9fafb", padding: 12, borderRadius: 8, fontSize: 11 }}>
{`// 1. Create token file: src/assets/tokens/myToken.ts
export const myToken = { ... }

// 2. Export in themes/index.ts
import { myToken } from "./myToken"
export const tokens = { colors, typography, myToken }

// 3. Use in components:
import { tokens } from "@/assets/themes"
<div style={{ color: tokens.colors.primary[500] }}>

// 4. For theme-aware:
import { lightTheme } from "@/assets/themes"
<div style={{ background: lightTheme.colors.bg.default }}>

// All assets in src/assets/ — structured, organized, never in random folders`}
        </pre>
      </div>
    </div>
  );
}
