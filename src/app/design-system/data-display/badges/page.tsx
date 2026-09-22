export default function BadgesPage() {
  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>28 / 74 · DATA DISPLAY</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Badges & Tags</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Soft tinted backgrounds: Active green tint, Pending warm cream orange, New lavender indigo, Info aqua tint, Danger coral tint.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, color: "#151927" }}>STATUS BADGES — Soft Tint</h3>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Lead Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ background: "#F0ECFA", color: "#49339A", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>New</span>
                <span style={{ background: "#FFF6E3", color: "#C27A28", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Contacted</span>
                <span style={{ background: "#EAF7FA", color: "#2F7A8F", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Qualified</span>
                <span style={{ background: "#EEF8F4", color: "#2F7A63", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Won</span>
                <span style={{ background: "#FDECEC", color: "#B93E3E", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Lost</span>
                <span style={{ background: "#FAF9F7", color: "#60697A", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Archived</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Dot + Label</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#151927" }}><span style={{ width: 8, height: 8, background: "#4FAE91", borderRadius: "50%" }} /> Active</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#151927" }}><span style={{ width: 8, height: 8, background: "#F29B38", borderRadius: "50%" }} /> Pending</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#151927" }}><span style={{ width: 8, height: 8, background: "#EC6262", borderRadius: "50%" }} /> Inactive</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#151927" }}><span style={{ width: 8, height: 8, background: "#9299A8", borderRadius: "50%" }} /> Draft</span>
              </div>
            </div>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 11, marginTop: 24, marginBottom: 12, color: "#9299A8", letterSpacing: "0.06em" }}>TAGS & FILTER CHIPS</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: "#F0ECFA", color: "#49339A", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Dental ×</span>
            <span style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", padding: "6px 12px", borderRadius: 20, fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "#151927" }}><span style={{ width: 20, height: 20, background: "#E5E3DF", borderRadius: "50%" }} /> Sarah ×</span>
            <span style={{ background: "white", border: "1px solid #E5E3DF", padding: "6px 12px", borderRadius: 20, fontSize: 12, color: "#60697A" }}>London ×</span>
            <span style={{ background: "#252E43", color: "white", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>3 filters • Clear all</span>
          </div>
        </div>

        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.04em", marginBottom: 16, color: "#151927" }}>BADGE SPEC</h3>
          <div style={{ display: "grid", gap: 10, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Active</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>#EEF8F4 + #4FAE91</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Pending</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>#FFF6E3 + #F29B38</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>New</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>#F0ECFA + #49339A</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#9299A8" }}>Radius</span><span style={{ fontFamily: "monospace", fontWeight: 500 }}>20px pill</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
