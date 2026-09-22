"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription, FieldError } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { CharacterCounter } from "@/components/ui/Input";

export default function TextareaPage() {
  const [val, setVal] = useState("This is a sample note about Glow Dentistry. They are a dental clinic in London with no website, but have email info@glowdentistry.co.uk. Follow up next week.");

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>15 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Textarea</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Notes, descriptions, messages — fixed, manual resize, auto-grow. Character counter, compact professional.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Sizes — SM / MD / LG</h3>
          <div style={{ display: "grid", gap: 16 }}>
            <FormField><FieldLabel>SM — Notes</FieldLabel><Textarea size="sm" placeholder="Small textarea..." /></FormField>
            <FormField><FieldLabel>MD — Default — Company Description</FieldLabel><Textarea size="md" placeholder="Enter company description..." defaultValue="Dental clinic in London..." /></FormField>
            <FormField><FieldLabel>LG — Internal Notes</FieldLabel><Textarea size="lg" placeholder="Large textarea for detailed notes..." /></FormField>
          </div>
        </div>
        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 12 }}>States</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <FormField><FieldLabel>Default</FieldLabel><Textarea placeholder="Default" /></FormField>
            <FormField><FieldLabel>Focus</FieldLabel><Textarea style={{ borderColor: "#49339A", boxShadow: "0 0 0 3px #F0ECFA" }} placeholder="Focused" /></FormField>
            <FormField><FieldLabel>Error</FieldLabel><Textarea state="error" defaultValue="Too short" /><FieldError>Minimum 20 characters required.</FieldError></FormField>
            <FormField><FieldLabel>Disabled</FieldLabel><Textarea disabled placeholder="Disabled" /></FormField>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Character Counter — normal / near limit / limit reached</h4>
          <FormField>
            <FieldLabel>Internal Notes</FieldLabel>
            <Textarea value={val} onChange={(e) => setVal(e.target.value)} maxLength={500} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FieldDescription>Visible to team only</FieldDescription>
              <CharacterCounter current={val.length} max={500} />
            </div>
          </FormField>
          <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#9299A8" }}>Normal</span><span>342 / 500</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#F29B38" }}>Near limit 80%+</span><span style={{ color: "#F29B38" }}>420 / 500</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#EC6262" }}>Limit reached</span><span style={{ color: "#EC6262" }}>500 / 500</span></div>
          </div>
          <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Do not use danger styling before actually a problem</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Auto-grow — Starts compact, expands, max then scroll</h4>
          <FormField>
            <FieldLabel>Follow-up Notes — auto-grow</FieldLabel>
            <Textarea autoGrow maxHeight={160} placeholder="Starts compact, expands as you type..." />
            <FieldDescription>Expands vertically to 160px max, then internal scroll</FieldDescription>
          </FormField>
          <div style={{ marginTop: 16 }}>
            <FieldLabel>Manual resize</FieldLabel>
            <Textarea style={{ resize: "vertical" }} placeholder="Drag bottom-right to resize..." />
          </div>
        </div>
      </div>
    </div>
  );
}
