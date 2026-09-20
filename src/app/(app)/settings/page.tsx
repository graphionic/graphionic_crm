import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireActiveUser();
  const [s, suppressions, templates, counts] = await Promise.all([
    getSettings(),
    prisma.suppression.count(),
    prisma.template.count(),
    prisma.lead.count(),
  ]);

  const mailOk =
    s.mail_provider === "resend"
      ? Boolean(s.resend_api_key && s.mail_from_email)
      : Boolean(s.smtp_host && s.smtp_user && s.smtp_pass);
  const waOk = Boolean(s.wa_phone_number_id && s.wa_access_token && s.wa_enabled === "true");

  const Card = ({
    href,
    title,
    desc,
    status,
    statusOk,
  }: {
    href: string;
    title: string;
    desc: string;
    status: string;
    statusOk: boolean;
  }) => (
    <Link href={href} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div className="card-body">
        <div className="hstack" style={{ marginBottom: 6 }}>
          <h3 style={{ fontSize: 15.5 }}>{title}</h3>
          <span className="spacer" />
          <span className={`badge ${statusOk ? "green" : "amber"}`}>{status}</span>
        </div>
        <p className="small muted" style={{ margin: 0 }}>{desc}</p>
      </div>
    </Link>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p>Everything you configure here is stored encrypted in your own database.</p>
        </div>
      </div>

      <div className="grid c2">
        <Card
          href="/settings/email"
          title="Email, domain &amp; DNS"
          desc="Outgoing mail (SMTP or Resend), your from-address, and the SPF/DKIM/DMARC records for your sending domain — with a live DNS check."
          status={mailOk ? "Configured" : "Not configured"}
          statusOk={mailOk}
        />
        <Card
          href="/settings/whatsapp"
          title="WhatsApp Cloud API"
          desc="Phone number ID, access token, webhook verification, approved message templates, and the 24-hour window rules your team must respect."
          status={waOk ? "Connected" : s.wa_phone_number_id ? "Incomplete" : "Not set up"}
          statusOk={waOk}
        />
        <Card
          href="/settings/compliance"
          title="Compliance &amp; suppression"
          desc={`Opt-out list (${suppressions} entries), consent records, and the PECR / Meta rules the sending code enforces automatically.`}
          status={suppressions > 0 ? `${suppressions} suppressed` : "Clean"}
          statusOk
        />
        <Card
          href="/settings/templates"
          title="Message templates"
          desc={`Saved email and WhatsApp copy (${templates}) you can drop into any lead with one click.`}
          status={`${templates} saved`}
          statusOk={templates > 0}
        />
      </div>

      <div className="card">
        <div className="card-head"><h3>Workspace</h3></div>
        <div className="card-body">
          <dl className="kv">
            <dt>Leads</dt><dd><b>{counts.toLocaleString()}</b></dd>
            <dt>Mail provider</dt><dd>{s.mail_provider || "smtp"}</dd>
            <dt>From address</dt><dd>{s.mail_from_email || <span className="muted">not set</span>}</dd>
            <dt>Sending domain</dt><dd>{s.sending_domain || <span className="muted">not set</span>}</dd>
            <dt>WhatsApp</dt><dd>{s.wa_enabled === "true" ? "enabled" : "disabled"}</dd>
            <dt>WA phone number ID</dt><dd>{s.wa_phone_number_id || <span className="muted">not set</span>}</dd>
            <dt>API version</dt><dd>{s.wa_api_version || "v21.0"}</dd>
          </dl>
        </div>
      </div>

      <div className="callout">
        <b>Secrets are encrypted at rest.</b> SMTP passwords and API tokens are encrypted with
        AES-256-GCM using <code>SETTINGS_ENCRYPTION_KEY</code> before being written to Postgres, and
        are never sent to the browser. If that env var is lost, the secrets must be re-entered.
      </div>
    </>
  );
}
