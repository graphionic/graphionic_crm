"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription, FieldError } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";

export default function SelectPage() {
  const [status, setStatus] = useState("qualified");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("aarav");
  const [grouped, setGrouped] = useState("website");

  const statusOptions = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "proposal", label: "Proposal Sent" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
  ];

  const statusWithDesc = [
    { value: "new", label: "New", description: "Recently added, not yet contacted" },
    { value: "contacted", label: "Contacted", description: "Initial outreach sent" },
    { value: "qualified", label: "Qualified", description: "Lead has demonstrated interest." },
    { value: "proposal", label: "Proposal Sent", description: "Proposal shared, awaiting decision" },
    { value: "won", label: "Won", description: "Converted to customer" },
    { value: "lost", label: "Lost", description: "No longer pursuing" },
  ];

  const ownerOptions = [
    { value: "aarav", label: "Aarav Patel", metadata: "Sales Manager · 24 leads" },
    { value: "neha", label: "Neha Shah", metadata: "Account Manager · 18 leads" },
    { value: "rohan", label: "Rohan Mehta", metadata: "Sales Executive · 32 leads" },
    { value: "priya", label: "Priya Nair", metadata: "Customer Success", disabled: true },
  ];

  const groupedOptions = [
    { label: "INBOUND", options: [{ value: "website", label: "Website" }, { value: "landing", label: "Landing Page" }, { value: "referral", label: "Referral" }] },
    { label: "OUTBOUND", options: [{ value: "linkedin", label: "LinkedIn" }, { value: "cold", label: "Cold Email" }, { value: "manual", label: "Manual Prospecting" }] },
    { label: "IMPORT", options: [{ value: "csv", label: "CSV Import" }, { value: "api", label: "API" }] },
  ];

  const statusWithDot = [
    { value: "new", label: "New", color: "#9299A8" },
    { value: "contacted", label: "Contacted", color: "#62BDD4" },
    { value: "qualified", label: "Qualified", color: "#4FAE91" },
    { value: "proposal", label: "Proposal Sent", color: "#F4BE52" },
    { value: "won", label: "Won", color: "#49339A" },
    { value: "lost", label: "Lost", color: "#EC6262" },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>16 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Select</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Reusable Select primitive. Same height/border/radius/typography/focus/validation as Input. Supports placeholder, icons, descriptions, groups, clearable.</p>
      </div>

      {/* Anatomy + Sizes */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Anatomy — Label Required/Optional + Trigger + Helper/Validation + Dropdown</h3>
          <FormField>
            <FieldLabel required>Lead Status</FieldLabel>
            <Select options={statusOptions} value={status} onChange={setStatus} placeholder="Select status" />
            <FieldDescription>Current stage in pipeline</FieldDescription>
          </FormField>
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Sizes — SM 36 / MD 42 DEFAULT / LG 48 — radius 8</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <Select size="sm" options={statusOptions} value={status} onChange={setStatus} placeholder="SM — Select status" />
              <Select size="md" options={statusOptions} value={status} onChange={setStatus} placeholder="MD — Select status" />
              <Select size="lg" options={statusOptions} value={status} onChange={setStatus} placeholder="LG — Select status" />
            </div>
          </div>
        </div>

        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 12 }}>States</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Default</div><Select options={statusOptions} placeholder="Select status" /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Hover (visual)</div><Select options={statusOptions} placeholder="Hover" /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Focus/Open — indigo border + ring</div><Select options={statusOptions} value="qualified" onChange={() => {}} placeholder="Open" /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Error</div><Select state="error" options={statusOptions} placeholder="Select status" /><FieldError>Required</FieldError></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Disabled</div><Select disabled options={statusOptions} placeholder="Disabled" /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>ReadOnly</div><Select readOnly options={statusOptions} value="qualified" onChange={() => {}} /></div>
          </div>
        </div>
      </div>

      {/* Dropdown Open + Option Structure */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Dropdown — OPEN state must be shown</h4>
          <FormField>
            <FieldLabel>Lead Status — open</FieldLabel>
            <Select options={statusOptions} value={status} onChange={setStatus} placeholder="Select status" />
          </FormField>
          <div style={{ marginTop: 12, fontSize: 11, color: "#60697A" }}>Selected obvious #F0ECFA bg + ✓ + indigo text. Hovered #FAF9F7. Keyboard-focused distinguishable. Do NOT heavy background for every option.</div>
          <div style={{ marginTop: 12, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Dropdown specs</div>
            <div style={{ fontSize: 11, color: "#60697A", lineHeight: 1.6 }}>
              Min-width 200, white bg, border #E5E3DF, radius 10, shadow 0 4px 16px rgba(21,25,39,0.10), padding 6, gap 2, item 8px 10px radius 6, active #F0ECFA, hover #FAF9F7
            </div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Option Structure</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Simple — Qualified</div><Select options={[{ value: "q", label: "Qualified" }]} value="q" onChange={() => {}} /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Icon option — ● Qualified</div><Select options={statusWithDot} value="qualified" onChange={() => {}} /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>With description</div><Select options={statusWithDesc} value="qualified" onChange={() => {}} /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>With metadata — John Smith Sales Manager · 24 leads</div><Select options={ownerOptions} value={owner} onChange={setOwner} /></div>
            <div><div style={{ fontSize: 11, color: "#9299A8", marginBottom: 4 }}>Disabled option</div><Select options={ownerOptions} value="aarav" onChange={() => {}} /></div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Grouped Select</h4>
          <FormField>
            <FieldLabel>Lead Source</FieldLabel>
            <Select groups={groupedOptions} value={grouped} onChange={setGrouped} placeholder="Select source" />
            <FieldDescription>Group headings subordinate 11px 600 uppercase #9299A8</FieldDescription>
          </FormField>
        </div>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Clearable Select</h4>
          <FormField>
            <FieldLabel>Assigned Owner</FieldLabel>
            <Select options={ownerOptions} value={owner} onChange={setOwner} placeholder="Select owner" clearable />
            <FieldDescription>Clicking × clears, chevron still opens. Do not confuse clear vs dropdown.</FieldDescription>
          </FormField>
        </div>
      </div>
    </div>
  );
}
