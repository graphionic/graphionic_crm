"use client";
import { useState } from "react";

type IconDef = { name: string; category: string; svg: string };

const icons: IconDef[] = [
  // Navigation
  { name: "dashboard", category: "Navigation", svg: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' },
  { name: "leads", category: "Navigation", svg: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>' },
  { name: "collection", category: "Navigation", svg: '<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>' },
  { name: "follow-ups", category: "Navigation", svg: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>' },
  { name: "outbox", category: "Navigation", svg: '<path d="M2 6l10 6 10-6"/><rect x="2" y="6" width="20" height="12" rx="2"/>' },
  { name: "campaigns", category: "Navigation", svg: '<path d="M3 11l9-6 9 6-9 6-9-6z"/><path d="M12 17v4"/><circle cx="12" cy="21" r="1"/>' },
  { name: "contacts", category: "Navigation", svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  { name: "analytics", category: "Navigation", svg: '<path d="M3 20V10"/><path d="M10 20V4"/><path d="M17 20v-8"/><path d="M22 20V14"/>' },
  { name: "settings", category: "Navigation", svg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 9 15a1.65 1.65 0 0 0-1-1.51V13a2 2 0 0 1 0-4v-.49c0-.6.4-1.12 1-1.51A1.65 1.65 0 0 0 10.82 6l.06-.06a2 2 0 1 1 2.83-2.83l-.06.06A1.65 1.65 0 0 0 13 4.99c.6.39 1 1 1 1.51V7a2 2 0 0 1 0 4v.49c0 .6-.4 1.12-1 1.51z"/>' },

  // Actions
  { name: "add", category: "Actions", svg: '<path d="M12 5v14M5 12h14"/>' },
  { name: "edit", category: "Actions", svg: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
  { name: "delete", category: "Actions", svg: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>' },
  { name: "save", category: "Actions", svg: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21V13H7v8"/><path d="M7 3v5h8"/>' },
  { name: "copy", category: "Actions", svg: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/>' },
  { name: "duplicate", category: "Actions", svg: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>' },
  { name: "archive", category: "Actions", svg: '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>' },
  { name: "refresh", category: "Actions", svg: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v6h-6"/>' },
  { name: "download", category: "Actions", svg: '<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M2 17v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2"/>' },
  { name: "upload", category: "Actions", svg: '<path d="M12 17V3"/><path d="M8 7l4-4 4 4"/><path d="M2 17v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2"/>' },
  { name: "import", category: "Actions", svg: '<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="2" y="17" width="20" height="4" rx="1"/>' },
  { name: "export", category: "Actions", svg: '<path d="M12 17V3"/><path d="M8 7l4-4 4 4"/><rect x="2" y="17" width="20" height="4" rx="1"/>' },
  { name: "filter", category: "Actions", svg: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>' },
  { name: "sort", category: "Actions", svg: '<path d="M3 6h12"/><path d="M3 12h9"/><path d="M3 18h6"/><path d="M18 6l3 3-3 3"/><path d="M21 9H12"/>' },
  { name: "search", category: "Actions", svg: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/>' },
  { name: "more-horizontal", category: "Actions", svg: '<circle cx="12" cy="12" r="1.5"/><circle cx="19.5" cy="12" r="1.5"/><circle cx="4.5" cy="12" r="1.5"/>' },
  { name: "more-vertical", category: "Actions", svg: '<circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19.5" r="1.5"/><circle cx="12" cy="4.5" r="1.5"/>' },

  // Communication
  { name: "mail", category: "Communication", svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>' },
  { name: "send", category: "Communication", svg: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>' },
  { name: "inbox", category: "Communication", svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M12 13l-6-4"/><path d="M12 13l6-4"/>' },
  { name: "phone", category: "Communication", svg: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 5 12.12 19.79 19.79 0 0 1 1.93 3.49 2 2 0 0 1 3.91 1h3a2 2 0 0 1 2 1.72c.12 1 .43 2.07 1 3.07a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.01-1.37a2 2 0 0 1 2.11-.45c1 .57 2.07 1 3.07 1.12A2 2 0 0 1 22 16.92z"/>' },
  { name: "message", category: "Communication", svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },

  // Users
  { name: "user", category: "Users", svg: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  { name: "users", category: "Users", svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8a4 4 0 0 1 0 8"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/>' },
  { name: "user-add", category: "Users", svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M16 11h6"/>' },

  // Status
  { name: "check", category: "Status", svg: '<path d="M5 12l5 5L20 7"/>' },
  { name: "warning", category: "Status", svg: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' },
  { name: "error", category: "Status", svg: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>' },
  { name: "info", category: "Status", svg: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>' },
  { name: "success", category: "Status", svg: '<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>' },
  { name: "clock", category: "Status", svg: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>' },
  { name: "pending", category: "Status", svg: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5"/><path d="M9 12h6"/>' },

  // Files
  { name: "file", category: "Files", svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>' },
  { name: "csv", category: "Files", svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>' },
  { name: "image", category: "Files", svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>' },
  { name: "attachment", category: "Files", svg: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>' },
  { name: "folder", category: "Files", svg: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' },

  // Interface
  { name: "menu", category: "Interface", svg: '<path d="M3 12h18M3 6h18M3 18h18"/>' },
  { name: "close", category: "Interface", svg: '<path d="M18 6L6 18M6 6l12 12"/>' },
  { name: "chevron-down", category: "Interface", svg: '<path d="M6 9l6 6 6-6"/>' },
  { name: "chevron-up", category: "Interface", svg: '<path d="M18 15l-6-6-6 6"/>' },
  { name: "chevron-right", category: "Interface", svg: '<path d="M9 18l6-6-6-6"/>' },
  { name: "arrow-right", category: "Interface", svg: '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>' },
  { name: "eye", category: "Interface", svg: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' },
  { name: "eye-off", category: "Interface", svg: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-4.47"/><path d="M1 1l22 22"/>' },
  { name: "calendar", category: "Interface", svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>' },
  { name: "bell", category: "Interface", svg: '<path d="M18 8A6 6 0 0 0 6 8c0 7-6 9-6 9h18s-6-2-6-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
  { name: "logout", category: "Interface", svg: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>' },
  { name: "help", category: "Interface", svg: '<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>' },
];

export default function IconsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [size, setSize] = useState(20);
  const [copied, setCopied] = useState<string | null>(null);

  const categories = ["All", "Navigation", "Actions", "Communication", "Users", "Status", "Files", "Interface"];

  const filtered = icons.filter((i) => {
    const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "All" || i.category === category;
    return matchesSearch && matchesCat;
  });

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>09 / 74 · FOUNDATIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Iconography</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Professional outline icons — 2px stroke, rounded joins, simple geometry, clear at 16px. No emojis. One consistent family.</p>
      </div>

      {/* Controls */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: 9, color: "#9299A8", fontSize: 13 }}>⌕</span>
          <input
            placeholder="Search icons... (e.g. lead, mail, filter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", height: 36, padding: "0 12px 0 32px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "1px solid #E5E3DF",
                background: category === c ? "#49339A" : "white",
                color: category === c ? "white" : "#60697A",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "Poppins",
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: "auto" }}>
          <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>Size:</span>
          {[16, 18, 20, 24, 32].map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                width: 32,
                height: 28,
                borderRadius: 6,
                border: "1px solid #E5E3DF",
                background: size === s ? "#151927" : "white",
                color: size === s ? "white" : "#60697A",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Icon grid */}
      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#60697A" }}>{filtered.length} icons • {size}px • {category}</span>
          <span style={{ fontSize: 11, color: "#9299A8" }}>Hover → Copy Name</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
          {filtered.map((icon) => (
            <div
              key={icon.name}
              onClick={() => copyName(icon.name)}
              style={{
                border: "1px solid #E5E3DF",
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                transition: "all 0.15s",
                background: copied === icon.name ? "#F0ECFA" : "white",
              }}
            >
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#151927" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: icon.svg }} />
              <div style={{ fontSize: 11, fontWeight: 500, color: "#151927", textAlign: "center" }}>{icon.name}</div>
              <div style={{ fontSize: 10, color: "#9299A8" }}>{icon.category}</div>
              {copied === icon.name && <div style={{ fontSize: 10, color: "#49339A", fontWeight: 600 }}>Copied!</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Icon usage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Real Usage</h4>
          <div style={{ display: "grid", gap: 12, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={{ background: "#49339A", color: "white", border: "none", height: 36, padding: "0 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, fontFamily: "Poppins" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> Create Lead
              </button>
              <span style={{ color: "#9299A8" }}>Button with icon — gap 8px</span>
            </div>
            <div style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9299A8" strokeWidth="1.8" style={{ position: "absolute", left: 10, top: 10 }}><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></svg>
              <input placeholder="Search leads..." style={{ width: "100%", height: 36, padding: "0 12px 0 32px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderTop: "1px solid #FAF9F7", borderBottom: "1px solid #FAF9F7" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4FAE91" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg> <span style={{ color: "#4FAE91", fontWeight: 500 }}>Success</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F29B38" strokeWidth="1.8" style={{ marginLeft: 12 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> <span style={{ color: "#F29B38", fontWeight: 500 }}>Pending</span>
            </div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Icon + Text Gap & Colors</h4>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Compact gap</span><span style={{ fontWeight: 500, color: "#151927" }}>6px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Standard gap</span><span style={{ fontWeight: 500, color: "#151927" }}>8px (default)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Spacious gap</span><span style={{ fontWeight: 500, color: "#151927" }}>10px</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Default color</span><span style={{ fontWeight: 500, color: "#151927" }}>Inherit text</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Interactive</span><span style={{ fontWeight: 500, color: "#49339A" }}>Royal Indigo</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#9299A8" }}>Standard size</span><span style={{ fontWeight: 500, color: "#151927" }}>18px or 20px</span></div>
          </div>
          <div style={{ marginTop: 12, padding: 10, background: "#FAF9F7", borderRadius: 8, fontSize: 11, color: "#60697A" }}>Do not randomly color navigation icons. Color must communicate hierarchy or meaning.</div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Icon Sizes — Visualized</h4>
        <div style={{ display: "flex", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
          {[12, 14, 16, 18, 20, 24, 32].map((s) => (
            <div key={s} style={{ textAlign: "center" }}>
              <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#151927" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
              <div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>{s}px</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
