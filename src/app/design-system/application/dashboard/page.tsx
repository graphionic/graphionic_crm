"use client";

export default function DashboardPreview() {
  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", maxWidth: 1200 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>61 / 74 · APPLICATION</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#151927", marginTop: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>Dashboard Preview</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>
          Real ClientForge dashboard using new design system — evaluate entire visual system in real application context. Warm neutral canvas, white cards, slate nav, indigo primary, amber & aqua accents.
        </p>
      </div>

      {/* Realistic Dashboard */}
      <div style={{ border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden", background: "#F7F6F3" }}>
        {/* Mini dashboard chrome */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 720 }}>
          {/* Sidebar */}
          <div style={{ background: "#252E43", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "8px 0 12px", borderBottom: "1px solid #303A52" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#8B76CC" }}>CLIENTFORGE</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "white", marginTop: 2 }}>Outreach CRM</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#8992A6", marginBottom: 8 }}>WORKSPACE</div>
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ background: "#49339A", color: "white", padding: "9px 10px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>▦ Dashboard</div>
                <div style={{ color: "#C9CED9", padding: "9px 10px", borderRadius: 8, fontSize: 13 }}>◉ Leads</div>
                <div style={{ color: "#C9CED9", padding: "9px 10px", borderRadius: 8, fontSize: 13 }}>◷ Follow-ups</div>
                <div style={{ color: "#C9CED9", padding: "9px 10px", borderRadius: 8, fontSize: 13 }}>✉ Outbox</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#8992A6", marginBottom: 8 }}>SETUP</div>
              <div style={{ color: "#C9CED9", padding: "9px 10px", fontSize: 13 }}>⚙ Settings</div>
            </div>
          </div>

          {/* Main */}
          <div style={{ background: "#F7F6F3", padding: 20 }}>
            {/* Header */}
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 21, fontWeight: 600, color: "#151927" }}>Dashboard</h2>
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#151927" }}>Welcome back</div>
                <div style={{ fontSize: 13, color: "#60697A" }}>Here's what's happening with your outreach.</div>
              </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "TOTAL LEADS", value: "1,284", sub: "+12% from last month", color: "#49339A" },
                { label: "NEW LEADS", value: "126", sub: "38 qualified", color: "#F4BE52", highlight: true },
                { label: "FOLLOW-UPS DUE", value: "38", sub: "12 overdue", color: "#EC6262", warn: true },
                { label: "RESPONSE RATE", value: "24.8%", sub: "+2.1% vs avg", color: "#62BDD4" },
              ].map((k) => (
                <div key={k.label} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8" }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#151927", marginTop: 6 }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: k.warn ? "#EC6262" : k.highlight ? "#C27A28" : "#60697A", marginTop: 4 }}>{k.sub}</div>
                  <div style={{ height: 3, background: "#F7F6F3", borderRadius: 2, marginTop: 10 }}>
                    <div style={{ width: "68%", height: "100%", background: k.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
              {/* Lead Activity chart */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#151927" }}>Lead Activity</div>
                  <div style={{ fontSize: 11, color: "#9299A8" }}>Last 7 days</div>
                </div>
                <div style={{ display: "flex", alignItems: "end", gap: 6, height: 80, padding: "0 4px" }}>
                  {[
                    { h: 40, c: "#E5E3DF" },
                    { h: 65, c: "#8B76CC" },
                    { h: 50, c: "#F4BE52" },
                    { h: 85, c: "#49339A" },
                    { h: 70, c: "#62BDD4" },
                    { h: 55, c: "#4FAE91" },
                    { h: 75, c: "#49339A" },
                  ].map((bar, i) => (
                    <div key={i} style={{ flex: 1, height: `${bar.h}%`, background: bar.c, borderRadius: 4 }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: "#49339A", borderRadius: 2 }} /> New</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: "#F4BE52", borderRadius: 2 }} /> Contacted</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, background: "#62BDD4", borderRadius: 2 }} /> Qualified</span>
                </div>
              </div>

              {/* Lead Sources */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#151927", marginBottom: 12 }}>Lead Sources</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { label: "No Website", val: 68, color: "#49339A" },
                    { label: "Super Fast UK", val: 24, color: "#F4BE52" },
                    { label: "Referral", val: 8, color: "#62BDD4" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#60697A" }}>{s.label}</span>
                        <span style={{ fontWeight: 500, color: "#151927" }}>{s.val}%</span>
                      </div>
                      <div style={{ height: 6, background: "#F7F6F3", borderRadius: 4 }}>
                        <div style={{ width: `${s.val}%`, height: "100%", background: s.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              {/* Recent Leads table */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#151927" }}>Recent Leads</span>
                  <span style={{ fontSize: 11, color: "#9299A8" }}>View all →</span>
                </div>
                <div>
                  {[
                    { company: "Glow Dentistry", email: "info@glowdentistry.co.uk", status: "New", color: "#F0ECFA", text: "#49339A" },
                    { company: "Leith Optical", email: "leithoptical@fsmail.net", status: "Contacted", color: "#FFF6E3", text: "#C27A28" },
                    { company: "VIVA SKIN CLINICS", email: "bookings@vivaskinclinics.com", status: "Qualified", color: "#EAF7FA", text: "#2F7A8F" },
                  ].map((lead) => (
                    <div key={lead.company} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #F7F6F3" }}>
                      <div style={{ width: 28, height: 28, background: "#F0ECFA", color: "#49339A", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11 }}>{lead.company[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{lead.company}</div>
                        <div style={{ fontSize: 11, color: "#9299A8" }}>{lead.email}</div>
                      </div>
                      <span style={{ background: lead.color, color: lead.text, padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>{lead.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming + Activity */}
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#151927", marginBottom: 10 }}>Upcoming Follow-ups</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      { name: "Glow Dentistry", time: "Today, 3:00 PM" },
                      { name: "Leith Optical", time: "Tomorrow, 10:00 AM" },
                    ].map((f) => (
                      <div key={f.name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ width: 6, height: 6, background: "#F4BE52", borderRadius: "50%" }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#151927" }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "#9299A8" }}>{f.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#151927", marginBottom: 10 }}>Campaign Performance</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "#60697A" }}>Outreach UK</span>
                    <span style={{ fontWeight: 500, color: "#151927" }}>68% open</span>
                  </div>
                  <div style={{ height: 6, background: "#F7F6F3", borderRadius: 4 }}>
                    <div style={{ width: "68%", height: "100%", background: "#49339A", borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, background: "white", border: "1px solid #E5E3DF", borderRadius: 10, fontSize: 12, color: "#60697A", lineHeight: 1.5 }}>
        <strong style={{ color: "#151927" }}>Judgement criteria:</strong> Does this feel like a premium commercial admin template? Warm neutral canvas #F7F6F3 + white cards #FFFFFF + slate nav #252E43 + indigo #49339A primary + amber/aqua small accents. Poppins friendly geometric. Compact, comfortable whitespace, no heavy shadows, no 800 weights, no blue-dominated IDE feel.
      </div>
    </div>
  );
}
