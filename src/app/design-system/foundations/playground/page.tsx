export default function FoundationPlayground() {
  return (
    <div style={{ maxWidth: 1200, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>FOUNDATION PLAYGROUND</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#151927", marginTop: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>Foundation Playground</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Prove all foundation tokens work together — sidebar, topbar, page heading, KPI cards, search, button, input, select, badge, small table, chart placeholder, dropdown, modal trigger. Annotated with tokens.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 12, color: "#60697A", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>✓ Spacing 4px base</span><span>✓ Radius 8px controls / 10px cards</span><span>✓ Shadow border-first</span><span>✓ Grid 12 cols</span><span>✓ Motion 120-320ms</span><span>✓ Icons 20px outline</span><span>✓ Poppins 400/500/600</span><span>✓ Colors indigo/amber/aqua</span>
      </div>

      {/* Playground Interface */}
      <div style={{ border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden", background: "#F7F6F3" }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 760 }}>
          {/* Sidebar */}
          <div style={{ background: "#252E43", padding: 14, position: "relative" }}>
            <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, background: "#303A52", color: "#8992A6", padding: "2px 6px", borderRadius: 4 }}>sidebar #252E43 • 260px</div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#8992A6", marginBottom: 10 }}>NAVIGATION • 14px/500 • gap 8px</div>
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ background: "#49339A", color: "white", padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>▦</span> Dashboard
                  <span style={{ marginLeft: "auto", fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "2px 5px", borderRadius: 4 }}>42px h • 8px radius</span>
                </div>
                <div style={{ color: "#C9CED9", padding: "10px 12px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><span>◉</span> Leads</div>
                <div style={{ color: "#C9CED9", padding: "10px 12px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><span>◷</span> Follow-ups</div>
              </div>
            </div>
            <div style={{ marginTop: 20, padding: 10, background: "#303A52", borderRadius: 8, border: "1px dashed #3A455F" }}>
              <div style={{ fontSize: 10, color: "#8992A6" }}>Sidebar tokens</div>
              <div style={{ fontSize: 11, color: "#C9CED9", marginTop: 4, lineHeight: 1.5 }}>bg #252E43<br/>hover #303A52<br/>text #C9CED9<br/>muted #8992A6<br/>active #49339A<br/>gap 8px (token 2)</div>
            </div>
          </div>

          {/* Main */}
          <div style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            {/* Topbar */}
            <div style={{ background: "white", borderBottom: "1px solid #E5E3DF", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
              <div style={{ position: "absolute", top: 4, right: 8, fontSize: 9, background: "#FAF9F7", color: "#9299A8", padding: "2px 6px", borderRadius: 4, border: "1px solid #E5E3DF" }}>topbar 56px • white • border #E5E3DF</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#151927" }}>Page Heading • H2 26px/600</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 32, height: 32, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🔔</div>
                <div style={{ width: 32, height: 32, background: "#F0ECFA", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#49339A", fontWeight: 600 }}>S</div>
              </div>
            </div>

            <div style={{ padding: 20, flex: 1 }}>
              {/* Page padding annotation */}
              <div style={{ fontSize: 10, color: "#9299A8", marginBottom: 12, background: "white", border: "1px dashed #E5E3DF", padding: "4px 8px", borderRadius: 4, display: "inline-block" }}>Page padding 32px (token 8) • Section gap 32px (token 8) • Grid gap 16px (token 4)</div>

              {/* KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "TOTAL LEADS", value: "1,284", sub: "Overline 11px/600/0.08em", color: "#49339A" },
                  { label: "NEW LEADS", value: "126", sub: "Body Small 13px/400", color: "#F4BE52" },
                ].map((k, i) => (
                  <div key={i} style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16, position: "relative" }}>
                    {i === 0 && <div style={{ position: "absolute", top: -8, right: 8, fontSize: 8, background: "#151927", color: "white", padding: "2px 5px", borderRadius: 4 }}>card 10px radius • 24px padding • border #E5E3DF • shadow-none</div>}
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8" }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#151927", marginTop: 6 }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: "#9299A8", marginTop: 4 }}>{k.sub}</div>
                    <div style={{ height: 3, background: "#F7F6F3", borderRadius: 2, marginTop: 10 }}><div style={{ width: "60%", height: "100%", background: k.color, borderRadius: 2 }} /></div>
                  </div>
                ))}
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8" }}>RESPONSE RATE</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#151927", marginTop: 6 }}>24.8%</div>
                  <div style={{ fontSize: 11, color: "#60697A", marginTop: 4 }}>H2 26px/600 • Body 14px/400</div>
                </div>
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8" }}>FOLLOW-UPS</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#151927", marginTop: 6 }}>38</div>
                  <div style={{ fontSize: 11, color: "#EC6262", marginTop: 4 }}>12 overdue • Danger #EC6262</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Search + Button + Input + Select */}
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                      <span style={{ position: "absolute", left: 10, top: 9, color: "#9299A8" }}>⌕</span>
                      <input placeholder="Search leads..." style={{ width: "100%", height: 36, padding: "0 12px 0 32px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }} />
                      <div style={{ fontSize: 9, color: "#9299A8", marginTop: 2 }}>input 36px SM • 8px radius • icon 16px • gap 8px</div>
                    </div>
                    <button style={{ background: "#49339A", color: "white", border: "none", height: 36, padding: "0 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "Poppins" }}>+ Create Lead</button>
                    <select style={{ height: 36, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 12px", fontSize: 13, fontFamily: "Poppins", background: "white" }}>
                      <option>Select status</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ background: "#F0ECFA", color: "#49339A", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>New • radius-full • 6px tag</span>
                    <span style={{ background: "#EEF8F4", color: "#4FAE91", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Active • green tint</span>
                    <span style={{ background: "#FFF6E3", color: "#C27A28", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Pending • amber</span>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 10, color: "#9299A8" }}>Badges: soft tinted bg • 20px radius-full • 12px/500 • Label 13px/500 • Caption 12px/400</div>
                </div>

                {/* Chart placeholder */}
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 10 }}>Chart • H4 18px/600</div>
                  <div style={{ display: "flex", alignItems: "end", gap: 4, height: 60 }}>
                    <div style={{ flex: 1, height: "40%", background: "#E5E3DF", borderRadius: 3 }} />
                    <div style={{ flex: 1, height: "70%", background: "#8B76CC", borderRadius: 3 }} />
                    <div style={{ flex: 1, height: "50%", background: "#F4BE52", borderRadius: 3 }} />
                    <div style={{ flex: 1, height: "90%", background: "#49339A", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#9299A8", marginTop: 8 }}>DataViz: Indigo #49339A • Amber #F4BE52 • Aqua #62BDD4 • radius-xs 4px • motion 180ms</div>
                </div>
              </div>

              {/* Small table */}
              <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #F0EEEA", fontSize: 12, fontWeight: 600, color: "#151927", display: "flex", justifyContent: "space-between" }}>
                  <span>Small Table • Body 13px/400 • Cell padding 12px 14px (token 3+4)</span>
                  <span style={{ fontSize: 10, color: "#9299A8" }}>grid 12 cols • gap 16px (token 4)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 0, fontSize: 12 }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #FAF9F7", fontWeight: 500, color: "#151927" }}>Glow Dentistry</div>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #FAF9F7", color: "#60697A" }}>info@glowdentistry.co.uk</div>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #FAF9F7" }}><span style={{ background: "#F0ECFA", color: "#49339A", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>New</span></div>
                </div>
              </div>

              {/* Dropdown + Modal trigger */}
              <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 8px rgba(21,25,39,0.08)", position: "relative" }}>
                  Dropdown • shadow-sm • 180ms enter • radius 8px
                  <div style={{ position: "absolute", top: -6, right: 8, fontSize: 8, background: "#252E43", color: "white", padding: "1px 4px", borderRadius: 3 }}>shadow-sm</div>
                </div>
                <button style={{ background: "white", border: "1px solid #E5E3DF", height: 36, padding: "0 14px", borderRadius: 8, fontSize: 12, fontWeight: 500 }}>Open Modal</button>
                <span style={{ fontSize: 10, color: "#9299A8" }}>Modal: shadow-lg • 320ms slow • radius-xl 12px • border #E5E3DF</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, marginTop: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 10 }}>Token Summary — All Foundations Working Together</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: 11, lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: "#151927" }}>Spacing:</strong> Page 32px (8), Card 24px (6), Gap 16px (4), Field 20px (5), Label→Input 8px (2), Icon gap 8px (2)<br/>
            <strong style={{ color: "#151927" }}>Radius:</strong> Button/Input 8px (md), Card 10px (lg), Large 12px (xl), Avatar/Pill full, Progress 4px (xs)
          </div>
          <div>
            <strong style={{ color: "#151927" }}>Shadows:</strong> Card none + border #E5E3DF, Sticky xs, Dropdown sm, Modal lg, Drawer lg<br/>
            <strong style={{ color: "#151927" }}>Grid:</strong> Desktop 12 cols, Tablet 8, Mobile 4, Gutter 24px (6), Page padding 32/24/16
          </div>
          <div>
            <strong style={{ color: "#151927" }}>Motion:</strong> Button 120ms fast, Input 180ms normal, Dropdown 180ms enter, Modal 320ms slow, No bounce<br/>
            <strong style={{ color: "#151927" }}>Icons:</strong> 20px default, 2px stroke, rounded joins, outline family, 6/8/10px gap, indigo interactive
          </div>
        </div>
      </div>
    </div>
  );
}
