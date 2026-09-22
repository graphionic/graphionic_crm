"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TagSelector, mockUsers } from "@/components/ui/AdvancedSelectors";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { TimezoneSelector } from "@/components/ui/AdvancedSelectors";
import { DropZone } from "@/components/ui/FileUpload";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { SelectOption } from "@/components/ui/Select";

export default function CreateCampaignForm() {
  const [campaignType, setCampaignType] = useState("email");
  const [tags, setTags] = useState<string[]>(["saas", "enterprise"]);
  const [team, setTeam] = useState<string[]>(["aarav", "neha"]);
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 8, 24));
  const [time, setTime] = useState("10 : 30 AM");
  const [tz, setTz] = useState("Asia/Kolkata");

  const typeOptions = [
    { value: "email", label: "Email Outreach" },
    { value: "followup", label: "Follow-up Sequence" },
    { value: "reengage", label: "Re-engagement" },
  ];

  const userOptions: SelectOption[] = [
    { value: "aarav", label: "Aarav Patel" },
    { value: "neha", label: "Neha Shah" },
    { value: "rohan", label: "Rohan Mehta" },
    { value: "priya", label: "Priya Nair" },
  ];

  return (
    <div style={{ maxWidth: 800, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>CREATE CAMPAIGN FORM</span>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginTop: 12, marginBottom: 4 }}>Create Campaign</h1>
        <p style={{ fontSize: 13, color: "#60697A" }}>Second realistic form using advanced selectors: campaign type, audience tags, team, schedule date/time/timezone, attachment, tracking switches.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>CAMPAIGN DETAILS</div>
          <div style={{ display: "grid", gap: 16 }}>
            <FormField><FieldLabel required>Campaign Name</FieldLabel><Input placeholder="Q4 SaaS Outreach" /></FormField>
            <FormField><FieldLabel required>Campaign Type</FieldLabel><Select options={typeOptions} value={campaignType} onChange={setCampaignType} /></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>AUDIENCE</div>
          <div style={{ display: "grid", gap: 16 }}>
            <FormField><FieldLabel required>Audience Tags</FieldLabel><TagSelector value={tags} onChange={setTags} /><FieldDescription>[SaaS ×] [Enterprise ×] +2 collapsed</FieldDescription></FormField>
            <FormField><FieldLabel>Assigned Team</FieldLabel><MultiSelect options={userOptions} value={team} onChange={setTeam} placeholder="Select team" collapseAfter={2} /><FieldDescription>[AP Aarav ×] [NS Neha ×]</FieldDescription></FormField>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>SCHEDULE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField><FieldLabel required>Date</FieldLabel><DatePicker value={date} onChange={setDate} /></FormField>
            <FormField><FieldLabel required>Time</FieldLabel><TimePicker value={time} onChange={setTime} /></FormField>
            <FormField style={{ gridColumn: "span 2" }}><FieldLabel required>Timezone</FieldLabel><TimezoneSelector value={tz} onChange={setTz} /></FormField>
          </div>
          {date && (
            <div style={{ marginTop: 12, background: "#F0ECFA", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, fontSize: 12, color: "#49339A" }}>
              Campaign will be sent {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at {time} IST.
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>ATTACHMENT</div>
          <FormField><FieldLabel>Attachment</FieldLabel><DropZone label="Drop file / Browse" description="PDF, images, docs up to 10 MB" accept=".pdf,.png,.jpg,.xlsx" maxSize="10 MB" /></FormField>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#9299A8", marginBottom: 16 }}>TRACKING</div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "#151927" }}>Track opens</span><Switch checked onChange={() => {}} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: "#151927" }}>Track link clicks</span><Switch checked onChange={() => {}} /></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #F0EEEA" }}>
          <Button variant="secondary">Cancel</Button>
          <Button variant="secondary">Save Draft</Button>
          <Button>Create Campaign</Button>
        </div>
      </div>
    </div>
  );
}
