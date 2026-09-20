import { requireActiveUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { expectedRecords } from "@/lib/dns";
import { EmailSettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  await requireActiveUser();
  const s = await getSettings();
  const domain = s.sending_domain || "";
  const records = expectedRecords(domain, s.mail_provider || "smtp");

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Email, domain &amp; DNS</h2>
          <p>Outgoing mail, your from-address, and the records that keep you out of spam.</p>
        </div>
      </div>

      <div className="callout warn">
        <b>Read this before sending cold email.</b> Send from a <b>separate domain</b> to your main
        one (e.g. <code>yourname-uk.com</code>) so a complaint never damages your business domain.
        Then warm the mailbox: <b>5 sends/day in week 1, 10–15 in week 2, 20–30 from week 3.</b>
        Skipping warm-up lands you in spam no matter how good the DNS is.
      </div>

      <EmailSettingsForm
        initial={{
          mail_provider: s.mail_provider || "smtp",
          mail_from_name: s.mail_from_name || "",
          mail_from_email: s.mail_from_email || "",
          mail_reply_to: s.mail_reply_to || "",
          sending_domain: domain,
          smtp_host: s.smtp_host || "",
          smtp_port: s.smtp_port || "587",
          smtp_user: s.smtp_user || "",
          smtp_secure: s.smtp_secure || "false",
          resend_api_key: s.resend_api_key || "",
          hasSmtpPass: Boolean(s.smtp_pass),
          hasResendKey: Boolean(s.resend_api_key),
        }}
      />

      <div className="card">
        <div className="card-head">
          <h3>DNS records for {domain || "your sending domain"}</h3>
          <span className="hint">Add these at your domain registrar, then click Verify</span>
        </div>
        <div className="card-body tight">
          <div className="table-wrap">
            <table className="t dns-table">
              <thead>
                <tr><th>Type</th><th>Host / Name</th><th>Value</th><th>Why</th></tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.type + r.host}>
                    <td><span className="badge blue">{r.type}</span></td>
                    <td>{r.host}</td>
                    <td style={{ maxWidth: 320, wordBreak: "break-all" }}>{r.value}</td>
                    <td className="sub" style={{ fontFamily: "inherit", maxWidth: 330 }}>{r.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Incoming email (replies)</h3></div>
        <div className="card-body">
          <p className="small">
            Inbound replies are logged automatically when your mail provider posts them to this webhook:
          </p>
          <pre className="pre">{`POST  https://YOUR-DOMAIN/api/webhooks/email

Body (JSON):
{
  "secret":     "<your WATCH_SECRET>",
  "from":       "jane@practice.co.uk",
  "subject":    "Re: your note about our website",
  "text":       "Thanks for flagging this - can you send the fix list?"
}`}</pre>
          <p className="small muted">
            Point your provider&apos;s inbound/parse webhook at that URL. On receipt the system matches
            the sender to a lead, logs an inbound activity, sets status to <b>REPLIED</b>, and — usefully —
            <b> opens the WhatsApp 24-hour window</b> for that contact. Alternatively, just hit
            &quot;Log reply&quot; on the lead page; nothing is lost by doing it by hand.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Provider quick reference</h3></div>
        <div className="card-body">
          <div className="grid c2">
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>GMAIL / GOOGLE WORKSPACE</div>
              <ul className="small muted" style={{ paddingLeft: 18 }}>
                <li>Host <code>smtp.gmail.com</code>, port <code>587</code>, TLS on</li>
                <li>Needs an <b>App Password</b> (2FA must be on) — your normal password won&apos;t work</li>
                <li>Max ~500 recipients/day on Workspace, ~100 on free Gmail</li>
                <li>SPF: <code>include:_spf.google.com</code></li>
              </ul>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>ZOHO MAIL</div>
              <ul className="small muted" style={{ paddingLeft: 18 }}>
                <li>Host <code>smtp.zoho.com</code> (or <code>smtp.zoho.in</code>), port <code>465</code> SSL or <code>587</code> TLS</li>
                <li>Free plan: 5 mailboxes, good for outreach domains</li>
                <li>SPF: <code>include:zoho.com</code></li>
              </ul>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>RESEND</div>
              <ul className="small muted" style={{ paddingLeft: 18 }}>
                <li>API key only — nothing to install. Free tier ~3,000 emails/month</li>
                <li>Add your domain in their dashboard, copy the DKIM/MX records they show</li>
                <li>Best deliverability of the three for cold outreach</li>
              </ul>
            </div>
            <div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>TEST BEFORE YOU SEND</div>
              <ul className="small muted" style={{ paddingLeft: 18 }}>
                <li>Send a test to <code>check-auth@verifier.port25.com</code></li>
                <li>Or use <code>mail-tester.com</code> — you want 9–10/10</li>
                <li>SPF pass, DKIM pass, DMARC pass. All three.</li>
                <li>Check your domain isn&apos;t on a blocklist: <code>mxtoolbox.com/blacklists.aspx</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
