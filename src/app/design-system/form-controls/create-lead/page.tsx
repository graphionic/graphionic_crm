"use client";
import { FormField, FieldLabel, FieldDescription } from "@/components/ui/FormField";
import { Input, CharacterCounter } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";

export default function CreateLeadForm() {
  return (
    <div style={{ maxWidth: 800, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>CREATE LEAD FORM</span>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginTop: 12, marginBottom: 4 }}>Create Lead</h1>
        <p style={{ fontSize: 13, color: "#60697A" }}>Add a new prospect to your outreach workspace.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: 24 }}>
        {/* Basic Information */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>BASIC INFORMATION</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField><FieldLabel required>First Name</FieldLabel><Input placeholder="Sarah" /></FormField>
            <FormField><FieldLabel required>Last Name</FieldLabel><Input placeholder="Johnson" /></FormField>
            <FormField style={{ gridColumn: "span 2" }}><FieldLabel>Job Title</FieldLabel><Input placeholder="Marketing Director" /></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>CONTACT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField><FieldLabel required>Email</FieldLabel><Input placeholder="sarah@acme.com" /></FormField>
            <FormField><FieldLabel>Phone</FieldLabel><Input prefix="+91" placeholder="98765 43210" /></FormField>
            <FormField style={{ gridColumn: "span 2" }}><FieldLabel>LinkedIn URL</FieldLabel><Input prefix="https://" placeholder="linkedin.com/in/sarahjohnson" /></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>COMPANY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField><FieldLabel required>Company Name</FieldLabel><Input placeholder="Acme Inc" /></FormField>
            <FormField><FieldLabel>Website</FieldLabel><Input prefix="https://" placeholder="acme.com" /></FormField>
            <FormField><FieldLabel>Industry</FieldLabel><div style={{ height: 42, border: "1px dashed #E5E3DF", borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", color: "#9299A8", fontSize: 13 }}>Select industry — placeholder for Select</div></FormField>
            <FormField><FieldLabel>Employee Count</FieldLabel><Input placeholder="50-100" /></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>LEAD DETAILS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField><FieldLabel>Lead Source</FieldLabel><div style={{ height: 42, border: "1px dashed #E5E3DF", borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", color: "#9299A8", fontSize: 13 }}>Select source — placeholder</div></FormField>
            <FormField><FieldLabel>Estimated Value</FieldLabel><Input prefix="₹" placeholder="50,000" /></FormField>
            <FormField><FieldLabel>Assigned Owner</FieldLabel><div style={{ height: 42, border: "1px dashed #E5E3DF", borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", color: "#9299A8", fontSize: 13 }}>Select owner — placeholder</div></FormField>
            <FormField><FieldLabel>Status</FieldLabel><div style={{ height: 42, border: "1px dashed #E5E3DF", borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", color: "#9299A8", fontSize: 13 }}>Select status — placeholder</div></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>NOTES</div>
          <FormField>
            <FieldLabel>Internal Notes</FieldLabel>
            <Textarea placeholder="Add notes about this lead..." />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <FieldDescription>Visible to team only</FieldDescription>
              <CharacterCounter current={0} max={500} />
            </div>
          </FormField>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>PREFERENCES</div>
          <div style={{ display: "grid", gap: 12 }}>
            <Checkbox label="Send assignment notification" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid #FAF9F7" }}>
              <span style={{ fontSize: 13, color: "#151927" }}>Email tracking</span>
              <Switch checked onChange={() => {}} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #F0EEEA" }}>
          <Button variant="secondary">Cancel</Button>
          <Button>Create Lead</Button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#9299A8" }}>Form uses reusable primitives: FormField, FieldLabel, Input, Textarea, Checkbox, Switch, Button • Two-column for related short fields, full-width for long • Lead Source/Industry/Owner/Status placeholders for upcoming Select</div>
    </div>
  );
}
