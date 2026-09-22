"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription } from "@/components/ui/FormField";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { TagSelector, mockUsers } from "@/components/ui/AdvancedSelectors";
import { SelectOption } from "@/components/ui/Select";

export default function MultiSelectPage() {
  const [tags, setTags] = useState<string[]>(["saas", "enterprise", "hot"]);
  const [manyTags, setManyTags] = useState<string[]>(["saas", "enterprise", "hot", "followup", "ecommerce", "priority"]);
  const [team, setTeam] = useState<string[]>(["aarav", "neha"]);

  const tagOptions: SelectOption[] = [
    { value: "saas", label: "SaaS" },
    { value: "enterprise", label: "Enterprise" },
    { value: "hot", label: "Hot Lead", color: "#EC6262" },
    { value: "followup", label: "Follow-up" },
    { value: "ecommerce", label: "Ecommerce" },
    { value: "priority", label: "Priority" },
  ];

  const userOptions: SelectOption[] = [
    { value: "aarav", label: "Aarav Patel" },
    { value: "neha", label: "Neha Shah" },
    { value: "rohan", label: "Rohan Mehta" },
    { value: "priya", label: "Priya Nair" },
    { value: "kabir", label: "Kabir Singh" },
  ];

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>18 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Multi Select</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 640 }}>Production-quality multi select. Chips compact, collapsed overflow +N more, searchable, keyboard navigation, select all/clear, tag creation optional.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Lead Tags — Multi Select</h4>
          <FormField>
            <FieldLabel>Tags</FieldLabel>
            <MultiSelect options={tagOptions} value={tags} onChange={setTags} placeholder="Select tags" searchable clearable showSelectAll />
            <FieldDescription>Multiple selection, search, remove ×, clear all, keyboard, disabled values, groups, loading, validation</FieldDescription>
          </FormField>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Chips — Compact, not huge</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.map(t => {
                const opt = tagOptions.find(o => o.value === t);
                return <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "#F0ECFA", border: "1px solid #E5E3DF", fontSize: 12, fontWeight: 500, color: "#151927" }}>{opt?.label} <span style={{ width: 14, height: 14, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer" }}>×</span></span>;
              })}
            </div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 6 }}>Compact typography, × accessible label</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Overflow — Important</h4>
            <FormField>
              <FieldLabel>Many tags — collapsed mode (recommended for dense admin)</FieldLabel>
              <MultiSelect options={tagOptions} value={manyTags} onChange={setManyTags} collapseAfter={2} />
              <FieldDescription>Do NOT allow 15 tags to make control 300px tall. [SaaS ×] [Enterprise ×] +5 more → click +5 more reveals complete selection. Document Wrap mode vs Collapsed mode, default Collapsed for dense UI.</FieldDescription>
            </FormField>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Multi Select Dropdown</h4>
            <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: 8, borderBottom: "1px solid #F0EEEA" }}><input placeholder="Search tags..." style={{ width: "100%", border: "1px solid #E5E3DF", borderRadius: 6, padding: "6px 10px", fontSize: 12 }} /></div>
              <div style={{ padding: 6 }}>
                {tagOptions.map(o => {
                  const checked = manyTags.includes(o.value);
                  return <div key={o.value} style={{ padding: "8px 10px", borderRadius: 6, background: checked ? "#F0ECFA" : "white", display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${checked ? "#49339A" : "#E5E3DF"}`, background: checked ? "#49339A" : "white", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10 }}>{checked ? "✓" : ""}</div>{o.label}</div>;
                })}
              </div>
              <div style={{ padding: "8px 10px", borderTop: "1px solid #F0EEEA", display: "flex", gap: 12 }}><button style={{ fontSize: 11, color: "#49339A", background: "none", border: "none", cursor: "pointer" }}>Select All</button><button style={{ fontSize: 11, color: "#60697A", background: "none", border: "none" }}>Clear</button><button style={{ fontSize: 11, color: "#151927", background: "none", border: "none", marginLeft: "auto" }}>Apply — only where staged</button></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Multi User Select — Campaign Team</h4>
          <FormField>
            <FieldLabel>Campaign Team</FieldLabel>
            <MultiSelect options={userOptions} value={team} onChange={setTeam} placeholder="Select team" collapseAfter={2} />
            <FieldDescription>[AP Aarav ×] [NS Neha ×] +2 — dropdown includes avatar, name, role, checkbox</FieldDescription>
          </FormField>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Tag Creation — Optional creatable</h4>
          <FormField>
            <FieldLabel>Tags — creatable</FieldLabel>
            <TagSelector value={tags} onChange={setTags} />
            <FieldDescription>User types "Priority Client" → + Create "Priority Client" — only where free-form tagging allowed</FieldDescription>
          </FormField>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Empty States</h4>
          <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#60697A" }}>
            <div>No options available</div>
            <div>No results for "xyz"</div>
            <div>No team members found</div>
            <div>No companies match "Acmee"</div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 4 }}>Then provide contextual actions only where appropriate</div>
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Loading States</h4>
          <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#60697A" }}>
            <div>Initial loading — skeleton or Searching...</div>
            <div>Search loading — Searching...</div>
            <div>Loading more — Showing 20 results Loading more... infinite / pagination</div>
            <div style={{ fontSize: 11, color: "#9299A8", marginTop: 4 }}>Do not load thousands unnecessarily</div>
          </div>
        </div>
      </div>
    </div>
  );
}
