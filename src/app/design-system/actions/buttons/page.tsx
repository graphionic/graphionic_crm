"use client";
import { useState } from "react";

export default function ButtonsPage() {
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [showIcon, setShowIcon] = useState(true);

  const sizeMap = {
    sm: { padding: "0 12px", fontSize: 13, height: 36 },
    md: { padding: "0 16px", fontSize: 14, height: 42 },
    lg: { padding: "0 20px", fontSize: 14, height: 48 },
  };

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>10 / 74 · ACTIONS</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setSize("sm")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: size === "sm" ? "#151927" : "white", color: size === "sm" ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>SM</button>
            <button onClick={() => setSize("md")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: size === "md" ? "#151927" : "white", color: size === "md" ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>MD</button>
            <button onClick={() => setSize("lg")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: size === "lg" ? "#151927" : "white", color: size === "lg" ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>LG</button>
            <button onClick={() => setShowIcon(!showIcon)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: showIcon ? "#F0ECFA" : "white", color: showIcon ? "#49339A" : "#60697A", fontSize: 11, fontWeight: 500 }}>Icon {showIcon ? "On" : "Off"}</button>
          </div>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginBottom: 8 }}>Buttons</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Primary indigo for main actions, secondary white with indigo border, amber accent sparingly. Radius 8px, not pill.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.02em", color: "#151927", marginBottom: 16 }}>VARIANTS</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button style={{ background: "#49339A", color: "white", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 500, height: sizeMap[size].height, fontFamily: "Poppins" }}>{showIcon ? "+ " : ""}Create Lead</button>
            <button style={{ background: "white", color: "#49339A", border: "1px solid #49339A", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 500, height: sizeMap[size].height, fontFamily: "Poppins" }}>{showIcon ? "⇪ " : ""}Secondary</button>
            <button style={{ background: "#F4BE52", color: "#151927", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 500, height: sizeMap[size].height, fontFamily: "Poppins" }}>{showIcon ? "★ " : ""}Accent</button>
            <button style={{ background: "white", color: "#151927", border: "1px solid #E5E3DF", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 500, height: sizeMap[size].height, fontFamily: "Poppins" }}>Outline</button>
            <button style={{ background: "transparent", color: "#60697A", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 500, height: sizeMap[size].height, fontFamily: "Poppins" }}>Ghost</button>
            <button style={{ background: "#FDECEC", color: "#EC6262", border: "1px solid #FBD5D5", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 500, height: sizeMap[size].height, fontFamily: "Poppins" }}>Danger</button>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 11, marginTop: 24, marginBottom: 10, color: "#9299A8", letterSpacing: "0.06em" }}>SIZES — SM 36 / MD 42 / LG 48</h4>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={{ background: "#49339A", color: "white", border: "none", padding: "0 12px", height: 36, borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: "Poppins" }}>SM 36</button>
            <button style={{ background: "#49339A", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins" }}>MD 42</button>
            <button style={{ background: "#49339A", color: "white", border: "none", padding: "0 20px", height: 48, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins" }}>LG 48</button>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 11, marginTop: 24, marginBottom: 10, color: "#9299A8", letterSpacing: "0.06em" }}>STATES</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ background: "#49339A", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins" }}>Default</button>
            <button style={{ background: "#38247F", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins" }}>Hover</button>
            <button style={{ background: "#49339A", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins", boxShadow: "0 0 0 3px #F0ECFA", outline: "2px solid #49339A" }}>Focus</button>
            <button style={{ background: "#C5B1EB", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, fontFamily: "Poppins" }}><span style={{ width: 12, height: 12, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} /> Loading</button>
            <button disabled style={{ background: "#FAF9F7", color: "#B8BDC8", border: "1px solid #E5E3DF", padding: "0 16px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins" }}>Disabled</button>
          </div>
        </div>

        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.04em", marginBottom: 16, color: "#151927" }}>BUTTON SPEC</h3>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 20, marginBottom: 16, textAlign: "center" }}>
            <button style={{ background: "#49339A", color: "white", border: "none", padding: "0 20px", height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: "Poppins" }}>
              Create Lead
            </button>
            <div style={{ marginTop: 10, fontSize: 10, color: "#9299A8", fontWeight: 500 }}>Height 42px · Padding 0 16px · Radius 8px</div>
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Primary</span><span style={{ fontWeight: 500, fontFamily: "monospace" }}>#49339A</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Hover</span><span style={{ fontWeight: 500, fontFamily: "monospace" }}>#38247F</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Radius</span><span style={{ fontWeight: 500, fontFamily: "monospace" }}>8px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EEEA" }}><span style={{ color: "#9299A8" }}>Font</span><span style={{ fontWeight: 500, fontFamily: "monospace" }}>14px / 500 / Poppins</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#9299A8" }}>Accent</span><span style={{ fontWeight: 500, fontFamily: "monospace" }}>#F4BE52 / #151927</span></div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: "#151927" }}>Real CRM Examples</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={{ background: "#49339A", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontWeight: 500, fontSize: 14, fontFamily: "Poppins" }}>+ New Lead</button>
          <button style={{ background: "white", border: "1px solid #E5E3DF", padding: "0 16px", height: 42, borderRadius: 8, fontWeight: 500, fontSize: 14, fontFamily: "Poppins" }}>Import CSV</button>
          <button style={{ background: "#252E43", color: "white", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontWeight: 500, fontSize: 14, fontFamily: "Poppins" }}>Start Campaign</button>
          <button style={{ background: "#F4BE52", color: "#151927", border: "none", padding: "0 16px", height: 42, borderRadius: 8, fontWeight: 500, fontSize: 14, fontFamily: "Poppins" }}>★ Highlight</button>
        </div>
      </div>
    </div>
  );
}
