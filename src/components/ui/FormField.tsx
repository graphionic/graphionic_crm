"use client";
import React from "react";

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function FormField({ children, style }: FormFieldProps) {
  return <div style={{ display: "grid", gap: 8, ...style }}>{children}</div>;
}

interface FieldLabelProps {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  htmlFor?: string;
}

export function FieldLabel({ children, required, optional, htmlFor }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 500, color: "#151927", display: "flex", gap: 6, alignItems: "center", fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <span>{children}</span>
      {required && <span style={{ color: "#EC6262", fontWeight: 500 }}>*</span>}
      {optional && <span style={{ color: "#9299A8", fontWeight: 400, fontSize: 12 }}>(Optional)</span>}
    </label>
  );
}

export function FieldDescription({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#9299A8", lineHeight: 1.5, fontFamily: "'Poppins', system-ui, sans-serif" }}>{children}</div>;
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12, color: "#EC6262", lineHeight: 1.5, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <span style={{ fontSize: 12, marginTop: 1 }}>!</span>
      <span>{children}</span>
    </div>
  );
}

export function FieldSuccess({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#4FAE91", lineHeight: 1.5, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <span>✓</span>
      <span>{children}</span>
    </div>
  );
}
