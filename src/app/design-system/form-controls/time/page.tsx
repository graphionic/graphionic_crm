"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription } from "@/components/ui/FormField";
import { TimePicker } from "@/components/ui/TimePicker";
import { TimezoneSelector } from "@/components/ui/AdvancedSelectors";
import { DatePicker } from "@/components/ui/DatePicker";

export default function TimePickerPage() {
  const [time, setTime] = useState("10 : 30 AM");
  const [time24, setTime24] = useState("14:30");
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 8, 24));
  const [tz, setTz] = useState("Asia/Kolkata");

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>23 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Time Picker</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>TimePicker, DateTimePicker, scheduling example. Same family as Input. Supports 12h/24h configurable, minute increments 1/5/10/15/30.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Campaign Send Time [10 : 30 AM clock]</h4>
          <FormField>
            <FieldLabel>Campaign Send Time</FieldLabel>
            <TimePicker value={time} onChange={setTime} format="12h" minuteStep={15} />
            <FieldDescription>Default Focus Selected Disabled Error states — same as Input</FieldDescription>
          </FormField>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <FormField><FieldLabel>12-hour</FieldLabel><TimePicker value={time} onChange={setTime} format="12h" /></FormField>
            <FormField><FieldLabel>24-hour</FieldLabel><TimePicker value={time24} onChange={setTime24} format="24h" /></FormField>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Time Dropdown — Hour / Minute / AM/PM</h4>
            <div style={{ display: "flex", border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden", height: 180 }}>
              <div style={{ flex: 1, borderRight: "1px solid #F0EEEA", overflowY: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", padding: "8px 10px", position: "sticky", top: 0, background: "white" }}>Hour</div>
                {[9, 10, 11, 12, 1, 2].map(h => <div key={h} style={{ padding: "6px 12px", fontSize: 12, background: h === 10 ? "#F0ECFA" : "white", color: h === 10 ? "#49339A" : "#151927", fontWeight: h === 10 ? 600 : 400 }}>{h.toString().padStart(2, "0")}</div>)}
              </div>
              <div style={{ flex: 1, borderRight: "1px solid #F0EEEA", overflowY: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", padding: "8px 10px", position: "sticky", top: 0, background: "white" }}>Minute</div>
                {[0, 15, 30, 45].map(m => <div key={m} style={{ padding: "6px 12px", fontSize: 12, background: m === 30 ? "#F0ECFA" : "white", color: m === 30 ? "#49339A" : "#151927", fontWeight: m === 30 ? 600 : 400 }}>{m.toString().padStart(2, "0")}</div>)}
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", padding: "8px 10px", position: "sticky", top: 0, background: "white" }}>AM/PM</div>
                {["AM", "PM"].map(ap => <div key={ap} style={{ padding: "6px 12px", fontSize: 12, background: ap === "AM" ? "#F0ECFA" : "white", color: ap === "AM" ? "#49339A" : "#151927", fontWeight: ap === "AM" ? 600 : 400 }}>{ap}</div>)}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 6 }}>Minute increments configurable: 1/5/10/15/30 depending on use case</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Date + Time — DateTimePicker composition</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <FormField><FieldLabel>Date</FieldLabel><DatePicker value={date} onChange={setDate} /></FormField>
              <FormField><FieldLabel>Time</FieldLabel><TimePicker value={time} onChange={setTime} /></FormField>
              <FormField><FieldLabel>Timezone</FieldLabel><TimezoneSelector value={tz} onChange={setTz} /></FormField>
            </div>
            {date && (
              <div style={{ marginTop: 12, background: "#F0ECFA", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, fontSize: 12, color: "#49339A" }}>
                Campaign will be sent {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at {time} IST.
              </div>
            )}
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Scheduling Example — Schedule Campaign</h4>
            <div style={{ display: "grid", gap: 12 }}>
              <FormField><FieldLabel required>Send Date</FieldLabel><DatePicker value={date} onChange={setDate} /></FormField>
              <FormField><FieldLabel required>Send Time</FieldLabel><TimePicker value={time} onChange={setTime} /></FormField>
              <FormField><FieldLabel required>Timezone</FieldLabel><TimezoneSelector value={tz} onChange={setTz} /></FormField>
            </div>
            <div style={{ marginTop: 12, padding: 12, background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 4 }}>Summary:</div>
              <div style={{ fontSize: 12, color: "#151927" }}>Campaign will be sent<br/>{date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"} at {time} IST.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
