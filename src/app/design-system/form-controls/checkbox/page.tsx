"use client";
import { useState } from "react";
import { Checkbox, CheckboxGroup } from "@/components/ui/Checkbox";

export default function CheckboxPage() {
  const [checked, setChecked] = useState(true);
  const [indeterminate, setIndeterminate] = useState(true);

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>19 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Checkbox</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Independent selections, multiple options. SM/MD, with label, description, group, indeterminate for tables. Avoid huge checkboxes.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>States — Unchecked / Hover / Checked / Indeterminate / Focus / Disabled / Error</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <Checkbox label="Unchecked" />
            <Checkbox label="Hover (visual)" checked={false} style={{ background: "#FAF9F7", padding: 6, borderRadius: 6 }} />
            <Checkbox label="Checked" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <Checkbox label="Indeterminate — Select all partial" indeterminate={indeterminate} checked={false} />
            <Checkbox label="Focus — indigo ring" checked style={{ outline: "2px solid #49339A", outlineOffset: 2, borderRadius: 4 }} />
            <Checkbox label="Disabled unchecked" disabled />
            <Checkbox label="Disabled checked" disabled checked />
            <Checkbox label="Error" error />
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Size SM 16px / MD 18px • Border #E5E3DF • Checked bg #49339A • Radius 4px</div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>With Label</h4>
            <Checkbox label="Send email notification" checked />
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>With Description — label + description clickable</h4>
            <Checkbox label="Include unsubscribed leads" description="Allows contacts who previously opted out to appear in this internal view." />
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Sizes — SM / MD</h4>
            <div style={{ display: "flex", gap: 16 }}>
              <Checkbox size="sm" label="SM 16px" checked />
              <Checkbox size="md" label="MD 18px" checked />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Checkbox Group — Lead Sources • Vertical / Horizontal</h4>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Vertical (default)</div>
          <CheckboxGroup layout="vertical">
            <Checkbox label="Website" checked />
            <Checkbox label="Import" checked />
            <Checkbox label="Referral" />
            <Checkbox label="LinkedIn" />
            <Checkbox label="Manual" />
          </CheckboxGroup>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginTop: 16, marginBottom: 8 }}>Horizontal</div>
          <CheckboxGroup layout="horizontal">
            <Checkbox label="Website" checked />
            <Checkbox label="Import" checked />
            <Checkbox label="Referral" />
          </CheckboxGroup>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Indeterminate — Important for tables</h4>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", display: "flex", gap: 10, alignItems: "center" }}>
              <Checkbox indeterminate checked={false} label="Select all" />
              <span style={{ fontSize: 11, color: "#9299A8", marginLeft: "auto" }}>Some rows selected</span>
            </div>
            <div style={{ padding: 14, display: "grid", gap: 8 }}>
              <Checkbox label="Glow Dentistry" checked />
              <Checkbox label="Leith Optical" checked />
              <Checkbox label="VIVA SKIN CLINICS" />
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#60697A" }}>
            <div>Unchecked: no rows selected</div><div>Indeterminate [-]: some rows selected</div><div>Checked: all selected</div>
          </div>
        </div>
      </div>
    </div>
  );
}
