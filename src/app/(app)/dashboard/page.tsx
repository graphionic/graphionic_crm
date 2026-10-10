import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { getHimiDailyFocus } from "@/lib/himi/focus";
import { HimiCommandBar } from "@/components/dashboard/HimiCommandBar";
import { LiveRefresher } from "@/components/dashboard/LiveRefresher";
import { LiveActivityStream } from "@/components/dashboard/LiveActivityStream";
import { PipelineRibbon } from "@/components/dashboard/PipelineRibbon";

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
  // Extract concise title if long
  if (cleaned.toLowerCase().includes("dental")) {
    return "✦ Active focus · UK Dental Practices";
  }
  return cleaned.length > 45 ? `✦ Active focus · ${cleaned.slice(0, 42)}…` : `✦ Active focus · ${cleaned}`;
}

export default async function DashboardPage() {
  const user = await requireActiveUser();
  const now = new Date();
  const day = startOfDay(now);
  const week = new Date(now.getTime() - 7 * 864e5);
  const firstName = user.name ? user.name.split(" ")[0] : "there";
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
      take: 15,
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
          ZONE 1 — AI COMMAND HEADER
          ============================================================== */}
      <section className="dash-header-section" aria-label="AI Command Header">
        <div className="dash-header-top">
          <div>
            <h1 className="dash-greeting">
              {greeting}, {firstName}
            </h1>
            <p className="dash-subcopy">Your sales workspace is ready.</p>
          </div>
          {strategyPillText ? (
            <Link href="/settings/himi/knowledge" className="dash-strategy-pill" title="View Business Strategy">
              <span>{strategyPillText}</span>
            </Link>
          ) : null}
        </div>

        {/* Command Search Bar */}
        <HimiCommandBar />
      </section>

      {/* ==============================================================
          ZONE 2 — SALES PULSE (4 EXECUTIVE KPIS)
          ============================================================== */}
      <section className="dash-pulse-grid" aria-label="Sales Pulse Metrics">
        {/* 1. Actions */}
        <Link href={urgentActionsCount > 0 ? "/himi?intent=review_delivery_issue" : "/leads"} className="dash-pulse-card">
          <div className="dash-pulse-top">
            <span className="dash-pulse-k">ACTIONS</span>
            <span className={`dash-pulse-status-dot ${urgentActionsCount > 0 ? "warn" : "good"}`} />
          </div>
          <div className="dash-pulse-v">{urgentActionsCount}</div>
          <div className="dash-pulse-d">
            {urgentActionsCount > 0 ? `${urgentActionsCount} item${urgentActionsCount > 1 ? "s" : ""} need attention` : "All clear · No alerts"}
          </div>
        </Link>

        {/* 2. Replies */}
        <Link href="/leads?status=REPLIED" className="dash-pulse-card">
          <div className="dash-pulse-top">
            <span className="dash-pulse-k">REPLIES (7D)</span>
            <span className="dash-pulse-icon">↓</span>
          </div>
          <div className="dash-pulse-v good">{repliesWeek}</div>
          <div className="dash-pulse-d">
            {emailsWeek > 0 ? `${((repliesWeek / emailsWeek) * 100).toFixed(1)}% of outreach` : "0 in last 7 days"}
          </div>
        </Link>

        {/* 3. Outreach Today */}
        <Link href="/outbox" className="dash-pulse-card">
          <div className="dash-pulse-top">
            <span className="dash-pulse-k">OUTREACH TODAY</span>
            <span className="dash-pulse-icon">↑</span>
          </div>
          <div className="dash-pulse-v">{outreachTodayTotal}</div>
          <div className="dash-pulse-d">
            {emailsToday} email · {waToday} WhatsApp
          </div>
        </Link>

        {/* 4. Active Pipeline */}
        <Link href="/leads" className="dash-pulse-card">
          <div className="dash-pulse-top">
            <span className="dash-pulse-k">ACTIVE PIPELINE</span>
            <span className="dash-pulse-icon">✦</span>
          </div>
          <div className="dash-pulse-v accent">{activePipelineCount}</div>
          <div className="dash-pulse-d">
            {totalLeads.toLocaleString()} total leads
          </div>
        </Link>
      </section>

      {/* ==============================================================
          ZONE 3 — MAIN WORKSPACE (65% HIMI FOCUS / 35% LIVE ACTIVITY)
          ============================================================== */}
      <section className="dash-workspace" aria-label="Main Sales Workspace">
        {/* ZONE 3A: HIMI TODAY'S FOCUS */}
        <div className="dash-focus-card">
          <div className="dash-card-head">
            <div className="hstack" style={{ gap: 8 }}>
              <span className="dash-ai-icon" aria-hidden="true">✦</span>
              <div>
                <h2>HIMI — Today&apos;s Focus</h2>
                <div className="dash-card-sub">Prioritized sales work for immediate action</div>
              </div>
            </div>
            <Link href="/himi" className="dash-card-link">
              Open HIMI →
            </Link>
          </div>

          <div className="dash-focus-body">
            {dailyFocus.length === 0 ? (
              <div className="dash-empty-focus">
                <span className="dash-empty-icon">✓</span>
                <b>You&apos;re caught up</b>
                <p>No urgent actions need attention right now. Review opportunities or run a new search.</p>
              </div>
            ) : (
              <div className="dash-focus-list">
                {dailyFocus.map((item) => {
                  const levelClass =
                    item.level === "ACTION" ? "action" : item.level === "WATCH" ? "watch" : "opportunity";

                  return (
                    <div key={item.id} className={`dash-focus-item ${levelClass}`}>
                      <div className="dash-item-badge-col">
                        <span className={`dash-level-pill ${levelClass}`}>
                          {item.level}
                        </span>
                      </div>

                      <div className="dash-item-main-col">
                        <div className="dash-item-title-row">
                          <Link href={`/leads/${item.leadId}`} className="dash-item-company">
                            {item.companyName}
                          </Link>
                          {item.city || item.country ? (
                            <span className="dash-item-geo">
                              · {[item.city, item.country].filter(Boolean).join(", ")}
                            </span>
                          ) : null}
                        </div>
                        <p className="dash-item-reason">{item.reason}</p>
                      </div>

                      <div className="dash-item-cta-col">
                        <Link href={item.href} className={`dash-item-cta-btn ${levelClass}`}>
                          <span>{item.ctaText}</span>
                          <span className="arrow" aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ZONE 3B: LIVE ACTIVITY STREAM */}
        <div className="dash-activity-card">
          <div className="dash-card-head">
            <div className="hstack" style={{ gap: 8 }}>
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
          ZONE 4 — COMPACT PIPELINE
          ============================================================== */}
      <section className="dash-pipeline-section" aria-label="Pipeline Momentum">
        <PipelineRibbon statusMap={statusMap} totalLeads={totalLeads} />
      </section>

      {/* ==============================================================
          ZONE 5 — QUICK ACTIONS
          ============================================================== */}
      <section className="dash-shortcuts-section" aria-label="Quick Actions">
        <span className="dash-shortcuts-k">QUICK SHORTCUTS</span>
        <div className="dash-shortcuts-grid">
          <Link href="/leads/new" className="dash-shortcut-btn primary">
            <span>＋</span>
            <span>New Lead</span>
          </Link>

          <Link href="/himi" className="dash-shortcut-btn brand">
            <span>✦</span>
            <span>Ask HIMI</span>
          </Link>

          <Link href="/leads?status=NEW&sort=score" className="dash-shortcut-btn">
            <span>🎯</span>
            <span>Untouched Leads</span>
          </Link>

          <Link href="/follow-ups" className="dash-shortcut-btn">
            <span>⏰</span>
            <span>Follow-ups Due</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
