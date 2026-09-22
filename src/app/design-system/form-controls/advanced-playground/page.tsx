"use client";
import { useState } from "react";
import { FormField, FieldLabel } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { DatePicker, DateRangePicker, MonthPicker, YearPicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { DropZone } from "@/components/ui/FileUpload";
import { UserSelector, CompanySelector, StatusSelector, CountrySelector, CurrencySelector, TimezoneSelector, LanguageSelector, RoleSelector, TagSelector, mockUsers, mockCompanies, statusOptions, countryOptions, currencyOptions, timezoneOptions, languageOptions, roleOptions, tagOptions } from "@/components/ui/AdvancedSelectors";

export default function AdvancedPlayground() {
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [state, setState] = useState<"default" | "error" | "disabled">("default");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const isError = state === "error";
  const isDisabled = state === "disabled";

  return (
    <div style={{ maxWidth: 1200, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');`}</style>

      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#49339A", background: "#F0ECFA", padding: "4px 10px", borderRadius: 6 }}>ADVANCED FORM PLAYGROUND</span>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", color: "#151927", marginTop: 16, marginBottom: 8 }}>Advanced Form Playground</h1>
        <p style={{ fontSize: 14, color: "#60697A", lineHeight: 1.6, maxWidth: 700 }}>Standard Select, Open Select, Searchable Select, Async Select, User/Status/Company/Country/Currency/Timezone/Language/Role/Tag Selectors, Multi Select, Multi User, Date Picker, Date Range, Month/Year, Time Picker, DateTime, File Upload.</p>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>Size:</span>
          {(["sm", "md", "lg"] as const).map(s => <button key={s} onClick={() => setSize(s)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: size === s ? "#151927" : "white", color: size === s ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>{s}</button>)}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>State:</span>
          {(["default", "error", "disabled"] as const).map(st => <button key={st} onClick={() => setState(st)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: state === st ? "#151927" : "white", color: state === st ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>{st}</button>)}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9299A8", fontWeight: 500 }}>Density:</span>
          {(["comfortable", "compact"] as const).map(d => <button key={d} onClick={() => setDensity(d)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E3DF", background: density === d ? "#49339A" : "white", color: density === d ? "white" : "#60697A", fontSize: 11, fontWeight: 500 }}>{d}</button>)}
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 24, display: "grid", gap: density === "compact" ? 12 : 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <FormField><FieldLabel>Standard Select</FieldLabel><Select size={size} state={isError ? "error" : "default"} disabled={isDisabled} options={statusOptions} placeholder="Select status" /></FormField>
          <FormField><FieldLabel>Searchable Select</FieldLabel><SearchableSelect size={size} state={isError ? "error" : "default"} disabled={isDisabled} options={mockUsers} placeholder="Search users..." /></FormField>
          <FormField><FieldLabel>Async Select</FieldLabel><CompanySelector size={size} asyncExample disabled={isDisabled} /></FormField>

          <FormField><FieldLabel>User Selector</FieldLabel><UserSelector size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>Company Selector</FieldLabel><CompanySelector size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>Status Selector</FieldLabel><StatusSelector size={size} disabled={isDisabled} /></FormField>

          <FormField><FieldLabel>Country</FieldLabel><CountrySelector size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>Currency</FieldLabel><CurrencySelector size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>Timezone</FieldLabel><TimezoneSelector size={size} disabled={isDisabled} /></FormField>

          <FormField><FieldLabel>Language</FieldLabel><LanguageSelector size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>Role</FieldLabel><RoleSelector size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>Category</FieldLabel><Select size={size} disabled={isDisabled} options={[{ value: "tech", label: "Technology" }, { value: "health", label: "Healthcare" }]} placeholder="Select category" /></FormField>

          <FormField><FieldLabel>Multi Select</FieldLabel><MultiSelect size={size} disabled={isDisabled} options={tagOptions} placeholder="Select tags" /></FormField>
          <FormField><FieldLabel>Multi User Select</FieldLabel><MultiSelect size={size} disabled={isDisabled} options={mockUsers.map(u => ({ value: u.value, label: u.label }))} placeholder="Select team" /></FormField>
          <FormField><FieldLabel>Tag Selector</FieldLabel><TagSelector size={size} /></FormField>

          <FormField><FieldLabel>Date Picker</FieldLabel><DatePicker size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>Date Range</FieldLabel><DateRangePicker size={size} /></FormField>
          <FormField><FieldLabel>Month Picker</FieldLabel><MonthPicker size={size} /></FormField>

          <FormField><FieldLabel>Year Picker</FieldLabel><YearPicker size={size} /></FormField>
          <FormField><FieldLabel>Time Picker</FieldLabel><TimePicker size={size} disabled={isDisabled} /></FormField>
          <FormField><FieldLabel>DateTime</FieldLabel><div style={{ display: "flex", gap: 8 }}><DatePicker size={size} disabled={isDisabled} /><TimePicker size={size} disabled={isDisabled} /></div></FormField>
        </div>

        <div>
          <FieldLabel>File Upload</FieldLabel>
          <div style={{ marginTop: 8 }}><DropZone accept=".csv,.pdf" maxSize="10 MB" /></div>
        </div>
      </div>

      <div style={{ marginTop: 16, background: "white", border: "1px solid #E5E3DF", borderRadius: 8, padding: 12, fontSize: 11, color: "#9299A8" }}>
        All controls visually belong to approved Input system: same height {size} {size === "sm" ? "36" : size === "md" ? "42" : "48"}px, border #E5E3DF, radius 8, typography Poppins, focus #49339A ring #F0ECFA, validation error #EC6262. Dropdown portal positioning handles near top/bottom/scroll/drawers/modals intelligently downward/upward. Long content ellipsis + tooltip. Mobile touch 44px. Keyboard fully supported. Performance: server-side search, debouncing, pagination, virtualized where required. No emoji. No pill everything. No excessive shadows. No rainbow status.
      </div>
    </div>
  );
}
