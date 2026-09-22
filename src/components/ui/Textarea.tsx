"use client";
import React, { useState } from "react";

type Size = "sm" | "md" | "lg";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: Size;
  state?: "default" | "error" | "success";
  autoGrow?: boolean;
  maxHeight?: number;
}

const sizeMap: Record<Size, { fontSize: number; padding: string; minHeight: number }> = {
  sm: { fontSize: 13, padding: "10px 12px", minHeight: 80 },
  md: { fontSize: 14, padding: "12px 14px", minHeight: 100 },
  lg: { fontSize: 15, padding: "14px 16px", minHeight: 120 },
};

export function Textarea({ size = "md", state = "default", autoGrow, maxHeight = 240, style, ...props }: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const s = sizeMap[size];

  const borderColor = () => {
    if (props.disabled) return "#E5E3DF";
    if (state === "error") return "#EC6262";
    if (state === "success") return "#4FAE91";
    if (focused) return "#49339A";
    return "#E5E3DF";
  };

  return (
    <textarea
      onFocus={(e) => { setFocused(true); (props.onFocus as any)?.(e); }}
      onBlur={(e) => { setFocused(false); (props.onBlur as any)?.(e); }}
      style={{
        width: "100%",
        minHeight: s.minHeight,
        maxHeight: autoGrow ? maxHeight : undefined,
        fontSize: s.fontSize,
        padding: s.padding,
        border: `1px solid ${borderColor()}`,
        borderRadius: 8,
        background: props.disabled ? "#FAF9F7" : props.readOnly ? "#FAF9F7" : "white",
        color: props.disabled ? "#B8BDC8" : "#151927",
        outline: "none",
        boxShadow: focused ? (state === "error" ? "0 0 0 3px #FDECEC" : "0 0 0 3px #F0ECFA") : "none",
        fontFamily: "'Poppins', system-ui, sans-serif",
        lineHeight: 1.6,
        resize: autoGrow ? "none" : (style as any)?.resize || "vertical",
        overflowY: autoGrow ? "auto" : undefined,
        transition: "all 0.15s ease",
        ...style,
      }}
      {...props}
    />
  );
}
