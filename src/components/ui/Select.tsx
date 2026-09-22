"use client";
import React, { useState, useRef, useEffect } from "react";

type Size = "sm" | "md" | "lg";
type State = "default" | "error" | "success" | "warning";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  metadata?: string;
  disabled?: boolean;
  color?: string; // for status dot
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  options?: SelectOption[];
  groups?: SelectGroup[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: Size;
  state?: State;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
  id?: string;
}

const sizeMap = {
  sm: { height: 36, fontSize: 13, padding: "0 12px" },
  md: { height: 42, fontSize: 14, padding: "0 14px" },
  lg: { height: 48, fontSize: 15, padding: "0 16px" },
};

export function Select({
  options = [],
  groups,
  value,
  onChange,
  placeholder = "Select...",
  size = "md",
  state = "default",
  disabled,
  readOnly,
  clearable,
  style,
  id,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const s = sizeMap[size];

  const allOptions: SelectOption[] = groups ? groups.flatMap(g => g.options) : options;
  const selected = allOptions.find(o => o.value === value);

  const borderColor = () => {
    if (disabled) return "#E5E3DF";
    if (state === "error") return "#EC6262";
    if (state === "success") return "#4FAE91";
    if (state === "warning") return "#F29B38";
    if (open) return "#49339A";
    return "#E5E3DF";
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = allOptions.findIndex(o => o.value === value);
      setFocusedIdx(idx >= 0 ? idx : 0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || readOnly) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setFocusedIdx(prev => Math.min(prev + 1, allOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && focusedIdx >= 0) {
        const opt = allOptions[focusedIdx];
        if (!opt.disabled) {
          onChange?.(opt.value);
          setOpen(false);
        }
      } else {
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const flatList = groups ? groups.flatMap(g => [{ type: "group" as const, label: g.label }, ...g.options.map(o => ({ type: "option" as const, option: o }))]) : options.map(o => ({ type: "option" as const, option: o }));

  // for keyboard focus tracking across groups, we need flat index mapping
  let optionCounter = -1;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", ...style }}>
      <button
        id={id}
        type="button"
        disabled={disabled || readOnly}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && !readOnly && setOpen(!open)}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          height: s.height,
          padding: s.padding,
          paddingRight: clearable && selected ? "64px" : "36px",
          border: `1px solid ${borderColor()}`,
          borderRadius: 8,
          background: disabled ? "#FAF9F7" : readOnly ? "#FAF9F7" : "white",
          color: selected ? "#151927" : "#9299A8",
          fontSize: s.fontSize,
          fontWeight: 400,
          fontFamily: "'Poppins', system-ui, sans-serif",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          boxShadow: open ? "0 0 0 3px #F0ECFA" : "none",
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {selected?.icon && <span style={{ display: "flex", flexShrink: 0 }}>{selected.icon}</span>}
        {selected?.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color, flexShrink: 0 }} />}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", color: selected ? "#151927" : "#9299A8" }}>
          {selected ? selected.label : placeholder}
        </span>
      </button>

      {/* Actions */}
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4, alignItems: "center" }}>
        {clearable && selected && !disabled && !readOnly && (
          <span
            role="button"
            aria-label="Clear"
            onClick={(e) => { e.stopPropagation(); onChange?.(""); }}
            style={{ width: 18, height: 18, borderRadius: "50%", background: "#F0EEEA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#60697A", cursor: "pointer" }}
          >
            ×
          </span>
        )}
        <span style={{ fontSize: 11, color: "#9299A8", pointerEvents: "none" }}>{open ? "▴" : "▾"}</span>
      </div>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: `calc(100% + 6px)`,
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #E5E3DF",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(21,25,39,0.10), 0 1px 3px rgba(21,25,39,0.06)",
            padding: 6,
            zIndex: 50,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {groups ? (
            groups.map((g, gi) => (
              <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 8 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", padding: "6px 10px 4px", textTransform: "uppercase" }}>{g.label}</div>
                {g.options.map((opt) => {
                  optionCounter++;
                  const idx = optionCounter;
                  const isSelected = opt.value === value;
                  const isFocused = idx === focusedIdx;
                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setFocusedIdx(idx)}
                      onClick={() => { if (!opt.disabled) { onChange?.(opt.value); setOpen(false); } }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: isSelected ? "#F0ECFA" : isFocused ? "#FAF9F7" : "white",
                        color: opt.disabled ? "#B8BDC8" : isSelected ? "#49339A" : "#151927",
                        fontSize: 13,
                        fontFamily: "'Poppins', system-ui, sans-serif",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        cursor: opt.disabled ? "not-allowed" : "pointer",
                        opacity: opt.disabled ? 0.6 : 1,
                      }}
                    >
                      {opt.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, marginTop: 5, flexShrink: 0 }} />}
                      {opt.icon && <span style={{ display: "flex", marginTop: 1 }}>{opt.icon}</span>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: isSelected ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opt.label}</div>
                        {opt.description && <div style={{ fontSize: 11, color: "#60697A", marginTop: 2, lineHeight: 1.4 }}>{opt.description}</div>}
                        {opt.metadata && <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2 }}>{opt.metadata}</div>}
                      </div>
                      {isSelected && <span style={{ color: "#49339A", fontSize: 12, marginLeft: "auto" }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isFocused = idx === focusedIdx;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  onClick={() => { if (!opt.disabled) { onChange?.(opt.value); setOpen(false); } }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: isSelected ? "#F0ECFA" : isFocused ? "#FAF9F7" : "white",
                    color: opt.disabled ? "#B8BDC8" : isSelected ? "#49339A" : "#151927",
                    fontSize: 13,
                    fontFamily: "'Poppins', system-ui, sans-serif",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    cursor: opt.disabled ? "not-allowed" : "pointer",
                    opacity: opt.disabled ? 0.6 : 1,
                  }}
                >
                  {opt.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, marginTop: 5, flexShrink: 0 }} />}
                  {opt.icon && <span style={{ display: "flex", marginTop: 1 }}>{opt.icon}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isSelected ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{opt.label}</div>
                    {opt.description && <div style={{ fontSize: 11, color: "#60697A", marginTop: 2, lineHeight: 1.4 }}>{opt.description}</div>}
                    {opt.metadata && <div style={{ fontSize: 11, color: "#9299A8", marginTop: 2 }}>{opt.metadata}</div>}
                  </div>
                  {isSelected && <span style={{ color: "#49339A", fontSize: 12, marginLeft: "auto" }}>✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Composable primitives
export function SelectTrigger({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}
export function SelectContent({ children }: any) {
  return <div>{children}</div>;
}
export function SelectOption({ children }: any) {
  return <div>{children}</div>;
}
export function SelectGroup({ children }: any) {
  return <div>{children}</div>;
}
