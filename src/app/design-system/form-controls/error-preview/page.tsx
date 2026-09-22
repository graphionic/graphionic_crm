"use client";
import { FormField, FieldLabel, FieldDescription, FieldError } from "@/components/ui/FormField";
import { Input, CharacterCounter } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export default function ErrorPreview() {
  return (
    <div style={{ maxWidth: 800, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#EC6262", background: "#FDECEC", padding: "4px 10px", borderRadius: 6 }}>ERROR PREVIEW</span>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginTop: 12, marginBottom: 4 }}>Create Lead — Error State</h1>
        <p style={{ fontSize: 13, color: "#60697A" }}>Evaluate multiple validation states together: missing, invalid, duplicate, helper, character limit.</p>
      </div>

      <div style={{ background: "#FDECEC", border: "1px solid #FBD5D5", borderRadius: 10, padding: 12, fontSize: 12, color: "#B93E3E", marginBottom: 16 }}>We couldn't save this lead. Please correct the 3 highlighted fields below.</div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormField>
            <FieldLabel required>First Name</FieldLabel>
            <Input state="error" placeholder="First Name" />
            <FieldError>First name is required.</FieldError>
          </FormField>
          <FormField>
            <FieldLabel required>Last Name</FieldLabel>
            <Input defaultValue="Johnson" />
          </FormField>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormField>
            <FieldLabel required>Email</FieldLabel>
            <Input state="error" defaultValue="mayank@" />
            <FieldError>Enter a valid email address.</FieldError>
          </FormField>
          <FormField>
            <FieldLabel>Phone</FieldLabel>
            <Input defaultValue="+91 98765 43210" />
            <FieldDescription>Include country code</FieldDescription>
          </FormField>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormField>
            <FieldLabel required>Company Name</FieldLabel>
            <Input state="error" defaultValue="Glow Dentistry" />
            <FieldError>A lead with this company already exists. <span style={{ color: "#49339A", fontWeight: 500, cursor: "pointer" }}>View existing →</span></FieldError>
          </FormField>
          <FormField>
            <FieldLabel>Website</FieldLabel>
            <Input prefix="https://" defaultValue="glowdentistry.co.uk" />
          </FormField>
        </div>

        <FormField>
          <FieldLabel>Internal Notes</FieldLabel>
          <Textarea defaultValue={"This is a very long note that is near the character limit. ".repeat(10)} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <FieldDescription>Visible to team only</FieldDescription>
            <div style={{ fontSize: 11, color: "#F29B38" }}>480 / 500 — near limit</div>
          </div>
        </FormField>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #F0EEEA" }}>
          <Button variant="secondary">Cancel</Button>
          <Button>Create Lead</Button>
        </div>
      </div>
    </div>
  );
}
