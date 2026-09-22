"use client";
import { useState } from "react";

export default function TablesPage() {
  const [selected, setSelected] = useState<number[]>([1]);
  const leads = [
    { id: 1, company: "Glow Dentistry", email: "info@glowdentistry.co.uk", status: "New", source: "no_website", city: "London", assigned: "Sarah", last: "2d ago" },
    { id: 2, company: "Leith Optical", email: "leithoptical@fsmail.net", status: "Contacted", source: "super_fast_uk", city: "Edinburgh", assigned: "John", last: "1d ago" },
    { id: 3, company: "VIVA SKIN CLINICS", email: "bookings@vivaskinclinics.com", status: "Qualified", source: "super_fast_uk", city: "London", assigned: "Sarah", last: "3h ago" },
  ];

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>31 / 74 · DATA DISPLAY</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Tables — Leads System</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Realistic ClientForge Leads table with sorting, filters, row selection, pagination, status badges, avatar cells, bulk actions. Warm neutral, white cards, indigo accent.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E3DF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#151927" }}>Leads</span>
            <span style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", padding: "2px 8px", borderRadius: 20, fontSize: 11, color: "#60697A" }}>{leads.length} total</span>
            {selected.length > 0 && <span style={{ background: "#252E43", color: "white", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{selected.length} selected • Bulk actions</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Search leads..." style={{ height: 36, padding: "0 12px", border: "1px solid #E5E3DF", borderRadius: 8, fontSize: 12, width: 160, fontFamily: "Poppins" }} />
            <button style={{ height: 36, padding: "0 12px", border: "1px solid #E5E3DF", borderRadius: 8, background: "white", fontSize: 12, fontWeight: 500 }}>Filters</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAF9F7", textAlign: "left", borderBottom: "1px solid #E5E3DF" }}>
                <th style={{ padding: "10px 14px", width: 40 }}><input type="checkbox" checked={selected.length === leads.length} onChange={() => setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id))} /></th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", color: "#9299A8" }}>LEAD</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", color: "#9299A8" }}>COMPANY</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", color: "#9299A8" }}>EMAIL</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", color: "#9299A8" }}>STATUS</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", color: "#9299A8" }}>ASSIGNED</th>
                <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", color: "#9299A8" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: "1px solid #FAF9F7", background: selected.includes(lead.id) ? "#F0ECFA" : "white" }}>
                  <td style={{ padding: "10px 14px" }}><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} style={{ accentColor: "#49339A" }} /></td>
                  <td style={{ padding: "10px 14px" }}><div style={{ width: 28, height: 28, background: "#F0ECFA", color: "#49339A", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11 }}>{lead.company[0]}</div></td>
                  <td style={{ padding: "10px 14px", fontWeight: 500, color: "#151927" }}>{lead.company}</td>
                  <td style={{ padding: "10px 14px", color: "#60697A", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500, background: lead.status === "New" ? "#F0ECFA" : lead.status === "Contacted" ? "#FFF6E3" : "#EAF7FA", color: lead.status === "New" ? "#49339A" : lead.status === "Contacted" ? "#C27A28" : "#2F7A8F" }}>{lead.status}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 20, height: 20, background: "#E5E3DF", borderRadius: 6 }} /><span style={{ fontSize: 12, color: "#151927" }}>{lead.assigned}</span></div></td>
                  <td style={{ padding: "10px 14px" }}><span style={{ color: "#9299A8", fontSize: 12 }}>⋯</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
