/**
 * Icon System - Master List
 * Based on dashboard inventory
 */

export const iconCategories = {
  navigation: ["dashboard", "menu", "close", "search", "settings", "chevron-up", "chevron-down", "chevron-left", "chevron-right", "arrow-up", "arrow-down", "arrow-left", "arrow-right"],
  actions: ["plus", "minus", "check", "x", "edit", "delete", "view", "eye-off", "sort", "filter", "refresh", "download", "upload", "import", "export", "copy", "save", "print", "share", "external-link"],
  communication: ["bell", "mail", "phone", "location", "message", "chat"],
  files: ["folder", "file", "file-csv", "file-excel", "file-pdf", "image", "video", "attachment"],
  ui: ["more-vertical", "more-horizontal", "drag-handle", "expand", "collapse", "fullscreen", "minimize", "info", "help", "warning", "error", "success", "star", "heart", "bookmark"],
  business: ["user", "users", "user-add", "database", "server", "api", "code", "analytics", "chart", "currency", "shopping-cart", "orders", "products", "invoice", "support", "calendar", "clock", "lock", "unlock"],
} as const;

export const iconSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  "2xl": 32,
} as const;

export const iconVariants = ["default", "muted", "primary", "success", "warning", "danger", "disabled"] as const;

export type IconName = typeof iconCategories[keyof typeof iconCategories][number];
export type IconSize = keyof typeof iconSizes;
export type IconVariant = typeof iconVariants[number];

// Icon mapping to unicode/emoji for quick prototyping (replace with SVG library later)
export const iconMap: Record<string, string> = {
  dashboard: "▦",
  menu: "☰",
  close: "✕",
  search: "⌕",
  settings: "⚙",
  user: "◍",
  users: "◍◍",
  "user-add": "＋◍",
  edit: "✎",
  delete: "🗑",
  view: "👁",
  "eye-off": "🚫👁",
  plus: "＋",
  minus: "－",
  check: "✓",
  x: "✕",
  "chevron-up": "▲",
  "chevron-down": "▼",
  "chevron-left": "◀",
  "chevron-right": "▶",
  sort: "⇅",
  filter: "⧩",
  refresh: "↻",
  download: "⬇",
  upload: "⬆",
  import: "⇪",
  export: "⇩",
  copy: "⎘",
  save: "💾",
  bell: "🔔",
  mail: "✉",
  phone: "☎",
  location: "📍",
  calendar: "📅",
  clock: "◷",
  folder: "📁",
  file: "📄",
  image: "🖼",
  video: "🎬",
  info: "ℹ",
  warning: "⚠",
  error: "⛔",
  success: "✅",
  star: "★",
  heart: "♥",
  lock: "🔒",
  unlock: "🔓",
  database: "🗄",
  chart: "📊",
  currency: "₹",
  "shopping-cart": "🛒",
};
