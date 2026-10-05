"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendLeadEmail, sendLeadWhatsapp } from "@/lib/actions/send";
import { setStatus, addNote, logReply, setFollowUp } from "@/lib/actions/leads";

type WaTemplate = { name: string; language: string; status: string; category: string; body: string };

export function Composer({
  leadId,
  email,
  defaultSubject,
  defaultBody,
  disabled,
  disabledReason,
  templates,
}: {
  leadId: string;
  email: string | null;
  defaultSubject: string;
  defaultBody: string;
  disabled: boolean;
  disabledReason?: string;
  templates: WaTemplate[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card">
      <div className="card-head">
        <h3>Send email</h3>
        <span className="hint">{email || "no email on this lead"}</span>
      </div>
      <div className="card-body">
        {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}
        {disabled && disabledReason ? <div className="callout warn">{disabledReason}</div> : null}

        <label className="f">
          <span>Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="f">
          <span>Message</span>
          <textarea rows={11} value={body} onChange={(e) => setBody(e.target.value)} />
          <span className="hint">
            Plain text only. One link maximum. No attachments on a first email — they hurt
            deliverability and look like bulk mail.
          </span>
        </label>

        <div className="row" style={{ marginTop: 4 }}>
          <button
            className="btn primary"
            disabled={pending || disabled || !email}
            onClick={() =>
              start(async () => {
                const r = await sendLeadEmail(leadId, subject, body);
                setMsg({ ok: r.ok, text: r.ok ? "Email sent and logged." : r.error || "Failed" });
                if (r.ok) router.refresh();
              })
            }
          >
            {pending ? "Sending…" : "✉ Send email"}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(body).catch(() => {});
              setMsg({ ok: true, text: "Message copied — send it from your own inbox if you prefer." });
            }}
          >
            Copy message
          </button>
        </div>

        {templates.length > 0 ? (
          <div style={{ marginTop: 18, borderTop: "1px solid var(--line-2)", paddingTop: 14 }}>
            <div className="small muted" style={{ fontWeight: 700, marginBottom: 8 }}>INSERT A SAVED TEMPLATE</div>
            <div className="row">
              {templates.slice(0, 6).map((t) => (
                <button
                  key={t.name}
                  className="btn sm"
                  type="button"
                  onClick={() => {
                    setSubject((s) => s || t.category || s);
                    setBody((b) => `${b}\n\n${t.body}`.trim());
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type WaTemplateOption = {
  name: string;
  language: string;
  category?: string;
  status?: string;
  body: string;
  displayName?: string;
};

export function WaSender({
  leadId,
  companyName,
  city,
  number,
  optedIn,
  canFreeform,
  windowReason,
  templates,
  waEnabled,
  isSuppressed,
  doNotContact,
}: {
  leadId: string;
  companyName: string;
  city: string | null;
  number: string | null;
  optedIn: boolean;
  canFreeform: boolean;
  windowReason: string;
  templates: WaTemplateOption[];
  waEnabled: boolean;
  isSuppressed?: boolean;
  doNotContact?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "template">(canFreeform ? "text" : "template");
  const [text, setText] = useState("");
  
  // Find dental_website_intro as default or use the first template
  const defaultTpl = templates.find((t) => t.name === "dental_website_intro") || templates[0];
  const [tpl, setTpl] = useState(defaultTpl?.name || "");
  const [lang, setLang] = useState(defaultTpl?.language || "en");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const selectedTplObj = templates.find((x) => x.name === tpl) || defaultTpl;

  // Variable mapping for dental_website_intro / 2-var templates
  const param1 = companyName ? companyName.trim() : "";
  const param2 = city ? city.trim() : "";
  const templateParams = [param1, param2];

  // Render preview by replacing {{1}} and {{2}}
  const renderedPreview = selectedTplObj?.body
    ? selectedTplObj.body
        .replace(/\{\{1\}\}/g, param1 || "{{1}}")
        .replace(/\{\{2\}\}/g, param2 || "{{2}}")
    : "";

  // Validation
  const missingPhone = !number;
  const missingCompany = !param1;
  const missingCity = !param2;
  const requiresVariables = Boolean(
    selectedTplObj?.body && (selectedTplObj.body.includes("{{1}}") || selectedTplObj.body.includes("{{2}}"))
  );
  const missingVariables = requiresVariables && (missingCompany || missingCity);

  const blocked =
    !waEnabled ||
    missingPhone ||
    !optedIn ||
    Boolean(isSuppressed) ||
    Boolean(doNotContact) ||
    (mode === "template" && (!tpl || missingVariables)) ||
    (mode === "text" && (!canFreeform || !text.trim()));

  return (
    <div className="card">
      <div className="card-head">
        <h3>Send WhatsApp</h3>
        <span className={`window-pill ${canFreeform ? "open" : "closed"}`}>
          {canFreeform ? "24h window OPEN" : "24h window CLOSED"}
        </span>
      </div>
      <div className="card-body">
        {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

        {!waEnabled ? (
          <div className="callout warn">
            WhatsApp is switched off. Enable it in <a href="/settings/whatsapp">Settings → WhatsApp</a>.
          </div>
        ) : null}
        {isSuppressed ? (
          <div className="callout bad">
            This contact is on the suppression list — sending is blocked.
          </div>
        ) : null}
        {doNotContact ? (
          <div className="callout bad">
            Lead is marked do-not-contact — sending is blocked.
          </div>
        ) : null}
        {missingPhone ? (
          <div className="callout warn">No WhatsApp / phone number on this lead.</div>
        ) : null}
        {mode === "template" && missingCompany ? (
          <div className="callout warn">
            Practice name (companyName) is missing on this lead — required for variable <code>{"{{1}}"}</code>.
          </div>
        ) : null}
        {mode === "template" && missingCity ? (
          <div className="callout warn">
            City is missing on this lead — required for variable <code>{"{{2}}"}</code>.
          </div>
        ) : null}
        {number && !optedIn ? (
          <div className="callout bad">
            <b>No opt-in recorded — sending is blocked.</b>
            <p style={{ margin: "6px 0 0" }}>
              WhatsApp&apos;s Business Policy requires explicit, channel-specific consent before any
              business message, and UK PECR requires it for individuals too. Tick{" "}
              <b>WhatsApp opt-in</b> on this lead only if they genuinely asked you to message them —
              for example they replied to an email with their number.
            </p>
          </div>
        ) : null}

        <div className="callout" style={{ borderColor: "var(--muted)", background: "var(--slate-soft)" }}>
          <b>Window status:</b> {windowReason}
        </div>

        <div className="tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={mode === "template" ? "on" : ""} onClick={() => setMode("template")}>
            Approved template
          </button>
          <button type="button" className={mode === "text" ? "on" : ""} onClick={() => setMode("text")}>
            Free-form text {canFreeform ? "" : "(locked)"}
          </button>
        </div>

        {mode === "text" ? (
          <>
            {!canFreeform ? (
              <div className="callout bad">
                Free-form messages are only allowed inside the 24-hour window that <i>the customer</i>{" "}
                opens by messaging you first. Outside it, every message must be an approved template.
                Sending anyway is the fastest way to get your number quality-rated down or banned.
              </div>
            ) : null}
            <label className="f">
              <span>Message</span>
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Hi {{name}}, thanks for getting back to me…"
              />
            </label>
          </>
        ) : (
          <>
            {templates.length === 0 ? (
              <div className="callout warn">
                No approved templates found. Add credentials in{" "}
                <a href="/settings/whatsapp">Settings → WhatsApp</a> and load templates, or create one
                in Meta Business Manager first.
              </div>
            ) : (
              <>
                <div className="grid c2">
                  <label className="f">
                    <span>Template</span>
                    <select
                      value={tpl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTpl(val);
                        const t = templates.find((x) => x.name === val);
                        if (t) setLang(t.language);
                      }}
                    >
                      {templates.map((t) => (
                        <option key={`${t.name}-${t.language}`} value={t.name}>
                          {t.name} ({t.language})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="f">
                    <span>Language</span>
                    <input value={lang} onChange={(e) => setLang(e.target.value)} />
                  </label>
                </div>

                {/* Structured Preview Before Send (Step 4) */}
                <div
                  style={{
                    background: "var(--slate-soft)",
                    border: "1px solid var(--border)",
                    marginTop: 12,
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: "var(--radius)",
                  }}
                >
                  <dl className="kv" style={{ marginBottom: 10 }}>
                    <dt>Template</dt>
                    <dd>
                      <b>{selectedTplObj?.name || tpl}</b>
                    </dd>
                    <dt>Language</dt>
                    <dd>{lang}</dd>
                    <dt>Recipient</dt>
                    <dd>{number || "—"}</dd>
                    <dt>Practice</dt>
                    <dd>{param1 || <span className="badge red">Missing</span>}</dd>
                    <dt>City</dt>
                    <dd>{param2 || <span className="badge red">Missing</span>}</dd>
                  </dl>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--muted)",
                      marginBottom: 4,
                    }}
                  >
                    Message preview:
                  </div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--sans)",
                      fontSize: 13,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      padding: "10px 12px",
                      borderRadius: "calc(var(--radius) - 2px)",
                      lineHeight: 1.5,
                    }}
                  >
                    {renderedPreview || <span className="muted">No preview available</span>}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <button
          className="btn wa"
          disabled={pending || blocked}
          onClick={() =>
            start(async () => {
              const r = await sendLeadWhatsapp(leadId, {
                mode,
                text: mode === "template" ? renderedPreview : text,
                templateName: tpl,
                language: lang,
                params: mode === "template" ? templateParams : undefined,
              });
              setMsg({ ok: r.ok, text: r.ok ? "WhatsApp message sent and logged." : r.error || "Failed" });
              if (r.ok) {
                setText("");
                router.refresh();
              }
            })
          }
        >
          {pending ? "Sending…" : "◍ Send WhatsApp"}
        </button>
      </div>
    </div>
  );
}

export function QuickActions({
  leadId,
  status,
  followUp,
}: {
  leadId: string;
  status: string;
  followUp: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [date, setDate] = useState(followUp);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok?: boolean; error?: string } | void>, okText: string) =>
    start(async () => {
      const r = await fn();
      if (r && "error" in r && r.error) setMsg({ ok: false, text: r.error });
      else setMsg({ ok: true, text: okText });
      router.refresh();
    });

  return (
    <div className="card">
      <div className="card-head"><h3>Quick actions</h3></div>
      <div className="card-body">
        {msg ? <div className={`toast ${msg.ok ? "ok" : "err"}`}>{msg.text}</div> : null}

        <div className="row" style={{ marginBottom: 14 }}>
          {["REPLIED", "CALL_BOOKED", "PROPOSAL_SENT", "WON", "LOST", "NURTURE"].map((s) => (
            <button
              key={s}
              className={`btn sm ${status === s ? "primary" : ""}`}
              disabled={pending}
              onClick={() => run(() => setStatus(leadId, s), `Status set to ${s}.`)}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <label className="f">
          <span>Log an inbound reply (opens the WhatsApp 24h window)</span>
          <textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="What did they say?"
          />
        </label>
        <button
          className="btn sm"
          disabled={pending}
          onClick={() => run(() => logReply(leadId, reply), "Reply logged.")}
        >
          ↓ Log reply
        </button>

        <div style={{ borderTop: "1px solid var(--line-2)", margin: "16px 0" }} />

        <label className="f">
          <span>Next follow-up</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="row">
          <button
            className="btn sm"
            disabled={pending}
            onClick={() => run(() => setFollowUp(leadId, date), "Follow-up scheduled.")}
          >
            Save follow-up
          </button>
          <button
            className="btn sm ghost"
            disabled={pending}
            onClick={() => {
              setDate("");
              run(() => setFollowUp(leadId, ""), "Follow-up cleared.");
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--line-2)", margin: "16px 0" }} />

        <label className="f">
          <span>Add a note</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          className="btn sm"
          disabled={pending || !note.trim()}
          onClick={() =>
            start(async () => {
              const r = await addNote(leadId, note);
              if (r && "error" in r && r.error) setMsg({ ok: false, text: r.error });
              else {
                setMsg({ ok: true, text: "Note added." });
                setNote("");
              }
              router.refresh();
            })
          }
        >
          Save note
        </button>
      </div>
    </div>
  );
}
