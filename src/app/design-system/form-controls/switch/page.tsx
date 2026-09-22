"use client";
import { useState } from "react";
import { Switch } from "@/components/ui/Switch";

export default function SwitchPage() {
  const [notif, setNotif] = useState(true);
  const [tracking, setTracking] = useState(true);
  const [automation, setAutomation] = useState(false);

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>21 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Switch</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Immediate binary settings — On/Off. Not for actions requiring Save unless clearly communicated. SM/MD, with description.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>States — Off / On / Hover / Focus / Disabled Off / Disabled On</h3>
          <div style={{ display: "grid", gap: 14 }}>
            <Switch label="Off" checked={false} onChange={() => {}} />
            <Switch label="On" checked={true} onChange={() => {}} />
            <Switch label="Hover (visual)" checked={false} />
            <Switch label="Focus — indigo ring" checked={true} onChange={() => {}} />
            <Switch label="Disabled Off" disabled checked={false} onChange={() => {}} />
            <Switch label="Disabled On" disabled checked={true} onChange={() => {}} />
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Track Off #E5E3DF / On #49339A • Thumb white • SM 32×18 thumb 14 / MD 40×22 thumb 18 • Radius full</div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Sizes — SM / MD</h4>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <Switch size="sm" label="SM 32×18" checked onChange={() => {}} />
              <Switch size="md" label="MD 40×22" checked onChange={() => {}} />
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Immediate Settings Examples</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "#151927" }}>Enable notifications</span><Switch checked={notif} onChange={setNotif} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "#151927" }}>Track email opens</span><Switch checked={tracking} onChange={setTracking} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "#151927" }}>Enable automation</span><Switch checked={automation} onChange={setAutomation} /></div>
            </div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Do NOT use switch when Save required before effect unless UI clearly communicates</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>With Description</h4>
          <Switch checked={tracking} onChange={setTracking} label="Email Tracking" description="Track email opens and link clicks for outreach messages." />
        </div>

        <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Checkbox vs Radio vs Switch</h4>
          <div style={{ display: "grid", gap: 10, fontSize: 12 }}>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}><strong style={{ color: "#151927" }}>CHECKBOX</strong><br/><span style={{ color: "#60697A" }}>Independent selections, multiple options<br/>Ex: Lead Sources ☑ Website ☑ Import ☐ Referral</span></div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}><strong style={{ color: "#151927" }}>RADIO</strong><br/><span style={{ color: "#60697A" }}>One option from mutually exclusive group<br/>Ex: Campaign Type ○ Email ● Follow-up</span></div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10 }}><strong style={{ color: "#151927" }}>SWITCH</strong><br/><span style={{ color: "#60697A" }}>Immediate binary setting<br/>Ex: Enable notifications [ ON ]</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
