"use client";
import React, { useState } from "react";

type Variant = "default" | "ghost" | "outline" | "primary" | "danger";
type Size = "xs" | "sm" | "md" | "lg" | "xl";
type Shape = "square" | "circle";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shape?: Shape;
  icon: React.ReactNode;
  label: string; // accessible label + tooltip
  loading?: boolean;
}

const sizeMap: Record<Size, { box: number; icon: number }> = {
  xs: { box: 28, icon: 14 },
  sm: { box: 32, icon: 16 },
  md: { box: 38, icon: 18 },
  lg: { box: 44, icon: 20 },
  xl: { box: 50, icon: 22 },
};

const variantMap: Record<Variant, React.CSSProperties> = {
  default: { background: "white", color: "#151927", border: "1px solid #E5E3DF" },
  ghost: { background: "transparent", color: "#60697A", border: "1px solid transparent" },
  outline: { background: "white", color: "#49339A", border: "1px solid #E5E3DF" },
  primary: { background: "#49339A", color: "white", border: "1px solid #49339A" },
  danger: { background: "white", color: "#EC6262", border: "1px solid #FBD5D5" },
};

export function IconButton({ variant = "default", size = "md", shape = "square", icon, label, loading, disabled, style, ...props }: IconButtonProps) {
  const s = sizeMap[size];
  const v = variantMap[variant];
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        aria-label={label}
        title={label}
        disabled={disabled || loading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        style={{
          width: s.box,
          height: s.box,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: shape === "circle" ? 9999 : 8,
          cursor: disabled || loading ? "not-allowed" : "pointer",
          transition: "all 0.12s ease",
          opacity: disabled ? 0.55 : 1,
          fontFamily: "'Poppins', system-ui, sans-serif",
          ...v,
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <span style={{ width: s.icon - 2, height: s.icon - 2, border: `2px solid currentColor`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
        ) : (
          <span style={{ width: s.icon, height: s.icon, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        )}
      </button>
      {showTooltip && (
        <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#151927", color: "white", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none" }}>
          {label}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
