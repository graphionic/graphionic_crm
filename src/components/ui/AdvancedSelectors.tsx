"use client";
import React, { useState } from "react";
import { SearchableSelect } from "./SearchableSelect";
import { MultiSelect } from "./MultiSelect";
import { Select, SelectOption } from "./Select";

// Mock data
export const mockUsers: SelectOption[] = [
  { value: "aarav", label: "Aarav Patel", metadata: "Sales Manager", description: "24 leads" },
  { value: "neha", label: "Neha Shah", metadata: "Account Manager" },
  { value: "rohan", label: "Rohan Mehta", metadata: "Sales Executive" },
  { value: "priya", label: "Priya Nair", metadata: "Customer Success" },
  { value: "kabir", label: "Kabir Singh", metadata: "Marketing Lead" },
];

export const mockCompanies: SelectOption[] = [
  { value: "acme", label: "Acme Inc.", metadata: "acme.com" },
  { value: "globex", label: "Globex", metadata: "globex.com" },
  { value: "glow", label: "Glow Dentistry", metadata: "glowdentistry.co.uk" },
  { value: "leith", label: "Leith Optical", metadata: "leithoptical.co.uk" },
  { value: "viva", label: "VIVA SKIN CLINICS", metadata: "vivaskinclinics.com" },
];

export const statusOptions: SelectOption[] = [
  { value: "new", label: "New", color: "#9299A8" },
  { value: "contacted", label: "Contacted", color: "#62BDD4" },
  { value: "qualified", label: "Qualified", color: "#4FAE91" },
  { value: "proposal", label: "Proposal Sent", color: "#F4BE52" },
  { value: "won", label: "Won", color: "#49339A" },
  { value: "lost", label: "Lost", color: "#EC6262" },
];

export const countryOptions: SelectOption[] = [
  { value: "IN", label: "India", metadata: "IN · +91" },
  { value: "GB", label: "United Kingdom", metadata: "GB · +44" },
  { value: "US", label: "United States", metadata: "US · +1" },
  { value: "AE", label: "United Arab Emirates", metadata: "AE · +971" },
  { value: "AU", label: "Australia", metadata: "AU · +61" },
  { value: "DE", label: "Germany", metadata: "DE · +49" },
];

export const currencyOptions: SelectOption[] = [
  { value: "INR", label: "INR — Indian Rupee", metadata: "₹" },
  { value: "USD", label: "USD — US Dollar", metadata: "$" },
  { value: "GBP", label: "GBP — British Pound", metadata: "£" },
  { value: "EUR", label: "EUR — Euro", metadata: "€" },
  { value: "AED", label: "AED — UAE Dirham", metadata: "AED" },
];

export const timezoneOptions: SelectOption[] = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata", metadata: "UTC +05:30" },
  { value: "Europe/London", label: "Europe/London", metadata: "UTC +01:00" },
  { value: "America/New_York", label: "America/New_York", metadata: "UTC -04:00" },
  { value: "Asia/Dubai", label: "Asia/Dubai", metadata: "UTC +04:00" },
  { value: "Australia/Sydney", label: "Australia/Sydney", metadata: "UTC +10:00" },
];

export const languageOptions: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

export const roleOptions: SelectOption[] = [
  { value: "admin", label: "Admin", description: "Full access to all features" },
  { value: "manager", label: "Manager", description: "Manage team and campaigns" },
  { value: "sales", label: "Sales Agent", description: "Manage assigned leads" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
];

export const tagOptions: SelectOption[] = [
  { value: "saas", label: "SaaS" },
  { value: "enterprise", label: "Enterprise" },
  { value: "hot", label: "Hot Lead" },
  { value: "followup", label: "Follow-up" },
  { value: "ecommerce", label: "Ecommerce" },
  { value: "priority", label: "Priority" },
];

interface BaseProps {
  value?: string;
  onChange?: (v: string) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  placeholder?: string;
}

export function UserSelector(props: BaseProps) {
  return <SearchableSelect options={mockUsers} searchPlaceholder="Search team members..." placeholder="Select owner" recentOptions={mockUsers.slice(0, 2)} {...props} />;
}

export function CompanySelector({ asyncExample, ...props }: BaseProps & { asyncExample?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState(mockCompanies);
  const handleSearch = asyncExample ? (q: string) => {
    if (!q) { setOpts(mockCompanies); return; }
    setLoading(true);
    setTimeout(() => {
      setOpts(mockCompanies.filter(c => c.label.toLowerCase().includes(q.toLowerCase())));
      setLoading(false);
    }, 600);
  } : undefined;

  return <SearchableSelect options={opts} placeholder="Search companies..." searchPlaceholder="Search companies..." loading={loading} onSearch={handleSearch} asyncSearch={asyncExample} minChars={asyncExample ? 2 : 0} {...props} />;
}

export function StatusSelector(props: BaseProps) {
  return <Select options={statusOptions} placeholder="Select status" clearable {...props} />;
}

export function CountrySelector(props: BaseProps) {
  return <SearchableSelect options={countryOptions} placeholder="Select country" searchPlaceholder="Search countries..." {...props} />;
}

export function CurrencySelector(props: BaseProps) {
  return <SearchableSelect options={currencyOptions} placeholder="Select currency" searchPlaceholder="Search currency..." {...props} />;
}

export function TimezoneSelector(props: BaseProps) {
  return <SearchableSelect options={timezoneOptions} placeholder="Select timezone" searchPlaceholder="Search timezone..." {...props} />;
}

export function LanguageSelector(props: BaseProps) {
  return <SearchableSelect options={languageOptions} placeholder="Select language" {...props} />;
}

export function RoleSelector(props: BaseProps) {
  return <Select options={roleOptions} placeholder="Select role" {...props} />;
}

export function TagSelector({ value, onChange, ...props }: { value?: string[]; onChange?: (v: string[]) => void; size?: "sm" | "md" | "lg" }) {
  return <MultiSelect options={tagOptions} value={value} onChange={onChange} placeholder="Select tags" searchable clearable showSelectAll collapseAfter={3} {...props} />;
}

export function CategorySelector(props: BaseProps) {
  const cats: SelectOption[] = [
    { value: "tech", label: "Technology" },
    { value: "health", label: "Healthcare" },
    { value: "finance", label: "Finance" },
    { value: "education", label: "Education" },
  ];
  return <Select options={cats} placeholder="Select category" {...props} />;
}
