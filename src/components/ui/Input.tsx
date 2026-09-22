"use client";
import React, { useState } from "react";

type Size = "sm" | "md" | "lg";
type State = "default" | "error" | "success" | "warning";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  size?: Size;
  state?: State;
  leadingIcon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const sizeMap: Record<Size, { height: number; fontSize: number; padding: string }> = {
  sm: { height: 36, fontSize: 13, padding: "0 12px" },
  md: { height: 42, fontSize: 14, padding: "0 14px" },
  lg: { height: 48, fontSize: 15, padding: "0 16px" },
};

export function Input({ size = "md", state = "default", leadingIcon, trailingAction, prefix, suffix, disabled, readOnly, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const s = sizeMap[size];

  const borderColor = () => {
    if (disabled) return "#E5E3DF";
    if (state === "error") return "#EC6262";
    if (state === "success") return "#4FAE91";
    if (state === "warning") return "#F29B38";
    if (focused) return "#49339A";
    return "#E5E3DF";
  };

  const bg = () => {
    if (disabled) return "#FAF9F7";
    if (readOnly) return "#FAF9F7";
    return "white";
  };

  const inputEl = (
    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
      {leadingIcon && <span style={{ position: "absolute", left: 12, display: "flex", color: "#9299A8" }}>{leadingIcon}</span>}
      <input
        disabled={disabled}
        readOnly={readOnly}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e as any); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e as any); }}
        style={{
          width: "100%",
          height: s.height,
          fontSize: s.fontSize,
          padding: leadingIcon ? `0 14px 0 36px` : trailingAction ? `0 36px 0 14px` : s.padding,
          paddingRight: trailingAction ? 40 : prefix || suffix ? undefined : s.padding.split(" ")[1],
          border: `1px solid ${borderColor()}`,
          borderRadius: prefix || suffix ? (prefix ? "0 8px 8px 0" : "8px 0 0 8px") : 8,
          background: bg(),
          color: disabled ? "#B8BDC8" : "#151927",
          outline: "none",
          boxShadow: focused ? (state === "error" ? "0 0 0 3px #FDECEC" : state === "success" ? "0 0 0 3px #EEF8F4" : "0 0 0 3px #F0ECFA") : "none",
          fontFamily: "'Poppins', system-ui, sans-serif",
          transition: "all 0.15s ease",
          ...style,
        }}
        {...props}
      />
      {trailingAction && <span style={{ position: "absolute", right: 8, display: "flex" }}>{trailingAction}</span>}
    </div>
  );

  if (prefix || suffix) {
    return (
      <div style={{ display: "flex", width: "100%", alignItems: "stretch" }}>
        {prefix && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "#FAF9F7", border: `1px solid ${borderColor()}`, borderRight: "none", borderRadius: "8px 0 0 8px", fontSize: s.fontSize, color: "#60697A", fontWeight: 500, whiteSpace: "nowrap", height: s.height }}>
            {prefix}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>{inputEl}</div>
        {suffix && (
          <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "#FAF9F7", border: `1px solid ${borderColor()}`, borderLeft: "none", borderRadius: "0 8px 8px 0", fontSize: s.fontSize, color: "#60697A", fontWeight: 500, whiteSpace: "nowrap", height: s.height }}>
            {suffix}
          </div>
        )}
      </div>
    );
  }

  return inputEl;
}

export function InputGroup({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: "flex", alignItems: "stretch", width: "100%", ...style }}>{children}</div>;
}

export function CharacterCounter({ current, max }: { current: number; max: number }) {
  const near = current > max * 0.8 && current < max;
  const over = current >= max;
  return (
    <div style={{ fontSize: 11, color: over ? "#EC6262" : near ? "#F29B38" : "#9299A8", textAlign: "right", fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {current} / {max}
    </div>
  );
}
