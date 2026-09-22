"use client";
import { useState } from "react";

export default function TablesPage() {
  const [selected, setSelected] = useState<number[]>([1]);
  const leads = [
    { id: 1, company: "Glow Dentistry", email: "info@glowdentistry.co.uk", status: "New", source: "no_website", city: "London", assigned: "Sarah", last: "2d ago" },
    { id: 2, company: "Leith Optical", email: "leithoptical@fsmail.net", status: "Contacted", source: "super_fast_uk", city: "Edinburgh", assigned: "John", last: "1d ago" },
    { id: 3, company: "VIVA SKIN CLINICS", email: "bookings@vivaskinclinics.com", status: "Qualified", source: "super_fast_uk", city: "London", assigned: "Sarah", last: "3h ago" },
    { id: 4, company: "Delight Dental Spa", email: "info@delightdentalspa.com.au", status: "New", source: "super_fast_au", city: "Sydney", assigned: "Mike", last: "5h ago" },
    { id: 5, company: "Emma Clinic", email: "info@emmaclinicthailand.com", status: "Lost", source: "no_website", city: "Bangkok", assigned: "Unassigned", last: "1w ago" },
  ];

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#315BE8", background: "#EEF3FF", padding: "4px 10px", borderRadius: 20 }}>31 / 74 · DATA DISPLAY</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", color: "#0B1224", marginBottom: 12 }}>Tables — Leads System</h1>
        <p style={{ fontSize: 16, color: "#475467", lineHeight: 1.6, maxWidth: 700 }}>Realistic ClientForge Leads table with sorting, filters, row selection, pagination, status badges, avatar cells, bulk actions.</p>
      </div>

      {/* Table Card */}
      <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #DDE3EE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Leads</span>
            <span style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{leads.length} total</span>
            {selected.length > 0 && <span style={{ background: "#0B1224", color: "white", padding: "4px 10px", borderRadius: 20, fontSize: 11 }}>{selected.length} selected • Bulk actions: Archive • Assign • Export</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Search leads..." style={{ padding: "6px 12px", border: "1px solid #DDE3EE", borderRadius: 8, fontSize: 12, width: 180 }} />
            <button style={{ padding: "6px 12px", border: "1px solid #DDE3EE", borderRadius: 8, background: "white", fontSize: 12 }}>Filters</button>
            <button style={{ padding: "6px 12px", border: "1px solid #DDE3EE", borderRadius: 8, background: "white", fontSize: 12 }}>Columns</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F6F8FC", textAlign: "left", borderBottom: "1px solid #DDE3EE" }}>
                <th style={{ padding: "10px 16px", width: 40 }}><input type="checkbox" checked={selected.length === leads.length} onChange={() => setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id))} /></th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>LEAD ⇅</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>COMPANY</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>EMAIL</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>STATUS</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>SOURCE</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>ASSIGNED TO</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>LAST CONTACT</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "#667085" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: "1px solid #F6F8FC", background: selected.includes(lead.id) ? "#EEF3FF" : "white" }}>
                  <td style={{ padding: "12px 16px" }}><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} /></td>
                  <td style={{ padding: "12px 16px" }}><div style={{ width: 28, height: 28, background: "#EEF3FF", color: "#315BE8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{lead.company[0]}</div></td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0B1224" }}>{lead.company}</td>
                  <td style={{ padding: "12px 16px", color: "#475467", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: lead.status === "New" ? "#EEF3FF" : lead.status === "Contacted" ? "#FFFBEB" : lead.status === "Qualified" ? "#F5F0FF" : lead.status === "Won" ? "#ECFDF5" : "#F6F8FC", color: lead.status === "New" ? "#315BE8" : lead.status === "Contacted" ? "#B45309" : lead.status === "Qualified" ? "#7C5CFC" : lead.status === "Won" ? "#15803d" : "#667085" }}>{lead.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}><span style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>{lead.source}</span></td>
                  <td style={{ padding: "12px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 20, height: 20, background: "#DDE3EE", borderRadius: "50%" }} /><span style={{ fontSize: 12 }}>{lead.assigned}</span></div></td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#667085" }}>{lead.last}</td>
                  <td style={{ padding: "12px 16px" }}><span style={{ color: "#667085", fontSize: 12 }}>⋯</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #DDE3EE", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <span style={{ color: "#667085" }}>Showing 1-5 of 71 leads • 68 with email • TRUE NO_SITE verified</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Rows per page:</span><select style={{ border: "1px solid #DDE3EE", borderRadius: 6, padding: "4px 8px" }}><option>10</option><option>25</option><option>50</option></select>
            <span>1-5 of 71</span><button style={{ border: "1px solid #DDE3EE", background: "white", padding: "4px 8px", borderRadius: 6 }}>‹</button><button style={{ border: "1px solid #DDE3EE", background: "white", padding: "4px 8px", borderRadius: 6 }}>›</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Features Demonstrated</h3>
          <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#475467" }}>
            <div>✓ Sortable columns (Lead ⇅)</div><div>✓ Row selection + Select all</div><div>✓ Bulk actions toolbar</div><div>✓ Status badges with semantic colors</div><div>✓ Avatar cells + Assigned To</div><div>✓ Search + Filters + Column visibility</div><div>✓ Pagination + Page-size selector</div><div>✓ Row actions (⋯ menu)</div>
          </div>
        </div>
        <div style={{ background: "#F6F8FC", border: "1px solid #DDE3EE", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>States</h3>
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            <div style={{ padding: 8, background: "white", borderRadius: 6 }}>Loading: Skeleton rows with shimmer</div>
            <div style={{ padding: 8, background: "white", borderRadius: 6 }}>Empty: No records illustration + CTA</div>
            <div style={{ padding: 8, background: "white", borderRadius: 6 }}>Error: API error + Retry action</div>
            <div style={{ padding: 8, background: "#EEF3FF", borderRadius: 6, border: "1px solid #315BE8" }}>Selected: Row bg #EEF3FF + checkbox</div>
          </div>
        </div>
      </div>
    </div>
  );
}
