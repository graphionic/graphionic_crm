/**
 * Light Theme - ClientForge Admin
 */
import { colors } from "../tokens/colors";

export const lightTheme = {
  name: "light",
  colors: {
    // Background
    bg: {
      default: "#ffffff",
      subtle: "#f9fafb",
      muted: "#f3f4f6",
      canvas: "#f9fafb",
    },
    // Surface
    surface: {
      default: "#ffffff",
      hover: "#f9fafb",
      active: "#f3f4f6",
      selected: "#eff6ff",
      overlay: "rgba(0,0,0,0.5)",
    },
    // Text
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
      tertiary: colors.neutral[500],
      disabled: colors.neutral[400],
      inverse: "#ffffff",
      link: colors.primary[500],
    },
    // Border
    border: {
      default: colors.neutral[200],
      strong: colors.neutral[300],
      subtle: colors.neutral[100],
      focus: colors.primary[500],
    },
    // Primary
    primary: colors.primary[500],
    primaryHover: colors.primary[600],
    primaryActive: colors.primary[700],
    // Semantic
    success: colors.semantic.success[500],
    warning: colors.semantic.warning[500],
    error: colors.semantic.danger[500],
    info: colors.semantic.info[500],
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
} as const;

export type LightTheme = typeof lightTheme;
