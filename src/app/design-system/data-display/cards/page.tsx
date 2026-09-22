export default function CardsPage() {
  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>26 / 74 · DATA DISPLAY</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Cards</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>One of the most reusable components. Basic, KPI, lead, analytics, selectable, clickable, loading.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085", marginBottom: 12 }}>BASIC CARD</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Card Title</div>
          <div style={{ fontSize: 13, color: "#667085", lineHeight: 1.5 }}>Basic card with header, icon, title, subtitle, badge, actions, body, footer, CTA, menu, loading.</div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #F6F8FC", display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#315BE8", fontWeight: 600 }}>Action →</span><span style={{ color: "#667085" }}>Menu •</span></div>
        </div>

        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20, borderLeft: "3px solid #315BE8" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#315BE8", marginBottom: 8 }}>KPI CARD</div>
          <div style={{ fontSize: 11, color: "#667085" }}>CRM TOTAL</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0B1224", margin: "4px 0" }}>71 / 200</div>
          <div style={{ fontSize: 12, color: "#667085" }}>36% — 71 with email</div>
          <div style={{ height: 6, background: "#F6F8FC", borderRadius: 4, marginTop: 12, overflow: "hidden" }}><div style={{ width: "36%", height: "100%", background: "#315BE8" }} /></div>
        </div>

        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, background: "#EEF3FF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#315BE8", fontWeight: 700 }}>G</div>
            <span style={{ background: "#ECFDF5", color: "#15803d", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>New</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Glow Dentistry</div>
          <div style={{ fontSize: 12, color: "#667085", marginTop: 4 }}>Dental • London • No website</div>
          <div style={{ fontSize: 11, color: "#667085", marginTop: 8 }}>info@glowdentistry.co.uk</div>
        </div>

        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085", marginBottom: 12 }}>ANALYTICS CARD</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontWeight: 600 }}>Revenue Overview</span><span style={{ fontSize: 11, color: "#667085" }}>Last 7 days</span></div>
          <div style={{ height: 60, background: "#F6F8FC", borderRadius: 8, display: "flex", alignItems: "end", gap: 4, padding: 8 }}><div style={{ flex: 1, height: "40%", background: "#D9E4FF", borderRadius: 4 }} /><div style={{ flex: 1, height: "70%", background: "#8CABFF", borderRadius: 4 }} /><div style={{ flex: 1, height: "50%", background: "#D9E4FF", borderRadius: 4 }} /><div style={{ flex: 1, height: "90%", background: "#315BE8", borderRadius: 4 }} /></div>
        </div>

        <div style={{ background: "white", border: "1px solid #315BE8", borderRadius: 12, padding: 20, boxShadow: "0 0 0 3px #D9E4FF" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#315BE8", marginBottom: 8 }}>SELECTABLE • SELECTED</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" defaultChecked /><span style={{ fontWeight: 600 }}>Selected card</span></div>
          <div style={{ fontSize: 12, color: "#667085", marginTop: 8 }}>Border #315BE8 + focus ring #D9E4FF</div>
        </div>

        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 12, padding: 20, opacity: 0.6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#667085", marginBottom: 12 }}>LOADING</div>
          <div style={{ display: "grid", gap: 8 }}><div style={{ height: 12, background: "#F6F8FC", borderRadius: 4, width: "60%" }} /><div style={{ height: 12, background: "#F6F8FC", borderRadius: 4 }} /><div style={{ height: 12, background: "#F6F8FC", borderRadius: 4, width: "80%" }} /></div>
        </div>
      </div>

      <div style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 12 }}>CARD ANATOMY</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 11 }}>
          <div><b>Anatomy:</b><br />Header (icon, title, subtitle, badge, actions), Body, Footer (CTA, menu), Loading, Selectable, Clickable</div>
          <div><b>Radius:</b><br />10-14px cards, 8-10px inputs/buttons, 20px badges, 50% avatars. Subtle borders #DDE3EE, not heavy shadows.</div>
          <div><b>Variants:</b><br />Basic, KPI, User, Product, Activity, Chart, Table, Form, Media, Notification, Task, Integration, Pricing, Settings, Empty, Loading</div>
        </div>
      </div>
    </div>
  );
}
