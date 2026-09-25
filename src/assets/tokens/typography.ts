/**
 * ClientForge Design Tokens - Typography v2
 * Poppins geometric type scale for premium commercial admin dashboard
 */

export const typography = {
  fontFamily: {
    sans: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    display: "'Poppins', system-ui, sans-serif",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700, // Exceptional use only
  },
  fontSize: {
    overline: "0.6875rem", // 11px
    caption: "0.75rem", // 12px
    sm: "0.8125rem", // 13px
    base: "0.875rem", // 14px
    md: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.3125rem", // 21px
    "2xl": "1.625rem", // 26px
    "3xl": "2rem", // 32px
    display: "2.5rem", // 40px
  },
  lineHeight: {
    none: 1,
    tight: 1.2,
    h1: 1.25,
    h2: 1.3,
    h3: 1.35,
    normal: 1.4,
    body: 1.6,
  },
  letterSpacing: {
    normal: "0em",
    overline: "0.08em",
    subtle: "0.01em",
  },
  // Scale definitions
  display: { fontSize: "2.5rem", lineHeight: 1.2, fontWeight: 600 },
  heading: {
    h1: { fontSize: "2rem", lineHeight: 1.25, fontWeight: 600 },
    h2: { fontSize: "1.625rem", lineHeight: 1.3, fontWeight: 600 },
    h3: { fontSize: "1.3125rem", lineHeight: 1.35, fontWeight: 600 },
    h4: { fontSize: "1.125rem", lineHeight: 1.4, fontWeight: 600 },
    h5: { fontSize: "1rem", lineHeight: 1.4, fontWeight: 600 },
    h6: { fontSize: "0.875rem", lineHeight: 1.4, fontWeight: 600 },
  },
  body: {
    large: { fontSize: "1rem", lineHeight: 1.6, fontWeight: 400 },
    base: { fontSize: "0.875rem", lineHeight: 1.6, fontWeight: 400 },
    small: { fontSize: "0.8125rem", lineHeight: 1.5, fontWeight: 400 },
  },
  label: { fontSize: "0.8125rem", lineHeight: 1.3, fontWeight: 500 },
  caption: { fontSize: "0.75rem", lineHeight: 1.4, fontWeight: 400 },
  button: { fontSize: "0.875rem", lineHeight: 1.2, fontWeight: 500 },
  navigation: { fontSize: "0.875rem", lineHeight: 1.2, fontWeight: 500 },
  overline: { fontSize: "0.6875rem", lineHeight: 1.2, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  helper: { fontSize: "0.75rem", lineHeight: 1.4, color: "#9299A8" },
  link: { color: "#49339A", textDecoration: "none", fontWeight: 500 },
} as const;

export type TypographyToken = typeof typography;
