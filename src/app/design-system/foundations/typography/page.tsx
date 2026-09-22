export default function TypographyPage() {
  const styles = [
    { name: "Display", size: "48px", weight: 800, lh: "1.1", ls: "-0.03em", example: "ClientForge CRM", usage: "Hero, marketing" },
    { name: "H1", size: "36px", weight: 800, lh: "1.25", ls: "-0.025em", example: "Dashboard Overview", usage: "Page titles" },
    { name: "H2", size: "30px", weight: 700, lh: "1.25", ls: "-0.025em", example: "Leads Management", usage: "Section titles" },
    { name: "H3", size: "24px", weight: 600, lh: "1.375", ls: "0", example: "Recent Leads", usage: "Card titles" },
    { name: "H4", size: "20px", weight: 600, lh: "1.375", ls: "0", example: "Lead Details", usage: "Subsections" },
    { name: "Body Large", size: "18px", weight: 400, lh: "1.625", ls: "0", example: "Found 24 dental clinics in London without websites", usage: "Lead descriptions" },
    { name: "Body", size: "16px", weight: 400, lh: "1.5", ls: "0", example: "We help dental clinics get more bookings with a simple site.", usage: "Default body" },
    { name: "Body Small", size: "14px", weight: 400, lh: "1.5", ls: "0", example: "Last contact 2 days ago • Assigned to Sarah", usage: "Secondary, metadata" },
    { name: "Label", size: "14px", weight: 500, lh: "1.25", ls: "0", example: "Company Name *", usage: "Form labels" },
    { name: "Caption", size: "12px", weight: 400, lh: "1.5", ls: "0", example: "TRUE NO_SITE verified • No website found", usage: "Helper, captions" },
    { name: "Overline", size: "11px", weight: 700, lh: "1.25", ls: "0.08em", example: "CRM TOTAL", usage: "KPI labels, overline" },
    { name: "Code", size: "13px", weight: 400, lh: "1.5", ls: "0", example: "src/assets/tokens/colors.ts", usage: "Code, monospace", mono: true },
  ];

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>03 / 74 · FOUNDATIONS</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Typography</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>Clean modern SaaS typography. Strong hierarchy, generous whitespace. Uses actual ClientForge CRM text, not lorem ipsum.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #DDE3EE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Type Scale — Inter</span>
          <span style={{ fontSize: 11, color: "#667085" }}>Font family: Inter, -apple-system, sans-serif • Mono: JetBrains Mono</span>
        </div>
        {styles.map((s) => (
          <div key={s.name} style={{ display: "grid", gridTemplateColumns: "180px 1fr 200px", gap: 24, padding: "20px 24px", borderBottom: "1px solid #F6F8FC", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0B1224" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#667085", marginTop: 4 }}>
                {s.size} • {s.weight} • {s.lh}<br />{s.ls} • {s.mono ? "Mono" : "Sans"}
              </div>
              <div style={{ fontSize: 10, color: "#98A2B3", marginTop: 4 }}>{s.usage}</div>
            </div>
            <div style={{ fontSize: s.size, fontWeight: s.weight, lineHeight: s.lh as any, letterSpacing: s.ls, fontFamily: s.mono ? "JetBrains Mono, monospace" : "Inter, sans-serif", color: "#0B1224" }}>
              {s.example}
            </div>
            <div style={{ fontSize: 11, color: "#667085", background: "#F6F8FC", padding: 8, borderRadius: 6, fontFamily: "monospace" }}>
              font-size: {s.size}<br />font-weight: {s.weight}<br />line-height: {s.lh}<br />letter-spacing: {s.ls}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Real CRM Examples</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085" }}>LEAD CARD</div><div style={{ fontSize: 16, fontWeight: 600, color: "#0B1224", marginTop: 4 }}>Glow Dentistry</div><div style={{ fontSize: 13, color: "#475467" }}>Dental clinic in London • No website</div><div style={{ fontSize: 12, color: "#667085" }}>info@glowdentistry.co.uk • 2 days ago</div></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085" }}>KPI</div><div style={{ fontSize: 24, fontWeight: 800, color: "#0B1224" }}>71 / 200</div><div style={{ fontSize: 12, color: "#667085" }}>36% — 71 with email • TRUE NO_SITE verified</div></div>
          </div>
        </div>
        <div style={{ background: "#0B1224", borderRadius: 14, padding: 20, color: "white" }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "white" }}>Usage Guidelines</h3>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#8CA0C7" }}>
            <div style={{ marginBottom: 8 }}><b style={{ color: "white" }}>Do:</b> Use Inter for UI, JetBrains Mono for code. Keep hierarchy Navy → Blue. Generous whitespace.</div>
            <div style={{ marginBottom: 8 }}><b style={{ color: "white" }}>Don't:</b> Use more than 2 font families. Don't use all caps for body. Don't use light weights for small text.</div>
            <div style={{ marginTop: 12, padding: 10, background: "#111B33", borderRadius: 8 }}><b style={{ color: "#4C73FF" }}>Tokens:</b> All sizes in <code>src/assets/tokens/typography.ts</code> — changing token updates every preview.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
