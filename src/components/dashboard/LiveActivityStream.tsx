import React from "react";
import Link from "next/link";
import { parseActivityMeta } from "@/lib/resend-webhook";

export interface ActivityEventItem {
  id: string;
  type: string;
  direction: string;
  status: string | null;
  subject: string | null;
  body: string | null;
  error: string | null;
  meta: string | null;
  createdAt: Date;
  lead: {
    id: string;
    companyName: string;
    country: string;
    city: string | null;
  } | null;
}

interface LiveActivityStreamProps {
  activities: ActivityEventItem[];
}

function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

interface FormattedEvent {
  id: string;
  leadId?: string;
  companyName: string;
  icon: string;
  iconTone: "green" | "blue" | "aqua" | "amber" | "red" | "purple" | "slate";
  actionText: string;
  subtext?: string;
  timeAgo: string;
}

export function LiveActivityStream({ activities }: LiveActivityStreamProps) {
  const now = new Date();
  const formattedEvents: FormattedEvent[] = [];

  // Deduplicate and format high-signal events
  let lastFailureLeadId: string | null = null;
  let consecutiveFailureCount = 0;

  for (const act of activities) {
    if (formattedEvents.length >= 7) break;
    const company = act.lead?.companyName || "Unknown contact";
    const leadId = act.lead?.id;
    const meta = parseActivityMeta(act.meta);
    const timeAgo = formatRelativeTime(act.createdAt, now);

    // Inbound reply
    if (act.direction === "IN") {
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "↓",
        iconTone: "green",
        actionText: `Inbound ${act.type === "WHATSAPP" ? "WhatsApp" : "email"} reply`,
        subtext: act.body ? (act.body.length > 55 ? `${act.body.slice(0, 55)}…` : act.body) : undefined,
        timeAgo,
      });
      continue;
    }

    // Delivery failure
    if (act.status === "failed" || act.status === "bounced" || act.status === "complained" || act.error) {
      if (leadId && leadId === lastFailureLeadId) {
        consecutiveFailureCount++;
        continue;
      }
      lastFailureLeadId = leadId || null;
      consecutiveFailureCount = 1;

      const channelName = act.type === "WHATSAPP" ? "WhatsApp" : "Email";
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "⚠",
        iconTone: "red",
        actionText: `${channelName} delivery failed`,
        subtext: act.error ? (act.error.length > 60 ? `${act.error.slice(0, 60)}…` : act.error) : "Message bounced or rejected",
        timeAgo,
      });
      continue;
    }

    // WhatsApp read
    if (act.type === "WHATSAPP" && act.status === "read") {
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "◍",
        iconTone: "aqua",
        actionText: "Read your WhatsApp",
        timeAgo,
      });
      continue;
    }

    // Email opened
    if (act.type === "EMAIL" && (meta.opened || act.status === "opened")) {
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "✉",
        iconTone: "blue",
        actionText: "Opened your email",
        subtext: meta.openCount && meta.openCount > 1 ? `Opened ${meta.openCount} times` : undefined,
        timeAgo,
      });
      continue;
    }

    // Email clicked
    if (act.type === "EMAIL" && (meta.clicked || act.status === "clicked")) {
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "🔗",
        iconTone: "purple",
        actionText: "Clicked link in email",
        timeAgo,
      });
      continue;
    }

    // Outreach sent
    if (act.direction === "OUT" && (act.type === "EMAIL" || act.type === "WHATSAPP")) {
      const isWa = act.type === "WHATSAPP";
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "↑",
        iconTone: isWa ? "aqua" : "slate",
        actionText: `${isWa ? "WhatsApp" : "Email"} outreach sent`,
        timeAgo,
      });
      continue;
    }

    // Status change
    if (act.type === "STATUS") {
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "✦",
        iconTone: "purple",
        actionText: act.body || "Status updated",
        timeAgo,
      });
      continue;
    }

    // Note added
    if (act.type === "NOTE") {
      formattedEvents.push({
        id: act.id,
        leadId,
        companyName: company,
        icon: "📝",
        iconTone: "slate",
        actionText: "Note recorded",
        subtext: act.body ? (act.body.length > 50 ? `${act.body.slice(0, 50)}…` : act.body) : undefined,
        timeAgo,
      });
    }
  }

  if (formattedEvents.length === 0) {
    return (
      <div className="dash-empty-feed">
        <b>No recent activity</b>
        <p>New outreach sends, opens, and replies will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="dash-activity-list">
      {formattedEvents.map((evt) => (
        <div key={evt.id} className="dash-activity-item">
          <span className={`dash-event-icon ${evt.iconTone}`} aria-hidden="true">
            {evt.icon}
          </span>
          <div className="dash-event-main">
            <div className="dash-event-line">
              {evt.leadId ? (
                <Link href={`/leads/${evt.leadId}`} className="dash-event-lead">
                  {evt.companyName}
                </Link>
              ) : (
                <span className="dash-event-lead">{evt.companyName}</span>
              )}
              <span className="dash-event-action">{evt.actionText}</span>
            </div>
            {evt.subtext ? <div className="dash-event-sub">{evt.subtext}</div> : null}
          </div>
          <span className="dash-event-time">{evt.timeAgo}</span>
        </div>
      ))}
    </div>
  );
}
