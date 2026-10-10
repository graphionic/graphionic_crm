import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { getHimiDailyFocus } from "@/lib/himi/focus";
import { HimiCommandBar } from "@/components/dashboard/HimiCommandBar";
import { LiveRefresher } from "@/components/dashboard/LiveRefresher";
import { LiveActivityStream } from "@/components/dashboard/LiveActivityStream";
import { PipelineRibbon } from "@/components/dashboard/PipelineRibbon";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getGreetingTime(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatStrategyPill(content?: string | null): string | null {
  if (!content) return null;
  const cleaned = content.trim();
  if (cleaned.toLowerCase().includes("dental")) {
    return "✦ Active focus · UK Dental Practices";
  }
  return cleaned.length > 36 ? `✦ Active focus · ${cleaned.slice(0, 34)}…` : `✦ Active focus · ${cleaned}`;
}

export default async function DashboardPage() {
  const user = await requireActiveUser();
  const now = new Date();
  const day = startOfDay(now);
  const week = new Date(now.getTime() - 7 * 864e5);

  // Derive natural display name from AdminUser
  const displayName = user.name ? user.name.replace(/\s+Admin$/i, "").trim() : "there";
  const greeting = getGreetingTime(now);

  const [
    strategyMem,
    statusCounts,
    totalLeads,
    emailsToday,
    waToday,
    emailsWeek,
    repliesWeek,
    dueFollowUpsCount,
    deliveryFailuresCount,
    repliedLeadsCount,
    recentActivities,
    dailyFocus,
  ] = await Promise.all([
    prisma.himiMemory.findFirst({
      where: {
        scope: "BUSINESS",
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      select: { content: true },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true }, where: { doNotContact: false } }),
    prisma.lead.count({ where: { doNotContact: false } }),
    prisma.activity.count({ where: { type: "EMAIL", direction: "OUT", createdAt: { gte: day } } }),
    prisma.activity.count({ where: { type: "WHATSAPP", direction: "OUT", createdAt: { gte: day } } }),
    prisma.activity.count({ where: { type: "EMAIL", direction: "OUT", createdAt: { gte: week } } }),
    prisma.activity.count({ where: { direction: "IN", createdAt: { gte: week } } }),
    prisma.lead.count({ where: { nextFollowUpAt: { lte: now }, doNotContact: false, status: { notIn: ["WON", "LOST"] } } }),
    prisma.activity.count({ where: { createdAt: { gte: week }, status: { in: ["failed", "bounced", "complained"] } } }),
    prisma.lead.count({ where: { status: "REPLIED", doNotContact: false } }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { lead: { select: { id: true, companyName: true, country: true, city: true } } },
    }),
    getHimiDailyFocus().catch((err) => {
      console.error("[Dashboard HIMI Focus Load Error]:", err);
      return [];
    }),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
  const urgentActionsCount = repliedLeadsCount + dueFollowUpsCount + (deliveryFailuresCount > 0 ? 1 : 0);
  const outreachTodayTotal = emailsToday + waToday;
  const activePipelineCount =
    (statusMap.QUALIFIED ?? 0) +
    (statusMap.CONTACTED ?? 0) +
    (statusMap.REPLIED ?? 0) +
    (statusMap.CALL_BOOKED ?? 0) +
    (statusMap.PROPOSAL_SENT ?? 0);

  const strategyPillText = formatStrategyPill(strategyMem?.content);

  return (
    <div className="dash-root">
      {/* ==============================================================
          ZONE 1 — HIMI INTELLIGENCE HEADER / COMMAND AREA
          ============================================================== */}
      <section className="dash-header-section" aria-label="AI Command Center Header">
        <div className="dash-header-top">
          <div className="dash-header-greeting-col">
            <h1 className="dash-greeting">
              {greeting}, {displayName}
            </h1>
            <p className="dash-subcopy">Your sales workspace is ready.</p>
          </div>

          <div className="dash-header-actions-col">
            {strategyPillText ? (
              <Link href="/settings/himi/knowledge" className="dash-strategy-pill" title="View Business Strategy">
                <span>{strategyPillText}</span>
              </Link>
            ) : null}

            <Link href="/leads/new" className="dash-primary-btn" title="Create a new lead">
              <Icon name="plus" size={13} strokeWidth={2.4} />
              <span>New Lead</span>
            </Link>
          </div>
        </div>

        {/* Command Omnibar */}
        <HimiCommandBar />
      </section>

      {/* ==============================================================
          ZONE 2 — INTEGRATED SALES PULSE STRIP (1 Surface, 4 Metric Regions)
          ============================================================== */}
      <section className="dash-pulse-strip" aria-label="Sales Pulse Metrics">
        {/* Metric 1: Actions */}
        <Link
          href={urgentActionsCount > 0 ? "/himi?intent=review_delivery_issue" : "/leads"}
          className="dash-pulse-cell"
        >
          <div className="dash-pulse-meta">
            <span className="dash-pulse-k">ACTIONS</span>
            <span className={`dash-pulse-dot ${urgentActionsCount > 0 ? "warn" : "good"}`} />
          </div>
          <div className="dash-pulse-val">{urgentActionsCount}</div>
          <div className="dash-pulse-sub">
            {urgentActionsCount > 0 ? `${urgentActionsCount} item${urgentActionsCount > 1 ? "s" : ""} need attention` : "All clear · No alerts"}
          </div>
        </Link>

        {/* Metric 2: Replies */}
        <Link href="/leads?status=REPLIED" className="dash-pulse-cell">
          <div className="dash-pulse-meta">
            <span className="dash-pulse-k">REPLIES (7D)</span>
            <span className={`dash-pulse-dot ${repliesWeek > 0 ? "good" : "neutral"}`} />
          </div>
          <div className={`dash-pulse-val ${repliesWeek > 0 ? "good" : ""}`}>{repliesWeek}</div>
          <div className="dash-pulse-sub">
            {emailsWeek > 0 ? `${((repliesWeek / emailsWeek) * 100).toFixed(1)}% response rate` : "0 in last 7 days"}
          </div>
        </Link>

        {/* Metric 3: Outreach Today */}
        <Link href="/outbox" className="dash-pulse-cell">
          <div className="dash-pulse-meta">
            <span className="dash-pulse-k">OUTREACH TODAY</span>
          </div>
          <div className="dash-pulse-val">{outreachTodayTotal}</div>
          <div className="dash-pulse-sub">
            {emailsToday} email · {waToday} WhatsApp
          </div>
        </Link>

        {/* Metric 4: Active Pipeline */}
        <Link href="/leads" className="dash-pulse-cell">
          <div className="dash-pulse-meta">
            <span className="dash-pulse-k">ACTIVE PIPELINE</span>
          </div>
          <div className="dash-pulse-val accent">{activePipelineCount}</div>
          <div className="dash-pulse-sub">
            {totalLeads.toLocaleString()} total leads
          </div>
        </Link>
      </section>

      {/* ==============================================================
          ZONE 3 — MAIN WORKSPACE (65% HIMI TODAY'S FOCUS / 35% LIVE ACTIVITY)
          ============================================================== */}
      <section className="dash-workspace" aria-label="Main Sales Workspace">
        {/* Zone 3A: HIMI Today's Focus (65%) */}
        <div className="dash-focus-card">
          <div className="dash-card-head">
            <div className="dash-card-title-group">
              <span className="dash-ai-icon" aria-hidden="true">✦</span>
              <div>
                <h2>HIMI — Today&apos;s Focus</h2>
                <div className="dash-card-sub">Prioritized sales work for immediate action</div>
              </div>
            </div>
            <Link href="/himi" className="dash-card-link">
              <span>Open HIMI</span>
              <Icon name="arrow-right" size={11} strokeWidth={2.2} />
            </Link>
          </div>

          <div className="dash-focus-body">
            {dailyFocus.length === 0 ? (
              <div className="dash-empty-focus">
                <span className="dash-empty-icon">
                  <Icon name="check" size={16} strokeWidth={2.5} />
                </span>
                <b>You&apos;re caught up</b>
                <p>No urgent actions need attention right now. Review opportunities or run a new search.</p>
              </div>
            ) : (
              <div className="dash-focus-feed">
                {dailyFocus.map((item) => {
                  const levelClass =
                    item.level === "ACTION" ? "action" : item.level === "WATCH" ? "watch" : "opportunity";

                  return (
                    <div key={item.id} className={`dash-focus-row ${levelClass}`}>
                      <div className="dash-focus-badge-cell">
                        <span className={`dash-level-pill ${levelClass}`}>
                          {item.level}
                        </span>
                      </div>

                      <div className="dash-focus-main-cell">
                        <div className="dash-focus-title-line">
                          <Link href={`/leads/${item.leadId}`} className="dash-focus-company">
                            {item.companyName}
                          </Link>
                          {item.city || item.country ? (
                            <span className="dash-focus-geo">
                              · {[item.city, item.country].filter(Boolean).join(", ")}
                            </span>
                          ) : null}
                        </div>
                        <p className="dash-focus-reason">{item.reason}</p>
                      </div>

                      <div className="dash-focus-cta-cell">
                        <Link href={item.href} className={`dash-focus-cta-btn ${levelClass}`}>
                          <span>{item.ctaText}</span>
                          <Icon name="arrow-right" size={11} strokeWidth={2.2} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Zone 3B: Live Activity Stream (35%) */}
        <div className="dash-activity-card">
          <div className="dash-card-head">
            <div className="dash-card-title-group">
              <h2>Live Activity</h2>
            </div>
            <LiveRefresher />
          </div>

          <div className="dash-activity-body">
            <LiveActivityStream activities={recentActivities as any} />
          </div>
        </div>
      </section>

      {/* ==============================================================
          SUPPORTING CONTEXT — PIPELINE MOMENTUM
          ============================================================== */}
      <section className="dash-pipeline-section" aria-label="Pipeline Momentum">
        <PipelineRibbon statusMap={statusMap} totalLeads={totalLeads} />
      </section>
    </div>
  );
}
