"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface CollectionHeaderProps {
  title?: string;
  subtitle?: string;
  currentTab?: "overview" | "runs" | "states" | "sources";
  extraRight?: React.ReactNode;
}

const TABS = [
  { id: "overview", label: "Overview", href: "/collection" },
  { id: "runs", label: "Runs", href: "/collection/runs" },
  { id: "states", label: "Rotation", href: "/collection/states" },
  { id: "sources", label: "Sources", href: "/collection/sources" },
] as const;

export default function CollectionOperationsHeader({
  title,
  subtitle,
  currentTab,
  extraRight,
}: CollectionHeaderProps) {
  const pathname = usePathname();

  const activeTab = currentTab || (() => {
    if (pathname === "/collection/runs") return "runs";
    if (pathname === "/collection/states") return "states";
    if (pathname === "/collection/sources") return "sources";
    return "overview";
  })();

  const tabSubtitle = subtitle || (() => {
    switch (activeTab) {
      case "overview":
        return "Engine status, fair rotation schedule, active sources, and pipeline yield metrics.";
      case "runs":
        return "Execution history, candidate persistence, rejection breakdown, and run traceability.";
      case "states":
        return "Persistent location-category rotation queue, cooldown timers, and next run eligibility.";
      case "sources":
        return "Data discovery endpoints, credential states, and safe guardrails status.";
      default:
        return "Lead collection engine observability and management.";
    }
  })();

  const tabTitle = title || (() => {
    switch (activeTab) {
      case "overview":
        return "Collection Overview";
      case "runs":
        return "Collector Run History";
      case "states":
        return "Fair Rotation States";
      case "sources":
        return "Data Sources";
      default:
        return "Collection Operations";
    }
  })();

  return (
    <div style={{ display: "grid", gap: 12, marginBottom: 4, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#9299A8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>
            <span>Lead Operations</span>
            <span>/</span>
            <span style={{ color: "#49339A" }}>Collection</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", margin: "0 0 4px" }}>{tabTitle}</h2>
          <p style={{ fontSize: 13, color: "#60697A", margin: 0 }}>{tabSubtitle}</p>
        </div>
        {extraRight && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{extraRight}</div>}
      </div>

      {/* Shared Collection Sub-Navigation */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #E5E3DF", paddingBottom: 8, flexWrap: "wrap" }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#49339A" : "#60697A",
                background: isActive ? "#F0ECFA" : "transparent",
                border: isActive ? "1px solid #E0D6F5" : "1px solid transparent",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
