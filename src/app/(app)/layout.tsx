import React from "react";
import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NavLink, LogoutButton } from "./shell-client";
import { Icon } from "@/components/ui/Icon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireActiveUser();

  const [leadCount, dueCount] = await Promise.all([
    prisma.lead.count({ where: { doNotContact: false } }),
    prisma.lead.count({
      where: {
        nextFollowUpAt: { lte: new Date() },
        doNotContact: false,
        status: { notIn: ["WON", "LOST"] },
      },
    }),
  ]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <b>ClientForge</b>
          <span>Outreach CRM</span>
        </div>

        <nav className="nav">
          <div className="sect">Workspace</div>
          <NavLink href="/dashboard" icon={<Icon name="dashboard" size={17} />} label="Overview" />
          <NavLink href="/leads" icon={<Icon name="users" size={17} />} label="Leads" badge={leadCount} />
          <NavLink
            href="/himi"
            icon={<span className="himi-sparkle-ico" aria-hidden="true">✦</span>}
            label="HIMI"
          />

          <div className="sect">Engagement</div>
          <NavLink href="/inbox" icon={<Icon name="message" size={17} />} label="WhatsApp Inbox" />
          <NavLink href="/follow-ups" icon={<Icon name="clock" size={17} />} label="Follow-ups" badge={dueCount || undefined} tone="amber" />
          <NavLink href="/outbox" icon={<Icon name="outbox" size={17} />} label="Outbox" />
          <NavLink href="/import" icon={<Icon name="import" size={17} />} label="Import" />

          <div className="sect">System</div>
          <NavLink href="/settings/email" icon={<Icon name="mail" size={17} />} label="Email & DNS" />
          <NavLink href="/settings/whatsapp" icon={<Icon name="message" size={17} />} label="WhatsApp API" />
          <NavLink href="/settings/compliance" icon={<Icon name="shield" size={17} />} label="Compliance" />
          <NavLink href="/settings/templates" icon={<Icon name="file" size={17} />} label="Templates" />
          <NavLink href="/settings" icon={<Icon name="settings" size={17} />} label="Settings" />
          <NavLink href="/design-system" icon={<Icon name="palette" size={17} />} label="Design System" />
        </nav>

        <div className="sidebar-foot">
          <div className="who">
            {user.name ? <>{user.name}<br /></> : null}
            {user.email}
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="main">
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
