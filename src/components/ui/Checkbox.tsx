"use client";
import React from "react";

type Size = "sm" | "md";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: Size;
  indeterminate?: boolean;
  label?: string;
  description?: string;
  error?: boolean;
}

export function Checkbox({ size = "md", indeterminate, label, description, error, style, ...props }: CheckboxProps) {
  const boxSize = size === "sm" ? 16 : 18;

  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.6 : 1, ...style }}>
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0, marginTop: description ? 2 : 0 }}>
        <input
          type="checkbox"
          ref={(el) => { if (el) el.indeterminate = !!indeterminate; }}
          style={{ position: "absolute", opacity: 0, width: boxSize, height: boxSize }}
          {...props}
        />
        <span
          style={{
            width: boxSize,
            height: boxSize,
            border: `1px solid ${error ? "#EC6262" : props.checked || indeterminate ? "#49339A" : "#E5E3DF"}`,
            borderRadius: 4,
            background: props.checked || indeterminate ? "#49339A" : "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: boxSize - 6,
            transition: "all 0.12s ease",
          }}
        >
          {indeterminate ? "–" : props.checked ? "✓" : ""}
        </span>
      </span>
      {(label || description) && (
        <span style={{ display: "grid", gap: 2 }}>
          {label && <span style={{ fontSize: size === "sm" ? 13 : 14, fontWeight: 400, color: "#151927", fontFamily: "'Poppins', system-ui, sans-serif", lineHeight: 1.4 }}>{label}</span>}
          {description && <span style={{ fontSize: 12, color: "#60697A", lineHeight: 1.5, fontFamily: "'Poppins', system-ui, sans-serif" }}>{description}</span>}
        </span>
      )}
    </label>
  );
}

export function CheckboxGroup({ children, layout = "vertical", style }: { children: React.ReactNode; layout?: "vertical" | "horizontal"; style?: React.CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: layout === "vertical" ? "column" : "row", gap: layout === "vertical" ? 10 : 16, flexWrap: "wrap", ...style }}>{children}</div>;
}
