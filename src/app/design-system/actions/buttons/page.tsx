"use client";
import { useState } from "react";

export default function ButtonsPage() {
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [showIcon, setShowIcon] = useState(true);

  const sizeMap = {
    sm: { padding: "6px 12px", fontSize: 12, height: 28 },
    md: { padding: "8px 16px", fontSize: 13, height: 36 },
    lg: { padding: "10px 20px", fontSize: 14, height: 44 },
  };

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>10 / 74 · ACTIONS</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSize("sm")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #DDE3EE", background: size === "sm" ? "#0B1224" : "white", color: size === "sm" ? "white" : "#667085", fontSize: 11 }}>SM</button>
            <button onClick={() => setSize("md")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #DDE3EE", background: size === "md" ? "#0B1224" : "white", color: size === "md" ? "white" : "#667085", fontSize: 11 }}>MD</button>
            <button onClick={() => setSize("lg")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #DDE3EE", background: size === "lg" ? "#0B1224" : "white", color: size === "lg" ? "white" : "#667085", fontSize: 11 }}>LG</button>
            <button onClick={() => setShowIcon(!showIcon)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #DDE3EE", background: showIcon ? "#EEF3FF" : "white", color: showIcon ? "#315BE8" : "#667085", fontSize: 11 }}>Icon {showIcon ? "On" : "Off"}</button>
          </div>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Buttons</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>Buttons trigger actions and communicate hierarchy. Use primary actions intentionally and preserve clear secondary paths.</p>
      </div>

      {/* Variants */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.05em", color: "#0B1224", marginBottom: 16 }}>VARIANTS</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 600, height: sizeMap[size].height }}>{showIcon ? "+ " : ""}Create Lead</button>
            <button style={{ background: "#0B1224", color: "white", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 600, height: sizeMap[size].height }}>{showIcon ? "⇪ " : ""}Import Leads</button>
            <button style={{ background: "#7C5CFC", color: "white", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 600, height: sizeMap[size].height }}>{showIcon ? "▶ " : ""}Start Campaign</button>
            <button style={{ background: "white", color: "#0B1224", border: "1px solid #DDE3EE", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 600, height: sizeMap[size].height }}>Outline</button>
            <button style={{ background: "transparent", color: "#475467", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 600, height: sizeMap[size].height }}>Ghost</button>
            <button style={{ background: "#E5484D", color: "white", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 600, height: sizeMap[size].height }}>Danger</button>
            <button style={{ background: "transparent", color: "#315BE8", border: "none", padding: sizeMap[size].padding, borderRadius: 8, fontSize: sizeMap[size].fontSize, fontWeight: 600, height: sizeMap[size].height }}>Text Action →</button>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 12, marginTop: 24, marginBottom: 12, color: "#667085" }}>SIZES — XS / SM / MD / LG / XL</h4>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>XS</button>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>SM</button>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>MD</button>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>LG</button>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "12px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600 }}>XL</button>
          </div>

          <h4 style={{ fontWeight: 600, fontSize: 12, marginTop: 24, marginBottom: 12, color: "#667085" }}>STATES — Default / Hover / Active / Focus / Loading / Disabled</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Default</button>
            <button style={{ background: "#2548C0", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Hover</button>
            <button style={{ background: "#1D3898", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Active</button>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 0 0 3px #B3C8FF" }}>Focus</button>
            <button style={{ background: "#8CABFF", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 12, height: 12, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block" }} /> Loading</button>
            <button disabled style={{ background: "#EEF3FF", color: "#94A3B8", border: "1px solid #DDE3EE", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Disabled</button>
          </div>
        </div>

        <div style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 16 }}>BUTTON ANATOMY & SPEC</h3>
          <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" }}>
            <button style={{ background: "#315BE8", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, position: "relative" }}>
              <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 9, background: "#0B1224", color: "white", padding: "2px 6px", borderRadius: 4 }}>Height 44px</span>
              Create Lead
            </button>
            <div style={{ marginTop: 12, fontSize: 10, color: "#667085" }}>← Padding 20px →</div>
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Height</span><span style={{ fontWeight: 600, fontFamily: "monospace" }}>36px MD / 44px LG</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Padding</span><span style={{ fontWeight: 600, fontFamily: "monospace" }}>8px 16px MD</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Radius</span><span style={{ fontWeight: 600, fontFamily: "monospace" }}>8px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Typography</span><span style={{ fontWeight: 600, fontFamily: "monospace" }}>13px / 600 / Inter</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Icon size</span><span style={{ fontWeight: 600, fontFamily: "monospace" }}>16px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #EEF3FF" }}><span style={{ color: "#667085" }}>Icon gap</span><span style={{ fontWeight: 600, fontFamily: "monospace" }}>8px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#667085" }}>Hover</span><span style={{ fontWeight: 600, fontFamily: "monospace" }}>#2548C0</span></div>
          </div>
          <div style={{ marginTop: 16, padding: 10, background: "white", borderRadius: 8, fontSize: 11, color: "#475467" }}>
            <b>Usage:</b> Primary for main actions (Create Lead), Secondary for alternative, Outline/Ghost for tertiary. Preserve clear hierarchy.
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Real CRM Examples</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={{ background: "#315BE8", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>+ New Lead</button>
          <button style={{ background: "white", border: "1px solid #DDE3EE", padding: "8px 16px", borderRadius: 8, fontWeight: 500, fontSize: 13 }}>Import CSV</button>
          <button style={{ background: "#0B1224", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Start Campaign</button>
          <button style={{ background: "#7C5CFC", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>AI Enrich</button>
        </div>
      </div>
    </div>
  );
}
