export default function CardsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Navigation & Cards</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Navbar, Sidebar, Breadcrumbs, Cards, Tabs, etc.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Basic Card</div>
          <div style={{ fontSize: 12, color: "#666" }}>Simple card with header, body, footer. Reusable for KPI, user, product.</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, borderLeft: "4px solid #22c55e" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>KPI Card</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>₹8,42,500</div>
          <div style={{ fontSize: 11, color: "#22c55e" }}>↑ 14.2%</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700 }}>User Card</div>
            <div style={{ width: 32, height: 32, background: "#e5e7eb", borderRadius: "50%" }} />
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>John Doe • Admin</div>
        </div>
      </div>

      <div style={{ marginTop: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Sidebar Structure</h3>
        <pre style={{ background: "#f9fafb", padding: 12, borderRadius: 8, fontSize: 11 }}>
{`Sidebar
├── Brand/logo
├── Navigation section
│   ├── Menu item (icon + label + badge)
│   ├── Active / Hover / Disabled
│   └── Submenu → Child → Grandchild
├── Workspace selector
├── User section
└── Collapse button

Current:
Workspace: Dashboard, Live Collection, Leads, Follow-ups, Outbox
Add leads: Import CSV, New lead
Setup: Settings, Email & DNS, WhatsApp API, Compliance
Brand: Brand Guidelines (new)`}
        </pre>
      </div>
    </div>
  );
}
