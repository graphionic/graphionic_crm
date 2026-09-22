"use client";
import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";

const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></svg>;
const MoreIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="1.5"/><circle cx="19.5" cy="12" r="1.5"/><circle cx="4.5" cy="12" r="1.5"/></svg>;

export default function IconButtonsPage() {
  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>12 / 74 · ACTIONS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Icon Buttons</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 680 }}>Icon-only actions — must have tooltip + accessible label. Rounded square default, circle only where appropriate. CRM examples: Search, Filter, Refresh, Edit, Delete, Copy, More, Close, etc.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Variants — Default / Ghost / Outline / Primary / Danger</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <IconButton variant="default" icon={<SearchIcon />} label="Search" />
          <IconButton variant="ghost" icon={<EditIcon />} label="Edit lead" />
          <IconButton variant="outline" icon={<PlusIcon />} label="Add" />
          <IconButton variant="primary" icon={<PlusIcon />} label="Create" />
          <IconButton variant="danger" icon={<TrashIcon />} label="Delete" />
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Sizes — XS 28×28 / SM 32 / MD 38 / LG 44 / XL 50</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}><IconButton size="xs" icon={<SearchIcon />} label="XS 28" /><div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>XS 28</div></div>
          <div style={{ textAlign: "center" }}><IconButton size="sm" icon={<SearchIcon />} label="SM 32" /><div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>SM 32</div></div>
          <div style={{ textAlign: "center" }}><IconButton size="md" icon={<SearchIcon />} label="MD 38" /><div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>MD 38</div></div>
          <div style={{ textAlign: "center" }}><IconButton size="lg" icon={<SearchIcon />} label="LG 44" /><div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>LG 44</div></div>
          <div style={{ textAlign: "center" }}><IconButton size="xl" icon={<SearchIcon />} label="XL 50" /><div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>XL 50</div></div>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#9299A8" }}>Icons optically centered, 18px default, rounded square default, circle only where appropriate (avatars, status)</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Shapes</h4>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}><IconButton shape="square" icon={<EditIcon />} label="Rounded square — DEFAULT" /><div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>Square 8px</div></div>
            <div style={{ textAlign: "center" }}><IconButton shape="circle" icon={<EditIcon />} label="Circle — only where appropriate" /><div style={{ fontSize: 10, color: "#9299A8", marginTop: 4 }}>Circle</div></div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#60697A" }}>Do not use circles for every icon action. Default is rounded square 8px radius.</div>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>States — Default / Hover / Active / Focus / Disabled / Loading</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <IconButton icon={<EditIcon />} label="Default" />
            <IconButton icon={<EditIcon />} label="Hover" style={{ background: "#FAF9F7" }} />
            <IconButton icon={<EditIcon />} label="Active" style={{ background: "#F0ECFA", borderColor: "#49339A" }} />
            <IconButton icon={<EditIcon />} label="Focus" style={{ boxShadow: "0 0 0 3px #F0ECFA", borderColor: "#49339A" }} />
            <IconButton icon={<EditIcon />} label="Disabled" disabled />
            <IconButton icon={<EditIcon />} label="Loading" loading />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#9299A8" }}>Every icon-only must have tooltip + aria-label. Hover shows tooltip.</div>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Table Action Example — When to use visible vs overflow</h3>
        <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 1fr 160px", gap: 0, background: "#FAF9F7", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#9299A8", letterSpacing: "0.06em" }}>
            <span>AVATAR</span><span>NAME</span><span>COMPANY</span><span>EMAIL</span><span>ACTIONS</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 1fr 160px", gap: 0, padding: "10px 14px", alignItems: "center", borderBottom: "1px solid #FAF9F7", fontSize: 13 }}>
            <div style={{ width: 28, height: 28, background: "#F0ECFA", color: "#49339A", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11 }}>S</div>
            <span style={{ fontWeight: 500, color: "#151927" }}>Sarah Johnson</span>
            <span style={{ color: "#60697A" }}>Acme Ltd</span>
            <span style={{ color: "#60697A", fontSize: 12 }}>sarah@acme.com</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <IconButton size="sm" variant="ghost" icon={<span style={{ fontSize: 12 }}>👁</span>} label="View lead" />
              <IconButton size="sm" variant="ghost" icon={<EditIcon />} label="Edit lead" />
              <IconButton size="sm" variant="ghost" icon={<MoreIcon />} label="More actions" />
              <span style={{ background: "#EEF8F4", color: "#4FAE91", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500, marginLeft: 8 }}>Qualified</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#60697A" }}>Do not show 6-8 action icons in every row. Low-frequency actions belong inside More ⋯. Visible: View, Edit. Overflow: Archive, Delete, Duplicate, Assign.</div>
      </div>

      <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Common CRM Icon Buttons</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Search", "Filter", "Refresh", "Edit", "Delete", "Copy", "More", "Close", "Download", "Upload", "Settings", "Bell", "Calendar", "Expand"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
              <span style={{ width: 16, height: 16, background: "#FAF9F7", borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>•</span> {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
