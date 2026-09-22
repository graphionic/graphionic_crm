"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription, FieldError, FieldSuccess } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export default function ValidationPage() {
  const [email, setEmail] = useState("mayank@");
  const [emailTouched, setEmailTouched] = useState(false);
  const isEmailValid = email.includes("@") && email.includes(".") && email.length > 5;

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>25 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Form Validation</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Required, Invalid format, Min/Max, Pattern, Duplicate, Server, Cross-field. Timing on blur/submit/live correction, not aggressive before interaction.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Validation Types</h4>
          <div style={{ display: "grid", gap: 14 }}>
            <FormField><FieldLabel required>Required</FieldLabel><Input placeholder="Required field" /><FieldError>This field is required.</FieldError></FormField>
            <FormField><FieldLabel>Invalid format</FieldLabel><Input state="error" defaultValue="invalid-email" /><FieldError>Enter a valid email address.</FieldError></FormField>
            <FormField><FieldLabel>Minimum</FieldLabel><Input state="error" defaultValue="ab" /><FieldError>Minimum 3 characters.</FieldError></FormField>
            <FormField><FieldLabel>Duplicate — Server validation</FieldLabel><Input state="error" defaultValue="john@acme.com" /><FieldError>A lead with this email already exists. <a style={{ color: "#49339A", fontWeight: 500 }}>View existing lead →</a></FieldError></FormField>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Validation Timing — On blur / On submit / Live correction</h4>
            <FormField>
              <FieldLabel required>Email address</FieldLabel>
              <Input state={emailTouched && !isEmailValid ? "error" : emailTouched && isEmailValid ? "success" : "default"} value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)} placeholder="mayank@company.com" />
              {emailTouched && !isEmailValid && <FieldError>Enter a valid email address.</FieldError>}
              {emailTouched && isEmailValid && <FieldSuccess>Valid email</FieldSuccess>}
              {!emailTouched && <FieldDescription>Blur to validate, then live correction</FieldDescription>}
            </FormField>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 10 }}>Do not display errors aggressively before user interacts. On blur, on submit, live correction after existing error.</div>
          </div>

          <div style={{ background: "#FDECEC", border: "1px solid #FBD5D5", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#B93E3E", marginBottom: 8 }}>Form-level Error</h4>
            <div style={{ background: "white", border: "1px solid #FBD5D5", borderRadius: 8, padding: 12, fontSize: 12, color: "#B93E3E", marginBottom: 12 }}>We couldn't save this lead. Please correct the 3 highlighted fields below.</div>
            <div style={{ fontSize: 11, color: "#60697A" }}>Then highlight individual fields below — not only generic toast</div>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Success Feedback — Only when useful</h4>
            <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.5 }}>Avoid turning every valid field green. Use explicit success only for: username availability, email verification, API validation, password confirmation.</div>
            <div style={{ marginTop: 10 }}>
              <FormField><FieldLabel>Email</FieldLabel><Input state="success" defaultValue="mayank@company.com" /><FieldSuccess>Valid email</FieldSuccess></FormField>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Form Layouts — Single / Two Column / Inline / Compact</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6 }}>Single Column — Focused workflow</div>
              <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, display: "grid", gap: 12 }}>
                <Input placeholder="Campaign Name" /><Input placeholder="Subject" /><Textarea placeholder="Message" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6 }}>Two Column — Related short fields</div>
              <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Input placeholder="First Name" /><Input placeholder="Last Name" /><Input placeholder="Company" /><Input placeholder="Job Title" />
                </div>
                <div style={{ marginTop: 12 }}><Textarea placeholder="Notes — spans full width" /></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Required Field Rule & Form Actions</h4>
          <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.5, marginBottom: 12 }}>
            If most fields required: mark optional. If few required: mark required. Do not mix randomly.<br/><br/>
            Desktop actions: right-aligned Cancel + Primary<br/>
            Mobile: full-width stacked or primary full-width<br/>
            Long forms: sticky footer
          </div>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="secondary" size="sm">Cancel</Button>
              <Button size="sm">Create Lead</Button>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Reuse approved Button components • Desktop right-aligned • Mobile full-width</div>
        </div>
      </div>
    </div>
  );
}
