"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription } from "@/components/ui/FormField";
import { DatePicker, DateRangePicker, MonthPicker, YearPicker } from "@/components/ui/DatePicker";

export default function DatePickerPage() {
  const [single, setSingle] = useState<Date | undefined>(new Date(2026, 8, 24));
  const [rangeStart, setRangeStart] = useState<Date | undefined>(new Date(2026, 8, 1));
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(new Date(2026, 8, 30));
  const [month, setMonth] = useState<Date | undefined>(new Date(2026, 8, 1));
  const [year, setYear] = useState<number>(2026);

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>22 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Date Picker</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Complete DatePicker system. Single, range, month, year, presets. Must visually match ClientForge — same height/border/radius/typography as Input.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Date Input — Follow-up Date</h4>
          <FormField>
            <FieldLabel>Follow-up Date</FieldLabel>
            <DatePicker value={single} onChange={setSingle} placeholder="Select date" />
            <FieldDescription>[ 24 Sep 2026 calendar ] Clicking opens calendar. Allow keyboard entry where appropriate.</FieldDescription>
          </FormField>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Calendar Anatomy</h4>
            <div style={{ fontSize: 11, color: "#60697A", lineHeight: 1.6 }}>
              Header: September 2026 Prev/Next<br/>
              Weekdays: Mon Tue Wed Thu Fri Sat Sun<br/>
              States: default / hover / today / selected / range start/middle/end / disabled / outside month / keyboard focus
            </div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Single Date — Next Follow-up 24 Sep 2026</h4>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E3DF", background: "white" }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>September 2026</span>
              <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E3DF", background: "white" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(w => <div key={w} style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", textAlign: "center", padding: "4px 0" }}>{w}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {Array.from({ length: 30 }, (_, i) => {
                const isSelected = i === 23;
                const isToday = i === 10;
                return <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: isSelected ? "#49339A" : "white", color: isSelected ? "white" : isToday ? "#49339A" : "#151927", border: isToday && !isSelected ? "1px solid #49339A" : "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isSelected || isToday ? 600 : 400 }}>{i + 1}</div>;
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Date Range — Campaign Period [01 Sep → 30 Sep]</h4>
          <FormField>
            <FieldLabel>Campaign Period</FieldLabel>
            <DateRangePicker start={rangeStart} end={rangeEnd} onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }} />
            <FieldDescription>Open calendar supports range selection — show start/middle/end clearly</FieldDescription>
          </FormField>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Range Presets — CRM useful</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month", "This Quarter", "Custom Range"].map(p => <span key={p} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, color: "#60697A" }}>{p}</span>)}
            </div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 6 }}>For analytics filters appear beside calendar</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Month Picker — Reporting Month September 2026</h4>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Year Picker — Useful for reporting</h4>
            <YearPicker value={year} onChange={setYear} />
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Do not make users click prev-month 80 times to reach another year</div>
          </div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Disabled Dates</h4>
            <div style={{ fontSize: 12, color: "#60697A" }}>Show past dates disabled or business-specific unavailable. Do not rely only on opacity.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
