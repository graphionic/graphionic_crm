import Link from "next/link";

const sections = [
  { title: "01 Foundations", desc: "Colors, Typography, Spacing, Radius, Shadows, Z-index, Breakpoints, Animation, Icons", href: "/brand-guidelines/foundations", icon: "🎨", count: "10 tokens" },
  { title: "02 Icons", desc: "Navigation, Actions, Communication, Files, UI, Business icons with sizes & variants", href: "/brand-guidelines/icons", icon: "⭐", count: "80+ icons" },
  { title: "03 Buttons", desc: "Primary, Secondary, Outline, Ghost, Danger, Sizes XS-XL, States, Icon variants", href: "/brand-guidelines/buttons", icon: "🔘", count: "12 variants" },
  { title: "04 Inputs", desc: "Text, Email, Password, Search, Phone, OTP, Prefix/Suffix, States & validation", href: "/brand-guidelines/inputs", icon: "📝", count: "25 types" },
  { title: "05 Data Display", desc: "Tables, Cards, KPI, Lists, Badges, Avatars, Charts, Progress", href: "/brand-guidelines/tables", icon: "📊", count: "15 components" },
  { title: "06 Navigation", desc: "Navbar, Sidebar, Breadcrumbs, Tabs, Pagination, Menus", href: "/brand-guidelines/cards", icon: "🧭", count: "8 patterns" },
  { title: "07 Feedback", desc: "Alerts, Toasts, Modals, Drawers, Tooltips, Skeletons, Empty & Error states", href: "/brand-guidelines/assets", icon: "💬", count: "10 patterns" },
  { title: "08 Assets & Theme", desc: "Customizable admin theme, light/dark, tokens stored in src/assets/", href: "/brand-guidelines/assets", icon: "📦", count: "Theme system" },
];

export default function BrandGuidelinesPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🎨 Brand Guidelines — Design System</h1>
        <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>
          Master inventory for Figma, React/Next.js, Flutter Web, Bootstrap, Tailwind. Organized as 10 layers from Foundations → Pages.
          Theme assets stored in <code>src/assets/</code> — always structured and organized.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, height: "100%", transition: "all 0.2s", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <span style={{ fontSize: 11, background: "#f3f4f6", padding: "4px 8px", borderRadius: 12 }}>{s.count}</span>
              </div>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#111" }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>📁 Assets Structure — Theme Customizable</h3>
        <pre style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 12, overflow: "auto" }}>
{`src/assets/
├── tokens/
│   ├── colors.ts       → Primary, Secondary, Semantic, Neutral, Background
│   ├── typography.ts   → Font family, weights, sizes H1-H6, body, caption
│   ├── spacing.ts      → Spacing scale, radius, shadows, z-index, breakpoints
│   └── animation.ts    → Duration, easing
├── themes/
│   ├── light.ts        → Light theme (default)
│   ├── dark.ts         → Dark theme
│   └── index.ts        → Theme provider, CSS vars generator
├── icons/
│   ├── iconList.ts     → 80+ icons categorized + sizes + variants
│   └── index.ts
└── components/         → Future customizable admin components

ADMIN DESIGN SYSTEM
├── 01 Foundations (Colors, Typography, Spacing...)
├── 02 Primitives (Button, Icon, Badge, Avatar...)
├── 03 Form Controls (Input, Select, Checkbox...)
├── 04 Navigation (Navbar, Sidebar, Tabs...)
├── 05 Data Display (Table, Card, KPI, Chart...)
├── 06 Feedback (Alert, Toast, Modal...)
├── 07 Overlays (Drawer, Popover...)
├── 08 Patterns (Search, Filters, CRUD...)
├── 09 Application (Dashboard, Users, Settings...)
└── 10 Pages (Login, List, Create, Edit...)`}
        </pre>
      </div>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🎯 Hierarchy Recommendation</div>
          <div style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.6 }}>
            Don't build 200 random components. Organize as 10 layers from atomic tokens to page templates. Each layer depends on previous.
          </div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🌓 Theme System</div>
          <div style={{ fontSize: 12, color: "#15803d", lineHeight: 1.6 }}>
            Supports Light, Dark, System, High contrast. Every core component is theme-aware via CSS variables from <code>src/assets/themes/</code>
          </div>
        </div>
      </div>
    </div>
  );
}
