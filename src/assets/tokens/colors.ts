/**
 * Design Tokens - Colors
 * Foundation for ClientForge Admin Theme
 */

export const colors = {
  // Primary
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#2563eb", // main
    600: "#1d4ed8",
    700: "#1e40af",
    800: "#1e3a8a",
    900: "#1e3a5f",
  },
  // Secondary
  secondary: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  // Accent
  accent: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
  },
  // Semantic
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
  },
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
  },
  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
  },
  info: {
    50: "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },
  // Neutral
  neutral: {
    0: "#ffffff",
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },
  // Background
  background: {
    default: "#ffffff",
    subtle: "#f9fafb",
    muted: "#f3f4f6",
    inverse: "#111827",
  },
  // Surface
  surface: {
    default: "#ffffff",
    hover: "#f9fafb",
    active: "#f3f4f6",
    selected: "#eff6ff",
    disabled: "#f3f4f6",
  },
  // Border
  border: {
    default: "#e5e7eb",
    strong: "#d1d5db",
    subtle: "#f3f4f6",
    focus: "#2563eb",
    error: "#ef4444",
  },
  // Text
  text: {
    primary: "#111827",
    secondary: "#4b5563",
    tertiary: "#6b7280",
    disabled: "#9ca3af",
    inverse: "#ffffff",
    link: "#2563eb",
    linkHover: "#1d4ed8",
  },
} as const;

export const semanticColors = {
  success: colors.success[500],
  warning: colors.warning[500],
  error: colors.error[500],
  info: colors.info[500],
} as const;

export type ColorToken = typeof colors;
