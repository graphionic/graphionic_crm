"use client";
import { useState } from "react";
import { Radio, RadioGroup, CardRadio } from "@/components/ui/Radio";

export default function RadioPage() {
  const [campaignType, setCampaignType] = useState("followup");
  const [assignment, setAssignment] = useState("manual");

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>20 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Radio</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>One option from mutually exclusive group. States Default/Hover/Selected/Focus/Disabled/Error, with description, card radio for settings with extra context.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>States</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <Radio label="Default" name="state" />
            <Radio label="Hover (visual)" name="state2" style={{ background: "#FAF9F7", padding: 6, borderRadius: 6 }} />
            <Radio label="Selected" name="state3" checked onChange={() => {}} />
            <Radio label="Focus — indigo ring" name="state4" checked onChange={() => {}} style={{ outline: "2px solid #49339A", outlineOffset: 2, borderRadius: 20 }} />
            <Radio label="Disabled" name="state5" disabled />
            <Radio label="Error" name="state6" error />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Radio Group — Campaign Type</h4>
            <RadioGroup>
              <Radio label="Email Outreach" name="campaign" checked={campaignType === "email"} onChange={() => setCampaignType("email")} />
              <Radio label="Follow-up Sequence" name="campaign" checked={campaignType === "followup"} onChange={() => setCampaignType("followup")} />
              <Radio label="Re-engagement" name="campaign" checked={campaignType === "reengage"} onChange={() => setCampaignType("reengage")} />
            </RadioGroup>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>With Description</h4>
            <RadioGroup>
              <Radio label="Manual assignment" description="Team members are selected manually." name="assign" checked={assignment === "manual"} onChange={() => setAssignment("manual")} />
              <Radio label="Automatic assignment" description="Leads are distributed using assignment rules." name="assign" checked={assignment === "auto"} onChange={() => setAssignment("auto")} />
            </RadioGroup>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Card Radio — Selectable card-style for settings with extra context • Not for simple yes/no</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, maxWidth: 700 }}>
          <CardRadio selected={assignment === "manual"} title="Round Robin" description="Distribute leads evenly across team members. Fair and balanced." onClick={() => setAssignment("manual")} />
          <CardRadio selected={assignment === "auto"} title="Manual" description="Select the owner yourself. Full control over assignment." onClick={() => setAssignment("auto")} />
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Card: border #E5E3DF, selected #49339A + #F0ECFA bg, radius 10px, padding 16px, 18px radio + 8px dot #49339A</div>
      </div>
    </div>
  );
}
