"use client";
import React from "react";

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: boolean;
}

export function Radio({ label, description, error, style, ...props }: RadioProps) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.6 : 1, ...style }}>
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0, marginTop: description ? 2 : 1 }}>
        <input type="radio" style={{ position: "absolute", opacity: 0, width: 18, height: 18 }} {...props} />
        <span style={{ width: 18, height: 18, border: `1px solid ${error ? "#EC6262" : props.checked ? "#49339A" : "#E5E3DF"}`, borderRadius: 9999, background: "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s ease" }}>
          {props.checked && <span style={{ width: 8, height: 8, background: "#49339A", borderRadius: 9999, display: "block" }} />}
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

export function RadioGroup({ children, layout = "vertical", style }: { children: React.ReactNode; layout?: "vertical" | "horizontal"; style?: React.CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: layout === "vertical" ? "column" : "row", gap: layout === "vertical" ? 10 : 16, ...style }}>{children}</div>;
}

export function CardRadio({ selected, title, description, onClick, style }: { selected?: boolean; title: string; description: string; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? "#49339A" : "#E5E3DF"}`,
        borderRadius: 10,
        padding: 16,
        background: selected ? "#F0ECFA" : "white",
        cursor: "pointer",
        transition: "all 0.12s ease",
        ...style,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 18, height: 18, border: `1px solid ${selected ? "#49339A" : "#E5E3DF"}`, borderRadius: 9999, background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          {selected && <span style={{ width: 8, height: 8, background: "#49339A", borderRadius: 9999 }} />}
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#151927", fontFamily: "'Poppins', system-ui, sans-serif" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#60697A", marginTop: 4, lineHeight: 1.5 }}>{description}</div>
        </div>
      </div>
    </div>
  );
}
