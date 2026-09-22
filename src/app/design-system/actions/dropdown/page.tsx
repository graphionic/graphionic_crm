"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dropdown, ActionMenuTrigger } from "@/components/ui/Dropdown";
import { IconButton } from "@/components/ui/IconButton";

export default function DropdownPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([1]);

  const leadActions = [
    { label: "View Lead", icon: <span>👁</span>, onClick: () => alert("View") },
    { label: "Edit Lead", icon: <span>✎</span>, onClick: () => alert("Edit") },
    { label: "Duplicate", icon: <span>⎘</span>, shortcut: "⌘D" },
    { divider: true } as any,
    { label: "Assign To", icon: <span>👤</span>, children: [{ label: "Aarav Patel" }, { label: "Neha Shah" }, { label: "Rohan Mehta" }] },
    { label: "Change Status", icon: <span>◍</span>, children: [{ label: "New" }, { label: "Contacted" }, { label: "Qualified" }, { label: "Won" }, { label: "Lost" }] },
    { divider: true } as any,
    { label: "Archive", icon: <span>📦</span> },
    { label: "Delete", icon: <span>🗑</span>, danger: true, onClick: () => setShowModal(true) },
  ];

  const bulkActions = [
    { label: "Assign", icon: <span>👤</span> },
    { label: "Change Status", icon: <span>◍</span>, children: [{ label: "New" }, { label: "Contacted" }, { label: "Qualified" }] },
    { label: "Export", icon: <span>⇧</span> },
    { label: "More", icon: <span>⋯</span>, children: [{ label: "Archive" }, { label: "Delete", danger: true }] },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>13 / 74 · ACTIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Dropdown Actions</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Production-quality action menu — icons, labels, shortcuts, dividers, nested, danger, disabled, selected, checkbox. Shadow elevation, not heavy.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Basic Action Menu — Trigger Actions ▾ or ⋯</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <Dropdown
              trigger={<ActionMenuTrigger>Actions ▾</ActionMenuTrigger>}
              items={leadActions}
            />
            <Dropdown
              trigger={<IconButton icon={<span>⋯</span>} label="More actions" />}
              items={leadActions}
            />
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Click to open • Item hover #FAF9F7 • Focus ring indigo • Selected indigo tint • Danger coral • Disabled muted</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Anatomy</h3>
          <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Trigger</span><span style={{ fontWeight: 500 }}>Actions ▾ or ⋯ icon button</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Menu surface</span><span style={{ fontWeight: 500 }}>white, border #E5E3DF, radius 10, shadow-md</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Menu item</span><span style={{ fontWeight: 500 }}>8px 10px, radius 6, 13px/400</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FAF9F7" }}><span style={{ color: "#9299A8" }}>Icon / Label / Shortcut</span><span style={{ fontWeight: 500 }}>16px icon, 13px label, 11px shortcut mono</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span style={{ color: "#9299A8" }}>Divider / Danger</span><span style={{ fontWeight: 500 }}>1px #F0EEEA / #EC6262 coral</span></div>
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Nested Action Menu — Change Status & Assign To</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 12, background: "#FAF9F7" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Change Status ›</div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 6, display: "grid", gap: 2, minWidth: 160 }}>
              {["New", "Contacted", "Qualified", "Won", "Lost"].map((s) => (
                <div key={s} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, background: s === "Qualified" ? "#F0ECFA" : "transparent", color: s === "Qualified" ? "#49339A" : "#151927" }}>{s} {s === "Qualified" && "✓"}</div>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, padding: 12, background: "#FAF9F7" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9299A8", marginBottom: 8 }}>Assign To ›</div>
            <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 6, display: "grid", gap: 2, minWidth: 160 }}>
              {["Aarav Patel", "Neha Shah", "Rohan Mehta"].map((u) => (
                <div key={u} style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, background: "#F0ECFA", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#49339A" }}>{u[0]}</div> {u}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 10 }}>Action Menu Types</h4>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div><strong style={{ color: "#151927" }}>1. Navigation menu</strong><br/><span style={{ color: "#60697A" }}>Sidebar, top nav — persistent, no overlay</span></div>
            <div><strong style={{ color: "#151927" }}>2. Action menu</strong><br/><span style={{ color: "#60697A" }}>Row actions, toolbar — overlay, single action, close on select</span></div>
            <div><strong style={{ color: "#151927" }}>3. Selection menu</strong><br/><span style={{ color: "#60697A" }}>Select, multi-select — checkbox, selected state, stays open for multi</span></div>
            <div><strong style={{ color: "#151927" }}>4. Context menu</strong><br/><span style={{ color: "#60697A" }}>Right-click, long-press — same as action but triggered by context</span></div>
            <div><strong style={{ color: "#151927" }}>5. Overflow menu</strong><br/><span style={{ color: "#60697A" }}>⋯ — low-frequency actions, inside More</span></div>
          </div>
        </div>

        <div style={{ background: "#FDECEC", border: "1px solid #FBD5D5", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#B93E3E", marginBottom: 10 }}>Destructive Action Pattern — Critical</h4>
          <div style={{ fontSize: 12, color: "#60697A", marginBottom: 12 }}>Lead row → More → Delete → Confirmation Modal (not immediate)</div>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#151927", marginBottom: 8 }}>Delete lead?</div>
            <div style={{ fontSize: 12, color: "#60697A", marginBottom: 16 }}>Sarah Johnson will be permanently removed from ClientForge.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="danger" size="sm">Delete Lead</Button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#B93E3E", marginTop: 8 }}>Dangerous actions should NOT execute immediately from dropdown</div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Bulk Action Preview — Action primitives together</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#252E43", color: "white", padding: "10px 16px", borderRadius: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>3 leads selected</span>
          <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
            <Button size="sm" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F" }}>Assign</Button>
            <Button size="sm" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F" }}>Change Status</Button>
            <Button size="sm" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F" }}>Export</Button>
            <Dropdown trigger={<Button size="sm" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F" }}>More ▾</Button>} items={[{ label: "Archive" }, { label: "Delete", danger: true }]} />
          </div>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#C9CED9", cursor: "pointer" }}>Clear selection ×</span>
        </div>
        <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>Not full bulk system yet — only action-component demo</div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Command / Toolbar Example — Leads Page (Real Components)</h3>
        <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F0EEEA" }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: "#151927" }}>Leads</span>
            <Button size="sm">+ Create Lead</Button>
          </div>
          <div style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#FAF9F7" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <span style={{ position: "absolute", left: 10, top: 8, color: "#9299A8", fontSize: 12 }}>⌕</span>
              <input placeholder="Search leads..." style={{ width: "100%", height: 36, padding: "0 12px 0 32px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 12, fontFamily: "Poppins" }} />
            </div>
            <Dropdown trigger={<ActionMenuTrigger>Status ▾</ActionMenuTrigger>} items={[{ label: "All" }, { label: "New" }, { label: "Contacted" }]} />
            <Dropdown trigger={<ActionMenuTrigger>Owner ▾</ActionMenuTrigger>} items={[{ label: "All" }, { label: "Aarav" }]} />
            <Dropdown trigger={<ActionMenuTrigger>Source ▾</ActionMenuTrigger>} items={[{ label: "All" }, { label: "No Website" }]} />
            <Button variant="secondary" size="sm">More Filters</Button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <Button variant="secondary" size="sm">Import</Button>
              <Button variant="secondary" size="sm">Export</Button>
              <IconButton icon={<span>⋯</span>} label="More" size="sm" />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#9299A8", marginTop: 8 }}>This preview uses ACTUAL reusable Button, IconButton, Dropdown primitives — not fake docs-only controls</div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(21,25,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Delete lead?</h3>
            <p style={{ fontSize: 13, color: "#60697A", marginBottom: 16 }}>Sarah Johnson will be permanently removed from ClientForge.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setShowModal(false)}>Delete Lead</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
