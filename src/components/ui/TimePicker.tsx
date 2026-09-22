"use client";
import React, { useState, useRef, useEffect } from "react";

type Size = "sm" | "md" | "lg";

interface TimePickerProps {
  value?: string; // "10:30 AM" or "14:30"
  onChange?: (value: string) => void;
  size?: Size;
  format?: "12h" | "24h";
  minuteStep?: 1 | 5 | 10 | 15 | 30;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const sizeMap = {
  sm: { height: 36, fontSize: 13 },
  md: { height: 42, fontSize: 14 },
  lg: { height: 48, fontSize: 15 },
};

export function TimePicker({ value, onChange, size = "md", format = "12h", minuteStep = 15, placeholder = "Select time", disabled, style }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState<number>(10);
  const [minute, setMinute] = useState<number>(30);
  const [ampm, setAmPm] = useState<"AM" | "PM">("AM");
  const ref = useRef<HTMLDivElement>(null);
  const s = sizeMap[size];

  useEffect(() => {
    const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  useEffect(() => {
    if (value) {
      // parse
      if (format === "12h") {
        const m = value.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (m) { setHour(parseInt(m[1])); setMinute(parseInt(m[2])); setAmPm(m[3].toUpperCase() as any); }
      } else {
        const m = value.match(/(\d+):(\d+)/);
        if (m) { setHour(parseInt(m[1])); setMinute(parseInt(m[2])); }
      }
    }
  }, []);

  const hours = format === "12h" ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  const display = value || placeholder;

  const apply = (h = hour, m = minute, ap = ampm) => {
    let out = "";
    if (format === "12h") out = `${h.toString().padStart(2, "0")} : ${m.toString().padStart(2, "0")} ${ap}`;
    else out = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    onChange?.(out);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", ...style }}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)} style={{ width: "100%", height: s.height, padding: "0 36px 0 14px", border: `1px solid ${open ? "#49339A" : "#E5E3DF"}`, borderRadius: 8, background: disabled ? "#FAF9F7" : "white", color: value ? "#151927" : "#9299A8", fontSize: s.fontSize, fontFamily: "'Poppins', sans-serif", textAlign: "left", display: "flex", alignItems: "center", boxShadow: open ? "0 0 0 3px #F0ECFA" : "none" }}>{display}</button>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9299A8" }}>◷</span>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "white", border: "1px solid #E5E3DF", borderRadius: 12, boxShadow: "0 8px 24px rgba(21,25,39,0.12)", zIndex: 50, display: "flex", overflow: "hidden", minWidth: 260 }}>
          <div style={{ flex: 1, maxHeight: 200, overflowY: "auto", borderRight: "1px solid #F0EEEA" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", padding: "8px 10px", position: "sticky", top: 0, background: "white", textTransform: "uppercase" }}>Hour</div>
            {hours.map(h => (
              <button key={h} onClick={() => { setHour(h); if (format === "24h") apply(h, minute); }} style={{ width: "100%", padding: "6px 12px", border: "none", background: h === hour ? "#F0ECFA" : "white", color: h === hour ? "#49339A" : "#151927", fontSize: 13, textAlign: "left", cursor: "pointer", fontWeight: h === hour ? 600 : 400 }}>{h.toString().padStart(2, "0")}</button>
            ))}
          </div>
          <div style={{ flex: 1, maxHeight: 200, overflowY: "auto", borderRight: format === "12h" ? "1px solid #F0EEEA" : "none" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", padding: "8px 10px", position: "sticky", top: 0, background: "white", textTransform: "uppercase" }}>Minute</div>
            {minutes.map(m => (
              <button key={m} onClick={() => { setMinute(m); apply(hour, m, ampm); }} style={{ width: "100%", padding: "6px 12px", border: "none", background: m === minute ? "#F0ECFA" : "white", color: m === minute ? "#49339A" : "#151927", fontSize: 13, textAlign: "left", cursor: "pointer", fontWeight: m === minute ? 600 : 400 }}>{m.toString().padStart(2, "0")}</button>
            ))}
          </div>
          {format === "12h" && (
            <div style={{ flex: 1, maxHeight: 200, overflowY: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", padding: "8px 10px", position: "sticky", top: 0, background: "white", textTransform: "uppercase" }}>AM/PM</div>
              {(["AM", "PM"] as const).map(ap => (
                <button key={ap} onClick={() => { setAmPm(ap); apply(hour, minute, ap); }} style={{ width: "100%", padding: "6px 12px", border: "none", background: ap === ampm ? "#F0ECFA" : "white", color: ap === ampm ? "#49339A" : "#151927", fontSize: 13, textAlign: "left", cursor: "pointer", fontWeight: ap === ampm ? 600 : 400 }}>{ap}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DateTimePicker({ date, time, timezone, onDateChange, onTimeChange, onTimezoneChange }: { date?: Date; time?: string; timezone?: string; onDateChange?: (d?: Date) => void; onTimeChange?: (t: string) => void; onTimezoneChange?: (tz: string) => void }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Date</div>
          <div style={{ height: 42, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 14, background: "white" }}>{date ? date.toDateString() : "Select date"}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Time</div>
          <TimePicker value={time} onChange={onTimeChange} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 6, textTransform: "uppercase" }}>Timezone</div>
        <div style={{ height: 42, border: "1px solid #E5E3DF", borderRadius: 8, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 13, background: "white" }}>{timezone || "Asia/Kolkata · UTC +05:30"}</div>
      </div>
      {date && time && (
        <div style={{ background: "#F0ECFA", border: "1px solid #E5E3DF", borderRadius: 8, padding: 10, fontSize: 12, color: "#49339A" }}>
          Campaign will be sent {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at {time} IST.
        </div>
      )}
    </div>
  );
}
