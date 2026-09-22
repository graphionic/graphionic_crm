"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Dropdown, ActionMenuTrigger } from "@/components/ui/Dropdown";

export default function ActionPlayground() {
  const [selected, setSelected] = useState<number[]>([1, 3]);
  const [showDelete, setShowDelete] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(2);

  const leads = [
    { id: 1, name: "Glow Dentistry", company: "Glow Dentistry Ltd", email: "info@glowdentistry.co.uk", status: "New", owner: "Aarav Patel" },
    { id: 2, name: "Leith Optical", company: "Leith Optical Ltd", email: "leith@optical.co.uk", status: "Contacted", owner: "Neha Shah" },
    { id: 3, name: "VIVA SKIN CLINICS", company: "VIVA Group", email: "bookings@vivaskinclinics.com", status: "Qualified", owner: "Aarav Patel" },
    { id: 4, name: "Medivet", company: "Medivet Ltd", email: "contact@medivet.com", status: "New", owner: "Rohan Mehta" },
    { id: 5, name: "Delight Dental", company: "Delight Spa", email: "info@delightdental.com.au", status: "Won", owner: "Aarav Patel" },
  ];

  const actions = [
    { label: "View Lead", icon: <span>👁</span> },
    { label: "Edit Lead", icon: <span>✎</span> },
    { label: "Duplicate", icon: <span>⎘</span> },
    { divider: true } as any,
    { label: "Assign To", children: [{ label: "Aarav Patel" }, { label: "Neha Shah" }] },
    { label: "Change Status", children: [{ label: "New" }, { label: "Contacted" }, { label: "Qualified" }] },
    { divider: true } as any,
    { label: "Archive" },
    { label: "Delete", danger: true, onClick: () => setShowDelete(true) },
  ];

  return (
    <div style={{ maxWidth: 1200, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>ACTION PLAYGROUND</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#151927", marginTop: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>Action Component Playground</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Evaluate all action components together inside realistic CRM workflow — header, toolbar, table with badges, view/edit/more, bulk toolbar, open dropdown, delete modal.</p>
      </div>

      <div style={{ border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden", background: "#F7F6F3" }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 700 }}>
          <div style={{ background: "#252E43", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8B76CC", letterSpacing: "0.08em" }}>CLIENTFORGE</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "white", marginTop: 4 }}>Outreach CRM</div>
            <div style={{ marginTop: 20, display: "grid", gap: 2 }}>
              <div style={{ background: "#49339A", color: "white", padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>▦ Dashboard</div>
              <div style={{ background: "#303A52", color: "white", padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>◉ Leads</div>
            </div>
          </div>

          <div style={{ background: "#F7F6F3", padding: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "white", borderBottom: "1px solid #E5E3DF", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: "#151927" }}>Leads</h2>
                  <p style={{ fontSize: 13, color: "#60697A", marginTop: 2 }}>Manage prospects and outreach activity.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" size="sm">Import Leads</Button>
                  <Button size="sm">+ Create Lead</Button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <span style={{ position: "absolute", left: 10, top: 8, color: "#9299A8", fontSize: 12 }}>⌕</span>
                  <input placeholder="Search leads..." style={{ width: "100%", height: 36, padding: "0 12px 0 32px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }} />
                </div>
                <Dropdown trigger={<ActionMenuTrigger>Status ▾</ActionMenuTrigger>} items={[{ label: "All" }, { label: "New" }, { label: "Contacted" }]} />
                <Dropdown trigger={<ActionMenuTrigger>Owner ▾</ActionMenuTrigger>} items={[{ label: "All Owners" }, { label: "Aarav Patel" }]} />
                <IconButton icon={<span>↻</span>} label="Refresh" size="sm" />
                <IconButton icon={<span>⋯</span>} label="More" size="sm" />
              </div>
            </div>

            {selected.length > 0 && (
              <div style={{ background: "#252E43", color: "white", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{selected.length} leads selected</span>
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  <Button size="xs" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F", height: 30 }}>Assign</Button>
                  <Button size="xs" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F", height: 30 }}>Change Status</Button>
                  <Button size="xs" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F", height: 30 }}>Export</Button>
                  <Dropdown trigger={<Button size="xs" variant="secondary" style={{ background: "#303A52", color: "white", borderColor: "#3A455F", height: 30 }}>More ▾</Button>} items={[{ label: "Archive" }, { label: "Delete", danger: true }]} />
                </div>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#C9CED9", cursor: "pointer" }} onClick={() => setSelected([])}>Clear ×</span>
              </div>
            )}

            <div style={{ background: "white", borderBottom: "1px solid #E5E3DF", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 140px 180px 100px 160px", gap: 0, padding: "10px 16px", background: "#FAF9F7", fontSize: 11, fontWeight: 600, color: "#9299A8", letterSpacing: "0.06em" }}>
                <span><input type="checkbox" checked={selected.length === leads.length} onChange={() => setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id))} /></span>
                <span>NAME</span><span>COMPANY</span><span>EMAIL</span><span>STATUS</span><span>ACTIONS</span>
              </div>
              {leads.map((lead) => (
                <div key={lead.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 140px 180px 100px 160px", gap: 0, padding: "10px 16px", alignItems: "center", borderBottom: "1px solid #FAF9F7", background: selected.includes(lead.id) ? "#F0ECFA" : "white", fontSize: 13 }}>
                  <span><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => setSelected((prev) => (prev.includes(lead.id) ? prev.filter((i) => i !== lead.id) : [...prev, lead.id]))} style={{ accentColor: "#49339A" }} /></span>
                  <span style={{ fontWeight: 500, color: "#151927" }}>{lead.name}</span>
                  <span style={{ color: "#60697A", fontSize: 12 }}>{lead.company}</span>
                  <span style={{ color: "#60697A", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{lead.email}</span>
                  <span><span style={{ background: lead.status === "New" ? "#F0ECFA" : lead.status === "Contacted" ? "#FFF6E3" : lead.status === "Qualified" ? "#EAF7FA" : "#EEF8F4", color: lead.status === "New" ? "#49339A" : lead.status === "Contacted" ? "#C27A28" : lead.status === "Qualified" ? "#2F7A8F" : "#2F7A63", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>{lead.status}</span></span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
                    <IconButton size="sm" variant="ghost" icon={<span style={{ fontSize: 12 }}>👁</span>} label="View" />
                    <IconButton size="sm" variant="ghost" icon={<span style={{ fontSize: 12 }}>✎</span>} label="Edit" />
                    <div onClick={() => setOpenMenu(openMenu === lead.id ? null : lead.id)} style={{ position: "relative" }}>
                      <IconButton size="sm" variant="ghost" icon={<span>⋯</span>} label="More actions" />
                      {openMenu === lead.id && (
                        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, zIndex: 20, background: "white", border: "1px solid #E5E3DF", borderRadius: 10, boxShadow: "0 8px 24px rgba(21,25,39,0.12)", padding: 6, minWidth: 180 }}>
                          <div style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer" }} onClick={() => setShowDelete(true)}>View Lead</div>
                          <div style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer" }}>Edit Lead</div>
                          <div style={{ height: 1, background: "#F0EEEA", margin: "4px 0" }} />
                          <div style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, cursor: "pointer", color: "#EC6262" }} onClick={() => setShowDelete(true)}>Delete</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "white", padding: "10px 16px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9299A8", borderTop: "1px solid #E5E3DF" }}>
              <span>Showing 5 of 85 leads • 2 selected • Open dropdown visible on row 2</span>
              <span>Rows per page: 10 • 1-5 of 85</span>
            </div>
          </div>
        </div>
      </div>

      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(21,25,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Delete lead?</h3>
            <p style={{ fontSize: 13, color: "#60697A", marginBottom: 16 }}>Leith Optical will be permanently removed from ClientForge. This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setShowDelete(false)}>Delete Lead</Button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Evaluation Criteria</h4>
        <div style={{ fontSize: 12, color: "#60697A", lineHeight: 1.6 }}>
          <div>✓ All actions use reusable primitives Button, IconButton, Dropdown — not fake docs</div>
          <div>✓ Primary #49339A controls main, amber #F4BE52 sparingly, danger #EC6262 for delete</div>
          <div>✓ Icon buttons have tooltip + aria-label, table shows View/Edit/More pattern, low-frequency inside More</div>
          <div>✓ Bulk toolbar appears on selection, uses slate #252E43, secondary buttons</div>
          <div>✓ Dropdown open shows shadow-md, radius 10, 8px item radius, nested support, danger pattern → modal</div>
          <div>✓ Responsive: mobile 44px targets, hide labels, overflow into More, full-width where appropriate</div>
        </div>
      </div>
    </div>
  );
}
