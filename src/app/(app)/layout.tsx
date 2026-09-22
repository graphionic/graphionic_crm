import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NavLink, LogoutButton } from "./shell-client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireActiveUser();

  const [leadCount, dueCount] = await Promise.all([
    prisma.lead.count(),
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
          <NavLink href="/dashboard" icon="▦" label="Dashboard" />
          <NavLink href="/live" icon="●" label="Live Collection" />
          <NavLink href="/leads" icon="◉" label="Leads" badge={leadCount} />
          <NavLink href="/follow-ups" icon="◷" label="Follow-ups" badge={dueCount || undefined} tone="amber" />
          <NavLink href="/outbox" icon="✉" label="Outbox" />

          <div className="sect">Add leads</div>
          <NavLink href="/import" icon="⇪" label="Import CSV" />
          <NavLink href="/leads/new" icon="＋" label="New lead" />

          <div className="sect">Setup</div>
          <NavLink href="/settings" icon="⚙" label="Settings" />
          <NavLink href="/settings/email" icon="✉" label="Email & DNS" />
          <NavLink href="/settings/whatsapp" icon="◍" label="WhatsApp API" />
          <NavLink href="/settings/compliance" icon="⚖" label="Compliance" />
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
