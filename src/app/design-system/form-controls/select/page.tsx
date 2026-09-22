"use client";
import { useState } from "react";

export default function SelectPage() {
  const [open, setOpen] = useState<string | null>("basic");

  const options = [
    { label: "Glow Dentistry", sub: "Dental • London", avatar: "G" },
    { label: "Leith Optical", sub: "Eye • Edinburgh", avatar: "L" },
    { label: "VIVA SKIN CLINICS", sub: "Hospital • London", avatar: "V" },
    { label: "Medivet", sub: "Pet Store • London", avatar: "M" },
  ];

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>16 / 74 · FORM CONTROLS</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Select System</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>Critical for admin systems. Basic, searchable, multi, async, with avatars, tags, empty & loading states. Dropdowns shown OPEN for inspection.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Basic Select - Open */}
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 12 }}>BASIC SELECT — OPEN</h3>
          <div style={{ position: "relative" }}>
            <button onClick={() => setOpen(open === "basic" ? null : "basic")} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #315BE8", borderRadius: 8, background: "white", fontSize: 13, boxShadow: "0 0 0 3px #D9E4FF" }}>
              <span>Select category</span><span>▼</span>
            </button>
            {open === "basic" && (
              <div style={{ position: "absolute", top: 44, left: 0, right: 0, background: "white", border: "1px solid #DDE3EE", borderRadius: 10, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 10, overflow: "hidden" }}>
                <div style={{ padding: 8 }}><input placeholder="Search..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EE", borderRadius: 6, fontSize: 12 }} /></div>
                {["Dental", "Eye", "Pet Store", "Hospital", "Physio"].map((opt, i) => (
                  <div key={opt} style={{ padding: "10px 14px", fontSize: 13, background: i === 0 ? "#EEF3FF" : "white", color: i === 0 ? "#315BE8" : "#0B1224", display: "flex", justifyContent: "space-between" }}><span>{opt}</span>{i === 0 && <span>✓</span>}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: 60, fontSize: 11, color: "#667085" }}>Includes search field, selected state, hover, empty results</div>
        </div>

        {/* User Select with Avatars */}
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 12 }}>USER SELECT — WITH AVATARS</h3>
          <div style={{ position: "relative" }}>
            <button style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #DDE3EE", borderRadius: 8, background: "white", fontSize: 13 }}>
              <span>Assign to user</span><span>▼</span>
            </button>
            <div style={{ position: "absolute", top: 44, left: 0, right: 0, background: "white", border: "1px solid #DDE3EE", borderRadius: 10, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 10, overflow: "hidden" }}>
              {options.map((opt) => (
                <div key={opt.label} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, borderBottom: "1px solid #F6F8FC" }}>
                  <div style={{ width: 28, height: 28, background: "#EEF3FF", color: "#315BE8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{opt.avatar}</div>
                  <div><div style={{ fontWeight: 600 }}>{opt.label}</div><div style={{ fontSize: 11, color: "#667085" }}>{opt.sub}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 12 }}>MULTI SELECT — WITH TAGS</h3>
          <div style={{ border: "1px solid #DDE3EE", borderRadius: 8, padding: 8, display: "flex", gap: 6, flexWrap: "wrap", minHeight: 44, alignItems: "center" }}>
            <span style={{ background: "#EEF3FF", color: "#315BE8", padding: "4px 10px", borderRadius: 20, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>Dental ×</span>
            <span style={{ background: "#EEF3FF", color: "#315BE8", padding: "4px 10px", borderRadius: 20, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>Hospital ×</span>
            <span style={{ color: "#98A2B3", fontSize: 12 }}>+ Add more</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Dental ✓", "Hospital ✓", "Eye", "Pet Store", "Physio"].map((t) => (
              <span key={t} style={{ border: "1px solid #DDE3EE", padding: "6px 12px", borderRadius: 8, fontSize: 12, background: t.includes("✓") ? "#EEF3FF" : "white", color: t.includes("✓") ? "#315BE8" : "#667085" }}>{t}</span>
            ))}
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 12 }}>STATUS SELECT — WITH COLORS</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { label: "New", color: "#315BE8", bg: "#EEF3FF" },
              { label: "Contacted", color: "#F59E0B", bg: "#FFFBEB" },
              { label: "Qualified", color: "#7C5CFC", bg: "#F5F0FF" },
              { label: "Won", color: "#16A36A", bg: "#ECFDF5" },
              { label: "Lost", color: "#667085", bg: "#F6F8FC" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid #DDE3EE", borderRadius: 8, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, background: s.color, borderRadius: "50%" }} />
                <span style={{ flex: 1 }}>{s.label}</span>
                <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", marginBottom: 12 }}>SELECT ANATOMY</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 11 }}>
          <div><b>Anatomy:</b><br />Trigger (40px), Search, Options (36px), Selected check, Hover #F6F8FC, Empty state, Loading spinner</div>
          <div><b>Features:</b><br />Clearable, Disabled, Grouped, Async loading, Avatars, Tags, Checkbox selection, Recently selected</div>
          <div><b>States:</b><br />Default, Hover, Focus (blue ring), Open, Selected, Disabled, Loading results, Empty results, Error</div>
        </div>
      </div>
    </div>
  );
}
