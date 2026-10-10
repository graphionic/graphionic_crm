import React from "react";
import Link from "next/link";
import { parseActivityMeta } from "@/lib/resend-webhook";
import { Icon } from "@/components/ui/Icon";

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

interface ProcessedEvent {
  id: string;
  leadId?: string;
  companyName: string;
  iconName: "arrow-down-left" | "warning" | "sparkle" | "message" | "link" | "mail" | "arrow-up-right" | "note";
  iconTone: "green" | "blue" | "aqua" | "amber" | "red" | "purple" | "slate";
  actionText: string;
  subtext?: string;
  timeAgo: string;
  count: number;
  eventTypeKey: string;
}

export function LiveActivityStream({ activities }: LiveActivityStreamProps) {
  const now = new Date();
  const rawList: {
    id: string;
    leadId?: string;
    companyName: string;
    iconName: "arrow-down-left" | "warning" | "sparkle" | "message" | "link" | "mail" | "arrow-up-right" | "note";
    iconTone: "green" | "blue" | "aqua" | "amber" | "red" | "purple" | "slate";
    actionText: string;
    subtext?: string;
    timeAgo: string;
    eventTypeKey: string;
  }[] = [];

  for (const act of activities) {
    const company = act.lead?.companyName || "Unknown contact";
    const leadId = act.lead?.id;
    const meta = parseActivityMeta(act.meta);
    const timeAgo = formatRelativeTime(act.createdAt, now);

    // 1. Inbound reply (High priority)
    if (act.direction === "IN") {
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "arrow-down-left",
        iconTone: "green",
        actionText: `Inbound ${act.type === "WHATSAPP" ? "WhatsApp" : "email"} reply`,
        subtext: act.body ? (act.body.length > 50 ? `${act.body.slice(0, 50)}…` : act.body) : undefined,
        timeAgo,
        eventTypeKey: `reply_${act.type}`,
      });
      continue;
    }

    // 2. Delivery failure (High priority / Cautionary)
    if (act.status === "failed" || act.status === "bounced" || act.status === "complained" || act.error) {
      const channelName = act.type === "WHATSAPP" ? "WhatsApp" : "Email";
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "warning",
        iconTone: "red",
        actionText: `${channelName} delivery failed`,
        subtext: act.error ? (act.error.length > 55 ? `${act.error.slice(0, 55)}…` : act.error) : "Message bounced or rejected",
        timeAgo,
        eventTypeKey: `fail_${act.type}`,
      });
      continue;
    }

    // 3. Meaningful status change
    if (act.type === "STATUS") {
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "sparkle",
        iconTone: "purple",
        actionText: act.body || "Status updated",
        timeAgo,
        eventTypeKey: "status_change",
      });
      continue;
    }

    // 4. WhatsApp read / Email clicked
    if (act.type === "WHATSAPP" && act.status === "read") {
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "message",
        iconTone: "aqua",
        actionText: "Read your WhatsApp",
        timeAgo,
        eventTypeKey: "wa_read",
      });
      continue;
    }

    if (act.type === "EMAIL" && (meta.clicked || act.status === "clicked")) {
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "link",
        iconTone: "purple",
        actionText: "Clicked link in email",
        timeAgo,
        eventTypeKey: "email_clicked",
      });
      continue;
    }

    // 5. Email opened
    if (act.type === "EMAIL" && (meta.opened || act.status === "opened")) {
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "mail",
        iconTone: "blue",
        actionText: "Opened your email",
        subtext: meta.openCount && meta.openCount > 1 ? `Opened ${meta.openCount} times` : undefined,
        timeAgo,
        eventTypeKey: "email_opened",
      });
      continue;
    }

    // 6. Outreach sent / delivered
    if (act.direction === "OUT" && (act.type === "EMAIL" || act.type === "WHATSAPP")) {
      const isWa = act.type === "WHATSAPP";
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "arrow-up-right",
        iconTone: isWa ? "aqua" : "slate",
        actionText: `${isWa ? "WhatsApp" : "Email"} outreach sent`,
        timeAgo,
        eventTypeKey: `outreach_${act.type}`,
      });
      continue;
    }

    // 7. Note added
    if (act.type === "NOTE") {
      rawList.push({
        id: act.id,
        leadId,
        companyName: company,
        iconName: "note",
        iconTone: "slate",
        actionText: "Note recorded",
        subtext: act.body ? (act.body.length > 45 ? `${act.body.slice(0, 45)}…` : act.body) : undefined,
        timeAgo,
        eventTypeKey: "note",
      });
    }
  }

  // Group consecutive equivalent events for the same lead and event type
  const groupedEvents: ProcessedEvent[] = [];
  for (const item of rawList) {
    const prev = groupedEvents[groupedEvents.length - 1];
    if (
      prev &&
      prev.leadId &&
      item.leadId &&
      prev.leadId === item.leadId &&
      prev.eventTypeKey === item.eventTypeKey
    ) {
      prev.count += 1;
      continue;
    }

    groupedEvents.push({
      ...item,
      count: 1,
    });
  }

  const finalEvents = groupedEvents.slice(0, 6);

  if (finalEvents.length === 0) {
    return (
      <div className="dash-empty-feed">
        <b>No recent activity</b>
        <p>New outreach sends, opens, and replies will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="dash-activity-list">
      {finalEvents.map((evt) => (
        <div key={evt.id} className="dash-activity-item">
          <span className={`dash-event-icon ${evt.iconTone}`} aria-hidden="true">
            {evt.iconName === "sparkle" ? (
              <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✦</span>
            ) : (
              <Icon name={evt.iconName} size={11} strokeWidth={2.4} />
            )}
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
              {evt.count > 1 ? (
                <span className="dash-event-count-badge" title={`${evt.count} repeated events`}>
                  {evt.count}×
                </span>
              ) : null}
            </div>
            {evt.subtext ? <div className="dash-event-sub">{evt.subtext}</div> : null}
          </div>
          <span className="dash-event-time">{evt.timeAgo}</span>
        </div>
      ))}
    </div>
  );
}
