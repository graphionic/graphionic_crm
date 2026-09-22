/**
 * Theme System - Index
 * Exports light, dark, and theme provider logic
 */
import { lightTheme } from "./light";
import { darkTheme } from "./dark";
import { colors } from "../tokens/colors";
import { typography } from "../tokens/typography";
import { spacing, radius, shadows, zIndex, breakpoints, animation, iconSizes } from "../tokens/spacing";

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  zIndex,
  breakpoints,
  animation,
  iconSizes,
} as const;

export type ThemeName = keyof typeof themes;
export type Theme = typeof lightTheme | typeof darkTheme;

export const defaultTheme: ThemeName = "light";

// CSS Variables generator for theme switching
export function generateCSSVariables(theme: Theme) {
  const vars: Record<string, string> = {};
  // Flatten colors to CSS vars
  Object.entries(theme.colors).forEach(([group, values]) => {
    if (typeof values === "object") {
      Object.entries(values).forEach(([key, value]) => {
        vars[`--color-${group}-${key}`] = value as string;
      });
    } else {
      vars[`--color-${group}`] = values as string;
    }
  });
  return vars;
}

export { lightTheme, darkTheme };
