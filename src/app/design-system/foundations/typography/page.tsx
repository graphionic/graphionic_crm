"use client";

export default function TypographyPage() {
  const styles = [
    { name: "Display", example: "ClientForge", size: "40px", weight: "600", lh: "1.2", ls: "0", usage: "Hero, marketing" },
    { name: "H1", example: "Dashboard", size: "32px", weight: "600", lh: "1.25", ls: "-0.02em", usage: "Page titles" },
    { name: "H2", example: "Lead Management", size: "26px", weight: "600", lh: "1.3", ls: "-0.01em", usage: "Section titles" },
    { name: "H3", example: "Recent Leads", size: "21px", weight: "600", lh: "1.35", ls: "0", usage: "Card titles" },
    { name: "H4", example: "Campaign Performance", size: "18px", weight: "600", lh: "1.35", ls: "0", usage: "Subsections" },
    { name: "H5", example: "Lead Details", size: "16px", weight: "600", lh: "1.4", ls: "0", usage: "Small headings" },
    { name: "Body Large", example: "Track outreach activity and manage conversations from one workspace.", size: "16px", weight: "400", lh: "1.6", ls: "0", usage: "Intro text" },
    { name: "Body", example: "Manage leads, track follow-ups, and close deals efficiently.", size: "14px", weight: "400", lh: "1.6", ls: "0", usage: "Default body" },
    { name: "Body Small", example: "Last updated 5 minutes ago • 12 contacts", size: "13px", weight: "400", lh: "1.5", ls: "0", usage: "Secondary info" },
    { name: "Label", example: "Company Name", size: "13px", weight: "500", lh: "1.4", ls: "0", usage: "Form labels" },
    { name: "Caption", example: "Updated 5 minutes ago", size: "12px", weight: "400", lh: "1.4", ls: "0", usage: "Timestamps, hints" },
    { name: "Button", example: "Create Lead", size: "14px", weight: "500", lh: "1", ls: "0", usage: "Buttons" },
    { name: "Navigation", example: "Dashboard", size: "14px", weight: "500", lh: "1", ls: "0", usage: "Nav items" },
    { name: "Overline", example: "LEAD STATUS", size: "11px", weight: "600", lh: "1", ls: "0.08em", usage: "Eyebrows, KPIs" },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>03 / 74 · FOUNDATIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#151927", marginTop: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>Typography</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>
          Poppins — modern, geometric, friendly, premium. 600 is max for headings, 500 for labels/buttons, 400 for body. Avoid 700/800 unless exceptional emphasis.
        </p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        {styles.map((s, i) => (
          <div key={s.name} style={{ display: "grid", gridTemplateColumns: "200px 1fr 200px", gap: 20, padding: "18px 24px", borderBottom: i === styles.length - 1 ? "none" : "1px solid #F0EEEA", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#151927" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2, fontFamily: "monospace" }}>
                {s.size} / {s.weight} / {s.lh}
              </div>
              <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2 }}>{s.usage}</div>
            </div>
            <div
              style={{
                fontSize: s.size,
                fontWeight: Number(s.weight) as any,
                lineHeight: s.lh,
                letterSpacing: s.ls,
                color: s.name === "Overline" ? "#9299A8" : "#151927",
                textTransform: s.name === "Overline" ? "uppercase" : "none",
              }}
            >
              {s.example}
            </div>
            <div style={{ fontSize: 11, color: "#60697A", lineHeight: 1.5, fontFamily: "monospace" }}>
              <div>Poppins {s.weight}</div>
              <div>{s.size} · {s.lh} · {s.ls}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Typography in Product */}
      <div style={{ marginTop: 32, background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginBottom: 6 }}>Typography in Product</h3>
        <p style={{ fontSize: 13, color: "#9299A8", marginBottom: 20 }}>How H2, H3, Body, Label, Caption, Button, Badge work together.</p>

        <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden", background: "#F7F6F3", padding: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 20, maxWidth: 520 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 8 }}>LEAD MANAGEMENT</div>
            <h2 style={{ fontSize: 21, fontWeight: 600, color: "#151927", marginBottom: 6 }}>Recent Leads</h2>
            <p style={{ fontSize: 14, fontWeight: 400, color: "#60697A", lineHeight: 1.6, marginBottom: 16 }}>Track outreach activity and manage conversations from one workspace.</p>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#151927", display: "block", marginBottom: 6 }}>Company Name</label>
                <input defaultValue="Glow Dentistry" style={{ width: "100%", height: 42, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 12px", fontSize: 14, fontFamily: "Poppins" }} />
                <div style={{ fontSize: 12, color: "#9299A8", marginTop: 6 }}>Full legal company name</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid #F0EEEA", marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#151927" }}>Glow Dentistry</div>
                  <div style={{ fontSize: 12, color: "#9299A8", marginTop: 2 }}>Updated 5 minutes ago</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: "#F0ECFA", color: "#49339A", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>New</span>
                  <button style={{ background: "#49339A", color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "Poppins" }}>Create Lead</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
