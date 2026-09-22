"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription } from "@/components/ui/FormField";
import { Input, CharacterCounter } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { UserSelector, StatusSelector, CompanySelector, TagSelector } from "@/components/ui/AdvancedSelectors";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { DropZone } from "@/components/ui/FileUpload";

export default function CreateLeadForm() {
  const [leadSource, setLeadSource] = useState("");
  const [industry, setIndustry] = useState("");
  const [owner, setOwner] = useState("aarav");
  const [status, setStatus] = useState("new");
  const [tags, setTags] = useState<string[]>(["saas"]);
  const [followupDate, setFollowupDate] = useState<Date | undefined>(new Date(2026, 8, 24));
  const [followupTime, setFollowupTime] = useState("10 : 30 AM");

  const sourceOptions = [
    { value: "website", label: "Website" },
    { value: "referral", label: "Referral" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "cold", label: "Cold Email" },
  ];

  const industryOptions = [
    { value: "tech", label: "Technology" },
    { value: "health", label: "Healthcare" },
    { value: "finance", label: "Finance" },
    { value: "dental", label: "Dental" },
  ];

  return (
    <div style={{ maxWidth: 800, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>ADVANCED CREATE LEAD FORM</span>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginTop: 12, marginBottom: 4 }}>Create Lead — Advanced</h1>
        <p style={{ fontSize: 13, color: "#60697A" }}>Now using actual advanced components: Select, Searchable Select, User, Status, Multi Select, Date/Time Pickers, File Upload. Same approved fields for rest.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: 24 }}>
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
            <FormField><FieldLabel>Industry</FieldLabel><SearchableSelect options={industryOptions} value={industry} onChange={setIndustry} placeholder="Select industry" /></FormField>
            <FormField><FieldLabel>Employee Count</FieldLabel><Input placeholder="50-100" /></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>LEAD DETAILS — Advanced Selectors</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField><FieldLabel>Lead Source</FieldLabel><Select options={sourceOptions} value={leadSource} onChange={setLeadSource} placeholder="Select source" /></FormField>
            <FormField><FieldLabel>Estimated Value</FieldLabel><Input prefix="₹" placeholder="50,000" /></FormField>
            <FormField><FieldLabel>Assigned Owner</FieldLabel><UserSelector value={owner} onChange={setOwner} /></FormField>
            <FormField><FieldLabel>Status</FieldLabel><StatusSelector value={status} onChange={setStatus} /></FormField>
            <FormField style={{ gridColumn: "span 2" }}><FieldLabel>Tags</FieldLabel><TagSelector value={tags} onChange={setTags} /></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>FOLLOW-UP — Date & Time</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField><FieldLabel>Next Follow-up</FieldLabel><DatePicker value={followupDate} onChange={setFollowupDate} /></FormField>
            <FormField><FieldLabel>Follow-up Time</FieldLabel><TimePicker value={followupTime} onChange={setFollowupTime} /></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>ATTACHMENT</div>
          <FormField><FieldLabel>Attachment</FieldLabel><DropZone accept=".pdf,.png,.xlsx" maxSize="5 MB" label="Drop file or browse" description="PDF, PNG, XLSX up to 5 MB" /></FormField>
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
    </div>
  );
}
