"use client";
import React, { useState, useRef, useEffect } from "react";

type Size = "sm" | "md" | "lg";
type PickerMode = "single" | "range" | "month" | "year";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  size?: Size;
  disabled?: boolean;
  state?: "default" | "error";
  mode?: PickerMode;
  presets?: { label: string; getValue: () => Date }[];
  style?: React.CSSProperties;
}

const sizeMap = {
  sm: { height: 36, fontSize: 13 },
  md: { height: 42, fontSize: 14 },
  lg: { height: 48, fontSize: 15 },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(d?: Date) {
  if (!d) return "";
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({ value, onChange, placeholder = "Select date", size = "md", disabled, state = "default", style }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const [rangeStart, setRangeStart] = useState<Date | undefined>(value);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>();
  const ref = useRef<HTMLDivElement>(null);
  const s = sizeMap[size];
  const today = new Date();

  useEffect(() => {
    const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startDay = (startOfMonth.getDay() + 6) % 7; // Mon=0
  const daysInMonth = endOfMonth.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", ...style }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: "100%",
          height: s.height,
          padding: `0 36px 0 14px`,
          border: `1px solid ${state === "error" ? "#EC6262" : open ? "#49339A" : "#E5E3DF"}`,
          borderRadius: 8,
          background: disabled ? "#FAF9F7" : "white",
          color: value ? "#151927" : "#9299A8",
          fontSize: s.fontSize,
          fontFamily: "'Poppins', sans-serif",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: open ? "0 0 0 3px #F0ECFA" : "none",
        }}
      >
        {value ? formatDate(value) : placeholder}
      </button>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9299A8" }}>📅</span>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: "1px solid #E5E3DF", borderRadius: 12, boxShadow: "0 8px 24px rgba(21,25,39,0.12)", padding: 16, zIndex: 50, minWidth: 300 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E3DF", background: "white", cursor: "pointer" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#151927", fontFamily: "'Poppins', sans-serif" }}>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E3DF", background: "white", cursor: "pointer" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
            {WEEKDAYS.map(w => <div key={w} style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", textAlign: "center", padding: "4px 0" }}>{w}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {days.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />;
              const isToday = isSameDay(d, today);
              const isSelected = value && isSameDay(d, value);
              return (
                <button
                  key={i}
                  onClick={() => { onChange?.(d); setOpen(false); }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: isToday && !isSelected ? "1px solid #49339A" : "1px solid transparent",
                    background: isSelected ? "#49339A" : "white",
                    color: isSelected ? "white" : isToday ? "#49339A" : "#151927",
                    fontSize: 12,
                    fontWeight: isSelected || isToday ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0EEEA" }}>
            <button onClick={() => { onChange?.(undefined); setOpen(false); }} style={{ fontSize: 12, color: "#60697A", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
            <button onClick={() => { onChange?.(today); setViewDate(today); }} style={{ fontSize: 12, color: "#49339A", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface DateRangePickerProps {
  start?: Date;
  end?: Date;
  onChange?: (start?: Date, end?: Date) => void;
  size?: Size;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function DateRangePicker({ start, end, onChange, size = "md", placeholder = "Select range", style }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | undefined>(start);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(end);
  const ref = useRef<HTMLDivElement>(null);
  const s = sizeMap[size];

  useEffect(() => {
    const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const display = start && end ? `${formatDate(start)} → ${formatDate(end)}` : start ? `${formatDate(start)} → ...` : placeholder;

  const presets = [
    { label: "Today", get: () => { const t = new Date(); return [t, t] as [Date, Date]; } },
    { label: "Yesterday", get: () => { const t = new Date(); t.setDate(t.getDate() - 1); return [t, t] as [Date, Date]; } },
    { label: "Last 7 Days", get: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 6); return [s, e] as [Date, Date]; } },
    { label: "Last 30 Days", get: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 29); return [s, e] as [Date, Date]; } },
    { label: "This Month", get: () => { const now = new Date(); return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)] as [Date, Date]; } },
    { label: "Last Month", get: () => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth() - 1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); return [first, last] as [Date, Date]; } },
  ];

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", ...style }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width: "100%", height: s.height, padding: "0 14px", border: `1px solid ${open ? "#49339A" : "#E5E3DF"}`, borderRadius: 8, background: "white", color: start ? "#151927" : "#9299A8", fontSize: s.fontSize, fontFamily: "'Poppins', sans-serif", textAlign: "left", boxShadow: open ? "0 0 0 3px #F0ECFA" : "none" }}>{display}</button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: "1px solid #E5E3DF", borderRadius: 12, boxShadow: "0 8px 24px rgba(21,25,39,0.12)", padding: 16, zIndex: 50, display: "flex", gap: 16, minWidth: 480 }}>
          <div style={{ minWidth: 120 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", marginBottom: 8, textTransform: "uppercase" }}>Presets</div>
            <div style={{ display: "grid", gap: 4 }}>
              {presets.map(p => (
                <button key={p.label} onClick={() => { const [s, e] = p.get(); setTempStart(s); setTempEnd(e); }} style={{ textAlign: "left", padding: "6px 10px", borderRadius: 6, border: "none", background: "white", fontSize: 12, color: "#60697A", cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>{p.label}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#151927", marginBottom: 8 }}>Start: {tempStart ? formatDate(tempStart) : "—"} | End: {tempEnd ? formatDate(tempEnd) : "—"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setTempStart(new Date())} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer" }}>Set Start Today</button>
              <button onClick={() => setTempEnd(new Date())} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer" }}>Set End Today</button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => setOpen(false)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { onChange?.(tempStart, tempEnd); setOpen(false); }} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#49339A", color: "white", fontSize: 12, cursor: "pointer" }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MonthPicker({ value, onChange, size = "md" }: { value?: Date; onChange?: (d: Date) => void; size?: Size }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(value?.getFullYear() || new Date().getFullYear());
  const s = sizeMap[size];
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", height: s.height, padding: "0 14px", border: "1px solid #E5E3DF", borderRadius: 8, background: "white", fontSize: s.fontSize, fontFamily: "'Poppins', sans-serif", textAlign: "left" }}>{value ? `${MONTHS[value.getMonth()]} ${value.getFullYear()}` : "Select month"}</button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 12, zIndex: 50, minWidth: 260 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button onClick={() => setYear(year - 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E3DF", background: "white" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{year}</span>
            <button onClick={() => setYear(year + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E5E3DF", background: "white" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {MONTHS.map((m, idx) => {
              const isSelected = value && value.getMonth() === idx && value.getFullYear() === year;
              return <button key={m} onClick={() => { onChange?.(new Date(year, idx, 1)); setOpen(false); }} style={{ padding: "8px", borderRadius: 6, border: "1px solid #E5E3DF", background: isSelected ? "#49339A" : "white", color: isSelected ? "white" : "#151927", fontSize: 12, cursor: "pointer" }}>{m.slice(0, 3)}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function YearPicker({ value, onChange, size = "md" }: { value?: number; onChange?: (y: number) => void; size?: Size }) {
  const [open, setOpen] = useState(false);
  const s = sizeMap[size];
  const years = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 10 + i);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", height: s.height, padding: "0 14px", border: "1px solid #E5E3DF", borderRadius: 8, background: "white", fontSize: s.fontSize, fontFamily: "'Poppins', sans-serif", textAlign: "left" }}>{value || "Select year"}</button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 8, zIndex: 50, minWidth: 200, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {years.map(y => {
            const sel = y === value;
            return <button key={y} onClick={() => { onChange?.(y); setOpen(false); }} style={{ padding: "6px", borderRadius: 6, border: "1px solid #E5E3DF", background: sel ? "#49339A" : "white", color: sel ? "white" : "#151927", fontSize: 12, cursor: "pointer" }}>{y}</button>;
          })}
        </div>
      )}
    </div>
  );
}
