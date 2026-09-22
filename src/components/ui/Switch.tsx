"use client";
import React from "react";

type Size = "sm" | "md";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: Size;
  label?: string;
  description?: string;
}

export function Switch({ checked, onChange, disabled, size = "md", label, description, ...props }: SwitchProps) {
  const isSm = size === "sm";
  const trackW = isSm ? 32 : 40;
  const trackH = isSm ? 18 : 22;
  const thumb = isSm ? 14 : 18;

  return (
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0, marginTop: description ? 2 : 0 }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} disabled={disabled} style={{ position: "absolute", opacity: 0, width: trackW, height: trackH }} {...props} />
        <span
          style={{
            width: trackW,
            height: trackH,
            borderRadius: 9999,
            background: checked ? "#49339A" : "#E5E3DF",
            display: "block",
            transition: "background 0.15s ease",
            position: "relative",
          }}
        >
          <span
            style={{
              width: thumb,
              height: thumb,
              background: "white",
              borderRadius: 9999,
              position: "absolute",
              top: 2,
              left: checked ? trackW - thumb - 2 : 2,
              transition: "left 0.15s ease",
              boxShadow: "0 1px 2px rgba(21,25,39,0.12)",
              display: "block",
            }}
          />
        </span>
      </span>
      {(label || description) && (
        <span style={{ display: "grid", gap: 2 }}>
          {label && <span style={{ fontSize: 14, fontWeight: 400, color: "#151927", fontFamily: "'Poppins', system-ui, sans-serif", lineHeight: 1.4 }}>{label}</span>}
          {description && <span style={{ fontSize: 12, color: "#60697A", lineHeight: 1.5, fontFamily: "'Poppins', system-ui, sans-serif" }}>{description}</span>}
        </span>
      )}
    </label>
  );
}
