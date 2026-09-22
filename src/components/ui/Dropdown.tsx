"use client";
import React, { useState, useRef, useEffect } from "react";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: DropdownItem[]; // nested
  divider?: boolean;
  checkbox?: boolean;
  checked?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export function Dropdown({ trigger, items, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveSub(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderItems = (list: DropdownItem[], isSub = false) => (
    <div
      style={{
        minWidth: 200,
        background: "white",
        border: "1px solid #E5E3DF",
        borderRadius: 10,
        boxShadow: "0 4px 16px rgba(21,25,39,0.10)",
        padding: 6,
        display: "grid",
        gap: 2,
      }}
    >
      {list.map((item, idx) => {
        if (item.divider) {
          return <div key={idx} style={{ height: 1, background: "#F0EEEA", margin: "4px 0" }} />;
        }
        const hasChildren = !!item.children?.length;
        const isActiveSub = activeSub === item.label;

        return (
          <div key={idx} style={{ position: "relative" }}>
            <button
              disabled={item.disabled}
              onClick={() => {
                if (hasChildren) {
                  setActiveSub(isActiveSub ? null : item.label);
                } else {
                  item.onClick?.();
                  if (!isSub) setOpen(false);
                }
              }}
              onMouseEnter={() => hasChildren && setActiveSub(item.label)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                background: isActiveSub ? "#F0ECFA" : "transparent",
                color: item.danger ? "#EC6262" : item.disabled ? "#B8BDC8" : "#151927",
                fontSize: 13,
                fontWeight: 400,
                fontFamily: "'Poppins', system-ui, sans-serif",
                cursor: item.disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "background 0.12s",
              }}
            >
              {item.checkbox && <span style={{ width: 16, height: 16, border: "1px solid #E5E3DF", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: item.checked ? "#49339A" : "white", color: "white", fontSize: 10 }}>{item.checked ? "✓" : ""}</span>}
              {item.icon && <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.8 }}>{item.icon}</span>}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && <span style={{ fontSize: 11, color: "#9299A8", fontFamily: "monospace" }}>{item.shortcut}</span>}
              {hasChildren && <span style={{ fontSize: 12, color: "#9299A8" }}>›</span>}
            </button>
            {hasChildren && isActiveSub && (
              <div style={{ position: "absolute", left: "100%", top: 0, marginLeft: 8, zIndex: 10 }}>{renderItems(item.children!, true)}</div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "inline-flex" }}>
        {trigger}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: align === "right" ? "auto" : 0, right: align === "right" ? 0 : "auto", zIndex: 50 }}>{renderItems(items)}</div>
      )}
    </div>
  );
}

export function ActionMenuTrigger({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "ghost" }) {
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 38,
        padding: "0 14px",
        borderRadius: 8,
        border: variant === "ghost" ? "1px solid transparent" : "1px solid #E5E3DF",
        background: variant === "ghost" ? "transparent" : "white",
        color: "#151927",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "'Poppins', system-ui, sans-serif",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
