/**
 * Dark Theme - ClientForge Admin
 */
import { colors } from "../tokens/colors";

export const darkTheme = {
  name: "dark",
  colors: {
    bg: {
      default: "#0f172a",
      subtle: "#1e293b",
      muted: "#334155",
      canvas: "#020617",
    },
    surface: {
      default: "#1e293b",
      hover: "#334155",
      active: "#475569",
      selected: "#1e3a5f",
      overlay: "rgba(0,0,0,0.7)",
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#94a3b8",
      tertiary: "#64748b",
      disabled: "#475569",
      inverse: "#0f172a",
      link: "#60a5fa",
    },
    border: {
      default: "#334155",
      strong: "#475569",
      subtle: "#1e293b",
      focus: "#60a5fa",
    },
    primary: "#3b82f6",
    primaryHover: "#60a5fa",
    primaryActive: "#2563eb",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.3)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.4)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.4)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.5)",
  },
} as const;

export type DarkTheme = typeof darkTheme;
