/**
 * ClientForge Design Tokens - Colors v2
 * Premium commercial admin dashboard
 * Royal Indigo primary, Warm Amber secondary, Aqua data
 */

export const colors = {
  // Brand Primary - Royal Indigo
  brand: {
    50: "#F0ECFA",
    100: "#E2D8F5",
    200: "#C5B1EB",
    300: "#A88AE1",
    400: "#8B76CC",
    500: "#49339A", // Royal Indigo main
    600: "#38247F", // Primary Hover
    700: "#2C1D66",
    800: "#20164D",
    900: "#151027",
  },
  // Primary aliases
  primary: {
    50: "#F0ECFA",
    100: "#E2D8F5",
    200: "#C5B1EB",
    300: "#A88AE1",
    400: "#8B76CC",
    500: "#49339A",
    600: "#38247F",
    700: "#2C1D66",
    800: "#20164D",
    900: "#151027",
  },
  // Secondary Accent - Warm Amber
  accent: {
    50: "#FFF6E3", // Warm Cream
    100: "#FFEDC2",
    200: "#FBE0A0",
    300: "#F4BE52", // Warm Amber main
    400: "#F2B03A",
    500: "#F29B38",
    600: "#E08A2E",
    700: "#C27A28",
  },
  // Data / Info - Aqua
  aqua: {
    50: "#EAF7FA", // Ice Aqua
    100: "#D4EFF5",
    200: "#A9DFEB",
    300: "#62BDD4", // Aqua main
    400: "#4AA8C0",
    500: "#3D93AB",
    600: "#2F7A8F",
  },
  // Forge legacy for backward compat - map to new
  forge: {
    navy: "#252E43",
    midnight: "#1E2638",
    blue: "#49339A",
    electric: "#38247F",
    sky: "#62BDD4",
    cyan: "#62BDD4",
    violet: "#8B76CC",
  },
  // Navigation
  nav: {
    sidebar: "#252E43",
    sidebarHover: "#303A52",
    sidebarRaised: "#303A52",
    text: "#C9CED9",
    textMuted: "#8992A6",
    textActive: "#FFFFFF",
    border: "#303A52",
  },
  // Surfaces
  surface: {
    canvas: "#F7F6F3", // Application Canvas
    default: "#FFFFFF", // Card
    subtle: "#FAF9F7", // Soft Surface
    soft: "#FAF9F7",
    hover: "#FAF9F7",
    active: "#F0ECFA",
    selected: "#F0ECFA",
    disabled: "#FAF9F7",
    overlay: "rgba(21, 25, 39, 0.5)",
    inverse: "#252E43",
  },
  // Border
  border: {
    default: "#E5E3DF",
    strong: "#D8D5D0",
    subtle: "#F0EEEA",
    focus: "#49339A",
    error: "#EC6262",
    success: "#4FAE91",
  },
  // Text
  text: {
    primary: "#151927", // Heading / Ink
    secondary: "#60697A", // Body
    tertiary: "#9299A8", // Muted
    disabled: "#B8BDC8",
    inverse: "#FFFFFF",
    brand: "#151927",
    link: "#49339A",
    linkHover: "#38247F",
    onBrand: "#FFFFFF",
  },
  // Neutral - warm
  neutral: {
    0: "#FFFFFF",
    50: "#FAF9F7",
    100: "#F7F6F3",
    200: "#E5E3DF",
    300: "#D8D5D0",
    400: "#B8BDC8",
    500: "#9299A8",
    600: "#60697A",
    700: "#4A5363",
    800: "#252E43",
    900: "#151927",
    950: "#0F1220",
  },
  // Semantic
  semantic: {
    success: {
      50: "#EEF8F4",
      100: "#D5EDE3",
      500: "#4FAE91",
      600: "#3D9A7D",
      700: "#2F7A63",
    },
    warning: {
      50: "#FFF6E3",
      100: "#FFEDC2",
      500: "#F29B38",
      600: "#E08A2E",
      700: "#C27A28",
    },
    danger: {
      50: "#FDECEC",
      100: "#FBD5D5",
      500: "#EC6262",
      600: "#D94F4F",
      700: "#B93E3E",
    },
    info: {
      50: "#EAF7FA",
      100: "#D4EFF5",
      500: "#62BDD4",
      600: "#4AA8C0",
    },
  },
  // Data Viz Palette
  dataViz: {
    indigo: "#49339A",
    amber: "#F4BE52",
    aqua: "#62BDD4",
    green: "#4FAE91",
    coral: "#EC6262",
    lavender: "#8B76CC",
  },
  // Backward compat secondary
  secondary: {
    50: "#FAF9F7",
    100: "#F7F6F3",
    200: "#E5E3DF",
    300: "#D8D5D0",
    400: "#B8BDC8",
    500: "#9299A8",
    600: "#60697A",
    700: "#4A5363",
    800: "#252E43",
    900: "#151927",
  },
} as const;

export const semanticColors = {
  success: colors.semantic.success[500],
  warning: colors.semantic.warning[500],
  error: colors.semantic.danger[500],
  info: colors.semantic.info[500],
  brand: colors.brand[500],
  amber: colors.accent[300],
  aqua: colors.aqua[300],
} as const;
