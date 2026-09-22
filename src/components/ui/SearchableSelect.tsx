"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { SelectOption } from "./Select";

type Size = "sm" | "md" | "lg";
type State = "default" | "error" | "success" | "warning";

interface SearchableSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  size?: Size;
  state?: State;
  disabled?: boolean;
  clearable?: boolean;
  loading?: boolean;
  noResultsText?: string;
  recentOptions?: SelectOption[];
  allowCreate?: boolean;
  onCreate?: (input: string) => void;
  asyncSearch?: boolean;
  onSearch?: (query: string) => void;
  minChars?: number;
  style?: React.CSSProperties;
}

const sizeMap = {
  sm: { height: 36, fontSize: 13, padding: "0 12px" },
  md: { height: 42, fontSize: 14, padding: "0 14px" },
  lg: { height: 48, fontSize: 15, padding: "0 16px" },
};

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: "#FFF6E3", fontWeight: 600, color: "#151927" }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  searchPlaceholder,
  size = "md",
  state = "default",
  disabled,
  clearable,
  loading,
  noResultsText = "No results",
  recentOptions,
  allowCreate,
  onCreate,
  asyncSearch,
  onSearch,
  minChars = 0,
  style,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = sizeMap[size];

  const selected = options.find(o => o.value === value) || recentOptions?.find(o => o.value === value);

  const filtered = useMemo(() => {
    if (asyncSearch) return options; // server filters
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.metadata?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q));
  }, [options, query, asyncSearch]);

  const borderColor = () => {
    if (disabled) return "#E5E3DF";
    if (state === "error") return "#EC6262";
    if (open) return "#49339A";
    return "#E5E3DF";
  };

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (onSearch) onSearch(query);
  }, [query]);

  const showMinChars = asyncSearch && minChars > 0 && query.length > 0 && query.length < minChars;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", ...style }}>
      <div
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
        style={{
          width: "100%",
          height: s.height,
          padding: s.padding,
          border: `1px solid ${borderColor()}`,
          borderRadius: 8,
          background: disabled ? "#FAF9F7" : "white",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: disabled ? "not-allowed" : "text",
          boxShadow: open ? "0 0 0 3px #F0ECFA" : "none",
          transition: "all 0.15s ease",
        }}
      >
        {selected && !open ? (
          <>
            {selected.icon && <span style={{ display: "flex" }}>{selected.icon}</span>}
            {selected.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color }} />}
            <span style={{ flex: 1, fontSize: s.fontSize, fontFamily: "'Poppins', sans-serif", color: "#151927", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.label}</span>
          </>
        ) : (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocusedIdx(0); }}
            onFocus={() => setOpen(true)}
            placeholder={selected ? selected.label : searchPlaceholder || placeholder}
            disabled={disabled}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: s.fontSize,
              fontFamily: "'Poppins', sans-serif",
              background: "transparent",
              color: "#151927",
              width: "100%",
            }}
          />
        )}
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: "auto" }}>
          {clearable && value && !disabled && (
            <span onClick={(e) => { e.stopPropagation(); onChange?.(""); setQuery(""); }} style={{ width: 18, height: 18, borderRadius: "50%", background: "#F0EEEA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#60697A", cursor: "pointer" }}>×</span>
          )}
          <span style={{ fontSize: 11, color: "#9299A8" }}>{open ? "▴" : "▾"}</span>
        </div>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "white", border: "1px solid #E5E3DF", borderRadius: 10, boxShadow: "0 4px 16px rgba(21,25,39,0.10)", zIndex: 50, overflow: "hidden", display: "grid" }}>
          {/* Search header for non-input mode? We already have input in trigger, but show sticky search when selected */}
          {selected && (
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #F0EEEA", background: "#FAF9F7" }}>
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setFocusedIdx(0); }}
                placeholder={searchPlaceholder || placeholder}
                style={{ width: "100%", border: "1px solid #E5E3DF", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: "none" }}
              />
            </div>
          )}

          <div style={{ maxHeight: 280, overflowY: "auto", padding: 6 }}>
            {loading && <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: "#9299A8" }}>Searching...</div>}
            {showMinChars && <div style={{ padding: "12px", fontSize: 12, color: "#9299A8" }}>Type at least {minChars} characters to search.</div>}

            {!loading && !showMinChars && (
              <>
                {recentOptions && !query && recentOptions.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#9299A8", padding: "6px 10px 4px", textTransform: "uppercase" }}>Recently Used</div>
                    {recentOptions.map((opt, idx) => {
                      const isSelected = opt.value === value;
                      return (
                        <div key={`recent-${opt.value}`} onClick={() => { onChange?.(opt.value); setOpen(false); setQuery(""); }} style={{ padding: "8px 10px", borderRadius: 6, background: isSelected ? "#F0ECFA" : "white", cursor: "pointer", display: "flex", gap: 10, alignItems: "center" }}>
                          {opt.icon || <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0ECFA", color: "#49339A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{opt.label.slice(0, 2).toUpperCase()}</div>}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{opt.label}</div>
                            {opt.metadata && <div style={{ fontSize: 11, color: "#9299A8" }}>{opt.metadata}</div>}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ height: 1, background: "#F0EEEA", margin: "6px 0" }} />
                  </>
                )}

                {filtered.length === 0 ? (
                  <div style={{ padding: "12px" }}>
                    <div style={{ fontSize: 12, color: "#60697A", textAlign: "center", padding: "8px 0" }}>{noResultsText} for "{query}"</div>
                    {allowCreate && query && (
                      <button onClick={() => { onCreate?.(query); setOpen(false); setQuery(""); }} style={{ width: "100%", marginTop: 8, padding: "8px 12px", borderRadius: 6, border: "1px dashed #49339A", background: "#F0ECFA", color: "#49339A", fontSize: 12, fontWeight: 500, fontFamily: "'Poppins', sans-serif", cursor: "pointer" }}>+ Create "{query}"</button>
                    )}
                  </div>
                ) : (
                  filtered.map((opt, idx) => {
                    const isSelected = opt.value === value;
                    const isFocused = idx === focusedIdx;
                    return (
                      <div
                        key={opt.value}
                        onMouseEnter={() => setFocusedIdx(idx)}
                        onClick={() => { onChange?.(opt.value); setOpen(false); setQuery(""); }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: isSelected ? "#F0ECFA" : isFocused ? "#FAF9F7" : "white",
                          cursor: "pointer",
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        {opt.icon ? opt.icon : opt.color ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0ECFA", color: "#49339A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{opt.label.slice(0, 2).toUpperCase()}</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: isSelected ? 500 : 400, color: "#151927", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{highlightMatch(opt.label, query)}</div>
                          {opt.description && <div style={{ fontSize: 11, color: "#60697A" }}>{opt.description}</div>}
                          {opt.metadata && <div style={{ fontSize: 11, color: "#9299A8" }}>{opt.metadata}</div>}
                        </div>
                        {isSelected && <span style={{ color: "#49339A", fontSize: 12 }}>✓</span>}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
