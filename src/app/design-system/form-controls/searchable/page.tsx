"use client";
import { useState } from "react";
import { FormField, FieldLabel, FieldDescription } from "@/components/ui/FormField";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { UserSelector, CompanySelector, StatusSelector, CountrySelector, CurrencySelector, TimezoneSelector, LanguageSelector, RoleSelector, mockUsers, mockCompanies, statusOptions, countryOptions, currencyOptions, timezoneOptions } from "@/components/ui/AdvancedSelectors";

export default function SearchableSelectPage() {
  const [user, setUser] = useState("aarav");
  const [company, setCompany] = useState("");
  const [companyAsync, setCompanyAsync] = useState("");
  const [status, setStatus] = useState("qualified");
  const [country, setCountry] = useState("IN");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  return (
    <div style={{ maxWidth: 1100, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>17 / 74 · FORM CONTROLS</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Searchable Select / Select2</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 700 }}>Premium ClientForge searchable select. Fast, compact, professional, searchable, keyboard friendly. Must NOT look like generic browser select. Supports 10 / 100 / 1000+ options, remote/API data.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Assigned Owner — Searchable</h3>
          <FormField>
            <FieldLabel>Assigned Owner</FieldLabel>
            <SearchableSelect options={mockUsers} value={user} onChange={setUser} searchPlaceholder="Search team members..." placeholder="Search team members..." />
            <FieldDescription>Type "aar" → highlight AARav Patel subtly #FFF6E3 bg + 600 weight</FieldDescription>
          </FormField>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Open dropdown example</h4>
            <div style={{ border: "1px solid #E5E3DF", borderRadius: 10, overflow: "hidden", background: "white" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #F0EEEA", fontSize: 12, color: "#9299A8" }}>Search team members...</div>
              {mockUsers.slice(0, 3).map(u => (
                <div key={u.value} style={{ padding: "10px 12px", display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid #FAF9F7" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F0ECFA", color: "#49339A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{u.label.slice(0, 2).toUpperCase()}</div>
                  <div><div style={{ fontSize: 13, fontWeight: 500, color: "#151927" }}>{u.label}</div><div style={{ fontSize: 11, color: "#9299A8" }}>{u.metadata}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Keyboard Behavior</h4>
            <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#60697A" }}>Arrow Down / Up</span><span style={{ color: "#151927", fontWeight: 500 }}>Navigate options</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#60697A" }}>Enter</span><span style={{ color: "#151927", fontWeight: 500 }}>Select focused</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#60697A" }}>Escape</span><span style={{ color: "#151927", fontWeight: 500 }}>Close dropdown</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#60697A" }}>Tab</span><span style={{ color: "#151927", fontWeight: 500 }}>Close + next field</span></div>
              <div style={{ fontSize: 11, color: "#9299A8", marginTop: 4 }}>Fully usable without mouse interaction</div>
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Search Behavior — typing / highlighted / no results / loading / recently used</h4>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 11, color: "#9299A8" }}>Query "aar" → <span style={{ background: "#FFF6E3", fontWeight: 600, color: "#151927" }}>AAR</span>av Patel</div>
              <div style={{ fontSize: 11, color: "#9299A8" }}>No results → "No results for xyz" + optional + Create "xyz"</div>
              <div style={{ fontSize: 11, color: "#9299A8" }}>Loading → Searching... spinner</div>
              <div style={{ fontSize: 11, color: "#9299A8" }}>Recently used section on top when no query</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Async / Remote Select — Company</h4>
          <FormField>
            <FieldLabel>Company</FieldLabel>
            <CompanySelector asyncExample value={companyAsync} onChange={setCompanyAsync} />
            <FieldDescription>Type "Acme" → Searching... → Acme Inc., Acme Technologies. Supports loading, API error, retry, no results, min chars "Type at least 2 characters"</FieldDescription>
          </FormField>
        </div>

        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 12 }}>Create New From Select</h4>
          <FormField>
            <FieldLabel>Company — creatable</FieldLabel>
            <SearchableSelect options={mockCompanies} value={company} onChange={setCompany} placeholder="Search companies..." allowCreate onCreate={(v) => alert(`Create ${v}`)} noResultsText="No company found" />
            <FieldDescription>Search "Graphionic" → No company found → + Create "Graphionic" — optional, not for dangerous arbitrary values</FieldDescription>
          </FormField>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#151927", marginBottom: 16 }}>Advanced Selector Patterns — User / Company / Status / Country / Currency / Timezone / Language / Role</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <FormField><FieldLabel>User Selector</FieldLabel><UserSelector value={user} onChange={setUser} /><FieldDescription>Avatar + Name + Role</FieldDescription></FormField>
          <FormField><FieldLabel>Company Selector</FieldLabel><CompanySelector value={company} onChange={setCompany} /><FieldDescription>Logo/initial + name + domain, search name/domain</FieldDescription></FormField>
          <FormField><FieldLabel>Status Selector</FieldLabel><StatusSelector value={status} onChange={setStatus} /><FieldDescription>Small dot + label, not rainbow</FieldDescription></FormField>
          <FormField><FieldLabel>Country Selector</FieldLabel><CountrySelector value={country} onChange={setCountry} /><FieldDescription>Country name + code IN · +91, no emoji flags</FieldDescription></FormField>
          <FormField><FieldLabel>Currency Selector</FieldLabel><CurrencySelector value={currency} onChange={setCurrency} /><FieldDescription>Search code/name INR — ₹</FieldDescription></FormField>
          <FormField><FieldLabel>Timezone Selector</FieldLabel><TimezoneSelector value={timezone} onChange={setTimezone} /><FieldDescription>City / identifier / UTC offset</FieldDescription></FormField>
          <FormField><FieldLabel>Language Selector</FieldLabel><LanguageSelector placeholder="Select language" /><FieldDescription>Searchable when large</FieldDescription></FormField>
          <FormField><FieldLabel>Role Selector</FieldLabel><RoleSelector placeholder="Select role" /><FieldDescription>Admin Manager Sales Agent Viewer + description, no full matrix</FieldDescription></FormField>
          <FormField><FieldLabel>Category Selector</FieldLabel><SearchableSelect options={[{ value: "tech", label: "Technology" }, { value: "health", label: "Healthcare" }, { value: "finance", label: "Finance" }]} placeholder="Select category" /></FormField>
        </div>
      </div>

      <div style={{ background: "#FAF9F7", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: "#151927", marginBottom: 8 }}>Performance & Architecture</h4>
        <div style={{ fontSize: 11, color: "#60697A", lineHeight: 1.6 }}>
          Do NOT render thousands of DOM options simultaneously. Allow server-side search, debouncing, pagination, virtualized options where required. Do not prematurely virtualize small static selects. Dropdown uses portal/popover positioning — intelligently opens downward/upward based on available space, not clipped by parent overflow.
        </div>
      </div>
    </div>
  );
}
