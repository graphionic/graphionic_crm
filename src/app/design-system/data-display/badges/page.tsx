export default function BadgesPage() {
  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>28 / 74 · DATA DISPLAY</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Badges & Tags</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>Status, number, notification, dot, removable tags, filter chips. Semantic colors for status only.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 16 }}>STATUS BADGES</h3>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", marginBottom: 8 }}>Lead Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ background: "#EEF3FF", color: "#315BE8", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>New</span>
                <span style={{ background: "#FFFBEB", color: "#B45309", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Contacted</span>
                <span style={{ background: "#F5F0FF", color: "#7C5CFC", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Qualified</span>
                <span style={{ background: "#ECFDF5", color: "#15803d", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Won</span>
                <span style={{ background: "#FEF2F2", color: "#B91C1C", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Lost</span>
                <span style={{ background: "#F6F8FC", color: "#667085", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Archived</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", marginBottom: 8 }}>Dot + Label</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ width: 8, height: 8, background: "#16A36A", borderRadius: "50%" }} /> Active</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ width: 8, height: 8, background: "#F59E0B", borderRadius: "50%" }} /> Pending</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ width: 8, height: 8, background: "#E5484D", borderRadius: "50%" }} /> Inactive</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><span style={{ width: 8, height: 8, background: "#667085", borderRadius: "50%" }} /> Draft</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", marginBottom: 8 }}>Number & Notification</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ position: "relative" }}><span style={{ fontSize: 13 }}>Leads</span><span style={{ position: "absolute", top: -8, right: -16, background: "#E5484D", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>24</span></div>
                <div style={{ position: "relative", marginLeft: 16 }}><span style={{ fontSize: 13 }}>Inbox</span><span style={{ position: "absolute", top: -4, right: -8, width: 8, height: 8, background: "#315BE8", borderRadius: "50%" }} /></div>
              </div>
            </div>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 12, marginTop: 24, marginBottom: 12, color: "#667085" }}>TAGS & FILTER CHIPS — Removable, User, Category</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: "#EEF3FF", color: "#315BE8", padding: "6px 12px", borderRadius: 20, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>Dental ×</span>
            <span style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", padding: "6px 12px", borderRadius: 20, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 20, height: 20, background: "#DDE3EE", borderRadius: "50%" }} /> Sarah ×</span>
            <span style={{ background: "white", border: "1px solid #DDE3EE", padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>London ×</span>
            <span style={{ background: "#0B1224", color: "white", padding: "6px 12px", borderRadius: 20, fontSize: 12 }}>3 filters • Clear all</span>
          </div>
        </div>

        <div style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 16 }}>BADGE SPEC</h3>
          <div style={{ display: "grid", gap: 10, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Height</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>22px default / 20px sm</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Padding</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>4px 10px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Radius</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>20px (full)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Font</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>12px / 600</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#667085" }}>Dot</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>8px</span></div>
          </div>
          <div style={{ marginTop: 16, padding: 10, background: "white", borderRadius: 8, fontSize: 11 }}>
            <b>Statuses:</b> Active, Inactive, Pending, Approved, Rejected, Processing, Completed, Cancelled, Draft, Archived, Failed
          </div>
        </div>
      </div>
    </div>
  );
}
