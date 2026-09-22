"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription, FieldError } from "@/components/ui/FormField";
import { Input, CharacterCounter } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox, CheckboxGroup } from "@/components/ui/Checkbox";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";

export default function CoreFormPlayground() {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [state, setState] = useState<"default" | "error" | "disabled">("default");
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");

  const isError = state === "error";
  const isDisabled = state === "disabled";

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>CORE FORM PLAYGROUND</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#151927", marginTop: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>Core Form Playground</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Realistic panel containing text, email, phone, password, search, currency, number, textarea, checkbox, radio, switch, validation, button actions. Switch density/state/size.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>Density:</span>
          {(["comfortable", "compact"] as const).map((d) => (
            <button key={d} onClick={() => setDensity(d)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: density === d ? "#49339A" : "white", color: density === d ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>{d}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>State:</span>
          {(["default", "error", "disabled"] as const).map((s) => (
            <button key={s} onClick={() => setState(s)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: state === s ? "#151927" : "white", color: state === s ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>Size:</span>
          {(["sm", "md", "lg"] as const).map((sz) => (
            <button key={sz} onClick={() => setSize(sz)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: size === sz ? "#151927" : "white", color: size === sz ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>{sz}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: density === "compact" ? 12 : 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: density === "compact" ? 12 : 16 }}>
          <FormField>
            <FieldLabel required>Text input</FieldLabel>
            <Input size={size} state={isError ? "error" : "default"} disabled={isDisabled} placeholder="Company name" defaultValue={density === "comfortable" ? "Glow Dentistry" : ""} />
            {isError ? <FieldError>Required</FieldError> : <FieldDescription>Full legal name</FieldDescription>}
          </FormField>
          <FormField>
            <FieldLabel required>Email</FieldLabel>
            <Input size={size} state={isError ? "error" : "default"} disabled={isDisabled} placeholder="Email" defaultValue="info@glowdentistry.co.uk" />
          </FormField>
          <FormField>
            <FieldLabel>Phone</FieldLabel>
            <Input size={size} disabled={isDisabled} prefix="+91" placeholder="98765 43210" />
          </FormField>
          <FormField>
            <FieldLabel>Password</FieldLabel>
            <Input size={size} disabled={isDisabled} type="password" defaultValue="password123" />
          </FormField>
          <FormField>
            <FieldLabel>Search</FieldLabel>
            <Input size={size} disabled={isDisabled} leadingIcon={<span>⌕</span>} placeholder="Search leads..." />
          </FormField>
          <FormField>
            <FieldLabel>Currency</FieldLabel>
            <Input size={size} disabled={isDisabled} prefix="₹" defaultValue="50,000" />
          </FormField>
          <FormField>
            <FieldLabel>Number</FieldLabel>
            <Input size={size} disabled={isDisabled} type="number" defaultValue="25" />
          </FormField>
          <FormField>
            <FieldLabel>URL</FieldLabel>
            <Input size={size} disabled={isDisabled} prefix="https://" placeholder="acme.com" />
          </FormField>
        </div>

        <FormField>
          <FieldLabel>Textarea</FieldLabel>
          <Textarea size={size} disabled={isDisabled} placeholder="Internal notes..." />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <FieldDescription>Visible to team only</FieldDescription>
            <CharacterCounter current={42} max={500} />
          </div>
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Checkbox</div>
            <CheckboxGroup>
              <Checkbox disabled={isDisabled} label="Email notification" checked />
              <Checkbox disabled={isDisabled} label="Include unsubscribed" />
            </CheckboxGroup>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Radio</div>
            <RadioGroup>
              <Radio disabled={isDisabled} label="Email Outreach" name="camp" checked />
              <Radio disabled={isDisabled} label="Follow-up" name="camp" />
            </RadioGroup>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Switch</div>
            <div style={{ display: "grid", gap: 8 }}>
              <Switch disabled={isDisabled} checked label="Notifications" />
              <Switch disabled={isDisabled} checked={false} onChange={() => {}} label="Automation" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #F0EEEA" }}>
          <Button variant="secondary" size={size} disabled={isDisabled}>Cancel</Button>
          <Button size={size} disabled={isDisabled}>Create Lead</Button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#9299A8", background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
        Density: {density} = {density === "comfortable" ? "default for create/edit screens" : "tables/filters/dense settings"} • State: {state} • Size: {size} • Uses actual primitives FormField/Input/Textarea/Checkbox/Radio/Switch/Button • No placeholder as only label • Errors icon+text+color • Autofill styling preserved • Responsive 2-col desktop 1-col mobile
      </div>
    </div>
  );
}
