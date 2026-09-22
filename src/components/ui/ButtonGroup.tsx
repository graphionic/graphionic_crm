"use client";
import React from "react";

type Size = "sm" | "md" | "lg";
type Variant = "standard" | "segmented";

interface ButtonGroupProps {
  children: React.ReactNode;
  size?: Size;
  variant?: Variant;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

const sizeMap = {
  sm: { height: 32, fontSize: 12, padding: "0 12px" },
  md: { height: 38, fontSize: 13, padding: "0 14px" },
  lg: { height: 44, fontSize: 14, padding: "0 18px" },
};

export function ButtonGroup({ children, size = "md", variant = "standard", fullWidth, style }: ButtonGroupProps) {
  const s = sizeMap[size];

  return (
    <div
      role="group"
      style={{
        display: "inline-flex",
        borderRadius: 8,
        overflow: "hidden",
        border: variant === "segmented" ? "1px solid #E5E3DF" : "none",
        background: variant === "segmented" ? "#FAF9F7" : "transparent",
        gap: variant === "standard" ? 6 : 0,
        width: fullWidth ? "100%" : undefined,
        ...style,
      }}
    >
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        const isFirst = idx === 0;
        const isLast = idx === React.Children.count(children) - 1;

        return React.cloneElement(child as any, {
          style: {
            ...(child.props.style || {}),
            height: s.height,
            fontSize: s.fontSize,
            padding: s.padding,
            borderRadius: variant === "segmented" ? (isFirst ? "7px 0 0 7px" : isLast ? "0 7px 7px 0" : "0") : 8,
            border: variant === "segmented" ? "none" : "1px solid #E5E3DF",
            borderRight: variant === "segmented" && !isLast ? "1px solid #E5E3DF" : undefined,
            flex: fullWidth ? 1 : undefined,
          },
        });
      })}
    </div>
  );
}

interface SegmentedControlProps {
  options: { label: string; value: string; icon?: React.ReactNode; disabled?: boolean }[];
  value: string;
  onChange: (value: string) => void;
  size?: Size;
  fullWidth?: boolean;
}

export function SegmentedControl({ options, value, onChange, size = "md", fullWidth }: SegmentedControlProps) {
  const s = sizeMap[size];

  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        background: "#FAF9F7",
        border: "1px solid #E5E3DF",
        borderRadius: 8,
        padding: 3,
        gap: 3,
        width: fullWidth ? "100%" : undefined,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: s.height - 6,
              padding: s.padding,
              fontSize: s.fontSize,
              fontWeight: 500,
              fontFamily: "'Poppins', system-ui, sans-serif",
              borderRadius: 6,
              border: "none",
              cursor: opt.disabled ? "not-allowed" : "pointer",
              background: active ? "white" : "transparent",
              color: active ? "#49339A" : "#60697A",
              boxShadow: active ? "0 1px 2px rgba(21,25,39,0.08)" : "none",
              borderBottom: active ? "1px solid #E5E3DF" : "1px solid transparent",
              opacity: opt.disabled ? 0.5 : 1,
              flex: fullWidth ? 1 : undefined,
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            {opt.icon && <span style={{ display: "flex" }}>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
