"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveMailSettings,
  testMailConnection,
  checkDns,
} from "@/lib/actions/settings";

type Initial = {
  mail_provider: string;
  mail_from_name: string;
  mail_from_email: string;
  mail_reply_to: string;
  sending_domain: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_secure: string;
  resend_api_key: string;
  hasSmtpPass: boolean;
  hasResendKey: boolean;
};

type DnsCheck = { host: string; matches: string; found: string; expected: string };

export function EmailSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.mail_provider);
  const [domain, setDomain] = useState(initial.sending_domain);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dns, setDns] = useState<DnsCheck[] | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await saveMailSettings(fd);
          setMsg({ ok: r.ok, text: r.message });
          router.refresh();
        })
      }
    >
      {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

      <div className="card">
        <div className="card-head"><h3>Sender identity</h3></div>
        <div className="card-body">
          <div className="grid c2">
            <label className="f">
              <span>From name</span>
              <input name="mail_from_name" defaultValue={initial.mail_from_name} placeholder="Your Name" />
            </label>
            <label className="f">
              <span>From email</span>
              <input name="mail_from_email" type="email" defaultValue={initial.mail_from_email} placeholder="you@yourname-uk.com" />
              <span className="hint">Use a real named address, never info@ or noreply@.</span>
            </label>
            <label className="f">
              <span>Reply-to (optional)</span>
              <input name="mail_reply_to" type="email" defaultValue={initial.mail_reply_to} />
            </label>
            <label className="f">
              <span>Sending domain</span>
              <input
                name="sending_domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourname-uk.com"
              />
              <span className="hint">The domain your DNS records live on. Keep it separate from your main site.</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Provider</h3></div>
        <div className="card-body">
          <label className="f">
            <span>How should we send?</span>
            <select
              name="mail_provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="smtp">SMTP (Gmail, Zoho, Outlook, any host)</option>
              <option value="resend">Resend API (best deliverability, ~3k/month free)</option>
              <option value="none">Disabled — do not send</option>
            </select>
          </label>

          {provider === "smtp" ? (
            <div className="grid c2">
              <label className="f">
                <span>SMTP host</span>
                <input name="smtp_host" defaultValue={initial.smtp_host} placeholder="smtp.zoho.in" />
              </label>
              <label className="f">
                <span>Port</span>
                <input name="smtp_port" defaultValue={initial.smtp_port} placeholder="587" />
              </label>
              <label className="f">
                <span>Username</span>
                <input name="smtp_user" defaultValue={initial.smtp_user} placeholder="you@yourname-uk.com" />
              </label>
              <label className="f">
                <span>Password / app password</span>
                <input
                  name="smtp_pass"
                  type="password"
                  placeholder={initial.hasSmtpPass ? "•••••••• (saved — leave blank to keep)" : "app password"}
                />
              </label>
              <label className="check">
                <input type="checkbox" name="smtp_secure" defaultChecked={initial.smtp_secure === "true"} />
                <span>Use SSL (port 465). Leave unchecked for TLS on 587.</span>
              </label>
            </div>
          ) : null}

          {provider === "resend" ? (
            <label className="f">
              <span>Resend API key</span>
              <input
                name="resend_api_key"
                type="password"
                placeholder={initial.hasResendKey ? "re_•••••••• (saved — leave blank to keep)" : "re_xxxxxxxxxxxx"}
              />
              <span className="hint">
                Get it from resend.com → API Keys. Then add your domain there and copy the DKIM/MX
                records into your DNS.
              </span>
            </label>
          ) : null}

          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn primary" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save email settings"}
            </button>
            <button
              className="btn"
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await testMailConnection();
                  setMsg({ ok: r.ok, text: r.message });
                })
              }
            >
              Test connection
            </button>
            <button
              className="btn"
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await checkDns(domain);
                  if (r.ok && r.checks) {
                    setDns(r.checks);
                    setMsg({ ok: true, text: "DNS lookup complete — see below." });
                  } else {
                    setMsg({ ok: false, text: r.message || "DNS check failed." });
                  }
                })
              }
            >
              Verify DNS
            </button>
          </div>
        </div>
      </div>

      {dns ? (
        <div className="card">
          <div className="card-head">
            <h3>Live DNS check — {domain}</h3>
            <span className="hint">Resolved right now from public DNS</span>
          </div>
          <div className="card-body tight">
            <div className="table-wrap">
              <table className="t dns-table">
                <thead>
                  <tr><th>Record</th><th>Expected</th><th>Found</th><th>Result</th></tr>
                </thead>
                <tbody>
                  {dns.map((c) => (
                    <tr key={c.host}>
                      <td>{c.host}</td>
                      <td className="sub" style={{ fontFamily: "inherit" }}>{c.expected}</td>
                      <td>{c.found}</td>
                      <td>
                        <span className={`badge ${c.matches === "yes" ? "green" : c.matches === "partial" ? "amber" : "red"}`}>
                          {c.matches === "yes" ? "PASS" : c.matches === "partial" ? "CHECK" : "MISSING"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
