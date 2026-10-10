import React from "react";
import Link from "next/link";

interface PipelineRibbonProps {
  statusMap: Record<string, number>;
  totalLeads: number;
}

const STAGES = [
  { key: "NEW", label: "New", color: "var(--brand)", link: "/leads?status=NEW" },
  { key: "QUALIFIED", label: "Qualified", color: "var(--cyan)", link: "/leads?status=QUALIFIED" },
  { key: "CONTACTED", label: "Contacted", color: "var(--amber)", link: "/leads?status=CONTACTED" },
  { key: "REPLIED", label: "Replied", color: "var(--green)", link: "/leads?status=REPLIED" },
  { key: "CALL_BOOKED", label: "Call Booked", color: "var(--violet)", link: "/leads?status=CALL_BOOKED" },
  { key: "PROPOSAL_SENT", label: "Proposal", color: "var(--accent)", link: "/leads?status=PROPOSAL_SENT" },
  { key: "WON", label: "Won", color: "var(--green)", link: "/leads?status=WON" },
];

export function PipelineRibbon({ statusMap, totalLeads }: PipelineRibbonProps) {
  const safeTotal = Math.max(1, totalLeads);

  return (
    <div className="dash-pipeline-card">
      <div className="dash-pipeline-head">
        <div className="hstack" style={{ gap: 8 }}>
          <span className="dash-section-k">PIPELINE MOMENTUM</span>
          <span className="dash-section-count">· {totalLeads.toLocaleString()} leads</span>
        </div>
        <Link href="/leads" className="dash-pipeline-link">
          All leads →
        </Link>
      </div>

      {/* Segmented Momentum Track */}
      <div className="dash-pipeline-track" aria-hidden="true">
        {STAGES.map((stg) => {
          const count = statusMap[stg.key] ?? 0;
          if (count === 0) return null;
          const pct = Math.max(2, (count / safeTotal) * 100);
          return (
            <div
              key={stg.key}
              className="dash-pipeline-segment"
              style={{ width: `${pct}%`, backgroundColor: stg.color }}
              title={`${stg.label}: ${count} leads (${((count / safeTotal) * 100).toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Stage Number Pills */}
      <div className="dash-pipeline-stages">
        {STAGES.map((stg) => {
          const count = statusMap[stg.key] ?? 0;
          return (
            <Link
              key={stg.key}
              href={stg.link}
              className={`dash-pipeline-stage ${count > 0 ? "active" : "muted"}`}
            >
              <span className="dash-stage-dot" style={{ backgroundColor: stg.color }} />
              <span className="dash-stage-label">{stg.label}</span>
              <span className="dash-stage-val">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
