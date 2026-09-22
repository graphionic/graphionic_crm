export default function Page() {
  return (
    <div style={ maxWidth: 800 }>
      <div style={ marginBottom: 24 }>
        <span style={ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }>55 / 74</span>
        <h1 style={ fontSize: 32, fontWeight: 800, marginTop: 12, color: "#0B1224" }>CRUD</h1>
        <p style={ color: "#667085", marginTop: 8 }>Coming soon — this section will showcase CRUD with live variants, states, anatomy & specs.</p>
      </div>
      <div style={ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 40, textAlign: "center" }>
        <div style={ width: 48, height: 48, background: "#F6F8FC", borderRadius: 12, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#667085" }>55</div>
        <div style={ fontWeight: 600 }>CRUD</div>
        <div style={ fontSize: 13, color: "#667085", marginTop: 8 }>SOON • Part of Admin Design System v1.0</div>
      </div>
    </div>
  );
}
