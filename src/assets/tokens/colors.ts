/**
 * ClientForge Design Tokens - Colors
 * Professional, Precise, Modern, Technical, Premium SaaS
 * Primary hierarchy: Navy → Forge Blue → Cyan → Violet
 */

export const colors = {
  // Brand - Forge
  forge: {
    navy: "#0B1224", // Forge Navy - primary brand, headers, text
    midnight: "#111B33", // Midnight - darker navy
    blue: "#315BE8", // Forge Blue - primary interactive
    electric: "#4C73FF", // Electric Blue - hover, active
    sky: "#38BDF8", // Sky Blue - secondary
    cyan: "#22D3EE", // Signal Cyan - energetic highlights
    violet: "#7C5CFC", // Violet - AI, automation, special
  },
  // Brand scale for Forge Blue
  brand: {
    50: "#EEF3FF", // Soft Blue
    100: "#D9E4FF",
    200: "#B3C8FF",
    300: "#8CABFF",
    400: "#658EFF",
    500: "#315BE8", // Forge Blue main
    600: "#2548C0",
    700: "#1D3898",
    800: "#111B33", // Midnight
    900: "#0B1224", // Forge Navy
  },
  // Neutral - Ink to Canvas
  neutral: {
    0: "#FFFFFF", // Surface
    50: "#F6F8FC", // Canvas
    100: "#EEF3FF", // Soft Blue
    200: "#DDE3EE", // Border
    300: "#C2CAD9",
    400: "#94A3B8",
    500: "#667085", // Slate
    600: "#475467",
    700: "#344054",
    800: "#1D2939",
    900: "#101828", // Ink
    950: "#0B1224", // Forge Navy
  },
  // Semantic - primarily for status
  semantic: {
    success: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      500: "#16A36A",
      600: "#15803D",
      700: "#166534",
    },
    warning: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      500: "#F59E0B",
      600: "#D97706",
      700: "#B45309",
    },
    danger: {
      50: "#FEF2F2",
      100: "#FEE2E2",
      500: "#E5484D",
      600: "#DC2626",
      700: "#B91C1C",
    },
    info: {
      50: "#EEF3FF",
      100: "#D9E4FF",
      500: "#315BE8",
      600: "#2548C0",
    },
  },
  // Surface
  surface: {
    canvas: "#F6F8FC",
    default: "#FFFFFF",
    subtle: "#F6F8FC",
    muted: "#EEF3FF",
    hover: "#F6F8FC",
    active: "#EEF3FF",
    selected: "#EEF3FF",
    disabled: "#F6F8FC",
    overlay: "rgba(11, 18, 36, 0.5)",
    inverse: "#0B1224",
  },
  // Border
  border: {
    default: "#DDE3EE",
    strong: "#C2CAD9",
    subtle: "#EEF3FF",
    focus: "#315BE8",
    error: "#E5484D",
    success: "#16A36A",
  },
  // Text
  text: {
    primary: "#101828", // Ink
    secondary: "#475467",
    tertiary: "#667085", // Slate
    disabled: "#98A2B3",
    inverse: "#FFFFFF",
    brand: "#0B1224", // Forge Navy
    link: "#315BE8",
    linkHover: "#2548C0",
    onBrand: "#FFFFFF",
  },
  // For backward compat
  primary: {
    50: "#EEF3FF",
    100: "#D9E4FF",
    200: "#B3C8FF",
    300: "#8CABFF",
    400: "#4C73FF",
    500: "#315BE8",
    600: "#2548C0",
    700: "#1D3898",
    800: "#111B33",
    900: "#0B1224",
  },
  secondary: {
    50: "#F6F8FC",
    100: "#EEF3FF",
    200: "#DDE3EE",
    300: "#C2CAD9",
    400: "#94A3B8",
    500: "#667085",
    600: "#475467",
    700: "#344054",
    800: "#1D2939",
    900: "#101828",
  },
} as const;

export const semanticColors = {
  success: colors.semantic.success[500],
  warning: colors.semantic.warning[500],
  error: colors.semantic.danger[500],
  info: colors.semantic.info[500],
  brand: colors.forge.blue,
  cyan: colors.forge.cyan,
  violet: colors.forge.violet,
} as const;
