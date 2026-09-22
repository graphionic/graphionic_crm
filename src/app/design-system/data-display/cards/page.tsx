export default function CardsPage() {
  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>26 / 74 · DATA DISPLAY</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Cards</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Background #FFFFFF, border #E5E3DF, radius 10-12px, extremely subtle shadow or none. Premium admin quality.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 12 }}>BASIC CARD</div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#151927", fontSize: 15 }}>Card Title</div>
          <div style={{ fontSize: 13, color: "#60697A", lineHeight: 1.6 }}>Basic card with header, icon, title, subtitle, badge, actions, body, footer, CTA, menu, loading.</div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #F0EEEA", display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#49339A", fontWeight: 500 }}>Action →</span><span style={{ color: "#9299A8" }}>Menu •</span></div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", marginBottom: 8 }}>KPI CARD</div>
          <div style={{ fontSize: 11, color: "#9299A8", fontWeight: 500, letterSpacing: "0.06em" }}>CRM TOTAL</div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "#151927", margin: "4px 0" }}>71 / 200</div>
          <div style={{ fontSize: 12, color: "#60697A" }}>36% — 71 with email</div>
          <div style={{ height: 6, background: "#F7F6F3", borderRadius: 4, marginTop: 12, overflow: "hidden" }}><div style={{ width: "36%", height: "100%", background: "#49339A" }} /></div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, background: "#F0ECFA", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#49339A", fontWeight: 600, fontSize: 13 }}>G</div>
            <span style={{ background: "#EEF8F4", color: "#4FAE91", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>Active</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#151927" }}>Glow Dentistry</div>
          <div style={{ fontSize: 12, color: "#9299A8", marginTop: 4 }}>Dental • London • No website</div>
          <div style={{ fontSize: 11, color: "#60697A", marginTop: 8 }}>info@glowdentistry.co.uk</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 12 }}>ANALYTICS CARD</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontWeight: 600, color: "#151927", fontSize: 14 }}>Revenue Overview</span><span style={{ fontSize: 11, color: "#9299A8" }}>Last 7 days</span></div>
          <div style={{ height: 60, background: "#FAF9F7", borderRadius: 8, display: "flex", alignItems: "end", gap: 4, padding: 8 }}><div style={{ flex: 1, height: "40%", background: "#E5E3DF", borderRadius: 3 }} /><div style={{ flex: 1, height: "70%", background: "#8B76CC", borderRadius: 3 }} /><div style={{ flex: 1, height: "50%", background: "#F4BE52", borderRadius: 3 }} /><div style={{ flex: 1, height: "90%", background: "#49339A", borderRadius: 3 }} /></div>
        </div>

        <div style={{ background: "white", border: "1px solid #49339A", borderRadius: 12, padding: 20, boxShadow: "0 0 0 3px #F0ECFA" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", marginBottom: 8 }}>SELECTABLE • SELECTED</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" defaultChecked style={{ accentColor: "#49339A" }} /><span style={{ fontWeight: 500, color: "#151927" }}>Selected card</span></div>
          <div style={{ fontSize: 12, color: "#60697A", marginTop: 8 }}>Border #49339A + focus ring #F0ECFA</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, opacity: 0.7 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 12 }}>LOADING</div>
          <div style={{ display: "grid", gap: 8 }}><div style={{ height: 12, background: "#F7F6F3", borderRadius: 4, width: "60%" }} /><div style={{ height: 12, background: "#F7F6F3", borderRadius: 4 }} /><div style={{ height: 12, background: "#F7F6F3", borderRadius: 4, width: "80%" }} /></div>
        </div>
      </div>

      <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.04em", marginBottom: 12, color: "#151927" }}>CARD ANATOMY</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 12, color: "#60697A", lineHeight: 1.5 }}>
          <div><b style={{ color: "#151927" }}>Anatomy:</b><br />Header (icon, title, subtitle, badge, actions), Body, Footer (CTA, menu), Loading, Selectable, Clickable</div>
          <div><b style={{ color: "#151927" }}>Style:</b><br />bg #FFFFFF, border #E5E3DF, radius 10-12px, shadow extremely subtle or none, not floating</div>
          <div><b style={{ color: "#151927" }}>Variants:</b><br />Basic, KPI, User, Product, Activity, Chart, Table, Form, Media, Notification, Task, Integration, Pricing, Settings, Empty, Loading</div>
        </div>
      </div>
    </div>
  );
}
