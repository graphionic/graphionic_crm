export default function TablesPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>05 Data Display — Tables, Cards, KPI</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Core data display components for admin dashboard.</p>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>KPI / Statistics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>₹8,42,500</div>
            <div style={{ fontSize: 12, color: "#22c55e" }}>↑ 14.2% vs last month</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>Leads</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>1,234</div>
            <div style={{ fontSize: 12, color: "#ef4444" }}>↓ 2.1% vs last week</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>Conversion</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>3.24%</div>
            <div style={{ fontSize: 12, color: "#666" }}>Target 4%</div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Table — Sortable, Filterable, Paginated</h3>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f9fafb", textAlign: "left" }}><th style={{ padding: 10 }}>Company</th><th style={{ padding: 10 }}>Category</th><th style={{ padding: 10 }}>Status</th><th style={{ padding: 10 }}>Actions</th></tr></thead>
            <tbody>
              <tr style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 10 }}>Glow Dentistry</td><td style={{ padding: 10 }}>dental</td><td style={{ padding: 10 }}><span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>Active</span></td><td style={{ padding: 10 }}>Edit • Delete</td></tr>
              <tr style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 10 }}>Leith Optical</td><td style={{ padding: 10 }}>eye</td><td style={{ padding: 10 }}><span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>Pending</span></td><td style={{ padding: 10 }}>Edit • Delete</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
