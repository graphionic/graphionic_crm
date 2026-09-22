"use client";
import React from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "accent" | "link";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const sizeMap: Record<Size, { height: number; padding: string; fontSize: number; iconSize: number }> = {
  xs: { height: 30, padding: "0 10px", fontSize: 12, iconSize: 14 },
  sm: { height: 34, padding: "0 14px", fontSize: 13, iconSize: 16 },
  md: { height: 40, padding: "0 18px", fontSize: 14, iconSize: 18 },
  lg: { height: 46, padding: "0 22px", fontSize: 14, iconSize: 18 },
  xl: { height: 52, padding: "0 26px", fontSize: 15, iconSize: 20 },
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: "#49339A", color: "white", border: "1px solid #49339A" },
  secondary: { background: "white", color: "#151927", border: "1px solid #E5E3DF" },
  outline: { background: "transparent", color: "#49339A", border: "1px solid #49339A" },
  ghost: { background: "transparent", color: "#60697A", border: "1px solid transparent" },
  danger: { background: "#EC6262", color: "white", border: "1px solid #EC6262" },
  success: { background: "#4FAE91", color: "white", border: "1px solid #4FAE91" },
  accent: { background: "#F4BE52", color: "#151927", border: "1px solid #F4BE52" },
  link: { background: "transparent", color: "#49339A", border: "1px solid transparent", padding: "0 4px" },
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const s = sizeMap[size];
  const v = variantStyles[variant];

  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: variant === "link" ? "auto" : s.height,
        padding: variant === "link" ? "0 4px" : s.padding,
        fontSize: s.fontSize,
        fontWeight: variant === "link" ? 500 : 500,
        fontFamily: "'Poppins', system-ui, sans-serif",
        borderRadius: 8,
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "all 0.12s ease",
        opacity: disabled && !loading ? 0.6 : 1,
        width: fullWidth ? "100%" : undefined,
        whiteSpace: "nowrap",
        lineHeight: 1,
        ...v,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <>
          <span
            style={{
              width: s.iconSize - 2,
              height: s.iconSize - 2,
              border: `2px solid ${variant === "secondary" || variant === "outline" || variant === "ghost" || variant === "accent" ? "#49339A" : variant === "link" ? "#49339A" : "white"}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.6s linear infinite",
            }}
          />
          <span>{typeof children === "string" ? children : "Loading..."}</span>
        </>
      ) : (
        <>
          {leadingIcon && <span style={{ display: "flex", width: s.iconSize, height: s.iconSize, alignItems: "center", justifyContent: "center" }}>{leadingIcon}</span>}
          <span>{children}</span>
          {trailingIcon && <span style={{ display: "flex", width: s.iconSize, height: s.iconSize, alignItems: "center", justifyContent: "center" }}>{trailingIcon}</span>}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
