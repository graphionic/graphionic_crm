export default function InputsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>04 Inputs — Form Controls</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Standard text, email, password, search, phone, OTP, with prefix/suffix, states, validation.</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Text Inputs</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Standard</label><input placeholder="Enter text" style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, marginTop: 4 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>With Icon</label><div style={{ position: "relative", marginTop: 4 }}><span style={{ position: "absolute", left: 10, top: 8 }}>⌕</span><input placeholder="Search..." style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e5e7eb", borderRadius: 6 }} /></div></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Error</label><input defaultValue="Invalid email" style={{ width: "100%", padding: "8px 12px", border: "1px solid #ef4444", borderRadius: 6, marginTop: 4 }} /><div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Invalid email format</div></div>
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Select & Others</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Select</label><select style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, marginTop: 4 }}><option>Option 1</option><option>Option 2</option></select></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Checkbox</label><div style={{ display: "flex", gap: 8, marginTop: 4 }}><input type="checkbox" defaultChecked /> <span style={{ fontSize: 12 }}>Accept terms</span></div></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Toggle</label><div style={{ width: 36, height: 20, background: "#2563eb", borderRadius: 10, position: "relative", marginTop: 4 }}><div style={{ width: 16, height: 16, background: "white", borderRadius: "50%", position: "absolute", top: 2, right: 2 }} /></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
