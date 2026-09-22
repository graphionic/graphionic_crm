"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { SelectOption } from "./Select";

type Size = "sm" | "md" | "lg";

interface MultiSelectProps {
  options: SelectOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  size?: Size;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  collapseAfter?: number;
  style?: React.CSSProperties;
  showSelectAll?: boolean;
}

const sizeMap = {
  sm: { minHeight: 36, fontSize: 12, chipFont: 11, padding: "4px 8px" },
  md: { minHeight: 42, fontSize: 13, chipFont: 12, padding: "6px 10px" },
  lg: { minHeight: 48, fontSize: 14, chipFont: 12, padding: "8px 12px" },
};

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select...",
  size = "md",
  disabled,
  searchable = true,
  clearable,
  collapseAfter = 3,
  style,
  showSelectAll,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAllChips, setShowAllChips] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const s = sizeMap[size];

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedOptions = options.filter(o => value.includes(o.value));
  const visibleChips = showAllChips ? selectedOptions : selectedOptions.slice(0, collapseAfter);
  const hiddenCount = selectedOptions.length - collapseAfter;

  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const toggle = (val: string) => {
    if (value.includes(val)) onChange?.(value.filter(v => v !== val));
    else onChange?.([...value, val]);
  };

  const remove = (val: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange?.(value.filter(v => v !== val));
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", ...style }}>
      <div
        onClick={() => !disabled && setOpen(true)}
        style={{
          width: "100%",
          minHeight: s.minHeight,
          padding: selectedOptions.length ? "6px 36px 6px 10px" : s.padding,
          border: `1px solid ${open ? "#49339A" : "#E5E3DF"}`,
          borderRadius: 8,
          background: disabled ? "#FAF9F7" : "white",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: open ? "0 0 0 3px #F0ECFA" : "none",
          transition: "all 0.15s ease",
        }}
      >
        {selectedOptions.length === 0 ? (
          <span style={{ fontSize: s.fontSize, color: "#9299A8", fontFamily: "'Poppins', sans-serif" }}>{placeholder}</span>
        ) : (
          <>
            {visibleChips.map(opt => (
              <span key={opt.value} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "#F0ECFA", border: "1px solid #E5E3DF", fontSize: s.chipFont, fontWeight: 500, color: "#151927", fontFamily: "'Poppins', sans-serif", maxWidth: 160 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
                <span role="button" aria-label={`Remove ${opt.label}`} onClick={(e) => remove(opt.value, e)} style={{ width: 14, height: 14, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#60697A", cursor: "pointer", flexShrink: 0 }}>×</span>
              </span>
            ))}
            {!showAllChips && hiddenCount > 0 && (
              <span onClick={(e) => { e.stopPropagation(); setShowAllChips(true); }} style={{ fontSize: s.chipFont, color: "#49339A", fontWeight: 500, cursor: "pointer", padding: "3px 8px", borderRadius: 6, background: "#FAF9F7", border: "1px dashed #E5E3DF" }}>+{hiddenCount} more</span>
            )}
            {showAllChips && hiddenCount > 0 && (
              <span onClick={(e) => { e.stopPropagation(); setShowAllChips(false); }} style={{ fontSize: s.chipFont, color: "#60697A", fontWeight: 500, cursor: "pointer" }}>Show less</span>
            )}
          </>
        )}
        <div style={{ position: "absolute", right: 10, top: 12, display: "flex", gap: 6, alignItems: "center" }}>
          {clearable && value.length > 0 && <span onClick={(e) => { e.stopPropagation(); onChange?.([]); }} style={{ fontSize: 12, color: "#9299A8", cursor: "pointer" }}>Clear</span>}
          <span style={{ fontSize: 11, color: "#9299A8" }}>{open ? "▴" : "▾"}</span>
        </div>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "white", border: "1px solid #E5E3DF", borderRadius: 10, boxShadow: "0 4px 16px rgba(21,25,39,0.10)", zIndex: 50, overflow: "hidden" }}>
          {searchable && (
            <div style={{ padding: 8, borderBottom: "1px solid #F0EEEA" }}>
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." style={{ width: "100%", border: "1px solid #E5E3DF", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: "none" }} />
            </div>
          )}
          {showSelectAll && (
            <div style={{ padding: "6px 8px", borderBottom: "1px solid #F0EEEA", display: "flex", gap: 12 }}>
              <button onClick={() => onChange?.(filtered.map(o => o.value))} style={{ fontSize: 11, fontWeight: 500, color: "#49339A", background: "none", border: "none", cursor: "pointer" }}>Select All</button>
              <button onClick={() => onChange?.([])} style={{ fontSize: 11, fontWeight: 500, color: "#60697A", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
            </div>
          )}
          <div style={{ maxHeight: 240, overflowY: "auto", padding: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 12, color: "#9299A8", textAlign: "center" }}>No results for "{query}"</div>
            ) : (
              filtered.map(opt => {
                const checked = value.includes(opt.value);
                return (
                  <div key={opt.value} onClick={() => toggle(opt.value)} style={{ padding: "8px 10px", borderRadius: 6, background: checked ? "#F0ECFA" : "white", display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${checked ? "#49339A" : "#E5E3DF"}`, background: checked ? "#49339A" : "white", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>{checked ? "✓" : ""}</div>
                    {opt.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color }} />}
                    <span style={{ fontSize: 13, color: "#151927", fontFamily: "'Poppins', sans-serif" }}>{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MultiSelectChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "#F0ECFA", border: "1px solid #E5E3DF", fontSize: 12, fontWeight: 500, color: "#151927", fontFamily: "'Poppins', sans-serif" }}>
      {label}
      {onRemove && <span onClick={onRemove} style={{ width: 14, height: 14, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer" }}>×</span>}
    </span>
  );
}
