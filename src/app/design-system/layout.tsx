"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { num: string; label: string; href: string; ready?: boolean };
type NavGroup = { id: string; title: string; items: NavItem[] };

const navigation: NavGroup[] = [
  {
    id: "foundations",
    title: "01 FOUNDATIONS",
    items: [
      { num: "01", label: "Overview", href: "/design-system", ready: true },
      { num: "02", label: "Colors", href: "/design-system/foundations/colors", ready: true },
      { num: "03", label: "Typography", href: "/design-system/foundations/typography", ready: true },
      { num: "04", label: "Spacing", href: "/design-system/foundations/spacing", ready: true },
      { num: "05", label: "Radius", href: "/design-system/foundations/radius", ready: false },
      { num: "06", label: "Shadows", href: "/design-system/foundations/shadows", ready: false },
      { num: "07", label: "Grid & Breakpoints", href: "/design-system/foundations/grid", ready: false },
      { num: "08", label: "Motion", href: "/design-system/foundations/motion", ready: false },
      { num: "09", label: "Iconography", href: "/design-system/foundations/icons", ready: false },
    ],
  },
  {
    id: "actions",
    title: "02 ACTIONS",
    items: [
      { num: "10", label: "Buttons", href: "/design-system/actions/buttons", ready: true },
      { num: "11", label: "Button Groups", href: "/design-system/actions/button-groups", ready: false },
      { num: "12", label: "Icon Buttons", href: "/design-system/actions/icon-buttons", ready: false },
      { num: "13", label: "Dropdown Actions", href: "/design-system/actions/dropdown", ready: false },
    ],
  },
  {
    id: "form",
    title: "03 FORM CONTROLS",
    items: [
      { num: "14", label: "Text Inputs", href: "/design-system/form-controls/inputs", ready: true },
      { num: "15", label: "Textarea", href: "/design-system/form-controls/textarea", ready: false },
      { num: "16", label: "Select", href: "/design-system/form-controls/select", ready: true },
      { num: "17", label: "Searchable Select", href: "/design-system/form-controls/searchable", ready: false },
      { num: "18", label: "Multi Select", href: "/design-system/form-controls/multi", ready: false },
      { num: "19", label: "Checkbox", href: "/design-system/form-controls/checkbox", ready: false },
      { num: "20", label: "Radio", href: "/design-system/form-controls/radio", ready: false },
      { num: "21", label: "Switch", href: "/design-system/form-controls/switch", ready: false },
      { num: "22", label: "Date Picker", href: "/design-system/form-controls/date", ready: false },
      { num: "23", label: "Time Picker", href: "/design-system/form-controls/time", ready: false },
      { num: "24", label: "File Upload", href: "/design-system/form-controls/upload", ready: false },
      { num: "25", label: "Form Validation", href: "/design-system/form-controls/validation", ready: false },
    ],
  },
  {
    id: "data",
    title: "04 DATA DISPLAY",
    items: [
      { num: "26", label: "Cards", href: "/design-system/data-display/cards", ready: true },
      { num: "27", label: "KPI Cards", href: "/design-system/data-display/kpi", ready: false },
      { num: "28", label: "Badges & Tags", href: "/design-system/data-display/badges", ready: true },
      { num: "29", label: "Avatars", href: "/design-system/data-display/avatars", ready: false },
      { num: "30", label: "Lists", href: "/design-system/data-display/lists", ready: false },
      { num: "31", label: "Tables", href: "/design-system/data-display/tables", ready: true },
      { num: "32", label: "Data Tables", href: "/design-system/data-display/data-tables", ready: false },
      { num: "33", label: "Charts", href: "/design-system/data-display/charts", ready: false },
      { num: "34", label: "Progress", href: "/design-system/data-display/progress", ready: false },
      { num: "35", label: "Timeline", href: "/design-system/data-display/timeline", ready: false },
    ],
  },
  {
    id: "nav",
    title: "05 NAVIGATION",
    items: [
      { num: "36", label: "Navbar", href: "/design-system/navigation/navbar", ready: false },
      { num: "37", label: "Sidebar", href: "/design-system/navigation/sidebar", ready: false },
      { num: "38", label: "Breadcrumbs", href: "/design-system/navigation/breadcrumbs", ready: false },
      { num: "39", label: "Tabs", href: "/design-system/navigation/tabs", ready: false },
      { num: "40", label: "Pagination", href: "/design-system/navigation/pagination", ready: false },
      { num: "41", label: "Menus", href: "/design-system/navigation/menus", ready: false },
    ],
  },
  {
    id: "feedback",
    title: "06 FEEDBACK",
    items: [
      { num: "42", label: "Alerts", href: "/design-system/feedback/alerts", ready: false },
      { num: "43", label: "Toasts", href: "/design-system/feedback/toasts", ready: false },
      { num: "44", label: "Modals", href: "/design-system/feedback/modals", ready: false },
      { num: "45", label: "Drawers", href: "/design-system/feedback/drawers", ready: false },
      { num: "46", label: "Tooltips", href: "/design-system/feedback/tooltips", ready: false },
      { num: "47", label: "Popovers", href: "/design-system/feedback/popovers", ready: false },
      { num: "48", label: "Loading", href: "/design-system/feedback/loading", ready: false },
      { num: "49", label: "Skeletons", href: "/design-system/feedback/skeletons", ready: false },
      { num: "50", label: "Empty States", href: "/design-system/feedback/empty", ready: false },
      { num: "51", label: "Error States", href: "/design-system/feedback/error", ready: false },
    ],
  },
  {
    id: "patterns",
    title: "07 PATTERNS",
    items: [
      { num: "52", label: "Search", href: "/design-system/patterns/search", ready: false },
      { num: "53", label: "Filters", href: "/design-system/patterns/filters", ready: false },
      { num: "54", label: "Bulk Actions", href: "/design-system/patterns/bulk", ready: false },
      { num: "55", label: "CRUD", href: "/design-system/patterns/crud", ready: false },
      { num: "56", label: "Form Layouts", href: "/design-system/patterns/forms", ready: false },
      { num: "57", label: "Wizards", href: "/design-system/patterns/wizards", ready: false },
      { num: "58", label: "Import / Export", href: "/design-system/patterns/import", ready: false },
      { num: "59", label: "Command Palette", href: "/design-system/patterns/command", ready: false },
    ],
  },
  {
    id: "app",
    title: "08 APPLICATION",
    items: [
      { num: "60", label: "Authentication", href: "/design-system/application/auth", ready: false },
      { num: "61", label: "Dashboard", href: "/design-system/application/dashboard", ready: false },
      { num: "62", label: "Users", href: "/design-system/application/users", ready: false },
      { num: "63", label: "Roles & Permissions", href: "/design-system/application/roles", ready: false },
      { num: "64", label: "Settings", href: "/design-system/application/settings", ready: false },
      { num: "65", label: "Notifications", href: "/design-system/application/notifications", ready: false },
      { num: "66", label: "Audit Logs", href: "/design-system/application/audit", ready: false },
    ],
  },
  {
    id: "templates",
    title: "09 TEMPLATES",
    items: [
      { num: "67", label: "List Page", href: "/design-system/templates/list", ready: false },
      { num: "68", label: "Create Page", href: "/design-system/templates/create", ready: false },
      { num: "69", label: "Edit Page", href: "/design-system/templates/edit", ready: false },
      { num: "70", label: "Details Page", href: "/design-system/templates/details", ready: false },
      { num: "71", label: "Analytics Page", href: "/design-system/templates/analytics", ready: false },
      { num: "72", label: "Settings Page", href: "/design-system/templates/settings", ready: false },
      { num: "73", label: "Auth Pages", href: "/design-system/templates/auth", ready: false },
      { num: "74", label: "Error Pages", href: "/design-system/templates/error", ready: false },
    ],
  },
];

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredNav = navigation.map((group) => ({
    ...group,
    items: group.items.filter((item) => !search || item.label.toLowerCase().includes(search.toLowerCase()) || item.num.includes(search)),
  })).filter((group) => group.items.length > 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F6F8FC", fontFamily: "Inter, -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 300,
          background: "#0B1224",
          color: "white",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1A233F" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#7C5CFC", marginBottom: 4 }}>CLIENTFORGE</div>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>ADMIN DESIGN SYSTEM</div>
            </div>
            <span style={{ fontSize: 10, background: "#1A233F", border: "1px solid #2A3655", padding: "3px 8px", borderRadius: 12, color: "#8CA0C7" }}>v1.0</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: "#111B33", border: "1px solid #1E2A4A", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#4A5C85", fontSize: 12 }}>⌕</span>
              <input
                placeholder="Search components..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: "white", fontSize: 12, width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {filteredNav.map((group) => (
            <div key={group.id} style={{ marginBottom: 16 }}>
              <button
                onClick={() => toggleGroup(group.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 20px",
                  background: "transparent",
                  border: "none",
                  color: "#8CA0C7",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{group.title}</span>
                <span style={{ fontSize: 10, transform: collapsed[group.id] ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
              </button>
              {!collapsed[group.id] && (
                <div style={{ marginTop: 4 }}>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "8px 20px 8px 20px",
                          textDecoration: "none",
                          background: isActive ? "#111B33" : "transparent",
                          borderLeft: isActive ? "2px solid #315BE8" : "2px solid transparent",
                          color: isActive ? "white" : "#8CA0C7",
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 400,
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#4C73FF" : "#4A5C85", minWidth: 20 }}>{item.num}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.ready ? (
                          <span style={{ width: 6, height: 6, background: "#16A36A", borderRadius: "50%" }} />
                        ) : (
                          <span style={{ fontSize: 9, color: "#4A5C85", background: "#111B33", padding: "2px 6px", borderRadius: 10 }}>SOON</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: "1px solid #1A233F", fontSize: 11, color: "#4A5C85" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>Components</span>
            <span style={{ color: "#8CA0C7" }}>74 total • 10 ready</span>
          </div>
          <div style={{ height: 4, background: "#111B33", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "13.5%", height: "100%", background: "#315BE8" }} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ marginLeft: 300, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div
          style={{
            height: 56,
            background: "white",
            borderBottom: "1px solid #DDE3EE",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
            <span style={{ color: "#667085" }}>ClientForge</span>
            <span style={{ color: "#DDE3EE" }}>·</span>
            <span style={{ fontWeight: 600, color: "#0B1224" }}>Admin Design System</span>
            <span style={{ background: "#EEF3FF", color: "#315BE8", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>v1.0</span>
            <span style={{ background: "#ECFDF5", color: "#16A36A", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, background: "#16A36A", borderRadius: "50%" }} /> Ready
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/dashboard" style={{ fontSize: 12, color: "#667085", textDecoration: "none", fontWeight: 500 }}>← Back to CRM</Link>
            <div style={{ width: 1, height: 16, background: "#DDE3EE" }} />
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
            >
              {theme === "light" ? "☾ Dark" : "☀ Light"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 32 }}>{children}</div>
      </div>
    </div>
  );
}
