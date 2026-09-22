/**
 * Design Tokens - Typography
 */

export const typography = {
  fontFamily: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "JetBrains Mono, 'SF Mono', Monaco, monospace",
    display: "Inter, sans-serif",
  },
  fontWeight: {
    thin: 100,
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
  // Heading scale H1-H6
  heading: {
    h1: { fontSize: "2.25rem", lineHeight: 1.25, fontWeight: 800, letterSpacing: "-0.025em" },
    h2: { fontSize: "1.875rem", lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontSize: "1.5rem", lineHeight: 1.375, fontWeight: 600 },
    h4: { fontSize: "1.25rem", lineHeight: 1.375, fontWeight: 600 },
    h5: { fontSize: "1.125rem", lineHeight: 1.5, fontWeight: 600 },
    h6: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 600 },
  },
  body: {
    large: { fontSize: "1.125rem", lineHeight: 1.625 },
    base: { fontSize: "1rem", lineHeight: 1.5 },
    small: { fontSize: "0.875rem", lineHeight: 1.5 },
  },
  caption: { fontSize: "0.75rem", lineHeight: 1.5, fontWeight: 400 },
  helper: { fontSize: "0.75rem", lineHeight: 1.5, color: "#6b7280" },
  label: { fontSize: "0.875rem", lineHeight: 1.25, fontWeight: 500 },
  link: { color: "#2563eb", textDecoration: "underline", fontWeight: 500 },
} as const;

export type TypographyToken = typeof typography;
