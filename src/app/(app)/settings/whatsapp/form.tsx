"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveWhatsappSettings,
  testWhatsappConnection,
  fetchWhatsappTemplates,
} from "@/lib/actions/settings";

type Initial = {
  wa_enabled: string;
  wa_phone_number_id: string;
  wa_business_account_id: string;
  wa_api_version: string;
  wa_default_country_code: string;
  hasToken: boolean;
  hasAppSecret: boolean;
  verifyToken: string;
};

type Tpl = { name: string; language: string; status: string; category: string; body: string };

export function WhatsappSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [templates, setTemplates] = useState<Tpl[] | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

      <form
        action={(fd) =>
          start(async () => {
            const r = await saveWhatsappSettings(fd);
            setMsg({ ok: r.ok, text: r.message });
            router.refresh();
          })
        }
      >
        <div className="card">
          <div className="card-head"><h3>Credentials</h3></div>
          <div className="card-body">
            <label className="check" style={{ marginBottom: 16 }}>
              <input type="checkbox" name="wa_enabled" defaultChecked={initial.wa_enabled === "true"} />
              <span>
                <b>Enable WhatsApp sending.</b> While this is off, every WhatsApp send is blocked —
                useful when you&apos;re still email-only.
              </span>
            </label>

            <div className="grid c2">
              <label className="f">
                <span>Phone number ID</span>
                <input name="wa_phone_number_id" defaultValue={initial.wa_phone_number_id} placeholder="100234567890123" />
                <span className="hint">The numeric ID, not the phone number itself.</span>
              </label>
              <label className="f">
                <span>WhatsApp Business Account ID</span>
                <input name="wa_business_account_id" defaultValue={initial.wa_business_account_id} placeholder="100987654321098" />
              </label>
              <label className="f">
                <span>Access token</span>
                <input
                  name="wa_access_token"
                  type="password"
                  placeholder={initial.hasToken ? "•••••••• (saved — leave blank to keep)" : "EAAG…"}
                />
                <span className="hint">Use a System User permanent token, not the 24-hour test token.</span>
              </label>
              <label className="f">
                <span>App secret</span>
                <input
                  name="wa_app_secret"
                  type="password"
                  placeholder={initial.hasAppSecret ? "•••••••• (saved — leave blank to keep)" : "from App → Settings → Basic"}
                />
                <span className="hint">Optional, used to verify webhook payload signatures.</span>
              </label>
              <label className="f">
                <span>Webhook verify token</span>
                <input name="wa_verify_token" defaultValue={initial.verifyToken} placeholder="make-up-a-random-string" />
                <span className="hint">You invent this. Paste the same value into Meta&apos;s webhook config.</span>
              </label>
              <label className="f">
                <span>Graph API version</span>
                <input name="wa_api_version" defaultValue={initial.wa_api_version} />
              </label>
              <label className="f">
                <span>Default country code</span>
                <input name="wa_default_country_code" defaultValue={initial.wa_default_country_code} placeholder="44" />
                <span className="hint">Used to convert local numbers (07700… → 447700…). 44 = UK, 1 = US, 971 = UAE.</span>
              </label>
            </div>

            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn primary" type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save WhatsApp settings"}
              </button>
              <button
                className="btn"
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await testWhatsappConnection();
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
                    const r = await fetchWhatsappTemplates();
                    if (r.ok && r.templates) {
                      setTemplates(r.templates as Tpl[]);
                      setMsg({ ok: true, text: `${r.templates.length} templates loaded.` });
                    } else {
                      setMsg({ ok: false, text: r.message || "Could not load templates." });
                    }
                  })
                }
              >
                Load templates
              </button>
            </div>
          </div>
        </div>
      </form>

      {templates ? (
        <div className="card">
          <div className="card-head">
            <h3>Approved templates ({templates.length})</h3>
            <span className="hint">These appear in the send panel on every lead</span>
          </div>
          <div className="card-body tight">
            {templates.length === 0 ? (
              <div className="empty">
                <b>No templates found</b>
                Create one in WhatsApp Manager, wait for approval, then load again.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="t">
                  <thead>
                    <tr><th>Name</th><th>Language</th><th>Category</th><th>Status</th><th>Body</th></tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr key={t.name + t.language}>
                        <td className="name">{t.name}</td>
                        <td>{t.language}</td>
                        <td><span className="badge slate">{t.category}</span></td>
                        <td>
                          <span className={`badge ${t.status === "APPROVED" ? "green" : t.status === "REJECTED" ? "red" : "amber"}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="sub" style={{ maxWidth: 460 }}>{t.body}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
